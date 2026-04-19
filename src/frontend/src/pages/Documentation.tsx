import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Code2,
  Database,
  FileText,
  HardDrive,
  HelpCircle,
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
}

interface DocSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  items: DocItem[];
}

const DOCS: DocSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: BookOpen,
    badge: "Start Here",
    items: [
      {
        heading: "First-Time Setup (5 Steps)",
        body: `Step 1 — Log in as Super Admin
  Username: superadmin
  Password: admin123

Step 2 — Add School Profile
  Go to Settings > School Profile
  Fill in: School Name, Address, Phone, Email, Logo

Step 3 — Connect to Your Server
  Go to Settings > Data Management > Database Server
  API URL: https://shubh.psmkgs.com/api/index.php
  Click "Test Connection" → should show green
  Click "Authenticate Now" → enter admin123

Step 4 — Set Up Academics
  Go to Academics > Classes
  Add all your classes: Nursery, LKG, UKG, Class 1 to Class 12
  Add sections for each class: A, B, C, etc.

Step 5 — Set Up Fees
  Go to Fees > Fee Headings → add Tuition, Transport, Computer, etc.
  Go to Fees > Fee Plans → set amounts per class per heading
  You are now ready to add students!`,
      },
      {
        heading: "Default Login Credentials",
        body: `Super Admin:   superadmin / admin123
Admin:         (assigned by Super Admin)
Teacher:       Mobile Number / Date of Birth (DDMMYYYY)
Receptionist:  Mobile Number / Date of Birth
Parent:        Mobile Number / Mobile Number
Student:       Admission Number / Date of Birth (DDMMYYYY)
Driver:        Mobile Number / Date of Birth`,
      },
      {
        heading: "Create an Academic Session",
        body: `Go to Settings > Session Management
Click "+ New Session"
Enter session name e.g. 2025-26
Set start and end dates (April to March)
Mark as Active to make it the current session

You can create multiple sessions. Super Admin can view and edit any session.
Other roles have read-only access to archived sessions.`,
      },
      {
        heading: "Add Classes and Sections",
        body: `Go to Academics > Classes
Click "+ Add Class"
Select class name from dropdown: Nursery, LKG, UKG, 1–12
Add sections: A, B, C, D, E

IMPORTANT: Add classes BEFORE adding students.
The student form shows only the classes you have created here.
If the class dropdown is empty when adding a student, go to Academics > Classes first.`,
      },
    ],
  },
  {
    id: "students",
    title: "Student Management",
    icon: Users,
    items: [
      {
        heading: "Adding a Single Student",
        body: `Go to Students > click "+ Add Student"
Fill in required fields:
  • Full Name
  • Admission Number (unique)
  • Class and Section (from your Academics setup)
  • Date of Birth
  • Gender
  • Father's Name
  • Mobile Number

Optional fields:
  • Mother's Name, Address, Village
  • Aadhaar No, SR No, Pen No, Apaar No
  • Category (General / OBC / SC / ST)
  • Previous School

Click Save — student is added to MySQL immediately.`,
      },
      {
        heading: "Bulk Import via CSV",
        body: `Go to Students > click "Import"
Download the CSV template first (columns must match exactly)

Required columns:
admNo, fullName, fatherName, motherName, dob, gender,
class, section, address, mobile, category, status

Fill the template and upload. Students are saved to the server batch by batch.
On success you will see a count: "Imported 250 students successfully"

TIP: Export existing students first to see the exact format needed for import.`,
      },
      {
        heading: "Assign Transport to a Student",
        body: `Open a student → click the Transport tab
Select Route and Pickup Point
The monthly fare auto-fills from the Transport module
Select which months the student uses transport:
  • 11 months are pre-selected (April–March)
  • June is auto-deselected (school typically closed)
  • Change as needed for each student`,
      },
      {
        heading: "Add Fee Discounts for a Student",
        body: `Open a student → click the Discounts tab
Click "+ Add Discount"
Select fee headings to discount (use "Select All" to tick all at once)
Enter the discount amount per month
Discounts appear automatically in the Collect Fees screen.`,
      },
    ],
  },
  {
    id: "fees",
    title: "Fees Management",
    icon: IndianRupee,
    items: [
      {
        heading: "Setting Up Fee Headings",
        body: `Go to Fees > Fee Headings
Click "+ Add Heading"
Add: Tuition, Transport, Computer, Sports, Examination, Development, etc.
Each heading can be set as applicable to specific months.

These headings appear as rows in the fee collection grid.`,
      },
      {
        heading: "Setting Up Fee Plans",
        body: `Go to Fees > Fee Plans
Select a class and section
Enter the monthly amount for each fee heading
Click Save — amounts are stored per class-section

IMPORTANT: Set fee plans for every class you have created.
Students in a class with no fee plan will show ₹0 fees.`,
      },
      {
        heading: "Collecting Fees",
        body: `Go to Fees > Collect Fees
Search and select a student

The fee grid auto-loads:
  • Months: April through current month are pre-selected
  • Amounts: from the student's class fee plan
  • Old Balance: carried forward from previous payment

Enter the paid amount. The system calculates:
  • Net Fee = sum of selected months
  • Balance = Net Fee − Paid Amount
    - Positive (red): amount still owed → carried to next payment
    - Negative (green): overpaid → credited to next payment

Click "Generate Receipt" to save.`,
      },
      {
        heading: "Receipts — View, Print, Edit, Delete",
        body: `After collecting fees, click "View Receipt" to see the receipt.
Receipts are auto-numbered sequentially.

From Payment History (student profile):
  • Reprint any receipt
  • Edit receipt (change amount or date)
  • Delete receipt (balance recalculates automatically)

Receipt has QR code encoding real payment data.
Print options: A4 or thermal format.`,
      },
      {
        heading: "Other Charges (Ad-hoc Fees)",
        body: `In the Collect Fees screen, there is an "Other Charges" row.
Use this for one-time extras: Tie ₹150, Belt ₹80, ID Card ₹50, etc.
Enter a description and amount.
The charge is included in the receipt and fee register.`,
      },
    ],
  },
  {
    id: "attendance",
    title: "Attendance",
    icon: Settings,
    items: [
      {
        heading: "Manual Attendance",
        body: `Go to Attendance > Manual
Select class, section, and date
All students in the class are listed
Mark each student: Present / Absent / Late / Half Day
Click Save — attendance is saved to MySQL.`,
      },
      {
        heading: "QR Code Scanner — Camera Mode",
        body: `Go to Attendance > QR Scanner > Camera tab
Allow camera permission when prompted
Point your device camera at the student's QR code
The system captures the code and marks attendance automatically
A success card shows the student's photo, name, and check-in time.`,
      },
      {
        heading: "QR Code Scanner — USB/Bluetooth Scanner Device",
        body: `Go to Attendance > QR Scanner > Scanner Device tab
This mode works with any USB or Bluetooth barcode scanner
that works in "keyboard mode" (types the scanned code as text).

Plug in your scanner or pair it via Bluetooth.
Click the input box to focus it.
Scan the student's QR code — it is captured automatically.
No need to press Enter — the scanner handles it.`,
      },
      {
        heading: "ESSL / ZKTeco Biometric Device",
        body: `Go to Attendance > Biometric Devices
Click "+ Add Device"
Enter: Device Name, IP Address, Port (default 4370), Device Type
Click "Sync Now" to pull attendance logs from the device

Logs are automatically matched to students and staff by their registered IDs.
Supports ESSL, ZKTeco, and other IP-based biometric devices.`,
      },
      {
        heading: "Welcome Display (Big Screen Mode)",
        body: `Go to Attendance > Welcome Display
Shows: live clock, school name, large animated check-in card
Each scan shows the student's photo, name, class, and check-in time
Last 5 check-ins shown in a scrolling ticker
Ideal for a TV or monitor at the school entrance.`,
      },
    ],
  },
  {
    id: "hr",
    title: "HR & Payroll",
    icon: Users,
    items: [
      {
        heading: "Staff Directory",
        body: `Go to HR > Staff
Add staff with: Employee ID, Name, Designation, Department,
Mobile, Email, DOB, Joining Date, Gross Salary

Designations: Teacher, Principal, Clerk, Accountant, Peon, Driver, etc.
Export/import via CSV (columns: empId, fullName, designation, department, mobile, dob, salary)`,
      },
      {
        heading: "Assign Subjects to Teachers",
        body: `Go to HR > Teacher Subjects
Select a teacher and assign subjects by class range.
A teacher can teach multiple subjects across multiple classes.
This data feeds into the timetable module.`,
      },
      {
        heading: "Payroll Calculation",
        body: `Go to HR > Payroll
Select month and year
Click "Calculate Payroll"

Formula:
Net Salary = (Gross Salary ÷ Working Days) × Days Present

System reads attendance automatically.
You can override Net Salary manually if needed.
Click "Generate Payslip" to create individual payslips.
View Payroll Register for the full month summary.`,
      },
    ],
  },
  {
    id: "transport",
    title: "Transport",
    icon: Settings,
    items: [
      {
        heading: "Adding Routes and Buses",
        body: `Go to Transport > Routes
Click "+ Add Route"
Enter: Route Name, Bus Number, Driver Name, Driver Mobile
Save — monthly fare is NOT set on the route itself.`,
      },
      {
        heading: "Adding Pickup Points and Fares",
        body: `Open a route → click "+ Add Pickup Point"
Enter: Stop Name, Distance from school
Set Monthly Fare for this pickup point

Each pickup point can have a different fare.
Students assigned to this point pay this fare per month.`,
      },
    ],
  },
  {
    id: "cpanel",
    title: "cPanel Deployment Guide",
    icon: Server,
    badge: "Important",
    items: [
      {
        heading: "Step 1 — Upload Frontend Files",
        body: `1. Download the build from GitHub:
   https://github.com/shubhampatel345/school-erp-india

2. Open cPanel > File Manager > public_html/

3. Delete any existing index.html or old files.

4. Upload all files from the dist/ folder to public_html/
   (or use the zip upload feature and extract there)

5. Upload the .htaccess file to public_html/ as well.
   (This ensures SPA routing works for page refreshes)`,
      },
      {
        heading: "Step 2 — Upload API Files",
        body: `1. In cPanel > File Manager > public_html/
2. Create a folder named api/ if it doesn't exist
3. Upload TWO files from the api/ folder in your build:
   • api/index.php   ← main API handler (all routes)
   • api/config.php  ← database credentials

That's it! No .htaccess needed inside the api/ folder.
All API routing uses query parameters: ?route=endpoint`,
      },
      {
        heading: "Step 3 — Create Database Tables",
        body: `Open this URL in your browser ONCE after uploading:
https://shubh.psmkgs.com/api/index.php?route=migrate/run

Expected response:
{"status":"ok","message":"Migration complete","tables":["students","staff",...]}

This creates all 20+ required tables in your MySQL database.
If you see an error, check your database credentials in api/config.php.`,
      },
      {
        heading: "Step 4 — Test Connection in App",
        body: `1. Open the app at https://shubh.psmkgs.com
2. Log in as superadmin / admin123
3. Go to Settings > Data Management > Database Server
4. API URL should be: https://shubh.psmkgs.com/api/index.php
5. Click "Test Connection" → should show green "Connected"
6. Click "Authenticate Now" → enter admin123

You are now live! All data will save to your MySQL database
and sync across every device.`,
      },
      {
        heading: "Step 5 — Verify in phpMyAdmin",
        body: `1. Open cPanel > phpMyAdmin
2. Select database: psmkgsco_shubherp_db
3. You should see tables: students, staff, attendance, fee_receipts, etc.
4. Click the users table → you should see a row for superadmin

If the users table is empty:
Open: https://shubh.psmkgs.com/api/index.php?route=migrate/reset-superadmin
This re-creates the superadmin user with password admin123.`,
      },
      {
        heading: "Database Credentials",
        body: `File location: public_html/api/config.php

Host:     localhost
Port:     3306
Database: psmkgsco_shubherp_db
User:     psmkgsco_shubherp_user
Password: Shubh@420

Change credentials in api/config.php if your hosting uses different values.`,
      },
      {
        heading: "Reset All Tables (Fix Column Errors)",
        body: `Use this ONLY if tables exist but data shows NULL values.
This drops all tables and recreates them with correct column names.

⚠️ WARNING: All data is deleted!
Only use if tables are empty or corrupted.

URL: https://shubh.psmkgs.com/api/index.php?route=migrate/reset-db

After running, push your data again from:
Settings > Data Management > Push Local Data to Server`,
      },
    ],
  },
  {
    id: "api",
    title: "PHP API Reference",
    icon: Code2,
    items: [
      {
        heading: "Base URL & Routing",
        body: `Base URL: https://shubh.psmkgs.com/api/index.php

All routes use query parameter routing (NO .htaccess required):
https://shubh.psmkgs.com/api/index.php?route={endpoint}

This works on ALL cPanel servers regardless of mod_rewrite settings.`,
      },
      {
        heading: "Authentication",
        body: `POST /api/index.php?route=auth/login
Body: {"username":"superadmin","password":"admin123"}
Returns: {"status":"ok","token":"<jwt>","user":{...}}

Include in all subsequent requests:
Header: Authorization: Bearer {token}

Token expires after 24 hours. Re-authenticate if you get 401 errors.`,
      },
      {
        heading: "Core Sync Endpoints",
        body: `GET  ?route=sync/all         → Fetch ALL data (all collections)
GET  ?route=sync/status      → Record counts per collection
POST ?route=sync/push        → Bulk push all collections at once

Health check (no auth required):
GET  ?route=health           → {"status":"ok"}`,
      },
      {
        heading: "Collection Endpoints (CRUD)",
        body: `Pattern: ?route={collection}

GET    ?route=students              → List all students
POST   ?route=students              → Create a student
PUT    ?route=students&id={id}      → Update a student
DELETE ?route=students&id={id}      → Delete a student

Replace "students" with any collection:
students, staff, attendance, fee_receipts, fees_plan,
fee_headings, sessions, classes, subjects,
transport_routes, inventory_items, expenses,
homework, alumni, alumni_events, homework_submissions,
payroll, chat_messages, changelog`,
      },
      {
        heading: "Migration Endpoints",
        body: `?route=migrate/run              → Create all tables
?route=migrate/reset-superadmin → Reset superadmin password to admin123
?route=migrate/reset-db         → Drop and recreate all tables (⚠️ deletes data)`,
      },
    ],
  },
  {
    id: "mysql",
    title: "MySQL Setup",
    icon: Database,
    items: [
      {
        heading: "Database Configuration",
        body: `Location: public_html/api/config.php

define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'psmkgsco_shubherp_db');
define('DB_USER', getenv('DB_USER') ?: 'psmkgsco_shubherp_user');
define('DB_PASS', getenv('DB_PASS') ?: 'Shubh@420');

To change credentials: edit api/config.php and re-upload.`,
      },
      {
        heading: "Table List",
        body: `Core: users, sessions, classes, subjects
Students: students, discounts
Fees: fee_headings, fees_plan, fee_receipts
Attendance: attendance
HR: staff, payroll
Transport: transport_routes
Inventory: inventory_items
Academics: exam_timetables, teacher_timetables
Communication: whatsapp_logs
Other: expenses, homework, homework_submissions,
       alumni, alumni_events, chat_messages, changelog`,
      },
      {
        heading: "Verifying Data in phpMyAdmin",
        body: `1. Open cPanel > phpMyAdmin
2. Select psmkgsco_shubherp_db
3. Click any table (e.g. students)
4. Click Browse to see rows

If a table shows rows but name/admNo columns are NULL:
→ Run migrate/reset-db and push data again

If a table is empty after pushing:
→ Check Authentication in Settings > Data Management
→ Re-authenticate and push again`,
      },
      {
        heading: "Column Names (camelCase)",
        body: `All columns use camelCase to match frontend fields:
students: admNo, fullName, fatherName, motherName, dob,
          gender, class, section, mobile, address,
          category, status, transportId, transportRoute

staff: empId, fullName, designation, department,
       mobile, dob, salary, joiningDate, email

fee_receipts: receiptNo, studentId, studentName,
              paidAmount, totalAmount, balance,
              date, month, isDeleted`,
      },
    ],
  },
  {
    id: "whatsapp",
    title: "WhatsApp Integration",
    icon: MessageSquare,
    items: [
      {
        heading: "WhatsApp API Setup (wacoder.in)",
        body: `1. Register at wacoder.in and get your API credentials
2. Go to Settings > Communication > WhatsApp
3. Enter: API Key, Instance ID, your WhatsApp Business Number
4. Click "Send Test Message" to verify

Once configured:
• Fee receipts can be sent via WhatsApp automatically
• Attendance alerts sent to parents on absence
• Manual broadcast messages to class/section groups`,
      },
      {
        heading: "WhatsApp Auto-Reply Bot",
        body: `Go to Settings > Communication > WhatsApp Bot
Enable the bot and enter your school WhatsApp number.

How it works:
1. Parent sends their child's Admission Number to the school WhatsApp
2. Bot automatically replies with:
   • Today's attendance status (Present/Absent)
   • Pending fee balance
   • Last receipt details

Supported trigger words: admission number, adm no, fees, attendance`,
      },
      {
        heading: "Sending Receipts via WhatsApp",
        body: `After collecting fees, click "Send via WhatsApp" on the receipt.
The student's registered mobile number receives the fee summary.

To send in bulk:
Go to Communication > WhatsApp Broadcast
Select class/section, choose "Fee Reminder"
Click Send — all parents get the due amount message.`,
      },
    ],
  },
  {
    id: "biometric",
    title: "ESSL / Biometric Setup",
    icon: Wifi,
    items: [
      {
        heading: "Connecting an IP-Based Device",
        body: `Supported devices: ESSL, ZKTeco, Realtime, and any IP-based biometric

Requirements:
• Device and server on the same network, OR
• Device has a static IP accessible from the internet

Steps:
1. Go to Attendance > Biometric Devices
2. Click "+ Add Device"
3. Enter: Device Name, IP Address (e.g. 192.168.1.100), Port (default: 4370)
4. Select Device Type: ESSL / ZKTeco / Generic
5. Click Save
6. Click "Sync Now" to test connection and pull logs`,
      },
      {
        heading: "Syncing Attendance Logs",
        body: `Click "Sync Now" on any device to pull attendance logs.
Logs are matched to students/staff using their enrolled biometric ID.

If IDs don't match:
• Open the student/staff record
• Set their Biometric ID to match the one enrolled on the device

Sync interval: Manual (click Sync) or set to Auto-Sync every 15 minutes.`,
      },
    ],
  },
  {
    id: "backup",
    title: "Backup & Restore",
    icon: HardDrive,
    items: [
      {
        heading: "Export All Data (Backup)",
        body: `Go to Settings > Data Management > Backup & Restore
Click "Create Backup Now"

This downloads a .json file containing ALL data:
students, staff, fees, attendance, sessions, etc.
File name format: schoolerp_backup_YYYY-MM-DD.json

Store this file safely. You can use it to restore data anytime.
Recommended: create a backup before any major change.`,
      },
      {
        heading: "Restore from Backup",
        body: `Go to Settings > Data Management > Backup & Restore
Click "Restore from Backup"
Select your backup .json file
Click Confirm

⚠️ Restore replaces ALL current data with the backup.
Only restore if you need to undo changes or recover lost data.`,
      },
      {
        heading: "Factory Reset",
        body: `Go to Settings > Data Management > Factory Reset
Read the confirmation warning
Type "RESET" to confirm
Click Reset

⚠️ This wipes ALL local data: students, fees, attendance, etc.
Your server MySQL data is NOT affected by factory reset.
After reset, the app re-downloads all data from the server on next login.`,
      },
      {
        heading: "Push Local Data to Server",
        body: `If you have data in the browser that is not on MySQL yet:
Go to Settings > Data Management > Database Server
Scroll down to "Push Local Data to Server"
Click Push

The system sends all collections (students, fees, etc.) to MySQL.
Watch the progress log — each collection shows "Pushed ✓" or "FAILED ✗".
If a collection fails, check authentication and try again.`,
      },
    ],
  },
  {
    id: "roles",
    title: "Roles & Permissions",
    icon: Shield,
    items: [
      {
        heading: "Role Summary Table",
        body: `Role          | View | Add  | Edit | Delete
--------------|------|------|------|-------
Super Admin   | All  | All  | All  | All
Admin         | All  | All  | All  | All
Teacher       | ✓    | ✗    | ✗    | ✗
Receptionist  | ✓    | ✓    | ✗    | ✗
Accountant    | ✓    | ✓    | ✗    | ✗
Librarian     | ✓    | ✓    | ✗    | ✗
Driver        | ✓    | ✗    | ✗    | ✗
Parent        | Own  | ✗    | ✗    | ✗
Student       | Own  | ✗    | ✗    | ✗

Teachers can: add attendance, add homework
Receptionist: add students and fees
Accountant: add fees and expenses`,
      },
      {
        heading: "Adding Staff Users",
        body: `Go to Settings > User Management > Add User
Enter: Name, Username, Password, Role

Staff can also log in using:
  Username: their registered mobile number
  Password: their date of birth in DDMMYYYY format
(e.g. DOB 15-Aug-1990 → password 15081990)`,
      },
      {
        heading: "Customising Permissions",
        body: `Super Admin can customise permissions per user:
Go to Settings > User Management
Click on any user
Toggle permissions per module:
  • View (can see the module)
  • Add (can create new records)
  • Edit (can modify existing records)
  • Delete (can remove records)

Changes take effect at next login.`,
      },
    ],
  },
  {
    id: "pwa",
    title: "Mobile App (PWA)",
    icon: Smartphone,
    items: [
      {
        heading: "Install on Android",
        body: `1. Open https://shubh.psmkgs.com in Chrome
2. Tap the 3-dot menu in Chrome
3. Tap "Add to Home Screen"
4. Tap Install

The app now appears on your home screen like a native app.
It works offline and loads faster.`,
      },
      {
        heading: "Install on iPhone (iOS)",
        body: `1. Open https://shubh.psmkgs.com in Safari
2. Tap the Share button (square with arrow)
3. Tap "Add to Home Screen"
4. Tap Add

Note: Use Safari, not Chrome, for iOS PWA installation.`,
      },
      {
        heading: "Mobile Navigation",
        body: `On mobile, the app uses bottom navigation:
  🏠 Dashboard   📋 Students   💰 Fees
  📅 Attendance  ☰ More (sidebar)

Tap ☰ More to access: HR, Academics, Transport,
Inventory, Reports, Settings, and all other modules.`,
      },
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    icon: HelpCircle,
    badge: "Common Issues",
    items: [
      {
        heading: "❌ Server returned HTML instead of JSON",
        body: `Cause: api/ folder not uploaded to cPanel, or wrong URL.

Fix:
1. Check API URL in Settings > Data Management > Database Server
   Must be: https://shubh.psmkgs.com/api/index.php
   (NOT: https://psmkgs.com/api or without /index.php)

2. Upload api/index.php and api/config.php to cPanel > public_html/api/

3. Test directly: open in browser:
   https://shubh.psmkgs.com/api/index.php?route=health
   Should return: {"status":"ok"}`,
      },
      {
        heading: "❌ Invalid username or password (server auth)",
        body: `Fix:
1. Go to Settings > Data Management > Database Server
2. Click "Authenticate Now" and enter admin123
3. If still failing, run migrate/reset-superadmin:
   https://shubh.psmkgs.com/api/index.php?route=migrate/reset-superadmin
4. This resets superadmin password to admin123
5. Go back to Settings and authenticate again`,
      },
      {
        heading: "❌ Green sync but MySQL tables are empty",
        body: `The sync indicator was checking connection, not actual data.

Fix:
1. Settings > Data Management > Database Server
2. Make sure status shows "Authenticated" (not just "Connected")
3. Click "Push Local Data to Server"
4. Wait for all collections to show green "Pushed"
5. Open phpMyAdmin to verify rows appear in tables`,
      },
      {
        heading: "❌ Dashboard shows 0 students on a new device",
        body: `The new device has no local cache yet.

Fix:
1. Make sure server API URL is correct in Settings
2. Make sure you are authenticated with the server
3. Refresh the page — data is fetched from MySQL on load
4. If still 0, click "Test Connection" in Settings

Note: Data always comes from MySQL when server is connected.
If server is unreachable, the app shows cached browser data.`,
      },
      {
        heading: "❌ Classes dropdown empty when adding a student",
        body: `Cause: No classes have been added to the system yet.

Fix:
1. Go to Academics > Classes
2. Add your classes: Nursery, LKG, UKG, Class 1 through Class 12
3. Add sections for each class: A, B, C, etc.
4. Come back to Students > Add Student
5. The class dropdown will now show your classes`,
      },
      {
        heading: "❌ Student added but not showing in list",
        body: `Cause: The student saved to the browser but not to MySQL, or there is an authentication issue.

Fix:
1. Check the red error banner (if visible) for the specific error
2. Go to Settings > Data Management — check server authentication
3. Re-authenticate if needed
4. Try adding the student again — look for a success message
5. If the student appears in MySQL (phpMyAdmin) but not in the app, refresh the page`,
      },
      {
        heading: "❌ Fee plan amounts show ₹0",
        body: `Cause: Fee plans not set up for this class, or the student's class has no fee plan.

Fix:
1. Go to Fees > Fee Plans
2. Select the student's class and section
3. Enter amounts for each fee heading
4. Save
5. Go back to Collect Fees — amounts now load correctly`,
      },
      {
        heading: "❌ NULL values in MySQL columns (admNo, name, etc.)",
        body: `Cause: Old database tables with wrong column names.

Fix:
1. Open: https://shubh.psmkgs.com/api/index.php?route=migrate/reset-db
2. This drops all tables and recreates with camelCase column names
3. Go to Settings > Data Management > Push Local Data to Server
4. Push all data again

⚠️ migrate/reset-db deletes all MySQL data.
Only run this if MySQL data is already empty or corrupted.`,
      },
      {
        heading: "❌ Receipt print not working",
        body: `Cause: Browser popup blocker preventing the print window.

Fix:
1. Allow popups for shubh.psmkgs.com in browser settings
2. In Chrome: click the popup blocked icon in the address bar > Always allow
3. OR: use the "Download PDF" option instead of Print

The system uses a hidden iframe for printing to avoid this issue.
If print still fails, try a different browser (Chrome recommended).`,
      },
    ],
  },
];

