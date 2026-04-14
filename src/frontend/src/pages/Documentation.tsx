import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Cloud,
  Code2,
  Copy,
  Database,
  GraduationCap,
  HelpCircle,
  IndianRupee,
  MessageSquare,
  Printer,
  RefreshCw,
  Rocket,
  Shield,
  Smartphone,
  Users,
  Wifi,
} from "lucide-react";
import { useState } from "react";

// ─── Copy button ─────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button
      type="button"
      onClick={handle}
      aria-label="Copy code"
      className="ml-2 p-1 rounded hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
    >
      {copied ? (
        <span className="text-xs text-primary font-medium">Copied!</span>
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

// ─── Code block ──────────────────────────────────────────────
function Code({ children }: { children: string }) {
  return (
    <div className="relative group">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={children} />
      </div>
      <pre className="bg-muted/60 rounded-lg px-4 py-3 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

// ─── Accordion ───────────────────────────────────────────────
function Accordion({
  title,
  icon,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-card hover:bg-muted/30 transition-colors text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <span className="text-primary w-5 h-5 flex-shrink-0">{icon}</span>
          )}
          <span className="font-semibold text-foreground">{title}</span>
          {badge && (
            <Badge variant="secondary" className="text-xs ml-1">
              {badge}
            </Badge>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-3 bg-background border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Table helper ────────────────────────────────────────────
function DocTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="text-left px-4 py-2.5 font-semibold text-muted-foreground whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={String(row[0])} className="hover:bg-muted/20">
              {row.map((cell, ci) => (
                <td
                  key={`${String(row[0])}-${ci}`}
                  className={`px-4 py-2.5 ${ci === 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Step item ───────────────────────────────────────────────
function Step({
  num,
  title,
  children,
}: {
  num: string | number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
        {num}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm mb-1.5">{title}</p>
        {children}
      </div>
    </li>
  );
}

// ─── Alert box ───────────────────────────────────────────────
function Alert({
  type = "info",
  children,
}: {
  type?: "info" | "warn" | "danger";
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-primary/5 border-primary/20 text-primary",
    warn: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-300",
    danger: "bg-destructive/5 border-destructive/20 text-destructive",
  };
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles[type]}`}>
      {children}
    </div>
  );
}

// ─── Module data ─────────────────────────────────────────────
const MODULES = [
  {
    name: "Student Information",
    icon: "🎒",
    desc: [
      "Excel-style grid with 50+ columns. Multi-filter: class, section, status, gender, category, route — all simultaneously.",
      "Search by: name, mobile, father's name, mother's name, village, class.",
      "Bulk checkboxes: print list, export CSV, WhatsApp batch message.",
      "Import/Export CSV with gender field.",
      "Double-click opens full Student Detail modal with tabs:",
      "• Basic Info: photo, admission date, DOB, address, father/mother name, Aadhaar, S.R. No., Pen No., Apaar No.",
      "• Academic: class, section, roll number, category, previous school.",
      "• Transport: Bus No., Route, Pickup Point (auto-populated from Transport module). 11-month checkbox wizard (Apr–Mar, June unchecked by default).",
      "• Discounts: fixed monthly discount amount, select which fee headings it applies to (Select All option), net payable preview.",
      "• Old Fees: add/edit previous session dues that carry forward to net payable.",
      "• Credentials: auto-generated username/password, reset by Super Admin.",
      "Admission Form: 3 printable templates. ID Card: upload background image, checkbox wizard for fields, font/color/size controls, set default template. Admit Card: editable text with QR code. Birthday list.",
    ],
  },
  {
    name: "Fees Module",
    icon: "💰",
    desc: [
      "Fee Heading Design: define heading names with specific months they apply to (e.g. Lab Fee → April, October only). No group field.",
      "Fees Plan: section-wise amounts per heading per class/section. Same heading can have different values across sections. Editable by Super Admin only.",
      "Collect Fees: Student search panel + info display + month selector. Only applicable fees for student's class/section shown. Old balance carry-forward: RED = student owes (paid less than net fee); GREEN credit = student paid more (auto-settles on next payment). Family Members panel: students sharing same mobile shown together for quick navigation. Other Charges row: type any label (tie, belt, books, etc.). Payment history: reprint, full edit (change months/amount/date/mode), delete (also removes related balance adjustments). Zero-amount validation: receipt won't save if total is ₹0. Zero-amount particulars are skipped on printed receipts. Receipt starts printing from top of page.",
      "Receipt Templates (4): Standard, Compact, Detailed, Bharati Format (105mm × 145mm). QR code on each receipt encodes real data.",
      "Fee Register: full payment ledger. Shows who received payment (name + role). Permission-based edit/delete. Reprint option. CSV export.",
      "Accounts: account-wise received fees summary. Heading-wise breakdown per account.",
      "Due Fees Wizard: select months + classes via checkboxes. Shows month-wise dues. Print / Export / WhatsApp Reminder / Print Reminder Letter options.",
      "Online Fees: Super Admin toggles GPay/Razorpay/PayU on/off. Online payments auto-update Fee Register and generate receipt.",
    ],
  },
  {
    name: "Attendance",
    icon: "📋",
    desc: [
      "Manual Entry tab: mark daily attendance by class/section grid.",
      "RFID/Biometric tab: simulate RFID scan or integrate with IP-based ESSL/ZKTeco devices. Shows present/total summary by class, section, and route.",
      "QR Scanner tab: camera mode (mobile browser with HTTPS) and USB/Bluetooth keyboard-mode scanner (plug-in scanner types into input field, auto-captures). Scans student Admit Card QR code. Marks student present with timestamp. Manual Admission No. fallback. Today's scan log displayed. CSV export.",
      "Welcome Display tab: designed for a lobby TV or large screen. Idle state shows live digital clock and 'SCAN CARD TO CHECK IN'. On scan: full-screen animated card with student/staff photo, name, father's name (student) or designation (staff), class/section, exact entry time, and 'WELCOME TO SCHOOL!' banner. Last 5 check-ins shown in a ticker strip.",
      "Biometric Devices tab: Add ESSL/ZKTeco devices by IP, port, device type. Test Connection. Sync Attendance logs. Map device User IDs to student/staff records.",
    ],
  },
  {
    name: "Examinations",
    icon: "📝",
    desc: [
      "Exam Timetable Maker wizard: enter exam name, dates/times, select classes and subjects. System auto-generates per-class timetables with subject suggestions.",
      "Drag-and-drop subject reordering within a date slot (dates are locked). Generate button reshuffles subjects. Save button locks the arrangement.",
      "Excel-style combined view: Date, Day, Class columns. Printable and exportable as CSV.",
      "Exam Results: enter marks per student per subject. Auto-calculate percentage, grade, rank. Publish results. Marksheet generation.",
    ],
  },
  {
    name: "HR & Payroll",
    icon: "👥",
    desc: [
      "Staff Directory: add/edit/delete staff with photo. Import/Export CSV (bulk upload).",
      "Teacher Subject Wizard (Step 2 of Add Staff): assign multiple subjects with class ranges. Example: English Class 1–5, Art Class 6–8. These assignments feed the Teacher Timetable generator automatically.",
      "Payroll module: set gross/net salary per staff. Attendance-based deduction: Net Salary = Gross × (Days Present / Working Days). Generate payslips. Payroll register with all staff. Export to CSV.",
      "Leave Management: apply for leave, approve/reject, track leave balance.",
    ],
  },
  {
    name: "Academics",
    icon: "📚",
    desc: [
      "Classes & Sections: CRUD for class structure (e.g. Class 1A, 1B, 2A). No Class Teacher field — assign separately.",
      "Subjects: multi-class wizard. One subject can be assigned to many classes (e.g. Hindi → Classes 1 through 8 simultaneously). No code/class/teacher columns.",
      "Class Timetable: period grid editor. Set per-period duration and interval/break time.",
      "Teacher Timetable Maker: wizard auto-loads teacher-subject-class assignments from HR. Supports split-week subjects (e.g. 3 days one subject, 3 days another). Auto-generates conflict-free timetables per section. Drag-and-drop for teacher/subject arrangement. Regenerate and Save. Combined view (all sections) and teacher-wise view.",
      "Syllabus: chapter tracker with progress bars per class/subject.",
    ],
  },
  {
    name: "Transport",
    icon: "🚌",
    desc: [
      "Routes: add route name, bus number, driver assignment.",
      "Pickup Points: add stops per route. Set monthly fare per pickup point (not per route).",
      "Student assignment: students are assigned to a route and pickup point from the Transport module. Their student profile Transport tab auto-populates Bus No., Route, Pickup Point.",
      "Transport months selection: in student details → Transport tab, select which months transport applies (11 months auto-selected, June unchecked by default).",
      "Route-wise attendance summary: see which students are present/absent on each route today.",
    ],
  },
  {
    name: "Template Studio",
    icon: "🏅",
    desc: [
      "All 8 school templates in one place: Student ID Card, Fees Receipt, Admission Form, Result/Marksheet, Admit Card, Bonafide Certificate, Transfer Certificate, Experience Certificate.",
      "Full drag-and-drop canvas editor: move any field anywhere on the canvas.",
      "Controls: font family, font size, font color, bold/italic, element position/size.",
      "Background: upload custom image or set solid color.",
      "Paper size: A4, A5, 105×145mm (Bharati Format), or custom dimensions.",
      "Save design, export design file, import design file (share between school branches).",
      "Set default template per type — used for all printing throughout the ERP.",
    ],
  },
  {
    name: "Inventory",
    icon: "📦",
    desc: [
      "Items: add items with name, category, unit, sell price, cost price, opening stock.",
      "Categories: Uniform, Stationery, Books, Equipment, or custom.",
      "Purchase tab: record purchases from suppliers with quantity and cost.",
      "Sales tab: record sales with quantity. Stock auto-deducted.",
      "Low stock alerts. Stock summary report with print/export to CSV.",
    ],
  },
  {
    name: "Communication",
    icon: "💬",
    desc: [
      "WhatsApp tab: real API integration via wacoder.in (app_key + auth_key). Compose messages. Send to parent/student/teacher groups. View sends log with status.",
      "WhatsApp Auto-Reply Bot: parents send their child's Admission No. to school WhatsApp → system auto-replies with attendance summary and pending fees.",
      "RCS Messages tab: simulated Google RCS messages with same templates as WhatsApp.",
      "Notification Scheduler: 7 event cards — Fee Due Reminder, Absent Alert, Birthday Wish, Exam Timetable Published, Result Published, General Notice, Homework Deadline. Each has ON/OFF toggle, timing setting (e.g. '3 days before'), recipient group, and channel (WhatsApp / RCS / Both).",
      "Notification bell in header shows live ERP events (fee receipts, attendance saves, new admissions).",
    ],
  },
  {
    name: "Expenses",
    icon: "💸",
    desc: [
      "Income & Expense ledgers with running balance.",
      "Expense Heads CRUD (e.g. Salary, Electricity, Maintenance).",
      "Budget vs Actual comparison by head.",
      "Monthly bar chart showing income vs expenses.",
    ],
  },
  {
    name: "Homework",
    icon: "✏️",
    desc: [
      "Assign homework by class/section/subject with due date and description.",
      "Overdue detection: assignments past due date highlighted in red.",
      "Submission Tracker: mark each student's submission status.",
      "Analytics charts: completion rates by class.",
    ],
  },
  {
    name: "Alumni",
    icon: "🎓",
    desc: [
      "Alumni Directory: CRUD for alumni records with search.",
      "Batch View: grouped cards by passing year.",
      "Events: manage alumni events and reunions.",
    ],
  },
  {
    name: "Reports",
    icon: "📊",
    desc: [
      "8 report cards, each opens real data from ERP storage:",
      "Students Report, Finance Report, Attendance Report, Examinations Report, HR Report, Transport Report, Inventory Report, Fees Due Report.",
      "Each report displays charts + tables with print and CSV export options.",
    ],
  },
  {
    name: "Promote Students",
    icon: "⬆️",
    desc: [
      "4-step wizard: select session, review students, map next classes, confirm promotion.",
      "Bulk advances all students to the next class. Creates the new session (e.g. 2025-26 → 2026-27).",
      "Archives old session — all historical data is preserved indefinitely.",
      "Month-wise unpaid fees carry forward as Old Balance in the new session.",
      "Students finishing the final class (e.g. Class 12) are auto-discontinued as 'Passed Out'.",
      "⚠️ Always export a backup before running Promote Students.",
    ],
  },
  {
    name: "Settings",
    icon: "⚙️",
    desc: [
      "School Profile: name, address, phone, email, upload logo, upload dashboard background image.",
      "Session Management: view current session, create new session, switch sessions (archived = read-only for non-Super Admin; Super Admin can edit all sessions).",
      "User Management (Super Admin only): searchable list of all users. Reset any password. Add new staff users (Admin, Receptionist, Accountant, Librarian, Driver) with name, position, mobile (becomes username), password.",
      "WhatsApp API: enter app_key + auth_key (wacoder.in), toggle enable/disable, send test message, view recent sends log.",
      "WhatsApp Bot: enable/disable auto-reply for parent admission-number lookup.",
      "Online Payment: toggle GPay / Razorpay / PayU gateways on/off.",
      "Notification Scheduler: configure all 7 auto-notification events.",
      "Themes: select and save preferred color theme (multiple themes available).",
      "Data Management: Export JSON Backup, Import JSON Backup, Factory Reset (3-step confirmation), backup history log.",
    ],
  },
];

// ─── Roles matrix ────────────────────────────────────────────
const ROLES = [
  [
    "Super Admin",
    "All modules + all sessions including archived. Reset any password. Factory reset. Add/remove users.",
  ],
  [
    "Admin",
    "All modules except Super Admin settings. Can reset non-admin passwords. Cannot delete fee receipts.",
  ],
  [
    "Accountant",
    "Full fees module, expense ledger, accounts, reports. No HR payroll or settings access.",
  ],
  [
    "Receptionist",
    "Student information (view/add), attendance, basic fees view. No delete rights.",
  ],
  [
    "Teacher",
    "Mark attendance for own classes, homework, timetable view, student list for assigned classes.",
  ],
  [
    "Parent",
    "View own children's fee receipts, attendance, timetable, notices, homework.",
  ],
  [
    "Student",
    "View own attendance, fee receipts, timetable, homework assignments, exam results.",
  ],
  [
    "Driver",
    "QR Attendance scanner, own route info and assigned student list.",
  ],
  [
    "Librarian",
    "Student list (view only), basic attendance view, custom access.",
  ],
];

// ─── FAQs ────────────────────────────────────────────────────
const FAQS = [
  {
    q: "I forgot the Super Admin password. How do I reset it?",
    a: "Open browser DevTools (F12) → Application → Local Storage → find 'shubh_erp_user_passwords' → edit the 'superadmin' key value to 'admin123'. Or do a Factory Reset from Settings → Data → Factory Reset (this clears all data — export a backup first).",
  },
  {
    q: "A teacher or student cannot log in. What are their default credentials?",
    a: "Student: Username = Admission No., Password = Date of Birth in ddmmyyyy (e.g. 01042010). Teacher: Username = Mobile No., Password = DOB in ddmmyyyy. Parent: Username = Guardian Mobile No., Password = same Mobile No. Credentials are auto-created when you add a student or staff member.",
  },
  {
    q: "Receipts print with a blank page or at wrong position.",
    a: "In the print dialog, set Margins to 'None' and uncheck 'Headers and footers'. For Bharati Format (4-size / 105×145mm), set paper size to A6 (148×105mm) in the print dialog. The receipt starts at the top of the page.",
  },
  {
    q: "The QR scanner on mobile is not working.",
    a: "QR scanner requires camera permission AND HTTPS. Open the app in Chrome on Android or Safari on iOS. Go to QR Attendance, allow camera when prompted. If denied, go to Chrome Settings → Site Settings → Camera → find your domain → Allow.",
  },
  {
    q: "WhatsApp messages show 'CORS error'. Is this a bug?",
    a: "No. CORS errors only occur when testing from localhost or the Caffeine preview URL. Once you deploy to your own cPanel domain (e.g. school.com), the wacoder.in API calls will work correctly. The ERP continues functioning even when the CORS error appears in preview.",
  },
  {
    q: "How do I backup all school data?",
    a: "Settings → Data → Export JSON Backup. This downloads all ERP data as a single JSON file. To restore: Settings → Data → Import JSON Backup. Always export a backup before running Promote Students or Factory Reset.",
  },
  {
    q: "How do I add a new academic session without promoting students?",
    a: "Go to Settings → Sessions → Create New Session. This archives the current session. Use Promote Students (sidebar) only at year-end when you want to advance all students to the next class.",
  },
  {
    q: "ESSL biometric device is connected but no data comes in.",
    a: "Ensure the device is on the same LAN as the computer running the ERP. Check the device IP in its hardware settings (Menu → Communication → Ethernet), then enter it in Attendance → Biometric Devices. For cPanel hosted ERP, use the PHP proxy script.",
  },
  {
    q: "Balance amount is showing wrong color in Collect Fees.",
    a: "RED = student owes money (paid less than net fee, e.g. owed ₹500, paid ₹400, balance = ₹100 red). GREEN = student has credit (paid more than net fee, e.g. owed ₹500, paid ₹600, credit = ₹100 green — auto-settles on next payment).",
  },
  {
    q: "After deleting a receipt, the balance amount is still showing.",
    a: "This was fixed in a recent version. Deleting a fee receipt now removes all related balance adjustments and recalculates the student's running balance from scratch. If you still see stale data, try refreshing the page.",
  },
  {
    q: "How do parents receive WhatsApp auto-replies for attendance?",
    a: "Go to Communication → Auto-Send Scheduler → enable 'Absent Alert'. Set channel to WhatsApp. The parent's mobile number (from the student profile guardian field) will receive an automatic message when their child is marked absent.",
  },
  {
    q: "Can the ERP work on multiple devices / computers simultaneously?",
    a: "Data is stored in browser localStorage per device. To share data across devices, export a backup on Device A and import it on Device B. For real-time multi-device sync, a server-based database setup is needed (future feature).",
  },
];

// ─── Section IDs ─────────────────────────────────────────────
type SectionId =
  | "getting-started"
  | "modules"
  | "fees-deep"
  | "attendance-deep"
  | "whatsapp"
  | "essl"
  | "backup"
  | "cpanel"
  | "pwa"
  | "faq"
  | "roles"
  | "build";

const SECTIONS: {
  id: SectionId;
  label: string;
  icon: React.ReactNode;
  shortLabel: string;
}[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    shortLabel: "Start",
    icon: <Rocket className="w-4 h-4" />,
  },
  {
    id: "modules",
    label: "Module Guide",
    shortLabel: "Modules",
    icon: <BookOpen className="w-4 h-4" />,
  },
  {
    id: "fees-deep",
    label: "Fees Deep Dive",
    shortLabel: "Fees",
    icon: <IndianRupee className="w-4 h-4" />,
  },
  {
    id: "attendance-deep",
    label: "Attendance Guide",
    shortLabel: "Attend.",
    icon: <Users className="w-4 h-4" />,
  },
  {
    id: "whatsapp",
    label: "WhatsApp Setup",
    shortLabel: "WhatsApp",
    icon: <MessageSquare className="w-4 h-4" />,
  },
  {
    id: "essl",
    label: "ESSL Biometric",
    shortLabel: "ESSL",
    icon: <Wifi className="w-4 h-4" />,
  },
  {
    id: "backup",
    label: "Backup & Restore",
    shortLabel: "Backup",
    icon: <RefreshCw className="w-4 h-4" />,
  },
  {
    id: "cpanel",
    label: "Deploy on cPanel",
    shortLabel: "cPanel",
    icon: <Cloud className="w-4 h-4" />,
  },
  {
    id: "pwa",
    label: "PWA Installation",
    shortLabel: "PWA",
    icon: <Smartphone className="w-4 h-4" />,
  },
  {
    id: "faq",
    label: "FAQ",
    shortLabel: "FAQ",
    icon: <HelpCircle className="w-4 h-4" />,
  },
  {
    id: "roles",
    label: "Roles & Permissions",
    shortLabel: "Roles",
    icon: <Shield className="w-4 h-4" />,
  },
  {
    id: "build",
    label: "Build Commands",
    shortLabel: "Build",
    icon: <Code2 className="w-4 h-4" />,
  },
];

// ─── Main page ───────────────────────────────────────────────
export default function Documentation() {
  const [active, setActive] = useState<SectionId>("getting-started");

  const jumpTo = (id: SectionId) => setActive(id);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="bg-card border-b px-4 lg:px-6 py-3 flex items-center gap-3"
        data-print-hide
      >
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-display font-semibold text-foreground">
            Documentation
          </h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Complete user guide, deployment &amp; technical reference for SHUBH
            SCHOOL ERP
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
            HELP
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 text-xs"
            data-ocid="doc.print_button"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </Button>
        </div>
      </div>

      {/* Quick jump bar */}
      <div
        className="bg-muted/30 border-b px-4 py-2 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0"
        data-print-hide
      >
        <span className="text-muted-foreground font-medium mr-1 shrink-0 hidden sm:inline">
          Jump to:
        </span>
        {(
          [
            { id: "getting-started" as SectionId, label: "Getting Started" },
            { id: "fees-deep" as SectionId, label: "Fees" },
            { id: "attendance-deep" as SectionId, label: "Attendance" },
            { id: "cpanel" as SectionId, label: "Deploy" },
            { id: "whatsapp" as SectionId, label: "WhatsApp" },
            { id: "essl" as SectionId, label: "ESSL" },
            { id: "backup" as SectionId, label: "Backup" },
            { id: "faq" as SectionId, label: "FAQ" },
          ] satisfies { id: SectionId; label: string }[]
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => jumpTo(item.id)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors whitespace-nowrap"
          >
            {item.label}
            <ArrowRight className="w-3 h-3" />
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav
          className="hidden md:flex flex-col w-52 bg-card border-r shrink-0 overflow-y-auto py-3 scrollbar-thin"
          data-print-hide
        >
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              data-ocid={`doc.nav.${s.id}`}
              onClick={() => setActive(s.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors ${
                active === s.id
                  ? "bg-primary/10 text-primary font-medium border-r-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </nav>

        {/* Mobile tabs */}
        <div className="md:hidden w-full flex flex-col overflow-hidden">
          <div className="flex overflow-x-auto border-b bg-card px-3 py-2 gap-2 shrink-0 scrollbar-thin">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                  active === s.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.icon}
                {s.shortLabel}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
            <DocContent active={active} />
          </div>
        </div>

        {/* Desktop content */}
        <div className="hidden md:block flex-1 overflow-y-auto p-6 bg-background scrollbar-thin">
          <div className="max-w-3xl space-y-5">
            <DocContent active={active} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Content router ──────────────────────────────────────────
function DocContent({ active }: { active: SectionId }) {
  const map: Record<SectionId, React.ReactNode> = {
    "getting-started": <GettingStarted />,
    modules: <ModuleGuide />,
    "fees-deep": <FeesDeepDive />,
    "attendance-deep": <AttendanceGuide />,
    whatsapp: <WhatsAppSetup />,
    essl: <EsslBiometric />,
    backup: <BackupRestore />,
    cpanel: <CpanelDeploy />,
    pwa: <PwaInstall />,
    faq: <FaqSection />,
    roles: <RolesSection />,
    build: <BuildCommands />,
  };
  return <>{map[active]}</>;
}

// ─── Setup checklist data ────────────────────────────────────
const SETUP_STEPS = [
  {
    title: "Configure School Profile",
    desc: "Settings → School Profile. Enter school name, address, mobile, email, upload logo, and optionally upload a dashboard background image.",
  },
  {
    title: "Set Up Classes & Sections",
    desc: "Academics → Classes & Sections. Add your class structure (e.g. Class 1A, 1B … 12C).",
  },
  {
    title: "Add Subjects",
    desc: "Academics → Subjects. Use the multi-class wizard to assign one subject to many classes (e.g. Hindi → Class 1 to 8 simultaneously).",
  },
  {
    title: "Add HR Staff & Teachers",
    desc: "HR → Staff Directory → Add Staff. For teachers, the subject-class range wizard (Step 2) lets you assign multiple subjects with class ranges (e.g. English: Class 1–5, Art: Class 6–8).",
  },
  {
    title: "Define Fee Structure",
    desc: "Fees → Fee Headings: define heading names and applicable months. Fees → Fee Plan: set section-wise amounts per heading (Super Admin only).",
  },
  {
    title: "Admit Students",
    desc: "Students → Add Student. Fill the admission form. Credentials (Adm.No. / DOB) are auto-created. Transport details auto-populate from Transport module.",
  },
  {
    title: "Configure Transport (Optional)",
    desc: "Transport → Routes → Add Pickup Points → set monthly fare per pickup point. Assign students to routes in student details → Transport tab.",
  },
  {
    title: "Start Collecting Fees",
    desc: "Fees → Collect Fees. Search student, select months, enter amount, save and print receipt. Old balance carries forward automatically.",
  },
];

function SetupChecklist() {
  return (
    <ol className="space-y-3">
      {SETUP_STEPS.map((item, i) => (
        <li key={item.title} className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
            {i + 1}
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">{item.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ─── Getting Started ─────────────────────────────────────────
function GettingStarted() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground mb-1">
          Getting Started
        </h2>
        <p className="text-sm text-muted-foreground">
          Set up SHUBH SCHOOL ERP for your school in under 10 minutes.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">
          Default Login Credentials
        </h3>
        <DocTable
          headers={["Role", "Username", "Password", "Notes"]}
          rows={[
            [
              "Super Admin",
              "superadmin",
              "admin123",
              "Change immediately after first login",
            ],
            [
              "Admin",
              "admin",
              "admin123",
              "Created in Settings → User Management",
            ],
            [
              "Teacher",
              "Mobile No.",
              "DOB (ddmmyyyy)",
              "Auto-created when added in HR",
            ],
            [
              "Student",
              "Admission No.",
              "DOB (ddmmyyyy)",
              "Auto-created when admitted",
            ],
            [
              "Parent",
              "Father's Mobile No.",
              "Father's Mobile No.",
              "Supports multiple children",
            ],
            ["Driver", "driver", "driver123", "Or mobile/DOB if added via HR"],
            [
              "Receptionist / Accountant / Librarian",
              "Mobile No.",
              "Set by Super Admin",
              "Created in Settings → User Management",
            ],
          ]}
        />
        <Alert type="warn">
          ⚠️ Change the Super Admin password immediately after first login:
          top-right user menu → Change Password.
        </Alert>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-foreground mb-4">
          First-Time Setup Checklist
        </h3>
        <SetupChecklist />
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">Session Management</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The current academic session (e.g. 2025-26) is shown at the top-left
          of the header. Use the session dropdown to switch to archived sessions
          for read-only historical view.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Super Admin</strong> can edit data
          in any session, including archived ones. Non-Super Admin roles see
          archived sessions as read-only.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          At year-end, run{" "}
          <strong className="text-foreground">Promote Students</strong> from the
          sidebar to advance all students, create the next session, and carry
          forward unpaid month-wise dues as Old Balance. Sessions are archived
          infinitely — no data is ever deleted.
        </p>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">
          Auto-Generated Credentials
        </h3>
        <p className="text-sm text-muted-foreground text-sm mb-2">
          Credentials are automatically created when you add a student or staff
          member:
        </p>
        <DocTable
          headers={["User Type", "Username", "Default Password"]}
          rows={[
            [
              "Student",
              "Admission Number (e.g. 2025001)",
              "DOB in ddmmyyyy (e.g. 01042012)",
            ],
            [
              "Teacher / Staff",
              "Mobile Number (e.g. 9876543210)",
              "DOB in ddmmyyyy (e.g. 15081985)",
            ],
            ["Parent", "Father's Mobile Number", "Same mobile number"],
          ]}
        />
        <p className="text-xs text-muted-foreground">
          View credentials in student/staff detail modal → Credentials tab.
          Super Admin can reset any password from Settings → User Management.
        </p>
      </Card>
    </div>
  );
}

// ─── Module Guide ────────────────────────────────────────────
function ModuleGuide() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground mb-1">
          Module Guide
        </h2>
        <p className="text-sm text-muted-foreground">
          Click each module to expand its complete usage guide.
        </p>
      </div>
      {MODULES.map((mod) => (
        <Accordion key={mod.name} title={`${mod.icon}  ${mod.name}`}>
          <ul className="space-y-1.5">
            {(Array.isArray(mod.desc) ? mod.desc : [mod.desc]).map((line) => (
              <li
                key={line}
                className="text-sm text-muted-foreground leading-relaxed"
              >
                {line}
              </li>
            ))}
          </ul>
        </Accordion>
      ))}
    </div>
  );
}

// ─── Fees Deep Dive ──────────────────────────────────────────
function FeesDeepDive() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground mb-1">
          Fees Module — Deep Dive
        </h2>
        <p className="text-sm text-muted-foreground">
          Complete guide to the fees collection workflow, balance logic,
          receipts, and registers.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">Fee Setup Flow</h3>
        <ol className="space-y-3 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <div>
              <strong className="text-foreground">Fee Headings</strong>: Define
              heading names (e.g. Tuition Fee, Lab Fee, Sports Fee) and which
              months they apply to. Fees → Fee Headings.
            </div>
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <div>
              <strong className="text-foreground">Fees Plan</strong>: Set the
              amount per heading per class and section. Same heading can be ₹500
              for Class 1A and ₹600 for Class 1B. Fees → Fee Plan. Super Admin
              only.
            </div>
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              3
            </span>
            <div>
              <strong className="text-foreground">Transport Fares</strong>: Set
              monthly fare per pickup point in Transport → Routes → Pickup
              Points. Automatically included in fee collection for
              transport-assigned students.
            </div>
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              4
            </span>
            <div>
              <strong className="text-foreground">Discounts</strong>: Per
              student in student details → Discounts tab. Fixed monthly amount.
              Select which fee headings it applies to.
            </div>
          </li>
        </ol>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">
          Collect Fees — Workflow
        </h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>
            1. Search student by Admission No., name, or mobile. Student info
            panel loads on the left.
          </li>
          <li>
            2. Month selector appears. 11 months are auto-selected (June
            unchecked by default). Select the months to collect for.
          </li>
          <li>
            3. Fee grid shows only the fee headings applicable to the student's
            class/section with per-month columns.
          </li>
          <li>
            4. If student has transport, it appears as a separate row with the
            pickup-point monthly fare × selected transport months.
          </li>
          <li>5. Discounts (if any) are shown and subtracted automatically.</li>
          <li>
            6. Old balance from previous unpaid amounts is shown and added to
            the Net Total.
          </li>
          <li>
            7. Add Other Charges row if needed (e.g. Tie ₹150, Belt ₹100).
          </li>
          <li>
            8. Enter the Amount Received. The system calculates balance
            immediately.
          </li>
          <li>
            9. Select receipt template (Standard / Compact / Detailed / Bharati
            Format).
          </li>
          <li>
            10. Click Save & Print. Receipt is generated and payment history
            updates.
          </li>
        </ol>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">Balance Amount Logic</h3>
        <DocTable
          headers={["Scenario", "Color", "What Happens"]}
          rows={[
            [
              "Net Fee ₹500, Paid ₹400 → Shortfall ₹100",
              "🔴 RED",
              "₹100 balance carried to next payment as outstanding due",
            ],
            [
              "Net Fee ₹500, Paid ₹500 → Exact",
              "—",
              "No balance. Receipt generated for ₹500",
            ],
            [
              "Net Fee ₹500, Paid ₹600 → Surplus ₹100",
              "🟢 GREEN",
              "₹100 credit balance auto-settles on next payment (reduces next net fee by ₹100)",
            ],
          ]}
        />
        <Alert type="info">
          ℹ️ Deleting a receipt also removes all related balance adjustments and
          recalculates the student's complete balance from scratch.
        </Alert>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">
          Fees Awaiting (Dashboard)
        </h3>
        <p className="text-sm text-muted-foreground">
          The Fees Awaiting card on the dashboard shows total dues only up to
          the current month:
        </p>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>• Current month = April → shows dues for April only</li>
          <li>• Current month = June → shows dues for April + May + June</li>
          <li>
            • Includes tuition fees + transport fees + other charges − discounts
          </li>
        </ul>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">Receipt Templates</h3>
        <DocTable
          headers={["Template", "Size", "Use Case"]}
          rows={[
            ["Standard", "A4", "Default. Full details, school header, QR code"],
            ["Compact", "Half A4", "Save paper — two receipts per sheet"],
            ["Detailed", "A4", "Full ledger view with payment history"],
            [
              "Bharati Format",
              "105mm × 145mm",
              "Traditional 4-size receipt format popular in Indian schools",
            ],
          ]}
        />
        <p className="text-xs text-muted-foreground">
          For Bharati Format, set printer paper size to A6 (148×105mm) with
          margins set to None. Zero-amount line items are automatically skipped
          on all templates.
        </p>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">
          Family Members in Collect Fees
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If two or more students share the same guardian mobile number, they
          are considered family members. When collecting fees for one student,
          the Family Members panel on the right shows all siblings. Click any
          sibling to instantly switch to their fee collection — no need to
          re-search.
        </p>
      </Card>
    </div>
  );
}

// ─── Attendance Guide ────────────────────────────────────────
function AttendanceGuide() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground mb-1">
          Attendance — Complete Guide
        </h2>
        <p className="text-sm text-muted-foreground">
          Manual, RFID, QR scanner, biometric, and Welcome Display — all
          attendance methods explained.
        </p>
      </div>

      <Accordion title="📋 Manual Attendance" defaultOpen>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li>• Go to Attendance → Manual Entry</li>
          <li>• Select class and section from the dropdowns</li>
          <li>
            • Grid shows all students with P (Present) / A (Absent) toggles
          </li>
          <li>
            • Save to record. Attendance summary updates on the dashboard.
          </li>
          <li>
            • View/edit past attendance by selecting a date from the calendar.
          </li>
        </ul>
      </Accordion>

      <Accordion title="📱 QR Scanner Attendance">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Scan student Admit Cards to mark attendance. Works in two modes:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium text-foreground mb-1">Camera Mode</p>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>• Works on mobile browser with HTTPS</li>
                <li>• Tap "Use Camera" tab in QR Scanner</li>
                <li>• Allow camera permission when prompted</li>
                <li>• Point camera at student's Admit Card QR code</li>
                <li>• Student is marked present automatically</li>
              </ul>
            </div>
            <div className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium text-foreground mb-1">
                Scanner Device Mode
              </p>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>• Plug in USB or Bluetooth barcode scanner</li>
                <li>• Switch to "Scanner Device" tab</li>
                <li>• Scanner types Admission No. into input field</li>
                <li>• Auto-captures on Enter key (keyboard emulation)</li>
                <li>• Works without camera permission</li>
              </ul>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Manual fallback: type Admission No. and press Enter if scanner
            fails. Today's scan log is shown below the scanner. Export as CSV.
          </p>
        </div>
      </Accordion>

      <Accordion title="📺 Welcome Display (Lobby TV Screen)">
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Go to Attendance → Welcome Display tab. Open this tab on a TV or
            large monitor at the school entrance for a professional entry
            display.
          </p>
          <div className="rounded-lg bg-muted/40 p-3 space-y-2 text-xs">
            <p className="font-medium text-foreground text-sm">
              Idle State (no scan):
            </p>
            <ul className="space-y-1">
              <li>• Live digital clock (large format)</li>
              <li>• Current date, day, and school name</li>
              <li>• Pulsing "SCAN YOUR CARD TO CHECK IN" prompt</li>
            </ul>
          </div>
          <div className="rounded-lg bg-muted/40 p-3 space-y-2 text-xs">
            <p className="font-medium text-foreground text-sm">
              On Scan (6-second animation):
            </p>
            <ul className="space-y-1">
              <li>• Large photo / avatar of student or staff</li>
              <li>• Big name display</li>
              <li>• Father's name (students) or Designation (staff)</li>
              <li>• Class and section</li>
              <li>• Exact entry time</li>
              <li>• "WELCOME TO SCHOOL!" banner</li>
              <li>• Last 5 check-ins shown in ticker strip at the bottom</li>
            </ul>
          </div>
          <Alert type="info">
            ℹ️ Keep the Welcome Display tab open on the lobby computer/TV. In
            another tab/device, trigger scans from the RFID/Biometric or QR
            Scanner tab — the display updates in real time.
          </Alert>
        </div>
      </Accordion>

      <Accordion title="🖐 ESSL / ZKTeco Biometric Devices">
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            IP-based biometric attendance integration. Full setup guide in the
            ESSL Biometric section.
          </p>
          <p>Quick setup:</p>
          <ol className="space-y-1 list-decimal list-inside">
            <li>
              Set a static IP on the biometric device (e.g. 192.168.1.201)
            </li>
            <li>
              Attendance → Biometric Devices → Add Device (name, IP, port 4370)
            </li>
            <li>Test Connection → Sync Attendance</li>
            <li>
              Map device User IDs to students/staff in Biometric ID Mapping
            </li>
          </ol>
        </div>
      </Accordion>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">Attendance Summary</h3>
        <p className="text-sm text-muted-foreground">
          The RFID/Biometric tab shows a live summary. The Dashboard shows
          present/total counts for today. Click the dashboard card to see
          class/section-wise and route-wise breakdown.
        </p>
      </Card>
    </div>
  );
}

// ─── WhatsApp Setup ──────────────────────────────────────────
function WhatsAppSetup() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground mb-1">
          WhatsApp Setup
        </h2>
        <p className="text-sm text-muted-foreground">
          Real WhatsApp messaging via wacoder.in — send fee receipts, absent
          alerts, dues reminders, and more to parents automatically.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">
          Step 1 — Get API Keys from wacoder.in
        </h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>
            1. Visit <strong className="text-foreground">wacoder.in</strong> and
            create an account.
          </li>
          <li>
            2. Connect your WhatsApp number by scanning the QR code in the
            dashboard.
          </li>
          <li>
            3. Go to{" "}
            <strong className="text-foreground">API Credentials</strong> — copy
            your <code className="text-xs bg-muted px-1 rounded">app_key</code>{" "}
            and <code className="text-xs bg-muted px-1 rounded">auth_key</code>.
          </li>
        </ol>
        <Alert type="info">
          ℹ️ Keep your keys private — they authenticate all messages from your
          school account.
        </Alert>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">
          Step 2 — Enter Keys in ERP
        </h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>
            1. Go to{" "}
            <strong className="text-foreground">Settings → WhatsApp API</strong>{" "}
            (Super Admin only).
          </li>
          <li>
            2. Paste your{" "}
            <code className="text-xs bg-muted px-1 rounded">app_key</code> and{" "}
            <code className="text-xs bg-muted px-1 rounded">auth_key</code>.
          </li>
          <li>
            3. Toggle{" "}
            <strong className="text-foreground">Enable WhatsApp</strong> to ON.
          </li>
          <li>
            4. Enter a test mobile number and click{" "}
            <strong className="text-foreground">Send Test Message</strong>.
          </li>
          <li>5. A green success message confirms the connection is live.</li>
        </ol>
        <p className="text-sm text-muted-foreground font-medium">
          API format (for reference):
        </p>
        <Code>{`curl --request POST 'https://wacoder.in/api/whatsapp-web/send-message' \\
  --form 'app_key="8d786da0-d381-4604-80e6-7b5f449ed801"' \\
  --form 'auth_key="XFnyEeW9v8xBCLVHEbVLUxPjvuT7wFfzfu27X5qz2scMuAoXom"' \\
  --form 'to="91XXXXXXXXXX"' \\
  --form 'type="text"' \\
  --form 'message="Fee receipt generated — Amount: ₹2500"'`}</Code>
        <Alert type="warn">
          ⚠️ CORS errors only appear in preview/localhost mode. Deploy to your
          cPanel domain for real sends.
        </Alert>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">
          Step 3 — Enable Auto-Send Scheduler
        </h3>
        <p className="text-sm text-muted-foreground">
          Go to{" "}
          <strong className="text-foreground">
            Communication → Auto-Send Scheduler
          </strong>{" "}
          (or Settings → Notification Scheduler) and enable events:
        </p>
        <DocTable
          headers={["Event", "Recipient", "Trigger"]}
          rows={[
            [
              "Absent Alert",
              "Parent (guardian mobile)",
              "When student marked absent",
            ],
            ["Fee Due Reminder", "Parent", "X days before 15th of month"],
            ["Fee Receipt", "Parent", "After saving a fee collection"],
            ["Birthday Wish", "Student / Parent", "On student's date of birth"],
            ["Exam Timetable", "Parent / Student", "When timetable published"],
            ["Result Published", "Parent / Student", "When exam results saved"],
            ["Homework Deadline", "Student", "Day before assignment due date"],
          ]}
        />
        <Alert type="warn">
          ⚠️ The guardian mobile number must be filled in the student profile for
          auto-messages to work.
        </Alert>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">
          WhatsApp Auto-Reply Bot (Admission No. Lookup)
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Enable in{" "}
          <strong className="text-foreground">Settings → WhatsApp Bot</strong>.
          When a parent sends their child's Admission No. to the school WhatsApp
          number, the bot automatically replies with:
        </p>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>• Student name, class, section</li>
          <li>• Attendance summary for the current month</li>
          <li>• Pending fees amount and last payment date</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          PHP proxy script for cPanel (upload to{" "}
          <code className="text-xs bg-muted px-1 rounded">
            public_html/api/whatsapp-proxy.php
          </code>
          ):
        </p>
        <Code>{`<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
$ch = curl_init('https://wacoder.in/api/whatsapp-web/send-message');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $_POST);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
echo curl_exec($ch);
curl_close($ch);
?>`}</Code>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-foreground mb-3">
          Troubleshooting WhatsApp
        </h3>
        <DocTable
          headers={["Problem", "Solution"]}
          rows={[
            [
              "CORS error in test",
              "Normal in preview — deploy to real cPanel domain",
            ],
            [
              '"Unauthorized" error',
              "Check app_key and auth_key are correct in Settings → WhatsApp API",
            ],
            [
              "Messages not received",
              "Verify guardian mobile in student profile uses country code (e.g. 91XXXXXXXXXX)",
            ],
            [
              "Test works but auto-send doesn't",
              "Check event is toggled ON in Auto-Send Scheduler",
            ],
            [
              "WhatsApp session disconnected",
              "Re-scan QR code in wacoder.in dashboard",
            ],
          ]}
        />
      </Card>
    </div>
  );
}

// ─── ESSL Biometric ──────────────────────────────────────────
function EsslBiometric() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground mb-1">
          ESSL / ZKTeco Biometric Integration
        </h2>
        <p className="text-sm text-muted-foreground">
          Connect IP-based biometric attendance devices (ESSL, ZKTeco, Realand,
          etc.) to sync punch data automatically.
        </p>
      </div>

      <Alert type="warn">
        ⚠️ <strong>Requirement:</strong> The biometric device and the
        computer/server running SHUBH SCHOOL ERP must be on the same local
        network (LAN/WiFi). For cPanel hosted ERP, a PHP proxy script is
        required.
      </Alert>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">
          Step 1 — Configure Device Network Settings
        </h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>
            1. On device: Menu → Communication → Ethernet (or Comm → Network)
          </li>
          <li>
            2. Assign static IP (e.g.{" "}
            <code className="text-xs bg-muted px-1 rounded">192.168.1.201</code>
            ) in your LAN subnet
          </li>
          <li>
            3. Set Port:{" "}
            <code className="text-xs bg-muted px-1 rounded">4370</code> (default
            ZKTeco port)
          </li>
          <li>4. Save and restart the device</li>
          <li>
            5. Verify:{" "}
            <code className="text-xs bg-muted px-1 rounded">
              ping 192.168.1.201
            </code>{" "}
            from your PC
          </li>
        </ol>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">
          Step 2 — Add Device in ERP
        </h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>
            1. Go to{" "}
            <strong className="text-foreground">
              Attendance → Biometric Devices
            </strong>{" "}
            tab
          </li>
          <li>
            2. Click <strong className="text-foreground">Add Device</strong>
          </li>
        </ol>
        <DocTable
          headers={["Field", "Example", "Notes"]}
          rows={[
            ["Device Name", "Main Gate", "Any label for identification"],
            ["Device IP", "192.168.1.201", "Static IP set in Step 1"],
            ["Port", "4370", "Default ZKTeco port"],
            ["Device ID", "1", "From device hardware settings"],
          ]}
        />
        <ol className="space-y-2 text-sm text-muted-foreground" start={3}>
          <li>
            3. Click{" "}
            <strong className="text-foreground">Test Connection</strong> — green
            confirms reachability
          </li>
          <li>
            4. Click{" "}
            <strong className="text-foreground">Sync Attendance</strong> to pull
            punch records
          </li>
        </ol>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">
          Step 3 — Map Biometric IDs to Students/Staff
        </h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>
            1. Go to{" "}
            <strong className="text-foreground">
              Attendance → Biometric ID Mapping
            </strong>
          </li>
          <li>
            2. For each person, enter the device User ID (Menu → User Management
            → View All on device)
          </li>
          <li>3. Select matching Student or Staff record from ERP dropdown</li>
          <li>
            4. Save. Next sync matches punch records to the correct person.
          </li>
        </ol>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">
          PHP Proxy Script for cPanel Hosting
        </h3>
        <p className="text-sm text-muted-foreground">
          Upload to{" "}
          <code className="text-xs bg-muted px-1 rounded">
            public_html/api/biometric-proxy.php
          </code>
          :
        </p>
        <Code>{`<?php
// SHUBH SCHOOL ERP — Biometric Proxy for cPanel
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

$ip   = $_GET['ip']   ?? '';
$port = (int)($_GET['port'] ?? 4370);

if (!$ip) { echo json_encode(['error' => 'IP required']); exit; }

$sock = @fsockopen($ip, $port, $errno, $errstr, 5);
if (!$sock) {
    echo json_encode(['error' => "Cannot connect: $errstr ($errno)"]);
    exit;
}
$cmd = pack('H*', '5050827d08000000000000000000000000000000');
fwrite($sock, $cmd);
$data = fread($sock, 65536);
fclose($sock);
echo json_encode(['data' => base64_encode($data), 'bytes' => strlen($data)]);`}</Code>
        <p className="text-sm text-muted-foreground">
          After uploading, set{" "}
          <strong className="text-foreground">Proxy URL</strong> in Attendance →
          Biometric Settings to{" "}
          <code className="text-xs bg-muted px-1 rounded">
            https://yourdomain.com/api/biometric-proxy.php
          </code>
          .
        </p>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-foreground mb-3">Troubleshooting</h3>
        <DocTable
          headers={["Problem", "Solution"]}
          rows={[
            [
              "Test Connection fails",
              "Check device IP/port. Ping device. Verify same LAN subnet.",
            ],
            [
              "Connection timeout",
              "Disable Windows Firewall temporarily. Add port 4370 exception.",
            ],
            [
              "Wrong person matched",
              "Re-check Biometric ID Mapping — Device User ID must exactly match",
            ],
            [
              "No data after sync",
              "Check device attendance log via Menu → Attendance Records",
            ],
            [
              "Works on LAN, not on cPanel",
              "Install and configure the PHP proxy script above",
            ],
          ]}
        />
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-foreground mb-3">
          Supported Device Models
        </h3>
        <DocTable
          headers={["Brand", "Compatible Models"]}
          rows={[
            ["ESSL", "iFace 700, iFace302, iClock 580, T9"],
            ["ZKTeco", "ZK4500, F18, F22, MB360, SpeedFace"],
            ["Realand", "A-C021, A-C091"],
            ["Other", "Any device supporting ZKLib TCP SDK on port 4370"],
          ]}
        />
      </Card>
    </div>
  );
}

// ─── Backup & Restore ────────────────────────────────────────
function BackupRestore() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground mb-1">
          Backup & Restore
        </h2>
        <p className="text-sm text-muted-foreground">
          All ERP data is stored in browser localStorage. Regular backups
          protect against data loss from browser clears, device changes, or
          accidental resets.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">
          How to Create a Backup
        </h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>
            1. Go to{" "}
            <strong className="text-foreground">Settings → Data</strong> tab
          </li>
          <li>
            2. Click{" "}
            <strong className="text-foreground">Export JSON Backup</strong>
          </li>
          <li>
            3. A file named{" "}
            <code className="text-xs bg-muted px-1 rounded">
              shubh-erp-backup-YYYY-MM-DD.json
            </code>{" "}
            downloads automatically
          </li>
          <li>4. Save to Google Drive, USB drive, or email it to yourself</li>
        </ol>
        <Alert type="info">
          ℹ️ Backup includes ALL data: students, staff, fees, receipts, sessions,
          attendance, transport, inventory, expenses, settings, and WhatsApp
          configuration.
        </Alert>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">
          How to Restore from Backup
        </h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>
            1. Go to{" "}
            <strong className="text-foreground">Settings → Data</strong> tab
          </li>
          <li>
            2. Click{" "}
            <strong className="text-foreground">Import JSON Backup</strong>
          </li>
          <li>
            3. Select the backup{" "}
            <code className="text-xs bg-muted px-1 rounded">.json</code> file
            from your computer
          </li>
          <li>
            4. All data is restored immediately. Page reloads automatically.
          </li>
        </ol>
        <Alert type="warn">
          ⚠️ Importing a backup REPLACES all current data. Export a fresh backup
          first if you have new entries after the backup date.
        </Alert>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">
          Transfer Data to Another Computer
        </h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>1. On old computer: Settings → Data → Export JSON Backup</li>
          <li>
            2. On new computer: open ERP URL → Settings → Data → Import JSON
            Backup
          </li>
          <li>3. Select backup file — all data transfers instantly</li>
        </ol>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">
          Recommended Backup Schedule
        </h3>
        <DocTable
          headers={["Frequency", "When", "Reason"]}
          rows={[
            ["Daily", "End of school day", "Protects against data entry loss"],
            [
              "Before Promote Students",
              "Year-end",
              "Session promotion is irreversible without backup",
            ],
            [
              "Before Factory Reset",
              "Any time",
              "Reset clears ALL data permanently",
            ],
            ["Weekly minimum", "Every Friday", "Safe fallback"],
            [
              "Before browser update",
              "When Chrome prompts",
              "Browser updates can clear storage",
            ],
          ]}
        />
      </Card>

      <Card className="p-5 space-y-3 border-destructive/30">
        <h3 className="font-semibold text-destructive">Factory Reset</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Settings → Data → <strong>Factory Reset</strong>. Clears{" "}
          <strong>ALL</strong> school data — students, fees, sessions,
          attendance, and settings. 3-step confirmation required. Use only to
          completely start fresh.
        </p>
        <Alert type="danger">
          🚨 Factory Reset is permanent and irreversible. Super Admin login
          (superadmin / admin123) is the only credential that remains.
        </Alert>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">
          Data Storage Keys Reference
        </h3>
        <Code>{`shubh_erp_students          — All student records
shubh_erp_staff             — All staff records
shubh_erp_fee_receipts      — All fee payment receipts
shubh_erp_fee_plan          — Fee structure per class/section
shubh_erp_fee_headings      — Fee heading definitions
shubh_erp_sessions          — Session archive
shubh_erp_attendance        — Daily attendance records
shubh_erp_transport         — Routes, buses, pickup points
shubh_erp_inventory         — Stock, purchases, sales
shubh_erp_expenses          — Income & expense ledger
shubh_erp_school_profile    — School name, logo, address
shubh_erp_user_passwords    — Hashed user credentials
shubh_erp_settings          — App preferences, WhatsApp keys`}</Code>
      </Card>
    </div>
  );
}

// ─── cPanel Deploy ───────────────────────────────────────────
function CpanelDeploy() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground mb-1">
          Deploy on cPanel Hosting
        </h2>
        <p className="text-sm text-muted-foreground">
          Host SHUBH SCHOOL ERP on any Indian shared hosting with cPanel. No
          Node.js server required on the host — it runs as a static web app.
        </p>
      </div>

      <Alert type="info">
        ℹ️ SHUBH SCHOOL ERP is a <strong>static React app</strong>. You only need
        basic shared hosting with cPanel — no Node.js, PHP, or database required
        on the server.
      </Alert>

      <Card className="p-5 space-y-5">
        <h3 className="font-semibold text-foreground">
          Step-by-Step Deployment
        </h3>
        <ol className="space-y-5">
          <Step num={1} title="Build the project locally">
            <p className="text-sm text-muted-foreground mb-2">
              Run these commands on your local computer (requires Node.js 18+
              and pnpm):
            </p>
            <Code>{`# In the project root folder
pnpm install

# Build the frontend
cd src/frontend
pnpm build

# Build output will be at: src/frontend/dist/`}</Code>
          </Step>

          <Step num={2} title="Locate the dist/ folder">
            <p className="text-sm text-muted-foreground">
              After build completes, find{" "}
              <code className="text-xs bg-muted px-1 rounded">
                src/frontend/dist/
              </code>
              . It contains:
            </p>
            <Code>{`dist/
├── index.html          ← main entry point
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...             ← fonts, icons, images
└── manifest.json       ← PWA manifest`}</Code>
          </Step>

          <Step num={3} title="Log in to your cPanel hosting">
            <p className="text-sm text-muted-foreground">
              Go to your hosting cPanel URL (usually{" "}
              <code className="text-xs bg-muted px-1 rounded">
                yourdomain.com/cpanel
              </code>{" "}
              or as in your hosting welcome email). Log in with your cPanel
              credentials.
            </p>
          </Step>

          <Step num={4} title="Open File Manager → public_html">
            <p className="text-sm text-muted-foreground">
              In cPanel, click <strong>File Manager</strong>. Navigate to the{" "}
              <code className="text-xs bg-muted px-1 rounded">
                public_html/
              </code>{" "}
              folder — your website root.
            </p>
          </Step>

          <Step num={5} title="Upload the dist folder contents">
            <p className="text-sm text-muted-foreground mb-2">
              Important: upload the <strong>contents</strong> of{" "}
              <code className="text-xs bg-muted px-1 rounded">dist/</code>, not
              the dist folder itself.
            </p>
            <ol className="space-y-1.5 text-sm text-muted-foreground">
              <li>• Compress the dist/ folder as a ZIP on your computer</li>
              <li>
                • In File Manager, click <strong>Upload</strong> → select the
                ZIP
              </li>
              <li>
                • After upload, right-click the ZIP → <strong>Extract</strong>
              </li>
              <li>
                • Verify: index.html, assets/, manifest.json are directly in
                public_html/
              </li>
              <li>• Delete the ZIP file after extraction</li>
            </ol>
          </Step>

          <Step num={6} title="Create .htaccess file (required for routing)">
            <p className="text-sm text-muted-foreground mb-2">
              Without this, page refreshes return a 404. In File Manager, click{" "}
              <strong>+ File</strong>, name it{" "}
              <code className="text-xs bg-muted px-1 rounded">.htaccess</code>{" "}
              (with dot), and paste:
            </p>
            <Code>{`Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]`}</Code>
          </Step>

          <Step
            num={7}
            title="Enable SSL (HTTPS) — required for camera and PWA"
          >
            <p className="text-sm text-muted-foreground">
              In cPanel, go to <strong>SSL/TLS</strong> →{" "}
              <strong>Free SSL Certificate (Let's Encrypt)</strong> → click{" "}
              <strong>Issue</strong>. HTTPS is mandatory for QR camera scanner
              and PWA install.
            </p>
          </Step>

          <Step num={8} title="Point custom domain (if applicable)">
            <Code>{`Type: A Record
Name: @ (root) or erp (subdomain)
Value: [Your server IP from cPanel → General Info]
TTL: 3600`}</Code>
          </Step>

          <Step num={9} title="Verify everything works">
            <ol className="space-y-1.5 text-sm text-muted-foreground">
              <li>
                ✓ Open{" "}
                <code className="text-xs bg-muted px-1 rounded">
                  https://yourdomain.com
                </code>{" "}
                — login screen should appear
              </li>
              <li>
                ✓ Login with <strong>superadmin / admin123</strong>
              </li>
              <li>
                ✓ Go to Settings → School Profile — enter your school details
              </li>
              <li>
                ✓ Open on phone in Chrome → look for "Add to Home Screen" prompt
              </li>
              <li>✓ Attendance → QR Scanner → allow camera permission</li>
            </ol>
          </Step>
        </ol>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">Troubleshooting</h3>
        <DocTable
          headers={["Problem", "Cause", "Solution"]}
          rows={[
            [
              "Blank white page",
              "Missing files",
              "Open F12 console. Rebuild with pnpm build. Verify all dist/ files uploaded",
            ],
            [
              "404 on page refresh",
              "Missing .htaccess",
              "Create .htaccess with RewriteRule above. Check mod_rewrite enabled",
            ],
            [
              "CSS not loading",
              "Wrong asset paths",
              "Rebuild — Vite uses relative paths. Verify assets/ folder alongside index.html",
            ],
            [
              "Can't install PWA",
              "No HTTPS / wrong browser",
              "Enable SSL. Use Chrome on Android. iOS requires Safari",
            ],
            [
              "QR scanner blocked",
              "Camera denied",
              "Chrome Settings → Site Settings → Camera → Allow for your domain",
            ],
            [
              "WhatsApp CORS error",
              "Localhost restriction",
              "Deploy to real domain — CORS only occurs in preview/localhost",
            ],
          ]}
        />
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-foreground mb-3">
          Recommended Indian Hosting Providers
        </h3>
        <DocTable
          headers={["Provider", "cPanel", "Price/mo", "SSL", "Notes"]}
          rows={[
            [
              "Hostinger India",
              "✅",
              "₹69",
              "✅ Free",
              "Best value, fast NVMe SSD, recommended",
            ],
            [
              "MilesWeb",
              "✅",
              "₹49",
              "✅ Free",
              "Cheapest option, good for small schools",
            ],
            [
              "ResellerClub",
              "✅",
              "₹79",
              "✅ Free",
              "Good Indian support, reliable uptime",
            ],
            [
              "BigRock",
              "✅",
              "₹89",
              "✅ Free",
              "ICANN accredited, popular in India",
            ],
            [
              "HostGator India",
              "✅",
              "₹99",
              "✅ Free",
              "24/7 support, very popular",
            ],
            [
              "Bluehost India",
              "✅",
              "₹199",
              "✅ Free",
              "Good for larger schools",
            ],
          ]}
        />
        <p className="text-xs text-muted-foreground mt-3">
          * Prices approximate as of 2025. Node.js is NOT required for
          deployment — only for building locally.
        </p>
      </Card>
    </div>
  );
}

// ─── PWA Install ─────────────────────────────────────────────
function PwaInstall() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground mb-1">
          PWA Installation
        </h2>
        <p className="text-sm text-muted-foreground">
          Install SHUBH SCHOOL ERP on any phone like a native app — no App Store
          needed.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <h3 className="font-semibold text-foreground">Android (Chrome)</h3>
          </div>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li>
              1. Open the app URL in <strong>Chrome</strong> on Android
            </li>
            <li>2. Wait for the "Install" banner at the bottom</li>
            <li>3. Tap "Install" — or tap ⋮ menu → "Add to Home Screen"</li>
            <li>4. App icon appears on home screen</li>
            <li>5. Opens full-screen, no browser bar</li>
          </ol>
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
            Requires HTTPS. Works on Chrome 70+ and Samsung Internet.
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍎</span>
            <h3 className="font-semibold text-foreground">iOS (Safari)</h3>
          </div>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li>
              1. Open the app URL in <strong>Safari</strong> on iPhone/iPad
            </li>
            <li>2. Tap the Share button (□↑) at the bottom</li>
            <li>3. Scroll down and tap "Add to Home Screen"</li>
            <li>4. Edit the name if desired → tap "Add"</li>
            <li>5. App icon appears on home screen</li>
          </ol>
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
            Must use Safari — Chrome on iOS does not support PWA install.
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold text-foreground mb-3">
          PWA vs Native APK Comparison
        </h3>
        <DocTable
          headers={["Feature", "PWA (this app)", "Native APK"]}
          rows={[
            ["Installation", "Instant via browser", "Download from Play Store"],
            ["Updates", "Automatic on reload", "Manual update required"],
            ["Offline support", "Yes (service worker cache)", "Yes (bundled)"],
            ["Camera / QR scan", "Yes (HTTPS required)", "Yes"],
            ["Home screen icon", "Yes", "Yes"],
            ["Play Store listing", "No", "Yes"],
            [
              "Cost to publish",
              "Free — just your domain",
              "₹2,000/year (Google Play)",
            ],
            ["Development time", "Already done ✓", "Weeks with a developer"],
            ["Works on desktop too", "Yes", "No"],
          ]}
        />
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">
          Mobile Bottom Navigation
        </h3>
        <p className="text-sm text-muted-foreground">
          On mobile screens, the ERP shows a bottom navigation bar with quick
          links: Dashboard, Students, Fees, Attendance, and Menu (opens full
          sidebar drawer). This provides a native app-like experience for daily
          tasks.
        </p>
      </Card>
    </div>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────
function FaqSection() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground mb-1">
          Frequently Asked Questions
        </h2>
        <p className="text-sm text-muted-foreground">
          Common issues and their solutions.
        </p>
      </div>
      {FAQS.map((faq) => (
        <Accordion key={faq.q} title={faq.q} icon={<HelpCircle />}>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {faq.a}
          </p>
        </Accordion>
      ))}
    </div>
  );
}

