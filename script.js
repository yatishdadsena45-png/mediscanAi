(() => {
"use strict";
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const API_URL = "http://127.0.0.1:5000/api/analyze";
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = ["pdf", "png", "jpg", "jpeg"];
// Fictional illustrative sample only. This is not extracted from a real patient report.
const MOCK_RESPONSE = {
documentType: "Laboratory report",
patient: { displayName: "Fictional sample patient" },
extractedTests: [
{id:"hb", name:"Hemoglobin", value:"13.5", unit:"g/dL", referenceRange:"Not supplied", status:"Verified", sourceText:"Illustrative sample text only — Hemoglobin: 13.5 g/dL."},
{id:"glu", name:"Glucose", value:"95", unit:"mg/dL", referenceRange:"Not supplied", status:"Verified", sourceText:"Illustrative sample text only — Glucose: 95 mg/dL."},
{id:"chol", name:"Cholesterol", value:"", unit:"mg/dL", referenceRange:"Not supplied", status:"Needs review", sourceText:"Fictional sample: the cholesterol value is intentionally missing."}
],
medications: [{name:"Example medicine", dosage:"Not supplied", frequency:"Not supplied", status:"Needs review", sourceText:"Fictional placeholder only. Not a real prescription."}],
dates: [{label:"Report date", value:"Not supplied", sourceText:"No actual date is present in this fictional sample."}],
warnings: [
{id:"missing-chol", title:"Cholesterol value is missing", detail:"Data-completeness warning only. This is not a medical interpretation.", status:"Open"},
{id:"missing-range", title:"Reference ranges are not supplied", detail:"Reference ranges vary by laboratory and are not invented in this sample.", status:"Open"}
]
};
let data = null, file = null, mode = "demo", activeTab = "labs", authMode = "login", toastTimer;
const $id = id => document.getElementById(id);
const ui = {
input:$id("fileInput"), drop:$id("dropzone"), selected:$id("selectedFile"), analyse:$id("analyseBtn"),
loading:$id("loading"), error:$id("errorBanner"), content:$id("tabContent"), modal:$id("jsonModal"),
json:$id("jsonOutput"), toast:$id("toast"), auth:$id("authModal")
};
function toast(message) { ui.toast.textContent = message; ui.toast.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => ui.toast.classList.remove("show"), 2800); }
function showError(message) { ui.error.textContent = message; ui.error.classList.remove("hidden"); }
function clearError() { ui.error.textContent = ""; ui.error.classList.add("hidden"); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function validateFile(f) {
  if (!f) return "Choose a file first.";
  const ext = f.name.includes(".") ? f.name.split(".").pop().toLowerCase() : "";
  if (!ALLOWED.includes(ext)) return "Unsupported file. Choose a PDF, PNG, JPG or JPEG file.";
  if (f.size > MAX_SIZE) return "This file is larger than 10 MB. Choose a smaller file.";
  if (!f.size) return "This file appears to be empty.";
  return "";
}
function setFile(f) {
  clearError(); const issue = validateFile(f);
  if (issue) { showError(issue); ui.input.value = ""; return; }
  file = f; $id("fileName").textContent = f.name; $id("fileSize").textContent = `${(f.size/1024).toFixed(1)} KB`;
  ui.selected.classList.remove("hidden"); ui.analyse.disabled = false;
  toast("File selected. Analyse when ready.");
}
function resetFile() { file = null; ui.input.value = ""; ui.selected.classList.add("hidden"); ui.analyse.disabled = true; }
function loadSample() {
  clearError(); resetFile(); data = JSON.parse(JSON.stringify(MOCK_RESPONSE)); mode = "demo";
  data.warnings.forEach(w => w.status = "Open"); renderAll(); toast("Fictional sample loaded. No real document was analysed.");
}
function normalize(raw) {
  if (!raw || typeof raw !== "object") throw new Error("The server returned an empty or invalid response.");
  const tests = raw.extractedTests ?? raw.lab_results ?? raw.laboratory_results ?? raw.tests ?? [];
  const meds = raw.medications ?? raw.medicines ?? [];
  const dates = raw.dates ?? [];
  const warnings = raw.warnings ?? raw.discrepancies ?? raw.review_items ?? [];
  if (![tests, meds, dates, warnings].every(Array.isArray)) throw new Error("The API response format is not recognised. Confirm the Flask response schema.");
  return {
    documentType: raw.documentType ?? raw.document_type ?? "Medical document", patient: raw.patient ?? null,
    extractedTests: tests.map((x,i)=>({id:String(x.id ?? `test-${i}`),name:x.name ?? x.test_name ?? x.test ?? "Unnamed test",value:x.value ?? x.result ?? "",unit:x.unit ?? x.units ?? "",referenceRange:x.referenceRange ?? x.reference_range ?? x.normal_range ?? "",status:x.status ?? (x.verified ? "Verified" : "Needs review"),sourceText:x.sourceText ?? x.source_text ?? x.source_snippet ?? ""})),
    medications: meds.map(x=>({name:x.name ?? x.medicine_name ?? "Unnamed medication",dosage:x.dosage ?? x.dose ?? "",frequency:x.frequency ?? x.instructions ?? "",status:x.status ?? "Needs review",sourceText:x.sourceText ?? x.source_text ?? ""})),
    dates: dates.map(x=>typeof x==="string"?{label:"Date",value:x,sourceText:""}:{label:x.label ?? x.type ?? "Date",value:x.value ?? x.date ?? "",sourceText:x.sourceText ?? x.source_text ?? ""}),
    warnings: warnings.map((x,i)=>typeof x==="string"?{id:`warning-${i}`,title:x,detail:"Please review this item against the original document.",status:"Open"}:{id:String(x.id ?? `warning-${i}`),title:x.title ?? x.message ?? x.issue ?? "Review item",detail:x.detail ?? x.description ?? x.reason ?? "Verify against the source document.",status:x.status ?? "Open"})
  };
}
async function analyzeDocument(f) {
  const issue = validateFile(f); if (issue) { showError(issue); return; }
  clearError(); ui.loading.classList.remove("hidden"); ui.analyse.disabled = true;
  try {
    const formData = new FormData(); formData.append("document", f);
    const response = await fetch(API_URL, {method:"POST", body:formData});
    if (!response.ok) {
      let message = ""; try { const body = await response.json(); message = body.error || body.message || ""; } catch (_) {}
      throw new Error(`API returned HTTP ${response.status}${message ? `: ${message}` : ""}`);
    }
    data = normalize(await response.json()); mode = "live"; renderAll(); toast("Analysis response received from Flask API.");
  } catch (error) {
    console.error("MediScan API request failed:", error);
    showError(`Could not analyse using the real API. ${error.message || "Check that Flask is running at 127.0.0.1:5000 and CORS is configured."} Demo data was not substituted.`);
    toast("API connection failed. No mock results were shown.");
  } finally { ui.loading.classList.add("hidden"); ui.analyse.disabled = !file; }
}
function badge(status) {
  const cls = /verified|resolved|complete/i.test(status) ? "ok" : /critical|error/i.test(status) ? "error" : "review";
  return `<span class="badge ${cls}">${escapeHtml(status || "Needs review")}</span>`;
}
function jsonString() { return JSON.stringify({mode: mode === "demo" ? "demo_mock_data" : "live_api", ...data}, null, 2); }
function renderAll() {
  if (!data) return;
  $id("modeLabel").textContent = mode === "demo" ? "Demo mode · fictional sample" : "Live API response";
  $id("resultStatus").textContent = mode === "demo" ? "DEMO DATA" : "LIVE API";
  $id("resultSummary").textContent = `${data.documentType} · ${data.extractedTests.length} lab tests · ${data.medications.length} medications`;
  $id("statType").textContent = data.documentType;
  $id("statTests").textContent = data.extractedTests.length;
  $id("statMeds").textContent = data.medications.length;
  $id("statWarnings").textContent = data.warnings.filter(w=>w.status!=="Resolved").length;
  $id("reviewCount").textContent = data.warnings.filter(w=>w.status!=="Resolved").length;
  ["viewJson","exportJson","copyJson","doctorViewJson","doctorExportJson"].forEach(id => $id(id).disabled = false);
  $$(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===activeTab));
  renderTab(); renderDoctor();
}
function renderTab(searchText = "") {
  if (!data) { ui.content.innerHTML = `<div class="empty-state"><span class="empty-icon">▤</span><h3>No report yet</h3><p>Upload a report or load the sample to see how extracted information is organised.</p><button class="btn btn-outline btn-small" id="emptySample">Load sample report</button></div>`; $id("emptySample").onclick=loadSample; return; }
  if (activeTab === "labs") {
    const tests = data.extractedTests.filter(t => `${t.name} ${t.value} ${t.unit}`.toLowerCase().includes(searchText.toLowerCase()));
    ui.content.innerHTML = `<div class="table-tools"><input id="testSearch" aria-label="Search laboratory tests" placeholder="Search lab tests…" value="${escapeHtml(searchText)}"><small>${tests.length} result(s)</small></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Test name</th><th>Value</th><th>Unit</th><th>Reference range</th><th>Status</th><th>Source</th></tr></thead><tbody>${tests.length ? tests.map(t=>`<tr><td>${escapeHtml(t.name)}</td><td><input class="value-input" data-value="${escapeHtml(t.id)}" aria-label="Value for ${escapeHtml(t.name)}" value="${escapeHtml(t.value)}" placeholder="Missing"></td><td>${escapeHtml(t.unit||"—")}</td><td>${escapeHtml(t.referenceRange||"Not supplied")}</td><td>${badge(t.status)}<button class="verify-btn" data-verify="${escapeHtml(t.id)}">${/verified/i.test(t.status)?"Mark review":"Mark verified"}</button></td><td><button class="source-btn" data-source="${escapeHtml(t.id)}">View source</button>${t.showSource?`<div class="source-box">${escapeHtml(t.sourceText||"No source snippet returned by API.")}</div>`:""}</td></tr>`).join("") : `<tr><td colspan="6">No matching tests found.</td></tr>`}</tbody></table></div>`;
    $id("testSearch").oninput = ev => renderTab(ev.target.value);
    $$("[data-value]").forEach(input=>input.onchange=()=>{const t=data.extractedTests.find(x=>x.id===input.dataset.value);if(t){t.value=input.value.trim();t.status="Needs review";renderTab($id("testSearch")?.value||"");renderDoctor();toast("Value updated. Please verify it.");}});
    $$("[data-verify]").forEach(btn=>btn.onclick=()=>{const t=data.extractedTests.find(x=>x.id===btn.dataset.verify);t.status=/verified/i.test(t.status)?"Needs review":"Verified";renderAll();toast("Verification status updated locally.");});
    $$("[data-source]").forEach(btn=>btn.onclick=()=>{const t=data.extractedTests.find(x=>x.id===btn.dataset.source);t.showSource=!t.showSource;renderTab($id("testSearch")?.value||"");});
  } else if (activeTab === "meds") {
    ui.content.innerHTML = data.medications.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Status</th><th>Source</th></tr></thead><tbody>${data.medications.map((m,i)=>`<tr><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.dosage||"Not supplied")}</td><td>${escapeHtml(m.frequency||"Not supplied")}</td><td>${badge(m.status)}</td><td><button class="source-btn" data-med-source="${i}">View source</button>${m.showSource?`<div class="source-box">${escapeHtml(m.sourceText||"No source snippet returned by API.")}</div>`:""}</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty-state"><h3>No medications returned</h3><p>This does not prove that the original document contains no medication information.</p></div>`;
    $$("[data-med-source]").forEach(btn=>btn.onclick=()=>{data.medications[+btn.dataset.medSource].showSource=!data.medications[+btn.dataset.medSource].showSource;renderTab();});
  } else if (activeTab === "dates") {
    ui.content.innerHTML = data.dates.length ? `<div class="date-list">${data.dates.map((d,i)=>`<div class="date-item"><span class="date-symbol">▦</span><div><b>${escapeHtml(d.label)}</b><small>${escapeHtml(d.value||"Not supplied")}</small><button class="source-btn" data-date-source="${i}">View source</button>${d.showSource?`<div class="source-box">${escapeHtml(d.sourceText||"No source snippet returned by API.")}</div>`:""}</div></div>`).join("")}</div>` : `<div class="empty-state"><h3>No dates returned</h3><p>No date fields were returned by the analysis response.</p></div>`;
    $$("[data-date-source]").forEach(btn=>btn.onclick=()=>{data.dates[+btn.dataset.dateSource].showSource=!data.dates[+btn.dataset.dateSource].showSource;renderTab();});
  } else {
    ui.content.innerHTML = data.warnings.length ? `<div class="review-list">${data.warnings.map((w,i)=>`<div class="review-item"><span class="warning-symbol">!</span><div><b>${escapeHtml(w.title)}</b><p>${escapeHtml(w.detail)}</p>${badge(w.status)} <button data-resolve="${i}">${w.status==="Resolved"?"Reopen item":"Mark reviewed"}</button></div></div>`).join("")}</div>` : `<div class="empty-state"><span class="empty-icon">✓</span><h3>No review flags returned</h3><p>This means the API returned no review items, not that the document is medically normal.</p></div>`;
    $$("[data-resolve]").forEach(btn=>btn.onclick=()=>{const w=data.warnings[+btn.dataset.resolve];w.status=w.status==="Resolved"?"Open":"Resolved";renderAll();toast("Review status updated locally.");});
  }
}
function renderDoctor() {
  if (!data) return;
  const unresolved = data.warnings.filter(w=>w.status!=="Resolved").length;
  const verified = data.extractedTests.filter(t=>/verified/i.test(t.status)).length;
  $id("doctorDocType").textContent = data.documentType;
  $id("doctorReviewCount").textContent = unresolved;
  $id("doctorVerifiedCount").textContent = `${verified}/${data.extractedTests.length}`;
  $id("doctorReadiness").textContent = unresolved ? "REVIEW NEEDED" : "READY TO EXPORT";
  $id("doctorChecklist").innerHTML = data.warnings.length ? data.warnings.map((w,i)=>`<div class="check-row ${w.status==="Resolved"?"done":""}"><span>${w.status==="Resolved"?"✓":"!"}</span><div><b>${escapeHtml(w.title)}</b><small>${escapeHtml(w.detail)}</small><button data-doctor-resolve="${i}">${w.status==="Resolved"?"Reopen check":"Mark reviewed"}</button></div></div>`).join("") : `<div class="checklist-empty">No review flags were returned by the API. Verify the source document before export.</div>`;
  $$("[data-doctor-resolve]").forEach(btn=>btn.onclick=()=>{const w=data.warnings[+btn.dataset.doctorResolve];w.status=w.status==="Resolved"?"Open":"Resolved";renderAll();toast("Reviewer checklist updated locally.");});
  $id("doctorSummary").innerHTML = `<div class="summary-grid"><div class="summary-box"><small>Lab test fields</small><b>${data.extractedTests.length}</b></div><div class="summary-box"><small>Medication entries</small><b>${data.medications.length}</b></div><div class="summary-box"><small>Verified lab fields</small><b>${verified}</b></div><div class="summary-box"><small>Open review items</small><b>${unresolved}</b></div></div><div class="summary-note">${mode==="demo"?"This is fictional sample data, not a real patient's report.":"Live API response received. Check every field against the original document."} This workspace supports extraction review only and does not provide clinical diagnosis or treatment recommendations.</div>`;
}
function switchRole(role) {
  const doctor = role === "doctor";
  $id("patientDashboard").classList.toggle("hidden", doctor);
  $id("doctorDashboard").classList.toggle("hidden", !doctor);
  $$("[data-role-view]").forEach(btn=>btn.classList.toggle("active",btn.dataset.roleView===role));
  $id("workspaceTitle").textContent = doctor ? "Doctor dashboard" : "Patient dashboard";
  $id("workspaceSubtitle").textContent = doctor ? "Review extracted fields, completeness flags and export readiness." : "Upload your report and review the organised information.";
}
function openJson() { if(!data) return toast("Load a sample or analyse a document first."); ui.json.textContent=jsonString(); ui.modal.classList.remove("hidden"); }
async function copyJson() {
  if (!data) return toast("Load a sample or analyse a document first.");
  const text = jsonString();
  try { await navigator.clipboard.writeText(text); toast("JSON copied to clipboard."); }
  catch (_) { const area=document.createElement("textarea");area.value=text;document.body.appendChild(area);area.select();const ok=document.execCommand("copy");area.remove();toast(ok?"JSON copied to clipboard.":"Copy failed. Use View JSON and copy manually."); }
}
function exportJson() {
  if(!data) return toast("Load a sample or analyse a document first.");
  const blob = new Blob([jsonString()], {type:"application/json"});
  const url = URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=url; a.download="mediscan-report.json"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  toast("JSON export downloaded.");
}
function openAuth(which) {
  authMode = which || "login"; updateAuthMode(); ui.auth.classList.remove("hidden");
}
function updateAuthMode() {
  const signup=authMode==="signup";
  $id("authTitle").textContent=signup?"Create your demo profile":"Welcome back";
  $id("authDescription").textContent="Choose which workspace you want to preview.";
  $id("nameLabel").classList.toggle("hidden",!signup);$id("fullName").classList.toggle("hidden",!signup);$id("fullName").required=signup;
  $$(".auth-switch button").forEach(b=>b.classList.toggle("selected",b.dataset.authMode===authMode));
  $id("authSubmit").textContent=signup?"Create demo profile →":"Continue to dashboard →";
}
function closeModals() { $$(".modal-backdrop").forEach(m=>m.classList.add("hidden")); }
function init() {
  $id("mobileMenu").onclick=()=> $id("topNav").classList.toggle("open");
  $$("#topNav a").forEach(a=>a.onclick=()=> $id("topNav").classList.remove("open"));
  $$("[data-auth]").forEach(b=>b.onclick=()=>openAuth(b.dataset.auth));
  $$("[data-close]").forEach(b=>b.onclick=closeModals);
  $$(".modal-backdrop").forEach(m=>m.addEventListener("click",ev=>{if(ev.target===m)m.classList.add("hidden");}));
  document.addEventListener("keydown",ev=>{if(ev.key==="Escape")closeModals();});
  $$(".auth-switch button").forEach(b=>b.onclick=()=>{authMode=b.dataset.authMode;updateAuthMode();});
  $id("authForm").onsubmit=ev=>{ev.preventDefault();const role=$id("authRole").value;closeModals();switchRole(role);$id("workspace").scrollIntoView({behavior:"smooth"});toast(`${role==="doctor"?"Doctor":"Patient"} demo dashboard opened. No account was created.`);};
  $id("heroAnalyse").onclick=()=>{$id("workspace").scrollIntoView({behavior:"smooth"});};
  $$("[data-role-view]").forEach(b=>b.onclick=()=>switchRole(b.dataset.roleView));
  ui.input.addEventListener("change",ev=>{if(ev.target.files[0])setFile(ev.target.files[0]);});
  ["dragenter","dragover"].forEach(type=>ui.drop.addEventListener(type,ev=>{ev.preventDefault();ui.drop.classList.add("dragging");}));
  ["dragleave","drop"].forEach(type=>ui.drop.addEventListener(type,ev=>{ev.preventDefault();ui.drop.classList.remove("dragging");}));
  ui.drop.addEventListener("drop",ev=>{const f=ev.dataTransfer.files[0];if(f)setFile(f);});
  $id("removeFile").onclick=()=>{resetFile();clearError();toast("Selected file removed.");};
  ui.analyse.onclick=()=>file&&analyzeDocument(file);
  $id("sampleBtn").onclick=loadSample;$id("emptySample").onclick=loadSample;$id("doctorLoadSample").onclick=()=>{loadSample();switchRole("doctor");};
  $$(".tab").forEach(b=>b.onclick=()=>{activeTab=b.dataset.tab;renderAll();});
  $id("viewJson").onclick=openJson;$id("doctorViewJson").onclick=openJson;
  $id("exportJson").onclick=exportJson;$id("doctorExportJson").onclick=exportJson;
  $id("copyJson").onclick=copyJson;$id("modalCopy").onclick=copyJson;
  $id("supportForm").onsubmit=ev=>{ev.preventDefault();$id("supportNote").textContent="Thanks. This demo form is not connected to a support inbox."; $id("supportNote").className="form-note success";ev.target.reset();toast("Demo form checked. No message was sent to a server.");};
  renderTab(); switchRole("patient");
}
init();
})();
