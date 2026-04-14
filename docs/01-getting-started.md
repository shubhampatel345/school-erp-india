# Getting Started — SHUBH SCHOOL ERP

Welcome to **SHUBH SCHOOL ERP**, a comprehensive web-based School Management System designed for Indian schools. It supports multi-school/branch operations, all user roles, and is fully mobile-optimized as an installable Progressive Web App (PWA).

---

## Quick Setup — Choose Your Data Mode

Before you begin, decide how you want to store school data:

### Option A — Local Browser Mode (Default)
**No server needed. Easiest to start.** Data is stored in your browser's localStorage. Works on a single device. No installation beyond the web app itself.

- ✅ Works immediately — no setup
- ✅ No hosting fees beyond the web app
- ❌ Data is tied to one browser on one device
- ❌ Staff on different computers see different data

**When to use:** Small schools, single-computer setup, or for evaluation.

### Option B — MySQL Server Mode (Recommended for Production)
**Real-time sync across all devices.** Data is stored in a MySQL database on your cPanel hosting. All staff, admins, parents, and students share the same real-time data from any device.

- ✅ All devices share the same data in real time
- ✅ Proper backup to server (not just browser)
- ✅ Works on any number of computers and phones simultaneously
- ✅ Data survives browser clears, device changes, reinstalls
- ⚠️ Requires cPanel hosting with PHP 7.4+ and MySQL 5.7+

**When to use:** Any school with more than one staff member using the ERP.

👉 To set up MySQL mode, see `02-deploy-cpanel.md` for the complete guide.

---

## Prerequisites

### Local Browser Mode
- Modern web browser (Chrome recommended for full PWA and QR scanner support)
- HTTPS hosting for camera and PWA install features

### MySQL Server Mode (additional requirements)
- cPanel hosting with **PHP 7.4+** and **MySQL 5.7+**
- SSL certificate (AutoSSL/Let's Encrypt — free on all cPanel hosts)
- Node.js 18+ and pnpm 8+ (for developers building from source)

---

## Default Login Credentials

| Role | Username | Password | Notes |
|------|----------|----------|-------|
| Super Admin | `superadmin` | `admin123` | **Change immediately after first login** |
| Admin | `admin` | `admin123` | Created in Settings → User Management |
| Teacher | Mobile No. | DOB (ddmmyyyy) | Auto-created when added in HR |
| Student | Admission No. | DOB (ddmmyyyy) | Auto-created when admitted |
| Parent | Father's Mobile No. | Father's Mobile No. | Supports multiple children |
| Driver | `driver` | `driver123` | Or Mobile/DOB if added via HR |
| Receptionist / Accountant / Librarian | Mobile No. | Set by Super Admin | Created in Settings → User Management |

> ⚠️ **Security:** Change the Super Admin password immediately after first login. User menu → Change Password.

---

## Auto-Generated Credentials

Credentials are automatically created when you add a student or staff member:

| User Type | Username | Default Password |
|-----------|----------|-----------------|
| Student | Admission Number (e.g. 2025001) | DOB in ddmmyyyy (e.g. 01042012) |
| Teacher / Staff | Mobile Number (e.g. 9876543210) | DOB in ddmmyyyy (e.g. 15081985) |
| Parent | Father's Mobile Number | Same mobile number |

View credentials in student/staff detail modal → **Credentials tab**. Super Admin can reset any password from **Settings → User Management**.

---

## First-Time Setup Checklist

Follow these steps in order:

### 1. Configure School Profile
`Settings → School Profile`

Enter school name, address, phone, email, upload logo, and optionally a dashboard background image. This data auto-fills receipts, certificates, ID cards, and reports.

### 2. (MySQL Mode) Connect to Database Server
`Settings → Data → Database Server tab`

Enter your API URL (e.g. `https://yourschool.com/api`), click **Test Connection**, then click **Migrate Data to Server**. After this, all data syncs in real time across devices.

### 3. Set Up Classes & Sections
`Academics → Classes & Sections`

Add your class structure (e.g. Class 1A, 1B, 2A … 12C).

### 4. Add Subjects
`Academics → Subjects`

Use the multi-class wizard to assign one subject to many classes simultaneously (e.g. Hindi → Class 1 to Class 8).

### 5. Add Staff & Teachers
`HR → Staff Directory → Add Staff`

For teachers, the Subject-Class Range Wizard (Step 2) lets you assign multiple subjects with class ranges (e.g. English: Class 1–5, Art: Class 6–8). This feeds the Teacher Timetable generator automatically.

### 6. Define Fee Structure
`Fees → Fee Headings` then `Fees → Fee Plan`

- **Fee Headings**: Define heading names and which months they apply to (e.g. Lab Fee → April, October only)
- **Fee Plan**: Set section-wise amounts — same heading can have different values per section (Super Admin only)

### 7. Admit Students
`Students → Add Student`

Fill the admission form. Credentials are auto-created (Student: Adm. No. / DOB, Teacher: Mobile / DOB, Parent: Mobile / Mobile).

### 8. Assign Transport (Optional)
`Transport → Routes`

Add routes → pickup points → set monthly fare per pickup point. Student transport details auto-populate from the Transport module.

### 9. Collect Fees
`Fees → Collect Fees`

Search student, select months, enter amount, save and print receipt. Old unpaid balance carries forward automatically.

---

## Session Management

- The current academic session (e.g. 2025-26) is shown at the top-left of the header
- Use the session dropdown to switch to any archived session for read-only historical view
- **Super Admin** can edit data in any session regardless of archive status
- Non-Super Admin roles see archived sessions as read-only
- At year-end, run **Promote Students** (sidebar) to advance all students, create the next session, and carry forward unpaid month-wise dues as Old Balance
- Sessions are archived infinitely — no data is ever deleted

---

## Module Overview

| Module | Purpose |
|--------|---------|
| Students | Admission, profile, ID cards, admit cards, bulk export |
| Fees | Fee collection, receipts, registers, due notices |
| Attendance | Manual, RFID, QR scanner, biometric, Welcome Display |
| Examinations | Timetable maker, results, marksheets |
| HR & Payroll | Staff directory, payroll, leave management |
| Academics | Classes, subjects, timetables, syllabus |
| Transport | Routes, pickup points, fare management |
| Template Studio | Design all school templates (ID, receipt, certificates) |
| Inventory | Stock, purchases, sales for school items |
| Communication | WhatsApp, RCS, notification scheduler |
| Expenses | Income/expense ledger, budget tracking |
| Homework | Assignments, submission tracking, analytics |
| Alumni | Directory, batch view, events |
| Reports | 8 data reports across all modules |
| Promote Students | Year-end bulk promotion wizard |
| Settings | School profile, sessions, users, themes, data management |
| Documentation | This guide |
