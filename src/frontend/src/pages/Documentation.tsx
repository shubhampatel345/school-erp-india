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
  HelpCircle,
  MessageSquare,
  Printer,
  RefreshCw,
  Rocket,
  Shield,
  Smartphone,
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
    name: "Students",
    icon: "🎒",
    desc: "Excel-style grid with rich filters (class, section, route, status). Double-click opens full profile with photo, Transport tab (auto-populated from Transport module), Fees tab, Discounts tab (per-month fixed amount), Old Fees tab, and Credentials tab. Print admission forms (3 templates), ID cards (customizable with uploaded background), and admit cards with QR code.",
  },
  {
    name: "Fees",
    icon: "💰",
    desc: "Collect Fees: student info panel, month-selector grid, old balance carry-forward (shown in red), Other Charges row, payment history with reprint/edit/delete. Fee Headings: define heading names with applicable months. Fee Plan: section-wise amounts editable by Super Admin. Fee Register: full ledger with drill-down drill-down, permission-based edit/delete. Dues Fees: wizard with month + class selection, print/export/reminder letter/WhatsApp. Accounts: account-wise received fees. Discounts per student per month.",
  },
  {
    name: "Attendance",
    icon: "📋",
    desc: "Mark daily attendance by class/section. RFID/Biometric tab integrates with ESSL/ZKTeco devices over IP. QR Scanner tab supports camera or USB/Bluetooth keyboard-mode scanners. Welcome Display tab shows full-screen animated welcome card on each scan — ideal for a lobby TV. Route-wise and class-wise present/absent summary.",
  },
  {
    name: "Examinations",
    icon: "📝",
    desc: "Timetable Maker wizard: enter exam name, dates, times, classes, subjects. System auto-generates per-class timetables. Drag subjects to reorder (dates are locked). Generate reshuffles; Save locks the arrangement. Excel-style combined view, printable/exportable as CSV.",
  },
  {
    name: "HR & Payroll",
    icon: "👥",
    desc: "Staff directory with photo, import/export CSV. Teacher subject-class wizard (multi-subject with class range, e.g. English Class 1–5, Art Class 6–8). Payroll module: net salary setup, attendance-based deduction calculation, payslip generation, payroll register.",
  },
  {
    name: "Academics",
    icon: "📚",
    desc: "Classes & Sections CRUD. Subjects with multi-class assignment wizard (one subject can be assigned to many classes simultaneously). Teacher Timetable Maker: wizard auto-loads teacher-subject-class assignments, conflict-safe scheduling, drag-and-drop, combined view and teacher-wise view. Syllabus chapter tracker.",
  },
  {
    name: "Transport",
    icon: "🚌",
    desc: "Routes and pickup points. Monthly fare is set per pickup point (not per route). Driver assignment per route. Student profiles auto-populate Bus No., Route, Pickup Point. Student transport month selection wizard (11 months auto-selected, June deselected by default). Route-wise attendance summary.",
  },
  {
    name: "Inventory",
    icon: "📦",
    desc: "Item master with category and sell price (for uniform items like dress, tie, belt). Purchase orders with supplier tracking. Sales with auto-deduction from stock. Stock report with print/export.",
  },
  {
    name: "Communication",
    icon: "💬",
    desc: "WhatsApp tab: real API integration via wacoder.in — compose, send to parent/student/teacher, view send log. RCS tab: simulated Google RCS messages with templates. Auto-Send Scheduler: 7 configurable events (Fee Due, Absent Alert, Birthday Wish, Exam Timetable, Result Published, General Notice, Homework Deadline) with timing, recipient group, and channel (WhatsApp/RCS/Both). Notification bell in header shows live ERP events.",
  },
  {
    name: "Template Studio",
    icon: "🏅",
    desc: "All school templates in one place: ID Card, Fees Receipt, Admission Form, Result/Marksheet, Admit Card, Bonafide Certificate, Transfer Certificate, Experience Certificate. Full drag-and-drop design editor: move any element, change font size/color/family, upload custom background image, set paper size (A4, A5, 105×145mm), and set default template for printing. Export/import designs to share between branches.",
  },
  {
    name: "Expenses",
    icon: "💸",
    desc: "Income & Expense ledgers with running balance. Expense Heads CRUD. Budget vs Actual comparison. Monthly bar chart.",
  },
  {
    name: "Homework",
    icon: "✏️",
    desc: "Assign homework by class/section/subject with due date. Overdue detection (highlighted in red). Submission tracker per student. Analytics charts.",
  },
  {
    name: "Alumni",
    icon: "🎓",
    desc: "Alumni directory (CRUD + search). Batch view (grouped cards by year). Events management.",
  },
  {
    name: "Reports",
    icon: "📊",
    desc: "8 report cards: Students, Finance, Attendance, Exams, HR, Transport, Inventory, Fees Due. Each pulls real data from ERP storage and displays charts + tables.",
  },
  {
    name: "Promote Students",
    icon: "⬆️",
    desc: "4-step wizard to bulk-advance all students to the next class and create a new session. Archives old session with infinite history. Month-wise unpaid dues carry forward as Old Balance in the new session. Class 10/12 graduates are auto-discontinued as 'Passed Out'.",
  },
];

