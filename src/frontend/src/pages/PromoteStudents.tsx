/**
 * PromoteStudents — 3-step wizard (direct PHP API)
 *
 * Step 1: Source session + class mapping table
 * Step 2: Review + carry-forward options
 * Step 3: Done summary
 *
 * Auto-creates next session if not exists.
 * Staff and fee headings carried forward; amounts reset to 0.
 * Class 12 → Alumni.
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
  ArrowRight,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Loader2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import {
  CLASSES_ORDER,
  DEFAULT_CLASS_MAPPINGS,
  nextSessionLabel,
} from "../types";
import type { SessionRecord } from "../utils/phpApiService";
import phpApiService from "../utils/phpApiService";

interface ClassMapping {
  sourceClass: string;
  targetClass: string;
  isTerminal?: boolean;
}

interface PromotionResult {
  promoted: number;
  alumni: number;
  newSession: string;
  errors: string[];
}

export default function PromoteStudents() {
  const { currentUser, currentSession } = useApp();
  const isSuperAdmin = currentUser?.role === "superadmin";

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);

  // Step 1 state — default to current session
  const [sourceSessionId, setSourceSessionId] = useState(
    () => currentSession?.id ?? "",
  );
  const [mappings, setMappings] = useState<ClassMapping[]>(
    DEFAULT_CLASS_MAPPINGS.map((m) => ({
      sourceClass: m.sourceClass,
      targetClass: m.targetClass,
      isTerminal: m.isTerminal,
    })),
  );

  // Step 2 state
  const [carryDues, setCarryDues] = useState(false);
  const [carryStaff, setCarryStaff] = useState(true);
  const [carryFeeHeadings, setCarryFeeHeadings] = useState(true);
  const [carryTransport, setCarryTransport] = useState(true);

  // Step 3 state
  const [result, setResult] = useState<PromotionResult | null>(null);

  useEffect(() => {
    setLoading(true);
    phpApiService
      .getSessions()
      .then((rows) => {
        setSessions([...rows].sort((a, b) => b.startYear - a.startYear));
      })
      .catch(() => toast.error("Failed to load sessions"))
      .finally(() => setLoading(false));
  }, []);

  if (!isSuperAdmin) {
    return (
      <div className="p-4 lg:p-6">
        <Card className="p-8 text-center">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold text-foreground">Super Admin only</p>
          <p className="text-sm text-muted-foreground mt-1">
            Only Super Admin can promote students.
          </p>
        </Card>
      </div>
    );
  }

  // Source session label
  const sourceSession = sessions.find((s) => s.id === sourceSessionId);
  const targetLabel = sourceSession
    ? nextSessionLabel(sourceSession.label)
    : "";
  const existingTarget = sessions.find((s) => s.label === targetLabel);

  function updateMapping(idx: number, targetClass: string) {
    setMappings((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, targetClass } : m)),
    );
  }

  async function handlePromote() {
    if (!sourceSessionId) {
      toast.error("Select a source session");
      return;
    }
    if (!targetLabel) {
      toast.error("Cannot determine target session");
      return;
    }
    setPromoting(true);
    try {
      const raw = await phpApiService.promoteStudents({
        sourceSessionId,
        targetSessionLabel: targetLabel,
        mappings,
        carryDues,
        carryStaff,
        carryFeeHeadings,
        carryTransport,
        autoCreateSession: !existingTarget,
      });
      const res = (raw as unknown as Record<string, unknown>) ?? {};

      setResult({
        promoted: Number(res.promoted ?? 0),
        alumni: Number(res.alumni ?? 0),
        newSession: targetLabel,
        errors: Array.isArray(res.errors) ? (res.errors as string[]) : [],
      });
      setStep(3);
      toast.success(`Students promoted to ${targetLabel}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Promotion failed");
    } finally {
      setPromoting(false);
    }
  }

  const allTargets = [...CLASSES_ORDER, "Alumni/Discontinued"];

  return (
    <div className="p-4 lg:p-6 max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          Promote Students
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Bulk-promote students to the next academic session
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : step > s
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s ? <CheckCircle className="w-4 h-4" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`h-0.5 w-12 ${step > s ? "bg-emerald-500" : "bg-muted"}`}
              />
            )}
          </div>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {step === 1 ? "Configure" : step === 2 ? "Confirm" : "Done"}
        </span>
      </div>

      {/* Step 1 — Configure */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Source session */}
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-foreground text-sm">
              Source Session
            </h3>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading sessions…
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="promote-source" className="text-xs">
                  Promote students FROM
                </Label>
                <Select
                  value={sourceSessionId}
                  onValueChange={setSourceSessionId}
                >
                  <SelectTrigger
                    id="promote-source"
                    className="max-w-xs"
                    data-ocid="promote.source_session.select"
                  >
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label} {s.isActive ? "(Current)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {targetLabel && (
                  <p className="text-sm text-primary mt-2">
                    Students will be promoted to: <strong>{targetLabel}</strong>
                    {!existingTarget && (
                      <Badge className="ml-2 text-[10px] bg-amber-100 text-amber-700 border-amber-300">
                        Will be auto-created
                      </Badge>
                    )}
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Class mapping table */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Class Mapping
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Adjust where each class goes in the new session. Class 12
                graduates move to Alumni.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-semibold text-muted-foreground">
                        From Class
                      </th>
                      <th className="text-center p-3 text-muted-foreground">
                        →
                      </th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">
                        To Class
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((m, idx) => (
                      <tr
                        key={m.sourceClass}
                        className="border-t border-border hover:bg-muted/10"
                        data-ocid={`promote.mapping.${idx + 1}`}
                      >
                        <td className="p-3 font-medium text-foreground">
                          {m.sourceClass}
                        </td>
                        <td className="p-3 text-center text-muted-foreground">
                          <ArrowRight className="w-4 h-4 mx-auto" />
                        </td>
                        <td className="p-3">
                          {m.isTerminal ? (
                            <Badge variant="secondary" className="text-xs">
                              Alumni / Discontinued
                            </Badge>
                          ) : (
                            <Select
                              value={m.targetClass}
                              onValueChange={(v) => updateMapping(idx, v)}
                            >
                              <SelectTrigger
                                className="w-40 h-8 text-xs"
                                data-ocid={`promote.target_class.${idx + 1}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {allTargets.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={!sourceSessionId}
              data-ocid="promote.next_button"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 — Confirm */}
      {step === 2 && (
        <div className="space-y-5">
          <Card className="p-5 space-y-4">
            <h3 className="font-semibold text-foreground">
              Carry Forward Options
            </h3>

            {[
              {
                id: "staff",
                label: "Staff",
                desc: "Carry all staff to new session",
                value: carryStaff,
                setter: setCarryStaff,
              },
              {
                id: "fees",
                label: "Fee Headings",
                desc: "Copy fee headings (amounts reset to ₹0)",
                value: carryFeeHeadings,
                setter: setCarryFeeHeadings,
              },
              {
                id: "transport",
                label: "Transport Routes",
                desc: "Copy bus routes and pickup points",
                value: carryTransport,
                setter: setCarryTransport,
              },
              {
                id: "dues",
                label: "Outstanding Dues",
                desc: "Carry forward unpaid fee balances",
                value: carryDues,
                setter: setCarryDues,
              },
            ].map(({ id, label, desc, value, setter }) => (
              <div key={id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  checked={value}
                  onCheckedChange={setter}
                  data-ocid={`promote.carry_${id}.switch`}
                />
              </div>
            ))}
          </Card>

          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Summary</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Promoting from <strong>{sourceSession?.label}</strong> →{" "}
                  <strong>{targetLabel}</strong>
                  {!existingTarget && " (new session will be created)"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Class 12 students will be moved to Alumni/Discontinued
                </p>
              </div>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              data-ocid="promote.back_button"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button
              onClick={() => void handlePromote()}
              disabled={promoting}
              data-ocid="promote.confirm_button"
            >
              {promoting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Promoting…
                </>
              ) : (
                <>
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Promote Students
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — Done */}
      {step === 3 && result && (
        <div className="space-y-5">
          <Card className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-xl font-display font-bold text-foreground mb-2">
              Promotion Complete!
            </h3>
            <p className="text-muted-foreground mb-4">
              Students have been promoted to{" "}
              <strong className="text-foreground">{result.newSession}</strong>
            </p>
            <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-2xl font-bold text-primary">
                  {result.promoted}
                </p>
                <p className="text-xs text-muted-foreground">
                  Students promoted
                </p>
              </div>
              <div className="bg-muted/40 border border-border rounded-lg p-3">
                <p className="text-2xl font-bold text-foreground">
                  {result.alumni}
                </p>
                <p className="text-xs text-muted-foreground">Moved to Alumni</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="mt-4 text-left">
                <p className="text-xs font-medium text-destructive mb-1">
                  {result.errors.length} error(s):
                </p>
                {result.errors.slice(0, 3).map((err) => (
                  <p key={err} className="text-xs text-muted-foreground">
                    {err}
                  </p>
                ))}
              </div>
            )}
          </Card>
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => {
                setStep(1);
                setResult(null);
              }}
              data-ocid="promote.reset_button"
            >
              Promote Another Batch
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