// ─── Roles & Permissions ─────────────────────────────────────
function RolesSection() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground mb-1">
          Roles & Permissions
        </h2>
        <p className="text-sm text-muted-foreground">
          Access matrix for all 9 roles in SHUBH SCHOOL ERP.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">Role Overview</h3>
        <DocTable headers={["Role", "Access Level"]} rows={ROLES} />
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">
          Login Credentials by Role
        </h3>
        <DocTable
          headers={["Role", "Username", "Password"]}
          rows={[
            ["Super Admin", "superadmin", "admin123 (change on first login)"],
            ["Admin", "admin", "admin123 (change on first login)"],
            ["Teacher", "Mobile No.", "DOB in ddmmyyyy format"],
            ["Student", "Admission No.", "DOB in ddmmyyyy format"],
            ["Parent", "Guardian Mobile No.", "Same mobile number"],
            [
              "Driver",
              "driver (or Mobile No.)",
              "driver123 (or DOB if added via HR)",
            ],
            [
              "Receptionist / Accountant / Librarian",
              "Mobile No.",
              "Set by Super Admin",
            ],
          ]}
        />
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">Fee Receipt Rights</h3>
        <DocTable
          headers={["Role", "View", "Edit", "Delete", "Reprint"]}
          rows={[
            ["Super Admin", "✅", "✅", "✅", "✅"],
            ["Admin", "✅", "✅", "❌", "✅"],
            ["Accountant", "✅", "✅", "❌", "✅"],
            ["Receptionist", "✅", "❌", "❌", "✅"],
            ["Teacher", "❌", "❌", "❌", "❌"],
            ["Parent", "Own children only", "❌", "❌", "❌"],
            ["Student", "Own only", "❌", "❌", "❌"],
          ]}
        />
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">
          Adding New Staff Users
        </h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>
            1. Go to{" "}
            <strong className="text-foreground">
              Settings → User Management
            </strong>{" "}
            (Super Admin only)
          </li>
          <li>
            2. Click <strong className="text-foreground">Add Staff User</strong>
          </li>
          <li>
            3. Enter full name, position, mobile number (becomes username), and
            password
          </li>
          <li>
            4. User can log in immediately and change their own password after
            login
          </li>
        </ol>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">Password Reset</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            • Users change their own password: top-right user menu → Change
            Password
          </li>
          <li>
            • Super Admin resets any user: Settings → User Management → Reset
            Password button next to the user
          </li>
          <li>
            • If Super Admin is locked out: open browser DevTools (F12) →
            Application → Local Storage → edit{" "}
            <code className="text-xs bg-muted px-1 rounded">
              shubh_erp_user_passwords
            </code>
          </li>
        </ul>
      </Card>
    </div>
  );
}