// ─── Roles matrix ────────────────────────────────────────────
const ROLES = [
  [
    "Super Admin",
    "Full access to all modules, settings, user management, delete/edit receipts, session management, factory reset",
  ],
  [
    "Admin",
    "All modules except Super Admin settings. Can reset non-admin passwords. Cannot delete fee receipts",
  ],
  [
    "Accountant",
    "Full fees module, expense ledger, reports. Cannot access HR payroll or settings",
  ],
  [
    "Receptionist",
    "Student information (view/add), attendance, basic fees view. No delete rights",
  ],
  [
    "Teacher",
    "Mark attendance for own classes, homework, timetable view, student list for assigned classes",
  ],
  [
    "Parent",
    "View own children's fee receipts, attendance, timetable, notices, homework",
  ],
  [
    "Student",
    "View own attendance, fee receipts, timetable, homework assignments",
  ],
  ["Driver", "QR Attendance scanner, own route info and student list"],
  ["Librarian", "Student list (view only), basic attendance view"],
];

// ─── FAQs ────────────────────────────────────────────────────
const FAQS = [
  {
    q: "I forgot the Super Admin password. How do I reset it?",
    a: "Open browser DevTools (F12) → Application → Local Storage → find 'shubh_erp_user_passwords' → edit the 'superadmin' key value to 'admin123'. Or do a Factory Reset from Settings → Data → Factory Reset (this clears all data — export a backup first).",
  },
  {
    q: "A teacher or student cannot log in. What are their default credentials?",
    a: "Student: Username = Admission No., Password = Date of Birth in ddmmyyyy (e.g. 01042010). Teacher: Username = Mobile No., Password = DOB in ddmmyyyy. Parent: Username = Mobile No., Password = same Mobile No. Credentials are auto-created when you add a student or staff member.",
  },
  {
    q: "Receipts print with a blank page before or wrong position.",
    a: "In the print dialog, set Margins to 'None' and uncheck 'Headers and footers'. For Bharati Format (4-size / 105×145mm), set paper size to A6 (148×105mm) in the print dialog. The receipt starts at the top of the page.",
  },
  {
    q: "The QR scanner on mobile is not working.",
    a: "QR scanner requires camera permission AND HTTPS. Open the app in Chrome on Android or Safari on iOS. Go to QR Attendance, allow camera when prompted. If denied, go to Chrome Settings → Site Settings → Camera → find your domain → Allow.",
  },
  {
    q: "WhatsApp messages show 'CORS error'. Is this a bug?",
    a: "No. CORS errors only occur when testing from localhost or the Caffeine preview URL. Once you deploy to your own cPanel domain (e.g. school.com), the wacoder.in API calls will work correctly. The ERP will continue functioning even when the CORS error appears in preview.",
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
    a: "Ensure the device is on the same network (LAN) as the computer running the ERP. Check the device IP in its hardware settings, enter it in Attendance → RFID/Biometric → Device IP. If on cPanel hosting, you must run the PHP proxy script on your server so the device can push data to it.",
  },
  {
    q: "How do parents receive WhatsApp auto-replies for attendance?",
    a: "Go to Communication → Auto-Send Scheduler → enable 'Absent Alert'. Set channel to WhatsApp. The parent's mobile number (as entered in the student's father/guardian mobile field) will receive an automatic message each time their child is marked absent.",
  },
];

