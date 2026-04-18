import {
  AlertCircle,
  ArrowUpCircle,
  Award,
  Banknote,
  BarChart3,
  BellRing,
  BookMarked,
  BookOpen,
  Bus,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  HelpCircle,
  IndianRupee,
  Layers,
  LayoutDashboard,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Package,
  Phone,
  QrCode,
  Receipt,
  School,
  Settings,
  TrendingUp,
  UserCheck,
  Users,
  Users2,
  Wallet,
  X,
} from "lucide-react";
import { useApp } from "../context/AppContext";

interface MobileNavProps {
  activePage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const BOTTOM_TABS = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard },
  { id: "students", label: "Students", icon: Users },
  { id: "fees/collect", label: "Fees", icon: IndianRupee },
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "__menu__", label: "Menu", icon: MoreHorizontal },
];

const DRAWER_ITEMS = [
  // Main
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    section: "Main",
  },
  { id: "students", label: "Students", icon: Users, section: "Main" },
  // Fees
  { id: "fees/collect", label: "Collect Fees", icon: Receipt, section: "Fees" },
  { id: "fees/heading", label: "Fee Heading", icon: Layers, section: "Fees" },
  { id: "fees/plan", label: "Fees Plan", icon: ClipboardList, section: "Fees" },
  { id: "fees/due", label: "Due Fees", icon: AlertCircle, section: "Fees" },
  {
    id: "fees/register",
    label: "Fee Register",
    icon: BookMarked,
    section: "Fees",
  },
  { id: "fees/accounts", label: "Accounts", icon: Banknote, section: "Fees" },
  { id: "fees/online", label: "Online Fees", icon: Wallet, section: "Fees" },
  // Academics
  {
    id: "attendance",
    label: "Attendance",
    icon: CalendarCheck,
    section: "Academics",
  },
  {
    id: "examinations/timetable",
    label: "Exam Timetable",
    icon: FileText,
    section: "Academics",
  },
  {
    id: "examinations/results",
    label: "Results",
    icon: BarChart3,
    section: "Academics",
  },
  {
    id: "academics/classes",
    label: "Classes & Sections",
    icon: School,
    section: "Academics",
  },
  {
    id: "academics/subjects",
    label: "Subjects",
    icon: BookOpen,
    section: "Academics",
  },
  {
    id: "academics/timetable",
    label: "Teacher Timetable",
    icon: CalendarCheck,
    section: "Academics",
  },
  {
    id: "academics/syllabus",
    label: "Syllabus",
    icon: BookMarked,
    section: "Academics",
  },
  // HR
  {
    id: "hr/staff",
    label: "Staff Directory",
    icon: Users2,
    section: "HR / Staff",
  },
  {
    id: "hr/payroll",
    label: "Payroll",
    icon: CreditCard,
    section: "HR / Staff",
  },
  {
    id: "hr/leave",
    label: "Leave",
    icon: CalendarCheck,
    section: "HR / Staff",
  },
  // Operations
  { id: "transport", label: "Transport", icon: Bus, section: "Operations" },
  { id: "inventory", label: "Inventory", icon: Package, section: "Operations" },
  {
    id: "calling",
    label: "Calling (Heyophone)",
    icon: Phone,
    section: "Operations",
  },
  // Communication
  { id: "chat", label: "Chat", icon: MessageCircle, section: "Communication" },
  {
    id: "communication/whatsapp",
    label: "WhatsApp",
    icon: MessageSquare,
    section: "Communication",
  },
  {
    id: "communication/rcs",
    label: "RCS Messages",
    icon: MessageSquare,
    section: "Communication",
  },
  {
    id: "communication/scheduler",
    label: "Notif. Scheduler",
    icon: BellRing,
    section: "Communication",
  },
  // Other
  {
    id: "certificates",
    label: "Template Studio",
    icon: Award,
    section: "Other",
  },
  { id: "alumni", label: "Alumni", icon: UserCheck, section: "Other" },
  { id: "expenses", label: "Expenses", icon: TrendingUp, section: "Other" },
  { id: "homework", label: "Homework", icon: BookMarked, section: "Other" },
  { id: "reports", label: "Reports", icon: BarChart3, section: "Other" },
  {
    id: "qr-attendance",
    label: "QR Attendance",
    icon: QrCode,
    section: "Other",
  },
  {
    id: "promote",
    label: "Promote Students",
    icon: ArrowUpCircle,
    section: "Other",
  },
  // Settings
  {
    id: "settings/profile",
    label: "School Profile",
    icon: Settings,
    section: "Settings",
  },
  {
    id: "settings/sessions",
    label: "Sessions",
    icon: CalendarCheck,
    section: "Settings",
  },
  {
    id: "settings/whatsapp",
    label: "WhatsApp API",
    icon: MessageSquare,
    section: "Settings",
  },
  {
    id: "settings/users",
    label: "User Management",
    icon: Users,
    section: "Settings",
  },
  {
    id: "settings/online-payment",
    label: "Online Payment",
    icon: CreditCard,
    section: "Settings",
  },
  {
    id: "settings/notifications",
    label: "Notifications",
    icon: BellRing,
    section: "Settings",
  },
  {
    id: "documentation",
    label: "Documentation",
    icon: HelpCircle,
    section: "Help",
  },
];

