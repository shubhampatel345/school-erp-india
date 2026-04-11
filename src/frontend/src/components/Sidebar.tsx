import {
  AlertCircle,
  ArrowUpCircle,
  Award,
  Banknote,
  BarChart3,
  BellRing,
  BookMarked,
  BookOpen,
  Building2,
  Bus,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  HelpCircle,
  IndianRupee,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Package,
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
import { useState } from "react";
import { useApp } from "../context/AppContext";
import type { UserRole } from "../types";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  roles?: UserRole[];
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    id: "students",
    label: "Student Information",
    icon: Users,
    roles: ["superadmin", "admin", "teacher", "receptionist"],
  },
  {
    id: "fees",
    label: "Fees",
    icon: IndianRupee,
    roles: ["superadmin", "admin", "accountant", "receptionist"],
    children: [
      { id: "fees/collect", label: "Collect Fees", icon: Receipt },
      { id: "fees/heading", label: "Fee Heading Design", icon: Layers },
      { id: "fees/plan", label: "Fees Plan", icon: ClipboardList },
      { id: "fees/due", label: "Due Fees", icon: AlertCircle },
      { id: "fees/register", label: "Fee Register", icon: BookMarked },
      { id: "fees/accounts", label: "Accounts", icon: Banknote },
      { id: "fees/online", label: "Online Fees", icon: Wallet },
    ],
  },
  {
    id: "attendance",
    label: "Attendance",
    icon: CalendarCheck,
    roles: ["superadmin", "admin", "teacher", "driver"],
  },
  {
    id: "examinations",
    label: "Examinations",
    icon: FileText,
    roles: ["superadmin", "admin", "teacher"],
    children: [
      {
        id: "examinations/timetable",
        label: "Timetable Maker",
        icon: CalendarCheck,
      },
      { id: "examinations/results", label: "Results", icon: BarChart3 },
    ],
  },
  {
    id: "academics",
    label: "Academics",
    icon: BookOpen,
    roles: ["superadmin", "admin", "teacher"],
    children: [
      { id: "academics/classes", label: "Classes & Sections", icon: School },
      { id: "academics/subjects", label: "Subjects", icon: BookOpen },
      {
        id: "academics/timetable",
        label: "Teachers Timetable",
        icon: CalendarCheck,
      },
      { id: "academics/syllabus", label: "Syllabus", icon: BookMarked },
      {
        id: "academics/classteachers",
        label: "Class Teachers",
        icon: GraduationCap,
      },
    ],
  },
  {
    id: "hr",
    label: "HR / Staff",
    icon: Users2,
    roles: ["superadmin", "admin"],
    children: [
      { id: "hr/staff", label: "Staff Directory", icon: Users2 },
      { id: "hr/payroll", label: "Payroll", icon: CreditCard },
      { id: "hr/leave", label: "Leave", icon: CalendarCheck },
    ],
  },
  {
    id: "transport",
    label: "Transport",
    icon: Bus,
    roles: ["superadmin", "admin", "driver"],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Package,
    roles: ["superadmin", "admin", "librarian"],
  },
  {
    id: "communication",
    label: "Communication",
    icon: MessageSquare,
    roles: ["superadmin", "admin"],
    children: [
      { id: "communication/whatsapp", label: "WhatsApp", icon: MessageSquare },
      { id: "communication/rcs", label: "RCS Messages", icon: BellRing },
      {
        id: "communication/scheduler",
        label: "Notification Scheduler",
        icon: BellRing,
      },
    ],
  },
  {
    id: "certificates",
    label: "Template Studio",
    icon: Award,
    roles: ["superadmin", "admin"],
  },
  {
    id: "alumni",
    label: "Alumni",
    icon: UserCheck,
    roles: ["superadmin", "admin"],
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: TrendingUp,
    roles: ["superadmin", "admin", "accountant"],
  },
  {
    id: "homework",
    label: "Homework",
    icon: BookMarked,
    roles: ["superadmin", "admin", "teacher"],
  },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    roles: ["superadmin", "admin"],
  },
  {
    id: "qr-attendance",
    label: "QR Attendance",
    icon: QrCode,
    roles: ["superadmin", "admin", "teacher", "driver"],
  },
  {
    id: "promote",
    label: "Promote Students",
    icon: ArrowUpCircle,
    roles: ["superadmin"],
  },
  {
    id: "documentation",
    label: "Documentation",
    icon: HelpCircle,
    badge: "HELP",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    roles: ["superadmin", "admin"],
    children: [
      { id: "settings/profile", label: "School Profile", icon: Building2 },
      { id: "settings/sessions", label: "Sessions", icon: CalendarCheck },
      { id: "settings/whatsapp", label: "WhatsApp API", icon: MessageSquare },
      {
        id: "settings/online-payment",
        label: "Online Payment",
        icon: CreditCard,
      },
      {
        id: "settings/notifications",
        label: "Notification Scheduler",
        icon: BellRing,
      },
      { id: "settings/users", label: "User Management", icon: Users },
    ],
  },
];

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
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    const active = activePage.split("/")[0];
    return [active];
  });

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const canAccess = (item: NavItem): boolean => {
    if (!item.roles) return true;
    if (!currentUser) return false;
    return item.roles.includes(currentUser.role);
  };

  const isActive = (id: string) =>
    activePage === id || activePage.startsWith(`${id}/`);

  const renderItem = (item: NavItem, depth = 0) => {
    if (!canAccess(item)) return null;
    const Icon = item.icon;
    const hasChildren = (item.children?.length ?? 0) > 0;
    const expanded = expandedItems.includes(item.id);
    const active = isActive(item.id);

    return (
      <div key={item.id}>
        <button
          type="button"
          data-ocid={`nav-${item.id.replace(/\//g, "-")}`}
          onClick={() => {
            if (hasChildren) toggleExpand(item.id);
            else onNavigate(item.id);
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-smooth group
            ${depth > 0 ? "ml-3 pl-2.5" : ""}
            ${
              active && !hasChildren
                ? "bg-white/15 text-white font-semibold"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
        >
          <Icon
            className={`w-4 h-4 flex-shrink-0 ${
              active && !hasChildren
                ? "text-white"
                : "text-white/50 group-hover:text-white/80"
            }`}
          />
          {!collapsed && (
            <>
              <span className="flex-1 text-left truncate text-[13px]">
                {item.label}
              </span>
              {item.badge && (
                <span className="text-[9px] font-bold bg-accent/30 text-accent px-1.5 py-0.5 rounded">
                  {item.badge}
                </span>
              )}
              {hasChildren &&
                (expanded ? (
                  <ChevronDown className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
                ))}
            </>
          )}
        </button>
        {!collapsed && hasChildren && expanded && (
          <div className="mt-0.5 space-y-0.5">
            {item.children!.map((child) => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
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
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
        {NAV_ITEMS.map((item) => renderItem(item))}
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