// ─── Section IDs ─────────────────────────────────────────────
type SectionId =
  | "getting-started"
  | "modules"
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
            User guides, deployment &amp; help for SHUBH SCHOOL ERP
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
            data-ocid="doc-print-btn"
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
        {[
          { id: "getting-started" as SectionId, label: "Getting Started" },
          { id: "cpanel" as SectionId, label: "Deploy" },
          { id: "whatsapp" as SectionId, label: "WhatsApp" },
          { id: "essl" as SectionId, label: "ESSL" },
          { id: "backup" as SectionId, label: "Backup" },
          { id: "faq" as SectionId, label: "FAQ" },
        ].map((item) => (
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
              data-ocid={`doc-nav-${s.id}`}
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

// ─── Setup checklist (extracted to avoid index-as-key) ───────
const SETUP_STEPS = [
  {
    title: "Configure School Profile",
    desc: "Settings → School Profile. Enter school name, address, mobile, email, and upload logo. This auto-fills all receipts, certificates, and ID cards.",
  },
  {
    title: "Set Up Classes & Sections",
    desc: "Academics → Classes & Sections. Add your class structure (e.g. Class 1A, 1B … 12C). No Class Teacher field — assign class teachers separately.",
  },
  {
    title: "Add Subjects",
    desc: "Academics → Subjects. Use the multi-class wizard to assign one subject to many classes at once (e.g. Hindi → Class 1 to Class 8).",
  },
  {
    title: "Add HR Staff & Teachers",
    desc: "HR → Staff Directory → Add Staff. For teachers, the subject-class range wizard opens in Step 2 — assign each subject with a class range.",
  },
  {
    title: "Define Fee Structure",
    desc: "Fees → Fee Headings: define heading names and which months they apply to. Fees → Fee Plan: set section-wise amounts (Super Admin only).",
  },
  {
    title: "Admit Students",
    desc: "Students → Add Student. Fill the admission form. Login credentials (Adm.No. / DOB) are auto-created. Transport details auto-populate from Transport module.",
  },
  {
    title: "Configure Transport (if applicable)",
    desc: "Transport → Routes → Add Route → Add Pickup Points → set monthly fare per pickup point. Assign students to routes in Students → student details → Transport tab.",
  },
  {
    title: "Start Collecting Fees",
    desc: "Fees → Collect Fees. Search a student by admission number, select months, enter amount, save and print receipt. Old balance carries forward automatically.",
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
              "Mobile No.",
              "Mobile No.",
              "Same as guardian mobile in student profile",
            ],
            [
              "Driver",
              "Mobile No.",
              "DOB (ddmmyyyy)",
              "Staff with Driver designation",
            ],
            [
              "Accountant / Receptionist",
              "Mobile No.",
              "Set by Super Admin",
              "Created in Settings → User Management",
            ],
          ]}
        />
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
          The current academic session (e.g. 2025-26) is shown in the header.
          Use the session dropdown to switch to archived sessions for read-only
          historical view. Super Admin can edit data in any session.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          At year-end, run{" "}
          <strong className="text-foreground">Promote Students</strong> from the
          sidebar to advance all students, create the next session, and carry
          forward unpaid month-wise dues as Old Balance. Sessions are archived
          infinitely — no data is ever deleted.
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
          Click each module to expand its usage guide.
        </p>
      </div>
      {MODULES.map((mod) => (
        <Accordion key={mod.name} title={`${mod.icon}  ${mod.name}`}>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {mod.desc}
          </p>
        </Accordion>
      ))}
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
            create a free or paid account.
          </li>
          <li>
            2. Connect your WhatsApp number (scan QR from the wacoder
            dashboard).
          </li>
          <li>
            3. Go to{" "}
            <strong className="text-foreground">API Credentials</strong> — note
            your <code className="text-xs bg-muted px-1 rounded">app_key</code>{" "}
            and <code className="text-xs bg-muted px-1 rounded">auth_key</code>.
          </li>
        </ol>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">
          Step 2 — Enter Keys in ERP
        </h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>
            1. In SHUBH SCHOOL ERP, go to{" "}
            <strong className="text-foreground">Settings → WhatsApp API</strong>
            .
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
            <strong className="text-foreground">Send Test Message</strong> to
            verify the connection.
          </li>
        </ol>
        <Alert type="info">
          ℹ️ Test messages may show a CORS error in preview mode. Deploy to your
          cPanel domain for real sends.
        </Alert>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">
          Step 3 — Enable Auto-Reply Bot
        </h3>
        <p className="text-sm text-muted-foreground">
          Go to{" "}
          <strong className="text-foreground">
            Communication → Auto-Send Scheduler
          </strong>{" "}
          and enable the events you want:
        </p>
        <DocTable
          headers={["Event", "Recipient", "Trigger"]}
          rows={[
            [
              "Absent Alert",
              "Parent (guardian mobile)",
              "When student marked absent in Attendance",
            ],
            [
              "Fee Due Reminder",
              "Parent",
              "X days before the 15th of the month",
            ],
            [
              "Fee Receipt",
              "Parent",
              "After saving a fee collection in Collect Fees",
            ],
            ["Birthday Wish", "Student / Parent", "On student's date of birth"],
            [
              "Exam Timetable",
              "Parent / Student",
              "When exam timetable is published",
            ],
            [
              "Result Published",
              "Parent / Student",
              "When exam results are saved",
            ],
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
          WhatsApp Parent Inquiry (Admission No. Auto-Reply)
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Parents can WhatsApp the school number with their child's Admission
          No. and receive an automated reply with attendance summary and pending
          fees. This requires setting up a webhook on your wacoder.in account
          pointing to the ERP's API endpoint.
        </p>
        <p className="text-sm text-muted-foreground">
          Webhook URL format:{" "}
          <code className="text-xs bg-muted px-1 rounded">
            https://yourdomain.com/api/whatsapp-webhook
          </code>
        </p>
        <Alert type="info">
          ℹ️ The webhook feature requires cPanel hosting — it does not work in
          browser-only mode since data is stored in localStorage on the client.
        </Alert>
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
        network (LAN/WiFi). The device communicates over IP — it cannot work
        over the public internet without a PHP proxy on your cPanel server.
      </Alert>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">
          Step 1 — Configure Device Network Settings
        </h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>
            1. On the ESSL/ZKTeco device, go to{" "}
            <strong className="text-foreground">
              Menu → Communication → Ethernet
            </strong>
            .
          </li>
          <li>
            2. Assign a static IP (e.g.{" "}
            <code className="text-xs bg-muted px-1 rounded">192.168.1.201</code>
            ) in the same subnet as your LAN.
          </li>
          <li>
            3. Note the <strong className="text-foreground">IP Address</strong>,{" "}
            <strong className="text-foreground">Port</strong> (default: 4370),
            and <strong className="text-foreground">Device ID</strong> (usually
            1).
          </li>
          <li>
            4. Ensure the device is set to push mode or pull mode — SHUBH ERP
            supports both via the ZKLIB protocol.
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
              Attendance → RFID / Biometric
            </strong>{" "}
            tab.
          </li>
          <li>
            2. Click <strong className="text-foreground">Add Device</strong> and
            enter:
          </li>
        </ol>
        <DocTable
          headers={["Field", "Example", "Notes"]}
          rows={[
            ["Device IP", "192.168.1.201", "Static IP assigned on device"],
            ["Port", "4370", "Default ZKTeco port"],
            ["Device ID", "1", "Check device hardware settings"],
            ["Device Name", "Main Gate", "Any label for identification"],
          ]}
        />
        <ol className="space-y-2 text-sm text-muted-foreground" start={3}>
          <li>
            3. Click{" "}
            <strong className="text-foreground">Test Connection</strong> — a
            green success message confirms the device is reachable.
          </li>
          <li>
            4. Click{" "}
            <strong className="text-foreground">Sync Attendance</strong> to pull
            punch data from the device into the ERP attendance log.
          </li>
        </ol>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">
          Step 3 — Map Biometric IDs to Students/Staff
        </h3>
        <p className="text-sm text-muted-foreground">
          Each enrolled fingerprint on the device has a User ID number. Map
          these IDs to ERP records:
        </p>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>
            1. Go to{" "}
            <strong className="text-foreground">
              Attendance → Biometric ID Mapping
            </strong>
            .
          </li>
          <li>
            2. For each student/staff, enter their device User ID (from device
            enrollment).
          </li>
          <li>
            3. Select the matching ERP student or staff record from the
            dropdown.
          </li>
          <li>
            4. Save. The next sync will now match punch records to the correct
            person.
          </li>
        </ol>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">
          PHP Proxy Script for cPanel Hosting
        </h3>
        <p className="text-sm text-muted-foreground">
          Browser JavaScript cannot directly connect to the biometric device
          (CORS restriction). On cPanel hosting, upload this PHP script to your
          server — it acts as a bridge between the device and the ERP.
        </p>
        <Code>{`<?php
// biometric-proxy.php — upload to public_html/api/
// Call from ERP: /api/biometric-proxy.php?ip=192.168.1.201&port=4370

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

$ip   = $_GET['ip']   ?? '';
$port = $_GET['port'] ?? '4370';

if (!$ip) { echo json_encode(['error' => 'IP required']); exit; }

// Connect to ZKTeco device via TCP
$sock = @fsockopen($ip, (int)$port, $errno, $errstr, 5);
if (!$sock) {
    echo json_encode(['error' => "Cannot connect: $errstr ($errno)"]);
    exit;
}
// Send ZKLib command to fetch attendance log
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
              "Check device IP, port 4370, and that both device and PC are on same LAN subnet",
            ],
            [
              "Connection times out",
              "Disable Windows Firewall temporarily and try again. Add port 4370 to firewall exceptions",
            ],
            [
              "Punch data syncs but wrong person",
              "Re-check Biometric ID Mapping — the device User ID must exactly match the ERP mapping",
            ],
            [
              "No data after sync",
              "Device may have no records. Check device attendance log directly via device menu",
            ],
            [
              "Works on LAN but not on cPanel",
              "Install and configure the PHP proxy script described above",
            ],
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
            <strong className="text-foreground">Settings → Data</strong> tab.
          </li>
          <li>
            2. Click{" "}
            <strong className="text-foreground">Export JSON Backup</strong>.
          </li>
          <li>
            3. A file named{" "}
            <code className="text-xs bg-muted px-1 rounded">
              shubh-erp-backup-YYYY-MM-DD.json
            </code>{" "}
            downloads automatically.
          </li>
          <li>
            4. Save this file to Google Drive, a USB drive, or email it to
            yourself.
          </li>
        </ol>
        <Alert type="info">
          ℹ️ The backup includes ALL data: students, staff, fees, receipts,
          sessions, attendance, transport, inventory, expenses, and settings.
        </Alert>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">
          How to Restore from Backup
        </h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>
            1. Go to{" "}
            <strong className="text-foreground">Settings → Data</strong> tab.
          </li>
          <li>
            2. Click{" "}
            <strong className="text-foreground">Import JSON Backup</strong>.
          </li>
          <li>
            3. Select the backup{" "}
            <code className="text-xs bg-muted px-1 rounded">.json</code> file
            from your computer.
          </li>
          <li>
            4. All data is restored immediately. The page will reload
            automatically.
          </li>
        </ol>
        <Alert type="warn">
          ⚠️ Importing a backup REPLACES all current data. If you have new data
          entered after the backup was made, it will be lost. Export a fresh
          backup first if needed.
        </Alert>
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
            [
              "Monthly",
              "1st of every month",
              "Minimum recommended for any school",
            ],
            [
              "Before browser update",
              "When prompted",
              "Browser updates sometimes clear storage",
            ],
          ]}
        />
      </Card>

      <Card className="p-5 space-y-3 border-destructive/30">
        <h3 className="font-semibold text-destructive">Factory Reset</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Settings → Data → <strong>Factory Reset</strong>. Clears{" "}
          <strong>ALL</strong> school data including students, fees, sessions,
          attendance, and settings. Use only to completely start fresh (e.g. new
          school setup). This action cannot be undone — always export a backup
          before resetting.
        </p>
        <Alert type="danger">
          🚨 Factory Reset is permanent. The ERP will return to its initial
          empty state. Super Admin login (superadmin / admin123) is the only
          credential that remains.
        </Alert>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">Data Storage Keys</h3>
        <p className="text-sm text-muted-foreground mb-2">
          All data is stored in browser localStorage with these key prefixes:
        </p>
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
          <Step num={1} title="Install dependencies and build the project">
            <p className="text-sm text-muted-foreground mb-2">
              Run these commands on your local computer (requires Node.js 18+
              and pnpm):
            </p>
            <Code>{`# In the project root folder
pnpm install

# Build the frontend
cd src/frontend
pnpm build

# The build output will be at:
# src/frontend/dist/`}</Code>
          </Step>

          <Step num={2} title="Locate the dist/ folder">
            <p className="text-sm text-muted-foreground">
              After the build completes, find the{" "}
              <code className="text-xs bg-muted px-1 rounded">dist/</code>{" "}
              folder inside{" "}
              <code className="text-xs bg-muted px-1 rounded">
                src/frontend/
              </code>
              . It will contain:
            </p>
            <Code>{`dist/
├── index.html          ← main HTML entry point
├── assets/
│   ├── index-[hash].js   ← bundled JavaScript
│   ├── index-[hash].css  ← bundled CSS
│   └── ...               ← fonts, icons, images
└── manifest.json        ← PWA manifest`}</Code>
          </Step>

          <Step num={3} title="Log in to your cPanel hosting">
            <p className="text-sm text-muted-foreground">
              Go to your hosting provider's cPanel URL (usually{" "}
              <code className="text-xs bg-muted px-1 rounded">
                yourdomain.com/cpanel
              </code>{" "}
              or as provided in your hosting welcome email). Log in with your
              cPanel username and password.
            </p>
          </Step>

          <Step num={4} title="Open File Manager → public_html">
            <p className="text-sm text-muted-foreground">
              In cPanel, click <strong>File Manager</strong>. Navigate to the{" "}
              <code className="text-xs bg-muted px-1 rounded">
                public_html/
              </code>{" "}
              folder (this is your website's root directory).
            </p>
          </Step>

          <Step num={5} title="Upload the dist folder contents">
            <p className="text-sm text-muted-foreground mb-2">
              Important: upload the <strong>contents</strong> of{" "}
              <code className="text-xs bg-muted px-1 rounded">dist/</code>, not
              the dist folder itself.
            </p>
            <ol className="space-y-1.5 text-sm text-muted-foreground">
              <li>
                • Compress the dist/ folder as a ZIP file on your computer
              </li>
              <li>
                • In File Manager, click <strong>Upload</strong> → select the
                ZIP file
              </li>
              <li>
                • After upload completes, right-click the ZIP →{" "}
                <strong>Extract</strong>
              </li>
              <li>
                • Ensure index.html, assets/, and manifest.json are directly
                inside public_html/
              </li>
              <li>• Delete the ZIP file after extraction</li>
            </ol>
          </Step>

          <Step
            num={6}
            title="Create the .htaccess file (required for routing)"
          >
            <p className="text-sm text-muted-foreground mb-2">
              Without this file, page refreshes will return a 404 error. In File
              Manager, click <strong>+ File</strong>, name it{" "}
              <code className="text-xs bg-muted px-1 rounded">.htaccess</code>{" "}
              (with the dot), and paste this content:
            </p>
            <Code>{`Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]`}</Code>
            <p className="text-xs text-muted-foreground mt-2">
              Note: Use{" "}
              <code className="text-xs bg-muted px-1 rounded">QSA,L</code> — not{" "}
              <code className="text-xs bg-muted px-1 rounded">QR,L</code>. The
              QSA flag passes query strings correctly.
            </p>
          </Step>

          <Step
            num={7}
            title="Enable SSL (HTTPS) — required for camera and PWA"
          >
            <p className="text-sm text-muted-foreground">
              In cPanel, go to <strong>SSL/TLS</strong> →{" "}
              <strong>Free SSL Certificate (Let's Encrypt)</strong> → click{" "}
              <strong>Issue</strong> for your domain. HTTPS is mandatory for the
              QR camera scanner and PWA install feature.
            </p>
          </Step>

          <Step num={8} title="Point your custom domain (if applicable)">
            <p className="text-sm text-muted-foreground">
              If you have a custom domain (e.g.{" "}
              <code className="text-xs bg-muted px-1 rounded">school.in</code>),
              go to your domain registrar's DNS settings and add:
            </p>
            <Code>{`Type: A Record
Name: @ (or your subdomain, e.g. erp)
Value: [Your server IP address from cPanel]
TTL: 3600 (1 hour)`}</Code>
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
                ✓ Go to Settings → School Profile and fill in your school
                details
              </li>
              <li>
                ✓ Open the app on your phone in Chrome → look for "Add to Home
                Screen" prompt
              </li>
              <li>✓ Go to Attendance → QR Scanner → allow camera permission</li>
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
              "Build error or missing files",
              "Open browser console (F12) — fix the error. Rebuild with pnpm build. Ensure all dist/ contents were uploaded",
            ],
            [
              "404 on page refresh",
              "Missing .htaccess",
              "Create .htaccess in public_html with the RewriteRule above. Check mod_rewrite is enabled in cPanel",
            ],
            [
              "CSS / styles not loading",
              "Wrong asset paths",
              "Rebuild the app — Vite uses relative paths. Verify assets/ folder is present alongside index.html",
            ],
            [
              "Slow first load",
              "Normal PWA behavior",
              "Service worker caches everything after first visit. Subsequent loads are instant",
            ],
            [
              "Can't install PWA",
              "Not HTTPS or not Chrome",
              "Ensure SSL is active. Use Chrome on Android. Check manifest.json is accessible",
            ],
            [
              "QR scanner permission blocked",
              "Camera not allowed",
              "Chrome Settings → Site Settings → Camera → find domain → set to Allow",
            ],
            [
              "WhatsApp CORS error",
              "Localhost restriction",
              "Deploy to your real domain — CORS only occurs in preview/localhost mode",
            ],
          ]}
        />
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-foreground mb-3">
          Recommended Indian Hosting Providers
        </h3>
        <DocTable
          headers={[
            "Provider",
            "cPanel",
            "Price/mo",
            "Node.js",
            "SSL",
            "Notes",
          ]}
          rows={[
            [
              "Hostinger India",
              "✅",
              "₹69",
              "✅",
              "✅ Free",
              "Best value, fast servers, recommended",
            ],
            [
              "MilesWeb",
              "✅",
              "₹49",
              "❌",
              "✅ Free",
              "Cheapest option, good for small schools",
            ],
            [
              "ResellerClub",
              "✅",
              "₹79",
              "❌",
              "✅ Free",
              "Good Indian support, reliable uptime",
            ],
            [
              "BigRock",
              "✅",
              "₹89",
              "❌",
              "✅ Free",
              "Popular in India, ICANN accredited",
            ],
            [
              "HostGator India",
              "✅",
              "₹99",
              "❌",
              "✅ Free",
              "Very popular, 24/7 support",
            ],
          ]}
        />
        <p className="text-xs text-muted-foreground mt-3">
          * Prices approximate as of 2025. All providers support PHP 8+, MySQL,
          and Let's Encrypt SSL. Node.js is NOT required for this app.
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

      <Card className="p-5">
        <DocTable headers={["Role", "Access Level"]} rows={ROLES} />
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
        <p className="text-sm text-muted-foreground">
          Super Admin can add Admin, Receptionist, Accountant, Librarian, and
          other staff users:
        </p>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>
            1. Go to{" "}
            <strong className="text-foreground">
              Settings → User Management
            </strong>
            .
          </li>
          <li>
            2. Click <strong className="text-foreground">Add Staff User</strong>
            .
          </li>
          <li>
            3. Enter full name, position, mobile number (becomes username), and
            password.
          </li>
          <li>
            4. The user can log in immediately and change their own password
            after login.
          </li>
        </ol>
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
          For developers setting up or building the project locally.
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
# Upload contents of dist/ to public_html/ on cPanel hosting`}</Code>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">
          Project Folder Structure
        </h3>
        <Code>{`src/frontend/src/
├── components/          # Shared UI components (Layout, shadcn/ui wrappers)
├── context/             # AppContext: auth, sessions, notifications
├── pages/               # One file per module (Students, Fees, Attendance...)
│   ├── settings/        # Settings sub-tabs
│   ├── fees/            # Fees sub-tabs
│   └── hr/              # HR sub-tabs
├── types/               # TypeScript interfaces (Student, Staff, Receipt...)
└── utils/
    ├── localStorage.ts  # ls() helper, MONTHS array, CLASSES constant
    └── whatsapp.ts      # wacoder.in API integration

docs/                    # Markdown documentation files
public/
├── manifest.json        # PWA manifest
├── sw.js                # Service worker (offline cache)
└── assets/
    ├── fonts/           # SpaceGrotesk, PlusJakartaSans, JetBrainsMono
    └── icons/           # App icons (192x192, 512x512)`}</Code>
      </Card>
    </div>
  );
}
