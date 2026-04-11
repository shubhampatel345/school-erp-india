import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GraduationCap, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ClassSection, Subject } from "../../types";
import { generateId, ls } from "../../utils/localStorage";

type ProgressStatus = "Not Started" | "In Progress" | "Completed";

interface Chapter {
  id: string;
  name: string;
  status: ProgressStatus;
}

interface SyllabusEntry {
  id: string;
  className: string;
  section: string;
  subjectId: string;
  subjectName: string;
  chapters: Chapter[];
}

const STATUS_COLORS: Record<ProgressStatus, string> = {
  "Not Started": "bg-muted text-muted-foreground",
  "In Progress":
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  Completed:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const PROGRESS_BAR_COLORS: Record<ProgressStatus, string> = {
  "Not Started": "bg-muted-foreground/30",
  "In Progress": "bg-yellow-500",
  Completed: "bg-green-500",
};

export default function Syllabus() {
  const [entries, setEntries] = useState<SyllabusEntry[]>(() =>
    ls.get<SyllabusEntry[]>("syllabus", []),
  );
  const [classes] = useState<ClassSection[]>(() =>
    ls.get<ClassSection[]>("classes", []),
  );
  const [subjects] = useState<Subject[]>(() =>
    ls.get<Subject[]>("academics_subjects", []),
  );
  const [selClass, setSelClass] = useState("");
  const [selSection, setSelSection] = useState("");
  const [selSubject, setSelSubject] = useState("");
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [activeEntry, setActiveEntry] = useState<string | null>(null);
  const [newChapter, setNewChapter] = useState("");

  function saveEntries(updated: SyllabusEntry[]) {
    setEntries(updated);
    ls.set("syllabus", updated);
  }

  const availableSections =
    classes.find((c) => c.className === selClass)?.sections ?? [];

  const filteredSubjects = selClass
    ? subjects.filter((s) => s.classes.includes(selClass))
    : subjects;

  function handleAddEntry() {
    if (!selClass || !selSection || !selSubject)
      return alert("Fill all fields");
    const subj = subjects.find((s) => s.id === selSubject);
    if (!subj) return;
    const exists = entries.find(
      (e) =>
        e.className === selClass &&
        e.section === selSection &&
        e.subjectId === selSubject,
    );
    if (exists) {
      setActiveEntry(exists.id);
      setShowAddEntry(false);
      return;
    }
    const newEntry: SyllabusEntry = {
      id: generateId(),
      className: selClass,
      section: selSection,
      subjectId: selSubject,
      subjectName: subj.name,
      chapters: [],
    };
    const updated = [...entries, newEntry];
    saveEntries(updated);
    setActiveEntry(newEntry.id);
    setShowAddEntry(false);
  }

  function handleAddChapter(entryId: string) {
    if (!newChapter.trim()) return;
    const chapter: Chapter = {
      id: generateId(),
      name: newChapter.trim(),
      status: "Not Started",
    };
    saveEntries(
      entries.map((e) =>
        e.id === entryId ? { ...e, chapters: [...e.chapters, chapter] } : e,
      ),
    );
    setNewChapter("");
  }

  function updateChapterStatus(
    entryId: string,
    chapterId: string,
    status: ProgressStatus,
  ) {
    saveEntries(
      entries.map((e) => {
        if (e.id !== entryId) return e;
        return {
          ...e,
          chapters: e.chapters.map((ch) =>
            ch.id === chapterId ? { ...ch, status } : ch,
          ),
        };
      }),
    );
  }

  function deleteChapter(entryId: string, chapterId: string) {
    saveEntries(
      entries.map((e) => {
        if (e.id !== entryId) return e;
        return {
          ...e,
          chapters: e.chapters.filter((ch) => ch.id !== chapterId),
        };
      }),
    );
  }

  function deleteEntry(id: string) {
    if (!confirm("Delete this syllabus entry?")) return;
    saveEntries(entries.filter((e) => e.id !== id));
    if (activeEntry === id) setActiveEntry(null);
  }

  function getProgress(entry: SyllabusEntry) {
    if (entry.chapters.length === 0) return 0;
    const done = entry.chapters.filter((c) => c.status === "Completed").length;
    return Math.round((done / entry.chapters.length) * 100);
  }

  const active = entries.find((e) => e.id === activeEntry);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Syllabus Tracker
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track chapter-wise syllabus progress per class and subject
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddEntry(true)}
          data-ocid="add-syllabus-btn"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Syllabus
        </Button>
      </div>

      {showAddEntry && (
        <Card className="p-5 border-primary/30 bg-primary/5 space-y-4 max-w-lg">
          <p className="font-semibold">New Syllabus Entry</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <span className="text-sm font-medium">Class</span>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-card"
                value={selClass}
                onChange={(e) => {
                  setSelClass(e.target.value);
                  setSelSection("");
                  setSelSubject("");
                }}
              >
                <option value="">Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.className}>
                    {c.className}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium">Section</span>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-card"
                value={selSection}
                onChange={(e) => setSelSection(e.target.value)}
                disabled={!selClass}
              >
                <option value="">Section</option>
                {availableSections.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium">Subject</span>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-card"
                value={selSubject}
                onChange={(e) => setSelSubject(e.target.value)}
                disabled={!selClass}
              >
                <option value="">Subject</option>
                {filteredSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddEntry}>
              Create
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAddEntry(false)}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left: Subject list */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Subjects ({entries.length})
          </p>
          {entries.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground">No entries yet.</p>
            </Card>
          ) : (
            entries.map((entry) => {
              const pct = getProgress(entry);
              return (
                <Card
                  key={entry.id}
                  className={`p-3 cursor-pointer transition-colors ${
                    activeEntry === entry.id
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setActiveEntry(entry.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {entry.subjectName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Class {entry.className}-{entry.section}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteEntry(entry.id);
                      }}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{entry.chapters.length} chapters</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Right: Chapter list */}
        <div className="lg:col-span-2">
          {!active ? (
            <Card className="p-10 text-center">
              <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                Select a subject to manage chapters
              </p>
            </Card>
          ) : (
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">
                    {active.subjectName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Class {active.className}-{active.section}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {getProgress(active)}%
                  </p>
                  <p className="text-xs text-muted-foreground">complete</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Chapter name..."
                  value={newChapter}
                  onChange={(e) => setNewChapter(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddChapter(active.id);
                  }}
                  data-ocid="chapter-name-input"
                />
                <Button
                  size="sm"
                  onClick={() => handleAddChapter(active.id)}
                  data-ocid="add-chapter-btn"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {active.chapters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No chapters added yet. Add the first chapter above.
                </p>
              ) : (
                <div className="space-y-2">
                  {active.chapters.map((ch, idx) => (
                    <div
                      key={ch.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border"
                    >
                      <span className="text-xs text-muted-foreground w-6 text-center font-mono">
                        {idx + 1}
                      </span>
                      <p className="flex-1 text-sm font-medium text-foreground truncate">
                        {ch.name}
                      </p>
                      <select
                        className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${STATUS_COLORS[ch.status]}`}
                        value={ch.status}
                        onChange={(e) =>
                          updateChapterStatus(
                            active.id,
                            ch.id,
                            e.target.value as ProgressStatus,
                          )
                        }
                      >
                        <option value="Not Started">Not Started</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                      <div
                        className={`w-2 h-2 rounded-full ${PROGRESS_BAR_COLORS[ch.status]}`}
                      />
                      <button
                        type="button"
                        onClick={() => deleteChapter(active.id, ch.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
