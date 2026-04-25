import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Activity,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clipboard,
  Code,
  Copy,
  Database,
  FileText,
  HardDrive,
  HelpCircle,
  History,
  IndianRupee,
  MessageSquare,
  Printer,
  Search,
  Server,
  Settings,
  Shield,
  Smartphone,
  Users,
  Wifi,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

interface DocItem {
  heading: string;
  body: string;
  code?: string;
}

interface DocSection {
  id: string;
  category: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  items: DocItem[];
}

// ── All Sections ───────────────────────────────────────────────────────────────

const DOCS: DocSection[] = [
  {
    id: "getting-started",
    category: "Setup",
    title: "Getting Started",
    icon: BookOpen,
    badge: "Start Here",
    items: [
      {
        heading: "What is SHUBH SCHOOL ERP?",
        body: `SHUBH SCHOOL ERP is a comprehensive, web-based school management system
designed for Indian schools. It covers all standard school operations:

  • Student management with bulk import/export
  • Fee collection with INR receipts and UPI/QR payment support
  • Attendance (manual, QR, RFID, biometric, AI face recognition)
  • Examinations, results, and custom result designer
  • HR & Payroll with payslip generation
  • Transport with GPS tracking
  • Library management with barcode scanning
  • Inventory for uniforms, stationery, and equipment
  • Communication via WhatsApp, SMS, and in-app notifications
  • Virtual classes via Zoom / Google Meet
  • Student analytics and performance charts
  • Role-based access for 7 roles (Super Admin, Admin, Teacher, etc.)
  • Installable as a PWA on Android/iOS

System Requirements:
  • cPanel hosting with PHP 7.4+ (8.0+ recommended)
  • MySQL 5.7+ or MariaDB 10.3+
  • Any modern browser (Chrome, Firefox, Edge, Safari)
  • Minimum 1 GB disk space for API files and database`,
      },
      {
        heading: "Quick Start Checklist",
        body: `Follow these steps in order — each step depends on the previous one.

STEP 1 — Upload PHP API to cPanel
  See "cPanel Deployment Guide" section for full details.

STEP 2 — Run database migration
  Visit: https://yourdomain.com/api/index.php?route=migrate/run
  This creates all tables and the default Super Admin account.

STEP 3 — Set Server URL in the ERP
  Settings → Server & Sync → enter API URL → Test Connection → Save

STEP 4 — Log in as Super Admin
  Username: admin
  Password: admin123
  ⚠ Change this password immediately!

STEP 5 — Add academic classes
  Academics → Classes → "+ Add Class"
  Add: Nursery, LKG, UKG, Class 1 through Class 12
  ⚠ Do this BEFORE adding students — student form reads from this list

STEP 6 — Add Fee Headings
  Fees → Fee Headings → "+ Add Heading"
  Add: Tuition Fee, Exam Fee, Development Fee, Computer, Sports, etc.

STEP 7 — Set Fee Plans
  Fees → Fee Plans → select class/section → enter monthly amounts → Save

STEP 8 — Add Students
  Students → "+ Add Student" (one by one) or "Import" (bulk Excel/CSV)

STEP 9 — Add Staff
  HR → Staff → "+ Add Staff"

STEP 10 — Create User Accounts
  Settings → User Management → "+ Create User" → assign roles`,
      },
      {
        heading: "Default Login Credentials",
        body: `┌─────────────────┬──────────────────────────────────────────┐
│ Role            │ Login Format                             │
├─────────────────┼──────────────────────────────────────────┤
│ Super Admin     │ admin / admin123                         │
│ Admin           │ Set by Super Admin in User Management    │
│ Teacher         │ Mobile Number / Date of Birth (DDMMYYYY)│
│ Receptionist    │ Mobile Number / Date of Birth            │
│ Accountant      │ Mobile Number / Date of Birth            │
│ Parent          │ Mobile Number / Mobile Number            │
│ Student         │ Admission No / Date of Birth (DDMMYYYY) │
│ Driver          │ Mobile Number / Date of Birth            │
└─────────────────┴──────────────────────────────────────────┘

TIP: Parent login uses mobile as both username and password.
     All children with the same parent mobile are shown together.

⚠ Change admin123 password immediately after first login!`,
      },
    ],
  },
  {
    id: "cpanel-deployment",
    category: "Deployment",
    title: "cPanel Deployment Guide",
    icon: Server,
    badge: "Important",
    items: [
      {
        heading: "Step 1 — Create MySQL Database in cPanel",
        body: `Log in to your cPanel (usually at yourdomain.com/cpanel).

1. Go to: cPanel → Databases → MySQL Databases
2. Under "Create New Database":
   • Enter database name: e.g. school_erp
   • Click "Create Database"
3. Under "MySQL Users → Add New User":
   • Username: e.g. erp_user
   • Password: use a strong password (letters + numbers + symbols)
   • Click "Create User"
4. Under "Add User to Database":
   • Select your user and database
   • Click "Add"
   • Tick "ALL PRIVILEGES" → click "Make Changes"

Write down these four values — you'll need them:
  • Database Host: localhost
  • Database Name: your_database_name (cPanel adds your account prefix, e.g. psmkgsco_school_erp)
  • Database User: your_username (also prefixed, e.g. psmkgsco_erp_user)
  • Database Password: the password you set`,
      },
      {
        heading: "Step 2 — Upload PHP API Files",
        body: `You need two files from the project: api/index.php and api/config.php

1. In cPanel, open: File Manager → public_html
2. Create a new folder named: api
   (Right-click → New Folder → type "api" → Create)
3. Click into the api folder
4. Click "Upload" in the toolbar
5. Upload both files:
   • api/index.php  — the complete PHP API router (~3,000 lines)
   • api/config.php — your database configuration

After uploading, you should see both files inside public_html/api/

⚠ Make sure both files are directly inside /api/ — not in a subfolder inside /api/`,
      },
      {
        heading: "Step 3 — Edit api/config.php with Your Credentials",
        body: `In cPanel File Manager:
1. Right-click api/config.php → Edit
2. Update these four lines with your real values:

   define('DB_HOST', 'localhost');
   define('DB_NAME', 'psmkgsco_school_erp');  ← your database name
   define('DB_USER', 'psmkgsco_erp_user');    ← your MySQL username
   define('DB_PASS', 'YourPassword123!');      ← your MySQL password

3. Also set a strong JWT secret (random string, 32+ characters):
   define('JWT_SECRET', 'change-this-to-a-long-random-secret-2025');

4. Set your domain for CORS:
   define('ALLOWED_ORIGINS', 'https://yourdomain.com');

5. Click "Save Changes"

⚠ These values are case-sensitive. Copy them exactly from the MySQL Databases page.`,
        code: `<?php
// api/config.php — edit these values
define('DB_HOST', 'localhost');
define('DB_NAME', 'psmkgsco_school_erp');
define('DB_USER', 'psmkgsco_erp_user');
define('DB_PASS', 'YourSecurePassword123!');
define('JWT_SECRET', 'ShubhSchoolERP_SecretKey_2025_XYZ');
define('ALLOWED_ORIGINS', 'https://shubh.psmkgs.com');
define('DB_CHARSET', 'utf8mb4');
?>`,
      },
      {
        heading: "Step 4 — Run the Database Migration",
        body: `Open a new browser tab and visit this URL (replace yourdomain.com):

  https://yourdomain.com/api/index.php?route=migrate/run

You should see:
  {"success":true,"message":"Migration complete"}

This creates ALL database tables and seeds the default admin account:
  • Username: admin
  • Password: admin123

If you see HTML instead of JSON:
  → The file was uploaded to the wrong location. Verify index.php is at public_html/api/index.php

If you see a PHP error:
  → Check config.php — the DB credentials are wrong
  → Also verify the database user has ALL PRIVILEGES

If you see a 404 error:
  → The /api/ folder doesn't exist or the file is named wrong
  → Check File Manager: public_html → api → index.php should exist`,
      },
      {
        heading: "Step 5 — Test the API Connection",
        body: `After migration, verify the API is working:

1. Open in browser: https://yourdomain.com/api/index.php?route=ping

   Expected response:
   {"success":true,"message":"API is working","version":"1.0"}

2. If you see the expected JSON — your API is live!

3. Test login:
   POST https://yourdomain.com/api/index.php?route=auth/login
   Body: {"username":"admin","password":"admin123"}

   You can test this in browser using a tool like:
   • Postman (recommended for testing)
   • curl command in terminal`,
        code: `# Test API with curl (run in terminal or Git Bash)
curl -X POST "https://yourdomain.com/api/index.php?route=auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin","password":"admin123"}'

# Expected: {"success":true,"data":{"token":"...","user":{...}}}`,
      },
      {
        heading: "Step 6 — Set Server URL in the ERP App",
        body: `Now configure the ERP frontend to point to your PHP API:

1. Open your ERP app in the browser
2. Go to: Settings → Server & Sync tab
3. In "Server URL" field, enter the FULL path to index.php:
   https://yourdomain.com/api/index.php

   ⚠ IMPORTANT: The URL must end with /api/index.php
   NOT just /api/ or /api — this is the most common mistake.

4. Click "Test Connection"
   → Should show green: "API is working (Xms)"

5. Click "Save Settings"

The app is now connected to your MySQL database.
All student, fee, attendance data will save to MySQL permanently.`,
      },
      {
        heading: "Step 7 — Log In and Change Admin Password",
        body: `1. Go to your ERP app login page
2. Enter:
   Username: admin
   Password: admin123

3. You should be logged in as Super Admin.

4. IMMEDIATELY change the password:
   Settings → User Management → find "admin" → Edit → change password

5. Add your school profile:
   Settings → School Profile → fill in name, address, phone, logo

6. You're ready to start using SHUBH SCHOOL ERP!

Next steps:
   → Add academic classes (Academics → Classes)
   → Add fee headings (Fees → Fee Headings)
   → Import students (Students → Import)`,
      },
    ],
  },
  {
    id: "api-verify",
    category: "Deployment",
    title: "Verifying the API",
    icon: Wifi,
    items: [
      {
        heading: "API Health Check",
        body: `The ping route tests if the API is alive and responding with JSON.

Visit in browser:
  https://yourdomain.com/api/index.php?route=ping

Expected response:
  {"success":true,"message":"API is working","version":"1.0"}

What each result means:
  JSON response  → API is working correctly
  HTML page      → index.php not uploaded or wrong path
  PHP error text → config.php has wrong DB credentials
  404 page       → /api/index.php file does not exist
  500 error      → PHP error, check cPanel Error Logs
  CORS error     → Update ALLOWED_ORIGINS in config.php`,
      },
      {
        heading: "API Endpoints Quick Reference",
        body: `All routes use the format: https://yourdomain.com/api/index.php?route=ROUTE_NAME

┌──────────────────────────────────┬────────┬─────────────────────────────┐
│ Route                            │ Method │ Description                 │
├──────────────────────────────────┼────────┼─────────────────────────────┤
│ ping                             │ GET    │ API health check            │
│ auth/login                       │ POST   │ Login, get JWT              │
│ auth/me                          │ GET    │ Validate current token      │
│ auth/refresh                     │ POST   │ Refresh JWT token           │
│ migrate/run                      │ GET    │ Create DB tables + seed     │
│ dashboard/stats                  │ GET    │ Dashboard statistics        │
│ dashboard/fee-chart              │ GET    │ Monthly fee chart data      │
│ students/list                    │ GET    │ List students               │
│ students/add                     │ POST   │ Add student                 │
│ students/update                  │ POST   │ Update student (?id=)       │
│ students/delete                  │ POST   │ Delete student              │
│ students/import                  │ POST   │ Bulk import students        │
│ academics/classes                │ GET    │ List classes                │
│ academics/classes/save           │ POST   │ Add/update class            │
│ academics/sections               │ GET    │ List sections               │
│ academics/sections/save          │ POST   │ Add/update section          │
│ academics/subjects               │ GET    │ List subjects               │
│ academics/subjects/save          │ POST   │ Add/update subject          │
│ fees/headings                    │ GET    │ List fee headings           │
│ fees/headings/save               │ POST   │ Add/update fee heading      │
│ fees/plan                        │ GET    │ Get fee plan                │
│ fees/plan/save                   │ POST   │ Save fee plan               │
│ fees/collect/student             │ GET    │ Get student fee details     │
│ fees/collect/save                │ POST   │ Save fee receipt            │
│ fees/receipts                    │ GET    │ List student receipts       │
│ fees/due                         │ GET    │ Students with outstanding   │
│ attendance/daily                 │ GET    │ Get daily attendance        │
│ attendance/save                  │ POST   │ Save attendance records     │
│ attendance/face                  │ POST   │ Face recognition attendance │
│ staff/list                       │ GET    │ List staff                  │
│ staff/add                        │ POST   │ Add staff                   │
│ staff/update                     │ POST   │ Update staff (?id=)         │
│ staff/import                     │ POST   │ Bulk import staff           │
│ payroll/list                     │ GET    │ List payroll records        │
│ payroll/save                     │ POST   │ Save payroll                │
│ payroll/payslip                  │ POST   │ Generate payslip            │
│ transport/routes                 │ GET    │ List routes                 │
│ transport/routes/save            │ POST   │ Add/update route            │
│ transport/pickup-points          │ GET    │ List pickup points          │
│ transport/pickup-points/save     │ POST   │ Add/update pickup point     │
│ settings/all                     │ GET    │ Get all settings            │
│ settings/save                    │ POST   │ Save settings               │
│ settings/users                   │ GET    │ List users                  │
│ settings/users/create            │ POST   │ Create user account         │
│ settings/users/update            │ POST   │ Update user account         │
│ settings/users/delete            │ POST   │ Delete user account         │
│ settings/users/reset-password    │ POST   │ Reset user password         │
│ backup/export                    │ GET    │ Export all data as JSON     │
│ backup/import                    │ POST   │ Import data from JSON       │
│ academic-sessions/list           │ GET    │ List academic sessions      │
│ academic-sessions/create         │ POST   │ Create new session          │
│ academic-sessions/set-current    │ POST   │ Set active session          │
│ academic-sessions/promote        │ POST   │ Promote students            │
└──────────────────────────────────┴────────┴─────────────────────────────┘

Note: Use POST for all write operations (add, update, delete).
      Never use PUT or DELETE — cPanel may block those HTTP methods.`,
        code: `// All requests follow this pattern:
const API_URL = 'https://yourdomain.com/api/index.php';
const token = localStorage.getItem('erp_token');

// GET example:
const res = await fetch(API_URL + '?route=students/list', {
  headers: { 'Authorization': 'Bearer ' + token }
});

// POST example:
const res = await fetch(API_URL + '?route=students/add', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ fullName: 'Rahul Sharma', ... })
});`,
      },
      {
        heading: "Response Format",
        body: `All API responses follow this standard format:

Success:
  { "success": true, "data": <payload>, "total": 100 }

Error:
  { "success": false, "error": "Description of error" }

HTTP Status Codes used:
  200 — OK (also used for errors — check "success" field)
  401 — Unauthorized (invalid/expired JWT — log in again)
  403 — Forbidden (insufficient permissions)
  404 — Route not found (wrong URL or missing ?route= param)
  500 — Server Error (PHP error — check cPanel Error Logs)

If you get HTML instead of JSON on any route:
  • The ?route= parameter is missing
  • You're hitting the wrong URL (missing index.php)
  • The route name is wrong — check the table above`,
      },
    ],
  },
  {
    id: "server-setup",
    category: "Setup",
    title: "Server Settings & Sync",
    icon: Server,
    items: [
      {
        heading: "Configure Server URL",
        body: `Settings → Server & Sync tab (Super Admin only)

1. Enter your full API URL:
   https://yourdomain.com/api/index.php

   ⚠ Must end with /api/index.php — NOT /api/ alone

2. Click "Test Connection"
   → Green "API is working (Xms)" = connected
   → Red error = something is wrong (see error message)

3. Click "Save Settings"

The app now sends all data directly to your MySQL database.
Every add/edit/delete writes to MySQL and waits for confirmation.`,
      },
      {
        heading: "Connection Errors and Fixes",
        body: `"Server returned non-JSON response (HTTP 404)":
  → index.php is not at public_html/api/index.php
  → Test: open https://yourdomain.com/api/index.php?route=ping in browser
  → If you see a 404 page: re-upload index.php to the correct location

"Server returned non-JSON response (HTTP 500)":
  → PHP error in index.php
  → Check: config.php has correct DB credentials
  → Check: database user has ALL PRIVILEGES
  → Check: cPanel → Error Logs for the exact PHP error

"Connection refused" or "Failed to fetch":
  → Server URL is wrong — verify the domain spelling
  → SSL certificate issue — URL must start with https://

"401 Unauthorized":
  → JWT token is expired — log out and log in again
  → Or: wrong JWT_SECRET in config.php (change it and re-login)

"CORS Error" in browser console:
  → Update ALLOWED_ORIGINS in config.php to your exact domain
  → Example: define('ALLOWED_ORIGINS', 'https://shubh.psmkgs.com');`,
      },
    ],
  },
  {
    id: "first-setup",
    category: "Setup",
    title: "First-Time Setup Checklist",
    icon: Settings,
    items: [
      {
        heading: "Setup Order (Follow Exactly)",
        body: `Do these in order — skipping steps causes dropdowns to be empty.

□ 1. Upload api/index.php and api/config.php to cPanel → public_html/api/
□ 2. Update credentials in api/config.php
□ 3. Visit: https://yourdomain.com/api/index.php?route=migrate/run
□ 4. Open ERP → Settings → Server & Sync → set URL → Test → Save
□ 5. Log in as: admin / admin123
□ 6. Change admin password: Settings → User Management → Edit Admin
□ 7. Add classes: Academics → Classes (Nursery, LKG, UKG, Class 1–12)
□ 8. Add sections per class: A, B, C, D, E
□ 9. Add fee headings: Fees → Fee Headings (Tuition, Exam Fee, etc.)
□ 10. Set fee plans: Fees → Fee Plans → per class/section
□ 11. Add students: Students → Import (bulk) or + Add Student
□ 12. Add staff: HR → Staff → + Add Staff
□ 13. Create user accounts: Settings → User Management → + Create User
□ 14. Test login for each role to verify access

DONE! Your ERP is ready for daily use.`,
      },
    ],
  },
  {
    id: "students",
    category: "Data Entry",
    title: "Student Management",
    icon: Users,
    items: [
      {
        heading: "Add a Single Student",
        body: `Go to Students → click "+ Add Student"

Required fields:
  • Full Name
  • Admission Number (must be unique — e.g. 2025001)
  • Class (from Academics setup — Nursery → Class 12)
  • Section (A, B, C, etc.)
  • Date of Birth (for student login)
  • Gender

Important fields:
  • Father's Name and Mobile (used for parent login and family grouping)
  • Mother's Name and Mobile
  • Address, Village, City, Pin

Optional fields:
  • Aadhaar No, SR No, Pen No, Apaar No (government IDs)
  • Category: General / OBC / SC / ST
  • Previous School, Blood Group
  • Student Photo (click camera icon)

Click "Save Student" — data saves to MySQL after server confirmation.`,
      },
      {
        heading: "Bulk Import via Excel",
        body: `Go to Students → click "Import"

Step 1 — Download the template CSV
  Click "Download Template" to get the exact format required.

Step 2 — Fill in the template
  Required columns: admNo, fullName, fatherName, motherName,
  dob (DD/MM/YYYY), gender (Male/Female), class, section, mobile

Step 3 — Upload
  Click "Choose File" → select your filled Excel/CSV
  Progress bar shows import status

Step 4 — Review
  Success message shows: "Imported 250 students (245 new, 5 updated)"
  Errors are listed below — fix and re-import those rows.

TIP: Export existing students first (Export to Excel button) to see the exact field format.`,
      },
      {
        heading: "Class Dropdown Order",
        body: `The class dropdown always shows in Indian school order:

  Nursery → LKG → UKG → Class 1 → Class 2 → ... → Class 12

This applies to all forms: student, fee, attendance, reports.

If the dropdown is empty:
  Go to Academics → Classes and add your classes first.`,
      },
      {
        heading: "Export Students to Excel",
        body: `Go to Students → click "Export to Excel"

The downloaded .xlsx file includes all columns:
admNo, fullName, fatherName, motherName, mobile, dob, class,
section, address, status, transport, category, and more.

You can use this export as a backup or to re-import into another session.`,
      },
      {
        heading: "Family Grouping",
        body: `Students sharing the same parent mobile number are automatically grouped.

In Collect Fees:
  • Search any one sibling — all siblings appear together
  • See combined family balance at a glance

In Student Grid:
  • Family icon shows sibling count
  • Click to see all children of the same parent`,
      },
    ],
  },
  {
    id: "fees",
    category: "Finance",
    title: "Fee Management",
    icon: IndianRupee,
    items: [
      {
        heading: "Create Fee Headings",
        body: `Go to Fees → Fee Headings → "+ Add Heading"

Common fee headings:
  • Tuition Fee (monthly)
  • Examination Fee (term-wise)
  • Development Fee (annual)
  • Computer Lab Fee
  • Sports Fee
  • Transport Fee (only if not using Transport module)

Each heading has:
  • Name (required)
  • Applicable Months (tick months — defaults to all 12)
  • Active toggle (inactive headings are hidden from fee plans)`,
      },
      {
        heading: "Set Up Fee Plans",
        body: `Go to Fees → Fee Plans

Step 1 — Select Class and Section
Step 2 — Enter amount for each fee heading
Step 3 — Click "Save Fee Plan"

Fee plans are per class/section per academic session.
Set fee plans for EVERY class you have — students with no fee plan show ₹0.

TIP: Amount fields are plain number inputs — click and type the amount directly.
     No spinner arrows. If you see spinners, please report the bug.`,
      },
      {
        heading: "Collect Fees from a Student",
        body: `Go to Fees → Collect Fees

Step 1 — Search student (by name, admission no, or mobile)
Step 2 — Student info loads: class, section, current balance
Step 3 — Select months to collect (April through current month pre-selected)
Step 4 — Review fee grid (amounts from fee plan auto-load)
Step 5 — Enter Payment Amount
Step 6 — Select Payment Mode: Cash / Cheque / Online / UPI
Step 7 — Click "Generate Receipt"

The system calculates:
  • Net Fee = sum of selected month amounts
  • Old Balance (red = owed, green = credit)
  • Net Payable = Net Fee + Old Balance
  • New Balance = Net Payable − Amount Paid

Positive balance (red) = student owes money, carries to next receipt
Negative balance (green) = student overpaid, credits next receipt`,
      },
      {
        heading: "Receipts — View, Reprint, Edit, Delete",
        body: `After payment — receipt auto-generates with:
  • Sequential receipt number
  • Student details, class, session
  • Month-wise fee breakdown
  • QR code (encodes receipt data)
  • School stamp placeholder

From Payment History tab on student profile:
  • Reprint: any past receipt
  • Edit: change amount or date (requires Super Admin)
  • Delete: removes receipt, balance recalculates automatically

Print formats: A4 portrait, A5, or thermal 80mm`,
      },
      {
        heading: "UPI / QR Code Payment",
        body: `When collecting fees, a UPI QR Code button appears on the payment screen.

Step 1 — Click "Pay via UPI / QR"
Step 2 — QR code displays for GPay / PhonePe / Paytm
Step 3 — Parent scans and pays
Step 4 — Click "Confirm Payment" to record it

To configure UPI:
  Settings → Online Payment
  Enter your UPI ID (e.g. school@okhdfc)
  Enable GPay / PhonePe / Razorpay toggles`,
      },
      {
        heading: "Fee Collection Chart (Dashboard)",
        body: `The Dashboard shows a monthly fee collection bar chart.

  • X-axis: April through March
  • Y-axis: Amount collected (₹)
  • Hover on any bar to see exact amount

The chart updates automatically as you collect fees.`,
      },
    ],
  },
  {
    id: "attendance",
    category: "Daily Operations",
    title: "Attendance",
    icon: Settings,
    items: [
      {
        heading: "Manual Daily Attendance",
        body: `Go to Attendance → Manual

  1. Select Class, Section, and Date
  2. All students in the class appear in a grid
  3. Click status for each student:
     P = Present · A = Absent · L = Late · H = Half Day
  4. Click "Save Attendance"

Bulk actions:
  • "Mark All Present" button at the top
  • Shift-click to select a range`,
      },
      {
        heading: "QR Code Scanner — Camera Mode",
        body: `Go to Attendance → QR Scanner → Camera tab

  1. Allow camera permission when prompted
  2. The camera opens in scan mode
  3. Student holds their QR code card to the camera
  4. System auto-detects and marks Present
  5. Success card shows: photo, name, class, check-in time

Each student has a unique QR code in their profile (print from Certificate Studio).
Multiple scans in the same day = only one attendance record.`,
      },
      {
        heading: "ESSL / ZKTeco Biometric Device",
        body: `Go to Attendance → Biometric Devices → "+ Add Device"

Required info:
  • Device Name (e.g. "Main Gate ESSL")
  • IP Address (find in device's network settings)
  • Port (default: 4370)
  • Device Type: ESSL / ZKTeco / Generic

Setup steps:
  1. Device and server must be on same local network
  2. Enter IP and click "Test Connection" — should show green
  3. Click "Sync Logs Now" to pull today's attendance

Troubleshooting:
  • Cannot connect: verify IP, ensure port 4370 is open
  • No logs: check if device has recorded any punches today
  • Students not matched: enroll with admission number as User ID`,
      },
      {
        heading: "AI Face Recognition Attendance",
        body: `Go to Attendance → Face Recognition

  1. Click "Start Camera" — allow camera permission
  2. Point camera at student entering school
  3. System identifies face and marks Present automatically
  4. Unknown faces show a "Register" prompt

To register a face:
  1. Open student profile → click "Register Face"
  2. Look at camera → take 3 photos
  3. Face is enrolled in 30 seconds

Requirements: Good lighting, front-facing camera, ≥720p resolution.`,
      },
      {
        heading: "Welcome Display (Entrance Kiosk)",
        body: `Go to Attendance → Welcome Display

This screen is designed for a TV or monitor at the school entrance.

  • Shows: live clock, school name, date
  • On each scan: large animated check-in card with photo, name, class, time
  • Last 5 check-ins scroll at the bottom
  • Automatically resets each day

Connect a monitor/TV via HDMI, open the ERP in browser, navigate here, and leave in full-screen mode (F11).`,
      },
    ],
  },
  {
    id: "academics",
    category: "Data Entry",
    title: "Academics",
    icon: BookOpen,
    items: [
      {
        heading: "Add Classes and Sections",
        body: `Go to Academics → Classes → "+ Add Class"

Class name choices:
  Nursery, LKG, UKG, Class 1, Class 2, ... Class 12

After creating a class, add sections:
  Click on the class → "+ Add Section" → enter A, B, C, D, E

⚠ IMPORTANT: Add all classes BEFORE adding any students.
  The student form reads the class list from here.
  If the dropdown is empty when adding students, add classes first.`,
      },
      {
        heading: "Add Subjects",
        body: `Go to Academics → Subjects

  1. Click "+ Add Subject"
  2. Enter subject name: Mathematics, Science, English, Hindi, etc.
  3. Assign to classes (e.g. Mathematics for Classes 6–10)

These subjects appear in:
  • Teacher timetable
  • Exam marks entry
  • Report cards
  • Homework assignments`,
      },
      {
        heading: "Timetable Maker",
        body: `Go to Academics → Timetable

  1. Select class and section
  2. Set periods per day and period duration
  3. Click "+ Add Period" or drag-and-drop subjects into slots
  4. Assign teacher to each period
  5. Add break and interval slots

Print timetable: Click "Print" → A4 format for classroom display.
Export: Download as Excel for distribution to parents.`,
      },
    ],
  },
  {
    id: "examinations",
    category: "Examinations",
    title: "Examinations & Results",
    icon: FileText,
    items: [
      {
        heading: "Create Exam Timetable",
        body: `Go to Examinations → Exam Timetable → "+ Create Timetable"

  1. Enter exam name: "First Term Exam 2025"
  2. Select classes included
  3. Wizard auto-generates per-class timetable
  4. Drag and drop to reorder subjects and dates
  5. Set exam duration per subject (e.g. 3 hours)
  6. Print timetable for all classes or per class

Admit cards auto-generate with exam schedule for each student.`,
      },
      {
        heading: "Enter Exam Results",
        body: `Go to Examinations → Results → Enter Marks

  1. Select exam, class, section, and subject
  2. All enrolled students appear in the grid
  3. Enter marks out of maximum
  4. System auto-calculates grade:
     90%+ = A+, 80–89% = A, 70–79% = B, 60–69% = C, 50–59% = D, <50% = F
  5. Click "Save Marks"

Bulk import marks: Download template → fill → upload CSV`,
      },
      {
        heading: "Online MCQ Exam with Auto-Grading",
        body: `Go to Examinations → Online Exam → "+ Create Test"

  1. Enter: Title, Class, Duration (minutes), Total Marks
  2. Add questions with 4 options (A, B, C, D), mark correct answer
  3. Assign to class — students see it in their portal
  4. Students take the test with countdown timer
  5. Results generate instantly after submission

View results: Examinations → Online Exam → Results tab`,
      },
      {
        heading: "Result Designer",
        body: `Go to Examinations → Result Designer

Design your result/marksheet template:
  • Drag and drop fields: student name, marks, grade, rank, etc.
  • Change fonts, sizes, colors
  • Import a background image (school letterhead scan)
  • Set paper size: A4 / A5 / Custom
  • Add watermark text ("ORIGINAL" / "COPY")
  • Add school stamp (circular, configurable)

Save as default template — all result prints use this layout.`,
      },
      {
        heading: "Print Results and WhatsApp Broadcast",
        body: `Print:
  Examinations → Results → select class → "Print All"
  Batch prints result sheets for entire class using your saved template.

WhatsApp Broadcast:
  Results → "Send via WhatsApp"
  Each parent receives their child's individual result card as a WhatsApp message.
  Progress bar shows delivery status (sent / failed).
  Requires WhatsApp API configured in Settings → WhatsApp.`,
      },
    ],
  },
  {
    id: "hr",
    category: "HR",
    title: "HR & Payroll",
    icon: Users,
    items: [
      {
        heading: "Staff Directory",
        body: `Go to HR → Staff → "+ Add Staff"

Required fields:
  • Employee ID (unique, e.g. EMP001)
  • Full Name
  • Designation: Teacher / Principal / Clerk / Driver / etc.
  • Mobile Number (used for login)
  • Date of Birth (used for login — DDMMYYYY format)

Optional:
  • Department, Joining Date, Email
  • Bank Account, PAN Number
  • Gross Salary (for payslip calculation)

Export to Excel: HR → Staff → "Export" button
Bulk import: HR → Staff → "Import" (use template CSV)`,
      },
      {
        heading: "Assign Subjects to Teachers",
        body: `Go to HR → Teacher Subjects

  1. Select teacher from the list
  2. Click "+ Assign Subject"
  3. Choose subject and class range (e.g. Mathematics, Class 6–10)
  4. A teacher can have multiple subject-class assignments

This data feeds:
  • Timetable maker (auto-loads available teachers per period)
  • Attendance (teacher marks their class)`,
      },
      {
        heading: "Payroll Calculation",
        body: `Go to HR → Payroll → select month

  1. Click "Generate Payslips"
  2. System calculates for each staff:
     • Basic Salary (from staff profile)
     • Working Days vs Present Days (from attendance)
     • Deductions: LWP = Salary/Days × Absent Days
     • Allowances: DA, HRA, etc.
     • Net Salary = Basic + Allowances − Deductions

  3. Review each payslip
  4. Click "Print Payslip" for individual or "Print All" for batch
  5. Export payroll register to Excel

All amount fields are plain number inputs — no spinner arrows.`,
      },
    ],
  },
  {
    id: "transport",
    category: "Operations",
    title: "Transport",
    icon: Smartphone,
    items: [
      {
        heading: "Set Up Routes and Pickup Points",
        body: `Go to Transport → Routes → "+ Add Route"
  • Route Name: e.g. "Sector 5 Route"
  • Bus Number: e.g. "MP09AB1234"
  • Driver: assign from staff list

Add Pickup Points to the route:
  → Click route → "+ Add Pickup Point"
  • Point Name: e.g. "City Centre", "Bus Stand"
  • Monthly Fare (₹): amount charged per month for students at this point
  • Approximate Time: e.g. 7:30 AM`,
      },
      {
        heading: "Assign Transport to Student",
        body: `Open a student → Transport tab

  • Select Route (dropdown)
  • Select Pickup Point (dropdown — auto-fills fare)
  • Monthly fare auto-fills from the route setup
  • Select applicable months (checkboxes April–March)

The transport fee integrates with Collect Fees automatically.`,
      },
      {
        heading: "GPS Transport Tracking",
        body: `Driver Setup (on driver's phone):
  1. Open ERP on phone, log in as driver
  2. Transport → GPS Tracking → "Start Sharing Location"
  3. Allow location permission
  4. Phone sends location updates every 30 seconds

Parent View:
  1. Parent logs in → Transport → "Track Bus"
  2. Map shows live bus location

Admin View:
  Transport → Live Map — all active buses shown simultaneously`,
      },
    ],
  },
  {
    id: "library",
    category: "Operations",
    title: "Library",
    icon: BookOpen,
    items: [
      {
        heading: "Add Books to Catalog",
        body: `Go to Library → Books → "+ Add Book"

  • Title, Author, Publisher, Year
  • ISBN (optional — for barcode scanning)
  • Category: Fiction / Reference / Textbook / etc.
  • Quantity (total copies)
  • Shelf/Rack Location

Import books in bulk: Library → Import (CSV with same columns)`,
      },
      {
        heading: "Issue and Return Books",
        body: `Issue a Book:
  Library → Issue → search student by name or admission no
  → select book → set due date → "Issue"

Return a Book:
  Library → Returns → search by student or book
  → click "Return" → overdue fine calculates automatically

Fine Calculation:
  Fine = Days Overdue × Fine per Day (set in Library Settings)`,
      },
      {
        heading: "Barcode Scanning",
        body: `Use your phone camera or a USB barcode scanner:

Camera Scan:
  Library → Issue/Return → click "Scan Barcode" icon
  Point camera at book's barcode — auto-populates book fields

USB Scanner:
  Plug in USB barcode scanner, click the ISBN field, scan book
  The ISBN auto-fills and book details load`,
      },
    ],
  },
  {
    id: "inventory",
    category: "Operations",
    title: "Inventory",
    icon: Database,
    items: [
      {
        heading: "Add Inventory Items",
        body: `Go to Inventory → Items → "+ Add Item"

  • Item Name: e.g. "School Uniform", "Tie", "Belt", "ID Card"
  • Category: Uniform / Stationery / Equipment / etc.
  • Unit: Piece / Set / Box
  • Purchase Price (₹), Sell Price (₹)
  • Opening Stock Quantity
  • Store/Location`,
      },
      {
        heading: "Stock In and Out",
        body: `Stock In (purchase/receive):
  Inventory → Transactions → "+ Stock In"
  Enter item, quantity, and purchase price → Save

Stock Out (sale/issue to student):
  Inventory → Transactions → "+ Stock Out"
  Enter item, quantity, student (optional) → Save
  Current stock auto-deducts

Stock Report:
  Inventory → Reports → shows all items with current stock level
  Low stock items highlighted in red
  Export to Excel / Print`,
      },
    ],
  },
  {
    id: "communication",
    category: "Communication",
    title: "WhatsApp & Communication",
    icon: MessageSquare,
    items: [
      {
        heading: "Configure WhatsApp API",
        body: `Go to Settings → WhatsApp API

Supported providers: Twilio, Gupshup, WATI, Interakt, WaCoder

Step 1 — Sign up with a WhatsApp API provider
Step 2 — Get your credentials:
  • API Key / Auth Key
  • Sender Phone Number (WhatsApp Business number)
  • App Key (provider-specific)

Step 3 — Enter in Settings → WhatsApp:
  • API Key
  • Phone Number (with country code: 91XXXXXXXXXX)
  • App Key

Step 4 — Click "Send Test Message" — enter your number to verify
Step 5 — Enter Webhook URL from Settings into your provider's dashboard

Done! WhatsApp receipts, reminders, and broadcasts are now active.`,
      },
      {
        heading: "Bulk WhatsApp Broadcast",
        body: `Communication → Broadcast → "+ New Broadcast"

  1. Select recipient group:
     • All Parents / All Students
     • Class-wise (e.g. all Class 10 parents)
     • Custom (paste phone numbers)

  2. Compose message (supports variables):
     {{name}} = student name, {{admNo}} = admission number
     {{class}} = class name, {{balance}} = fee balance

  3. Add attachment (optional): result card, timetable, notice PDF

  4. Click "Send" — progress shows in real-time
     Sent: 234 / Failed: 3 / Pending: 12`,
      },
      {
        heading: "Notification Scheduler",
        body: `Communication → Notifications → Scheduler

Set automated notifications for:
  • Fees Due Reminder (e.g. 5 days before due date)
  • Attendance Alert (parent notified when child is absent)
  • Exam Schedule (3 days before first exam)
  • Birthday Wishes (morning on birthday)
  • Result Publish (when you publish results)

Each rule:
  • Event trigger
  • Recipient group (All Parents / All Staff / etc.)
  • Channel: WhatsApp / SMS / Push Notification / Email
  • Message template with variables`,
      },
    ],
  },
  {
    id: "sessions",
    category: "Admin",
    title: "Sessions & Year-End Promotion",
    icon: Settings,
    items: [
      {
        heading: "Session Management",
        body: `Sessions 2019-20 through 2025-26 are pre-loaded by default.
Super Admin can switch to any session and add historical data.

Settings → Session Management

  • Create new session: "+ New Session" → e.g. "2026-27"
  • Switch active session: click "Set Active" on any session
  • View archived data: click any session to browse (read-only for non-Super Admin)

Session data is isolated — switching to 2024-25 shows only that year's
students, fees, attendance, and results.`,
      },
      {
        heading: "Promote Students at Year End",
        body: `Settings → Session Management → "Promote Students"

Step 1 — Auto-creates next session if it doesn't exist (e.g. 2026-27)
Step 2 — Class mapping table shows: Nursery→LKG, LKG→UKG, Class 1→2, etc.
Step 3 — You can change any mapping before proceeding
Step 4 — Options:
  • Carry forward fee dues: unpaid fees move to new session
  • Auto-discontinue Class 12 graduates → moved to Alumni
  • Keep current section or reassign

Step 5 — Preview list of students affected
Step 6 — Confirm → all selected students promoted at once

What carries forward:
  • Staff (all staff auto-copied to new session)
  • Classes and sections
  • Fee headings (amounts reset to zero — re-enter for new year)

What resets:
  • Attendance records (new year starts fresh)
  • Fee receipts (start fresh, old dues carry forward optionally)`,
      },
    ],
  },
  {
    id: "user-management",
    category: "Admin",
    title: "User Management & Permissions",
    icon: Shield,
    items: [
      {
        heading: "Role-Based Access Table",
        body: `┌────────────────┬──────────────────────────────────────────────────┐
│ Role           │ What They Can Access                             │
├────────────────┼──────────────────────────────────────────────────┤
│ Super Admin    │ Everything — full access to all modules          │
│ Admin          │ All modules except User Management               │
│ Teacher        │ Attendance, homework, timetable, own class only  │
│ Accountant     │ Fees collection, receipts, reports               │
│ Receptionist   │ Students, attendance, basic reports              │
│ Parent         │ Own child's fees, attendance, results only       │
│ Student        │ Own timetable, homework, results                 │
│ Driver         │ Transport route and assigned students            │
└────────────────┴──────────────────────────────────────────────────┘

Super Admin cannot be restricted by permissions.
All role dashboards are tailored to show only relevant modules.`,
      },
      {
        heading: "Create User Accounts",
        body: `Settings → User Management → "+ Create User"

  • Role: Admin / Teacher / Accountant / Receptionist / Librarian / Driver
  • Full Name
  • Username (for login)
  • Initial Password (user should change on first login)
  • Assign Staff Record (link to HR staff profile)

For Teachers:
  Username = their mobile number
  Password = their DOB in DDMMYYYY format
  (Set automatically when teacher is added via HR → Staff)`,
      },
      {
        heading: "Reset a User's Password",
        body: `Settings → User Management → find user → "Reset Password"

  1. Enter new temporary password
  2. Click "Reset"
  3. Tell the user their new password
  4. User can change it in the header → Profile → Change Password

Or reset your own password:
  Header → click your name → "Change Password"`,
      },
      {
        heading: "Module-Level Permissions",
        body: `Settings → Permissions → select role

Configure per module:
  ✓ canView   — can see the module
  ✓ canAdd    — can add new records
  ✓ canEdit   — can edit existing records
  ✓ canDelete — can delete records

Apply changes → affects all users with that role immediately.
Super Admin always has full access and cannot be restricted.`,
      },
    ],
  },
  {
    id: "backup",
    category: "Admin",
    title: "Backup & Restore",
    icon: HardDrive,
    items: [
      {
        heading: "Export All Data (Backup)",
        body: `Settings → Data Management → "Export All Data"

  • Downloads a single JSON file containing ALL school data
  • Includes: students, fees, staff, attendance, and all other modules
  • File name: shubh_erp_backup_YYYY-MM-DD.json

Store the backup file on:
  • Google Drive (recommended)
  • USB flash drive
  • Email to yourself

Schedule reminders:
  Settings → Data Management → Backup Reminders
  → Weekly or Monthly → notification sent to Super Admin`,
      },
      {
        heading: "Import / Restore from Backup",
        body: `Settings → Data Management → "Import from Backup"

  1. Choose your JSON backup file
  2. Select mode:
     • Merge: adds new records, keeps existing ones
     • Replace: wipes all data and replaces with backup

  ⚠ "Replace" mode deletes ALL current data first.
  Use "Merge" if you want to restore missing records only.`,
      },
      {
        heading: "Factory Reset",
        body: `Settings → Data Management → "Factory Reset"

This wipes ALL school data and returns app to fresh install state.

⚠ CANNOT BE UNDONE.
Always export a backup BEFORE performing factory reset.

Use case: Starting new school year with fresh data (rare — usually Promote is better).`,
      },
      {
        heading: "phpMyAdmin Backup (Direct Database)",
        body: `For a direct database backup from cPanel:

  1. cPanel → phpMyAdmin → select your database
  2. Click "Export" tab
  3. Format: SQL → click "Go"
  4. Saves a .sql file — complete database backup

To restore from .sql file:
  1. phpMyAdmin → select your database
  2. Click "Import" tab
  3. Choose your .sql file → click "Go"

This is the most reliable backup method — keeps your MySQL data safe independently.`,
      },
    ],
  },
  {
    id: "troubleshooting",
    category: "Support",
    title: "Troubleshooting",
    icon: HelpCircle,
    items: [
      {
        heading: '"Server returned non-JSON response (HTTP 404)"',
        body: `This error means the API file is not at the expected URL.

Cause: The frontend is calling a URL that returns HTML (a 404 page) instead of JSON.

Step 1 — Test the ping route directly in your browser:
  https://yourdomain.com/api/index.php?route=ping

  If you see: {"success":true,"message":"API is working"}
    → The API is working. The error is from a specific route being wrong.
    → Check the exact URL being called (look in browser DevTools → Network tab)

  If you see a 404 HTML page:
    → index.php is not at public_html/api/index.php
    → Re-upload index.php to the correct location in cPanel File Manager

  If you see HTML output (not a 404):
    → index.php is in the wrong folder — verify it's in public_html/api/

Step 2 — Verify the Server URL in Settings:
  Settings → Server & Sync → Server URL
  Must be: https://yourdomain.com/api/index.php
  NOT: https://yourdomain.com/api/ (this causes 404)
  NOT: https://yourdomain.com/api (missing index.php)`,
      },
      {
        heading: '"Server returned non-JSON response (HTTP 500)"',
        body: `A PHP error occurred on the server.

Step 1 — Check config.php credentials:
  In cPanel File Manager → public_html/api/config.php → Edit
  Verify DB_HOST, DB_NAME, DB_USER, DB_PASS are all correct

Step 2 — Verify migration was run:
  Visit: https://yourdomain.com/api/index.php?route=migrate/run
  Should return: {"success":true,"message":"Migration complete"}

Step 3 — Check cPanel Error Logs:
  cPanel → Logs → Error Log
  Look for PHP errors with "api/index.php" in the path

Common PHP 500 causes:
  • Wrong MySQL credentials in config.php
  • MySQL user doesn't have ALL PRIVILEGES
  • PHP version below 7.4 (upgrade in cPanel → PHP Version)
  • Missing PHP extensions: mysqli, json (very rare on modern cPanel)`,
      },
      {
        heading: '"Session expired" Immediately After Login',
        body: `This is a client-side timing issue, not a real session problem.

Fix 1 — Clear browser data and log in again:
  Chrome: Ctrl+Shift+Delete → clear "Cookies and site data" for the domain
  Then open the ERP and log in fresh.

Fix 2 — Hard refresh:
  Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)

Fix 3 — Check JWT_SECRET in config.php:
  If JWT_SECRET was changed after logging in, the old token becomes invalid.
  Log out and log in again after any config.php change.

The "Session expired" modal should NEVER appear immediately after a fresh login.
If it appears right after logging in, clear browser cookies/localStorage and try again.`,
      },
      {
        heading: "Connection Failed in Server Settings",
        body: `Settings → Server & Sync → Test Connection shows "Connection failed"

Step 1 — Verify the URL format:
  ✓ Correct: https://yourdomain.com/api/index.php
  ✗ Wrong:   https://yourdomain.com/api/
  ✗ Wrong:   https://yourdomain.com/api
  ✗ Wrong:   http://... (must be https://)

Step 2 — Test ping directly:
  Open in browser: https://yourdomain.com/api/index.php?route=ping
  If this works but Test Connection fails, check if there are extra spaces in the URL.

Step 3 — Check CORS settings in config.php:
  define('ALLOWED_ORIGINS', 'https://your-erp-app-domain.com');
  Must match the exact domain where the ERP is running.`,
      },
      {
        heading: "Data Not Saving",
        body: `When you add a student/staff/record and it disappears or doesn't save:

Step 1 — Check the Server URL:
  Settings → Server & Sync → Test Connection
  Must show green "API is working" before data can save.

Step 2 — Verify migration was run:
  Visit: https://yourdomain.com/api/index.php?route=migrate/run
  All tables must exist for data to save.

Step 3 — Check browser console for errors:
  Press F12 → Console tab → look for red error messages

Step 4 — Check the specific route:
  Open DevTools → Network tab → click "Add Student"
  Find the failing request → check URL and response

Common cause: config.php has wrong DB credentials so MySQL write fails silently.`,
      },
      {
        heading: "Class Dropdown Empty",
        body: `The class dropdown in student/fee forms pulls from Academics → Classes.

If the dropdown shows no classes:
  1. Go to Academics → Classes
  2. Add all your classes: Nursery, LKG, UKG, Class 1 through Class 12
  3. For each class, add sections: A, B, C, etc.
  4. Return to the student/fee form — dropdown should now be populated

If classes exist but dropdown is still empty:
  Hard refresh the page (Ctrl+Shift+R) and try again.`,
      },
      {
        heading: "Blank White Screen on App Load",
        body: `Cause: JavaScript error preventing app from rendering.

Fixes:
  1. Hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
  2. Clear browser cache: Settings → Privacy → Clear Data
  3. Open browser console (F12 → Console) — look for red errors
  4. If error mentions "api": check that api/config.php has correct credentials
  5. Try a different browser (Chrome is recommended)`,
      },
      {
        heading: "Fee Plan Amount Fields Not Typeable",
        body: `The fee plan amount fields must be plain number inputs with no spinner arrows.

If you see spinner arrows or can't type amounts:
  1. Click the field once to focus
  2. Select all with Ctrl+A
  3. Type the amount directly

If the field still doesn't accept typing:
  1. Try a different browser (Chrome works best)
  2. Disable browser extensions (some modify form inputs)
  3. Hard refresh the page (Ctrl+Shift+R)

Note: The design INTENTIONALLY removes spinner arrows everywhere.
If spinner arrows appear on any amount field, it is a bug — please report it.`,
      },
    ],
  },
  {
    id: "faq",
    category: "Support",
    title: "FAQ",
    icon: HelpCircle,
    items: [
      {
        heading: "Frequently Asked Questions",
        body: `Q: How many students can the app handle?
A: Tested with 1,000+ students. Pagination loads 50 at a time for performance.
   There is no hard limit — MySQL can handle tens of thousands of records.

Q: Can parents see other children's data?
A: No. Parent login shows only children whose parent mobile matches the login number.
   Complete data isolation between families.

Q: Can I use this on mobile?
A: Yes — install as a PWA:
   Chrome → menu (⋮) → "Add to Home Screen" → Install
   Works on Android and iOS. All features available on mobile.

Q: Can I run multiple schools?
A: Yes. Each school gets its own separate project with its own URL and database.
   Example: schoola.psmkgs.com, schoolb.psmkgs.com — completely separate data.

Q: How do I reset Super Admin password?
A: Method 1: phpMyAdmin → users table → edit → reset password
   Method 2: Settings → User Management → find admin → Reset Password

Q: Does the app work offline?
A: No — this version requires an active internet connection to the cPanel server.
   All data reads and writes go directly to MySQL. No offline support.

Q: How do I backup my data?
A: Method 1: Settings → Data Management → "Export All Data" → JSON file
   Method 2: cPanel → phpMyAdmin → Export → SQL file (more reliable)

Q: Can I export student list to Excel?
A: Yes. Students → "Export to Excel" button downloads a .xlsx file.

Q: Why do I get "HTTP 404" errors?
A: The API route doesn't exist or the URL is wrong. Check:
   1. Settings → Server & Sync → must end with /api/index.php
   2. Run ?route=ping to verify API is reachable
   3. See "Troubleshooting" section for detailed fixes.

Q: What PHP version do I need?
A: PHP 7.4 minimum, PHP 8.0+ recommended.
   Check in cPanel → PHP Version → select 8.0 or 8.1

Q: Does the app support .htaccess routing?
A: No — the API uses query parameter routing (?route=) by design, so .htaccess
   is not required. This ensures maximum compatibility with all cPanel servers.`,
      },
    ],
  },
  {
    id: "glossary",
    category: "Reference",
    title: "Glossary",
    icon: BookOpen,
    items: [
      {
        heading: "Key Terms",
        body: `Academic Session:
  A school year, typically April to March (e.g. 2025-26).
  All data (students, fees, attendance) belongs to a session.

Admission Number (Adm No):
  Unique ID assigned to each student at enrollment.
  Used for student login and fee receipts.

Fee Heading:
  A category of fee such as Tuition Fee, Exam Fee, or Development Fee.
  Set in Fees → Fee Headings.

Fee Plan:
  The monthly amount for each fee heading, per class and section.
  Set in Fees → Fee Plans. Students are charged based on their class's plan.

Family Grouping:
  Students sharing the same parent mobile number are grouped together.
  Useful for collecting fees for siblings in one transaction.

Pickup Point:
  A bus stop on a transport route where students board.
  Each point has its own monthly fare.

RFID:
  Radio Frequency Identification — a card students tap on a reader to mark attendance.
  Card number is enrolled in the device and matched to the student in ERP.

JWT (JSON Web Token):
  An authentication token stored in your browser after login.
  Sent with every API request to verify your identity. Expires after some time.

Super Admin:
  The top-level user with full access to all settings, data, and user accounts.
  Default credentials: admin / admin123. Cannot be restricted by permissions.

cPanel:
  A web hosting control panel. Used to manage files, databases, and PHP settings.
  The PHP API files (index.php, config.php) are uploaded here.`,
      },
    ],
  },
  {
    id: "changelog",
    category: "Reference",
    title: "Version History",
    icon: History,
    items: [
      {
        heading: "Recent Major Versions",
        body: `v96 (2024 Q3) — Full rebuild with Internet Computer canister storage.
  Reliable data storage. Local-first sync. 25+ modules live.

v111–v119 (2024 Q4) — IC deployment issues.
  Multiple builds attempting to go live failed due to Motoko compilation errors.
  Data intact in preview. Production deployment blocked.

v120–v124 (2024 Q4) — Canister rebuild attempts.
  Clean backend rewrites. Preview worked but go-live continued failing.

v125 (2025 Q1) — Migration to cPanel/MySQL.
  Switched from Internet Computer to traditional PHP/MySQL backend.
  Eliminated deployment errors. Data now in MySQL on user's cPanel.

v126+ — Bug fixes and improvements.
  Fee plan typing fixes. Student disappearing data fixed.
  Performance: skeleton loading, pagination, parallel data fetch.
  All offline/sync code removed — fully online, direct MySQL.

v127–v130 — Session and API fixes.
  Token expiry fixed: "Session expired" no longer appears right after login.
  API route mismatches fixed across all modules.
  Sessions 2019-26 pre-loaded for historical data entry.

Current — Full route audit and documentation overhaul.
  All HTTP 404 mismatches in API routes are now fixed.
  Complete cPanel deployment guide added to Documentation.
  All API calls use verified routes matching the backend exactly.
  No PUT or DELETE methods used — POST only for maximum cPanel compatibility.`,
      },
    ],
  },
  {
    id: "api-reference",
    category: "Developer",
    title: "API Reference",
    icon: Code,
    items: [
      {
        heading: "Base URL and Authentication",
        body: `Base URL:   https://yourdomain.com/api/index.php
Auth:       Bearer JWT in Authorization header
Format:     All requests/responses are JSON
Routing:    All routes use ?route= query parameter

Login to get JWT:
  POST https://yourdomain.com/api/index.php?route=auth/login
  Body: { "username": "admin", "password": "admin123" }
  Response: { "success": true, "data": { "token": "...", "user": {...} } }

Include token in all subsequent requests:
  Authorization: Bearer <your_jwt_token>

⚠ Important: Use POST for all write operations.
   Never use PUT or DELETE — cPanel may block those HTTP methods.
   Updates use POST with ?id= in the URL (e.g. ?route=students/update&id=123)`,
        code: `// Example: Login and get token
const loginRes = await fetch(
  'https://yourdomain.com/api/index.php?route=auth/login',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  }
);
const { data } = await loginRes.json();
const token = data.token;

// Example: Fetch students with auth
const studentsRes = await fetch(
  'https://yourdomain.com/api/index.php?route=students/list',
  { headers: { 'Authorization': 'Bearer ' + token } }
);
const students = await studentsRes.json();`,
      },
      {
        heading: "Complete Route Reference",
        body: `AUTH
  POST auth/login             — Login, returns JWT token
  GET  auth/me                — Verify token and get current user
  POST auth/refresh           — Refresh token with refresh_token
  POST auth/logout            — Logout

SYSTEM
  GET  ping                   — API health check (no auth needed)
  GET  migrate/run            — Create tables + seed admin (run once)

DASHBOARD
  GET  dashboard/stats        — Student/staff/class counts, today's fees
  GET  dashboard/fee-chart    — Monthly fee collection data
  GET  dashboard/recent-activity — Recent changes/events

STUDENTS
  GET  students/list          — All students (paginated: ?page=1&limit=50)
  GET  students/get           — Single student (?id=123)
  POST students/add           — Add new student
  POST students/update        — Update student (?id=123 in URL)
  POST students/delete        — Delete student (id in body)
  POST students/import        — Bulk import (body: {students:[...]})
  GET  students/count         — Total student count

ACADEMICS
  GET  academics/classes      — List classes
  POST academics/classes/save — Add or update class (id in body = update)
  POST academics/classes/delete — Delete class (id in body)
  GET  academics/sections     — List sections (?class_id=X)
  POST academics/sections/save — Add section
  GET  academics/subjects     — List subjects (?class_id=X)
  POST academics/subjects/save — Add or update subject
  POST academics/subjects/delete — Delete subject

FEES
  GET  fees/headings          — List fee headings
  POST fees/headings/save     — Add or update fee heading
  POST fees/headings/delete   — Delete fee heading
  GET  fees/plan              — Get fee plan (?class=X&section=Y)
  POST fees/plan/save         — Save fee plan
  GET  fees/collect/student   — Get student fee details (?studentId=X)
  POST fees/collect/save      — Save fee receipt
  GET  fees/receipts          — Get receipts (?studentId=X)
  POST fees/receipt/delete    — Delete receipt
  GET  fees/due               — Students with outstanding dues
  GET  fees/collection-chart  — Monthly chart data

ATTENDANCE
  GET  attendance/daily       — Daily attendance (?class=X&date=Y)
  POST attendance/save        — Save attendance records
  GET  attendance/summary     — Attendance summary
  GET  attendance/student     — Student attendance (?studentId=X)
  POST attendance/face        — Face recognition attendance record

STAFF & PAYROLL
  GET  staff/list             — List all staff
  GET  staff/get              — Single staff (?id=X)
  POST staff/add              — Add staff member
  POST staff/update           — Update staff (?id=X in URL)
  POST staff/delete           — Delete staff (id in body)
  POST staff/import           — Bulk import staff
  GET  payroll/list           — List payroll records
  POST payroll/save           — Save payroll record
  POST payroll/payslip        — Generate payslip

SESSIONS
  GET  academic-sessions/list       — List all sessions
  POST academic-sessions/create     — Create new session
  POST academic-sessions/set-current — Set active session
  POST academic-sessions/promote    — Promote students

TRANSPORT
  GET  transport/routes             — List routes
  POST transport/routes/save        — Add/update route
  POST transport/routes/delete      — Delete route
  GET  transport/buses              — List buses
  POST transport/buses/save         — Add/update bus
  GET  transport/pickup-points      — List pickup points
  POST transport/pickup-points/save — Add/update pickup point
  GET  transport/driver-students    — Students for a driver

LIBRARY
  GET  library/books          — List books
  POST library/books/add      — Add book
  POST library/books/update   — Update book
  POST library/issue          — Issue book to student
  POST library/return         — Return book
  GET  library/overdue        — Overdue books

INVENTORY
  GET  inventory/items              — List items
  POST inventory/items/add          — Add item
  POST inventory/items/update       — Update item
  POST inventory/items/delete       — Delete item
  POST inventory/transactions/add   — Add transaction (stock in/out)

COMMUNICATION
  POST communication/whatsapp/send          — Send WhatsApp
  GET  communication/broadcast-history      — Broadcast history
  POST communication/notification/schedule  — Schedule notification
  GET  communication/notifications          — Get notifications
  POST communication/notifications/mark-read — Mark as read

CHAT
  GET  chat/rooms             — List chat rooms
  POST chat/rooms/create      — Create chat room
  GET  chat/messages          — Get messages (?room_id=X)
  POST chat/messages/send     — Send message

SETTINGS & USERS
  GET  settings/all                       — All settings
  POST settings/save                      — Save settings
  GET  settings/users                     — List user accounts
  POST settings/users/create              — Create user account
  POST settings/users/update              — Update user account
  POST settings/users/delete              — Delete user account
  POST settings/users/reset-password      — Reset user password

REPORTS
  GET  reports/students       — Student report
  GET  reports/finance        — Finance report
  GET  reports/attendance     — Attendance report
  GET  reports/fee-register   — Fee register report

EXPENSES & HOMEWORK
  GET  expenses               — List expenses
  POST expenses/add           — Add expense
  POST expenses/delete        — Delete expense (id in body)
  GET  homework               — List homework
  POST homework/add           — Add homework
  POST homework/delete        — Delete homework

BACKUP
  GET  backup/export          — Export all data as JSON
  POST backup/import          — Import data from JSON`,
      },
    ],
  },
];

