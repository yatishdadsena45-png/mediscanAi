# MediAI 🏥

> **AI-Powered Medical Document Intelligence & Patient Management Platform**  
> *Developed for Healthcare Hackathon MVP*

MediAI is a full-stack healthcare web application that combines clinical OCR document intelligence, doctor-guided verification workflows, longitudinal report comparison, and patient-friendly bilingual AI document explanations.

---

## 🚀 Live Demo & Quick Start

The server is currently running locally at:
👉 **[http://localhost:5000](http://localhost:5000)**

### ⚡ 1-Click Evaluation Accounts (For Hackathon Judges)
On the [Sign In Page](http://localhost:5000/login.html), click either:
- **🩺 Doctor Portal:** Log in as `Dr. Sarah Bennett, MD` (`dr.sarah@mediai.org` / `Password123!`)
- **👤 Patient Portal:** Log in as `Rajesh Kumar` (`rajesh.kumar@example.com` / `Password123!`)
- **🔑 One-Time Access Code:** Patient ID `MED-8041` with Access Code `MED-8041-PASS`

---

## 🛠️ Technology Stack

- **Frontend:** HTML5, CSS3 (Custom Healthcare Design System), Vanilla ES6 JavaScript, Chart.js.
- **Backend:** Node.js, Express.js REST API.
- **Database:** SQLite (`sqlite3`) with relational foreign keys, transactions, and automated seed script.
- **Document Processing:** PDF text parsing (`pdf-parse`) and OCR engine (`tesseract.js`).
- **AI Service Boundary:** Modular service supporting Google Gemini API with clinical guardrails, bilingual translation (English & Hindi), and an honest "Unconfigured" fallback when keys are omitted.
- **Security:** Bcrypt password hashing, session/cookie authentication, role-based access control (RBAC), rate-limiting, and private document storage outside public web roots.

---

## 📋 Core Features & Verification

| Feature | Description | Status |
|---|---|---|
| **Doctor Dashboard** | Real-time database telemetry: total patients, pending document reviews, upcoming appointments, and Chart.js lab test flag distribution. | ✅ Verified |
| **Patient Directory** | Real-time search, filtering by blood group/gender, and modal for adding new patients. | ✅ Verified |
| **Document Upload** | Multi-format upload (PDF, PNG, JPG) with size/type validation and instant OCR text extraction. | ✅ Verified |
| **Dual-Pane Document Review** | Side-by-side view with original document preview on left, and editable extracted fields on right with live audit trail logging. | ✅ Verified |
| **Report Comparison Matrix** | Longitudinal comparison of 2 reports from the same patient with calculated numeric deltas, percentage changes, and reference range shift alerts. | ✅ Verified |
| **Patient Access Codes** | Generate time-bound, revocable 6-digit access codes and direct invitation tokens. | ✅ Verified |
| **Appointments Scheduler** | Complete consultation booking and status management (scheduled, confirmed, completed, cancelled). | ✅ Verified |
| **Bilingual AI Document Explainer** | Patient explanations in English and Hindi with strict clinical guardrails (no diagnosing, no prescribing, uncertainty warnings, and explicit disclaimers). | ✅ Verified |

---

## 🧪 Automated Test Suite

Run the end-to-end automated test suite:
```bash
cd backend
npm test
```
Result: **9/9 Tests Passing (100%)**

---

## ⚙️ Manual Commands

If restarting the platform manually in the future:
```bash
# 1. Navigate to backend
cd backend

# 2. Install dependencies
npm install

# 3. Initialize & Seed database
npm run db:seed

# 4. Start the server
npm start
```
Open **`http://localhost:5000`** in any web browser!
