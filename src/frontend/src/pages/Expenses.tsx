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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart2,
  Download,
  Edit2,
  PieChart,
  PlusCircle,
  Printer,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import type { Expense, ExpenseHead } from "../types";
import { dataService } from "../utils/dataService";
import {
  LS_KEYS,
  MONTHS,
  formatCurrency,
  generateId,
  ls,
} from "../utils/localStorage";

// ─── Helpers ─────────────────────────────────────────────
const CURRENT_MONTH = new Date().toLocaleString("en-IN", { month: "long" });

function exportCsv(data: (Expense & { balance: number })[]) {
  const rows = [["Date", "Type", "Head", "Description", "Amount", "Balance"]];
  for (const e of data) {
    rows.push([
      e.date,
      e.type,
      e.category,
      e.description,
      e.amount.toString(),
      e.balance.toString(),
    ]);
  }
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "expenses_ledger.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Ledger Tab ──────────────────────────────────────────
function LedgerTab() {
  const { currentSession, addNotification } = useApp();
  const headsDs = dataService.get<ExpenseHead>("expense_heads");
  const heads =
    headsDs.length > 0
      ? headsDs
      : ls.get<ExpenseHead[]>(LS_KEYS.expenseHeads, []);

  const [entries, setEntries] = useState<Expense[]>(() => {
    const ds = dataService.get<Expense>("expenses");
    return ds.length > 0 ? ds : ls.get<Expense[]>(LS_KEYS.expenses, []);
  });
  const [filterType, setFilterType] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const [form, setForm] = useState({
    type: "expense" as "income" | "expense",
    category: "",
    date: new Date().toISOString().slice(0, 10),
    description: "",
    amount: "",
  });

  const sessionEntries = useMemo(
    () =>
      entries
        .filter((e) => e.sessionId === currentSession?.id)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [entries, currentSession],
  );

  const filtered = useMemo(
    () =>
      sessionEntries.filter((e) => {
        const matchType = filterType === "all" || e.type === filterType;
        const matchFrom = !filterFrom || e.date >= filterFrom;
        const matchTo = !filterTo || e.date <= filterTo;
        return matchType && matchFrom && matchTo;
      }),
    [sessionEntries, filterType, filterFrom, filterTo],
  );

  const { totalIncome, totalExpense } = useMemo(() => {
    const inc = sessionEntries
      .filter((e) => e.type === "income")
      .reduce((s, e) => s + e.amount, 0);
    const exp = sessionEntries
      .filter((e) => e.type === "expense")
      .reduce((s, e) => s + e.amount, 0);
    return { totalIncome: inc, totalExpense: exp };
  }, [sessionEntries]);

  const handleSubmit = () => {
    const amt = Number.parseFloat(form.amount);
    if (
      !form.category ||
      !form.description ||
      !form.date ||
      Number.isNaN(amt) ||
      amt <= 0
    )
      return;

    if (editing) {
      const updated = entries.map((e) =>
        e.id === editing.id ? { ...e, ...form, amount: amt } : e,
      );
      setEntries(updated);
      ls.set(LS_KEYS.expenses, updated);
      // Sync update via DataService
      void dataService.update("expenses", editing.id, {
        ...form,
        amount: amt,
      } as Record<string, unknown>);
    } else {
      const entry: Expense = {
        id: generateId(),
        date: form.date,
        description: form.description,
        category: form.category,
        amount: amt,
        type: form.type,
        sessionId: currentSession?.id ?? "",
      };
      const updated = [...entries, entry];
      setEntries(updated);
      ls.set(LS_KEYS.expenses, updated);
      // Save via DataService (server-first)
      void dataService.save(
        "expenses",
        entry as unknown as Record<string, unknown>,
      );
    }

    addNotification(
      `${form.type === "income" ? "Income" : "Expense"} entry saved`,
      "success",
      "💰",
    );
    setShowForm(false);
    setEditing(null);
    setForm({
      type: "expense",
      category: "",
      date: new Date().toISOString().slice(0, 10),
      description: "",
      amount: "",
    });
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({
      type: e.type,
      category: e.category,
      date: e.date,
      description: e.description,
      amount: e.amount.toString(),
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    ls.set(LS_KEYS.expenses, updated);
    // Delete via DataService
    void dataService.delete("expenses", id);
  };

  // Running balance
  let runningBalance = 0;
  const withBalance = filtered.map((e) => {
    runningBalance += e.type === "income" ? e.amount : -e.amount;
    return { ...e, balance: runningBalance };
  });

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">Total Income</p>
              <p className="font-bold text-green-700">
                {formatCurrency(totalIncome)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingDown className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-xs text-muted-foreground">Total Expense</p>
              <p className="font-bold text-red-600">
                {formatCurrency(totalExpense)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`col-span-2 md:col-span-1 ${totalIncome - totalExpense >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}
        >
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Net Balance</p>
            <p
              className={`font-bold text-lg ${totalIncome - totalExpense >= 0 ? "text-primary" : "text-destructive"}`}
            >
              {formatCurrency(totalIncome - totalExpense)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2 flex-wrap">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32" data-ocid="ledger-filter-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="w-40"
          />
          <Input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(withBalance)}
          >
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1" /> Print
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            data-ocid="add-entry-btn"
          >
            <PlusCircle className="w-4 h-4 mr-1" /> Add Entry
          </Button>
        </div>
      </div>

      {/* Table */}
      {withBalance.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>
            No entries yet. Add income or expense entries to start tracking.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left p-3 font-semibold">Date</th>
                <th className="text-left p-3 font-semibold">Type</th>
                <th className="text-left p-3 font-semibold">Head</th>
                <th className="text-left p-3 font-semibold">Description</th>
                <th className="text-right p-3 font-semibold">Amount (₹)</th>
                <th className="text-right p-3 font-semibold">Balance (₹)</th>
                <th className="p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {withBalance.map((e) => (
                <tr
                  key={e.id}
                  className="border-t border-border hover:bg-muted/20"
                  data-ocid="ledger-row"
                >
                  <td className="p-3 whitespace-nowrap">{e.date}</td>
                  <td className="p-3">
                    <Badge
                      variant={e.type === "income" ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {e.type === "income" ? "Income" : "Expense"}
                    </Badge>
                  </td>
                  <td className="p-3">{e.category}</td>
                  <td className="p-3">{e.description}</td>
                  <td
                    className={`p-3 text-right font-mono font-medium ${e.type === "income" ? "text-green-700" : "text-red-600"}`}
                  >
                    {e.type === "income" ? "+" : "-"}₹
                    {e.amount.toLocaleString("en-IN")}
                  </td>
                  <td
                    className={`p-3 text-right font-mono font-semibold ${e.balance >= 0 ? "text-green-700" : "text-red-600"}`}
                  >
                    ₹{e.balance.toLocaleString("en-IN")}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(e)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(e.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Entry" : "Add Entry"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, type: v as "income" | "expense" }))
                  }
                >
                  <SelectTrigger data-ocid="entry-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Head / Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger data-ocid="entry-category-select">
                  <SelectValue placeholder="Select head..." />
                </SelectTrigger>
                <SelectContent>
                  {heads.map((h) => (
                    <SelectItem key={h.id} value={h.name}>
                      {h.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Description..."
                data-ocid="entry-desc-input"
              />
            </div>
            <div className="space-y-1">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                min={1}
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                placeholder="0"
                data-ocid="entry-amount-input"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSubmit}
                className="flex-1"
                data-ocid="entry-save-btn"
              >
                Save
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Expense Heads Tab ───────────────────────────────────
function ExpenseHeadsTab() {
  const [heads, setHeads] = useState<ExpenseHead[]>(() =>
    ls.get<ExpenseHead[]>(LS_KEYS.expenseHeads, []),
  );
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const save = (updated: ExpenseHead[]) => {
    setHeads(updated);
    ls.set(LS_KEYS.expenseHeads, updated);
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    save([...heads, { id: generateId(), name: newName.trim() }]);
    setNewName("");
  };

  const handleEdit = (id: string) => {
    if (!editName.trim()) return;
    save(heads.map((h) => (h.id === id ? { ...h, name: editName.trim() } : h)));
    setEditingId(null);
  };

  return (
    <div className="space-y-4 max-w-md">
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New expense head name..."
          data-ocid="head-name-input"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd} data-ocid="add-head-btn">
          <PlusCircle className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      {heads.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4 text-center">
          No expense heads defined.
        </p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-semibold">#</th>
                <th className="text-left p-3 font-semibold">Head Name</th>
                <th className="p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {heads.map((h, i) => (
                <tr
                  key={h.id}
                  className="border-t border-border"
                  data-ocid="head-row"
                >
                  <td className="p-3 text-muted-foreground">{i + 1}</td>
                  <td className="p-3">
                    {editingId === h.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-7"
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && handleEdit(h.id)}
                      />
                    ) : (
                      h.name
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1 justify-center">
                      {editingId === h.id ? (
                        <>
                          <Button
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => handleEdit(h.id)}
                          >
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingId(h.id);
                              setEditName(h.name);
                            }}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() =>
                              save(heads.filter((x) => x.id !== h.id))
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Budget vs Actual Tab ────────────────────────────────
interface BudgetEntry {
  headId: string;
  month: string;
  budget: number;
}

function BudgetTab() {
  const { currentSession } = useApp();
  const heads = ls.get<ExpenseHead[]>(LS_KEYS.expenseHeads, []);
  const expenses = ls
    .get<Expense[]>(LS_KEYS.expenses, [])
    .filter((e) => e.sessionId === currentSession?.id && e.type === "expense");

  const [budgets, setBudgets] = useState<BudgetEntry[]>(() =>
    ls.get<BudgetEntry[]>("expense_budgets", []),
  );
  const [selMonth, setSelMonth] = useState(CURRENT_MONTH);

  const getBudget = (headId: string) =>
    budgets.find((b) => b.headId === headId && b.month === selMonth)?.budget ??
    0;

  const getActual = (headName: string) =>
    expenses
      .filter(
        (e) => e.category === headName && e.date.includes(selMonth.slice(0, 3)),
      )
      .reduce((s, e) => s + e.amount, 0);

  const saveBudget = (headId: string, val: number) => {
    const updated = [
      ...budgets.filter((b) => !(b.headId === headId && b.month === selMonth)),
      { headId, month: selMonth, budget: val },
    ];
    setBudgets(updated);
    ls.set("expense_budgets", updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label>Month:</Label>
        <Select value={selMonth} onValueChange={setSelMonth}>
          <SelectTrigger className="w-40" data-ocid="budget-month-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {heads.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Add expense heads first.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-semibold">Expense Head</th>
                <th className="text-right p-3 font-semibold">Budget (₹)</th>
                <th className="text-right p-3 font-semibold">Actual (₹)</th>
                <th className="text-right p-3 font-semibold">Variance</th>
                <th className="text-right p-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {heads.map((h) => {
                const budget = getBudget(h.id);
                const actual = getActual(h.name);
                const variance = budget - actual;
                const over = actual > budget && budget > 0;
                return (
                  <tr
                    key={h.id}
                    className="border-t border-border hover:bg-muted/20"
                  >
                    <td className="p-3 font-medium">{h.name}</td>
                    <td className="p-3 text-right">
                      <Input
                        type="number"
                        value={budget || ""}
                        onChange={(e) =>
                          saveBudget(
                            h.id,
                            Number.parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-24 h-7 text-right ml-auto"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-3 text-right font-mono">
                      ₹{actual.toLocaleString("en-IN")}
                    </td>
                    <td
                      className={`p-3 text-right font-mono font-medium ${over ? "text-red-600" : "text-green-700"}`}
                    >
                      {variance >= 0 ? "+" : ""}₹
                      {variance.toLocaleString("en-IN")}
                    </td>
                    <td className="p-3 text-right">
                      {budget === 0 ? (
                        <Badge variant="secondary" className="text-xs">
                          No Budget
                        </Badge>
                      ) : over ? (
                        <Badge variant="destructive" className="text-xs">
                          Over Budget
                        </Badge>
                      ) : (
                        <Badge className="text-xs bg-green-100 text-green-800">
                          Within Budget
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Charts Tab ──────────────────────────────────────────
const CHART_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

function ChartsTab() {
  const { currentSession } = useApp();
  const expenses = ls
    .get<Expense[]>(LS_KEYS.expenses, [])
    .filter((e) => e.sessionId === currentSession?.id);

  const monthlyData = MONTHS.map((m) => {
    const income = expenses
      .filter((e) => e.type === "income" && e.date.includes(m.slice(0, 3)))
      .reduce((s, e) => s + e.amount, 0);
    const expense = expenses
      .filter((e) => e.type === "expense" && e.date.includes(m.slice(0, 3)))
      .reduce((s, e) => s + e.amount, 0);
    return { month: m.slice(0, 3), income, expense };
  });

  const maxMonthly = Math.max(
    ...monthlyData.flatMap((d) => [d.income, d.expense]),
    1,
  );

  const heads = ls.get<ExpenseHead[]>(LS_KEYS.expenseHeads, []);
  const expenseOnly = expenses.filter((e) => e.type === "expense");
  const byHead = heads
    .map((h) => ({
      name: h.name,
      total: expenseOnly
        .filter((e) => e.category === h.name)
        .reduce((s, e) => s + e.amount, 0),
    }))
    .filter((h) => h.total > 0);
  const totalByHead = byHead.reduce((s, h) => s + h.total, 0);

  return (
    <div className="space-y-8">
      {/* Monthly Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart2 className="w-4 h-4" /> Monthly Income vs Expense
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="flex items-end gap-1 min-w-[600px] h-48">
              {monthlyData.map(({ month, income, expense }) => (
                <div
                  key={month}
                  className="flex-1 flex flex-col items-center gap-0.5"
                >
                  <div
                    className="w-full flex gap-0.5 items-end justify-center"
                    style={{ height: "160px" }}
                  >
                    <div
                      className="flex-1 bg-green-400 rounded-t transition-all"
                      style={{
                        height: `${(income / maxMonthly) * 100}%`,
                        minHeight: income > 0 ? 2 : 0,
                      }}
                      title={`Income: ₹${income.toLocaleString("en-IN")}`}
                    />
                    <div
                      className="flex-1 bg-red-400 rounded-t transition-all"
                      style={{
                        height: `${(expense / maxMonthly) * 100}%`,
                        minHeight: expense > 0 ? 2 : 0,
                      }}
                      title={`Expense: ₹${expense.toLocaleString("en-IN")}`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {month}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-green-400 inline-block" />{" "}
                Income
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />{" "}
                Expense
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense by Head */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <PieChart className="w-4 h-4" /> Expense by Head
          </CardTitle>
        </CardHeader>
        <CardContent>
          {byHead.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No expense data yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {byHead.map((h, i) => {
                const pct =
                  totalByHead > 0
                    ? Math.round((h.total / totalByHead) * 100)
                    : 0;
                return (
                  <div
                    key={h.name}
                    className="flex items-center gap-2 min-w-[180px]"
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="truncate max-w-[100px]">{h.name}</span>
                        <span className="font-mono font-medium">{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor:
                              CHART_COLORS[i % CHART_COLORS.length],
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatCurrency(h.total)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────
export default function Expenses() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <TrendingUp className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold font-display">Expenses & Income</h1>
          <p className="text-sm text-muted-foreground">
            Track school finances, budgets, and reporting
          </p>
        </div>
      </div>

      <Tabs defaultValue="ledger" className="w-full">
        <TabsList data-ocid="expenses-tabs">
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="heads">Expense Heads</TabsTrigger>
          <TabsTrigger value="budget">Budget vs Actual</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger">
          <Card>
            <CardContent className="pt-5">
              <LedgerTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heads">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manage Expense Heads</CardTitle>
            </CardHeader>
            <CardContent>
              <ExpenseHeadsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Budget vs Actual Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BudgetTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts">
          <ChartsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
