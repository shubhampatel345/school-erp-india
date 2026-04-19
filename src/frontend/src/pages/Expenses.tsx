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
import { useMemo, useState } from "react";
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

const HEADS = [
  "Salary",
  "Utilities",
  "Maintenance",
  "Stationery",
  "Food",
  "Transport",
  "Events",
  "Other",
];

interface ExpenseForm {
  head: string;
  amount: string;
  date: string;
  description: string;
  type: "income" | "expense";
}

const EMPTY: ExpenseForm = {
  head: "",
  amount: "",
  date: "",
  description: "",
  type: "expense",
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
              style={{ height: `${(d.income / max) * 100}px` }}
              title={`Income: ${formatCurrency(d.income)}`}
            />
            <div
              className="flex-1 rounded-t bg-red-400"
              style={{ height: `${(d.expense / max) * 100}px` }}
              title={`Expense: ${formatCurrency(d.expense)}`}
            />
          </div>
          <span className="text-xs text-muted-foreground truncate w-full text-center">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function EntryForm({
  type,
  initial,
  onSave,
  onClose,
}: {
  type: "income" | "expense";
  initial?: Partial<ExpenseForm>;
  onSave: (f: ExpenseForm) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ExpenseForm>({ ...EMPTY, type, ...initial });
  const set = (k: keyof ExpenseForm, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Category/Head *</Label>
          <Select value={form.head} onValueChange={(v) => set("head", v)}>
            <SelectTrigger data-ocid="expenses.form.head_select">
              <SelectValue placeholder="Select head" />
            </SelectTrigger>
            <SelectContent>
              {HEADS.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Amount (₹) *</Label>
          <Input
            type="number"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="0"
            data-ocid="expenses.form.amount_input"
          />
        </div>
        <div>
          <Label>Date *</Label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </div>
        <div>
          <Label>Description</Label>
          <Input
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button
          variant="outline"
          onClick={onClose}
          data-ocid="expenses.form.cancel_button"
        >
          Cancel
        </Button>
        <Button
          onClick={() => {
            if (!form.head || !form.amount || !form.date) return;
            onSave(form);
          }}
          data-ocid="expenses.form.submit_button"
        >
          Save
        </Button>
      </div>
    </div>
  );
}

export default function Expenses() {
  const { getData, saveData, updateData, deleteData, currentSession } =
    useApp();
  const allExpenses = getData("expenses") as Expense[];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Expense | null>(null);
  const [dialogType, setDialogType] = useState<"income" | "expense">("expense");
  const [search, setSearch] = useState("");
  const [budget, setBudget] = useState(50000);

  const sessionId = currentSession?.id ?? "";
  const expenses = allExpenses.filter(
    (e) => !sessionId || e.sessionId === sessionId || !e.sessionId,
  );
  const incomeList = expenses.filter((e) => e.type === "income");
  const expenseList = expenses.filter((e) => e.type === "expense");

  const filteredExpenses = useMemo(() => {
    const q = search.toLowerCase();
    return expenseList.filter(
      (e) =>
        e.description?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q),
    );
  }, [expenseList, search]);

  const filteredIncome = useMemo(() => {
    const q = search.toLowerCase();
    return incomeList.filter(
      (e) =>
        e.description?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q),
    );
  }, [incomeList, search]);

  const monthlyData = useMemo(() => {
    return MONTHS.map((m) => {
      const mExpenses = expenses.filter((e) => {
        const d = new Date(e.date);
        return d.toLocaleString("en-US", { month: "long" }) === m;
      });
      return {
        label: m.slice(0, 3),
        income: mExpenses
          .filter((e) => e.type === "income")
          .reduce((s, e) => s + e.amount, 0),
        expense: mExpenses
          .filter((e) => e.type === "expense")
          .reduce((s, e) => s + e.amount, 0),
      };
    });
  }, [expenses]);

  const totalIncome = incomeList.reduce((s, e) => s + e.amount, 0);
  const totalExpense = expenseList.reduce((s, e) => s + e.amount, 0);
  const net = totalIncome - totalExpense;

  const openAdd = (type: "income" | "expense") => {
    setDialogType(type);
    setEditItem(null);
    setDialogOpen(true);
  };

  const handleSave = async (form: ExpenseForm) => {
    const record: Record<string, unknown> = {
      date: form.date,
      description: form.description,
      category: form.head,
      amount: Number(form.amount),
      type: form.type,
      sessionId: sessionId,
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

  const exportCSV = (type: "income" | "expense") => {
    const list = type === "expense" ? filteredExpenses : filteredIncome;
    const rows = [
      ["Date", "Category", "Description", "Amount (₹)"],
      ...list.map((e) => [e.date, e.category, e.description, String(e.amount)]),
    ];
    downloadCSV(`${type}_report.csv`, rows);
  };

  const EntryList = ({
    list,
    type,
  }: { list: Expense[]; type: "income" | "expense" }) => (
    <div className="space-y-1 max-h-96 overflow-y-auto">
      {list.length === 0 ? (
        <div
          className="py-12 text-center text-muted-foreground"
          data-ocid={`expenses.${type}.empty_state`}
        >
          <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No {type} entries yet</p>
        </div>
      ) : (
        list.map((e, i) => (
          <div
            key={e.id}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
            data-ocid={`expenses.${type}.item.${i + 1}`}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {e.description || e.category}
              </p>
              <p className="text-xs text-muted-foreground">
                {e.date} • {e.category}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <span
                className={`font-mono font-semibold text-sm ${type === "income" ? "text-green-700" : "text-red-600"}`}
              >
                {formatCurrency(e.amount)}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => {
                  setEditItem(e);
                  setDialogType(type);
                  setDialogOpen(true);
                }}
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
            <div className="flex items-center justify-center gap-1 mb-1 text-green-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold font-mono text-green-700">
              {formatCurrency(totalIncome)}
            </p>
            <p className="text-xs text-muted-foreground">Total Income</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1 text-red-600">
              <TrendingDown className="w-4 h-4" />
            </div>
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
          <TabsTrigger value="summary" data-ocid="summary.tab">
            Summary
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
            <Button
              onClick={() => openAdd("expense")}
              data-ocid="expenses.add_button"
            >
              <PlusCircle className="w-4 h-4 mr-1" /> Add Expense
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCSV("expense")}
              data-ocid="expenses.export_button"
            >
              <Download className="w-4 h-4 mr-1" /> Export
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
              <PlusCircle className="w-4 h-4 mr-1" /> Add Income
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCSV("income")}
              data-ocid="income.export_button"
            >
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
          </div>
          <EntryList list={filteredIncome} type="income" />
        </TabsContent>

        <TabsContent value="summary" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart2 className="w-4 h-4" /> Monthly Income vs Expense
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 text-xs mb-2">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-green-400 inline-block" />{" "}
                  Income
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />{" "}
                  Expense
                </span>
              </div>
              <BarChartSimple data={monthlyData} />
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
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
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
                      {pct >= 100 && " — Budget exceeded!"}
                    </p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
          <EntryForm
            type={dialogType}
            initial={
              editItem
                ? {
                    head: editItem.category,
                    amount: String(editItem.amount),
                    date: editItem.date,
                    description: editItem.description,
                    type: editItem.type,
                  }
                : { type: dialogType }
            }
            onSave={handleSave}
            onClose={() => {
              setDialogOpen(false);
              setEditItem(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
