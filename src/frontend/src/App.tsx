import { useState } from "react";
import Layout from "./components/Layout";
import { useApp } from "./context/AppContext";
import { AppProvider } from "./context/AppContext";
import Academics from "./pages/Academics";
import AlumniPage from "./pages/Alumni";
import Attendance from "./pages/Attendance";
import Certificates from "./pages/Certificates";
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
import Placeholder from "./pages/Placeholder";
import PromoteStudents from "./pages/PromoteStudents";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Students from "./pages/Students";
import Transport from "./pages/Transport";

const PAGE_META: Record<string, { title: string; description?: string }> = {
  "academics/classes": {
    title: "Classes & Sections",
    description: "Manage class and section structure.",
  },
  "academics/subjects": {
    title: "Subjects",
    description: "Define subjects and class assignments.",
  },
  "academics/timetable": {
    title: "Teacher Timetable",
    description: "Build class timetables for teachers.",
  },
  "academics/syllabus": {
    title: "Syllabus",
    description: "Track chapter-wise syllabus progress.",
  },
  "academics/classteachers": {
    title: "Class Teachers",
    description: "Assign class teachers to sections.",
  },
  "hr/payroll": {
    title: "Payroll",
    description: "Process staff salaries and payroll.",
  },
  "hr/leave": {
    title: "Leave Management",
    description: "Track staff leave applications.",
  },
  "examinations/results": {
    title: "Examination Results",
    description: "Record and publish exam results.",
  },
  transport: {
    title: "Transport",
    description: "Manage bus routes and student transport.",
  },
  inventory: {
    title: "Inventory",
    description: "Track stock, purchases, and sales.",
  },
  "communication/whatsapp": {
    title: "WhatsApp Messages",
    description: "Send WhatsApp notifications.",
  },
  "communication/rcs": {
    title: "RCS Messages",
    description: "Send Google RCS messages.",
  },
  "communication/scheduler": {
    title: "Notification Scheduler",
    description: "Configure automated notifications.",
  },
  certificates: {
    title: "Template Studio",
    description: "Design and print school certificates and ID cards.",
  },
  alumni: {
    title: "Alumni",
    description: "Manage alumni directory and events.",
  },
  expenses: {
    title: "Expenses & Income",
    description: "Track school expenses and income.",
  },
  homework: {
    title: "Homework",
    description: "Assign and track student homework.",
  },
  reports: {
    title: "Reports",
    description: "Generate and view school reports.",
  },
  "qr-attendance": {
    title: "QR Attendance Scanner",
    description: "Scan student QR codes to mark attendance.",
  },
  documentation: {
    title: "Documentation",
    description: "User guides, deployment instructions, and help.",
  },
  "settings/profile": {
    title: "School Profile",
    description: "Configure school details.",
  },
  "settings/sessions": {
    title: "Session Management",
    description: "Create and archive academic sessions.",
  },
  "settings/whatsapp": {
    title: "WhatsApp API Settings",
    description: "Configure WhatsApp API credentials.",
  },
  "settings/online-payment": {
    title: "Online Payment",
    description: "Enable GPay, Razorpay, PayU gateways.",
  },
  "settings/notifications": {
    title: "Notification Scheduler",
    description: "Set up automated notification rules.",
  },
  "settings/users": {
    title: "User Management",
    description: "Manage all system user accounts.",
  },
};

function AppRoutes() {
  const { currentUser } = useApp();
  const [activePage, setActivePage] = useState("dashboard");

  if (!currentUser) return <Login />;

  const navigate = (page: string) => setActivePage(page);

  const renderPage = () => {
    if (activePage === "dashboard") return <Dashboard onNavigate={navigate} />;
    if (activePage === "students") return <Students />;
    if (activePage === "attendance") return <Attendance />;
    if (activePage === "fees" || activePage.startsWith("fees/"))
      return <Fees />;
    if (activePage === "examinations" || activePage.startsWith("examinations/"))
      return <Examinations />;
    if (activePage === "hr" || activePage.startsWith("hr/"))
      return <HR onNavigate={navigate} />;
    if (activePage === "promote") return <PromoteStudents />;
    if (activePage === "transport") return <Transport />;
    if (activePage === "inventory") return <Inventory />;
    if (activePage === "expenses") return <Expenses />;
    if (activePage === "homework") return <HomeworkPage />;
    if (activePage === "certificates") return <Certificates />;
    if (activePage === "alumni") return <AlumniPage />;
    if (activePage === "reports") return <Reports />;
    if (activePage === "documentation") return <Documentation />;
    if (
      activePage === "communication" ||
      activePage.startsWith("communication/")
    )
      return <Communication />;
    if (activePage === "settings" || activePage.startsWith("settings/"))
      return <Settings />;
    if (activePage === "academics" || activePage.startsWith("academics/"))
      return <Academics />;
    const meta = PAGE_META[activePage];
    if (meta)
      return (
        <Placeholder
          title={meta.title}
          description={meta.description}
          onNavigate={navigate}
        />
      );
    return <Dashboard onNavigate={navigate} />;
  };

  return (
    <Layout activePage={activePage} onNavigate={navigate}>
      {renderPage()}
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
