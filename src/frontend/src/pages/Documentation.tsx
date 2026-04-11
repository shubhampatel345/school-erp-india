import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Cloud,
  Code2,
  Database,
  HelpCircle,
  Rocket,
  Shield,
  Smartphone,
} from "lucide-react";
import { useState } from "react";

// ─── Accordion helper ───────────────────────────────────────
function Accordion({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
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
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
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

// ─── Table helper ───────────────────────────────────────────
function DocTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="text-left px-4 py-2 font-semibold text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row[0]} className="hover:bg-muted/20">
              {row.map((cell) => (
                <td
                  key={cell}
                  className={`px-4 py-2 ${row.indexOf(cell) === 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}
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

// ─── Code block helper ──────────────────────────────────────
function Code({ children }: { children: string }) {
  return (
    <pre className="bg-muted/60 rounded-lg px-4 py-3 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-words">
      {children}
    </pre>
  );
}

// ─── Module Guide data ──────────────────────────────────────
const MODULES = [
  {
    name: "Students",
    icon: "🎒",
    desc: "Add, edit, search, import/export students. Double-click to open full profile with photo, transport, fees, discounts, and credentials tabs. Print admission form, ID card, and admit card.",
  },
  {
    name: "Fees",
    icon: "💰",
    desc: "Collect fees (class/section-wise amounts auto-load), print 4 receipt templates, view Fee Register, manage dues wizard (month+class selection), set discounts per month, manage fee headings and accounts.",
  },
  {
    name: "Attendance",
    icon: "📋",
    desc: "Mark daily attendance by class/section, view summaries, RFID/QR/ESSL biometric tab for device integration, Welcome Display for big-screen entry messages, route-wise present/absent breakdown.",
  },
  {
    name: "Examinations",
    icon: "📝",
    desc: "Timetable Maker wizard: enter exam details, auto-generates per-class timetables. Drag to reorder subjects (dates locked). Generate reshuffles; Save locks. Excel-style combined view printable as CSV.",
  },
  {
    name: "HR & Staff",
    icon: "👥",
    desc: "Staff directory with photo, subject-class range wizard for teachers, designation, salary, import/export CSV. Class Teacher assignment (one per section, duplicates blocked).",
  },
  {
    name: "Academics",
    icon: "📚",
    desc: "Classes & Sections CRUD. Subjects with multi-class assignment wizard. Teacher Timetable Maker (conflict-safe, drag-and-drop, combined + teacher-wise views). Syllabus chapter tracker.",
  },
  {
    name: "Transport",
    icon: "🚌",
    desc: "Bus routes, pickup points, driver assignment. Student profiles auto-populate transport details. Route-wise attendance summary.",
  },
  {
    name: "Inventory",
    icon: "📦",
    desc: "Stock items (dress, tie, belt, etc.), purchase orders, sales with sell price. Category and store management. Stock report with print/export.",
  },
  {
    name: "Communication",
    icon: "💬",
    desc: "WhatsApp (real API via wacoder.in), RCS (simulated), manual compose with templates. Auto-Send Scheduler for 7 events. Notification bell in header shows live ERP events.",
  },
  {
    name: "Certificates",
    icon: "🏅",
    desc: "Template Studio with drag-and-drop design editor. Templates: ID Card, Fees Receipt, Admission Form, Result, Admit Card, Bonafide, Transfer, Experience. Upload custom backgrounds, change fonts/colors.",
  },
  {
    name: "Expenses",
    icon: "💸",
    desc: "Income & Expense ledgers with running balance. Expense Heads CRUD. Budget vs Actual report. Monthly bar chart.",
  },
  {
    name: "Homework",
    icon: "✏️",
    desc: "Assign homework by class/section/subject with due date. Overdue detection. Submission tracker per student. Analytics charts.",
  },
  {
    name: "Alumni",
    icon: "🎓",
    desc: "Alumni directory (CRUD + search). Batch view (grouped cards). Events management.",
  },
  {
    name: "Reports",
    icon: "📊",
    desc: "8 report cards: Students, Finance, Attendance, Exams, HR, Transport, Inventory, Fees Due. Each pulls real data from localStorage.",
  },
  {
    name: "Promote Students",
    icon: "⬆️",
    desc: "4-step wizard to advance all students to next class and session. Archives old session with infinite history. Month-wise dues carry forward as Old Balance.",
  },
];

// ─── Roles & Permissions ────────────────────────────────────
const ROLES_TABLE = [
  [
    "Super Admin",
    "Full access to all modules, settings, user management, delete/edit rights",
  ],
  [
    "Admin",
    "All modules except Super Admin settings. Can reset non-admin passwords",
  ],
  [
    "Teacher",
    "Attendance, Homework, Timetable view, student list for their classes",
  ],
  ["Parent", "View own children's fees, attendance, timetable, notices"],
  ["Student", "View own attendance, fee receipts, timetable, homework"],
  ["Driver", "QR Attendance scanner, own route info"],
  ["Receptionist", "Student information, attendance, basic fees view"],
  ["Accountant", "Full fees module, reports, expenses"],
  ["Librarian", "Student list, basic attendance view"],
];

// ─── FAQ data ───────────────────────────────────────────────
const FAQS = [
  {
    q: "I forgot the Super Admin password. How do I reset it?",
    a: "Open browser DevTools → Application → Local Storage → find shubh_erp_user_passwords → edit the 'superadmin' key value. Or clear all ERP data with Factory Reset (Settings → Data → Factory Reset) and log in with admin123.",
  },
  {
    q: "A teacher/student can't log in. What are the default credentials?",
    a: "Student: Username = Admission No., Password = Date of Birth in ddmmyyyy format (e.g. 15081990). Teacher: Username = Mobile No., Password = DOB in ddmmyyyy. Parent: Username = Mobile No., Password = same Mobile No.",
  },
  {
    q: "Receipts are not printing properly — blank page or wrong position.",
    a: "Ensure Print Receipt is selected (not just Save). In print dialog, set Margins to 'None' and uncheck 'Headers and footers'. For Bharati (4-size) receipts, set paper size to 105×148mm (A6) in print dialog.",
  },
  {
    q: "The QR scanner on mobile is not working.",
    a: "The QR scanner requires camera permission. Open the app in Chrome on Android or Safari on iOS, go to QR Attendance, allow camera when prompted. If denied, go to browser settings → site permissions → enable camera.",
  },
  {
    q: "How do I backup all school data?",
    a: "Settings → Data → Export JSON Backup. This downloads all localStorage data as a single JSON file. To restore: Import JSON Backup and select the file. Keep backups before every Promote Students session.",
  },
  {
    q: "WhatsApp messages show 'CORS error'. Is this a bug?",
    a: "No. CORS errors happen when testing in a local dev environment. In production (hosted on a real domain), WhatsApp API calls will succeed. The message is logged but won't stop the ERP from functioning.",
  },
  {
    q: "How do I add a new academic session without promoting students?",
    a: "Go to Settings → Sessions → Create New Session. This archives the current session. Use Promote Students only when you want to advance students to the next class at year-end.",
  },
];

export default function Documentation() {
  const [activeSection, setActiveSection] = useState("getting-started");

  const sections = [
    {
      id: "getting-started",
      label: "Getting Started",
      icon: <Rocket className="w-4 h-4" />,
    },
    {
      id: "modules",
      label: "Module Guide",
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      id: "data",
      label: "Settings & Data",
      icon: <Database className="w-4 h-4" />,
    },
    {
      id: "cpanel",
      label: "Deploy on cPanel",
      icon: <Cloud className="w-4 h-4" />,
    },
    {
      id: "pwa",
      label: "Android PWA Install",
      icon: <Smartphone className="w-4 h-4" />,
    },
    { id: "faq", label: "FAQ", icon: <HelpCircle className="w-4 h-4" /> },
    {
      id: "roles",
      label: "Roles & Permissions",
      icon: <Shield className="w-4 h-4" />,
    },
    {
      id: "build",
      label: "Build Commands",
      icon: <Code2 className="w-4 h-4" />,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-card border-b px-4 lg:px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-display font-semibold text-foreground">
            Documentation
          </h1>
          <p className="text-xs text-muted-foreground">
            User guides, deployment, and help for SHUBH SCHOOL ERP
          </p>
        </div>
        <Badge variant="secondary" className="ml-auto text-xs">
          HELP
        </Badge>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar nav */}
        <nav className="hidden md:flex flex-col w-52 bg-card border-r shrink-0 overflow-y-auto py-3">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              data-ocid={`doc-nav-${s.id}`}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors ${
                activeSection === s.id
                  ? "bg-primary/10 text-primary font-medium border-r-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </nav>

        {/* Mobile section tabs */}
        <div className="md:hidden w-full overflow-hidden flex flex-col">
          <div className="flex overflow-x-auto border-b bg-card px-3 py-2 gap-2 shrink-0">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                  activeSection === s.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
            <DocContent active={activeSection} />
          </div>
        </div>

        {/* Desktop content */}
        <div className="hidden md:block flex-1 overflow-y-auto p-6 bg-background">
          <div className="max-w-3xl space-y-5">
            <DocContent active={activeSection} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DocContent({ active }: { active: string }) {
  if (active === "getting-started") return <GettingStarted />;
  if (active === "modules") return <ModuleGuide />;
  if (active === "data") return <DataSettings />;
  if (active === "cpanel") return <CpanelDeploy />;
  if (active === "pwa") return <PwaInstall />;
  if (active === "faq") return <FaqSection />;
  if (active === "roles") return <RolesSection />;
  if (active === "build") return <BuildCommands />;
  return null;
}

// ─── Sections ───────────────────────────────────────────────

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
              "Change after first login",
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
              "Same as student guardian mobile",
            ],
            [
              "Driver",
              "Mobile No.",
              "DOB (ddmmyyyy)",
              "Added as staff with Driver designation",
            ],
          ]}
        />
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-foreground mb-4">
          First-Time Setup Steps
        </h3>
        <ol className="space-y-3">
          {[
            {
              step: "1",
              title: "Configure School Profile",
              desc: "Settings → School Profile. Enter school name, address, logo. This auto-populates all receipts and certificates.",
            },
            {
              step: "2",
              title: "Set Up Classes & Sections",
              desc: "Academics → Classes & Sections. Add your class structure (e.g. 1A, 1B, 2A...12B).",
            },
            {
              step: "3",
              title: "Add Subjects",
              desc: "Academics → Subjects. Add subjects and assign them to multiple classes using the wizard.",
            },
            {
              step: "4",
              title: "Add HR Staff & Teachers",
              desc: "HR → Staff Directory → Add Staff. For teachers, set subject-class range assignments in the wizard.",
            },
            {
              step: "5",
              title: "Create Fee Structure",
              desc: "Fees → Fee Headings: define heading names with applicable months. Fees → Fee Plan: set section-wise amounts.",
            },
            {
              step: "6",
              title: "Admit Students",
              desc: "Students → Add Student. Fill admission form. Credentials are auto-created (Adm.No. / DOB).",
            },
            {
              step: "7",
              title: "Start Collecting Fees",
              desc: "Fees → Collect Fees. Search student, select months, enter amount, save and print receipt.",
            },
          ].map((item) => (
            <li key={item.step} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {item.step}
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

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

function DataSettings() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground mb-1">
          Settings & Data
        </h2>
        <p className="text-sm text-muted-foreground">
          All data is stored in your browser's localStorage — no internet
          required after the first load.
        </p>
      </div>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">
          How Data Storage Works
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          SHUBH SCHOOL ERP uses browser localStorage (prefix:{" "}
          <code className="text-xs bg-muted px-1 rounded">shubh_erp_</code>).
          Data persists until you clear browser data or run a Factory Reset.
          Different browsers on the same device have separate storage. Use the
          Export/Import feature to transfer data or create backups.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
          {[
            { label: "Students", key: "shubh_erp_students" },
            { label: "Staff", key: "shubh_erp_staff" },
            { label: "Fee Receipts", key: "shubh_erp_fee_receipts" },
            { label: "Sessions", key: "shubh_erp_sessions" },
            { label: "Attendance", key: "shubh_erp_attendance" },
            { label: "School Profile", key: "shubh_erp_school_profile" },
          ].map((item) => (
            <div key={item.key} className="bg-muted/50 rounded-lg px-3 py-2">
              <p className="text-xs font-medium text-foreground">
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5 break-all">
                {item.key}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">Backup & Restore</h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Export:</strong> Settings → Data
            → Export JSON Backup. Downloads a{" "}
            <code className="text-xs bg-muted px-1 rounded">.json</code> file
            with all ERP data.
          </li>
          <li>
            <strong className="text-foreground">Import:</strong> Settings → Data
            → Import JSON Backup. Select the exported file. All data will be
            restored.
          </li>
          <li>
            <strong className="text-foreground">Schedule backups</strong> at
            least weekly and always before running Promote Students.
          </li>
        </ol>
      </Card>

      <Card className="p-5 space-y-3 border-destructive/30">
        <h3 className="font-semibold text-destructive">Factory Reset</h3>
        <p className="text-sm text-muted-foreground">
          Settings → Data → Factory Reset. Clears <strong>all</strong> school
          data including students, fees, and sessions. Use only to start fresh.
          Always export a backup before resetting.
        </p>
      </Card>
    </div>
  );
}

function CpanelDeploy() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground mb-1">
          Deploy on cPanel Hosting
        </h2>
        <p className="text-sm text-muted-foreground">
          Host SHUBH SCHOOL ERP on any Indian shared hosting that supports
          cPanel (Hostinger, BigRock, GoDaddy India, etc.)
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">
          Step-by-Step Deployment
        </h3>
        <ol className="space-y-4">
          {[
            {
              step: "1",
              title: "Build the app",
              content: (
                <Code>{`# In project root
pnpm install
cd src/frontend
pnpm build
# Output is in src/frontend/dist/`}</Code>
              ),
            },
            {
              step: "2",
              title: "Compress the dist/ folder",
              content: (
                <p className="text-sm text-muted-foreground">
                  Right-click the{" "}
                  <code className="text-xs bg-muted px-1 rounded">dist/</code>{" "}
                  folder → Compress as ZIP. Name it{" "}
                  <code className="text-xs bg-muted px-1 rounded">
                    school-erp.zip
                  </code>
                  .
                </p>
              ),
            },
            {
              step: "3",
              title: "Upload via File Manager",
              content: (
                <p className="text-sm text-muted-foreground">
                  Login to cPanel → File Manager → navigate to{" "}
                  <code className="text-xs bg-muted px-1 rounded">
                    public_html/
                  </code>{" "}
                  (or a subdirectory) → Upload → select the ZIP → Extract it
                  here.
                </p>
              ),
            },
            {
              step: "4",
              title: "Create .htaccess for React Router",
              content: (
                <Code>{`# Create/edit public_html/.htaccess
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QR,L]`}</Code>
              ),
            },
            {
              step: "5",
              title: "Enable SSL (HTTPS)",
              content: (
                <p className="text-sm text-muted-foreground">
                  cPanel → SSL/TLS → Install Free Let's Encrypt certificate for
                  your domain. HTTPS is required for camera (QR scanner) and PWA
                  install features.
                </p>
              ),
            },
            {
              step: "6",
              title: "Verify",
              content: (
                <p className="text-sm text-muted-foreground">
                  Open your domain in browser. Login with superadmin / admin123.
                  Check Settings → School Profile and fill in your school
                  details. Done!
                </p>
              ),
            },
          ].map((item) => (
            <li key={item.step} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                {item.step}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm mb-1.5">
                  {item.title}
                </p>
                {item.content}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-foreground mb-3">Troubleshooting</h3>
        <DocTable
          headers={["Problem", "Solution"]}
          rows={[
            [
              "Page refreshes show 404",
              "Check .htaccess RewriteRule is correct and mod_rewrite is enabled",
            ],
            [
              "App loads but shows blank white",
              "Check browser console (F12). Usually a JS error — rebuild with pnpm build",
            ],
            [
              "Can't install PWA on phone",
              "Must be HTTPS. Chrome on Android only. Check manifest.json is accessible",
            ],
            [
              "QR Scanner asks permission but fails",
              "Browser camera permission may be blocked. Go to Chrome Settings → Site Settings → Camera → Allow your domain",
            ],
            [
              "Data lost after browser update",
              "localStorage cleared — restore from JSON backup. Keep regular backups",
            ],
          ]}
        />
      </Card>

      <Card className="p-4 bg-muted/30">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">
            Recommended Indian Hosting:
          </strong>{" "}
          Hostinger India (₹79/mo), BigRock (₹99/mo), GoDaddy India (₹149/mo).
          All support cPanel, PHP 8+, and Let's Encrypt SSL.
        </p>
      </Card>
    </div>
  );
}

function PwaInstall() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground mb-1">
          Android & iOS PWA Installation
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
            <li>1. Open the app URL in Chrome on Android</li>
            <li>2. Wait for the "Install" banner at the bottom</li>
            <li>3. Tap "Install" or tap ⋮ menu → "Add to Home Screen"</li>
            <li>4. App icon appears on home screen</li>
            <li>5. Opens full-screen without browser bar</li>
          </ol>
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
            Requires HTTPS. Works on Chrome 70+ and most Android browsers.
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍎</span>
            <h3 className="font-semibold text-foreground">iOS (Safari)</h3>
          </div>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li>1. Open the app URL in Safari on iPhone/iPad</li>
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
          PWA vs Native APK
        </h3>
        <DocTable
          headers={["Feature", "PWA (this app)", "Native APK"]}
          rows={[
            ["Installation", "Instant via browser", "Download from Play Store"],
            ["Updates", "Automatic on reload", "Manual update required"],
            ["Offline support", "Yes (cached)", "Yes (bundled)"],
            ["Camera / QR scan", "Yes (HTTPS required)", "Yes"],
            ["Home screen icon", "Yes", "Yes"],
            ["Play Store listing", "No", "Yes"],
            ["Cost to publish", "Free", "₹2,000/year (Google Play)"],
            ["Development", "Already done ✓", "Requires developer"],
          ]}
        />
      </Card>
    </div>
  );
}

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

function RolesSection() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground mb-1">
          Roles & Permissions
        </h2>
        <p className="text-sm text-muted-foreground">
          Module access matrix for all 9 roles.
        </p>
      </div>
      <Card className="p-5 overflow-x-auto">
        <DocTable headers={["Role", "Access Level"]} rows={ROLES_TABLE} />
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">
          Fee Edit/Delete Rights
        </h3>
        <DocTable
          headers={[
            "Role",
            "View Receipts",
            "Edit Receipts",
            "Delete Receipts",
          ]}
          rows={[
            ["Super Admin", "✅", "✅", "✅"],
            ["Admin", "✅", "✅", "❌"],
            ["Accountant", "✅", "✅", "❌"],
            ["Receptionist", "✅", "❌", "❌"],
            ["Teacher", "❌", "❌", "❌"],
            ["Parent/Student", "Own only", "❌", "❌"],
          ]}
        />
      </Card>
    </div>
  );
}

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

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">Prerequisites</h3>
        <Code>{`node --version   # v18+ required
pnpm --version   # v8+ recommended
# Install pnpm if needed:
npm install -g pnpm`}</Code>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">Setup & Development</h3>
        <Code>{`# Clone and install
git clone https://github.com/shubhampatel345/school-erp-india
cd school-erp-india
pnpm install

# Start dev server (frontend only)
cd src/frontend
pnpm dev
# Opens at http://localhost:5173`}</Code>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">Type Check & Lint</h3>
        <Code>{`cd src/frontend

# TypeScript type check
pnpm typecheck

# Lint fix (ESLint + Prettier)
pnpm fix`}</Code>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">Production Build</h3>
        <Code>{`cd src/frontend
pnpm build
# Output: src/frontend/dist/
# Upload contents of dist/ to public_html/ on cPanel`}</Code>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground">Folder Structure</h3>
        <Code>{`src/frontend/src/
├── components/     # Shared UI (Layout, shadcn/ui)
├── context/        # AppContext (auth, sessions, notifications)
├── pages/          # One file per module page
│   ├── settings/   # Settings sub-tabs
│   ├── fees/       # Fees sub-tabs
│   ├── hr/         # HR sub-tabs
│   └── ...
├── types/          # TypeScript interfaces
└── utils/
    ├── localStorage.ts   # ls(), MONTHS, CLASSES etc.
    └── whatsapp.ts       # WhatsApp API integration`}</Code>
      </Card>
    </div>
  );
}
