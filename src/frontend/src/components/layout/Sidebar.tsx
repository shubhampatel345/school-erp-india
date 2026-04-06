import { cn } from "@/lib/utils";
import {
  Award,
  BarChart3,
  BookMarked,
  BookOpen,
  BookOpenCheck,
  Building2,
  Bus,
  Calendar,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  Download,
  FileText,
  Globe,
  GraduationCap,
  Home,
  LayoutDashboard,
  MessageCircle,
  MessageSquare,
  Monitor,
  Package,
  QrCode,
  Settings,
  TrendingDown,
  TrendingUp,
  UserCircle,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

interface NavChild {
  label: string;
  path: string;
}
interface NavModule {
  icon: React.ReactNode;
  label: string;
  path: string;
  permissionModule?: string;
  allowedRoles?: string[];
  children?: NavChild[];
}

const navModules: NavModule[] = [
  {
    icon: <LayoutDashboard size={15} />,
    label: "Dashboard",
    path: "/",
    permissionModule: "Dashboard and Widgets",
  },
  {
    icon: <CreditCard size={15} />,
    label: "Fees Collection",
    path: "/fees",
    permissionModule: "Fees Collection",
    children: [
      { label: "Collect Fees", path: "/fees" },
      { label: "Offline Bank Payments", path: "/fees" },
      { label: "Search Fees Payment", path: "/fees" },
      { label: "Search Due Fees", path: "/fees" },
      { label: "Fees Master", path: "/fees" },
      { label: "Fees Group", path: "/fees" },
      { label: "Fees Discount", path: "/fees" },
      { label: "Fees Carry Forward", path: "/fees" },
      { label: "Fees Reminder", path: "/fees" },
    ],
  },
  {
    icon: <Users size={15} />,
    label: "Student Information",
    path: "/students",
    permissionModule: "Student Information",
    children: [
      { label: "Student Details", path: "/students" },
      { label: "Student Admission", path: "/students" },
      { label: "Online Admission", path: "/students" },
      { label: "Disabled Students", path: "/students" },
      { label: "Student Categories", path: "/students" },
      { label: "Student House", path: "/students" },
    ],
  },
  {
    icon: <GraduationCap size={15} className="text-green-400" />,
    label: "Promote Students",
    path: "/promote",
    permissionModule: "Student Information",
  },
  {
    icon: <Settings size={15} />,
    label: "System Setting",
    path: "/settings",
    permissionModule: "System Settings",
    children: [
      { label: "General Setting", path: "/settings" },
      { label: "Session Setting", path: "/settings" },
      { label: "Roles Permissions", path: "/settings" },
      { label: "Users", path: "/settings" },
      { label: "Payment Methods", path: "/settings" },
    ],
  },
  {
    icon: <ClipboardCheck size={15} />,
    label: "Attendance",
    path: "/attendance",
    permissionModule: "Student Attendance",
    children: [
      { label: "Student Attendance", path: "/attendance" },
      { label: "Approve Leave", path: "/attendance" },
      { label: "Attendance By Date", path: "/attendance" },
    ],
  },
  {
    icon: <QrCode size={15} className="text-cyan-400" />,
    label: "QR Scanner",
    path: "/qr-scanner",
    allowedRoles: ["super_admin", "admin", "teacher", "driver"],
  },
  {
    icon: <Home size={15} />,
    label: "Front Office",
    path: "/",
    permissionModule: "Front Office",
    children: [
      { label: "Admission Enquiry", path: "/" },
      { label: "Visitor Book", path: "/" },
      { label: "Phone Call Log", path: "/" },
      { label: "Postal Dispatch", path: "/" },
      { label: "Complain", path: "/" },
    ],
  },
  {
    icon: <TrendingUp size={15} />,
    label: "Income",
    path: "/expenses",
    permissionModule: "Income",
    children: [
      { label: "Add Income", path: "/expenses" },
      { label: "Search Income", path: "/expenses" },
      { label: "Income Head", path: "/expenses" },
    ],
  },
  {
    icon: <TrendingDown size={15} />,
    label: "Expenses",
    path: "/expenses",
    permissionModule: "Expense",
    children: [
      { label: "Add Expense", path: "/expenses" },
      { label: "Search Expense", path: "/expenses" },
      { label: "Expense Head", path: "/expenses" },
    ],
  },
  {
    icon: <FileText size={15} />,
    label: "Examinations",
    path: "/examinations",
    permissionModule: "Examination",
    children: [
      { label: "Exam Group", path: "/examinations" },
      { label: "Exam Schedule", path: "/examinations" },
      { label: "Exam Result", path: "/examinations" },
      { label: "Design Admit Card", path: "/examinations" },
      { label: "Print Marksheet", path: "/examinations" },
      { label: "Marks Grade", path: "/examinations" },
      { label: "Marks Division", path: "/examinations" },
    ],
  },
  {
    icon: <Monitor size={15} />,
    label: "Online Examinations",
    path: "/examinations",
    permissionModule: "Online Examination",
    children: [
      { label: "Online Exam", path: "/examinations" },
      { label: "Question Bank", path: "/examinations" },
    ],
  },
  {
    icon: <BookOpen size={15} />,
    label: "Academics",
    path: "/academics",
    permissionModule: "Academics",
    children: [
      { label: "Class Timetable", path: "/academics" },
      { label: "Teachers Timetable", path: "/teacher-timetable" },
      { label: "Assign Class Teacher", path: "/academics" },
      { label: "Promote Students", path: "/promote" },
      { label: "Subjects", path: "/academics" },
      { label: "Class", path: "/academics" },
      { label: "Sections", path: "/academics" },
    ],
  },
  {
    icon: <BookMarked size={15} />,
    label: "Lesson Plan",
    path: "/",
    permissionModule: "Lesson Plan",
    children: [
      { label: "Manage Lesson Plan", path: "/" },
      { label: "Lesson", path: "/" },
      { label: "Topic", path: "/" },
    ],
  },
  {
    icon: <Calendar size={15} />,
    label: "Annual Calendar",
    path: "/",
    permissionModule: "Annual Calendar",
    children: [
      { label: "Annual Calendar", path: "/" },
      { label: "Holiday Type", path: "/" },
    ],
  },
  {
    icon: <UserCog size={15} />,
    label: "Human Resource",
    path: "/hr",
    permissionModule: "Human Resource",
    children: [
      { label: "Staff Directory", path: "/hr" },
      { label: "Staff Attendance", path: "/hr" },
      { label: "Payroll", path: "/hr" },
      { label: "Approve Leave Request", path: "/hr" },
      { label: "Apply Leave", path: "/hr" },
      { label: "Leave Type", path: "/hr" },
      { label: "Teachers Rating", path: "/hr" },
      { label: "Department", path: "/hr" },
      { label: "Designation", path: "/hr" },
    ],
  },
  {
    icon: <MessageSquare size={15} />,
    label: "Communicate",
    path: "/communicate",
    permissionModule: "Communicate",
    children: [
      { label: "Notice Board", path: "/communicate" },
      { label: "Send SMS", path: "/communicate" },
      { label: "Email/SMS Log", path: "/communicate" },
      { label: "Email Template", path: "/communicate" },
      { label: "SMS Template", path: "/communicate" },
    ],
  },
  {
    icon: <MessageCircle size={15} style={{ color: "#25D366" }} />,
    label: "WhatsApp",
    path: "/whatsapp",
    permissionModule: "Communicate",
  },
  {
    icon: <Download size={15} />,
    label: "Download Center",
    path: "/",
    permissionModule: "Download Center",
    children: [
      { label: "Upload/Share Content", path: "/" },
      { label: "Video Tutorial", path: "/" },
      { label: "Content Type", path: "/" },
    ],
  },
  {
    icon: <BookOpenCheck size={15} />,
    label: "Homework",
    path: "/homework",
    permissionModule: "Homework",
    children: [
      { label: "Add Homework", path: "/homework" },
      { label: "Daily Assignment", path: "/homework" },
    ],
  },
  {
    icon: <Package size={15} />,
    label: "Inventory",
    path: "/inventory",
    permissionModule: "Inventory",
    children: [
      { label: "Issue Item", path: "/inventory" },
      { label: "Add Item Stock", path: "/inventory" },
      { label: "Add Item", path: "/inventory" },
      { label: "Item Category", path: "/inventory" },
      { label: "Item Store", path: "/inventory" },
    ],
  },
  {
    icon: <Bus size={15} />,
    label: "Transport",
    path: "/transport",
    permissionModule: "Transport",
    children: [
      { label: "Routes", path: "/transport" },
      { label: "Vehicles", path: "/transport" },
      { label: "Assign Vehicle", path: "/transport" },
      { label: "Student Transport Fees", path: "/transport" },
    ],
  },
  {
    icon: <Award size={15} />,
    label: "Certificate",
    path: "/certificate",
    permissionModule: "Certificate",
    children: [
      { label: "Transfer Certificate", path: "/certificate" },
      { label: "Student Certificate", path: "/certificate" },
      { label: "Generate Certificate", path: "/certificate" },
      { label: "Student ID Card", path: "/certificate" },
      { label: "Generate ID Card", path: "/certificate" },
      { label: "Staff ID Card", path: "/certificate" },
    ],
  },
  {
    icon: <Globe size={15} />,
    label: "Front CMS",
    path: "/",
    permissionModule: "Front CMS",
    children: [
      { label: "Event", path: "/" },
      { label: "Gallery", path: "/" },
      { label: "News", path: "/" },
      { label: "Pages", path: "/" },
      { label: "Menus", path: "/" },
    ],
  },
  {
    icon: <UserCircle size={15} />,
    label: "Alumni",
    path: "/alumni",
    permissionModule: "Alumni",
    children: [
      { label: "Manage Alumni", path: "/alumni" },
      { label: "Events", path: "/alumni" },
    ],
  },
  {
    icon: <BarChart3 size={15} />,
    label: "Reports",
    path: "/reports",
    permissionModule: "Reports",
    children: [
      { label: "Student Information", path: "/reports" },
      { label: "Finance", path: "/reports" },
      { label: "Attendance", path: "/reports" },
      { label: "Examinations", path: "/reports" },
      { label: "Human Resource", path: "/reports" },
      { label: "Transport", path: "/reports" },
      { label: "Inventory", path: "/reports" },
      { label: "Alumni", path: "/reports" },
    ],
  },
  {
    icon: <Building2 size={15} />,
    label: "Library",
    path: "/",
    permissionModule: "Library",
    children: [
      { label: "Books List", path: "/" },
      { label: "Issue Return", path: "/" },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  currentPath: string;
  navigate: (path: string) => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({
  collapsed,
  currentPath,
  navigate,
  isMobileOpen,
  onMobileClose,
}: SidebarProps) {
  const [expanded, setExpanded] = useState<string[]>([]);
  const { user, permissions } = useAuth();

  const toggle = (label: string) => {
    setExpanded((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  // On desktop: hidden when collapsed. On mobile: always render when isMobileOpen is true (handled by parent overlay)
  if (collapsed && !isMobileOpen) return null;

  const userRole = user?.role ?? "student";
  const rolePerms = permissions[userRole as keyof typeof permissions] ?? {};

  const visibleModules = navModules.filter((mod) => {
    // Role-explicit allow list
    if (mod.allowedRoles) {
      return mod.allowedRoles.includes(userRole);
    }
    if (!mod.permissionModule) return true;
    const modPerms = rolePerms[mod.permissionModule];
    if (!modPerms) return false;
    return Object.values(modPerms).some((p) => p.view);
  });

  return (
    <aside
      className={cn(
        "flex flex-col flex-shrink-0 border-r border-gray-700 overflow-hidden h-full",
        isMobileOpen ? "w-[220px]" : "w-52",
      )}
      style={{ background: "#1a1f2e" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-700">
        <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center flex-shrink-0">
          <GraduationCap size={18} className="text-white" />
        </div>
        <span className="text-yellow-400 font-bold text-sm flex-1">
          SCHOOL ERP
        </span>
        {/* Close button — mobile only */}
        {isMobileOpen && (
          <button
            type="button"
            onClick={onMobileClose}
            className="text-gray-400 hover:text-white p-1 -mr-1"
            data-ocid="sidebar.close_button"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <div className="px-3 py-1.5 border-b border-gray-700">
        <p className="text-gray-400 text-xs">Current Session: 2025-26</p>
        <p className="text-gray-500 text-xs mt-0.5">Quick Links</p>
      </div>
      {/* Nav */}
      <div className="flex-1 overflow-y-auto">
        {visibleModules.map((mod) => {
          const isActive =
            currentPath === mod.path ||
            (mod.path !== "/" && currentPath.startsWith(mod.path));
          const isExpandedState = expanded.includes(mod.label);
          return (
            <div key={mod.label}>
              <button
                type="button"
                onClick={() => {
                  if (mod.children) toggle(mod.label);
                  else {
                    navigate(mod.path);
                    if (isMobileOpen) onMobileClose();
                  }
                }}
                className={cn(
                  "flex items-center w-full px-3 py-2 text-xs gap-2 hover:bg-gray-700 transition-colors",
                  isActive ? "text-green-400 bg-gray-700/50" : "text-gray-300",
                )}
                data-ocid="sidebar.link"
              >
                <span className="flex-shrink-0">{mod.icon}</span>
                <span className="flex-1 text-left">{mod.label}</span>
                {mod.label === "WhatsApp" && (
                  <span
                    className="text-[9px] px-1 py-0 rounded font-bold"
                    style={{
                      background: "#25D36620",
                      color: "#25D366",
                      border: "1px solid #25D36640",
                    }}
                  >
                    NEW
                  </span>
                )}
                {mod.label === "Promote Students" && (
                  <span
                    className="text-[9px] px-1 py-0 rounded font-bold"
                    style={{
                      background: "#16a34a20",
                      color: "#4ade80",
                      border: "1px solid #16a34a40",
                    }}
                  >
                    NEW
                  </span>
                )}
                {mod.label === "QR Scanner" && (
                  <span
                    className="text-[9px] px-1 py-0 rounded font-bold"
                    style={{
                      background: "#0891b220",
                      color: "#22d3ee",
                      border: "1px solid #0891b240",
                    }}
                  >
                    SCAN
                  </span>
                )}
                {mod.children &&
                  (isExpandedState ? (
                    <ChevronDown size={12} />
                  ) : (
                    <ChevronRight size={12} />
                  ))}
              </button>
              {mod.children && isExpandedState && (
                <div className="bg-gray-900/50">
                  {mod.children.map((child) => (
                    <button
                      type="button"
                      key={child.label}
                      onClick={() => {
                        navigate(child.path);
                        if (isMobileOpen) onMobileClose();
                      }}
                      className="flex items-center w-full pl-8 pr-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 transition-colors"
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
