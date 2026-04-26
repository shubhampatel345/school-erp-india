import { useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import { AppProvider, useApp } from "./context/AppContext";
import Academics from "./pages/Academics";
import AlumniPage from "./pages/Alumni";
import Attendance from "./pages/Attendance";
import Calling from "./pages/Calling";
import Certificates from "./pages/Certificates";
import Chat from "./pages/Chat";
import Communication from "./pages/Communication";
import Dashboard from "./pages/Dashboard";
import Documentation from "./pages/Documentation";
import Examinations from "./pages/Examinations";
import Expenses from "./pages/Expenses";
import Fees from "./pages/Fees";
import HR from "./pages/HR";
import HomeworkPage from "./pages/Homework";
import Inventory from "./pages/Inventory";
import Library from "./pages/Library";
import Login from "./pages/Login";
import PromoteStudents from "./pages/PromoteStudents";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Students from "./pages/Students";
import Transport from "./pages/Transport";
import VirtualClasses from "./pages/VirtualClasses";
import StudentAnalytics from "./pages/analytics/StudentAnalytics";
import AccountantDashboard from "./pages/dashboards/AccountantDashboard";
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import DriverDashboard from "./pages/dashboards/DriverDashboard";
import ParentDashboard from "./pages/dashboards/ParentDashboard";
import StudentDashboard from "./pages/dashboards/StudentDashboard";
import SuperAdminDashboard from "./pages/dashboards/SuperAdminDashboard";
import TeacherDashboard from "./pages/dashboards/TeacherDashboard";

function getRoleDashboard(role: string): string {
  switch (role) {
    case "superadmin":
      return "dashboard/superadmin";
    case "admin":
      return "dashboard/admin";
    case "teacher":
      return "dashboard/teacher";
    case "accountant":
      return "dashboard/accountant";
    case "parent":
      return "dashboard/parent";
    case "student":
      return "dashboard/student";
    case "driver":
      return "dashboard/driver";
    default:
      return "dashboard";
  }
}

function AppRoutes() {
  const { currentUser } = useApp();

  const [activePage, setActivePage] = useState(() => {
    const stored = sessionStorage.getItem("shubh_current_user");
    if (stored) {
      try {
        const u = JSON.parse(stored) as { role?: string };
        if (u.role) return getRoleDashboard(u.role);
      } catch {
        /* ignore */
      }
    }
    return "dashboard";
  });

  // Not logged in — show login screen (no Layout, no sidebar)
  if (!currentUser) return <Login />;

  const effectivePage =
    activePage === "dashboard"
      ? getRoleDashboard(currentUser.role)
      : activePage;

  const navigate = (page: string) => setActivePage(page);

  const renderPage = () => {
    // Role-specific dashboards
    if (effectivePage === "dashboard/superadmin")
      return <SuperAdminDashboard onNavigate={navigate} />;
    if (effectivePage === "dashboard/admin")
      return <AdminDashboard onNavigate={navigate} />;
    if (effectivePage === "dashboard/teacher")
      return <TeacherDashboard onNavigate={navigate} />;
    if (effectivePage === "dashboard/accountant")
      return <AccountantDashboard onNavigate={navigate} />;
    if (effectivePage === "dashboard/parent")
      return <ParentDashboard onNavigate={navigate} />;
    if (effectivePage === "dashboard/student")
      return <StudentDashboard onNavigate={navigate} />;
    if (effectivePage === "dashboard/driver")
      return <DriverDashboard onNavigate={navigate} />;
    if (effectivePage === "dashboard" || effectivePage.startsWith("dashboard"))
      return <Dashboard onNavigate={navigate} />;

    if (effectivePage === "students") return <Students onNavigate={navigate} />;
    if (effectivePage === "attendance") return <Attendance />;
    if (effectivePage === "calling") return <Calling />;
    if (effectivePage === "virtualclasses") return <VirtualClasses />;
    if (effectivePage === "chat") return <Chat />;
    if (effectivePage === "promote") return <PromoteStudents />;
    if (effectivePage === "transport") return <Transport />;
    if (effectivePage === "inventory") return <Inventory />;
    if (effectivePage === "library") return <Library />;
    if (effectivePage === "expenses") return <Expenses />;
    if (effectivePage === "homework") return <HomeworkPage />;
    if (effectivePage === "certificates") return <Certificates />;
    if (effectivePage === "alumni") return <AlumniPage />;
    if (effectivePage === "reports") return <Reports />;
    if (effectivePage === "documentation") return <Documentation />;
    if (effectivePage === "analytics") return <StudentAnalytics />;

    if (effectivePage.startsWith("fees") || effectivePage === "fees") {
      const tab = effectivePage.includes("/")
        ? effectivePage.split("/")[1]
        : "collect";
      return <Fees initialTab={tab} />;
    }
    if (
      effectivePage.startsWith("examinations") ||
      effectivePage === "examinations"
    ) {
      const tab = effectivePage.includes("/")
        ? effectivePage.split("/")[1]
        : "timetable";
      return <Examinations initialTab={tab} />;
    }
    if (effectivePage.startsWith("hr") || effectivePage === "hr") {
      const tab = effectivePage.includes("/")
        ? effectivePage.split("/")[1]
        : "staff";
      return <HR onNavigate={navigate} initialTab={tab} />;
    }
    if (
      effectivePage.startsWith("academics") ||
      effectivePage === "academics"
    ) {
      const tab = effectivePage.includes("/")
        ? effectivePage.split("/")[1]
        : "classes";
      return <Academics initialTab={tab} />;
    }
    if (
      effectivePage.startsWith("communication") ||
      effectivePage === "communication"
    ) {
      const tab = effectivePage.includes("/")
        ? effectivePage.split("/")[1]
        : "whatsapp";
      return <Communication initialTab={tab} />;
    }
    if (effectivePage.startsWith("settings") || effectivePage === "settings") {
      const colonTab = effectivePage.includes(":")
        ? effectivePage.split(":")[1]
        : null;
      const tab = colonTab
        ? colonTab
        : effectivePage.includes("/")
          ? effectivePage.split("/")[1]
          : "profile";
      return <Settings initialTab={tab} />;
    }

    return <Dashboard onNavigate={navigate} />;
  };

  return (
    <Layout activePage={effectivePage} onNavigate={navigate}>
      <ErrorBoundary key={effectivePage}>{renderPage()}</ErrorBoundary>
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}
