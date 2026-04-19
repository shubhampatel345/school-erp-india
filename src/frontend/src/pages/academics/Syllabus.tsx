/**
 * Syllabus — rebuild using useApp() context
 * Syllabus entries saved via saveData/updateData/deleteData
 */
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GraduationCap, Loader2, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { ClassSection, Subject } from "../../types";
import { generateId } from "../../utils/localStorage";

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

function getProgress(entry: SyllabusEntry): number {
  if (entry.chapters.length === 0) return 0;
  const done = entry.chapters.filter((c) => c.status === "Completed").length;
  return Math.round((done / entry.chapters.length) * 100);
}

export default function Syllabus() {
  const { getData, saveData, updateData, deleteData } = useApp();
  const [saving, setSaving] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [newChapter, setNewChapter] = useState("");

  // Form state for new entry
  const [selClass, setSelClass] = useState("");
  const [selSection, setSelSection] = useState("");
  const [selSubject, setSelSubject] = useState("");

  const classesData = getData("classes") as ClassSection[];
  const subjectsData = getData("subjects") as Subject[];
  const entries = getData("syllabus") as SyllabusEntry[];

  const availableSections =
    classesData.find((c) => (c.name ?? c.className ?? "") === selClass)
      ?.sections ?? [];

  const filteredSubjects = selClass
    ? subjectsData.filter((s) => s.classes.includes(selClass))
    : subjectsData;

  async function handleAddEntry() {
    if (!selClass || !selSection || !selSubject) {
      toast.error("Please select class, section, and subject");
      return;
    }
    const subj = subjectsData.find((s) => s.id === selSubject);
    if (!subj) return;

    const existing = entries.find(
      (e) =>
        e.className === selClass &&
        e.section === selSection &&
        e.subjectId === selSubject,
    );
    if (existing) {
      setActiveEntryId(existing.id);
      setShowAddEntry(false);
      toast.info("Syllabus entry already exists — showing it");
      return;
    }

    setSaving(true);
    try {
      const newEntry: Record<string, unknown> = {
        id: generateId(),
        className: selClass,
        section: selSection,
        subjectId: selSubject,
        subjectName: subj.name,
        chapters: [],
      };
      const saved = await saveData("syllabus", newEntry);
      setActiveEntryId(
        (saved as unknown as SyllabusEntry).id ?? (newEntry.id as string),
      );
      setShowAddEntry(false);
      toast.success("Syllabus entry created");
    } catch {
      toast.error("Failed to create syllabus entry");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddChapter(entryId: string) {
    if (!newChapter.trim()) return;
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;
    const chapter: Chapter = {
      id: generateId(),
      name: newChapter.trim(),
      status: "Not Started",
    };
    const updatedChapters = [...entry.chapters, chapter];
    await updateData("syllabus", entryId, { chapters: updatedChapters });
    setNewChapter("");
  }

  async function updateChapterStatus(
    entryId: string,
    chapterId: string,
    status: ProgressStatus,
  ) {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;
    const updatedChapters = entry.chapters.map((ch) =>
      ch.id === chapterId ? { ...ch, status } : ch,
    );
    await updateData("syllabus", entryId, { chapters: updatedChapters });
  }

  async function deleteChapter(entryId: string, chapterId: string) {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;
    const updatedChapters = entry.chapters.filter((ch) => ch.id !== chapterId);
    await updateData("syllabus", entryId, { chapters: updatedChapters });
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this syllabus entry?")) return;
    await deleteData("syllabus", id);
    if (activeEntryId === id) setActiveEntryId(null);
    toast.success("Syllabus entry deleted");
  }

  const activeEntry = entries.find((e) => e.id === activeEntryId);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Syllabus Tracker
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track chapter-wise progress per class and subject
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddEntry(true)}
          data-ocid="syllabus.add_button"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Syllabus
        </Button>
      </div>

      {/* New Entry Form */}
      {showAddEntry && (
        <Card className="p-5 border-primary/30 bg-primary/5 space-y-4 max-w-lg">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-foreground">New Syllabus Entry</p>
            <button
              type="button"
              onClick={() => setShowAddEntry(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                Class
              </span>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-card"
                value={selClass}
                onChange={(e) => {
                  setSelClass(e.target.value);
                  setSelSection("");
                  setSelSubject("");
                }}
                data-ocid="syllabus.class-select"
              >
                <option value="">Select</option>
                {classesData.map((c) => {
                  const n = c.name ?? c.className ?? "";
                  return (
                    <option key={c.id} value={n}>
                      {n === "Nursery" || n === "LKG" || n === "UKG"
                        ? n
                        : `Class ${n}`}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                Section
              </span>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-card"
                value={selSection}
                onChange={(e) => setSelSection(e.target.value)}
                disabled={!selClass}
                data-ocid="syllabus.section-select"
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
              <span className="text-xs font-medium text-muted-foreground">
                Subject
              </span>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-card"
                value={selSubject}
                onChange={(e) => setSelSubject(e.target.value)}
                disabled={!selClass}
                data-ocid="syllabus.subject-select"
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
            <Button
              size="sm"
              onClick={handleAddEntry}
              disabled={saving || !selClass || !selSection || !selSubject}
              data-ocid="syllabus.create_button"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
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
        {/* Left: Entry list */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Entries ({entries.length})
          </p>
          {entries.length === 0 ? (
            <Card className="p-6 text-center" data-ocid="syllabus.empty_state">
              <p className="text-sm text-muted-foreground">
                No syllabus entries yet.
              </p>
            </Card>
          ) : (
            entries.map((entry, idx) => {
              const pct = getProgress(entry);
              return (
                <Card
                  key={entry.id}
                  className={`p-3 cursor-pointer transition-colors ${
                    activeEntryId === entry.id
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setActiveEntryId(entry.id)}
                  data-ocid={`syllabus.item.${idx + 1}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {entry.subjectName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.className}-{entry.section}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteEntry(entry.id);
                      }}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      aria-label="Delete syllabus entry"
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

        {/* Right: Chapter detail */}
        <div className="lg:col-span-2">
          {!activeEntry ? (
            <Card className="p-10 text-center">
              <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                Select a subject to manage its chapters
              </p>
            </Card>
          ) : (
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">
                    {activeEntry.subjectName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Class {activeEntry.className}-{activeEntry.section}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {getProgress(activeEntry)}%
                  </p>
                  <p className="text-xs text-muted-foreground">complete</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${getProgress(activeEntry)}%` }}
                />
              </div>

              {/* Add chapter */}
              <div className="flex gap-2">
                <Input
                  placeholder="Chapter name…"
                  value={newChapter}
                  onChange={(e) => setNewChapter(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddChapter(activeEntry.id);
                  }}
                  data-ocid="syllabus.chapter_input"
                />
                <Button
                  size="sm"
                  onClick={() => handleAddChapter(activeEntry.id)}
                  disabled={!newChapter.trim()}
                  data-ocid="syllabus.add-chapter_button"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Chapter list */}
              {activeEntry.chapters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No chapters yet. Add the first chapter above.
                </p>
              ) : (
                <div className="space-y-2">
                  {activeEntry.chapters.map((ch, i) => (
                    <div
                      key={ch.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border"
                      data-ocid={`syllabus.chapter.${i + 1}`}
                    >
                      <span className="text-xs text-muted-foreground w-5 text-center font-mono">
                        {i + 1}
                      </span>
                      <p className="flex-1 text-sm font-medium text-foreground truncate min-w-0">
                        {ch.name}
                      </p>
                      <select
                        className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${STATUS_COLORS[ch.status]}`}
                        value={ch.status}
                        onChange={(e) =>
                          updateChapterStatus(
                            activeEntry.id,
                            ch.id,
                            e.target.value as ProgressStatus,
                          )
                        }
                      >
                        <option value="Not Started">Not Started</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => deleteChapter(activeEntry.id, ch.id)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        aria-label="Delete chapter"
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
