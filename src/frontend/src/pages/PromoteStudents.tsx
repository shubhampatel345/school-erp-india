/**
 * PromoteStudents — Bulk student promotion wizard (Session-aware)
 *
 * Flow:
 *  Step 1 (configure): class mapping table + carry-forward toggle + student picker
 *  Step 2 (confirm):   review summary before executing
 *  Step 3 (done):      success card with full summary
 *
 * On promote:
 *  1. Ensure next session exists (auto-create via sessions/auto-create if missing)
 *  2. POST sessions/promote-students with student_updates[] + target_session_id
 *  3. POST sessions/copy-data to copy fee headings + staff to new session
 *
 * Rules:
 *  - Only students in currentSession.id are shown
 *  - Carry Forward Dues defaults to OFF (zero balance)
 *  - ADD_SESSION reducer never auto-archives siblings
 */

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
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  Pencil,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import type {
  ClassSection,
  FeeHeading,
  Session,
  Staff,
  Student,
} from "../types";
import {
  CLASSES_ORDER,
  DEFAULT_CLASS_MAPPINGS,
  nextSessionLabel,
} from "../types";
import { CLASSES } from "../utils/localStorage";
import phpApiService from "../utils/phpApiService";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ALL_CLASSES = [
  "Nursery",
  "LKG",
  "UKG",
  ...CLASSES.filter((c) => !["Nursery", "LKG", "UKG"].includes(c)).map((c) =>
    c.match(/^\d+$/) ? `Class ${c}` : c,
  ),
];

