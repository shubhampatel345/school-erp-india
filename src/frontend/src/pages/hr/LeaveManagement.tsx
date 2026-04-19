import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  CheckCircle,
  Clock,
  Info,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import type { Staff } from "../../types";
import { generateId } from "../../utils/localStorage";

// ── Types ─────────────────────────────────────────────────

type LeaveStatus = "Pending" | "Approved" | "Rejected";
type LeaveType =
  | "Casual Leave"
  | "Sick Leave"
  | "Earned Leave"
  | "Maternity Leave"
  | "Without Pay"
  | "Other";

interface LeaveRecord {
  id: string;
  staffId: string;
  staffName: string;
  designation: string;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
  totalDays: number;
}

// ── Constants ─────────────────────────────────────────────

const LEAVE_TYPES: LeaveType[] = [
  "Casual Leave",
  "Sick Leave",
  "Earned Leave",
  "Maternity Leave",
  "Without Pay",
  "Other",
];

/** Annual leave entitlement per type */
const LEAVE_BALANCE: Record<LeaveType, number> = {
  "Casual Leave": 12,
  "Sick Leave": 10,
  "Earned Leave": 15,
  "Maternity Leave": 90,
  "Without Pay": 0,
  Other: 0,
};

const STATUS_VARIANT: Record<LeaveStatus, string> = {
  Pending:
    "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  Approved: "text-accent bg-accent/10 border-accent/30",
  Rejected: "text-destructive bg-destructive/10 border-destructive/30",
};

const STATUS_ICONS: Record<LeaveStatus, typeof Clock> = {
  Pending: Clock,
  Approved: CheckCircle,
  Rejected: XCircle,
};

// ── Helpers ───────────────────────────────────────────────

function daysBetween(from: string, to: string): number {
  if (!from || !to) return 0;
  const d1 = new Date(from);
  const d2 = new Date(to);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 0;
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
}

// ── Staff Leave Balance Card ───────────────────────────────

