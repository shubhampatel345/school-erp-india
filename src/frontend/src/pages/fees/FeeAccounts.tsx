/**
 * FeeAccounts.tsx — Direct phpApiService (no getData, no context data cache)
 *
 * Loads all receipts from server on mount.
 * Shows heading-wise and monthly fee collection breakdown with bar chart.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useApp } from "../../context/AppContext";
import type { FeeAccount, FeeHeading, FeeReceipt } from "../../types";
import { formatCurrency, generateId } from "../../utils/localStorage";
import phpApiService from "../../utils/phpApiService";

interface HeadingRow {
  id: string;
  name: string;
  total: number;
}

interface MonthlyChartData {
  month: string;
  amount: number;
}

const MONTH_LABELS = [
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
];

export default function FeeAccounts() {
  const { currentUser, isReadOnly, currentSession, addNotification } = useApp();

  const [receipts, setReceipts] = useState<FeeReceipt[]>([]);
  const [headings, setHeadings] = useState<FeeHeading[]>([]);
  const [accounts, setAccounts] = useState<FeeAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const canEdit =
    currentUser?.role === "superadmin" || currentUser?.role === "admin";

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rawReceipts, rawHeadings] = await Promise.all([
        phpApiService.get<FeeReceipt[]>(
          "fees/receipts/all",
          currentSession?.id ? { sessionId: currentSession.id } : undefined,
        ),
        phpApiService.getFeeHeadings(),
      ]);
      setReceipts(
        (rawReceipts ?? []).filter(
          (r) =>
            !r.isDeleted &&
            (!currentSession || r.sessionId === currentSession.id),
        ),
      );
      setHeadings(rawHeadings as unknown as FeeHeading[]);
    } catch {
      setReceipts([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentSession]);

  // Load accounts from server (or localStorage fallback)
  useEffect(() => {
    void fetchData();
    phpApiService
      .get<FeeAccount[]>("fees/accounts")
      .then((raw) => setAccounts(raw ?? []))
      .catch(() => {
        // fallback: no accounts yet
        setAccounts([]);
      });
  }, [fetchData]);

  // ── Heading-wise breakdown ────────────────────────────────────────────────
  const headingTotals: Record<string, number> = {};
  let otherChargesTotal = 0;
  for (const receipt of receipts) {
    for (const item of receipt.items) {
      headingTotals[item.headingId] =
        (headingTotals[item.headingId] ?? 0) + item.amount;
    }
    if (Array.isArray(receipt.otherCharges)) {
      for (const oc of receipt.otherCharges) {
        otherChargesTotal += oc.paidAmount ?? 0;
      }
    }
  }

  const headingRows: HeadingRow[] = [];
  const seenIds = new Set<string>();
  for (const h of headings) {
    const total = headingTotals[h.id] ?? 0;
    if (total > 0) {
      headingRows.push({ id: h.id, name: h.name, total });
      seenIds.add(h.id);
    }
  }
  for (const [hId, total] of Object.entries(headingTotals)) {
    if (!seenIds.has(hId) && total > 0) {
      let name = "(Deleted Heading)";
      outer: for (const receipt of receipts) {
        for (const item of receipt.items) {
          if (item.headingId === hId && item.headingName) {
            name = item.headingName;
            break outer;
          }
        }
      }
      headingRows.push({ id: hId, name, total });
    }
  }
  headingRows.sort((a, b) => b.total - a.total);
  const grandTotal =
    headingRows.reduce((s, r) => s + r.total, 0) + otherChargesTotal;

  // ── Monthly chart data ────────────────────────────────────────────────────
  const monthlyAmounts: Record<string, number> = {};
  for (const r of receipts) {
    // Group by academic month (April = index 0)
    const items = [...r.items];
    for (const item of items) {
      const mIdx = [
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
        "January",
        "February",
        "March",
      ].indexOf(item.month);
      if (mIdx >= 0) {
        const label = MONTH_LABELS[mIdx];
        monthlyAmounts[label] = (monthlyAmounts[label] ?? 0) + item.amount;
      }
    }
  }
  const chartData: MonthlyChartData[] = MONTH_LABELS.map((m) => ({
    month: m,
    amount: monthlyAmounts[m] ?? 0,
  })).filter((d) => d.amount > 0);

  const totalReceipts = receipts.reduce((s, r) => s + r.totalAmount, 0);

  // ── Account CRUD ──────────────────────────────────────────────────────────
  async function addAccount() {
    if (!newName.trim()) return;
    const acc: FeeAccount = { id: generateId(), name: newName.trim() };
    try {
      await phpApiService.post("fees/accounts/save", { name: acc.name });
      setAccounts((prev) => [...prev, acc]);
      addNotification(`Account "${acc.name}" added`, "success");
      setNewName("");
    } catch {
      // fallback: add locally
      setAccounts((prev) => [...prev, acc]);
      setNewName("");
    }
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    try {
      await phpApiService.post("fees/accounts/save", {
        id,
        name: editName.trim(),
      });
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, name: editName.trim() } : a)),
      );
      addNotification("Account updated", "success");
    } catch {
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, name: editName.trim() } : a)),
      );
    }
    setEditId(null);
    setEditName("");
  }

  async function deleteAccount(id: string) {
    if (!confirm("Delete this account?")) return;
    try {
      await phpApiService.post("fees/accounts/delete", { id });
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      addNotification("Account deleted", "info");
    } catch {
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-foreground">Fee Accounts</h3>
        <p className="text-sm text-muted-foreground">
          Heading-wise and monthly fee collection breakdown
        </p>
      </div>

      {/* Summary card */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
        <p className="text-sm text-muted-foreground mb-1">
          Total Fees Received (Current Session)
        </p>
        <p className="text-2xl font-bold text-primary">
          {isLoading ? "Loading…" : formatCurrency(totalReceipts)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {receipts.length} receipt(s) in this session
        </p>
      </div>

      {/* Monthly chart */}
      {chartData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h4 className="font-semibold text-sm mb-3">Monthly Fee Collection</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => [
                  formatCurrency(value),
                  "Collected",
                ]}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="amount"
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Add account */}
      {canEdit && !isReadOnly && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-medium mb-2">Add Fee Account</p>
          <div className="flex gap-2">
            <Input
              placeholder="Account name (e.g. Main Account, Lab Fund)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addAccount();
              }}
              data-ocid="add-account-input"
            />
            <Button
              onClick={() => void addAccount()}
              disabled={!newName.trim()}
              data-ocid="add-account-btn"
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Accounts list */}
      {accounts.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-sm font-semibold">Fee Accounts</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">#</th>
                <th className="px-4 py-3 text-left font-semibold">
                  Account Name
                </th>
                {canEdit && (
                  <th className="px-4 py-3 text-center font-semibold">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc, idx) => (
                <tr
                  key={acc.id}
                  className="border-t border-border hover:bg-muted/20"
                  data-ocid={`fee-account-row.item.${idx + 1}`}
                >
                  <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3">
                    {editId === acc.id ? (
                      <div className="flex gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 w-48"
                          data-ocid="edit-account-input"
                        />
                        <Button
                          size="sm"
                          onClick={() => void saveEdit(acc.id)}
                          data-ocid="save-account-btn"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditId(null);
                            setEditName("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <span className="font-medium">{acc.name}</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-center">
                      {editId !== acc.id && !isReadOnly && (
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditId(acc.id);
                              setEditName(acc.name);
                            }}
                            data-ocid={`edit-account-btn.${idx + 1}`}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/20 hover:bg-destructive/10"
                            onClick={() => void deleteAccount(acc.id)}
                            data-ocid={`delete-account-btn.${idx + 1}`}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Heading-wise collections */}
      <div>
        <div className="mb-3">
          <h3 className="font-semibold text-foreground">
            Heading-wise Collections
          </h3>
          <p className="text-sm text-muted-foreground">
            Total amount received per fee heading in the current session
          </p>
        </div>

        {headingRows.length === 0 && otherChargesTotal === 0 && !isLoading ? (
          <div
            className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground"
            data-ocid="fee-accounts.empty_state"
          >
            <p className="text-2xl mb-2">📋</p>
            <p className="font-medium">No fee collections recorded yet</p>
            <p className="text-sm mt-1">
              Collections will appear here once fee receipts are saved.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm" data-ocid="heading-wise-table">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                    #
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                    Fee Heading
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                    Amount Received
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground hidden md:table-cell">
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {headingRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="border-t border-border hover:bg-muted/20"
                    data-ocid={`heading-collection-row.item.${idx + 1}`}
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {row.name}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">
                      {formatCurrency(row.total)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs hidden md:table-cell">
                      {grandTotal > 0
                        ? `${((row.total / grandTotal) * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
                {otherChargesTotal > 0 && (
                  <tr className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-3 text-muted-foreground">
                      {headingRows.length + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      Other Charges
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">
                      {formatCurrency(otherChargesTotal)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs hidden md:table-cell">
                      {grandTotal > 0
                        ? `${((otherChargesTotal / grandTotal) * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>
                )}
                <tr className="border-t-2 border-border bg-muted/30">
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 font-bold text-foreground">
                    Grand Total
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-foreground text-base">
                    {formatCurrency(grandTotal)}
                  </td>
                  <td className="hidden md:table-cell" />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
