import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Code2,
  Database,
  FileText,
  GraduationCap,
  HelpCircle,
  IndianRupee,
  Printer,
  Search,
  Server,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

interface DocSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  content: { heading: string; body: string }[];
}

const DOCS: DocSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: BookOpen,
    content: [
      {
        heading: "First Setup",
        body: `1. Open the app and log in as Super Admin (username: superadmin, password: admin123).
2. Go to Settings > School Profile and fill in your school name, address, and contact details.
3. Go to Settings > Data Management > Database Server. Enter your API URL: https://shubh.psmkgs.com/api/index.php
4. Click "Test Connection". If successful, click "Authenticate Now" and enter admin123.
5. Go to Academics > Classes and add all your class/section combinations.
6. Go to Fees > Fee Headings and add fee types (Tuition, Transport, etc.).
7. Go to Fees > Fee Plans and assign amounts for each class.
8. You are ready to add students!`,
      },
      {
        heading: "Default Login Credentials",
        body: `Super Admin: superadmin / admin123
Staff (Teacher/Driver): Mobile number / Date of birth (DDMMYYYY)
Parent: Mobile number / Mobile number
Student: Admission number / Date of birth (DDMMYYYY)`,
      },
    ],
  },
  {
    id: "students",
    title: "Student Management",
    icon: Users,
    content: [
      {
        heading: "Adding a Student",
        body: `1. Go to Students module.
2. Click "+ Add Student".
3. Fill in required fields: Full Name, Admission No., Class, Section, DOB, Gender.
4. Fill optional fields: Father Name, Mother Name, Mobile, Address, Village, Aadhaar No., SR No., etc.
5. Assign transport if applicable (Transport tab).
6. Click Save. The student is added to MySQL immediately.`,
      },
      {
        heading: "Bulk Import",
        body: `1. Click "Import" in Students.
2. Download the CSV template.
3. Fill it in — columns must match exactly: admNo, fullName, fatherName, motherName, dob, gender, class, section, address, mobile, category, status.
4. Upload the filled CSV.
5. Students are saved to the server batch by batch.`,
      },
      {
        heading: "Class Assignment",
        body: "Classes and sections are managed in Academics > Classes. Add classes there first. When adding a student, the Class dropdown will show only the classes you have created.",
      },
    ],
  },
  {
    id: "fees",
    title: "Fees Management",
    icon: IndianRupee,
    content: [
      {
        heading: "Fee Headings",
        body: "Go to Fees > Fee Headings. Add headings like Tuition, Transport, Computer, Sports. Each heading has a name and applicable months.",
      },
      {
        heading: "Fee Plans",
        body: "Go to Fees > Fee Plans. Assign amounts for each class/section per fee heading. This defines how much each class pays per month.",
      },
      {
        heading: "Collecting Fees",
        body: `1. Go to Fees > Collect Fees.
2. Search and select a student.
3. Months are auto-selected from April to the current month.
4. Review the fee grid (amounts by heading and month).
5. Enter the paid amount.
6. If paid < net fee: balance shows in RED (carried forward).
7. If paid > net fee: excess shows in GREEN (credited to next payment).
8. Click "Generate Receipt".`,
      },
      {
        heading: "Receipts",
        body: `Receipts are auto-numbered. You can view, reprint, edit, or delete a receipt from the payment history. Deleting a receipt recalculates the student's balance automatically.`,
      },
    ],
  },
  {
    id: "attendance",
    title: "Attendance",
    icon: GraduationCap,
    content: [
      {
        heading: "Manual Attendance",
        body: "Go to Attendance > Manual. Select class, section, and date. Mark each student as Present/Absent/Late/Half Day. Click Save.",
      },
      {
        heading: "QR Attendance",
        body: `Go to Attendance > QR Scanner.
- Camera mode: uses your device camera to scan student QR codes.
- Scanner Device mode: connect a USB or Bluetooth barcode scanner. It acts as a keyboard; scanned codes are captured automatically.`,
      },
      {
        heading: "ESSL/IP Biometric",
        body: `Go to Attendance > Biometric Devices. Add your ESSL or ZKTeco device by IP address and port. Click "Sync" to pull attendance records from the device and match them to students/staff.`,
      },
    ],
  },
  {
    id: "hr",
    title: "HR & Payroll",
    icon: Users,
    content: [
      {
        heading: "Staff Directory",
        body: "Go to HR > Staff. Add staff with fields: Employee ID, Name, Designation, Department, Mobile, DOB, Email, Joining Date, Salary. Export/import via CSV.",
      },
      {
        heading: "Payroll",
        body: `Go to HR > Payroll.
1. Select the month.
2. The system calculates salary based on days present vs working days.
3. Net salary = (Gross Salary / Working Days) × Days Present.
4. Generate payslips for each staff member.
5. View payroll register for the month.`,
      },
    ],
  },
  {
    id: "transport",
    title: "Transport",
    icon: Settings,
    content: [
      {
        heading: "Routes & Pickup Points",
        body: "Go to Transport > Routes. Add a route with bus number, driver name, and mobile. Add pickup points (stops) with distance. Set monthly fare per pickup point.",
      },
      {
        heading: "Assigning Students",
        body: `In Student Details > Transport tab, assign the student's route, bus number, and pickup point. Select which months the student uses transport (11 months by default; June unchecked).`,
      },
    ],
  },
  {
    id: "cpanel",
    title: "cPanel Setup Guide",
    icon: Server,
    content: [
      {
        heading: "Upload API Files",
        body: `1. Download the build from GitHub: https://github.com/shubhampatel345/school-erp-india
2. Open cPanel > File Manager > public_html/
3. Create a folder named api/ if it doesn't exist.
4. Upload api/index.php and api/config.php from the downloaded build.`,
      },
      {
        heading: "Create Database Tables",
        body: `Open this URL in your browser once:
https://shubh.psmkgs.com/api/index.php?route=migrate/run

You should see: {"status":"ok","message":"Migration complete"}
This creates all required MySQL tables.`,
      },
      {
        heading: "Reset Super Admin Password",
        body: `If you forget the Super Admin password, open:
https://shubh.psmkgs.com/api/index.php?route=migrate/reset-superadmin

This resets the password to admin123.`,
      },
      {
        heading: "Reset All Tables",
        body: `To recreate all tables with correct column names (fixes NULL column issues):
https://shubh.psmkgs.com/api/index.php?route=migrate/reset-db

Warning: This drops all data. Only use if tables are empty or corrupted.`,
      },
      {
        heading: "Database Credentials",
        body: `Host: localhost | Port: 3306
Database: psmkgsco_shubherp_db
User: psmkgsco_shubherp_user
Password: Shubh@420`,
      },
    ],
  },
  {
    id: "api",
    title: "PHP API Reference",
    icon: Code2,
    content: [
      {
        heading: "Base URL",
        body: `https://shubh.psmkgs.com/api/index.php?route={endpoint}
All routes use query parameter routing. No .htaccess dependency.`,
      },
      {
        heading: "Authentication",
        body: `POST ?route=auth/login
Body: {"username":"superadmin","password":"admin123"}
Returns: {"token":"<jwt>","user":{...}}

Include in all requests: Authorization: Bearer {token}`,
      },
      {
        heading: "Core Endpoints",
        body: `GET  ?route=sync/all           — Fetch all collections
GET  ?route=sync/status         — Get record counts
POST ?route=sync/push           — Bulk push data
GET  ?route={collection}        — Get records (e.g. students, staff)
POST ?route={collection}        — Create record
PUT  ?route={collection}&id=X   — Update record
DELETE ?route={collection}&id=X — Delete record`,
      },
      {
        heading: "Collections",
        body: `students, staff, attendance, fee_receipts, fees_plan, fee_headings,
sessions, classes, subjects, transport_routes, inventory_items,
expenses, homework, alumni, alumni_events, homework_submissions,
payroll, chat_messages, changelog`,
      },
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    icon: HelpCircle,
    content: [
      {
        heading: "Server returned HTML instead of JSON",
        body: `Cause: The api/ folder is not uploaded to cPanel, or the URL is wrong.
Fix:
1. Check Settings > Data Management > Database Server URL: must be https://shubh.psmkgs.com/api/index.php
2. Upload api/index.php and api/config.php to cPanel public_html/api/
3. Visit https://shubh.psmkgs.com/api/index.php?route=health — should return {"status":"ok"}`,
      },
      {
        heading: "Invalid username or password (server auth)",
        body: `Fix:
1. Go to Settings > Data Management > Database Server
2. Click "Authenticate Now"
3. Enter password: admin123
4. If fails, open: https://shubh.psmkgs.com/api/index.php?route=migrate/reset-superadmin`,
      },
      {
        heading: "Data not saving / 0 records in MySQL",
        body: `Fix:
1. Make sure you are authenticated (green status in Database Server settings)
2. Go to Settings > Data Management > Push Local Data to Server
3. Wait for all collections to show "Pushed" status
4. Verify in phpMyAdmin that rows appear in the tables`,
      },
      {
        heading: "Students show 0 on dashboard",
        body: `This happens when the frontend is reading from browser instead of the server.
Fix: Refresh the page. If still 0, check server connection in Settings. If server is down, restore connection and refresh again.`,
      },
      {
        heading: "NULL columns in MySQL",
        body: `Cause: Old tables with wrong column names.
Fix:
1. Open: https://shubh.psmkgs.com/api/index.php?route=migrate/reset-db
2. This recreates all tables with correct camelCase column names
3. Push your data again from Settings > Data Management`,
      },
    ],
  },
  {
    id: "roles",
    title: "Roles & Permissions",
    icon: Shield,
    content: [
      {
        heading: "Role Summary",
        body: `Super Admin: Full access to everything, all sessions, all modules.
Admin: View/Add/Edit most modules. No system settings.
Teacher: View students/attendance/homework. Add attendance/homework.
Receptionist: View/Add students and fees.
Accountant: View/Add fees and expenses.
Librarian: View students. Add inventory.
Driver: View transport routes.
Parent: View own children's data (attendance, fees, homework).
Student: View own profile, attendance, homework.`,
      },
      {
        heading: "Changing Permissions",
        body: "Super Admin can go to Settings > User Management and customize permissions per user. Click a user and toggle the module-level permissions (View, Add, Edit, Delete) for each module.",
      },
      {
        heading: "Adding Users",
        body: "Super Admin can go to Settings > User Management > Add User. Fill in name, username, password, and role. Staff can also log in using their mobile number (username) and DOB (password) if their credentials are set up.",
      },
    ],
  },
];

