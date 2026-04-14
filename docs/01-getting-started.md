# Getting Started — SHUBH SCHOOL ERP

Welcome to **SHUBH SCHOOL ERP**, a comprehensive web-based School Management System designed for Indian schools. It supports multi-school/branch operations, all user roles, and is fully mobile-optimized as an installable Progressive Web App (PWA).

---

## Prerequisites

- Modern web browser (Chrome recommended for full PWA and QR scanner support)
- HTTPS hosting for camera and PWA install features
- Node.js 18+ and pnpm 8+ (for developers building from source)

---

## First Login

| Role | Username | Password | Notes |
|------|----------|----------|-------|
| Super Admin | `superadmin` | `admin123` | **Change immediately after first login** |
| Teacher | Mobile No. | DOB (ddmmyyyy) | Auto-created when added in HR |
| Student | Admission No. | DOB (ddmmyyyy) | Auto-created when admitted |
| Parent | Mobile No. | Mobile No. | Same as guardian mobile in student profile |
| Driver | Mobile No. | DOB (ddmmyyyy) | Added as staff with Driver designation |
| Accountant / Receptionist | Mobile No. | Set by Super Admin | Created in Settings → User Management |

---

## Initial Setup Checklist

Follow these steps in order for a complete school setup:

### 1. Configure School Profile
`Settings → School Profile`

Enter school name, address, phone, email, and upload your school logo. This data auto-fills all fee receipts, certificates, ID cards, and reports.

### 2. Set Up Classes & Sections
`Academics → Classes & Sections`

Add your class structure (e.g. Class 1A, 1B, 2A … 12C). Sections are separate entries under each class.

### 3. Add Subjects
`Academics → Subjects`

Use the multi-class assignment wizard to assign one subject to many classes simultaneously (e.g. Hindi → Class 1 through Class 8).

### 4. Add Staff & Teachers
`HR → Staff Directory → Add Staff`

For teachers, the subject-class range wizard (Step 2 of Add Staff) lets you assign multiple subjects with class ranges (e.g. English: Class 1–5, Art: Class 6–8).

### 5. Define Fee Structure
`Fees → Fee Headings` then `Fees → Fee Plan`

- **Fee Headings**: Define heading names and which months they apply to (e.g. Lab Fee → April, October only)
- **Fee Plan**: Set section-wise amounts — the same heading can have different values per section (Super Admin only)

### 6. Admit Students
`Students → Add Student`

Fill the admission form. Login credentials are auto-created (Student username = Adm. No., Password = DOB in ddmmyyyy format).

### 7. Assign Transport (Optional)
`Transport → Routes`

Add routes → pickup points → set monthly fare per pickup point. Student transport details auto-populate from the Transport module when the student is assigned to a route.

### 8. Collect Fees
`Fees → Collect Fees`

Search a student, select months, enter amount, save and print. Old unpaid balance carries forward automatically.

---

## Session Management

- The current academic session (e.g. 2025-26) is shown in the top-left header
- Use the session dropdown to switch to any archived session for read-only historical view
- **Super Admin** can edit data in any session regardless of archive status
- At year-end, run **Promote Students** (sidebar) to advance all students, create the next session (e.g. 2026-27), and carry forward unpaid month-wise dues as Old Balance
- Sessions are archived infinitely — no data is ever deleted

---

## Default Demo Credentials (for testing)

After first login as Super Admin, you can create all other users through:
- **HR → Staff Directory** (for teachers, drivers, support staff)
- **Settings → User Management** (for Admin, Accountant, Receptionist, Librarian roles)
- Students and parents get credentials automatically when admitted
