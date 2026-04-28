/**
 * Academics — Main module shell for SHUBH SCHOOL ERP
 * Tabs: Classes & Sections | Subjects | Class Timetable | Teacher Timetable | Class Teachers | Syllabus
 * All data: direct PHP/MySQL via phpApiService. No offline cache, no IndexedDB.
 */
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  GraduationCap,
  LayoutGrid,
  Users2,
} from "lucide-react";
import { useState } from "react";
import ErrorBoundary from "../components/ErrorBoundary";
import ClassTeachers from "./academics/ClassTeachers";
import ClassTimetable from "./academics/ClassTimetable";
import Classes from "./academics/Classes";
import Subjects from "./academics/Subjects";
import Syllabus from "./academics/Syllabus";
import TeacherTimetable from "./academics/TeacherTimetable";

const TABS = [
  { id: "classes", label: "Classes & Sections", icon: LayoutGrid },
  { id: "subjects", label: "Subjects", icon: BookOpen },
  { id: "class-timetable", label: "Class Timetable", icon: CalendarCheck },
  { id: "teacher-timetable", label: "Teacher Timetable", icon: CalendarDays },
  { id: "class-teachers", label: "Class Teachers", icon: Users2 },
  { id: "syllabus", label: "Syllabus", icon: GraduationCap },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface AcademicsProps {
  initialTab?: string;
}

const TAB_MAP: Record<string, TabId> = {
  classes: "classes",
  subjects: "subjects",
  timetable: "teacher-timetable",
  syllabus: "syllabus",
  classteachers: "class-teachers",
  "class-timetable": "class-timetable",
  "teacher-timetable": "teacher-timetable",
  "class-teachers": "class-teachers",
};

export default function Academics({ initialTab }: AcademicsProps) {
  const resolvedTab = initialTab
    ? (TAB_MAP[initialTab] ?? (initialTab as TabId))
    : "classes";
  const [activeTab, setActiveTab] = useState<TabId>(resolvedTab);

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar — sticky top */}
      <div
        className="bg-card border-b px-4 lg:px-6 flex gap-0 overflow-x-auto sticky top-0 z-10 scrollbar-thin"
        role="tablist"
        aria-label="Academics navigation"
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
              data-ocid={`academics.${tab.id}.tab`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors min-w-0 ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden md:inline">{tab.label}</span>
              <span className="md:hidden">
                {tab.id === "classes"
                  ? "Classes"
                  : tab.id === "subjects"
                    ? "Subjects"
                    : tab.id === "class-timetable"
                      ? "CL TT"
                      : tab.id === "teacher-timetable"
                        ? "TR TT"
                        : tab.id === "class-teachers"
                          ? "Teachers"
                          : "Syllabus"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab content — each wrapped in its own error boundary */}
      <div className="flex-1 overflow-auto animate-fade-in">
        {activeTab === "classes" && (
          <ErrorBoundary key="classes">
            <Classes />
          </ErrorBoundary>
        )}
        {activeTab === "subjects" && (
          <ErrorBoundary key="subjects">
            <Subjects />
          </ErrorBoundary>
        )}
        {activeTab === "class-timetable" && (
          <ErrorBoundary key="class-timetable">
            <ClassTimetable />
          </ErrorBoundary>
        )}
        {activeTab === "teacher-timetable" && (
          <ErrorBoundary key="teacher-timetable">
            <TeacherTimetable />
          </ErrorBoundary>
        )}
        {activeTab === "class-teachers" && (
          <ErrorBoundary key="class-teachers">
            <ClassTeachers />
          </ErrorBoundary>
        )}
        {activeTab === "syllabus" && (
          <ErrorBoundary key="syllabus">
            <Syllabus />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}
