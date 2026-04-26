/**
 * HR — Main module shell
 * Tabs: Staff Directory | Payroll | Payslips | Leave Management | Subject Assignment
 */
import { BookOpen, Calendar, CreditCard, FileText, Users } from "lucide-react";
import { useState } from "react";
import ErrorBoundary from "../components/ErrorBoundary";
import LeaveManagement from "./hr/LeaveManagement";
import Payroll from "./hr/Payroll";
import Payslips from "./hr/Payslips";
import StaffDirectory from "./hr/StaffDirectory";
import SubjectAssignment from "./hr/SubjectAssignment";

const TABS = [
  { id: "staff", label: "Staff Directory", icon: Users },
  { id: "payroll", label: "Payroll", icon: CreditCard },
  { id: "payslips", label: "Payslips", icon: FileText },
  { id: "leave", label: "Leave Management", icon: Calendar },
  { id: "subjects", label: "Subject Assignment", icon: BookOpen },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface HRProps {
  onNavigate?: (page: string) => void;
  initialTab?: string;
}

const TAB_MAP: Record<string, TabId> = {
  staff: "staff",
  payroll: "payroll",
  payslips: "payslips",
  leave: "leave",
  subjects: "subjects",
};

export default function HR({ onNavigate, initialTab }: HRProps) {
  const resolvedTab = initialTab
    ? (TAB_MAP[initialTab] ?? (initialTab as TabId))
    : "staff";
  const [activeTab, setActiveTab] = useState<TabId>(resolvedTab);

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div
        className="bg-card border-b px-4 lg:px-6 flex gap-0 overflow-x-auto sticky top-0 z-10 scrollbar-thin"
        role="tablist"
        aria-label="HR navigation"
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
              data-ocid={`hr.${tab.id}.tab`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex-shrink-0 ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">
                {tab.id === "staff"
                  ? "Staff"
                  : tab.id === "payroll"
                    ? "Payroll"
                    : tab.id === "payslips"
                      ? "Slips"
                      : tab.id === "leave"
                        ? "Leave"
                        : "Subjects"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto animate-fade-in">
        {activeTab === "staff" && (
          <ErrorBoundary key="staff">
            <StaffDirectory onNavigate={onNavigate} />
          </ErrorBoundary>
        )}
        {activeTab === "payroll" && (
          <ErrorBoundary key="payroll">
            <Payroll />
          </ErrorBoundary>
        )}
        {activeTab === "payslips" && (
          <ErrorBoundary key="payslips">
            <Payslips />
          </ErrorBoundary>
        )}
        {activeTab === "leave" && (
          <ErrorBoundary key="leave">
            <LeaveManagement />
          </ErrorBoundary>
        )}
        {activeTab === "subjects" && (
          <ErrorBoundary key="subjects">
            <SubjectAssignment />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}