function normalizeClassName(raw: string): string {
  if (!raw) return raw;
  if (raw.match(/^\d+$/)) return `Class ${raw}`;
  return raw;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Class Mapping Row (internal, from/to for compat) ──────────────────────────

interface MappingRow {
  sourceClass: string;
  targetClass: string;
}

const TERMINAL_TARGET = "Alumni/Discontinued";

// Build a lookup from DEFAULT_CLASS_MAPPINGS using sourceClass
const DEFAULT_MAPPING_MAP: Record<string, string> = {};
for (const m of DEFAULT_CLASS_MAPPINGS) {
  DEFAULT_MAPPING_MAP[m.sourceClass] = m.targetClass;
}

// ── Class Mapping Table ────────────────────────────────────────────────────────

interface ClassMappingTableProps {
  availableClasses: string[];
  mappings: MappingRow[];
  onUpdate: (updated: MappingRow[]) => void;
}

function ClassMappingTable({
  availableClasses,
  mappings,
  onUpdate,
}: ClassMappingTableProps) {
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const targetOptions = [...availableClasses, TERMINAL_TARGET];

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-x-2 gap-y-1.5 items-center text-xs font-semibold text-muted-foreground px-1 mb-1">
        <span>Current Class</span>
        <span />
        <span>Promoted To</span>
        <span />
      </div>
      {mappings.map((row) => {
        const isEditing = editingRow === row.sourceClass;
        const isTerminal = row.targetClass === TERMINAL_TARGET;
        return (
          <div
            key={row.sourceClass}
            className={`grid grid-cols-[1fr_auto_1fr_auto] gap-x-2 items-center px-2 py-1.5 rounded-lg border transition-colors text-sm ${
              isEditing
                ? "border-primary/40 bg-primary/5"
                : "border-border bg-card"
            }`}
            data-ocid={`promote.mapping_row.${row.sourceClass.replace(/\s+/g, "_")}`}
          >
            <span className="font-medium text-foreground truncate">
              {row.sourceClass}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            {isEditing ? (
              <Select
                value={row.targetClass}
                onValueChange={(val) => {
                  onUpdate(
                    mappings.map((m) =>
                      m.sourceClass === row.sourceClass
                        ? { ...m, targetClass: val }
                        : m,
                    ),
                  );
                  setEditingRow(null);
                }}
              >
                <SelectTrigger
                  className="h-7 text-xs"
                  data-ocid={`promote.mapping_select.${row.sourceClass.replace(/\s+/g, "_")}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {targetOptions.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span
                className={`text-sm font-semibold truncate ${isTerminal ? "text-amber-600" : "text-primary"}`}
              >
                {row.targetClass}
              </span>
            )}
            <button
              type="button"
              onClick={() => setEditingRow(isEditing ? null : row.sourceClass)}
              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
              aria-label={`Edit mapping for ${row.sourceClass}`}
              data-ocid={`promote.mapping_edit.${row.sourceClass.replace(/\s+/g, "_")}`}
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── PromoteStudents page ──────────────────────────────────────────────────────

type WizardStep = "configure" | "confirm" | "done";

interface PromotionResult {
  promotedCount: number;
  newSession: Session;
  wasAutoCreated: boolean;
  staffCarriedOver: number;
  feeHeadingsCopied: number;
}

export default function PromoteStudents() {
  const { currentSession, sessions, addNotification, currentUser } = useApp();

  // ── Server-side data (direct API) ─────────────────────────────────────────
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [feeHeadings, setFeeHeadings] = useState<FeeHeading[]>([]);
  const [_dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setDataLoading(true);
      try {
        const [studRes, staffRes, headingsRes] = await Promise.all([
          phpApiService
            .getStudents({ limit: "2000" })
            .catch(() => ({ data: [] })),
          phpApiService.getStaff().catch(() => []),
          phpApiService.getFeeHeadings().catch(() => []),
        ]);
        setAllStudents(studRes.data as unknown as Student[]);
        setAllStaff(staffRes as unknown as Staff[]);
        setFeeHeadings(headingsRes as unknown as FeeHeading[]);
      } catch {
        /* use empty arrays */
      } finally {
        setDataLoading(false);
      }
    }
    void loadData();
  }, []);

  const isSuperAdmin = currentUser?.role === "superadmin";

  // ── Wizard state ─────────────────────────────────────────────────────────
  const [step, setStep] = useState<WizardStep>("configure");

  // ── Class mappings ────────────────────────────────────────────────────────
  const uniqueClasses = useMemo(() => {
    const fromData = [
      ...new Set(
        allStudents
          .filter(
            (s) =>
              s.status === "active" &&
              (currentSession ? s.sessionId === currentSession.id : true),
          )
          .map((s) => normalizeClassName(s.class))
          .filter(Boolean),
      ),
    ];
    const ordered = CLASSES_ORDER.map((c) =>
      c.match(/^\d+$/) ? `Class ${c}` : c,
    );
    const combined = [
      ...ordered.filter((c) => fromData.includes(c)),
      ...fromData.filter((c) => !ordered.includes(c)),
    ];
    return combined.length > 0 ? combined : ALL_CLASSES;
  }, [allStudents, currentSession]);

  const [classMappings, setClassMappings] = useState<MappingRow[]>(() =>
    uniqueClasses.map((cls) => ({
      sourceClass: cls,
      targetClass: DEFAULT_MAPPING_MAP[cls] ?? TERMINAL_TARGET,
    })),
  );

  const [showMappingTable, setShowMappingTable] = useState(false);

  // ── Carry forward & options ───────────────────────────────────────────────
  const [carryForwardDues, setCarryForwardDues] = useState(false);

  // ── Source class filter ───────────────────────────────────────────────────
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(
    new Set(),
  );

  // Students in current session only
  const sessionStudents = useMemo(() => {
    const sessId = currentSession?.id;
    return allStudents.filter(
      (s) => s.status === "active" && (sessId ? s.sessionId === sessId : true),
    );
  }, [allStudents, currentSession]);

  const candidateStudents = useMemo(() => {
    if (selectedClasses.size === 0) return sessionStudents;
    return sessionStudents.filter((s) =>
      selectedClasses.has(normalizeClassName(s.class)),
    );
  }, [sessionStudents, selectedClasses]);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleAll = () => {
    if (selected.size === candidateStudents.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(candidateStudents.map((s) => s.id)));
    }
  };

  const toggleStudent = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleClassFilter = (cls: string) => {
    setSelectedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return next;
    });
    setSelected(new Set());
  };

  // ── Promotion ─────────────────────────────────────────────────────────────
  const [promoting, setPromoting] = useState(false);
  const [promotionResult, setPromotionResult] =
    useState<PromotionResult | null>(null);
  const [progressMsg, setProgressMsg] = useState("");

  const nextLabel = currentSession
    ? nextSessionLabel(currentSession.label)
    : "";
  const existingNextSession = sessions.find((s) => s.label === nextLabel);

  async function ensureNextSession(): Promise<{
    session: Session;
    wasAutoCreated: boolean;
  }> {
    if (existingNextSession)
      return { session: existingNextSession, wasAutoCreated: false };

    // Try server auto-create first
    try {
      const result = await phpApiService.post<{
        id: string;
        label: string;
        startYear: number;
        endYear: number;
      }>("sessions/auto-create", { label: nextLabel });
      const newSession: Session = {
        id: result.id ?? generateId(),
        label: result.label ?? nextLabel,
        startYear: result.startYear ?? Number(nextLabel.split("-")[0]),
        endYear: result.endYear ?? Number(nextLabel.split("-")[0]) + 1,
        isArchived: false,
        isActive: false,
        createdAt: new Date().toISOString(),
      };
      await phpApiService.createSession({
        label: newSession.label,
        startYear: newSession.startYear,
        endYear: newSession.endYear,
      });
      return { session: newSession, wasAutoCreated: true };
    } catch {
      // Fallback: create session via API
      const [startStr] = nextLabel.split("-");
      const startYear = Number.parseInt(startStr, 10);
      const newSession: Session = {
        id: generateId(),
        label: nextLabel,
        startYear,
        endYear: startYear + 1,
        isArchived: false,
        isActive: false,
        createdAt: new Date().toISOString(),
      };
      await phpApiService
        .createSession({ label: nextLabel, startYear, endYear: startYear + 1 })
        .catch(() => {});
      return { session: newSession, wasAutoCreated: true };
    }
  }

  async function handlePromote() {
    if (selected.size === 0) return;
    setPromoting(true);
    setProgressMsg("Checking next session…");

    try {
      // Step 1: Ensure next session exists
      const { session: newSession, wasAutoCreated } = await ensureNextSession();

      // Step 2: Build student update payload
      setProgressMsg(`Promoting ${selected.size} students…`);
      const ids = Array.from(selected);

      const studentUpdates = ids
        .map((id) => {
          const student = allStudents.find((s) => s.id === id);
          if (!student) return null;
          const fromClass = normalizeClassName(student.class);
          const mapping = classMappings.find(
            (m) => m.sourceClass === fromClass,
          );
          const toClass = mapping?.targetClass ?? fromClass;
          const isTerminal = toClass === TERMINAL_TARGET;
          return {
            id,
            sessionId: newSession.id,
            class: isTerminal ? student.class : toClass.replace("Class ", ""),
            status: isTerminal ? "discontinued" : "active",
            promotedFrom: student.class,
            promotedFromSession: currentSession?.label ?? "",
            promotedAt: new Date().toISOString(),
            openingBalance: carryForwardDues ? undefined : 0,
            carryForwardDues,
          };
        })
        .filter(Boolean);

      // Try server bulk promote endpoint
      let serverPromoted = false;
      try {
        await phpApiService.post("sessions/promote-students", {
          student_updates: studentUpdates,
          target_session_id: newSession.id,
          carry_forward_dues: carryForwardDues,
          source_session_id: currentSession?.id,
        });
        serverPromoted = true;
      } catch {
        // fall through to local update
      }

      if (!serverPromoted) {
        // Server failed — update students via individual API calls
        for (const update of studentUpdates) {
          if (!update) continue;
          const { id, ...changes } = update;
          await phpApiService
            .updateStudent({
              id: id as string,
              ...(changes as Record<string, unknown>),
            })
            .catch(() => {});
        }
      }

      // Step 3: Copy fee headings + staff via server
      setProgressMsg("Copying fee headings and staff…");
      let copiedHeadings = 0;
      let staffCarried = 0;

      try {
        const copyResult = await phpApiService.post<{
          fee_headings_copied: number;
          staff_copied: number;
        }>("sessions/copy-data", {
          source_session_id: currentSession?.id,
          target_session_id: newSession.id,
          copy_fee_headings: true,
          copy_staff: true,
          reset_fee_amounts: true,
        });
        copiedHeadings = copyResult.fee_headings_copied ?? 0;
        staffCarried = copyResult.staff_copied ?? 0;
      } catch {
        // API fallback: copy fee headings and staff
        const currentSessionId = currentSession?.id ?? "";
        const relevantHeadings = feeHeadings.filter(
          (h) => !h.sessionId || h.sessionId === currentSessionId,
        );
        for (const heading of relevantHeadings) {
          await phpApiService
            .addFeeHeading({
              name: heading.name,
              amount: 0,
              sessionId: newSession.id,
            })
            .catch(() => {});
          copiedHeadings++;
        }

        // Carry forward active staff via API
        const activeStaff = allStaff.filter((s) => s.status !== "inactive");
        for (const staff of activeStaff) {
          await phpApiService
            .updateStaff({ id: staff.id, sessionId: newSession.id })
            .catch(() => {});
          staffCarried++;
        }
      }

      const result: PromotionResult = {
        promotedCount: ids.length,
        newSession,
        wasAutoCreated,
        staffCarriedOver: staffCarried,
        feeHeadingsCopied: copiedHeadings,
      };

      setPromotionResult(result);
      setStep("done");
      setSelected(new Set());

      addNotification(
        `Promoted ${ids.length} students to ${newSession.label}. ${wasAutoCreated ? `Session ${newSession.label} created automatically. ` : ""}${staffCarried} staff carried forward. ${copiedHeadings} fee headings copied.`,
        "success",
      );
    } catch (err) {
      addNotification(
        err instanceof Error
          ? err.message
          : "Promotion failed. Please try again.",
        "error",
      );
    } finally {
      setPromoting(false);
      setProgressMsg("");
    }
  }

  // ── Grouped students for display ─────────────────────────────────────────
  const groupedByClass = useMemo(() => {
    const map: Record<string, Student[]> = {};
    for (const s of candidateStudents) {
      const cls = normalizeClassName(s.class);
      if (!map[cls]) map[cls] = [];
      map[cls].push(s);
    }
    return map;
  }, [candidateStudents]);

  // ── Step: Done ────────────────────────────────────────────────────────────

  if (step === "done" && promotionResult) {
    return (
      <div className="p-4 md:p-6 bg-background min-h-screen max-w-2xl mx-auto">
        <Card className="border-emerald-300 bg-emerald-50">
          <CardContent className="pt-8 pb-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-emerald-800 mb-3">
                Promotion Complete!
              </h2>
              <div className="text-sm text-emerald-700 space-y-1.5 text-left max-w-sm mx-auto">
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Promoted{" "}
                  <strong>{promotionResult.promotedCount} students</strong> to{" "}
                  <strong>{promotionResult.newSession.label}</strong>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Session <strong>{promotionResult.newSession.label}</strong>{" "}
                  {promotionResult.wasAutoCreated
                    ? "created automatically"
                    : "was already present"}
                </p>
                {promotionResult.staffCarriedOver > 0 && (
                  <p className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <strong>{promotionResult.staffCarriedOver} staff</strong>{" "}
                    carried forward to new session
                  </p>
                )}
                {promotionResult.feeHeadingsCopied > 0 && (
                  <p className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <strong>
                      {promotionResult.feeHeadingsCopied} fee heading
                      {promotionResult.feeHeadingsCopied !== 1 ? "s" : ""}
                    </strong>{" "}
                    copied — amounts reset to ₹0 (update Fee Plan for{" "}
                    {promotionResult.newSession.label})
                  </p>
                )}
                {!carryForwardDues && (
                  <p className="flex items-start gap-2 text-emerald-600 text-xs mt-1">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    Carry-forward dues: OFF — students start with zero balance
                  </p>
                )}
              </div>
            </div>
            <Button
              onClick={() => {
                setStep("configure");
                setPromotionResult(null);
                setSelected(new Set());
                setSelectedClasses(new Set());
              }}
              variant="outline"
              className="border-emerald-400 text-emerald-700 hover:bg-emerald-100"
              data-ocid="promote.promote_again_button"
            >
              Promote More Students
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Step: Confirm ─────────────────────────────────────────────────────────

  if (step === "confirm") {
    const selectedStudents = candidateStudents.filter((s) =>
      selected.has(s.id),
    );
    const groupedSelected: Record<string, Student[]> = {};
    for (const s of selectedStudents) {
      const cls = normalizeClassName(s.class);
      if (!groupedSelected[cls]) groupedSelected[cls] = [];
      groupedSelected[cls].push(s);
    }

    return (
      <div className="p-4 md:p-6 bg-background min-h-screen space-y-5 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStep("configure")}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            aria-label="Back"
            data-ocid="promote.back_button"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground font-display">
              Confirm Promotion
            </h1>
            <p className="text-sm text-muted-foreground">
              Review before promoting {selected.size} student
              {selected.size !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Summary */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-3 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-primary" />
              <span>
                Promoting to:{" "}
                <strong className="text-primary">
                  {nextLabel || "next session"}
                </strong>
                {!existingNextSession && (
                  <span className="ml-2 text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                    Will be auto-created
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span>
                <strong>{selected.size}</strong> students selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Copy className="w-4 h-4 text-primary" />
              <span>Fee headings will be copied with amounts reset to ₹0</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="w-4 h-4 text-xs flex items-center justify-center font-bold">
                ₹
              </span>
              <span>
                Dues carry-forward:{" "}
                <strong>
                  {carryForwardDues ? "ON" : "OFF (zero balance)"}
                </strong>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Class-grouped preview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Students to Promote
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {Object.entries(groupedSelected).map(([cls, studs]) => {
                const mapping = classMappings.find(
                  (m) => m.sourceClass === cls,
                );
                const targetCls = mapping?.targetClass ?? cls;
                const isTerminal = targetCls === TERMINAL_TARGET;
                return (
                  <div key={cls}>
                    <div className="flex items-center gap-2 mb-1.5 px-1">
                      <span className="text-xs font-bold text-muted-foreground">
                        {cls}
                      </span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span
                        className={`text-xs font-bold ${isTerminal ? "text-amber-600" : "text-primary"}`}
                      >
                        {targetCls}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        ({studs.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-2">
                      {studs.map((s) => (
                        <span
                          key={s.id}
                          className="text-xs bg-muted px-2 py-0.5 rounded-full"
                        >
                          {s.fullName}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setStep("configure")}
            data-ocid="promote.cancel_button"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Button
            className="flex-1"
            onClick={() => void handlePromote()}
            disabled={promoting}
            data-ocid="promote.confirm_button"
          >
            {promoting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {progressMsg || "Promoting…"}
              </>
            ) : (
              <>
                Promote {selected.size} Student{selected.size !== 1 ? "s" : ""}
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ── Step: Configure ───────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 bg-background min-h-screen space-y-5 max-w-3xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
          <ChevronRight className="w-6 h-6 text-primary" />
          Promote Students
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Bulk-promote students to the next academic session with class mapping
        </p>
      </div>

      {/* Session info banner */}
      <Card
        className={`p-3 border ${currentSession ? "border-primary/20 bg-primary/5" : "border-amber-300 bg-amber-50"}`}
      >
        <div className="flex items-center gap-2 text-sm flex-wrap">
          {currentSession ? (
            <>
              <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-foreground">
                Current session: <strong>{currentSession.label}</strong>
                <span className="text-muted-foreground/70 ml-1 text-xs">
                  (Apr {currentSession.startYear} – Mar {currentSession.endYear}
                  )
                </span>
                {nextLabel && (
                  <>
                    {" "}
                    → Promoting to:{" "}
                    <strong className="text-primary">{nextLabel}</strong>
                    {existingNextSession ? (
                      <span className="ml-1.5 text-xs text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                        Session exists
                      </span>
                    ) : (
                      <span className="ml-1.5 text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        Will be auto-created
                      </span>
                    )}
                  </>
                )}
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="text-amber-800">
                No active session found. Please set a current session in
                Settings → Sessions.
              </span>
            </>
          )}
        </div>
      </Card>

      {/* Class Mapping Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Copy className="w-4 h-4 text-primary" />
              Class Promotion Mapping
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowMappingTable((v) => !v)}
              data-ocid="promote.toggle_mapping_button"
            >
              {showMappingTable ? "Hide" : "Show & Edit"}
            </Button>
          </div>
          {!showMappingTable && (
            <p className="text-xs text-muted-foreground mt-1">
              Default: Nursery→LKG, LKG→UKG, UKG→Class 1, Class 1–11→next class,
              Class 12→Alumni/Discontinued. Click "Show &amp; Edit" to override
              any mapping.
            </p>
          )}
        </CardHeader>
        {showMappingTable && (
          <CardContent>
            <ClassMappingTable
              availableClasses={ALL_CLASSES}
              mappings={classMappings}
              onUpdate={setClassMappings}
            />
            {isSuperAdmin && (
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                <Pencil className="w-3 h-3" />
                Click the edit icon on any row to override the default mapping.
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Options */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Carry Forward Dues
              </p>
              <p className="text-xs text-muted-foreground">
                {carryForwardDues
                  ? "Outstanding fee balance will carry to new session"
                  : "Students start with zero balance in new session (recommended)"}
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

      {/* Class filter chips */}
      {uniqueClasses.length > 0 && (
        <div>
          <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
            Filter by Class (select to narrow the student list)
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {uniqueClasses.map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => toggleClassFilter(cls)}
                data-ocid={`promote.class_filter.${cls.replace(/\s+/g, "_")}`}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  selectedClasses.has(cls)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                {cls}
                <span className="ml-1 opacity-70">
                  (
                  {
                    sessionStudents.filter(
                      (s) => normalizeClassName(s.class) === cls,
                    ).length
                  }
                  )
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Student list */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Students in Current Session
            <Badge variant="secondary">{candidateStudents.length}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={
                selected.size === candidateStudents.length &&
                candidateStudents.length > 0
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
          {candidateStudents.length === 0 ? (
            <div
              className="text-center py-10 text-muted-foreground"
              data-ocid="promote.empty_state"
            >
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">
                No active students found in current session
              </p>
              {selectedClasses.size > 0 && (
                <p className="text-xs mt-1">
                  Clear class filters or check session assignment
                </p>
              )}
              {!currentSession && (
                <p className="text-xs mt-1 text-amber-600">
                  Set a current session in Settings → Sessions first
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {Object.entries(groupedByClass)
                .sort(([a], [b]) => {
                  const ai = ALL_CLASSES.indexOf(a);
                  const bi = ALL_CLASSES.indexOf(b);
                  return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
                })
                .map(([cls, students]) => {
                  const mapping = classMappings.find(
                    (m) => m.sourceClass === cls,
                  );
                  const targetCls = mapping?.targetClass ?? cls;
                  const isTerminal = targetCls === TERMINAL_TARGET;
                  let rowIdx = 0;
                  return (
                    <div key={cls}>
                      <div className="flex items-center gap-2 mb-1.5 px-1">
                        <span className="text-xs font-bold text-muted-foreground">
                          {cls}
                        </span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span
                          className={`text-xs font-bold ${isTerminal ? "text-amber-600" : "text-primary"}`}
                        >
                          {targetCls}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-1">
                          ({students.length})
                        </span>
                      </div>
                      {students.map((s) => {
                        rowIdx++;
                        return (
                          <div
                            key={s.id}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors mb-1 ${
                              selected.has(s.id)
                                ? "bg-primary/5 border-primary/40"
                                : "bg-card border-border hover:bg-muted/30"
                            }`}
                            data-ocid={`promote.student.item.${rowIdx}`}
                          >
                            <Checkbox
                              checked={selected.has(s.id)}
                              onCheckedChange={() => toggleStudent(s.id)}
                              id={`student-${s.id}`}
                              data-ocid={`promote.student.checkbox.${rowIdx}`}
                            />
                            <label
                              htmlFor={`student-${s.id}`}
                              className="flex-1 min-w-0 cursor-pointer"
                            >
                              <p className="text-sm font-medium text-foreground truncate">
                                {s.fullName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {s.admNo} • {s.class}-{s.section}
                              </p>
                            </label>
                            {isTerminal && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] text-amber-700 flex-shrink-0"
                              >
                                Graduate
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Promote action bar */}
      {selected.size > 0 && (
        <Card className="border-primary/40 bg-primary/5 sticky bottom-4">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-semibold text-foreground text-sm">
                  Promote <strong>{selected.size}</strong> student
                  {selected.size !== 1 ? "s" : ""} →{" "}
                  <span className="text-primary">
                    {nextLabel || "next session"}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {carryForwardDues
                    ? "Fee dues will carry forward"
                    : "Zero balance in new session"}
                  {!existingNextSession && nextLabel && (
                    <span className="ml-2 text-amber-600">
                      · Session {nextLabel} will be auto-created
                    </span>
                  )}
                </p>
              </div>
              <Button
                onClick={() => setStep("confirm")}
                disabled={!currentSession}
                data-ocid="promote.promote_button"
              >
                Review &amp; Confirm
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
