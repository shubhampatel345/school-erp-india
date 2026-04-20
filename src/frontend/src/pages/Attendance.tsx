import { Badge } from "@/components/ui/badge";
import {
  Brain,
  ClipboardList,
  Cpu,
  Fingerprint,
  Monitor,
  PieChart,
  QrCode,
} from "lucide-react";
import { useState } from "react";
import AttendanceSummary from "./attendance/AttendanceSummary";
import BiometricDevices from "./attendance/BiometricDevices";
import FaceAttendance from "./attendance/FaceAttendance";
import ManualAttendance from "./attendance/ManualAttendance";
import QRAttendance from "./attendance/QRAttendance";
import RFIDAttendance from "./attendance/RFIDAttendance";
import WelcomeDisplay from "./attendance/WelcomeDisplay";

const TABS = [
  { id: "manual", label: "Manual Entry", icon: ClipboardList },
  { id: "rfid", label: "RFID / Biometric", icon: Fingerprint },
  { id: "qr", label: "QR Scanner", icon: QrCode },
  { id: "face", label: "Face Recognition", icon: Brain },
  { id: "display", label: "Welcome Display", icon: Monitor },
  { id: "summary", label: "Summary", icon: PieChart },
  { id: "biometric", label: "Biometric Devices", icon: Cpu },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Attendance() {
  const [activeTab, setActiveTab] = useState<TabId>("manual");
  const [date, setDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">
          Attendance
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Track student and staff attendance via manual entry, QR code, RFID,
          and biometric scanning
        </p>
      </div>

      <div
        className="flex gap-1 bg-muted/50 rounded-xl p-1 flex-wrap"
        role="tablist"
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
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center min-w-[100px] ${
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">
                {tab.id === "manual"
                  ? "Manual"
                  : tab.id === "rfid"
                    ? "RFID"
                    : tab.id === "qr"
                      ? "QR"
                      : tab.id === "face"
                        ? "Face"
                        : tab.id === "display"
                          ? "Display"
                          : tab.id === "biometric"
                            ? "Devices"
                            : "Summary"}
              </span>
              {tab.id === "face" && (
                <Badge
                  variant="secondary"
                  className="text-xs px-1.5 py-0 ml-1 hidden sm:inline-flex"
                >
                  AI
                </Badge>
              )}
              {tab.id === "display" && (
                <Badge
                  variant="secondary"
                  className="text-xs px-1.5 py-0 ml-1 hidden sm:inline-flex"
                >
                  TV
                </Badge>
              )}
              {tab.id === "biometric" && (
                <Badge
                  variant="secondary"
                  className="text-xs px-1.5 py-0 ml-1 hidden sm:inline-flex"
                >
                  ESSL
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      <div>
        {activeTab === "manual" && (
          <ManualAttendance date={date} onDateChange={setDate} />
        )}
        {activeTab === "rfid" && (
          <RFIDAttendance date={date} onDateChange={setDate} />
        )}
        {activeTab === "qr" && <QRAttendance date={date} />}
        {activeTab === "face" && <FaceAttendance date={date} />}
        {activeTab === "display" && <WelcomeDisplay />}
        {activeTab === "summary" && (
          <AttendanceSummary date={date} onDateChange={setDate} />
        )}
        {activeTab === "biometric" && <BiometricDevices />}
      </div>
    </div>
  );
}
