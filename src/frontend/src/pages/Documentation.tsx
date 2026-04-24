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
        heading: "First-Time Setup Checklist",
        body: `Follow these steps in order — each step depends on the previous one.

STEP 1 — Log in as Super Admin
  • Username: superadmin
  • Password: admin123
  • Change this password immediately in Settings → Users

STEP 2 — Configure School Profile
  • Settings → School Profile
  • Fill in: Name, Address, Phone, Email, Logo
  • This info appears on all printed receipts and certificates

STEP 3 — Create Academic Classes
  • Academics → Classes → "+ Add Class"
  • Add all classes: Nursery, LKG, UKG, Class 1–12
  • Add sections per class: A, B, C, D, E
  ⚠ Do this BEFORE adding students — student form reads from this list

STEP 4 — Add Fee Headings
  • Fees → Fee Headings → "+ Add Heading"
  • Add: Tuition Fee, Exam Fee, Development Fee, Transport, Computer, etc.

STEP 5 — Set Fee Plans
  • Fees → Fee Plans → select class and section
  • Enter monthly amount for each heading
  • Repeat for every class/section combination

STEP 6 — Add Students
  • Students → "+ Add Student" (one by one) or "Import" (bulk Excel)

STEP 7 — Add Staff
  • HR → Staff → "+ Add Staff"

STEP 8 — Create User Accounts
  • Settings → User Management → "+ Create User"
  • Assign roles: teacher, admin, receptionist, accountant, etc.`,
      },
      {
        heading: "Default Login Credentials",
        body: `┌─────────────────┬──────────────────────────────────────────┐
│ Role            │ Login Format                             │
├─────────────────┼──────────────────────────────────────────┤
│ Super Admin     │ superadmin / admin123                    │
│ Admin           │ Set by Super Admin in User Management    │
│ Teacher         │ Mobile Number / Date of Birth (DDMMYYYY)│
│ Receptionist    │ Mobile Number / Date of Birth            │
│ Accountant      │ Mobile Number / Date of Birth            │
│ Parent          │ Mobile Number / Mobile Number            │
│ Student         │ Admission No / Date of Birth (DDMMYYYY) │
│ Driver          │ Mobile Number / Date of Birth            │
└─────────────────┴──────────────────────────────────────────┘

TIP: Parent login uses mobile as both username and password.
     All children with the same parent mobile are shown together.`,
      },
      {
        heading: "Create First Academic Session",
        body: `Go to Settings → Session Management → "+ New Session"

  • Session Name: e.g. 2025-26 (year format YYYY-YY)
  • Start Date: April 1
  • End Date: March 31 of next year
  • Check "Mark as Active"

April–March is the standard Indian academic year.
You can create multiple sessions. Only one can be Active at a time.
Super Admin can view/edit any session. Other roles get read-only access to archived sessions.`,
      },
    ],
  },
  {
    id: "server-setup",
    category: "Setup",
    title: "Server Setup & Sync",
    icon: Server,
    items: [
      {
        heading: "Upload PHP API to cPanel",
        body: `Step 1 — Log in to your cPanel (e.g. shubh.psmkgs.com/cpanel)

Step 2 — File Manager → public_html → create folder "api"

Step 3 — Upload these two files into public_html/api/:
  • api/index.php   — the full API router
  • api/config.php  — your MySQL credentials

Step 4 — Edit config.php with your actual MySQL credentials:
  DB_HOST=localhost
  DB_NAME=your_database_name
  DB_USER=your_mysql_user
  DB_PASS=your_mysql_password

Step 5 — Visit this URL once in your browser to create all tables:
  https://yourdomain.com/api/?route=migrate/run

Step 6 — Visit this URL once to seed default admin account:
  https://yourdomain.com/api/?route=seed/run`,
        code: `// config.php
define('DB_HOST', 'localhost');
define('DB_NAME', 'school_erp');
define('DB_USER', 'erp_user');
define('DB_PASS', 'your_secure_password');
define('JWT_SECRET', 'change-this-to-a-long-random-string');`,
      },
      {
        heading: "Configure Server URL in the App",
        body: `After uploading the PHP API:

1. Log in as Super Admin
2. Go to Settings → Server & Sync tab
3. Enter your API URL:  https://yourdomain.com/api
4. Click "Test Connection" — should show green "Connected (Xms)"
5. Click "Save Settings"

The app will now sync all changes to your MySQL database.`,
      },
      {
        heading: "Understanding Pending Sync",
        body: `SHUBH School ERP uses Local-First sync (WhatsApp-style):

When you add or edit data:
1. Data saves to the browser (IndexedDB) INSTANTLY
2. The record appears on screen immediately
3. A background task sends it to MySQL silently
4. The sync badge in the header shows pending count

Yellow badge = changes not yet confirmed by server
Green badge  = all data saved to MySQL ✓
Red badge    = server offline — data is safe locally, will sync when back online

This means you NEVER lose data, even if the server goes down temporarily.`,
      },
      {
        heading: "Force Manual Sync",
        body: `If you see a yellow pending badge and want to sync immediately:

Method 1 — Via Settings:
  Settings → Server & Sync → "Sync Now" button
  This immediately pushes all pending records to MySQL.

Method 2 — Via Header:
  Click the yellow/red sync dot in the header
  This navigates to Settings → Server & Sync automatically.

Method 3 — Automatic:
  The app syncs automatically every 15 seconds by default.
  Change interval in Settings → Server & Sync → Sync Interval dropdown.`,
      },
      {
        heading: "Server Offline — What to Do",
        body: `If the sync badge turns red (server offline):

1. Check that api/index.php and api/config.php are uploaded
2. Verify MySQL credentials in config.php are correct
3. Go to Settings → Server & Sync → click "Test Connection"
   — it shows the exact error message

Common causes:
  • Wrong MySQL credentials in config.php
  • config.php not uploaded to /api/ folder
  • Server URL entered without /api at the end
  • .htaccess blocking the /api/ route — delete it or add AllowOverride All
  • PHP version below 7.4 — upgrade in cPanel → PHP Version

⚠ Data is NEVER lost while server is offline — it syncs when back online.`,
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

Optional fields (can be added later):
  • Aadhaar No, SR No, Pen No, Apaar No (government IDs)
  • Category: General / OBC / SC / ST / OBC-A / OBC-B
  • Previous School, Blood Group
  • Student Photo (click camera icon)

Click "Save Student" — data saves to browser instantly, syncs to server.`,
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

This applies to:
  • Add/Edit Student form
  • Student filter grid
  • Fee Plan selector
  • Attendance class selector
  • Report filters

If the dropdown is empty: go to Academics → Classes and add your classes first.`,
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
      {
        heading: "Discontinue or Re-Admit a Student",
        body: `Discontinue:
  Students → find student → click Details → "Discontinue"
  Enter reason and date. Student moves to Discontinued list.
  Fees due carry forward.

Re-Admit:
  Students → filter "Discontinued" → find student → "Re-Admit"
  Select new class/section for re-admission.
  Old fee balance is restored.`,
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
  • Shift-click to select a range
  • Undo last save within 30 seconds`,
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
        heading: "QR Scanner — USB/Bluetooth Scanner Device",
        body: `Go to Attendance → QR Scanner → Device tab

Works with any USB or Bluetooth barcode scanner that uses HID keyboard mode.

  1. Plug in scanner or pair via Bluetooth
  2. Click "Focus Input" to activate the text box
  3. Student scans their QR card — code is captured automatically
  4. Attendance marks in real-time (no Enter key needed)

Recommended scanner: Any generic USB HID QR/barcode scanner (₹1,000–₹3,000)`,
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
  4. Logs are auto-matched to students by biometric ID

Troubleshooting:
  • Cannot connect: verify IP, ensure port 4370 is open in firewall
  • No logs: check if device has recorded any punches today
  • Students not matched: enroll students in device with their admission number as ID`,
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
      {
        heading: "Syllabus Chapter Tracker",
        body: `Go to Academics → Syllabus

  1. Select subject and class
  2. Add chapters: Chapter 1, Chapter 2, etc.
  3. Teachers mark chapters as Completed / In Progress / Pending
  4. Progress bar shows % completion per subject

Parents can see syllabus progress in their portal.`,
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
  4. System auto-calculates grade (A+/A/B/C/D/F based on %):
     90%+ = A+, 80–89% = A, 70–79% = B, 60–69% = C, 50–59% = D, <50% = F
  5. Click "Save Marks"

Bulk import marks: Download template → fill → upload CSV`,
      },
      {
        heading: "Online MCQ Exam with Auto-Grading",
        body: `Go to Examinations → Online Exam → "+ Create Test"

  1. Enter: Title, Class, Duration (minutes), Total Marks
  2. Add questions:
     • Question text
     • 4 options (A, B, C, D)
     • Mark correct answer
  3. Assign to class — students see it in their portal
  4. Students take the test with countdown timer
  5. Results generate instantly after submission

View results: Examinations → Online Exam → Results tab
Export to Excel for record keeping.`,
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
  Watermark and school stamp included.

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
     • Deductions: LWP (Leave Without Pay) = Salary/Days × Absent Days
     • Allowances: DA, HRA, etc. (configurable in Payroll Setup)
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
  • Uncheck months student doesn't use transport

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
  3. ETA auto-calculates based on distance to pickup point

Admin View:
  Transport → Live Map
  All active buses shown on map simultaneously`,
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
     Sent: 234 / Failed: 3 / Pending: 12

Common issue — Message not delivered:
  • Check DND status — send during 9 AM to 9 PM only
  • Verify API credit balance with your provider
  • Check if template is pre-approved (required for marketing messages)`,
      },
      {
        heading: "WhatsApp Auto-Reply Bot",
        body: `Settings → WhatsApp Bot → enable "Auto-Reply"

How it works:
  1. Parent sends their child's admission number to school's WhatsApp
  2. Bot automatically replies with:
     • Child's name and class
     • Today's attendance status (Present / Absent)
     • Current fee balance (₹ amount outstanding)
     • Next fee due date

Setup:
  • Webhook URL must be entered in your WhatsApp provider dashboard
  • WhatsApp Business API required (not regular WhatsApp)
  • Test by sending an admission number to your school number`,
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
    id: "chat",
    category: "Communication",
    title: "Chat System",
    icon: MessageSquare,
    items: [
      {
        heading: "Direct Messages",
        body: `Chat → Direct Messages → "+ New Chat"

  1. Search for user (teacher, admin, staff)
  2. Type message → Enter or click Send

Supports:
  • Text messages
  • File attachments (PDF, images, documents)
  • Read receipts (ticks like WhatsApp)

Super Admin can view all conversations.`,
      },
      {
        heading: "Group Chats",
        body: `Class Groups (auto-created):
  Each class/section gets a group automatically.
  Teachers assigned to that class are members.

Route Groups:
  Transport groups per bus route are auto-created.
  Driver and parents of students on that route are added.

Custom Groups:
  Chat → Groups → "+ Create Group"
  Add any combination of users.`,
      },
    ],
  },
  {
    id: "virtualclasses",
    category: "Communication",
    title: "Virtual Classes",
    icon: Smartphone,
    items: [
      {
        heading: "Schedule a Meeting",
        body: `Virtual Classes → "+ Schedule Meeting"

  1. Title: e.g. "Class 10 Math — Chapter Review"
  2. Date and Time
  3. Platform: Zoom / Google Meet
  4. Paste the meeting link (from Zoom/Google Meet)
  5. Select classes to notify
  6. Click "Schedule"

Students and parents see the meeting in their portal.
A "Join Now" button appears at the scheduled time.`,
      },
      {
        heading: "Zoom Setup",
        body: `To create a Zoom link:
  1. Open zoom.us → "New Meeting" or "Schedule"
  2. Copy the meeting link
  3. Paste into Virtual Classes → Schedule Meeting → Meeting Link

For permanent meeting rooms:
  Settings → Virtual Classes → enter your Personal Meeting ID
  All future meetings use the same link.`,
      },
    ],
  },
  {
    id: "certificates",
    category: "Documents",
    title: "Certificate Studio",
    icon: FileText,
    items: [
      {
        heading: "Available Certificate Types",
        body: `Certificates → Template Studio

Available templates:
  1. Student ID Card (credit card size, front + back)
  2. Fee Receipt (4 templates — A4, A5, thermal)
  3. Admission Form
  4. Result / Marksheet
  5. Admit Card (for exams)
  6. Bonafide Certificate
  7. Transfer Certificate (TC)
  8. Experience Certificate (for staff)

Each type has its own default template that you can customize.`,
      },
      {
        heading: "Customize Templates",
        body: `Certificates → Template Studio → select template type → "Design"

Designer tools:
  • Drag and drop fields anywhere on the page
  • Resize text boxes
  • Change font, size, bold/italic/color
  • Import background image (upload school letterhead)
  • Set paper size: A4 / A5 / Letter / Custom
  • Add school logo (auto-loads from School Profile)
  • Add signature placeholder
  • Toggle watermark ("ORIGINAL" / "DUPLICATE")

Click "Save as Default" → all future prints use this layout.`,
      },
      {
        heading: "Print Certificates",
        body: `ID Cards:
  Certificates → ID Cards → select class → "Print All"
  All ID cards for the class print on A4 sheets (6 per page)

Transfer Certificate:
  Students → find student → right-click → "Generate TC"
  Fills in all details automatically → Print

Bonafide Certificate:
  Students → find student → right-click → "Generate Bonafide"
  Edit fields if needed → Print → stamped as official`,
      },
    ],
  },
  {
    id: "reports",
    category: "Analytics",
    title: "Reports",
    icon: Activity,
    items: [
      {
        heading: "Available Report Types",
        body: `Reports → select report type

1. Students Report
   • Count by class, section, gender, category
   • Transport-wise breakdown
   • New admissions vs discontinued

2. Finance Report
   • Monthly fee collected vs. due
   • Class-wise collection summary
   • Outstanding balance list

3. Attendance Report
   • Present/absent rate by class
   • Student-wise attendance %
   • Date-wise attendance graph

4. Exam Results Report
   • Marks/grade distribution by class
   • Top performers list
   • Subject-wise pass/fail %

5. HR Report
   • Staff salary summary
   • Attendance-based payroll

6. Transport Report
   • Route-wise student count
   • Fee collected per route

7. Inventory Report
   • Stock levels for all items
   • Low stock alerts

8. Fees Due Report
   • All students with outstanding balance
   • Sorted by amount, class, or date`,
      },
      {
        heading: "Export Reports",
        body: `Every report has export options:

Export to Excel (.xlsx):
  Reports → select type → configure filters → "Export Excel"
  Opens the file directly for editing or printing.

Export to PDF:
  Reports → select type → "Export PDF"
  Print-ready PDF with school header.

Print directly:
  Reports → "Print" button → opens browser print dialog
  Use landscape mode for wide tables.`,
      },
    ],
  },
  {
    id: "expenses",
    category: "Finance",
    title: "Expenses & Income",
    icon: IndianRupee,
    items: [
      {
        heading: "Record Transactions",
        body: `Expenses → "+ Add Transaction"

  • Type: Expense or Income
  • Head: Salary / Electricity / Canteen / Maintenance / Donation / etc.
  • Amount (₹)
  • Date
  • Description / Invoice Number
  • Paid By / Received From

Add heads: Expenses → Expense Heads → "+ Add Head"`,
      },
      {
        heading: "Budget vs. Actual",
        body: `Expenses → Budget

  1. Set monthly budget per expense head (e.g. Electricity: ₹5,000/month)
  2. Dashboard shows Budget vs. Actual comparison bar chart
  3. Heads exceeding budget are highlighted in red

Monthly Summary:
  Expenses → Monthly Chart
  Bar chart: Income (green) vs. Expenses (red) per month`,
      },
    ],
  },
  {
    id: "homework",
    category: "Daily Operations",
    title: "Homework",
    icon: FileText,
    items: [
      {
        heading: "Assign Homework",
        body: `Homework → "+ Assign"

  • Subject
  • Class and Section
  • Due Date
  • Description (rich text editor)
  • Attach files (PDF, images)

Students see homework in their portal under "Pending".`,
      },
      {
        heading: "Track Submissions",
        body: `Homework → Submissions

  • See who submitted and who hasn't
  • Overdue submissions highlighted in red
  • Mark as reviewed / graded

Analytics:
  Homework → Analytics
  Class-wise completion rate
  Subject-wise overdue count`,
      },
    ],
  },
  {
    id: "alumni",
    category: "Records",
    title: "Alumni",
    icon: Users,
    items: [
      {
        heading: "Alumni Directory",
        body: `Alumni → Directory

Students who are discontinued with "Graduated" status move to Alumni automatically.
Or manually add: Alumni → "+ Add Alumni"

Fields: Name, Batch Year, Class, Current Position, Company, Email, Mobile

Search and filter by batch year or name.
Export contact list as Excel.`,
      },
    ],
  },
  {
    id: "analytics",
    category: "Analytics",
    title: "Student Analytics",
    icon: Activity,
    items: [
      {
        heading: "Per-Student Performance Dashboard",
        body: `Analytics → select student

Shows:
  • Marks trend across all exams (line chart)
  • Attendance percentage (per month)
  • Fee payment history (paid/pending per month)
  • Rank in class per exam

Export: "Download Report" → PDF with all charts for parent meeting.`,
      },
      {
        heading: "Class-wise Comparison",
        body: `Analytics → Class Comparison

  • Average marks per class for each subject
  • Top 10 performers across the school
  • Attendance comparison across classes
  • Filter by session, exam, or subject`,
      },
    ],
  },
  {
    id: "calling",
    category: "Communication",
    title: "Microsoft Phone System",
    icon: Smartphone,
    items: [
      {
        heading: "Click-to-Call via Microsoft Teams",
        body: `Calling → Click-to-Call tab

  1. Search for a student or staff member
  2. Click the phone icon next to their name
  3. Microsoft Teams opens and initiates the call

Requirements:
  • Microsoft 365 license with Teams Phone
  • Teams desktop app installed on your PC
  • Azure Communication Services configured in Settings → Calling`,
      },
      {
        heading: "Bluetooth Call Bridging",
        body: `To have Teams calls ring on both PC and mobile simultaneously:

  1. Install Microsoft Teams on your mobile phone
  2. Sign in with same Microsoft 365 account
  3. Go to Teams Settings → Devices → Bluetooth
  4. Pair your mobile phone with your PC
  5. Both devices ring when a call comes in

Note: Requires Teams Phone license (included in M365 Business Voice).`,
      },
      {
        heading: "Azure ACS Setup",
        body: `Settings → Calling → enter your credentials:

  • Azure ACS Endpoint
  • Azure ACS Access Key
  • Microsoft Teams Phone Number

Get these from:
  Azure Portal → Communication Services → Keys

Once configured, calls show as coming from your school's number.`,
      },
    ],
  },
  {
    id: "user-management",
    category: "Admin",
    title: "User Management",
    icon: Shield,
    items: [
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
        heading: "Module-Level Permissions",
        body: `Settings → Permissions → select role

Configure per module:
  ✓ canView  — can see the module
  ✓ canAdd   — can add new records
  ✓ canEdit  — can edit existing records
  ✓ canDelete — can delete records

Apply changes → affects all users with that role immediately.

Super Admin always has full access and cannot be restricted.`,
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
        body: `Settings → Session Management

  • Create new session: "+ New Session" → e.g. "2026-27"
  • Switch active session: click "Set Active" on any session
  • Archive old session: automatic when new session is created
  • View archived data: click any archived session to browse (read-only)

Super Admin can edit any session.
Other roles are read-only on archived sessions.`,
      },
      {
        heading: "Promote Students at Year End",
        body: `Settings → Session Management → "Promote Students"

Step 1 — Select source class (e.g. Class 9)
Step 2 — Select target class (e.g. Class 10)
Step 3 — Options:
  • Carry forward fee dues: unpaid fees move to new session
  • Auto-discontinue Class 12 graduates
  • Keep current section or reassign

Step 4 — Preview list of students affected
Step 5 — Confirm → all students promoted at once

Repeat for each class. Run after creating new session.`,
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
        heading: "Data Storage Information",
        body: `Where is your data stored?

  1. Browser (IndexedDB): all data cached locally for instant access
     • Location: Browser → Application → IndexedDB → shubh_erp_db
     • Cleared by: clearing browser data, or Factory Reset

  2. MySQL Server (via API): persistent server-side storage
     • Location: cPanel phpMyAdmin → your database
     • Synced: continuously in background (every 15 seconds)

Data is NEVER lost because both copies exist.
Even if server is offline, local copy is always intact.`,
      },
    ],
  },
  {
    id: "themes",
    category: "Customization",
    title: "Themes",
    icon: Settings,
    items: [
      {
        heading: "Change Color Theme",
        body: `Settings → Themes → select from 10 options

Available themes:
  1. Default (Navy Blue)     — dark navy sidebar, clean white content
  2. Deep Ocean              — rich teal/blue tones
  3. Forest Green            — earthy green tones
  4. Sunset Rose             — warm pink and coral
  5. Dark Night              — full dark mode
  6. Slate Gray              — professional gray
  7. Royal Purple            — elegant purple
  8. Copper Bronze           — warm bronze tones
  9. Cherry Red              — bold red accents
  10. Midnight Teal          — deep teal dark theme

Theme applies immediately and persists across browser sessions (saved to localStorage).
Each user's theme preference is independent.`,
      },
    ],
  },
  {
    id: "cpanel-deployment",
    category: "Deployment",
    title: "cPanel Deployment Guide",
    icon: Server,
    items: [
      {
        heading: "Complete Deployment Steps",
        body: `Step 1 — Get your files
  The build creates two files you need to upload:
  • api/index.php — all PHP API routes
  • api/config.php — database configuration

Step 2 — Log into cPanel
  Go to: yourdomain.com/cpanel or use your hosting panel

Step 3 — Upload via File Manager
  File Manager → public_html → New Folder "api"
  Upload both .php files into public_html/api/

Step 4 — Edit config.php with your MySQL credentials
  Right-click config.php → Edit
  Update: DB_HOST, DB_NAME, DB_USER, DB_PASS, JWT_SECRET

Step 5 — Create database tables (run once)
  Visit in browser: https://yourdomain.com/api/?route=migrate/run
  Should show: {"success":true,"message":"Tables created successfully"}

Step 6 — Seed admin account (run once)
  Visit: https://yourdomain.com/api/?route=seed/run
  Should show: {"success":true,"message":"Admin seeded"}

Step 7 — Configure in ERP
  Settings → Server & Sync → enter API URL → Test Connection`,
      },
      {
        heading: "Troubleshooting cPanel",
        body: `.htaccess issues:
  If API returns 404, add to public_html/.htaccess:
  ┌─────────────────────────────────────────┐
  │ RewriteEngine On                        │
  │ RewriteCond %{REQUEST_FILENAME} !-f     │
  │ RewriteCond %{REQUEST_FILENAME} !-d     │
  │ RewriteRule ^api/(.*)$ api/index.php?route=$1 [L,QSA] │
  └─────────────────────────────────────────┘

PHP version too old:
  cPanel → PHP Version → select PHP 8.0 or higher

MySQL charset errors:
  Add to config.php: define('DB_CHARSET', 'utf8mb4');

Blank response from API:
  cPanel → Error Logs → check for PHP errors in api/index.php`,
        code: `# .htaccess in public_html/
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^api/(.*)$ /api/index.php?route=$1 [L,QSA]`,
      },
      {
        heading: "Connect Custom Domain",
        body: `If your domain is managed through your hosting panel:

  1. cPanel → Subdomains → create "school.yourdomain.com"
  2. Point to same public_html directory
  3. Wait for DNS propagation (up to 24 hours)

If using Caffeine's domain management:
  1. Settings → Domains → "Bring your own domain"
  2. Enter your domain name
  3. Copy the CNAME and TXT records
  4. Go to your domain registrar → DNS settings → add those records
  5. Wait for verification (10 min – 24 hours)`,
      },
    ],
  },
  {
    id: "whatsapp-setup",
    category: "Integrations",
    title: "WhatsApp Setup Guide",
    icon: MessageSquare,
    items: [
      {
        heading: "Step-by-Step WhatsApp API Setup",
        body: `Step 1 — Create WhatsApp Business Account
  • Download WhatsApp Business app
  • Register with your school's phone number

Step 2 — Choose an API Provider
  Recommended providers (India):
  • Gupshup (gupshup.io) — most popular in India
  • WATI (wati.io) — easy setup
  • Interakt (interakt.shop) — affordable plans
  • WaCoder (wacoder.in) — budget option

Step 3 — Get API Credentials
  From your provider dashboard:
  • API Key
  • App Key
  • Sender Phone Number

Step 4 — Enter in ERP
  Settings → WhatsApp API
  → Enter API Key, App Key, Phone Number
  → Click "Save"

Step 5 — Test
  Settings → WhatsApp → "Send Test Message"
  Enter your personal number → Send
  You should receive a test message within 30 seconds

Step 6 — Set up Webhook
  Copy webhook URL from Settings → WhatsApp
  Go to your API provider's dashboard → Webhook → paste URL
  This enables auto-reply bot and delivery confirmations`,
      },
      {
        heading: "WhatsApp Troubleshooting",
        body: `Message not delivered:
  • Verify recipient is not in DND (Do Not Disturb) list
  • Check API credit balance in provider dashboard
  • Templates must be pre-approved by Meta for promotional messages
  • Personal messages only allowed 9 AM to 9 PM

Webhook not firing:
  • Server URL must be publicly accessible (not localhost)
  • SSL certificate required (HTTPS only)
  • Test webhook from your provider's dashboard

High failure rate:
  • Clean your phone number list (remove invalid/off numbers)
  • Check if your WhatsApp Business number is verified`,
      },
    ],
  },
  {
    id: "biometric-setup",
    category: "Integrations",
    title: "Biometric / RFID Setup",
    icon: Shield,
    items: [
      {
        heading: "Add Biometric Device",
        body: `Attendance → Biometric Devices → "+ Add Device"

  1. Get device's IP address from device's menu (Network Settings)
  2. Enter in ERP:
     • Device Name (e.g. "Main Gate ESSL")
     • IP Address (e.g. 192.168.1.100)
     • Port: 4370 (default for ESSL/ZKTeco)
     • Device Type: ESSL / ZKTeco / Generic
  3. Click "Test Connection" → must show green before saving
  4. Click "Sync Logs" to pull today's attendance records

The device and your server MUST be on the same local network (same WiFi/LAN).`,
      },
      {
        heading: "Enroll Students in Device",
        body: `Method 1 — RFID Card:
  • Assign a card number to each student in their profile
  • Use device software to assign same card number to the RFID card
  • Student taps card → auto-matches to ERP

Method 2 — Fingerprint:
  • Use device's own enrollment menu (or vendor software)
  • Enroll fingerprint with student's admission number as User ID
  • Device sends User ID to ERP → matches to student`,
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
        heading: "Blank White Screen on App Load",
        body: `Cause: JavaScript error preventing app from rendering.

Fixes:
  1. Hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
  2. Clear browser cache: Settings → Privacy → Clear Data
  3. Open browser console (F12 → Console) — look for red errors
  4. If error mentions "api": check that api/config.php has correct credentials
  5. If error says "canister": this is an old reference — ignore (data is in MySQL now)

If still blank after all above:
  Try a different browser (Chrome preferred)`,
      },
      {
        heading: "Student Data Disappears",
        body: `Likely causes:
  • Sync badge is red = server offline, data queued locally
  • Background refresh overwriting pending records (fixed in latest version)

What to do:
  1. Check header sync badge color:
     Green = data is saved on server ✓
     Yellow = syncing in progress
     Red = server offline — data IS still in your browser

  2. If red, go to Settings → Server & Sync → Test Connection
     Fix the connection issue shown in error message
     Then click "Sync Now"

  3. Data is NEVER permanently lost while server is offline
     Browser keeps a complete local copy at all times`,
      },
      {
        heading: "Fee Plan Amount Fields Not Typeable",
        body: `The fee plan amount fields must be plain number inputs with no spinner arrows.

If you see spinner arrows or can't type amounts:
  1. Click the field once to focus
  2. Select all with Ctrl+A
  3. Type the amount

If the field still doesn't accept typing:
  1. Try a different browser
  2. Disable browser extensions (some modify form inputs)
  3. Report the bug with browser name and version

Note: The design INTENTIONALLY removes spinner arrows. If they appear, it is a bug.`,
      },
      {
        heading: "Cannot Login",
        body: `Super Admin can't login:
  • Username: superadmin (exactly, no spaces)
  • Default password: admin123
  • If changed: go to phpMyAdmin → users table → reset manually

Teacher / Staff can't login:
  • Username = mobile number (10 digits, no spaces)
  • Password = DOB in DDMMYYYY format (e.g. 15082001)
  • Check mobile in HR → Staff profile

Parent can't login:
  • Username and Password = same mobile number
  • Must match fatherMobile or guardianMobile in student profile

Admin reset:
  Settings → User Management → find user → "Reset Password"`,
      },
      {
        heading: "Sync Stuck on Yellow",
        body: `Yellow badge means records are pending server confirmation.

Step 1 — Check Settings → Server & Sync → "Test Connection"
  The error message tells you exactly what's wrong.

Common errors and fixes:
  • "Connection refused": server URL wrong or PHP API not uploaded
  • "Invalid JSON": PHP error in api/index.php — check cPanel error logs
  • "401 Unauthorized": JWT token expired — log out and back in
  • "404 Not Found": /api/ folder doesn't exist or .htaccess routing issue

Step 2 — Click "Sync Now"
  Forces immediate sync attempt — check logs for errors.

Step 3 — If sync keeps failing:
  Settings → Data Management → Export All Data (backup)
  Settings → Server & Sync → Restore Defaults
  Try again`,
      },
      {
        heading: "Class Dropdown Empty",
        body: `The class dropdown in student/fee forms pulls from Academics → Classes.

If the dropdown shows no classes:
  1. Go to Academics → Classes
  2. Add all your classes: Nursery, LKG, UKG, Class 1 through Class 12
  3. For each class, add sections: A, B, C, etc.
  4. Return to the student/fee form — dropdown should now be populated

Note: If classes exist but dropdown is still empty:
  Hard refresh the page (Ctrl+Shift+R) and try again.`,
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
   There is no hard limit — the database can handle tens of thousands.

Q: Can parents see other children's data?
A: No. Parent login shows only children whose parent mobile matches the login number.
   Complete data isolation between families.

Q: What happens if the server goes down?
A: All read and write operations continue working in offline mode.
   Changes queue locally and sync automatically when server returns.
   You never lose any data.

Q: Can I use this on mobile?
A: Yes — install as a PWA:
   Chrome → menu (⋮) → "Add to Home Screen" → Install
   Works on Android and iOS. All features available on mobile.

Q: Can I run multiple schools?
A: Yes. Each school gets its own separate Caffeine project with its own URL.
   Example: schoola.psmkgs.com, schoolb.psmkgs.com — completely separate data.

Q: How do I reset Super Admin password?
A: Method 1: phpMyAdmin → users table → edit → set new hashed password
   Method 2: Contact support with your domain for remote reset assistance.

Q: Does the app work offline?
A: Yes. All reading works offline (data cached in browser).
   Writing works offline too (queued locally, syncs when online).
   Only real-time features (WhatsApp, GPS) need internet.

Q: How do I backup my data?
A: Settings → Data Management → "Export All Data"
   Saves a complete JSON file. Store it on Google Drive or a USB stick.

Q: Can I export student list to Excel?
A: Yes. Students → "Export to Excel" button downloads a .xlsx file.

Q: What do the sync badge colors mean?
A: Green = all data saved to server ✓
   Yellow (spinning) = syncing now
   Yellow (static) = changes pending, will sync soon
   Red = server offline — data safe locally, not yet on server`,
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

Pending Sync:
  Records saved in browser (IndexedDB) but not yet confirmed by MySQL server.
  Shown as a count in the header badge. Always syncs automatically.

Family Grouping:
  Students sharing the same parent mobile number are grouped together.
  Useful for collecting fees for siblings in one transaction.

Pickup Point:
  A bus stop on a transport route where students board.
  Each point has its own monthly fare.

RFID:
  Radio Frequency Identification — a card students tap on a reader to mark attendance.
  Card number is enrolled in the device and matched to the student in ERP.

IndexedDB:
  Browser's built-in local database. Stores all ERP data for offline access.
  Works like a local MySQL on your device.

Super Admin:
  The top-level user with full access to all settings, data, and user accounts.
  Cannot be restricted by permissions.

canister:
  An older term from a previous version of the app (Internet Computer storage).
  No longer used — data is now in MySQL/cPanel.

JWT (JSON Web Token):
  An authentication token stored in your browser after login.
  Sent with every API request to verify your identity. Expires after some time.`,
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
  Local-first sync with WhatsApp-style pending counter.
  Fee plan typing fixes. Student disappearing data fixed.
  Performance: skeleton loading, pagination, parallel data fetch.

Current — Server & Sync Settings + Documentation overhaul.
  New: Settings → Server & Sync tab for full sync control.
  New: Comprehensive in-app documentation (this page).
  Updated: Sync badge shows cPanel server status with pending count.
  Updated: Header sync dot navigates to Server & Sync on click.`,
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
        body: `Base URL:   https://yourdomain.com/api
Auth:       Bearer JWT in Authorization header
Format:     All requests/responses are JSON

Login to get JWT:
  POST /api/?route=auth/login
  Body: { "username": "superadmin", "password": "admin123" }
  Response: { "success": true, "data": { "token": "...", "user": {...} } }

Include token in all subsequent requests:
  Authorization: Bearer <your_jwt_token>`,
        code: `// Example fetch with auth
const res = await fetch('/api/?route=students/list', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('erp_token'),
    'Content-Type': 'application/json'
  }
});
const data = await res.json();`,
      },
      {
        heading: "API Endpoints Reference",
        body: `┌──────────────────────────────┬────────┬──────────────────────────┐
│ Route                        │ Method │ Description              │
├──────────────────────────────┼────────┼──────────────────────────┤
│ auth/login                   │ POST   │ Login, get JWT           │
│ auth/verify                  │ GET    │ Validate current token   │
│ health                       │ GET    │ Server health check      │
│ ping                         │ GET    │ Latency ping             │
│ sync/all                     │ GET    │ Download all data        │
│ sync/push                    │ POST   │ Push changes to server   │
│ students/list                │ GET    │ List students            │
│ students/add                 │ POST   │ Add student              │
│ students/update              │ PUT    │ Update student           │
│ students/delete              │ DELETE │ Delete student           │
│ students/bulk-import         │ POST   │ Bulk import from CSV     │
│ classes/list                 │ GET    │ List classes             │
│ classes/add                  │ POST   │ Add class                │
│ fees/headings                │ GET    │ List fee headings        │
│ fees/plan                    │ GET    │ Get fee plan             │
│ fees/plan/save               │ POST   │ Save fee plan            │
│ fees/collect                 │ POST   │ Collect fees             │
│ fees/receipts                │ GET    │ Get student receipts     │
│ attendance/mark              │ POST   │ Mark attendance          │
│ attendance/list              │ GET    │ Get attendance records   │
│ staff/list                   │ GET    │ List staff               │
│ staff/add                    │ POST   │ Add staff                │
│ migrate/run                  │ GET    │ Create DB tables         │
│ seed/run                     │ GET    │ Seed admin user          │
└──────────────────────────────┴────────┴──────────────────────────┘`,
      },
      {
        heading: "Response Format",
        body: `All responses follow this format:

Success:
  { "success": true, "data": <payload>, "total": 100 }

Error:
  { "success": false, "error": "Description of error" }

HTTP Status Codes:
  200 — OK
  400 — Bad Request (missing required field)
  401 — Unauthorized (invalid/expired JWT)
  403 — Forbidden (insufficient permissions)
  404 — Not Found
  500 — Server Error (check PHP error logs in cPanel)

Batch sync endpoint:
  POST /api/?route=batch/sync
  Body: { "changes": [ { "collection": "students", "operation": "create", "data": {...} } ] }
  Response: { "success": true, "data": { "pushed": 10, "errors": [] } }`,
        code: `// Batch sync example
const changes = pendingItems.map(item => ({
  collection: item.collection,
  operation: item.operation,
  data: item.data
}));

await fetch('/api/?route=batch/sync', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token },
  body: JSON.stringify({ changes })
});`,
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
            placeholder="Search — e.g. 'fees', 'import', 'attendance', 'backup', 'sync'…"
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
                superadmin / admin123
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
                  Try: fees, attendance, import, backup, sync, server
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
                    { label: "Default Login", value: "superadmin / admin123" },
                    {
                      label: "Teacher Login",
                      value: "Mobile / DOB (DDMMYYYY)",
                    },
                    { label: "Parent Login", value: "Mobile / Mobile" },
                    { label: "API Health Check", value: "/api/?route=health" },
                    {
                      label: "Create Tables",
                      value: "/api/?route=migrate/run",
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
