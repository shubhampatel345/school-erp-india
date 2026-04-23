import {
  BookOpen,
  CalendarDays,
  FileText,
  Layout,
  MonitorPlay,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "../components/ui/badge";
import AdmitCards from "./examinations/AdmitCards";
import ExamResults from "./examinations/ExamResults";
import ExamTimetableMaker from "./examinations/ExamTimetableMaker";
import OnlineTests from "./examinations/OnlineTests";
import ResultTemplateDesigner from "./examinations/ResultTemplateDesigner";
import TeacherTimetable from "./examinations/TeacherTimetable";

const TABS = [
  { id: "timetable", label: "Exam Timetable", icon: CalendarDays },
  { id: "teacher", label: "Teacher Timetable", icon: UserCheck },
  { id: "results", label: "Exam Results", icon: BookOpen },
  { id: "admitcards", label: "Admit Cards", icon: FileText },
  { id: "online", label: "Online Tests", icon: MonitorPlay },
  { id: "designer", label: "Result Designer", icon: Layout },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface ExaminationsProps {
  initialTab?: string;
}

export default function Examinations({ initialTab }: ExaminationsProps) {
  const [activeTab, setActiveTab] = useState<TabId>(
    (initialTab as TabId) ?? "timetable",
  );

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">
          Examinations
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Exam timetables, teacher schedules, results, admit cards, online tests
          with auto-grading, and custom result card designer
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
              data-ocid={`exam.tab.${tab.id}`}
            >
              <Icon size={15} />
              {tab.label}
              {tab.id === "online" && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 ml-0.5 hidden sm:inline-flex"
                >
                  AI
                </Badge>
              )}
              {tab.id === "designer" && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 ml-0.5 hidden sm:inline-flex"
                >
                  New
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      <div>
        {activeTab === "timetable" && <ExamTimetableMaker />}
        {activeTab === "teacher" && <TeacherTimetable />}
        {activeTab === "results" && <ExamResults />}
        {activeTab === "admitcards" && <AdmitCards />}
        {activeTab === "online" && <OnlineTests />}
        {activeTab === "designer" && <ResultTemplateDesigner />}
      </div>
    </div>
  );
}
