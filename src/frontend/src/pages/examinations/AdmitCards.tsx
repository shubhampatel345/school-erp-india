import { useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useApp } from "../../context/AppContext";
import type { Student } from "../../types";
import { ls } from "../../utils/localStorage";
import type { SavedTimetable } from "./ExamTimetableMaker";

interface AdmitCard {
  id: string;
  examId: string;
  examName: string;
  studentId: string;
  studentName: string;
  admNo: string;
  class: string;
  section: string;
  dob: string;
  fatherName: string;
  sessionId: string;
  generatedAt: string;
}

function AdmitCardPrint({
  card,
  timetable,
  onClose,
}: {
  card: AdmitCard;
  timetable: SavedTimetable | undefined;
  onClose: () => void;
}) {
  const school = ls.get<{ name: string; address: string; phone?: string }>(
    "school_profile",
    { name: "SHUBH SCHOOL ERP", address: "" },
  );
  const classTable = timetable?.tables.find(
    (t) => t.classKey === `Class ${card.class}${card.section}`,
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="bg-card border border-border rounded-xl w-full max-w-lg shadow-elevated"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
      >
        <div className="p-6 space-y-4 print:p-4">
          <div className="text-center border-b border-border pb-3">
            <h1 className="text-xl font-bold font-display">{school.name}</h1>
            {school.address && (
              <p className="text-sm text-muted-foreground">{school.address}</p>
            )}
            <h2 className="text-base font-semibold mt-1">
              ADMIT CARD — {card.examName}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm bg-muted/30 rounded-lg p-3">
            <div>
              <span className="text-muted-foreground">Name: </span>
              <span className="font-medium">{card.studentName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Adm No: </span>
              <span className="font-medium">{card.admNo}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Class: </span>
              <span className="font-medium">
                {card.class}-{card.section}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Father: </span>
              <span className="font-medium">{card.fatherName}</span>
            </div>
          </div>
          {classTable && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Day
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Subject
                    </th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {classTable.rows.map((row, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: stable row order
                    <tr key={i} className="border-t border-border/50">
                      <td className="px-3 py-1.5 text-muted-foreground text-xs font-mono">
                        {new Date(`${row.date}T12:00`).toLocaleDateString(
                          "en-IN",
                          { day: "2-digit", month: "short" },
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground text-xs">
                        {row.day.slice(0, 3)}
                      </td>
                      <td className="px-3 py-1.5 font-medium">{row.subject}</td>
                      <td className="px-3 py-1.5 text-center text-xs text-muted-foreground">
                        {timetable?.startTime}–{timetable?.endTime}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-between text-xs text-muted-foreground border-t border-border pt-3">
            <span>Student Signature: ___________</span>
            <span>Principal: ___________</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-4 print:hidden border-t border-border pt-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            Print Admit Card
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdmitCards() {
  const { currentSession, getData, saveData, addNotification } = useApp();
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [generating, setGenerating] = useState(false);
  const [printCard, setPrintCard] = useState<AdmitCard | null>(null);

  const savedTimetables = getData("examTimetables") as SavedTimetable[];
  const timetables =
    savedTimetables.length > 0
      ? savedTimetables
      : ls.get<SavedTimetable[]>("exam_timetables", []);
  const admitCards = getData("admitCards") as AdmitCard[];

  const selectedTimetable = timetables.find((t) => t.id === selectedExamId);
  const availableClasses = selectedTimetable
    ? selectedTimetable.tables.map((t) => t.classKey)
    : [];

  const allStudents = getData("students") as Student[];
  const sessionStudents = allStudents.filter(
    (s) =>
      s.sessionId === (currentSession?.id ?? "sess_2025") &&
      s.status === "active",
  );

  const handleGenerate = async () => {
    if (!selectedTimetable || !selectedClass) return;
    setGenerating(true);
    const cls = selectedClass.replace("Class ", "").replace(/[A-Z]$/, "");
    const sec = selectedClass.replace("Class ", "").slice(-1);
    const classStudents = sessionStudents.filter(
      (s) => s.class === cls && s.section === sec,
    );

    for (const student of classStudents) {
      const existing = admitCards.find(
        (c) => c.examId === selectedExamId && c.studentId === student.id,
      );
      if (!existing) {
        await saveData("admitCards", {
          examId: selectedExamId,
          examName: selectedTimetable.examName,
          studentId: student.id,
          studentName: student.fullName,
          admNo: student.admNo,
          class: cls,
          section: sec,
          dob: student.dob,
          fatherName: student.fatherName,
          sessionId: currentSession?.id ?? "sess_2025",
          generatedAt: new Date().toISOString(),
        });
      }
    }
    setGenerating(false);
    addNotification(
      `Admit cards generated for ${classStudents.length} students`,
      "success",
      "🎓",
    );
  };

  const filteredCards = admitCards.filter((c) => {
    const matchExam = !selectedExamId || c.examId === selectedExamId;
    const matchClass =
      !selectedClass || `Class ${c.class}${c.section}` === selectedClass;
    return matchExam && matchClass;
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Generate Admit Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Select Exam</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={selectedExamId}
                onChange={(e) => {
                  setSelectedExamId(e.target.value);
                  setSelectedClass("");
                }}
                data-ocid="admit-exam-select"
              >
                <option value="">— Select Exam —</option>
                {timetables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.examName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Class &amp; Section</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={!selectedExamId}
                data-ocid="admit-class-select"
              >
                <option value="">— Select Class —</option>
                {availableClasses.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleGenerate}
                disabled={!selectedExamId || !selectedClass || generating}
                data-ocid="admit-generate-btn"
                className="w-full"
              >
                {generating ? "Generating…" : "Generate Admit Cards"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {timetables.length === 0 && (
        <div
          className="text-center py-14 text-muted-foreground"
          data-ocid="admit.empty_state"
        >
          <p className="text-3xl mb-2">📋</p>
          <p className="font-medium">No exam timetables found</p>
          <p className="text-sm mt-1">
            Create a timetable in the Exam Timetable tab first
          </p>
        </div>
      )}

      {filteredCards.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">
                  Student Name
                </th>
                <th className="px-4 py-3 text-left font-semibold">Adm No</th>
                <th className="px-4 py-3 text-left font-semibold">Class</th>
                <th className="px-4 py-3 text-left font-semibold">Exam</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCards.map((card, i) => (
                <tr
                  key={card.id}
                  className="border-t border-border hover:bg-muted/20"
                  data-ocid={`admit.item.${i + 1}`}
                >
                  <td className="px-4 py-2.5 font-medium">
                    {card.studentName}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {card.admNo}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="secondary">
                      {card.class}-{card.section}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                    {card.examName}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPrintCard(card)}
                      data-ocid={`admit-print-${i + 1}`}
                    >
                      Print
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {printCard && (
        <AdmitCardPrint
          card={printCard}
          timetable={timetables.find((t) => t.id === printCard.examId)}
          onClose={() => setPrintCard(null)}
        />
      )}
    </div>
  );
}
