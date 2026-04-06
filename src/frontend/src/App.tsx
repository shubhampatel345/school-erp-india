import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import { Layout } from "./components/layout/Layout";
import {
  AuthProvider,
  generateCredentialsFromData,
  useAuth,
} from "./context/AuthContext";
import { SchoolProvider } from "./context/SchoolContext";
import { Academics } from "./pages/Academics";
import { Alumni } from "./pages/Alumni";
import { Attendance } from "./pages/Attendance";
import { Certificate } from "./pages/Certificate";
import { Communicate } from "./pages/Communicate";
import { Dashboard } from "./pages/Dashboard";
import { DriverDashboard } from "./pages/DriverDashboard";
import { Examinations } from "./pages/Examinations";
import { Expenses } from "./pages/Expenses";
import { Fees } from "./pages/Fees";
import { HumanResource } from "./pages/HR";
import { Homework } from "./pages/Homework";
import { Inventory } from "./pages/Inventory";
import { LoginPage } from "./pages/LoginPage";
import { ParentDashboard } from "./pages/ParentDashboard";
import { PromoteStudents } from "./pages/PromoteStudents";
import { QRScanner } from "./pages/QRScanner";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { Students } from "./pages/Students";
import { TeacherTimetable } from "./pages/TeacherTimetable";
import { Transport } from "./pages/Transport";
import { WhatsApp } from "./pages/WhatsApp";
import { seedDemoDataIfEmpty } from "./utils/demoData";

// Increment this version to wipe all old localStorage data on next load
const APP_DATA_VERSION = "v29-clean";

function clearOldData() {
  const stored = localStorage.getItem("erp_data_version");
  if (stored !== APP_DATA_VERSION) {
    // Clear all ERP data keys
    const erpKeys = Object.keys(localStorage).filter((k) =>
      k.startsWith("erp_"),
    );
    for (const key of erpKeys) {
      localStorage.removeItem(key);
    }
    localStorage.setItem("erp_data_version", APP_DATA_VERSION);
  }
}

function getPath() {
  return window.location.hash.replace("#", "") || "/";
}

function AppInner() {
  const { user } = useAuth();
  const [path, setPath] = useState(getPath);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  // Clear old demo data, then initialize clean defaults
  useEffect(() => {
    clearOldData();
    seedDemoDataIfEmpty();
    const timer = setTimeout(() => {
      generateCredentialsFromData();
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = () => setPath(getPath());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 1500);
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (!user) return <LoginPage />;

  const navigate = (to: string) => {
    window.location.hash = to;
  };

  // Driver-only view
  if (user.role === "driver") {
    if (path === "/qr-scanner")
      return (
        <Layout
          collapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          currentPath={path}
          navigate={navigate}
          isOnline={isOnline}
          isSyncing={isSyncing}
        >
          <QRScanner />
        </Layout>
      );
    return (
      <Layout
        collapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
        currentPath={path}
        navigate={navigate}
        isOnline={isOnline}
        isSyncing={isSyncing}
      >
        <DriverDashboard navigate={navigate} />
      </Layout>
    );
  }

  // Parent-only view
  if (user.role === "parent") {
    return (
      <Layout
        collapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
        currentPath={path}
        navigate={navigate}
        isOnline={isOnline}
        isSyncing={isSyncing}
      >
        {path === "/fees" ? (
          <Fees />
        ) : path === "/attendance" ? (
          <Attendance />
        ) : path === "/communicate" ? (
          <Communicate />
        ) : (
          <ParentDashboard navigate={navigate} />
        )}
      </Layout>
    );
  }

  const renderPage = () => {
    if (path === "/" || path === "") return <Dashboard navigate={navigate} />;
    if (path === "/students") return <Students />;
    if (path === "/fees") return <Fees />;
    if (path === "/attendance") return <Attendance />;
    if (path === "/examinations") return <Examinations />;
    if (path === "/academics") return <Academics />;
    if (path === "/hr") return <HumanResource />;
    if (path === "/transport") return <Transport />;
    if (path === "/reports") return <Reports />;
    if (path === "/communicate") return <Communicate />;
    if (path === "/whatsapp") return <WhatsApp />;
    if (path === "/inventory") return <Inventory />;
    if (path === "/expenses") return <Expenses />;
    if (path === "/certificate") return <Certificate />;
    if (path === "/homework") return <Homework />;
    if (path === "/settings") return <Settings />;
    if (path === "/alumni") return <Alumni />;
    if (path === "/teacher-timetable") return <TeacherTimetable />;
    if (path === "/promote") return <PromoteStudents />;
    if (path === "/qr-scanner") return <QRScanner />;
    return <Dashboard navigate={navigate} />;
  };

  return (
    <Layout
      collapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
      currentPath={path}
      navigate={navigate}
      isOnline={isOnline}
      isSyncing={isSyncing}
    >
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SchoolProvider>
        <AppInner />
        <Toaster />
      </SchoolProvider>
    </AuthProvider>
  );
}