function StaffLeaveBalanceCard({
  staffMember,
  records,
}: {
  staffMember: Staff;
  records: LeaveRecord[];
}) {
  const staffRecords = records.filter(
    (r) => r.staffId === staffMember.id && r.status === "Approved",
  );

  const usedByType: Partial<Record<LeaveType, number>> = {};
  for (const r of staffRecords) {
    usedByType[r.leaveType] = (usedByType[r.leaveType] ?? 0) + r.totalDays;
  }

  const pendingCount = records.filter(
    (r) => r.staffId === staffMember.id && r.status === "Pending",
  ).length;

  return (
    <div className="border border-border rounded-lg p-3 space-y-2 bg-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-foreground text-sm">
            {staffMember.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {staffMember.designation}
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {pendingCount} pending
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-xs">
        {(["Casual Leave", "Sick Leave", "Earned Leave"] as LeaveType[]).map(
          (lt) => {
            const allocated = LEAVE_BALANCE[lt];
            const used = usedByType[lt] ?? 0;
            const remaining = Math.max(0, allocated - used);
            const pct =
              allocated > 0 ? Math.round((used / allocated) * 100) : 0;
            return (
              <div key={lt} className="bg-muted/40 rounded p-1.5">
                <p className="text-muted-foreground truncate">
                  {lt.replace(" Leave", "")}
                </p>
                <p
                  className={`font-semibold ${remaining === 0 ? "text-destructive" : remaining < 3 ? "text-amber-600" : "text-foreground"}`}
                >
                  {remaining}/{allocated}
                </p>
                <div className="h-1 bg-muted rounded-full mt-0.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct > 80 ? "bg-destructive" : pct > 50 ? "bg-amber-500" : "bg-accent"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────

export default function LeaveManagement() {
  const {
    getData,
    saveData,
    updateData,
    deleteData,
    addNotification,
    currentUser,
  } = useApp();

  const [filterStatus, setFilterStatus] = useState<LeaveStatus | "all">("all");
  const [filterStaff, setFilterStaff] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showBalances, setShowBalances] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [fStaffId, setFStaffId] = useState("");
  const [fLeaveType, setFLeaveType] = useState<LeaveType>("Casual Leave");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fReason, setFReason] = useState("");

  // Read from context (server-synced)
  const records = getData("leave_records") as LeaveRecord[];
  const allStaff = (getData("staff") as Staff[]).filter(
    (s) => (s.status ?? "active") === "active",
  );

  const canApprove =
    currentUser?.role === "superadmin" || currentUser?.role === "admin";

  // ── CRUD ──────────────────────────────────────────────────

  async function handleSubmit() {
    if (!fStaffId || !fFrom || !fTo || !fReason.trim()) {
      alert("Please fill all required fields.");
      return;
    }
    const staffMember = allStaff.find((s) => s.id === fStaffId);
    if (!staffMember) return;

    setSaving(true);
    const rec: LeaveRecord = {
      id: generateId(),
      staffId: fStaffId,
      staffName: staffMember.name ?? staffMember.fullName ?? "",
      designation: staffMember.designation,
      leaveType: fLeaveType,
      fromDate: fFrom,
      toDate: fTo,
      reason: fReason.trim(),
      status: "Pending",
      appliedOn: new Date().toLocaleDateString("en-IN"),
      totalDays: daysBetween(fFrom, fTo),
    };

    try {
      await saveData(
        "leave_records",
        rec as unknown as Record<string, unknown>,
      );
      addNotification(
        `Leave request submitted for ${rec.staffName}`,
        "info",
        "📅",
      );
      setShowForm(false);
      setFStaffId("");
      setFFrom("");
      setFTo("");
      setFReason("");
      setFLeaveType("Casual Leave");
    } catch {
      addNotification("Failed to submit leave request.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: LeaveStatus) {
    try {
      await updateData("leave_records", id, { status });
      addNotification(
        `Leave ${status.toLowerCase()} successfully.`,
        status === "Approved" ? "success" : "info",
      );
    } catch {
      addNotification("Failed to update leave status.", "error");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this leave record?")) return;
    try {
      await deleteData("leave_records", id);
      addNotification("Leave record deleted.", "info");
    } catch {
      addNotification("Failed to delete leave record.", "error");
    }
  }

  // ── Derived ───────────────────────────────────────────────

  const filtered = useMemo(
    () =>
      records.filter((r) => {
        if (filterStatus !== "all" && r.status !== filterStatus) return false;
        if (
          filterStaff &&
          !r.staffName.toLowerCase().includes(filterStaff.toLowerCase())
        )
          return false;
        return true;
      }),
    [records, filterStatus, filterStaff],
  );

  const stats = useMemo(
    () => ({
      Pending: records.filter((r) => r.status === "Pending").length,
      Approved: records.filter((r) => r.status === "Approved").length,
      Rejected: records.filter((r) => r.status === "Rejected").length,
    }),
    [records],
  );

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Leave Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track and manage staff leave requests · Approved leaves are counted
            as present in Payroll
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowBalances((v) => !v)}
            data-ocid="leave.balance_toggle"
          >
            <Info className="w-4 h-4 mr-1" />
            {showBalances ? "Hide" : "Leave Balances"}
          </Button>
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            data-ocid="leave.add_button"
          >
            <Plus className="w-4 h-4 mr-1" />
            Apply Leave
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {(["Pending", "Approved", "Rejected"] as LeaveStatus[]).map((s) => {
          const Icon = STATUS_ICONS[s];
          return (
            <button
              type="button"
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
              data-ocid={`leave.${s.toLowerCase()}_filter`}
              className={`p-4 rounded-xl border text-left transition-colors ${
                filterStatus === s
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  {s}
                </span>
              </div>
              <p className="text-2xl font-bold font-display text-foreground">
                {stats[s]}
              </p>
            </button>
          );
        })}
      </div>

      {/* Payroll integration note */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-primary/80">
          <strong>Payroll integration:</strong> Approved leaves are
          automatically counted as present days when generating payroll.
          "Without Pay" leaves result in deduction.
        </p>
      </div>

      {/* Leave balance cards */}
      {showBalances && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Leave Balance by Staff
          </p>
          {allStaff.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active staff found.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allStaff.map((s) => (
                <StaffLeaveBalanceCard
                  key={s.id}
                  staffMember={s}
                  records={records}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Annual entitlement */}
      <Card className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Annual Leave Entitlement
        </p>
        <div className="flex flex-wrap gap-3">
          {(Object.entries(LEAVE_BALANCE) as [LeaveType, number][])
            .filter(([, days]) => days > 0)
            .map(([lt, days]) => (
              <div
                key={lt}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 text-sm"
              >
                <span className="text-muted-foreground">{lt}:</span>
                <span className="font-semibold text-foreground">
                  {days} days/year
                </span>
              </div>
            ))}
        </div>
      </Card>

      {/* Leave request form */}
      {showForm && (
        <Card className="p-5 border-primary/30 bg-primary/5 space-y-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-foreground">New Leave Request</p>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close form"
              data-ocid="leave.close_button"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Staff Member *</Label>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-card text-foreground"
                value={fStaffId}
                onChange={(e) => setFStaffId(e.target.value)}
                data-ocid="leave.staff_select"
              >
                <option value="">Select staff</option>
                {allStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name ?? s.fullName ?? s.empId} ({s.designation})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Leave Type *</Label>
              <Select
                value={fLeaveType}
                onValueChange={(v) => setFLeaveType(v as LeaveType)}
              >
                <SelectTrigger data-ocid="leave.type_select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                      {LEAVE_BALANCE[t] > 0
                        ? ` (${LEAVE_BALANCE[t]} days/yr)`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lv-from">From Date *</Label>
              <Input
                id="lv-from"
                type="date"
                value={fFrom}
                onChange={(e) => setFFrom(e.target.value)}
                data-ocid="leave.from_date_input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lv-to">To Date *</Label>
              <Input
                id="lv-to"
                type="date"
                value={fTo}
                onChange={(e) => setFTo(e.target.value)}
                min={fFrom}
                data-ocid="leave.to_date_input"
              />
            </div>
          </div>

          {fFrom && fTo && (
            <div className="flex items-center gap-2">
              <p className="text-sm text-primary font-medium">
                Total days: {daysBetween(fFrom, fTo)}
              </p>
              {fLeaveType === "Without Pay" && (
                <Badge
                  variant="outline"
                  className="text-xs text-destructive border-destructive/40"
                >
                  Without Pay — will deduct from payroll
                </Badge>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="lv-reason">Reason *</Label>
            <Input
              id="lv-reason"
              value={fReason}
              onChange={(e) => setFReason(e.target.value)}
              placeholder="Brief reason for leave"
              data-ocid="leave.reason_input"
            />
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => void handleSubmit()}
              disabled={saving}
              data-ocid="leave.submit_button"
            >
              Submit Request
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowForm(false)}
              data-ocid="leave.cancel_button"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search by staff name…"
          value={filterStaff}
          onChange={(e) => setFilterStaff(e.target.value)}
          className="max-w-xs"
          data-ocid="leave.search_input"
        />
        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v as LeaveStatus | "all")}
        >
          <SelectTrigger className="w-36" data-ocid="leave.status_filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center" data-ocid="leave.empty_state">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">
            {records.length === 0
              ? "No leave requests yet. Click 'Apply Leave' to create the first."
              : "No requests match the current filter."}
          </p>
          {records.length === 0 && (
            <Button
              size="sm"
              className="mt-4"
              onClick={() => setShowForm(true)}
              data-ocid="leave.empty_add_button"
            >
              <Plus className="w-4 h-4 mr-1" /> Apply Leave
            </Button>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    Staff
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    Leave Type
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    Duration
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">
                    Reason
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r, idx) => {
                  const StatusIcon = STATUS_ICONS[r.status];
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-muted/30 transition-colors"
                      data-ocid={`leave.item.${idx + 1}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">
                          {r.staffName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.designation}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${r.leaveType === "Without Pay" ? "border-destructive/40 text-destructive" : ""}`}
                        >
                          {r.leaveType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-muted-foreground">
                          {r.fromDate} – {r.toDate}
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {r.totalDays} day{r.totalDays !== 1 ? "s" : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-[200px]">
                        <p className="truncate">{r.reason}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${STATUS_VARIANT[r.status]}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {r.status}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {r.appliedOn}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end flex-wrap">
                          {r.status === "Pending" && canApprove && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 text-accent border-accent/40 hover:bg-accent/10"
                                onClick={() =>
                                  void updateStatus(r.id, "Approved")
                                }
                                data-ocid={`leave.approve_button.${idx + 1}`}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 text-destructive border-destructive/40 hover:bg-destructive/10"
                                onClick={() =>
                                  void updateStatus(r.id, "Rejected")
                                }
                                data-ocid={`leave.reject_button.${idx + 1}`}
                              >
                                <XCircle className="w-3 h-3 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive h-7"
                            aria-label="Delete record"
                            onClick={() => void handleDelete(r.id)}
                            data-ocid={`leave.delete_button.${idx + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
