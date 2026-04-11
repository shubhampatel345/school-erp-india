import { BookOpen, CalendarDays } from "lucide-react";
import { useState } from "react";
import ExamResults from "./examinations/ExamResults";
import ExamTimetableMaker from "./examinations/ExamTimetableMaker";

const TABS = [
  { id: "timetable", label: "Exam Timetable Maker", icon: CalendarDays },
  { id: "results", label: "Exam Results", icon: BookOpen },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Examinations() {
  const [activeTab, setActiveTab] = useState<TabId>("timetable");

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">
          Examinations
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Create exam timetables, record results and generate marksheets
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
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-smooth whitespace-nowrap ${
                active
                  ? "bg-card text-foreground shadow-card"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-ocid={`exam-tab-${tab.id}`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div>
        {activeTab === "timetable" && <ExamTimetableMaker />}
        {activeTab === "results" && <ExamResults />}
      </div>
    </div>
  );
}