// ── Text Highlight ────────────────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts = text.split(
    new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
  );
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark // biome-ignore lint/suspicious/noArrayIndexKey: regex split parts have no stable identity
            key={`part-${i}`}
            className="bg-yellow-200 text-yellow-900 rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: regex split parts have no stable identity
          <span key={`part-${i}`}>{part}</span>
        ),
      )}
    </>
  );
}

// ── CodeBlock ─────────────────────────────────────────────────────────────────

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative mt-3 rounded-lg bg-muted/60 border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/80 border-b border-border">
        <span className="text-[10px] font-mono text-muted-foreground">
          code
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Clipboard className="w-3 h-3" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="text-xs font-mono text-foreground px-4 py-3 overflow-x-auto leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

// ── DocSectionPanel ───────────────────────────────────────────────────────────

function DocSectionPanel({
  section,
  searchQuery,
  defaultOpen,
}: {
  section: DocSection;
  searchQuery: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const shouldOpen = open || !!searchQuery;
  const Icon = section.icon;

  const filteredItems = searchQuery
    ? section.items.filter(
        (item) =>
          item.heading.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.body.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : section.items;

  if (searchQuery && filteredItems.length === 0) return null;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card shadow-subtle">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors"
        onClick={() => setOpen((v) => !v)}
        data-ocid={`docs.${section.id}.toggle`}
        aria-expanded={shouldOpen}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-md bg-primary/10 flex-shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">
              {section.title}
            </span>
            {section.badge && (
              <Badge variant="secondary" className="text-xs font-normal">
                {section.badge}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {filteredItems.length} topic
              {filteredItems.length !== 1 ? "s" : ""}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider hidden sm:inline">
              {section.category}
            </span>
          </div>
        </div>
        {shouldOpen ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {shouldOpen && (
        <div className="border-t border-border divide-y divide-border/50">
          {filteredItems.map((item) => (
            <div key={item.heading} className="px-4 py-4">
              <p className="font-semibold text-sm text-foreground mb-2">
                <Highlight text={item.heading} query={searchQuery} />
              </p>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-body">
                <Highlight text={item.body} query={searchQuery} />
              </pre>
              {item.code && <CodeBlock code={item.code} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Category groups ───────────────────────────────────────────────────────────

const CATEGORIES = [...new Set(DOCS.map((s) => s.category))];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Documentation() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const contentRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    let base = DOCS;
    if (activeCategory !== "All") {
      base = base.filter((s) => s.category === activeCategory);
    }
    if (!search) return base;
    const q = search.toLowerCase();
    return base.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.items.some(
          (c) =>
            c.heading.toLowerCase().includes(q) ||
            c.body.toLowerCase().includes(q),
        ),
    );
  }, [search, activeCategory]);

  const totalTopics = DOCS.reduce((s, d) => s + d.items.length, 0);

  const scrollTo = (id: string) => {
    const el = document.getElementById(`doc-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex flex-col bg-background min-h-screen">
      {/* Top bar */}
      <div className="bg-card border-b border-border px-4 md:px-6 py-4 space-y-3 sticky top-0 z-10 shadow-subtle">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground font-display leading-tight">
                Documentation
              </h1>
              <p className="text-xs text-muted-foreground">
                {DOCS.length} sections · {totalTopics} topics · SHUBH School ERP
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            data-ocid="docs.print_button"
          >
            <Printer className="w-4 h-4 mr-1" /> Print
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search — e.g. '404', 'deploy', 'fees', 'import', 'attendance', 'backup'…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9"
            data-ocid="docs.search_input"
          />
          {search && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
              data-ocid="docs.clear_search_button"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-0.5">
          {["All", ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              data-ocid={`docs.category_filter.${cat.toLowerCase().replace(/\s+/g, "-")}`}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar TOC — desktop only */}
        <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-border bg-muted/20 overflow-y-auto py-4 scrollbar-thin">
          <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Contents
          </p>
          <nav className="space-y-0.5 px-2">
            {DOCS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollTo(s.id)}
                  data-ocid={`docs.toc.${s.id}`}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-xs hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{s.title}</span>
                  {s.badge && (
                    <ChevronRight className="w-3 h-3 ml-auto shrink-0 opacity-50" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto px-4 pt-4 pb-2">
            <div className="p-3 rounded-lg bg-card border text-xs space-y-1.5">
              <p className="font-semibold text-foreground">Quick Login</p>
              <code className="text-[10px] text-muted-foreground break-all block">
                admin / admin123
              </code>
              <p className="font-semibold text-foreground mt-1.5">
                API Health Check
              </p>
              <code className="text-[10px] text-muted-foreground break-all block">
                ?route=ping
              </code>
              <p className="font-semibold text-foreground mt-1.5">
                Data Storage
              </p>
              <code className="text-[10px] text-muted-foreground break-all block">
                MySQL / cPanel
              </code>
            </div>
          </div>
        </aside>

        {/* Content area */}
        <div ref={contentRef} className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-3">
            {/* Quick nav grid */}
            {!search && activeCategory === "All" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                {DOCS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className="flex items-center gap-2 p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors text-left"
                      onClick={() => scrollTo(s.id)}
                      data-ocid={`docs.quicklink.${s.id}`}
                    >
                      <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                        <Icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-foreground leading-tight truncate block">
                          {s.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground/70 block">
                          {s.category}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Search results count */}
            {search && (
              <p className="text-xs text-muted-foreground">
                {filtered.length === 0
                  ? "No results"
                  : `${filtered.reduce((s, d) => {
                      const q = search.toLowerCase();
                      return (
                        s +
                        d.items.filter(
                          (c) =>
                            c.heading.toLowerCase().includes(q) ||
                            c.body.toLowerCase().includes(q),
                        ).length
                      );
                    }, 0)} matching topics in ${filtered.length} sections`}
              </p>
            )}

            {/* Empty state */}
            {filtered.length === 0 && (
              <div
                className="flex flex-col items-center py-16 text-muted-foreground"
                data-ocid="docs.empty_state"
              >
                <FileText className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-medium">No results for "{search}"</p>
                <p className="text-xs mt-1">
                  Try: deploy, 404, fees, attendance, import, backup, api
                </p>
              </div>
            )}

            {/* Sections */}
            {filtered.map((s, i) => (
              <div key={s.id} id={`doc-${s.id}`}>
                <DocSectionPanel
                  section={s}
                  searchQuery={search}
                  defaultOpen={i === 0 && !search}
                />
              </div>
            ))}

            {/* Footer quick reference */}
            {!search && activeCategory === "All" && (
              <div className="mt-6 p-4 rounded-xl border bg-muted/30 space-y-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  <p className="font-semibold text-sm text-foreground">
                    Quick Reference
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {[
                    { label: "Storage", value: "MySQL / cPanel" },
                    { label: "Default Login", value: "admin / admin123" },
                    {
                      label: "Teacher Login",
                      value: "Mobile / DOB (DDMMYYYY)",
                    },
                    { label: "Parent Login", value: "Mobile / Mobile" },
                    {
                      label: "API Health Check",
                      value: "/api/index.php?route=ping",
                    },
                    {
                      label: "Create Tables",
                      value: "/api/index.php?route=migrate/run",
                    },
                  ].map((item) => (
                    <div key={item.label} className="space-y-0.5">
                      <p className="text-muted-foreground">{item.label}</p>
                      <code className="text-[11px] bg-card px-2 py-0.5 rounded border block break-all">
                        {item.value}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
