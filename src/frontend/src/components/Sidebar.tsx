import {
  Award,
  BarChart3,
  BookOpen,
  BookText,
  Bus,
  CalendarCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  HelpCircle,
  IndianRupee,
  LayoutDashboard,
  Library,
  LineChart,
  MessageCircle,
  MessageSquare,
  Package,
  Phone,
  Route,
  Settings,
  TrendingUp,
  UserCheck,
  UserCog,
  Users,
  Video,
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

/** Role-specific menu order maps */
const ROLE_NAV: Record<UserRole | "default", NavItem[]> = {
  superadmin: [
    { id: "dashboard/superadmin", label: "Dashboard", icon: LayoutDashboard },
    { id: "students", label: "Students", icon: Users },
    { id: "fees", label: "Fees", icon: IndianRupee },
    { id: "attendance", label: "Attendance", icon: CalendarCheck },
    { id: "hr", label: "HR / Payroll", icon: UserCog },
    { id: "academics", label: "Academics", icon: BookOpen },
    { id: "examinations", label: "Examinations", icon: FileText },
    { id: "transport", label: "Transport", icon: Bus },
    { id: "library", label: "Library", icon: Library },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "communication", label: "Communication", icon: MessageSquare },
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "virtualclasses", label: "Virtual Classes", icon: Video },
    { id: "expenses", label: "Expenses", icon: TrendingUp },
    { id: "homework", label: "Homework", icon: ClipboardList },
    { id: "alumni", label: "Alumni", icon: UserCheck },
    { id: "promote", label: "Promote Students", icon: BookText },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "analytics", label: "Analytics", icon: LineChart },
    { id: "certificates", label: "Certificates", icon: Award },
    { id: "calling", label: "Calling", icon: Phone },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "settings/usermgmt", label: "User Management", icon: UserCog },
    { id: "documentation", label: "Documentation", icon: HelpCircle },
  ],
  admin: [
    { id: "dashboard/admin", label: "Dashboard", icon: LayoutDashboard },
    { id: "students", label: "Students", icon: Users },
    { id: "fees", label: "Fees", icon: IndianRupee },
    { id: "attendance", label: "Attendance", icon: CalendarCheck },
    { id: "academics", label: "Academics", icon: BookOpen },
    { id: "examinations", label: "Examinations", icon: FileText },
    { id: "transport", label: "Transport", icon: Bus },
    { id: "library", label: "Library", icon: Library },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "communication", label: "Communication", icon: MessageSquare },
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "certificates", label: "Certificates", icon: Award },
    { id: "documentation", label: "Documentation", icon: HelpCircle },
  ],
  teacher: [
    { id: "dashboard/teacher", label: "Dashboard", icon: LayoutDashboard },
    { id: "attendance", label: "Attendance", icon: CalendarCheck },
    { id: "homework", label: "Homework", icon: ClipboardList },
    { id: "examinations", label: "Examinations", icon: FileText },
    { id: "academics", label: "Timetable", icon: BookOpen },
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "virtualclasses", label: "Virtual Classes", icon: Video },
    { id: "analytics", label: "Analytics", icon: LineChart },
  ],
  accountant: [
    { id: "dashboard/accountant", label: "Dashboard", icon: LayoutDashboard },
    { id: "fees", label: "Fees", icon: IndianRupee },
    { id: "expenses", label: "Expenses", icon: TrendingUp },
    { id: "reports", label: "Reports", icon: BarChart3 },
  ],
  parent: [
    { id: "dashboard/parent", label: "Dashboard", icon: LayoutDashboard },
    { id: "fees", label: "Fees", icon: IndianRupee },
    { id: "attendance", label: "Attendance", icon: CalendarCheck },
    { id: "examinations", label: "Results", icon: FileText },
    { id: "academics", label: "Timetable", icon: BookOpen },
    { id: "communication", label: "Notices", icon: MessageSquare },
    { id: "chat", label: "Chat", icon: MessageCircle },
  ],
  student: [
    { id: "dashboard/student", label: "Dashboard", icon: LayoutDashboard },
    { id: "examinations", label: "My Results", icon: FileText },
    { id: "attendance", label: "Attendance", icon: CalendarCheck },
    { id: "homework", label: "Homework", icon: ClipboardList },
    { id: "academics", label: "Timetable", icon: BookOpen },
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "analytics", label: "Analytics", icon: LineChart },
  ],
  driver: [
    { id: "dashboard/driver", label: "Dashboard", icon: LayoutDashboard },
    { id: "transport", label: "My Route", icon: Route },
    { id: "attendance", label: "Attendance", icon: CalendarCheck },
    { id: "chat", label: "Chat", icon: MessageCircle },
  ],
  receptionist: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "students", label: "Students", icon: Users },
    { id: "fees", label: "Fees", icon: IndianRupee },
    { id: "attendance", label: "Attendance", icon: CalendarCheck },
    { id: "chat", label: "Chat", icon: MessageCircle },
  ],
  librarian: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "library", label: "Library", icon: Library },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "chat", label: "Chat", icon: MessageCircle },
  ],
  default: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "documentation", label: "Documentation", icon: HelpCircle },
  ],
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

  const navItems: NavItem[] =
    (currentUser?.role
      ? ROLE_NAV[currentUser.role as UserRole]
      : ROLE_NAV.default) ?? ROLE_NAV.default;

  const isActive = (id: string) =>
    activePage === id ||
    activePage.startsWith(`${id}/`) ||
    // Dashboard sub-routes: "dashboard/superadmin" should match when activePage has it
    (id.startsWith("dashboard") && activePage === id);

  return (
    <aside
      className={`h-full flex flex-col transition-smooth overflow-hidden ${collapsed ? "w-14" : "w-60"}`}
      style={{
        backgroundColor: "oklch(var(--sidebar))",
        color: "oklch(var(--sidebar-foreground))",
        borderRight: "1px solid oklch(var(--sidebar-border))",
      }}
      data-ocid="sidebar"
    >
      {/* Logo strip */}
      <div
        className="flex items-center gap-2 h-14 px-3 flex-shrink-0"
        style={{ borderBottom: "1px solid oklch(var(--sidebar-border))" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "oklch(var(--sidebar-accent) / 0.25)" }}
        >
          <GraduationCap
            className="w-4.5 h-4.5"
            style={{ color: "oklch(var(--sidebar-foreground))" }}
          />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span
              className="font-display font-bold text-sm truncate leading-tight block"
              style={{ color: "oklch(var(--sidebar-foreground))" }}
            >
              SHUBH SCHOOL ERP
            </span>
            <span
              className="text-[10px] font-medium leading-none opacity-60 block mt-0.5 capitalize"
              style={{ color: "oklch(var(--sidebar-foreground))" }}
            >
              {currentUser?.role ?? "Portal"}
            </span>
          </div>
        )}
      </div>

      {/* Role-based navigation */}
      <nav
        className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin"
        aria-label="Main navigation"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.id);
          const showUnread = item.id === "chat" && chatUnread > 0;

          return (
            <button
              key={item.id}
              type="button"
              data-ocid={`nav.${item.id.replace(/\//g, "-")}`}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              aria-current={active ? "page" : undefined}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-smooth group relative"
              style={
                active
                  ? {
                      backgroundColor: "oklch(var(--sidebar-accent) / 0.30)",
                      color: "oklch(var(--sidebar-foreground))",
                      borderLeft: "3px solid oklch(var(--sidebar-accent))",
                      paddingLeft: collapsed ? "10px" : "9px",
                      fontWeight: 600,
                    }
                  : {
                      color: "oklch(var(--sidebar-foreground) / 0.80)",
                      borderLeft: "3px solid transparent",
                      paddingLeft: collapsed ? "10px" : "9px",
                    }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    "oklch(var(--sidebar-accent) / 0.15)";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "oklch(var(--sidebar-foreground))";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "oklch(var(--sidebar-foreground) / 0.80)";
                }
              }}
            >
              <div className="relative flex-shrink-0">
                <Icon className="w-4 h-4" />
                {collapsed && showUnread && (
                  <span
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center"
                    style={{
                      backgroundColor: "oklch(0.56 0.22 25)",
                      color: "white",
                    }}
                  >
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
                    <span
                      className="min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1"
                      style={{
                        backgroundColor: "oklch(0.56 0.22 25)",
                        color: "white",
                      }}
                    >
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
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "oklch(var(--sidebar-accent) / 0.18)" }}
            >
              <Users
                className="w-3.5 h-3.5"
                style={{ color: "oklch(var(--sidebar-foreground) / 0.65)" }}
              />
            </div>
            <div className="min-w-0">
              <p
                className="text-[11px] truncate font-medium leading-none"
                style={{ color: "oklch(var(--sidebar-foreground) / 0.90)" }}
              >
                {currentUser?.fullName ?? currentUser?.name ?? "User"}
              </p>
              <p
                className="text-[10px] mt-0.5 capitalize leading-none"
                style={{ color: "oklch(var(--sidebar-foreground) / 0.50)" }}
              >
                {currentUser?.role ?? ""}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
