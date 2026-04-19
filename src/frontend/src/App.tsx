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
import Login from "./pages/Login";
import PromoteStudents from "./pages/PromoteStudents";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Students from "./pages/Students";
import Transport from "./pages/Transport";

function AppRoutes() {
  const { currentUser } = useApp();
  const [activePage, setActivePage] = useState("dashboard");

  if (!currentUser) return <Login />;

  const navigate = (page: string) => setActivePage(page);

  const renderPage = () => {
    if (activePage === "dashboard") return <Dashboard onNavigate={navigate} />;
    if (activePage === "students") return <Students onNavigate={navigate} />;
    if (activePage === "attendance") return <Attendance />;
    if (activePage === "calling") return <Calling />;
    if (activePage === "chat") return <Chat />;
    if (activePage === "promote") return <PromoteStudents />;
    if (activePage === "transport") return <Transport />;
    if (activePage === "inventory") return <Inventory />;
    if (activePage === "expenses") return <Expenses />;
    if (activePage === "homework") return <HomeworkPage />;
    if (activePage === "certificates") return <Certificates />;
    if (activePage === "alumni") return <AlumniPage />;
    if (activePage === "reports") return <Reports />;
    if (activePage === "documentation") return <Documentation />;

    if (activePage.startsWith("fees") || activePage === "fees") {
      const tab = activePage.includes("/")
        ? activePage.split("/")[1]
        : "collect";
      return <Fees initialTab={tab} />;
    }
    if (
      activePage.startsWith("examinations") ||
      activePage === "examinations"
    ) {
      const tab = activePage.includes("/")
        ? activePage.split("/")[1]
        : "timetable";
      return <Examinations initialTab={tab} />;
    }
    if (activePage.startsWith("hr") || activePage === "hr") {
      const tab = activePage.includes("/") ? activePage.split("/")[1] : "staff";
      return <HR onNavigate={navigate} initialTab={tab} />;
    }
    if (activePage.startsWith("academics") || activePage === "academics") {
      const tab = activePage.includes("/")
        ? activePage.split("/")[1]
        : "classes";
      return <Academics initialTab={tab} />;
    }
    if (
      activePage.startsWith("communication") ||
      activePage === "communication"
    ) {
      const tab = activePage.includes("/")
        ? activePage.split("/")[1]
        : "whatsapp";
      return <Communication initialTab={tab} />;
    }
    if (activePage.startsWith("settings") || activePage === "settings") {
      const tab = activePage.includes("/")
        ? activePage.split("/")[1]
        : "profile";
      return <Settings initialTab={tab} />;
    }

    return <Dashboard onNavigate={navigate} />;
  };

  return (
    <Layout activePage={activePage} onNavigate={navigate}>
      <ErrorBoundary key={activePage}>{renderPage()}</ErrorBoundary>
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
