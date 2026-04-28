/**
 * SHUBH SCHOOL ERP — Expenses & Income Module
 * Direct PHP API via apiCall(). No getData() stubs.
 * ALL amount fields: type="text" inputMode="decimal" — NO spinners.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart2,
  Download,
  Edit2,
  Loader2,
  PlusCircle,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { apiCall } from "../utils/api";
import { MONTHS, formatCurrency } from "../utils/localStorage";

interface ExpenseHead {
  id: string;
  name: string;
  type: "income" | "expense";
  monthlyBudget?: number;
}

interface ExpenseRow {
  id: string;
  date: string;
  description?: string;
  category?: string;
  amount: number;
  type: "income" | "expense";
  paymentMode?: string;
  sessionId?: string;
}

const DEFAULT_HEADS: ExpenseHead[] = [
  { id: "h0", name: "Salary", type: "expense" },
  { id: "h1", name: "Utilities", type: "expense" },
  { id: "h2", name: "Maintenance", type: "expense" },
  { id: "h3", name: "Stationery", type: "expense" },
  { id: "h4", name: "Food / Canteen", type: "expense" },
  { id: "h5", name: "Transport", type: "expense" },
  { id: "h6", name: "Events", type: "expense" },
  { id: "h7", name: "Fees Income", type: "income" },
  { id: "h8", name: "Other Income", type: "income" },
];

function downloadCSV(filename: string, rows: string[][]): void {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function SimpleBarChart({
  data,
}: { data: { label: string; income: number; expense: number }[] }) {
  const max = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1);
  return (
    <div className="flex items-end gap-1 h-36 mt-2">
      {data.map((d) => (
        <div
          key={d.label}
          className="flex flex-col items-center gap-0.5 flex-1 min-w-0"
        >
          <div className="w-full flex gap-0.5 items-end h-28">
            <div
              className="flex-1 rounded-t"
              style={{
                height: `${(d.income / max) * 100}%`,
                backgroundColor: "oklch(0.7 0.16 142)",
              }}
              title={`Income: ${formatCurrency(d.income)}`}
            />
            <div
              className="flex-1 rounded-t"
              style={{
                height: `${(d.expense / max) * 100}%`,
                backgroundColor: "oklch(0.56 0.22 25)",
              }}
              title={`Expense: ${formatCurrency(d.expense)}`}
            />
          </div>
          <span className="text-[10px] text-muted-foreground truncate w-full text-center">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

const TABS = [
  { id: "expenses" as const, label: "Expenses" },
  { id: "income" as const, label: "Income" },
  { id: "heads" as const, label: "Heads" },
  { id: "report" as const, label: "Reports" },
];

export default function Expenses() {
  const { currentSession } = useApp();
  const sessionId = currentSession?.id ?? "";

  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [heads, setHeads] = useState<ExpenseHead[]>(DEFAULT_HEADS);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<
    "expenses" | "income" | "heads" | "report"
  >("expenses");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"income" | "expense">("expense");
  const [editItem, setEditItem] = useState<ExpenseRow | null>(null);
  const [search, setSearch] = useState("");
  const [headFilter, setHeadFilter] = useState("all");
  const [budget, setBudget] = useState("50000");

  const [showHeadModal, setShowHeadModal] = useState(false);
  const [editHeadId, setEditHeadId] = useState<string | null>(null);
  const [headForm, setHeadForm] = useState({
    name: "",
    type: "expense" as "income" | "expense",
    monthlyBudget: "",
  });

  const [entryForm, setEntryForm] = useState({
    headName: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    type: "expense" as "income" | "expense",
    paymentMode: "Cash",
  });
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall<ExpenseRow[] | { data?: ExpenseRow[] }>(
        "expenses/list",
      );
      const rows: ExpenseRow[] = Array.isArray(res)
        ? res
        : Array.isArray((res as { data?: ExpenseRow[] }).data)
          ? (res as { data?: ExpenseRow[] }).data!
          : [];
      setExpenses(rows);
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const expenseList = useMemo(
    () => expenses.filter((e) => e.type === "expense"),
    [expenses],
  );
  const incomeList = useMemo(
    () => expenses.filter((e) => e.type === "income"),
    [expenses],
  );

  const filteredExpenses = useMemo(() => {
    const q = search.toLowerCase();
    return expenseList.filter(
      (e) =>
        (!q ||
          (e.description ?? "").toLowerCase().includes(q) ||
          (e.category ?? "").toLowerCase().includes(q)) &&
        (headFilter === "all" || e.category === headFilter),
    );
  }, [expenseList, search, headFilter]);

  const filteredIncome = useMemo(() => {
    const q = search.toLowerCase();
    return incomeList.filter(
      (e) =>
        (!q ||
          (e.description ?? "").toLowerCase().includes(q) ||
          (e.category ?? "").toLowerCase().includes(q)) &&
        (headFilter === "all" || e.category === headFilter),
    );
  }, [incomeList, search, headFilter]);

  const totalIncome = useMemo(
    () => incomeList.reduce((s, e) => s + e.amount, 0),
    [incomeList],
  );
  const totalExpense = useMemo(
    () => expenseList.reduce((s, e) => s + e.amount, 0),
    [expenseList],
  );
  const net = totalIncome - totalExpense;

  const monthlyData = useMemo(
    () =>
      MONTHS.map((m) => {
        const ms = m.slice(0, 3);
        const mExpenses = expenses.filter((e) => {
          if (!e.date) return false;
          return (
            new Date(e.date).toLocaleString("en-US", { month: "short" }) === ms
          );
        });
        return {
          label: ms,
          income: mExpenses
            .filter((e) => e.type === "income")
            .reduce((s, e) => s + e.amount, 0),
          expense: mExpenses
            .filter((e) => e.type === "expense")
            .reduce((s, e) => s + e.amount, 0),
        };
      }),
    [expenses],
  );

  const headBreakdown = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    for (const e of expenses) {
      const h = e.category ?? "Other";
      if (!map[h]) map[h] = { income: 0, expense: 0 };
      if (e.type === "income") map[h].income += e.amount;
      else map[h].expense += e.amount;
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.expense - a.expense);
  }, [expenses]);

  const openAdd = (type: "income" | "expense") => {
    setDialogType(type);
    setEditItem(null);
    setEntryForm({
      headName: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      type,
      paymentMode: "Cash",
    });
    setDialogOpen(true);
  };

  const openEdit = (type: "income" | "expense", item: ExpenseRow) => {
    setDialogType(type);
    setEditItem(item);
    setEntryForm({
      headName: item.category ?? "",
      amount: String(item.amount),
      date: item.date,
      description: item.description ?? "",
      type: item.type,
      paymentMode: item.paymentMode ?? "Cash",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!entryForm.headName || !entryForm.amount || !entryForm.date) return;
    setSaving(true);
    const record = {
      date: entryForm.date,
      description: entryForm.description,
      category: entryForm.headName,
      amount: Number(entryForm.amount),
      type: entryForm.type,
      paymentMode: entryForm.paymentMode,
      sessionId,
    };
    try {
      if (editItem) {
        await apiCall("expenses/update", "POST", {
          ...record,
          id: editItem.id,
        });
        setExpenses((prev) =>
          prev.map((e) => (e.id === editItem.id ? { ...e, ...record } : e)),
        );
        toast.success("Updated");
      } else {
        const res = await apiCall<{ id?: string }>(
          "expenses/add",
          "POST",
          record,
        );
        const newE = {
          ...record,
          id: res?.id ?? `exp_${Date.now()}`,
        } as ExpenseRow;
        setExpenses((prev) => [newE, ...prev]);
        toast.success("Added");
      }
      setDialogOpen(false);
      setEditItem(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    try {
      await apiCall("expenses/delete", "POST", { id });
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleSaveHead = async () => {
    if (!headForm.name.trim()) return;
    const data = {
      name: headForm.name.trim(),
      type: headForm.type,
      monthlyBudget: Number(headForm.monthlyBudget) || 0,
    };
    try {
      if (editHeadId) {
        await apiCall("settings/save", "POST", {
          key: `expense_head_${editHeadId}`,
          value: JSON.stringify({ ...data, id: editHeadId }),
        });
        setHeads((prev) =>
          prev.map((h) => (h.id === editHeadId ? { ...h, ...data } : h)),
        );
        toast.success("Head updated");
      } else {
        const id = `h_${Date.now()}`;
        await apiCall("settings/save", "POST", {
          key: `expense_head_${id}`,
          value: JSON.stringify({ ...data, id }),
        });
        setHeads((prev) => [...prev, { ...data, id }]);
        toast.success("Head added");
      }
      setShowHeadModal(false);
      setEditHeadId(null);
    } catch {
      toast.error("Failed to save head");
    }
  };

  function EntryList({
    list,
    type,
  }: { list: ExpenseRow[]; type: "income" | "expense" }) {
    return (
      <div className="space-y-1 max-h-[480px] overflow-y-auto">
        {list.length === 0 ? (
          <div
            className="py-12 text-center text-muted-foreground"
            data-ocid={`expenses.${type}_empty_state`}
          >
            <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No {type} entries yet</p>
          </div>
        ) : (
          list.map((e, i) => (
            <div
              key={e.id}
              data-ocid={`expenses.${type}_item.${i + 1}`}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {e.description || e.category}
                </p>
                <p className="text-xs text-muted-foreground">
                  {e.date} · {e.category} · {e.paymentMode ?? "Cash"}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-2 shrink-0">
                <span
                  className={`font-mono font-semibold text-sm ${type === "income" ? "text-foreground" : "text-destructive"}`}
                >
                  {type === "income" ? "+" : "-"}
                  {formatCurrency(e.amount)}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => openEdit(type, e)}
                  data-ocid={`expenses.edit_button.${i + 1}`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive"
                  onClick={() => void handleDelete(e.id)}
                  data-ocid={`expenses.delete_button.${i + 1}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-background min-h-screen space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display">
          Expenses & Income
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Track school finances
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-foreground opacity-60" />
            <p className="text-xl font-bold font-mono text-foreground">
              {formatCurrency(totalIncome)}
            </p>
            <p className="text-xs text-muted-foreground">Total Income</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <TrendingDown className="w-4 h-4 mx-auto mb-1 text-destructive" />
            <p className="text-xl font-bold font-mono text-destructive">
              {formatCurrency(totalExpense)}
            </p>
            <p className="text-xs text-muted-foreground">Total Expense</p>
          </CardContent>
        </Card>
        <Card
          className={
            net >= 0
              ? "bg-primary/5 border-primary/20"
              : "bg-destructive/5 border-destructive/20"
          }
        >
          <CardContent className="pt-4 pb-3 text-center">
            <p
              className={`text-xl font-bold font-mono ${net >= 0 ? "text-primary" : "text-destructive"}`}
            >
              {formatCurrency(Math.abs(net))}
            </p>
            <p className="text-xs text-muted-foreground">
              {net >= 0 ? "Surplus" : "Deficit"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="bg-card border border-border rounded-xl p-1 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            data-ocid={`expenses.${t.id}_tab`}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === t.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-2" data-ocid="expenses.loading_state">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      )}

      {!loading && activeTab === "expenses" && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Search expenses…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
              data-ocid="expenses.search_input"
            />
            <select
              className="border border-input rounded-md px-3 py-2 text-sm bg-background"
              value={headFilter}
              onChange={(e) => setHeadFilter(e.target.value)}
              data-ocid="expenses.head_filter"
            >
              <option value="all">All Heads</option>
              {heads
                .filter((h) => h.type === "expense")
                .map((h) => (
                  <option key={h.id} value={h.name}>
                    {h.name}
                  </option>
                ))}
            </select>
            <Button
              onClick={() => openAdd("expense")}
              data-ocid="expenses.add_button"
            >
              <PlusCircle className="w-4 h-4 mr-1" /> Add Expense
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCSV("expenses.csv", [
                  ["Date", "Category", "Description", "Amount", "Mode"],
                  ...filteredExpenses.map((e) => [
                    e.date,
                    e.category ?? "",
                    e.description ?? "",
                    String(e.amount),
                    e.paymentMode ?? "",
                  ]),
                ])
              }
              data-ocid="expenses.export_button"
            >
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
          </div>
          <EntryList list={filteredExpenses} type="expense" />
        </div>
      )}

      {!loading && activeTab === "income" && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Search income…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
              data-ocid="income.search_input"
            />
            <Button
              onClick={() => openAdd("income")}
              data-ocid="income.add_button"
            >
              <PlusCircle className="w-4 h-4 mr-1" /> Add Income
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCSV("income.csv", [
                  ["Date", "Category", "Description", "Amount", "Mode"],
                  ...filteredIncome.map((e) => [
                    e.date,
                    e.category ?? "",
                    e.description ?? "",
                    String(e.amount),
                    e.paymentMode ?? "",
                  ]),
                ])
              }
              data-ocid="income.export_button"
            >
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
          </div>
          <EntryList list={filteredIncome} type="income" />
        </div>
      )}

      {!loading && activeTab === "heads" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">
              Expense / Income Heads
            </h3>
            <Button
              size="sm"
              onClick={() => {
                setHeadForm({ name: "", type: "expense", monthlyBudget: "" });
                setEditHeadId(null);
                setShowHeadModal(true);
              }}
              data-ocid="expenses.add_head_button"
            >
              + Add Head
            </Button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Head Name", "Type", "Monthly Budget", "Actions"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left font-semibold text-muted-foreground"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {heads.map((h, idx) => (
                  <tr
                    key={h.id}
                    className="border-t border-border hover:bg-muted/30"
                    data-ocid={`expenses.head.${idx + 1}`}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {h.name}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={h.type === "income" ? "default" : "secondary"}
                      >
                        {h.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {h.monthlyBudget && h.monthlyBudget > 0
                        ? formatCurrency(h.monthlyBudget)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setHeadForm({
                              name: h.name,
                              type: h.type,
                              monthlyBudget: h.monthlyBudget
                                ? String(h.monthlyBudget)
                                : "",
                            });
                            setEditHeadId(h.id);
                            setShowHeadModal(true);
                          }}
                          data-ocid={`expenses.edit_head_button.${idx + 1}`}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async () => {
                            await apiCall("settings/save", "POST", {
                              key: `expense_head_${h.id}`,
                              value: "",
                            });
                            setHeads((prev) =>
                              prev.filter((x) => x.id !== h.id),
                            );
                            toast.success("Deleted");
                          }}
                          data-ocid={`expenses.delete_head_button.${idx + 1}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && activeTab === "report" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart2 className="w-4 h-4" /> Monthly Income vs Expense
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 text-xs mb-2">
                <span className="flex items-center gap-1">
                  <span
                    className="w-3 h-3 rounded-sm inline-block"
                    style={{ backgroundColor: "oklch(0.7 0.16 142)" }}
                  />{" "}
                  Income
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className="w-3 h-3 rounded-sm inline-block"
                    style={{ backgroundColor: "oklch(0.56 0.22 25)" }}
                  />{" "}
                  Expense
                </span>
              </div>
              <SimpleBarChart data={monthlyData} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Head-wise Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {headBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {headBreakdown.map((h) => (
                    <div
                      key={h.name}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="w-32 truncate font-medium text-foreground">
                        {h.name}
                      </span>
                      {h.income > 0 && (
                        <span className="text-foreground font-mono">
                          +{formatCurrency(h.income)}
                        </span>
                      )}
                      {h.expense > 0 && (
                        <span className="text-destructive font-mono">
                          -{formatCurrency(h.expense)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Budget vs Actual (This Month)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Label className="text-xs whitespace-nowrap">
                  Monthly Budget (₹)
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={budget}
                  onChange={(e) =>
                    setBudget(
                      e.target.value
                        .replace(/[^0-9.]/g, "")
                        .replace(/(\..*)\./g, "$1"),
                    )
                  }
                  className="w-36"
                  data-ocid="expenses.budget_input"
                />
              </div>
              {(() => {
                const now = new Date();
                const thisMonthExpense = expenseList
                  .filter((e) => {
                    const d = new Date(e.date);
                    return (
                      d.getMonth() === now.getMonth() &&
                      d.getFullYear() === now.getFullYear()
                    );
                  })
                  .reduce((s, e) => s + e.amount, 0);
                const budgetNum = Number(budget) || 0;
                const pct =
                  budgetNum > 0
                    ? Math.min(
                        100,
                        Math.round((thisMonthExpense / budgetNum) * 100),
                      )
                    : 0;
                return (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Spent: {formatCurrency(thisMonthExpense)}</span>
                      <span>Budget: {formatCurrency(budgetNum)}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-yellow-500" : "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p
                      className={`text-xs mt-1 ${pct >= 100 ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {pct}% of budget used
                      {pct >= 100 ? " — Budget exceeded!" : ""}
                    </p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add/Edit Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="expenses.dialog">
          <DialogHeader>
            <DialogTitle>
              {editItem
                ? "Edit Entry"
                : dialogType === "expense"
                  ? "Add Expense"
                  : "Add Income"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Head / Category *</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background mt-1"
                  value={entryForm.headName}
                  onChange={(e) =>
                    setEntryForm((f) => ({ ...f, headName: e.target.value }))
                  }
                  data-ocid="expenses.form_head_select"
                >
                  <option value="">— Select Head —</option>
                  {heads
                    .filter((h) => h.type === dialogType)
                    .map((h) => (
                      <option key={h.id} value={h.name}>
                        {h.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <Label>Amount (₹) *</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={entryForm.amount}
                  onChange={(e) =>
                    setEntryForm((f) => ({
                      ...f,
                      amount: e.target.value
                        .replace(/[^0-9.]/g, "")
                        .replace(/(\..*)\./g, "$1"),
                    }))
                  }
                  placeholder="0.00"
                  className="mt-1"
                  data-ocid="expenses.form_amount_input"
                />
              </div>
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={entryForm.date}
                  onChange={(e) =>
                    setEntryForm((f) => ({ ...f, date: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Payment Mode</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background mt-1"
                  value={entryForm.paymentMode}
                  onChange={(e) =>
                    setEntryForm((f) => ({ ...f, paymentMode: e.target.value }))
                  }
                >
                  {["Cash", "Cheque", "Online"].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Input
                  value={entryForm.description}
                  onChange={(e) =>
                    setEntryForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Details about this entry"
                  className="mt-1"
                  data-ocid="expenses.form_description_input"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setEditItem(null);
                }}
                data-ocid="expenses.form_cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleSave()}
                disabled={saving}
                data-ocid="expenses.form_submit_button"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : null}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Head Modal */}
      {showHeadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-elevated animate-slide-up">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">
                {editHeadId ? "Edit Head" : "Add Head"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowHeadModal(false);
                  setEditHeadId(null);
                }}
                className="text-muted-foreground hover:text-foreground text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <Label>Head Name *</Label>
                <Input
                  value={headForm.name}
                  onChange={(e) =>
                    setHeadForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Salary"
                  className="mt-1"
                  data-ocid="expenses.head_name_input"
                />
              </div>
              <div>
                <Label>Type</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background mt-1"
                  value={headForm.type}
                  onChange={(e) =>
                    setHeadForm((f) => ({
                      ...f,
                      type: e.target.value as "income" | "expense",
                    }))
                  }
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <Label>Monthly Budget (₹)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={headForm.monthlyBudget}
                  onChange={(e) =>
                    setHeadForm((f) => ({
                      ...f,
                      monthlyBudget: e.target.value
                        .replace(/[^0-9.]/g, "")
                        .replace(/(\..*)\./g, "$1"),
                    }))
                  }
                  placeholder="0 = no budget"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={() => void handleSaveHead()}
                  data-ocid="expenses.head_save_button"
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowHeadModal(false);
                    setEditHeadId(null);
                  }}
                  data-ocid="expenses.head_cancel_button"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