export default function MobileNav({
  activePage,
  onNavigate,
  isOpen,
  onClose,
}: MobileNavProps) {
  const { currentUser } = useApp();
  const isDriver = currentUser?.role === "driver";
  const isStudent = currentUser?.role === "student";
  const isParent = currentUser?.role === "parent";

  const handleNav = (id: string) => {
    onNavigate(id);
    onClose();
  };

  let tabs = BOTTOM_TABS;
  if (isDriver) {
    tabs = [
      BOTTOM_TABS[0],
      { id: "qr-attendance", label: "QR Scan", icon: QrCode },
      { id: "chat", label: "Chat", icon: MessageCircle },
      BOTTOM_TABS[4],
    ];
  } else if (isStudent || isParent) {
    tabs = [
      BOTTOM_TABS[0],
      { id: "fees/collect", label: "Fees", icon: IndianRupee },
      { id: "attendance", label: "Attend.", icon: CalendarCheck },
      { id: "chat", label: "Chat", icon: MessageCircle },
      BOTTOM_TABS[4],
    ];
  }

  // Group drawer items by section
  const sections = DRAWER_ITEMS.reduce<Record<string, typeof DRAWER_ITEMS>>(
    (acc, item) => {
      if (!acc[item.section]) acc[item.section] = [];
      acc[item.section].push(item);
      return acc;
    },
    {},
  );

  return (
    <>
      {/* Bottom Tab Bar */}
      <nav className="mobile-nav flex" aria-label="Mobile navigation">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active =
            activePage === tab.id || activePage.startsWith(`${tab.id}/`);
          return (
            <button
              type="button"
              key={tab.id}
              data-ocid={`mobile-nav-${tab.id.replace(/\//g, "-")}`}
              onClick={() =>
                tab.id === "__menu__"
                  ? isOpen
                    ? onClose()
                    : onNavigate("__menu__")
                  : handleNav(tab.id)
              }
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors min-h-[44px]
                ${active || (tab.id === "__menu__" && isOpen) ? "text-primary" : "text-muted-foreground"}`}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Slide-in Drawer */}
      {isOpen && (
        <aside
          className="fixed inset-0 z-50 lg:hidden flex"
          aria-label="Navigation drawer"
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === "Enter") onClose();
            }}
            role="button"
            tabIndex={0}
            aria-label="Close menu"
          />
          {/* Drawer panel */}
          <div className="relative w-72 bg-card h-full overflow-y-auto shadow-elevated ml-auto flex flex-col animate-slide-in-right">
            {/* Drawer header */}
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-display font-bold text-sm text-foreground">
                  All Modules
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer nav — grouped by section */}
            <nav className="p-3 pb-24 flex-1">
              {Object.entries(sections).map(([sectionName, items]) => (
                <div key={sectionName} className="mb-3">
                  {sectionName !== "Main" && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 pt-2 pb-1">
                      {sectionName}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const active =
                        activePage === item.id ||
                        activePage.startsWith(`${item.id}/`);
                      return (
                        <button
                          type="button"
                          key={item.id}
                          data-ocid={`drawer-nav-${item.id.replace(/\//g, "-")}`}
                          onClick={() => handleNav(item.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-smooth
                            ${
                              active
                                ? "bg-primary text-primary-foreground font-semibold"
                                : "hover:bg-muted text-foreground"
                            }`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-left">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </aside>
      )}
    </>
  );
}
