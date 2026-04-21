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
  PlusCircle,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import type { Expense } from "../types";
import { MONTHS, formatCurrency, generateId } from "../utils/localStorage";

function downloadCSV(filename: string, rows: string[][]): void {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface ExpenseHead {
  id: string;
  name: string;
  type: "income" | "expense";
  monthlyBudget: number;
}

const DEFAULT_HEADS: string[] = [
  "Salary",
  "Utilities",
  "Maintenance",
  "Stationery",
  "Food",
  "Transport",
  "Events",
  "Fees Income",
  "Other",
];

interface EntryForm {
  headId: string;
  headName: string;
  amount: string;
  date: string;
  description: string;
  type: "income" | "expense";
  paymentMode: "Cash" | "Cheque" | "Online";
}

const EMPTY_ENTRY: EntryForm = {
  headId: "",
  headName: "",
  amount: "",
  date: new Date().toISOString().split("T")[0],
  description: "",
  type: "expense",
  paymentMode: "Cash",
};

function BarChartSimple({
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
              className="flex-1 rounded-t bg-green-400"
              style={{ height: `${(d.income / max) * 100}%` }}
              title={`Income: ${formatCurrency(d.income)}`}
            />
            <div
              className="flex-1 rounded-t bg-red-400"
              style={{ height: `${(d.expense / max) * 100}%` }}
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

export default function Expenses() {
  const { getData, saveData, updateData, deleteData, currentSession } =
    useApp();
  const allExpenses = getData("expenses") as Expense[];
  const rawHeads = getData("expense_heads") as ExpenseHead[];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Expense | null>(null);
  const [dialogType, setDialogType] = useState<"income" | "expense">("expense");
  const [search, setSearch] = useState("");
  const [headFilter, setHeadFilter] = useState("all");
  const [budget, setBudget] = useState(50000);

  // Head management
  const [showHeadModal, setShowHeadModal] = useState(false);
  const [editHeadId, setEditHeadId] = useState<string | null>(null);
  const [headForm, setHeadForm] = useState({
    name: "",
    type: "expense" as "income" | "expense",
    monthlyBudget: 0,
  });

  const sessionId = currentSession?.id ?? "";

  // Merge server heads with defaults
  const heads: ExpenseHead[] = useMemo(() => {
    if (rawHeads.length > 0) return rawHeads;
    return DEFAULT_HEADS.map((name, i) => ({
      id: `h${i}`,
      name,
      type: i < 7 ? "expense" : ("income" as "income" | "expense"),
      monthlyBudget: 0,
    }));
  }, [rawHeads]);

  const expenses = useMemo(
    () =>
      allExpenses.filter(
        (e) => !sessionId || e.sessionId === sessionId || !e.sessionId,
      ),
    [allExpenses, sessionId],
  );

  const incomeList = useMemo(
    () => expenses.filter((e) => e.type === "income"),
    [expenses],
  );
  const expenseList = useMemo(
    () => expenses.filter((e) => e.type === "expense"),
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

  const monthlyData = useMemo(() => {
    return MONTHS.map((m) => {
      const mMonth = m.slice(0, 3);
      const mExpenses = expenses.filter((e) => {
        if (!e.date) return false;
        const d = new Date(e.date);
        return d.toLocaleString("en-US", { month: "short" }) === mMonth;
      });
      return {
        label: mMonth,
        income: mExpenses
          .filter((e) => e.type === "income")
          .reduce((s, e) => s + e.amount, 0),
        expense: mExpenses
          .filter((e) => e.type === "expense")
          .reduce((s, e) => s + e.amount, 0),
      };
    });
  }, [expenses]);

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

  const totalIncome = useMemo(
    () => incomeList.reduce((s, e) => s + e.amount, 0),
    [incomeList],
  );
  const totalExpense = useMemo(
    () => expenseList.reduce((s, e) => s + e.amount, 0),
    [expenseList],
  );
  const net = totalIncome - totalExpense;

  const openAdd = (type: "income" | "expense") => {
    setDialogType(type);
    setEditItem(null);
    setDialogOpen(true);
  };

  const [entryForm, setEntryForm] = useState<EntryForm>(EMPTY_ENTRY);

  // CRITICAL: setField must be a stable useCallback so that Input onChange refs
  // don't change on every render (which would remount inputs and lose focus).
  const setField = useCallback(
    (k: keyof EntryForm, v: string) => setEntryForm((f) => ({ ...f, [k]: v })),
    [],
  );

  // Stable per-field handlers for the entry dialog — these have [] deps so
  // the function reference never changes, preventing Input remounts mid-type.
  const handleHeadNameChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) =>
      setField("headName", e.target.value),
    [setField],
  );
  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setField(
        "amount",
        e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"),
      ),
    [setField],
  );
  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setField("date", e.target.value),
    [setField],
  );
  const handlePaymentModeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) =>
      setField("paymentMode", e.target.value as EntryForm["paymentMode"]),
    [setField],
  );
  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setField("description", e.target.value),
    [setField],
  );
  const handleHeadFormNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setHeadForm((f) => ({ ...f, name: e.target.value })),
    [],
  );
  const handleHeadFormBudgetChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setHeadForm((f) => ({
        ...f,
        monthlyBudget:
          Number(
            e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"),
          ) || 0,
      })),
    [],
  );

  const handleOpenDialog = (type: "income" | "expense", item?: Expense) => {
    setDialogType(type);
    if (item) {
      setEditItem(item);
      setEntryForm({
        headId: "",
        headName: item.category ?? "",
        amount: String(item.amount),
        date: item.date,
        description: item.description ?? "",
        type: item.type,
        paymentMode: (item.paymentMode as EntryForm["paymentMode"]) ?? "Cash",
      });
    } else {
      setEditItem(null);
      setEntryForm({ ...EMPTY_ENTRY, type });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!entryForm.headName || !entryForm.amount || !entryForm.date) return;
    const record: Record<string, unknown> = {
      date: entryForm.date,
      description: entryForm.description,
      category: entryForm.headName,
      amount: Number(entryForm.amount),
      type: entryForm.type,
      paymentMode: entryForm.paymentMode,
      sessionId,
    };
    if (editItem) {
      await updateData("expenses", editItem.id, record);
    } else {
      record.id = generateId();
      await saveData("expenses", record);
    }
    setDialogOpen(false);
    setEditItem(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    await deleteData("expenses", id);
  };

  // Head CRUD
  const handleSaveHead = async () => {
    if (!headForm.name.trim()) return;
    if (editHeadId) {
      await updateData("expense_heads", editHeadId, {
        id: editHeadId,
        ...headForm,
      });
    } else {
      await saveData("expense_heads", {
        id: generateId(),
        ...headForm,
      } as unknown as Record<string, unknown>);
    }
    setShowHeadModal(false);
    setEditHeadId(null);
  };
  const handleDeleteHead = async (id: string) => {
    await deleteData("expense_heads", id);
  };

  const EntryList = ({
    list,
    type,
  }: { list: Expense[]; type: "income" | "expense" }) => (
    <div className="space-y-1 max-h-96 overflow-y-auto">
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
            className="flex items-center justify-between px-3 py-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
            data-ocid={`expenses.${type}_item.${i + 1}`}
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
                className={`font-mono font-semibold text-sm ${type === "income" ? "text-green-700" : "text-red-600"}`}
              >
                {formatCurrency(e.amount)}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => handleOpenDialog(type, e)}
                data-ocid={`expenses.edit_button.${i + 1}`}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive"
                onClick={() => handleDelete(e.id)}
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

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-green-600" />
            <p className="text-xl font-bold font-mono text-green-700">
              {formatCurrency(totalIncome)}
            </p>
            <p className="text-xs text-muted-foreground">Total Income</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <TrendingDown className="w-4 h-4 mx-auto mb-1 text-red-600" />
            <p className="text-xl font-bold font-mono text-red-600">
              {formatCurrency(totalExpense)}
            </p>
            <p className="text-xs text-muted-foreground">Total Expense</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p
              className={`text-xl font-bold font-mono ${net >= 0 ? "text-green-700" : "text-red-600"}`}
            >
              {formatCurrency(Math.abs(net))}
            </p>
            <p className="text-xs text-muted-foreground">
              {net >= 0 ? "Surplus" : "Deficit"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="expenses">
        <TabsList>
          <TabsTrigger value="expenses" data-ocid="expenses.tab">
            Expenses
          </TabsTrigger>
          <TabsTrigger value="income" data-ocid="income.tab">
            Income
          </TabsTrigger>
          <TabsTrigger value="heads" data-ocid="expense_heads.tab">
            Heads
          </TabsTrigger>
          <TabsTrigger value="report" data-ocid="expense_report.tab">
            Monthly Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="mt-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Search expenses…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
              data-ocid="expenses.search_input"
            />
            <Select value={headFilter} onValueChange={setHeadFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All heads" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Heads</SelectItem>
                {heads
                  .filter((h) => h.type === "expense")
                  .map((h) => (
                    <SelectItem key={h.id} value={h.name}>
                      {h.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => openAdd("expense")}
              data-ocid="expenses.add_button"
            >
              <PlusCircle className="w-4 h-4 mr-1" />
              Add Expense
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCSV("expenses.csv", [
                  ["Date", "Category", "Description", "Amount", "Mode"],
                  ...filteredExpenses.map((e) => [
                    e.date,
                    e.category,
                    e.description ?? "",
                    String(e.amount),
                    e.paymentMode ?? "",
                  ]),
                ])
              }
              data-ocid="expenses.export_button"
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
          <EntryList list={filteredExpenses} type="expense" />
        </TabsContent>

        <TabsContent value="income" className="mt-4 space-y-3">
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
              <PlusCircle className="w-4 h-4 mr-1" />
              Add Income
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCSV("income.csv", [
                  ["Date", "Category", "Description", "Amount", "Mode"],
                  ...filteredIncome.map((e) => [
                    e.date,
                    e.category,
                    e.description ?? "",
                    String(e.amount),
                    e.paymentMode ?? "",
                  ]),
                ])
              }
              data-ocid="income.export_button"
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
          <EntryList list={filteredIncome} type="income" />
        </TabsContent>

        <TabsContent value="heads" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">
              Expense / Income Heads
            </h3>
            <Button
              size="sm"
              onClick={() => {
                setHeadForm({ name: "", type: "expense", monthlyBudget: 0 });
                setEditHeadId(null);
                setShowHeadModal(true);
              }}
              data-ocid="expenses.add_head_button"
            >
              + Add Head
            </Button>
          </div>
          {heads.length === 0 ? (
            <p
              className="text-muted-foreground text-sm py-8 text-center"
              data-ocid="expenses.heads_empty_state"
            >
              No heads yet.
            </p>
          ) : (
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
                          variant={
                            h.type === "income" ? "default" : "secondary"
                          }
                        >
                          {h.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {h.monthlyBudget > 0
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
                                monthlyBudget: h.monthlyBudget,
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
                            onClick={() => handleDeleteHead(h.id)}
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
          )}
        </TabsContent>

        <TabsContent value="report" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart2 className="w-4 h-4" />
                Monthly Income vs Expense
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 text-xs mb-2">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-green-400 inline-block" />
                  Income
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />
                  Expense
                </span>
              </div>
              <BarChartSimple data={monthlyData} />
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
                        <span className="text-green-700 font-mono">
                          {formatCurrency(h.income)}
                        </span>
                      )}
                      {h.expense > 0 && (
                        <span className="text-red-600 font-mono">
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
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={budget}
                  onChange={(e) =>
                    setBudget(
                      Number(
                        e.target.value
                          .replace(/[^0-9.]/g, "")
                          .replace(/(\..*)\./g, "$1"),
                      ) || 0,
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
                const pct =
                  budget > 0
                    ? Math.min(
                        100,
                        Math.round((thisMonthExpense / budget) * 100),
                      )
                    : 0;
                return (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Spent: {formatCurrency(thisMonthExpense)}</span>
                      <span>Budget: {formatCurrency(budget)}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-yellow-500" : "bg-green-500"}`}
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
        </TabsContent>
      </Tabs>

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
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                  value={entryForm.headName}
                  onChange={handleHeadNameChange}
                  data-ocid="expenses.form_head_select"
                >
                  <option value="">— Select Head —</option>
                  {heads
                    .filter((h) => !dialogType || h.type === dialogType)
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
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={entryForm.amount}
                  onChange={handleAmountChange}
                  placeholder="0"
                  data-ocid="expenses.form_amount_input"
                />
              </div>
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={entryForm.date}
                  onChange={handleDateChange}
                />
              </div>
              <div>
                <Label>Payment Mode</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                  value={entryForm.paymentMode}
                  onChange={handlePaymentModeChange}
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
                  onChange={handleDescriptionChange}
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
                onClick={handleSave}
                data-ocid="expenses.form_submit_button"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Head Modal */}
      {showHeadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm shadow-elevated animate-slide-up">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">
                {editHeadId ? "Edit Head" : "Add Head"}
              </CardTitle>
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
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Head Name *</Label>
                <Input
                  value={headForm.name}
                  onChange={handleHeadFormNameChange}
                  placeholder="e.g. Salary"
                  data-ocid="expenses.head_name_input"
                />
              </div>
              <div>
                <Label>Type</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
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
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={headForm.monthlyBudget || ""}
                  onChange={handleHeadFormBudgetChange}
                  placeholder="0 = no budget"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleSaveHead}
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
