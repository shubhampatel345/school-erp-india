import { useEffect, useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import { useApp } from "./context/AppContext";
import { AppProvider } from "./context/AppContext";
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
import Login from "./pages/Login";
import PromoteStudents from "./pages/PromoteStudents";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Students from "./pages/Students";
import Transport from "./pages/Transport";
import { isApiConfigured } from "./utils/api";
import { dataService } from "./utils/dataService";

function AppRoutes() {
  const { currentUser } = useApp();
  const [activePage, setActivePage] = useState("dashboard");
  const [appReady, setAppReady] = useState(false);

  // Server-first loading: after login, wait for initial MySQL data fetch
  // before rendering any page. This prevents stale/empty data on first load.
  useEffect(() => {
    if (!currentUser) {
      setAppReady(false);
      return;
    }
    if (!isApiConfigured()) {
      // Offline mode — no server, render immediately
      setAppReady(true);
      return;
    }
    // If DataService already has data ready (from AppContext init), render
    if (dataService.isReady()) {
      setAppReady(true);
      return;
    }
    // Otherwise wait for DataService init to complete then render
    void dataService.waitForInit().then(() => setAppReady(true));
    // Safety timeout: never block more than 8 seconds
    const timer = setTimeout(() => setAppReady(true), 8000);
    return () => clearTimeout(timer);
  }, [currentUser]);

  if (!currentUser) return <Login />;

  const navigate = (page: string) => setActivePage(page);

  const renderPage = () => {
    if (activePage === "dashboard") return <Dashboard onNavigate={navigate} />;
    if (activePage === "students") return <Students onNavigate={navigate} />;
    if (activePage === "attendance") return <Attendance />;
    if (activePage === "calling") return <Calling />;
    if (activePage === "chat") return <Chat />;
    if (activePage.startsWith("fees/") || activePage === "fees") {
      const tab = activePage.includes("/")
        ? activePage.split("/")[1]
        : "collect";
      return <Fees initialTab={tab} />;
    }
    if (
      activePage.startsWith("examinations/") ||
      activePage === "examinations"
    ) {
      const tab = activePage.includes("/")
        ? activePage.split("/")[1]
        : "timetable";
      return <Examinations initialTab={tab} />;
    }
    if (activePage.startsWith("hr/") || activePage === "hr") {
      const tab = activePage.includes("/") ? activePage.split("/")[1] : "staff";
      return <HR onNavigate={navigate} initialTab={tab} />;
    }
    if (activePage.startsWith("academics/") || activePage === "academics") {
      const tab = activePage.includes("/")
        ? activePage.split("/")[1]
        : "classes";
      return <Academics initialTab={tab} />;
    }
    if (
      activePage.startsWith("communication/") ||
      activePage === "communication"
    ) {
      const tab = activePage.includes("/")
        ? activePage.split("/")[1]
        : "whatsapp";
      return <Communication initialTab={tab} />;
    }
    if (activePage.startsWith("settings/") || activePage === "settings") {
      const tab = activePage.includes("/")
        ? activePage.split("/")[1]
        : "profile";
      return <Settings initialTab={tab} />;
    }
    if (activePage === "promote") return <PromoteStudents />;
    if (activePage === "transport") return <Transport />;
    if (activePage === "inventory") return <Inventory />;
    if (activePage === "expenses") return <Expenses />;
    if (activePage === "homework") return <HomeworkPage />;
    if (activePage === "certificates") return <Certificates />;
    if (activePage === "alumni") return <AlumniPage />;
    if (activePage === "reports") return <Reports />;
    if (activePage === "documentation") return <Documentation />;
    return <Dashboard onNavigate={navigate} />;
  };

  return (
    <Layout activePage={activePage} onNavigate={navigate}>
      {!appReady ? (
        <div className="flex flex-col items-center justify-center h-full gap-4 bg-background">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-base font-semibold text-foreground font-display">
              SHUBH SCHOOL ERP
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Loading data from server…
            </p>
          </div>
        </div>
      ) : (
        <ErrorBoundary key={activePage}>{renderPage()}</ErrorBoundary>
      )}
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
