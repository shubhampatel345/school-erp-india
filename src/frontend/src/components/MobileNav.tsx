import {
  ArrowUpCircle,
  Award,
  BarChart3,
  BellRing,
  BookMarked,
  BookOpen,
  Bus,
  CalendarCheck,
  FileText,
  GraduationCap,
  HelpCircle,
  IndianRupee,
  LayoutDashboard,
  MessageSquare,
  MoreHorizontal,
  Package,
  QrCode,
  Settings,
  TrendingUp,
  UserCheck,
  Users,
  Users2,
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
  { id: "attendance", label: "Attend.", icon: CalendarCheck },
  { id: "__menu__", label: "Menu", icon: MoreHorizontal },
];

const DRAWER_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "students", label: "Students", icon: Users },
  { id: "fees/collect", label: "Collect Fees", icon: IndianRupee },
  { id: "fees/heading", label: "Fee Heading", icon: IndianRupee },
  { id: "fees/plan", label: "Fees Plan", icon: IndianRupee },
  { id: "fees/due", label: "Due Fees", icon: IndianRupee },
  { id: "fees/register", label: "Fee Register", icon: BookMarked },
  { id: "fees/accounts", label: "Accounts", icon: IndianRupee },
  { id: "fees/online", label: "Online Fees", icon: IndianRupee },
  { id: "attendance", label: "Attendance", icon: CalendarCheck },
  { id: "examinations/timetable", label: "Exam Timetable", icon: FileText },
  { id: "examinations/results", label: "Results", icon: BarChart3 },
  { id: "academics/classes", label: "Classes", icon: GraduationCap },
  { id: "academics/subjects", label: "Subjects", icon: BookOpen },
  {
    id: "academics/timetable",
    label: "Teacher Timetable",
    icon: CalendarCheck,
  },
  { id: "academics/syllabus", label: "Syllabus", icon: BookMarked },
  {
    id: "academics/classteachers",
    label: "Class Teachers",
    icon: GraduationCap,
  },
  { id: "hr/staff", label: "Staff Directory", icon: Users2 },
  { id: "hr/payroll", label: "Payroll", icon: IndianRupee },
  { id: "transport", label: "Transport", icon: Bus },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "communication/whatsapp", label: "WhatsApp", icon: MessageSquare },
  { id: "communication/rcs", label: "RCS Messages", icon: BellRing },
  { id: "communication/scheduler", label: "Scheduler", icon: BellRing },
  { id: "certificates", label: "Template Studio", icon: Award },
  { id: "alumni", label: "Alumni", icon: UserCheck },
  { id: "expenses", label: "Expenses", icon: TrendingUp },
  { id: "homework", label: "Homework", icon: BookMarked },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "qr-attendance", label: "QR Attendance", icon: QrCode },
  { id: "promote", label: "Promote Students", icon: ArrowUpCircle },
  { id: "documentation", label: "Documentation", icon: HelpCircle },
  { id: "settings/profile", label: "Settings", icon: Settings },
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
      BOTTOM_TABS[4],
    ];
  } else if (isStudent || isParent) {
    tabs = [
      BOTTOM_TABS[0],
      { id: "fees/collect", label: "Fees", icon: IndianRupee },
      { id: "attendance", label: "Attend.", icon: CalendarCheck },
      BOTTOM_TABS[4],
    ];
  }

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

            {/* Drawer nav */}
            <nav className="p-3 space-y-1 pb-24 flex-1">
              {DRAWER_ITEMS.map((item) => {
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
            </nav>
          </div>
        </aside>
      )}
    </>
  );
}
