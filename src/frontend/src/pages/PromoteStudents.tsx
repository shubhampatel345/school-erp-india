import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowRight, CheckCircle, ChevronRight, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import type { ClassSection, Student } from "../types";
import { CLASSES } from "../utils/localStorage";

export default function PromoteStudents() {
  const { getData, updateData, addNotification } = useApp();
  const students = getData("students") as Student[];
  const classSections = getData("classes") as ClassSection[];

  const [sourceClass, setSourceClass] = useState("");
  const [sourceSection, setSourceSection] = useState("all");
  const [targetClass, setTargetClass] = useState("");
  const [targetSection, setTargetSection] = useState("A");
  const [carryForwardDues, setCarryForwardDues] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [promoting, setPromoting] = useState(false);
  const [promoted, setPromoted] = useState<string[]>([]);

  // Get available sections for a class from classSections or fallback
  const getSections = (cls: string): string[] => {
    if (!cls) return [];
    const cs = classSections.find((c) => c.className === cls);
    return cs?.sections ?? ["A", "B", "C", "D"];
  };

  // Auto-suggest target class (next class)
  const suggestTarget = (cls: string): string => {
    const idx = CLASSES.indexOf(cls);
    if (idx === -1 || idx >= CLASSES.length - 1) return "";
    return CLASSES[idx + 1];
  };

  const handleSourceClassChange = (cls: string) => {
    setSourceClass(cls);
    setSourceSection("all");
    setSelected(new Set());
    setPromoted([]);
    const suggested = suggestTarget(cls);
    setTargetClass(suggested);
    if (suggested) {
      const targetSections = getSections(suggested);
      setTargetSection(targetSections[0] ?? "A");
    }
  };

  const sourceStudents = useMemo(() => {
    return students.filter((s) => {
      if (s.status !== "active") return false;
      if (s.class !== sourceClass) return false;
      if (sourceSection !== "all" && s.section !== sourceSection) return false;
      return true;
    });
  }, [students, sourceClass, sourceSection]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === sourceStudents.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sourceStudents.map((s) => s.id)));
    }
  };

  const handlePromote = async () => {
    if (!targetClass || !targetSection) return;
    if (selected.size === 0) return;

    setPromoting(true);
    const ids = Array.from(selected);
    const done: string[] = [];

    for (const id of ids) {
      const changes: Record<string, unknown> = {
        class: targetClass,
        section: targetSection,
      };
      if (!carryForwardDues) {
        // clear old balance by marking as fresh (no specific balance field)
        changes.promotedFrom = sourceClass;
        changes.promotedAt = new Date().toISOString();
      }
      await updateData("students", id, changes);
      done.push(id);
    }

    setPromoted(done);
    setSelected(new Set());
    setPromoting(false);
    addNotification(
      `Promoted ${done.length} students to Class ${targetClass}-${targetSection}`,
      "success",
    );
  };

  const sourceSections = getSections(sourceClass);
  const targetSections = getSections(targetClass);

  return (
    <div className="p-4 md:p-6 bg-background min-h-screen space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
          <ChevronRight className="w-6 h-6 text-primary" /> Promote Students
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Bulk promote students to the next class/section
        </p>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Promotion Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Source */}
            <div className="space-y-2 flex-1 min-w-32">
              <Label className="text-xs font-semibold text-muted-foreground">
                FROM
              </Label>
              <Select
                value={sourceClass}
                onValueChange={handleSourceClassChange}
              >
                <SelectTrigger data-ocid="promote.source_class_select">
                  <SelectValue placeholder="Source Class" />
                </SelectTrigger>
                <SelectContent>
                  {CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>
                      Class {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sourceClass && (
                <Select value={sourceSection} onValueChange={setSourceSection}>
                  <SelectTrigger data-ocid="promote.source_section_select">
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sourceSections.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <ArrowRight className="w-6 h-6 text-muted-foreground flex-shrink-0" />

            {/* Target */}
            <div className="space-y-2 flex-1 min-w-32">
              <Label className="text-xs font-semibold text-muted-foreground">
                TO
              </Label>
              <Select
                value={targetClass}
                onValueChange={(v) => {
                  setTargetClass(v);
                  setTargetSection(getSections(v)[0] ?? "A");
                }}
              >
                <SelectTrigger data-ocid="promote.target_class_select">
                  <SelectValue placeholder="Target Class" />
                </SelectTrigger>
                <SelectContent>
                  {CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>
                      Class {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {targetClass && (
                <Select value={targetSection} onValueChange={setTargetSection}>
                  <SelectTrigger data-ocid="promote.target_section_select">
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent>
                    {(targetSections.length > 0
                      ? targetSections
                      : ["A", "B", "C", "D"]
                    ).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center justify-between py-2 border-t border-border">
            <div>
              <p className="text-sm font-medium text-foreground">
                Carry forward dues
              </p>
              <p className="text-xs text-muted-foreground">
                Include unpaid fee balance in new session
              </p>
            </div>
            <Switch
              checked={carryForwardDues}
              onCheckedChange={setCarryForwardDues}
              data-ocid="promote.carry_dues_switch"
            />
          </div>
        </CardContent>
      </Card>

      {/* Student List */}
      {sourceClass && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Students in Class {sourceClass}
              {sourceSection !== "all" ? `-${sourceSection}` : ""}
              <Badge variant="secondary">{sourceStudents.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={
                  selected.size === sourceStudents.length &&
                  sourceStudents.length > 0
                }
                onCheckedChange={toggleAll}
                id="select-all"
                data-ocid="promote.select_all_checkbox"
              />
              <label
                htmlFor="select-all"
                className="text-xs text-muted-foreground cursor-pointer"
              >
                Select All
              </label>
            </div>
          </CardHeader>
          <CardContent>
            {sourceStudents.length === 0 ? (
              <div
                className="text-center py-10 text-muted-foreground"
                data-ocid="promote.empty_state"
              >
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  No active students found in Class {sourceClass}
                </p>
                {sourceSection !== "all" && (
                  <p className="text-xs mt-1">Try selecting "All Sections"</p>
                )}
              </div>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {sourceStudents.map((s, i) => {
                  const isPromoted = promoted.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                        isPromoted
                          ? "bg-green-50 border-green-200"
                          : selected.has(s.id)
                            ? "bg-primary/5 border-primary/40"
                            : "bg-card hover:bg-muted/30"
                      }`}
                      data-ocid={`promote.student.item.${i + 1}`}
                    >
                      {isPromoted ? (
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <Checkbox
                          checked={selected.has(s.id)}
                          onCheckedChange={() => toggleSelect(s.id)}
                          id={`student-${s.id}`}
                          data-ocid={`promote.student.checkbox.${i + 1}`}
                        />
                      )}
                      <label
                        htmlFor={`student-${s.id}`}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <p className="text-sm font-medium text-foreground truncate">
                          {s.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.admNo} • Class {s.class}-{s.section}
                        </p>
                      </label>
                      {isPromoted && (
                        <Badge
                          variant="secondary"
                          className="text-xs text-green-700"
                        >
                          Promoted
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Promote Button */}
      {sourceClass && targetClass && selected.size > 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="pt-4 pb-3 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-semibold text-foreground text-sm">
                Promote {selected.size} student{selected.size !== 1 ? "s" : ""}{" "}
                from Class {sourceClass}
                {sourceSection !== "all" ? `-${sourceSection}` : ""} → Class{" "}
                {targetClass}-{targetSection}
              </p>
              {carryForwardDues && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fee dues will be carried forward
                </p>
              )}
            </div>
            <Button
              onClick={handlePromote}
              disabled={promoting}
              data-ocid="promote.promote_button"
            >
              {promoting
                ? "Promoting…"
                : `Promote ${selected.size} Student${selected.size !== 1 ? "s" : ""}`}
              {!promoting && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </CardContent>
        </Card>
      )}

      {promoted.length > 0 && (
        <div
          className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg"
          data-ocid="promote.success_state"
        >
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800 font-medium">
            Successfully promoted {promoted.length} student
            {promoted.length !== 1 ? "s" : ""} to Class {targetClass}-
            {targetSection}
          </p>
        </div>
      )}
    </div>
  );
}