function DocSectionPanel({
  section,
  searchQuery,
}: { section: DocSection; searchQuery: string }) {
  const [open, setOpen] = useState(!searchQuery);
  const Icon = section.icon;

  const filteredContent = useMemo(() => {
    if (!searchQuery) return section.content;
    const q = searchQuery.toLowerCase();
    return section.content.filter(
      (c) =>
        c.heading.toLowerCase().includes(q) || c.body.toLowerCase().includes(q),
    );
  }, [section.content, searchQuery]);

  if (searchQuery && filteredContent.length === 0) return null;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
        onClick={() => setOpen((v) => !v)}
        data-ocid={`docs.${section.id}.toggle`}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">
            {section.title}
          </span>
          <Badge variant="secondary" className="text-xs">
            {filteredContent.length}
          </Badge>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="border-t border-border divide-y divide-border/50">
          {filteredContent.map((c) => (
            <div key={c.heading} className="px-4 py-3">
              <p className="font-medium text-sm text-foreground mb-1.5">
                {c.heading}
              </p>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-body">
                {c.body}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Documentation() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return DOCS;
    const q = search.toLowerCase();
    return DOCS.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.content.some(
          (c) =>
            c.heading.toLowerCase().includes(q) ||
            c.body.toLowerCase().includes(q),
        ),
    );
  }, [search]);

  return (
    <div className="p-4 md:p-6 bg-background min-h-screen space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" /> Documentation
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Complete guide for SHUBH SCHOOL ERP
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => window.print()}
          data-ocid="docs.print_button"
        >
          <Printer className="w-4 h-4 mr-1" /> Print
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search documentation…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-ocid="docs.search_input"
        />
      </div>

      {/* Quick Links */}
      {!search && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {DOCS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                className="flex flex-col items-center gap-1 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors text-center"
                onClick={() => {
                  const el = document.getElementById(`doc-${s.id}`);
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                data-ocid={`docs.quicklink.${s.id}`}
              >
                <Icon className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-foreground leading-tight">
                  {s.title}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Sections */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div
            className="text-center py-16 text-muted-foreground"
            data-ocid="docs.empty_state"
          >
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No results for "{search}"</p>
          </div>
        ) : (
          filtered.map((s) => (
            <div key={s.id} id={`doc-${s.id}`}>
              <DocSectionPanel section={s} searchQuery={search} />
            </div>
          ))
        )}
      </div>

      {/* API Section */}
      {!search && (
        <div className="mt-6 p-4 rounded-xl border bg-muted/30 space-y-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <p className="font-semibold text-sm text-foreground">
              Live API URL
            </p>
          </div>
          <code className="text-xs font-mono bg-card px-3 py-1.5 rounded border block">
            https://shubh.psmkgs.com/api/index.php?route=&#123;endpoint&#125;
          </code>
          <p className="text-xs text-muted-foreground">
            Supports direct file routing — no .htaccess needed. Works on all
            cPanel servers.
          </p>
        </div>
      )}
    </div>
  );
}