// ── Highlight search matches in text ─────────────────────────────────────────
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(
    new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
  );
  return (
    <>
      {parts.map((part, i) => {
        const key = `${i}-${part.slice(0, 8)}`;
        return part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={key}
            className="bg-yellow-200 text-foreground rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={key}>{part}</span>
        );
      })}
    </>
  );
}

// ── Section accordion panel ───────────────────────────────────────────────────
function DocSectionPanel({
  section,
  searchQuery,
  defaultOpen,
}: {
  section: DocSection;
  searchQuery: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const Icon = section.icon;

  const filteredItems = useMemo(() => {
    if (!searchQuery) return section.items;
    const q = searchQuery.toLowerCase();
    return section.items.filter(
      (c) =>
        c.heading.toLowerCase().includes(q) || c.body.toLowerCase().includes(q),
    );
  }, [section.items, searchQuery]);

  if (searchQuery && filteredItems.length === 0) return null;

  const shouldOpen = open || !!searchQuery;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card shadow-subtle">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors"
        onClick={() => setOpen((v) => !v)}
        data-ocid={`docs.${section.id}.toggle`}
        aria-expanded={shouldOpen}
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-sm text-foreground">
            {section.title}
          </span>
          {section.badge && (
            <Badge variant="secondary" className="text-xs font-normal">
              {section.badge}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {filteredItems.length} topic{filteredItems.length !== 1 ? "s" : ""}
          </span>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Documentation() {
  const [search, setSearch] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search) return DOCS;
    const q = search.toLowerCase();
    return DOCS.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.items.some(
          (c) =>
            c.heading.toLowerCase().includes(q) ||
            c.body.toLowerCase().includes(q),
        ),
    );
  }, [search]);

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
                {DOCS.length} sections · {totalTopics} topics · School Ledger
                ERP
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

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search documentation — e.g. 'cPanel', 'fees', 'import', 'NULL'…"
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
            >
              Clear
            </button>
          )}
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
              <p className="font-semibold text-foreground">Live API</p>
              <code className="text-[10px] text-muted-foreground break-all">
                /api/index.php?route=&#123;endpoint&#125;
              </code>
            </div>
          </div>
        </aside>

        {/* Content area */}
        <div ref={contentRef} className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-3">
            {/* Quick nav grid — mobile + when not searching */}
            {!search && (
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
                      <span className="text-xs font-medium text-foreground leading-tight truncate">
                        {s.title}
                      </span>
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
                  Try searching for: cPanel, fees, attendance, import, backup
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

            {/* Footer info card */}
            {!search && (
              <div className="mt-6 p-4 rounded-xl border bg-muted/30 space-y-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  <p className="font-semibold text-sm text-foreground">
                    Quick Reference
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {[
                    {
                      label: "API Base URL",
                      value: "https://shubh.psmkgs.com/api/index.php?route=",
                    },
                    {
                      label: "Run Migration",
                      value: "?route=migrate/run",
                    },
                    {
                      label: "Reset Super Admin",
                      value: "?route=migrate/reset-superadmin",
                    },
                    {
                      label: "Health Check",
                      value: "?route=health",
                    },
                    {
                      label: "Default Login",
                      value: "superadmin / admin123",
                    },
                    {
                      label: "Database",
                      value: "psmkgsco_shubherp_db",
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