// ─── Build Commands ──────────────────────────────────────────
function BuildCommands() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground mb-1">
          Build Commands
        </h2>
        <p className="text-sm text-muted-foreground">
          For developers setting up, building, or modifying the project locally.
        </p>
      </div>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">Prerequisites</h3>
        <Code>{`node --version    # v18+ required
pnpm --version    # v8+ recommended

# Install pnpm if not present:
npm install -g pnpm`}</Code>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">
          Setup & Local Development
        </h3>
        <Code>{`# Clone from GitHub
git clone https://github.com/shubhampatel345/school-erp-india
cd school-erp-india

# Install all dependencies
pnpm install

# Start frontend dev server
cd src/frontend
pnpm dev
# Opens at http://localhost:5173`}</Code>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">Type Check & Lint</h3>
        <Code>{`cd src/frontend

# TypeScript type check (no errors = ready to build)
pnpm typecheck

# Lint + auto-fix (ESLint + Prettier)
pnpm fix`}</Code>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">Production Build</h3>
        <Code>{`cd src/frontend
pnpm build

# Output: src/frontend/dist/
# Upload contents of dist/ to public_html/ on cPanel`}</Code>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">
          Project Folder Structure
        </h3>
        <Code>{`src/frontend/src/
├── components/          # Shared UI (Layout.tsx, Sidebar.tsx, shadcn/ui)
├── context/
│   └── AppContext.tsx   # Auth, sessions, notifications, global state
├── hooks/
│   └── useQueries.ts    # React Query data hooks
├── pages/               # One file per module
│   ├── settings/        # Settings sub-tabs
│   ├── fees/            # Fees sub-tabs (Collect, Plan, Headings...)
│   ├── hr/              # HR sub-tabs (Staff, Payroll, Leave)
│   └── academics/       # Academics sub-tabs
├── types/
│   └── index.ts         # All TypeScript interfaces
└── utils/
    ├── localStorage.ts  # ls() helper, MONTHS, CLASSES, generateId
    └── whatsapp.ts      # wacoder.in API integration

docs/                    # Markdown documentation (this content)
public/
├── manifest.json        # PWA manifest
├── sw.js                # Service worker (offline cache)
└── assets/
    ├── fonts/           # SpaceGrotesk, PlusJakartaSans, JetBrainsMono
    └── icons/           # App icons (192×192, 512×512)`}</Code>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">Tech Stack</h3>
        <DocTable
          headers={["Layer", "Technology"]}
          rows={[
            ["Frontend", "React 19 + TypeScript"],
            ["Styling", "Tailwind CSS + shadcn/ui"],
            ["State / Data", "localStorage (browser-side storage)"],
            ["Build tool", "Vite"],
            ["Icons", "Lucide React"],
            ["Animations", "motion/react"],
            ["Fonts", "Space Grotesk, Plus Jakarta Sans, JetBrains Mono"],
            ["WhatsApp", "wacoder.in REST API"],
          ]}
        />
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">Key Utilities</h3>
        <Code>{`// Read from localStorage
ls.get('students', [])

// Write to localStorage
ls.set('students', studentArray)

// Generate unique ID
generateId()

// Indian academic year months (April → March)
MONTHS = ['April', 'May', 'June', ..., 'March']

// All class names
CLASSES = ['Nursery', 'LKG', 'UKG', 'Class 1', ..., 'Class 12']

// Send WhatsApp message via wacoder.in
sendWhatsApp('919876543210', 'Fee receipt...')`}</Code>
      </Card>
    </div>
  );
}
