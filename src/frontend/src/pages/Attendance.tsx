/**
 * Attendance — Main module shell for SHUBH SCHOOL ERP
 * Tabs: Daily | QR Scanner | Face Recognition | Welcome Display | Summary | Biometric | Settings
 */
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  CalendarCheck,
  Fingerprint,
  Monitor,
  PieChart,
  QrCode,
  Settings,
} from "lucide-react";
import { useState } from "react";
import ErrorBoundary from "../components/ErrorBoundary";
import AttendanceSettings from "./attendance/AttendanceSettings";
import AttendanceSummary from "./attendance/AttendanceSummary";
import BiometricDevices from "./attendance/BiometricDevices";
import DailyAttendance from "./attendance/DailyAttendance";
import FaceAttendance from "./attendance/FaceAttendance";
import QRAttendance from "./attendance/QRAttendance";
import WelcomeDisplay from "./attendance/WelcomeDisplay";

const TABS = [
  {
    id: "daily",
    label: "Daily Attendance",
    short: "Daily",
    icon: CalendarCheck,
  },
  { id: "qr", label: "QR / RFID", short: "QR", icon: QrCode, badge: "Scanner" },
  {
    id: "face",
    label: "Face Recognition",
    short: "Face",
    icon: Brain,
    badge: "AI",
  },
  {
    id: "display",
    label: "Welcome Display",
    short: "Display",
    icon: Monitor,
    badge: "TV",
  },
  { id: "summary", label: "Reports", short: "Reports", icon: PieChart },
  { id: "biometric", label: "Biometric", short: "Bio", icon: Fingerprint },
  { id: "settings", label: "Settings", short: "Settings", icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Attendance() {
  const [activeTab, setActiveTab] = useState<TabId>("daily");
  const [date, setDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-card border-b px-4 lg:px-6 pt-5 pb-0">
        <div className="mb-3">
          <h1 className="text-xl font-bold font-display text-foreground">
            Attendance
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Daily entry, QR scanning, AI face recognition and biometric sync
          </p>
        </div>

        {/* Tab bar */}
        <div
          className="flex gap-0 overflow-x-auto scrollbar-thin"
          role="tablist"
          aria-label="Attendance navigation"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-ocid={`attendance.${tab.id}.tab`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex-shrink-0 ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.short}</span>
                {"badge" in tab && (
                  <Badge
                    variant="secondary"
                    className="text-xs px-1.5 py-0 hidden sm:inline-flex"
                  >
                    {tab.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-4 lg:p-6 animate-fade-in">
        {activeTab === "daily" && (
          <ErrorBoundary key="daily">
            <DailyAttendance date={date} onDateChange={setDate} />
          </ErrorBoundary>
        )}
        {activeTab === "qr" && (
          <ErrorBoundary key="qr">
            <QRAttendance date={date} />
          </ErrorBoundary>
        )}
        {activeTab === "face" && (
          <ErrorBoundary key="face">
            <FaceAttendance date={date} />
          </ErrorBoundary>
        )}
        {activeTab === "display" && (
          <ErrorBoundary key="display">
            <WelcomeDisplay />
          </ErrorBoundary>
        )}
        {activeTab === "summary" && (
          <ErrorBoundary key="summary">
            <AttendanceSummary date={date} onDateChange={setDate} />
          </ErrorBoundary>
        )}
        {activeTab === "biometric" && (
          <ErrorBoundary key="biometric">
            <BiometricDevices />
          </ErrorBoundary>
        )}
        {activeTab === "settings" && (
          <ErrorBoundary key="settings">
            <AttendanceSettings />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}
