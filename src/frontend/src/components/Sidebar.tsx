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
} from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import type { UserRole } from "../types";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
  badge?: string;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    section: "main",
  },
  {
    id: "students",
    label: "Student Information",
    icon: Users,
    roles: ["superadmin", "admin", "teacher", "receptionist"],
    section: "main",
  },
  // Fees section
  {
    id: "fees/collect",
    label: "Collect Fees",
    icon: Receipt,
    roles: ["superadmin", "admin", "accountant", "receptionist"],
    section: "fees",
  },
  {
    id: "fees/heading",
    label: "Fee Heading",
    icon: Layers,
    roles: ["superadmin", "admin", "accountant"],
    section: "fees",
  },
  {
    id: "fees/plan",
    label: "Fees Plan",
    icon: ClipboardList,
    roles: ["superadmin", "admin", "accountant"],
    section: "fees",
  },
  {
    id: "fees/due",
    label: "Due Fees",
    icon: AlertCircle,
    roles: ["superadmin", "admin", "accountant"],
    section: "fees",
  },
  {
    id: "fees/register",
    label: "Fee Register",
    icon: BookMarked,
    roles: ["superadmin", "admin", "accountant"],
    section: "fees",
  },
  {
    id: "fees/accounts",
    label: "Accounts",
    icon: Banknote,
    roles: ["superadmin", "admin", "accountant"],
    section: "fees",
  },
  {
    id: "fees/online",
    label: "Online Fees",
    icon: Wallet,
    roles: ["superadmin", "admin"],
    section: "fees",
  },
  // Academics section
  {
    id: "attendance",
    label: "Attendance",
    icon: CalendarCheck,
    roles: ["superadmin", "admin", "teacher", "driver"],
    section: "academic",
  },
  {
    id: "examinations/timetable",
    label: "Exam Timetable",
    icon: FileText,
    roles: ["superadmin", "admin", "teacher"],
    section: "academic",
  },
  {
    id: "examinations/results",
    label: "Results",
    icon: BarChart3,
    roles: ["superadmin", "admin", "teacher"],
    section: "academic",
  },
  {
    id: "academics/classes",
    label: "Classes & Sections",
    icon: School,
    roles: ["superadmin", "admin", "teacher"],
    section: "academic",
  },
  {
    id: "academics/subjects",
    label: "Subjects",
    icon: BookOpen,
    roles: ["superadmin", "admin", "teacher"],
    section: "academic",
  },
  {
    id: "academics/timetable",
    label: "Teacher Timetable",
    icon: CalendarCheck,
    roles: ["superadmin", "admin", "teacher"],
    section: "academic",
  },
  {
    id: "academics/syllabus",
    label: "Syllabus",
    icon: BookMarked,
    roles: ["superadmin", "admin", "teacher"],
    section: "academic",
  },
  // HR section
  {
    id: "hr/staff",
    label: "Staff Directory",
    icon: Users2,
    roles: ["superadmin", "admin"],
    section: "hr",
  },
  {
    id: "hr/payroll",
    label: "Payroll",
    icon: CreditCard,
    roles: ["superadmin", "admin"],
    section: "hr",
  },
  {
    id: "hr/leave",
    label: "Leave Management",
    icon: CalendarCheck,
    roles: ["superadmin", "admin"],
    section: "hr",
  },
  // Operations section
  {
    id: "transport",
    label: "Transport",
    icon: Bus,
    roles: ["superadmin", "admin", "driver"],
    section: "ops",
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Package,
    roles: ["superadmin", "admin", "librarian"],
    section: "ops",
  },
  {
    id: "calling",
    label: "Calling (Heyophone)",
    icon: Phone,
    roles: ["superadmin", "admin"],
    section: "ops",
  },
  // Communication section
  {
    id: "chat",
    label: "Chat",
    icon: MessageCircle,
    section: "comms",
  },
  {
    id: "communication/whatsapp",
    label: "WhatsApp",
    icon: MessageSquare,
    roles: ["superadmin", "admin"],
    section: "comms",
  },
  {
    id: "communication/rcs",
    label: "RCS Messages",
    icon: BellRing,
    roles: ["superadmin", "admin"],
    section: "comms",
  },
  {
    id: "communication/scheduler",
    label: "Notif. Scheduler",
    icon: BellRing,
    roles: ["superadmin", "admin"],
    section: "comms",
  },
  // Other
  {
    id: "certificates",
    label: "Template Studio",
    icon: Award,
    roles: ["superadmin", "admin"],
    section: "other",
  },
  {
    id: "alumni",
    label: "Alumni",
    icon: UserCheck,
    roles: ["superadmin", "admin"],
    section: "other",
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: TrendingUp,
    roles: ["superadmin", "admin", "accountant"],
    section: "other",
  },
  {
    id: "homework",
    label: "Homework",
    icon: BookMarked,
    roles: ["superadmin", "admin", "teacher"],
    section: "other",
  },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    roles: ["superadmin", "admin"],
    section: "other",
  },
  {
    id: "qr-attendance",
    label: "QR Attendance",
    icon: QrCode,
    roles: ["superadmin", "admin", "teacher", "driver"],
    section: "other",
  },
  {
    id: "promote",
    label: "Promote Students",
    icon: ArrowUpCircle,
    roles: ["superadmin"],
    section: "other",
  },
  // Settings
  {
    id: "settings/profile",
    label: "School Profile",
    icon: Settings,
    roles: ["superadmin", "admin"],
    section: "settings",
  },
  {
    id: "settings/sessions",
    label: "Sessions",
    icon: CalendarCheck,
    roles: ["superadmin", "admin"],
    section: "settings",
  },
  {
    id: "settings/whatsapp",
    label: "WhatsApp API",
    icon: MessageSquare,
    roles: ["superadmin", "admin"],
    section: "settings",
  },
  {
    id: "settings/users",
    label: "User Management",
    icon: Users,
    roles: ["superadmin"],
    section: "settings",
  },
  {
    id: "settings/online-payment",
    label: "Online Payment",
    icon: CreditCard,
    roles: ["superadmin", "admin"],
    section: "settings",
  },
  {
    id: "settings/notifications",
    label: "Notifications",
    icon: BellRing,
    roles: ["superadmin", "admin"],
    section: "settings",
  },
  {
    id: "documentation",
    label: "Documentation",
    icon: HelpCircle,
    badge: "HELP",
    section: "bottom",
  },
];

