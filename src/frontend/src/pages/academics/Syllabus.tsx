/**
 * Syllabus — Chapter tracker per subject/class
 * Direct API via phpApiService. Progress bar per subject.
 * Mark chapters complete/incomplete.
 */
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { ClassRecord } from "../../utils/phpApiService";
import phpApiService from "../../utils/phpApiService";

type Status = "Not Started" | "In Progress" | "Completed";

interface Chapter {
  id: string;
  name: string;
  status: Status;
}

interface SyllabusEntry {
  id: string;
  className: string;
  section: string;
  subjectId: string;
  subjectName: string;
  chapters: Chapter[];
}

interface SubjectItem {
  id: string;
  name: string;
  classes: string[];
}

const STATUS_CYCLE: Status[] = ["Not Started", "In Progress", "Completed"];

const STATUS_STYLE: Record<Status, string> = {
  "Not Started": "bg-muted text-muted-foreground",
  "In Progress": "bg-yellow-100 text-yellow-800",
  Completed: "bg-emerald-100 text-emerald-800",
};

function progress(entry: SyllabusEntry): number {
  if (!entry.chapters.length) return 0;
  return Math.round(
    (entry.chapters.filter((c) => c.status === "Completed").length /
      entry.chapters.length) *
      100,
  );
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function Syllabus() {
  const { currentUser } = useApp();
  const canWrite =
    currentUser?.role === "superadmin" ||
    currentUser?.role === "admin" ||
    currentUser?.role === "teacher";

  const [entries, setEntries] = useState<SyllabusEntry[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Add entry form
  const [showAdd, setShowAdd] = useState(false);
  const [selClass, setSelClass] = useState("");
  const [selSection, setSelSection] = useState("");
  const [selSubject, setSelSubject] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rawClasses, rawSubjects, rawSyllabus] = await Promise.all([
        phpApiService.getClasses(),
        phpApiService.getSubjects(),
        phpApiService
          .apiGet<SyllabusEntry[]>("academics/syllabus")
          .catch(() => []),
      ]);
      setClasses(rawClasses);
      setSubjects(
        (rawSubjects as Record<string, unknown>[]).map((s) => ({
          id: String(s.id ?? ""),
          name: String(s.name ?? ""),
          classes: Array.isArray(s.classes) ? (s.classes as string[]) : [],
        })),
      );
      setEntries(rawSyllabus ?? []);
    } catch {
      toast.error("Failed to load syllabus");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveEntries(updated: SyllabusEntry[]) {
    setSaving(true);
    try {
      await phpApiService.apiPost("academics/syllabus/save", {
        entries: updated,
      });
      setEntries(updated);
    } catch {
      toast.error("Failed to save — changes are shown locally");
      setEntries(updated);
    } finally {
      setSaving(false);
    }
  }

  function addEntry() {
    if (!selClass || !selSubject) {
      toast.error("Select a class and subject");
      return;
    }
    const subj = subjects.find((s) => s.id === selSubject);
    if (!subj) return;
    const existing = entries.find(
      (e) =>
        e.className === selClass &&
        e.section === selSection &&
        e.subjectId === selSubject,
    );
    if (existing) {
      toast.error("Entry already exists for this class/section/subject");
      return;
    }
    const entry: SyllabusEntry = {
      id: makeId(),
      className: selClass,
      section: selSection,
      subjectId: selSubject,
      subjectName: subj.name,
      chapters: [],
    };
    void saveEntries([...entries, entry]);
    setShowAdd(false);
    setSelClass("");
    setSelSection("");
    setSelSubject("");
    setExpanded((prev) => new Set([...prev, entry.id]));
  }

  function addChapter(entryId: string, chapterName: string) {
    if (!chapterName.trim()) return;
    const updated = entries.map((e) => {
      if (e.id !== entryId) return e;
      return {
        ...e,
        chapters: [
          ...e.chapters,
          {
            id: makeId(),
            name: chapterName.trim(),
            status: "Not Started" as Status,
          },
        ],
      };
    });
    void saveEntries(updated);
  }

  function cycleStatus(entryId: string, chapterId: string) {
    if (!canWrite) return;
    const updated = entries.map((e) => {
      if (e.id !== entryId) return e;
      return {
        ...e,
        chapters: e.chapters.map((c) => {
          if (c.id !== chapterId) return c;
          const idx = STATUS_CYCLE.indexOf(c.status);
          return {
            ...c,
            status: STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length],
          };
        }),
      };
    });
    void saveEntries(updated);
  }

  function deleteChapter(entryId: string, chapterId: string) {
    const updated = entries.map((e) => {
      if (e.id !== entryId) return e;
      return { ...e, chapters: e.chapters.filter((c) => c.id !== chapterId) };
    });
    void saveEntries(updated);
  }

  function deleteEntry(entryId: string) {
    if (!confirm("Delete this syllabus entry?")) return;
    void saveEntries(entries.filter((e) => e.id !== entryId));
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Available sections for selected class
  const sectionsForClass =
    classes.find((c) => c.className === selClass)?.sections ?? ([] as string[]);

  // New chapter input per entry
  const [newChapters, setNewChapters] = useState<Record<string, string>>({});

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-foreground">
            Syllabus Tracker
          </h2>
          <p className="text-sm text-muted-foreground">
            {entries.length} subject{entries.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {saving && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
          {canWrite && (
            <Button
              size="sm"
              onClick={() => setShowAdd(!showAdd)}
              data-ocid="syllabus.add_button"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Entry
            </Button>
          )}
        </div>
      </div>

      {/* Add entry form */}
      {showAdd && canWrite && (
        <Card className="p-4 space-y-3 border-primary/20">
          <h3 className="font-semibold text-sm text-foreground">
            New Syllabus Entry
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Class *</Label>
              <Select
                value={selClass}
                onValueChange={(v) => {
                  setSelClass(v);
                  setSelSection("");
                }}
              >
                <SelectTrigger data-ocid="syllabus.class.select">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.className}>
                      {c.className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Section</Label>
              <Select value={selSection} onValueChange={setSelSection}>
                <SelectTrigger data-ocid="syllabus.section.select">
                  <SelectValue placeholder="All sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Sections</SelectItem>
                  {(sectionsForClass as string[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Subject *</Label>
              <Select value={selSubject} onValueChange={setSelSubject}>
                <SelectTrigger data-ocid="syllabus.subject.select">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={addEntry}
              disabled={!selClass || !selSubject}
              data-ocid="syllabus.add_entry_button"
            >
              Add Entry
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAdd(false)}
              data-ocid="syllabus.cancel_button"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Entries */}
      {loading ? (
        <div
          className="flex items-center justify-center py-20"
          data-ocid="syllabus.loading_state"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : entries.length === 0 ? (
        <Card
          className="p-12 text-center border-dashed"
          data-ocid="syllabus.empty_state"
        >
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold text-foreground">No syllabus entries</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add subjects to start tracking chapter progress
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, idx) => {
            const pct = progress(entry);
            const isExpanded = expanded.has(entry.id);
            return (
              <Card
                key={entry.id}
                className="overflow-hidden"
                data-ocid={`syllabus.item.${idx + 1}`}
              >
                {/* Entry header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/20"
                  onClick={() => toggleExpand(entry.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpand(entry.id);
                    }
                  }}
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">
                          {entry.subjectName}
                        </p>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {entry.className}
                          {entry.section ? ` - ${entry.section}` : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <Progress
                          value={pct}
                          className="h-1.5 flex-1 max-w-[200px]"
                        />
                        <span className="text-xs text-muted-foreground">
                          {pct}% (
                          {
                            entry.chapters.filter(
                              (c) => c.status === "Completed",
                            ).length
                          }
                          /{entry.chapters.length} chapters)
                        </span>
                      </div>
                    </div>
                  </div>
                  {canWrite && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteEntry(entry.id);
                      }}
                      data-ocid={`syllabus.delete_button.${idx + 1}`}
                      aria-label="Delete entry"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                {/* Chapters */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {entry.chapters.map((ch) => (
                      <div
                        key={ch.id}
                        className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 hover:bg-muted/10 group"
                      >
                        <button
                          type="button"
                          onClick={() => cycleStatus(entry.id, ch.id)}
                          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors ${STATUS_STYLE[ch.status]}`}
                          title="Click to change status"
                          aria-label={`Status: ${ch.status}`}
                        >
                          {ch.status === "Completed" && (
                            <Check className="w-3 h-3" />
                          )}
                          {ch.status === "In Progress" && "…"}
                          {ch.status === "Not Started" && "–"}
                        </button>
                        <span
                          className={`text-sm flex-1 ${ch.status === "Completed" ? "line-through text-muted-foreground" : "text-foreground"}`}
                        >
                          {ch.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground hidden sm:block">
                          {ch.status}
                        </span>
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => deleteChapter(entry.id, ch.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            aria-label="Delete chapter"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}

                    {/* Add chapter */}
                    {canWrite && (
                      <div className="flex gap-2 p-3">
                        <Input
                          placeholder="Add chapter name…"
                          value={newChapters[entry.id] ?? ""}
                          onChange={(e) =>
                            setNewChapters((p) => ({
                              ...p,
                              [entry.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addChapter(entry.id, newChapters[entry.id] ?? "");
                              setNewChapters((p) => ({ ...p, [entry.id]: "" }));
                            }
                          }}
                          className="h-8 text-sm flex-1"
                          data-ocid={`syllabus.chapter_input.${idx + 1}`}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => {
                            addChapter(entry.id, newChapters[entry.id] ?? "");
                            setNewChapters((p) => ({ ...p, [entry.id]: "" }));
                          }}
                          data-ocid={`syllabus.add_chapter_button.${idx + 1}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
