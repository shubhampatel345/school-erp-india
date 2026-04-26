/**
 * FeeHeading.tsx — Fee Headings CRUD via phpApiService
 *
 * All reads/writes go through phpApiService directly.
 * Up/Down buttons for display order reordering.
 * No canister, no IndexedDB, no local cache.
 */
import { useCallback, useEffect, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { useApp } from "../../context/AppContext";
import type { FeeHeading } from "../../types";
import { CLASS_ORDER, MONTHS } from "../../types";
import phpApiService, {
  type FeeHeadingRecord,
} from "../../utils/phpApiService";

function safeArray<T>(v: T[] | string | undefined): T[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v) {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toFeeHeading(r: FeeHeadingRecord): FeeHeading {
  const s = r as unknown as Record<string, unknown>;
  return {
    id: r.id,
    name: r.name,
    months: safeArray<string>(r.months as string[] | string | undefined),
    amount: r.amount ?? 0,
    isActive: r.isActive !== false,
    headType:
      (s.headType as "tuition" | "transport" | "other") ??
      (s.head_type as "tuition" | "transport" | "other") ??
      "other",
    accountName:
      (s.accountName as string) ?? (s.account_name as string) ?? "Main Account",
    displayOrder:
      (s.displayOrder as number) ?? (s.display_order as number) ?? 1,
    applicableClasses: safeArray<string>(
      (s.applicableClasses ?? s.applicable_classes) as
        | string[]
        | string
        | undefined,
    ),
    sessionId: r.sessionId as string | undefined,
  };
}

const DEFAULT_FEE_HEADINGS = [
  {
    name: "Tuition Fee",
    headType: "tuition" as const,
    accountName: "Main Account",
  },
  {
    name: "Transport Fee",
    headType: "transport" as const,
    accountName: "Transport Account",
  },
  {
    name: "Development Fund",
    headType: "other" as const,
    accountName: "Main Account",
  },
  { name: "Exam Fee", headType: "other" as const, accountName: "Main Account" },
];

const HEAD_TYPE_LABELS: Record<string, string> = {
  tuition: "Tuition",
  transport: "Transport",
  other: "Other",
};

const HEAD_TYPE_COLORS: Record<string, string> = {
  tuition: "bg-blue-100 text-blue-700 border-blue-200",
  transport: "bg-orange-100 text-orange-700 border-orange-200",
  other: "bg-muted text-muted-foreground border-border",
};

export default function FeeHeadingPage() {
  const { isReadOnly, currentUser, currentSession, addNotification } = useApp();

  const [headings, setHeadings] = useState<FeeHeading[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [headType, setHeadType] = useState<"tuition" | "transport" | "other">(
    "tuition",
  );
  const [accountName, setAccountName] = useState("Main Account");
  const [displayOrder, setDisplayOrder] = useState("1");
  const [isActive, setIsActive] = useState(true);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([...MONTHS]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);

  const canEdit =
    currentUser?.role === "superadmin" ||
    currentUser?.role === "admin" ||
    currentUser?.role === "accountant";

  const fetchHeadings = useCallback(async () => {
    setIsLoading(true);
    try {
      const raw = await phpApiService.getFeeHeadings();
      const mapped = raw
        .map(toFeeHeading)
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      setHeadings(mapped);
    } catch {
      setHeadings([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHeadings();
    phpApiService
      .getClasses()
      .then((cls) => {
        setClasses(
          cls
            .map((c) => c.className)
            .sort((a, b) => CLASS_ORDER.indexOf(a) - CLASS_ORDER.indexOf(b)),
        );
      })
      .catch(() => setClasses(CLASS_ORDER));
  }, [fetchHeadings]);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const months = selectedMonths.length > 0 ? selectedMonths : [...MONTHS];
      const payload = {
        name: name.trim(),
        headType,
        head_type: headType,
        accountName: accountName.trim() || "Main Account",
        account_name: accountName.trim() || "Main Account",
        displayOrder: Number(displayOrder) || headings.length + 1,
        display_order: Number(displayOrder) || headings.length + 1,
        isActive,
        is_active: isActive ? 1 : 0,
        months,
        applicableClasses:
          selectedClasses.length > 0 ? JSON.stringify(selectedClasses) : null,
        applicable_classes:
          selectedClasses.length > 0 ? JSON.stringify(selectedClasses) : null,
        sessionId: currentSession?.id,
        session_id: currentSession?.id,
      };

      if (editId) {
        await phpApiService.post("fees/headings/update", {
          id: editId,
          ...payload,
        });
        addNotification(`Fee heading "${name.trim()}" updated`, "success");
      } else {
        await phpApiService.addFeeHeading(payload);
        addNotification(`Fee heading "${name.trim()}" added`, "success");
      }
      await fetchHeadings();
      resetForm();
    } catch (err) {
      addNotification(
        `Save failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(h: FeeHeading) {
    try {
      await phpApiService.post("fees/headings/update", {
        id: h.id,
        isActive: !h.isActive,
        is_active: !h.isActive ? 1 : 0,
      });
      addNotification(
        `"${h.name}" ${!h.isActive ? "activated" : "deactivated"}`,
        "info",
      );
      await fetchHeadings();
    } catch (err) {
      addNotification(
        `Update failed: ${err instanceof Error ? err.message : "Unknown"}`,
        "error",
      );
    }
  }

  async function moveOrder(h: FeeHeading, direction: "up" | "down") {
    if (reordering) return;
    const idx = headings.findIndex((x) => x.id === h.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= headings.length) return;
    const swap = headings[swapIdx];
    setReordering(true);
    try {
      await Promise.all([
        phpApiService.post("fees/headings/update", {
          id: h.id,
          displayOrder: swap.displayOrder ?? swapIdx + 1,
          display_order: swap.displayOrder ?? swapIdx + 1,
        }),
        phpApiService.post("fees/headings/update", {
          id: swap.id,
          displayOrder: h.displayOrder ?? idx + 1,
          display_order: h.displayOrder ?? idx + 1,
        }),
      ]);
      await fetchHeadings();
    } catch {
      /* noop */
    } finally {
      setReordering(false);
    }
  }

  async function addDefaultHeadings() {
    if (headings.length > 0) return;
    setSaving(true);
    try {
      for (let i = 0; i < DEFAULT_FEE_HEADINGS.length; i++) {
        const dh = DEFAULT_FEE_HEADINGS[i];
        await phpApiService.addFeeHeading({
          name: dh.name,
          headType: dh.headType,
          head_type: dh.headType,
          accountName: dh.accountName,
          account_name: dh.accountName,
          displayOrder: i + 1,
          display_order: i + 1,
          isActive: true,
          is_active: 1,
          months: [...MONTHS],
          sessionId: currentSession?.id,
          session_id: currentSession?.id,
        });
      }
      addNotification("Default fee headings added", "success");
      await fetchHeadings();
    } catch (err) {
      addNotification(
        `Failed: ${err instanceof Error ? err.message : "Unknown"}`,
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteHeading(h: FeeHeading) {
    if (
      !confirm(
        `Delete fee heading "${h.name}"? This will also remove it from all fee plans.`,
      )
    )
      return;
    try {
      await phpApiService.post("fees/headings/delete", { id: h.id });
      addNotification(`Fee heading "${h.name}" deleted`, "info");
      await fetchHeadings();
    } catch (err) {
      addNotification(
        `Delete failed: ${err instanceof Error ? err.message : "Unknown"}`,
        "error",
      );
    }
  }

  function openEdit(h: FeeHeading) {
    setEditId(h.id);
    setName(h.name);
    setHeadType(h.headType ?? "other");
    setAccountName(h.accountName ?? "Main Account");
    setDisplayOrder(String(h.displayOrder ?? 1));
    setIsActive(h.isActive !== false);
    setSelectedMonths(
      safeArray<string>(h.months as string[] | string | undefined),
    );
    setSelectedClasses(
      h.applicableClasses
        ? safeArray<string>(
            h.applicableClasses as string[] | string | undefined,
          )
        : [],
    );
    setOpen(true);
  }

  function resetForm() {
    setEditId(null);
    setName("");
    setHeadType("tuition");
    setAccountName("Main Account");
    setDisplayOrder(String(headings.length + 1));
    setIsActive(true);
    setSelectedMonths([...MONTHS]);
    setSelectedClasses([]);
    setOpen(false);
  }

  const classList = classes.length > 0 ? classes : CLASS_ORDER;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-foreground">Fee Headings</h3>
          <p className="text-sm text-muted-foreground">
            Define fee headings, types, accounts, and applicable months
          </p>
        </div>
        {canEdit && !isReadOnly && (
          <div className="flex gap-2">
            {headings.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void addDefaultHeadings()}
                disabled={saving}
                data-ocid="fee-heading.add-defaults-btn"
              >
                + Add Defaults
              </Button>
            )}
            <Button
              onClick={() => {
                setDisplayOrder(String(headings.length + 1));
                setOpen(true);
              }}
              data-ocid="fee-heading.add-btn"
            >
              + Add Heading
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          <div className="flex items-center gap-1.5 justify-center">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-primary animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
          <p className="mt-3 text-sm">Loading fee headings…</p>
        </div>
      ) : headings.length === 0 ? (
        <div
          className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground"
          data-ocid="fee-heading.empty_state"
        >
          <p className="text-4xl mb-3">📋</p>
          <p className="text-lg font-medium mb-1">No fee headings yet</p>
          <p className="text-sm mb-4">
            Add headings like Tuition Fee, Transport Fee, Development Fund.
          </p>
          {canEdit && !isReadOnly && (
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => void addDefaultHeadings()}
                disabled={saving}
                data-ocid="fee-heading.add-defaults-empty-btn"
              >
                {saving ? "Adding…" : "+ Add Default Headings"}
              </Button>
              <Button
                onClick={() => setOpen(true)}
                data-ocid="fee-heading.add-empty-btn"
              >
                + Add Custom Heading
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-3 text-left font-semibold text-muted-foreground w-8">
                  #
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  Heading Name
                </th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell">
                  Account
                </th>
                <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">
                  Months
                </th>
                <th className="px-4 py-3 text-center font-semibold">Active</th>
                {canEdit && !isReadOnly && (
                  <th className="px-4 py-3 text-center font-semibold">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {headings.map((h, idx) => (
                <tr
                  key={h.id}
                  className={`border-t border-border hover:bg-muted/20 transition-colors ${h.isActive === false ? "opacity-60" : ""}`}
                  data-ocid={`fee-heading.item.${idx + 1}`}
                >
                  <td className="px-3 py-3">
                    {canEdit && !isReadOnly ? (
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => void moveOrder(h, "up")}
                          disabled={idx === 0 || reordering}
                          className="text-[9px] text-muted-foreground hover:text-foreground disabled:opacity-20 leading-none"
                          aria-label="Move up"
                        >
                          ▲
                        </button>
                        <span className="text-[10px] text-muted-foreground text-center">
                          {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => void moveOrder(h, "down")}
                          disabled={idx === headings.length - 1 || reordering}
                          className="text-[9px] text-muted-foreground hover:text-foreground disabled:opacity-20 leading-none"
                          aria-label="Move down"
                        >
                          ▼
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {idx + 1}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{h.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${HEAD_TYPE_COLORS[h.headType ?? "other"]}`}
                    >
                      {HEAD_TYPE_LABELS[h.headType ?? "other"]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                    {h.accountName || "Main Account"}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {safeArray<string>(
                        h.months as string[] | string | undefined,
                      ).length === 12 ? (
                        <Badge variant="secondary" className="text-xs">
                          All 12 months
                        </Badge>
                      ) : (
                        safeArray<string>(
                          h.months as string[] | string | undefined,
                        )
                          .slice(0, 4)
                          .map((m) => (
                            <Badge
                              key={m}
                              variant="secondary"
                              className="text-xs"
                            >
                              {m.slice(0, 3)}
                            </Badge>
                          ))
                      )}
                      {safeArray<string>(
                        h.months as string[] | string | undefined,
                      ).length > 4 &&
                        safeArray<string>(
                          h.months as string[] | string | undefined,
                        ).length < 12 && (
                          <Badge variant="outline" className="text-xs">
                            +
                            {safeArray<string>(
                              h.months as string[] | string | undefined,
                            ).length - 4}
                          </Badge>
                        )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {canEdit && !isReadOnly ? (
                      <button
                        type="button"
                        onClick={() => void toggleActive(h)}
                        className={`text-xs font-semibold px-2 py-1 rounded-full transition-colors ${
                          h.isActive !== false
                            ? "text-green-700 bg-green-50 hover:bg-green-100"
                            : "text-muted-foreground bg-muted/50 hover:bg-muted"
                        }`}
                        data-ocid={`fee-heading.active-toggle.${idx + 1}`}
                      >
                        {h.isActive !== false ? "✓ Active" : "Inactive"}
                      </button>
                    ) : (
                      <span
                        className={`text-xs font-semibold ${h.isActive !== false ? "text-green-600" : "text-muted-foreground"}`}
                      >
                        {h.isActive !== false ? "✓ Yes" : "No"}
                      </span>
                    )}
                  </td>
                  {canEdit && !isReadOnly && (
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(h)}
                          data-ocid={`fee-heading.edit-btn.${idx + 1}`}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => void deleteHeading(h)}
                          data-ocid={`fee-heading.delete-btn.${idx + 1}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) resetForm();
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit" : "Add"} Fee Heading</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label
                htmlFor="fee-heading-name"
                className="text-sm font-medium mb-1 block"
              >
                Heading Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="fee-heading-name"
                placeholder="e.g. Tuition Fee, Lab Fee, Library Fee"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-ocid="fee-heading.name-input"
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Head Type</p>
              <div className="flex gap-2">
                {(["tuition", "transport", "other"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setHeadType(t)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${headType === t ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/50"}`}
                    data-ocid={`fee-heading.type-btn.${t}`}
                  >
                    {HEAD_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="fee-heading-account"
                  className="text-sm font-medium mb-1 block"
                >
                  Account Name
                </label>
                <Input
                  id="fee-heading-account"
                  placeholder="Main Account"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  data-ocid="fee-heading.account-input"
                />
              </div>
              <div>
                <label
                  htmlFor="fee-heading-order"
                  className="text-sm font-medium mb-1 block"
                >
                  Display Order
                </label>
                <Input
                  id="fee-heading-order"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={displayOrder}
                  onChange={(e) =>
                    setDisplayOrder(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  data-ocid="fee-heading.order-input"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 accent-primary"
                data-ocid="fee-heading.active-checkbox"
              />
              <span className="text-sm font-medium">
                Active (visible in fee collection)
              </span>
            </label>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Applicable Months</span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setSelectedMonths([...MONTHS])}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:underline"
                    onClick={() => setSelectedMonths([])}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {MONTHS.map((m) => (
                  <label
                    key={m}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMonths.includes(m)}
                      onChange={() =>
                        setSelectedMonths((prev) =>
                          prev.includes(m)
                            ? prev.filter((x) => x !== m)
                            : [...prev, m],
                        )
                      }
                      className="accent-primary"
                    />
                    {m.slice(0, 3)}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-medium">
                    Applicable Classes
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Leave blank to apply to all classes
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setSelectedClasses([...classList])}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:underline"
                    onClick={() => setSelectedClasses([])}
                  >
                    None
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto border border-border rounded-lg p-2">
                {classList.map((c) => (
                  <label
                    key={c}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedClasses.includes(c)}
                      onChange={() =>
                        setSelectedClasses((prev) =>
                          prev.includes(c)
                            ? prev.filter((x) => x !== c)
                            : [...prev, c],
                        )
                      }
                      className="accent-primary"
                    />
                    {c}
                  </label>
                ))}
              </div>
              {selectedClasses.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  No classes selected — heading will apply to all classes
                </p>
              )}
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={resetForm}
                disabled={saving}
                data-ocid="fee-heading.cancel-btn"
              >
                Cancel
              </Button>
              <Button
                onClick={() => void save()}
                disabled={!name.trim() || saving}
                data-ocid="fee-heading.save-btn"
              >
                {saving ? "Saving…" : editId ? "Update Heading" : "Add Heading"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