const SECTION_LABELS: Record<string, string> = {
  main: "",
  fees: "Fees",
  academic: "Academics",
  hr: "HR / Staff",
  ops: "Operations",
  comms: "Communication",
  other: "Other Modules",
  settings: "Settings",
  bottom: "",
};

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  collapsed?: boolean;
}

export default function Sidebar({
  activePage,
  onNavigate,
  collapsed = false,
}: SidebarProps) {
  const { currentUser } = useApp();
  const [chatUnread, setChatUnread] = useState(0);

  // Poll unread count from localStorage key written by Chat page
  useEffect(() => {
    const read = () => {
      const v = Number.parseInt(
        localStorage.getItem("shubh_chat_unread") ?? "0",
        10,
      );
      setChatUnread(Number.isNaN(v) ? 0 : v);
    };
    read();
    const interval = setInterval(read, 5000);
    return () => clearInterval(interval);
  }, []);

  const canAccess = (item: NavItem): boolean => {
    if (!item.roles) return true;
    if (!currentUser) return false;
    return item.roles.includes(currentUser.role);
  };

  const isActive = (id: string) =>
    activePage === id || activePage.startsWith(`${id}/`);

  // Group items by section
  const sections = NAV_ITEMS.reduce<Record<string, NavItem[]>>((acc, item) => {
    const sec = item.section ?? "other";
    if (!acc[sec]) acc[sec] = [];
    acc[sec].push(item);
    return acc;
  }, {});

  const sectionOrder = [
    "main",
    "fees",
    "academic",
    "hr",
    "ops",
    "comms",
    "other",
    "settings",
    "bottom",
  ];

  const renderItem = (item: NavItem) => {
    if (!canAccess(item)) return null;
    const Icon = item.icon;
    const active = isActive(item.id);
    const isChatItem = item.id === "chat";
    const showUnreadBadge = isChatItem && chatUnread > 0;

    return (
      <button
        key={item.id}
        type="button"
        data-ocid={`nav-${item.id.replace(/\//g, "-")}`}
        onClick={() => onNavigate(item.id)}
        title={collapsed ? item.label : undefined}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-smooth group
          ${
            active
              ? "bg-white/15 text-white font-semibold"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
      >
        <div className="relative flex-shrink-0">
          <Icon
            className={`w-4 h-4 ${
              active ? "text-white" : "text-white/50 group-hover:text-white/80"
            }`}
          />
          {collapsed && showUnreadBadge && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] text-white font-bold flex items-center justify-center">
              {chatUnread > 9 ? "9+" : chatUnread}
            </span>
          )}
        </div>
        {!collapsed && (
          <>
            <span className="flex-1 text-left truncate text-[13px]">
              {item.label}
            </span>
            {showUnreadBadge && (
              <span className="min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center px-1">
                {chatUnread > 99 ? "99+" : chatUnread}
              </span>
            )}
            {item.badge && !showUnreadBadge && (
              <span className="text-[9px] font-bold bg-accent/30 text-accent px-1.5 py-0.5 rounded">
                {item.badge}
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  return (
    <aside
      className={`h-full flex flex-col transition-smooth overflow-hidden ${
        collapsed ? "w-14" : "w-60"
      }`}
      style={{
        backgroundColor: "oklch(var(--sidebar))",
        color: "oklch(var(--sidebar-foreground))",
      }}
    >
      {/* Logo strip */}
      <div
        className="flex items-center gap-2 h-14 px-3 flex-shrink-0"
        style={{ borderBottom: "1px solid oklch(var(--sidebar-border))" }}
      >
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-display font-bold text-sm text-white truncate">
            SHUBH SCHOOL ERP
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {sectionOrder.map((sec) => {
          const items = sections[sec];
          if (!items) return null;
          const accessibleItems = items.filter(canAccess);
          if (accessibleItems.length === 0) return null;
          const label = SECTION_LABELS[sec];

          return (
            <div key={sec} className="mb-2">
              {!collapsed && label && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-3 pt-3 pb-1">
                  {label}
                </p>
              )}
              {collapsed && label && (
                <div className="border-t border-white/10 my-2" />
              )}
              <div className="space-y-0.5">
                {accessibleItems.map(renderItem)}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div
          className="p-3 flex-shrink-0"
          style={{ borderTop: "1px solid oklch(var(--sidebar-border))" }}
        >
          <p className="text-[10px] text-white/30 text-center">
            © {new Date().getFullYear()} SHUBH SCHOOL ERP
          </p>
        </div>
      )}
    </aside>
  );
}
