import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  GraduationCap,
  LayoutGrid,
  Users2,
} from "lucide-react";
import { useState } from "react";
import ClassTeachers from "./academics/ClassTeachers";
import ClassTimetable from "./academics/ClassTimetable";
import ClassesSections from "./academics/ClassesSections";
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

export default function Academics() {
  const [activeTab, setActiveTab] = useState<TabId>("classes");

  return (
    <div className="flex flex-col h-full">
      <div className="bg-card border-b px-4 lg:px-6 flex gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              data-ocid={`academics-tab-${tab.id}`}
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

      <div className="flex-1 overflow-auto">
        {activeTab === "classes" && <ClassesSections />}
        {activeTab === "subjects" && <Subjects />}
        {activeTab === "class-timetable" && <ClassTimetable />}
        {activeTab === "teacher-timetable" && <TeacherTimetable />}
        {activeTab === "class-teachers" && <ClassTeachers />}
        {activeTab === "syllabus" && <Syllabus />}
      </div>
    </div>
  );
}
