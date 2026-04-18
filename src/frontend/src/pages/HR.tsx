import { Calendar, CreditCard, Users } from "lucide-react";
import { useState } from "react";
import LeaveManagement from "./hr/LeaveManagement";
import Payroll from "./hr/Payroll";
import StaffDirectory from "./hr/StaffDirectory";

const TABS = [
  { id: "staff", label: "Staff Directory", icon: Users },
  { id: "payroll", label: "Payroll", icon: CreditCard },
  { id: "leave", label: "Leave Management", icon: Calendar },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface HRProps {
  onNavigate?: (page: string) => void;
  initialTab?: string;
}

export default function HR({ onNavigate, initialTab }: HRProps) {
  const [activeTab, setActiveTab] = useState<TabId>(
    (initialTab as TabId) ?? "staff",
  );

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div className="bg-card border-b px-4 lg:px-6 flex gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              data-ocid={`hr-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "staff" && <StaffDirectory onNavigate={onNavigate} />}
        {activeTab === "payroll" && <Payroll />}
        {activeTab === "leave" && <LeaveManagement />}
      </div>
    </div>
  );
}
