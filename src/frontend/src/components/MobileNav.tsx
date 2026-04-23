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
  MoreHorizontal,
  Package,
  Phone,
  Settings,
  TrendingUp,
  UserCheck,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useApp } from "../context/AppContext";

interface MobileNavProps {
  activePage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

// 5 primary tabs on the bottom bar
const BOTTOM_TABS = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard },
  { id: "students", label: "Students", icon: Users },
  { id: "fees", label: "Fees", icon: IndianRupee },
  { id: "attendance", label: "Attend.", icon: CalendarCheck },
  { id: "__menu__", label: "More", icon: MoreHorizontal },
] as const;

// Full menu shown in the drawer
const DRAWER_SECTIONS = [
  {
    title: "",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "students", label: "Students", icon: Users },
    ],
  },
  {
    title: "Fees",
    items: [{ id: "fees", label: "Fees", icon: IndianRupee }],
  },
  {
    title: "Academics",
    items: [
      { id: "attendance", label: "Attendance", icon: CalendarCheck },
      { id: "examinations", label: "Examinations", icon: FileText },
      { id: "academics", label: "Academics", icon: BookOpen },
      { id: "homework", label: "Homework", icon: ClipboardList },
    ],
  },
  {
    title: "HR & Operations",
    items: [
      { id: "hr", label: "HR / Staff", icon: UserCog },
      { id: "transport", label: "Transport", icon: Bus },
      { id: "inventory", label: "Inventory", icon: Package },
      { id: "expenses", label: "Expenses", icon: TrendingUp },
    ],
  },
  {
    title: "Communication",
    items: [
      { id: "chat", label: "Chat", icon: MessageCircle },
      { id: "communication", label: "Communication", icon: MessageSquare },
      { id: "calling", label: "Calling", icon: Phone },
    ],
  },
  {
    title: "Other",
    items: [
      { id: "certificates", label: "Certificates", icon: Award },
      { id: "alumni", label: "Alumni", icon: UserCheck },
      { id: "reports", label: "Reports", icon: BarChart3 },
      { id: "settings", label: "Settings", icon: Settings },
      { id: "documentation", label: "Documentation", icon: HelpCircle },
    ],
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
  const isStudentOrParent =
    currentUser?.role === "student" || currentUser?.role === "parent";

  const handleNav = (id: string) => {
    onNavigate(id);
    onClose();
  };

  // Customise bottom tabs based on role
  let tabs: ReadonlyArray<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = BOTTOM_TABS;
  if (isDriver) {
    tabs = [
      { id: "dashboard", label: "Home", icon: LayoutDashboard },
      { id: "attendance", label: "Attend.", icon: CalendarCheck },
      { id: "chat", label: "Chat", icon: MessageCircle },
      { id: "__menu__", label: "More", icon: MoreHorizontal },
    ];
  } else if (isStudentOrParent) {
    tabs = [
      { id: "dashboard", label: "Home", icon: LayoutDashboard },
      { id: "fees", label: "Fees", icon: IndianRupee },
      { id: "attendance", label: "Attend.", icon: CalendarCheck },
      { id: "chat", label: "Chat", icon: MessageCircle },
      { id: "__menu__", label: "More", icon: MoreHorizontal },
    ];
  }

  const isActive = (id: string) =>
    activePage === id || activePage.startsWith(`${id}/`);

  return (
    <>
      {/* Bottom Tab Bar — hidden on md+ */}
      <nav
        className="mobile-nav flex md:hidden"
        aria-label="Mobile navigation"
        data-ocid="mobile-nav"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.id) || (tab.id === "__menu__" && isOpen);
          return (
            <button
              type="button"
              key={tab.id}
              data-ocid={`mobile-nav.${tab.id.replace(/\//g, "-")}`}
              onClick={() =>
                tab.id === "__menu__"
                  ? isOpen
                    ? onClose()
                    : onNavigate("__menu__")
                  : handleNav(tab.id)
              }
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors min-h-[44px]
                ${active ? "text-primary" : "text-muted-foreground"}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Slide-up Drawer — full module list */}
      {isOpen && (
        <aside
          className="fixed inset-0 z-50 md:hidden flex flex-col justify-end"
          aria-label="Navigation drawer"
          data-ocid="mobile-nav.drawer"
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
          <div className="relative bg-card rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-elevated animate-slide-up">
            {/* Handle bar + close */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
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
                data-ocid="mobile-nav.close_button"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Scrollable module list */}
            <nav className="overflow-y-auto p-3 pb-8 flex-1">
              {DRAWER_SECTIONS.map((section) => (
                <div key={section.title || "main"} className="mb-3">
                  {section.title && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 pt-2 pb-1">
                      {section.title}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-1.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.id);
                      return (
                        <button
                          type="button"
                          key={item.id}
                          data-ocid={`drawer-nav.${item.id.replace(/\//g, "-")}`}
                          onClick={() => handleNav(item.id)}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-smooth
                            ${
                              active
                                ? "bg-primary text-primary-foreground font-semibold"
                                : "hover:bg-muted text-foreground"
                            }`}
                          aria-current={active ? "page" : undefined}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-left text-[13px] truncate">
                            {item.label}
                          </span>
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
