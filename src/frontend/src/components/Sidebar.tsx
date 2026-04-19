import {
  Award,
  BarChart3,
  BookOpen,
  Bus,
  CalendarCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  HelpCircle,
  IndianRupee,
  LayoutDashboard,
  MessageCircle,
  MessageSquare,
  Package,
  Phone,
  Settings,
  TrendingUp,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import type { UserRole } from "../types";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

// Flat nav — NO submenus, NO expandable sections
// Each item maps directly to a page ID used in activePage state
const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    id: "students",
    label: "Students",
    icon: Users,
    roles: ["superadmin", "admin", "teacher", "receptionist"],
  },
  {
    id: "fees",
    label: "Fees",
    icon: IndianRupee,
    roles: ["superadmin", "admin", "accountant", "receptionist"],
  },
  {
    id: "attendance",
    label: "Attendance",
    icon: CalendarCheck,
    roles: ["superadmin", "admin", "teacher", "driver"],
  },
  {
    id: "hr",
    label: "HR / Staff",
    icon: UserCog,
    roles: ["superadmin", "admin"],
  },
  {
    id: "academics",
    label: "Academics",
    icon: BookOpen,
    roles: ["superadmin", "admin", "teacher"],
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
    id: "examinations",
    label: "Examinations",
    icon: FileText,
    roles: ["superadmin", "admin", "teacher"],
  },
  {
    id: "communication",
    label: "Communication",
    icon: MessageSquare,
    roles: ["superadmin", "admin"],
  },
  { id: "chat", label: "Chat", icon: MessageCircle },
  {
    id: "calling",
    label: "Calling",
    icon: Phone,
    roles: ["superadmin", "admin"],
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: TrendingUp,
    roles: ["superadmin", "admin", "accountant"],
  },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    roles: ["superadmin", "admin"],
  },
  {
    id: "alumni",
    label: "Alumni",
    icon: UserCheck,
    roles: ["superadmin", "admin"],
  },
  {
    id: "homework",
    label: "Homework",
    icon: ClipboardList,
    roles: ["superadmin", "admin", "teacher"],
  },
  {
    id: "certificates",
    label: "Certificates",
    icon: Award,
    roles: ["superadmin", "admin"],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    roles: ["superadmin", "admin"],
  },
  { id: "documentation", label: "Documentation", icon: HelpCircle },
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
  const [chatUnread, setChatUnread] = useState(0);

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

  // Consider active if activePage starts with item id
  // e.g. "fees/collect" matches "fees", "hr/staff" matches "hr"
  const isActive = (id: string) =>
    activePage === id || activePage.startsWith(`${id}/`);

  const accessibleItems = NAV_ITEMS.filter(canAccess);

  return (
    <aside
      className={`h-full flex flex-col transition-smooth overflow-hidden ${collapsed ? "w-14" : "w-60"}`}
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
          <span className="font-display font-bold text-sm text-white truncate leading-tight">
            SCHOOL LEDGER ERP
          </span>
        )}
      </div>

      {/* Flat navigation — no submenus */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
        {accessibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.id);
          const showUnread = item.id === "chat" && chatUnread > 0;

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
                  className={`w-4 h-4 ${active ? "text-white" : "text-white/50 group-hover:text-white/80"}`}
                />
                {collapsed && showUnread && (
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
                  {showUnread && (
                    <span className="min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center px-1">
                      {chatUnread > 99 ? "99+" : chatUnread}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer — user role badge */}
      {!collapsed && (
        <div
          className="p-3 flex-shrink-0"
          style={{ borderTop: "1px solid oklch(var(--sidebar-border))" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-3.5 h-3.5 text-white/60" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-white/70 truncate font-medium leading-none">
                {currentUser?.fullName ?? currentUser?.name ?? "User"}
              </p>
              <p className="text-[10px] text-white/30 mt-0.5 capitalize leading-none">
                {currentUser?.role ?? ""}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
