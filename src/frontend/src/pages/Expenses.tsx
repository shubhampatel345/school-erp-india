import { Edit2, Plus, Printer, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

interface ExpRecord {
  id: string;
  type: "income" | "expense";
  head: string;
  description: string;
  amount: number;
  mode: string;
  reference: string;
  date: string;
}

interface ExpHead {
  id: string;
  name: string;
  type: "income" | "expense";
}

interface BudgetEntry {
  headId: string;
  budgeted: number;
}

const DEMO_INCOME: ExpRecord[] = [
  {
    id: "i1",
    type: "income",
    head: "Tuition Fees",
    description: "Tuition fee collection March batch 1",
    amount: 450000,
    mode: "Cash",
    reference: "TF001",
    date: "2026-03-05",
  },
  {
    id: "i2",
    type: "income",
    head: "Transport Fees",
    description: "Transport fee collection",
    amount: 85000,
    mode: "Cash",
    reference: "TR001",
    date: "2026-03-10",
  },
  {
    id: "i3",
    type: "income",
    head: "Exam Fees",
    description: "Examination fee collection",
    amount: 42000,
    mode: "Online",
    reference: "EF001",
    date: "2026-03-15",
  },
  {
    id: "i4",
    type: "income",
    head: "Library Fees",
    description: "Annual library fee",
    amount: 18000,
    mode: "Cash",
    reference: "LF001",
    date: "2026-03-18",
  },
];

const DEMO_EXPENSE: ExpRecord[] = [
  {
    id: "e1",
    type: "expense",
    head: "Salary",
    description: "Monthly staff salary March 2026",
    amount: 283000,
    mode: "Bank Transfer",
    reference: "SAL003",
    date: "2026-03-01",
  },
  {
    id: "e2",
    type: "expense",
    head: "Electricity",
    description: "Electricity bill March 2026",
    amount: 28000,
    mode: "Online",
    reference: "ELEC03",
    date: "2026-03-08",
  },
  {
    id: "e3",
    type: "expense",
    head: "Maintenance",
    description: "Building maintenance & repair",
    amount: 15000,
    mode: "Cash",
    reference: "MAINT03",
    date: "2026-03-12",
  },
  {
    id: "e4",
    type: "expense",
    head: "Stationery",
    description: "Office stationery purchase",
    amount: 8500,
    mode: "Cash",
    reference: "STAT03",
    date: "2026-03-20",
  },
];

const DEMO_HEADS: ExpHead[] = [
  { id: "h1", name: "Tuition Fees", type: "income" },
  { id: "h2", name: "Transport Fees", type: "income" },
  { id: "h3", name: "Exam Fees", type: "income" },
  { id: "h4", name: "Library Fees", type: "income" },
  { id: "h5", name: "Donation", type: "income" },
  { id: "h6", name: "Salary", type: "expense" },
  { id: "h7", name: "Electricity", type: "expense" },
  { id: "h8", name: "Maintenance", type: "expense" },
  { id: "h9", name: "Stationery", type: "expense" },
  { id: "h10", name: "Cleaning", type: "expense" },
];

const DEMO_BUDGET: BudgetEntry[] = [
  { headId: "h1", budgeted: 500000 },
  { headId: "h2", budgeted: 90000 },
  { headId: "h3", budgeted: 45000 },
  { headId: "h6", budgeted: 300000 },
  { headId: "h7", budgeted: 30000 },
];

const MONTHLY_DEMO = [
  { month: "Oct", income: 760000, expense: 120000 },
  { month: "Nov", income: 820000, expense: 130000 },
  { month: "Dec", income: 690000, expense: 115000 },
  { month: "Jan", income: 800000, expense: 125000 },
  { month: "Feb", income: 750000, expense: 118000 },
  { month: "Mar", income: 920000, expense: 140000 },
];

const PAYMENT_MODES = [
  "Cash",
  "Online",
  "Cheque",
  "Bank Transfer",
  "DD",
  "NEFT/RTGS",
];

function loadLS<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

export function Expenses() {
  const [tab, setTab] = useState<
    "income" | "expense" | "heads" | "budget" | "reports"
  >("income");
  const [income, setIncome] = useState<ExpRecord[]>(() =>
    loadLS("erp_income", DEMO_INCOME),
  );
  const [expenses, setExpenses] = useState<ExpRecord[]>(() =>
    loadLS("erp_expenses", DEMO_EXPENSE),
  );
  const [heads, setHeads] = useState<ExpHead[]>(() =>
    loadLS("erp_expense_heads", DEMO_HEADS),
  );
  const [budget, _setBudget] = useState<BudgetEntry[]>(() =>
    loadLS("erp_budget", DEMO_BUDGET),
  );

  const [showLedgerModal, setShowLedgerModal] = useState<
    "income" | "expense" | null
  >(null);
  const [editRecord, setEditRecord] = useState<ExpRecord | null>(null);
  const [ledgerForm, setLedgerForm] = useState({
    head: "",
    description: "",
    amount: "",
    mode: "Cash",
    reference: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [showHeadModal, setShowHeadModal] = useState(false);
  const [headForm, setHeadForm] = useState({
    name: "",
    type: "income" as "income" | "expense",
  });

  useEffect(() => {
    localStorage.setItem("erp_income", JSON.stringify(income));
  }, [income]);
  useEffect(() => {
    localStorage.setItem("erp_expenses", JSON.stringify(expenses));
  }, [expenses]);
  useEffect(() => {
    localStorage.setItem("erp_expense_heads", JSON.stringify(heads));
  }, [heads]);
  useEffect(() => {
    localStorage.setItem("erp_budget", JSON.stringify(budget));
  }, [budget]);

  const totalIncome = income.reduce((s, r) => s + r.amount, 0);
  const totalExpense = expenses.reduce((s, r) => s + r.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const saveLedgerEntry = (type: "income" | "expense") => {
    if (!ledgerForm.head || !ledgerForm.amount) return;
    const rec: ExpRecord = {
      id: Date.now().toString(),
      type,
      ...ledgerForm,
      amount: Number(ledgerForm.amount),
    };
    if (editRecord) {
      if (type === "income")
        setIncome((prev) =>
          prev.map((r) =>
            r.id === editRecord.id
              ? {
                  ...editRecord,
                  ...ledgerForm,
                  amount: Number(ledgerForm.amount),
                }
              : r,
          ),
        );
      else
        setExpenses((prev) =>
          prev.map((r) =>
            r.id === editRecord.id
              ? {
                  ...editRecord,
                  ...ledgerForm,
                  amount: Number(ledgerForm.amount),
                }
              : r,
          ),
        );
      toast.success("Updated");
    } else {
      if (type === "income") setIncome((prev) => [...prev, rec]);
      else setExpenses((prev) => [...prev, rec]);
      toast.success("Entry added");
    }
    setShowLedgerModal(null);
    setEditRecord(null);
    setLedgerForm({
      head: "",
      description: "",
      amount: "",
      mode: "Cash",
      reference: "",
      date: new Date().toISOString().split("T")[0],
    });
  };

  const deleteRecord = (type: "income" | "expense", id: string) => {
    if (type === "income") setIncome((prev) => prev.filter((r) => r.id !== id));
    else setExpenses((prev) => prev.filter((r) => r.id !== id));
    toast.success("Deleted");
  };

  const saveHead = () => {
    if (!headForm.name.trim()) return;
    setHeads((prev) => [...prev, { id: Date.now().toString(), ...headForm }]);
    toast.success("Head added");
    setShowHeadModal(false);
    setHeadForm({ name: "", type: "income" });
  };

  const budgetForHead = (headId: string) =>
    budget.find((b) => b.headId === headId)?.budgeted || 0;
  const actualForHead = (headId: string, type: "income" | "expense") => {
    const records = type === "income" ? income : expenses;
    const head = heads.find((h) => h.id === headId);
    if (!head) return 0;
    return records
      .filter((r) => r.head === head.name)
      .reduce((s, r) => s + r.amount, 0);
  };

  const renderLedger = (data: ExpRecord[], type: "income" | "expense") => {
    const typeHeads = heads.filter((h) => h.type === type);
    let running = 0;
    return (
      <div>
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={() => {
              setEditRecord(null);
              setLedgerForm({
                head: typeHeads[0]?.name || "",
                description: "",
                amount: "",
                mode: "Cash",
                reference: "",
                date: new Date().toISOString().split("T")[0],
              });
              setShowLedgerModal(type);
            }}
            data-ocid={`expenses.${type}.primary_button`}
            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded"
          >
            <Plus size={13} /> Add Entry
          </button>
        </div>
        <div className="rounded-lg overflow-hidden border border-gray-700">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "#1a1f2e" }}>
                {[
                  "#",
                  "Date",
                  "Head",
                  "Description",
                  "Amount (₹)",
                  "Mode",
                  "Reference",
                  "Running Balance",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2 text-gray-400 font-medium whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-8 text-center text-gray-500"
                    data-ocid={`expenses.${type}.empty_state`}
                  >
                    No entries yet.
                  </td>
                </tr>
              ) : (
                data.map((r, i) => {
                  running += type === "income" ? r.amount : -r.amount;
                  return (
                    <tr
                      key={r.id}
                      style={{
                        background: i % 2 === 0 ? "#111827" : "#0f1117",
                      }}
                      data-ocid={`expenses.${type}.item.${i + 1}`}
                    >
                      <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2 text-gray-300">{r.date}</td>
                      <td className="px-3 py-2 text-white">{r.head}</td>
                      <td className="px-3 py-2 text-gray-400">
                        {r.description}
                      </td>
                      <td
                        className={`px-3 py-2 font-semibold ${type === "income" ? "text-green-400" : "text-red-400"}`}
                      >
                        ₹{r.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 text-gray-400">{r.mode}</td>
                      <td className="px-3 py-2 text-gray-500">
                        {r.reference || "-"}
                      </td>
                      <td
                        className={`px-3 py-2 font-medium ${running >= 0 ? "text-green-400" : "text-red-400"}`}
                      >
                        ₹{running.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditRecord(r);
                              setLedgerForm({
                                head: r.head,
                                description: r.description,
                                amount: String(r.amount),
                                mode: r.mode,
                                reference: r.reference,
                                date: r.date,
                              });
                              setShowLedgerModal(type);
                            }}
                            className="text-blue-400 hover:text-blue-300"
                            data-ocid={`expenses.${type}.edit_button.${i + 1}`}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRecord(type, r.id)}
                            className="text-red-400 hover:text-red-300"
                            data-ocid={`expenses.${type}.delete_button.${i + 1}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-white text-lg font-semibold mb-4">
        Income &amp; Expenses
      </h2>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div
          className="rounded-lg p-3"
          style={{ background: "#1a1f2e", border: "1px solid #374151" }}
        >
          <p className="text-gray-400 text-xs">Total Income</p>
          <p className="text-green-400 text-2xl font-bold">
            ₹{totalIncome.toLocaleString("en-IN")}
          </p>
        </div>
        <div
          className="rounded-lg p-3"
          style={{ background: "#1a1f2e", border: "1px solid #374151" }}
        >
          <p className="text-gray-400 text-xs">Total Expenses</p>
          <p className="text-red-400 text-2xl font-bold">
            ₹{totalExpense.toLocaleString("en-IN")}
          </p>
        </div>
        <div
          className="rounded-lg p-3"
          style={{ background: "#1a1f2e", border: "1px solid #374151" }}
        >
          <p className="text-gray-400 text-xs">Net Balance</p>
          <p
            className={`text-2xl font-bold ${netBalance >= 0 ? "text-green-400" : "text-red-400"}`}
          >
            ₹{netBalance.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {(["income", "expense", "heads", "budget", "reports"] as const).map(
          (t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              data-ocid={`expenses.${t}.tab`}
              className={`px-4 py-1.5 rounded text-xs font-medium capitalize transition ${tab === t ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            >
              {t === "income"
                ? "Income Ledger"
                : t === "expense"
                  ? "Expense Ledger"
                  : t === "heads"
                    ? "Expense Heads"
                    : t === "budget"
                      ? "Budget"
                      : "Reports"}
            </button>
          ),
        )}
      </div>

      {tab === "income" && renderLedger(income, "income")}
      {tab === "expense" && renderLedger(expenses, "expense")}

      {/* ─ EXPENSE HEADS ─ */}
      {tab === "heads" && (
        <div>
          <div className="flex justify-end mb-3">
            <button
              type="button"
              onClick={() => setShowHeadModal(true)}
              data-ocid="expenses.heads.primary_button"
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded"
            >
              <Plus size={13} /> Add Head
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {(["income", "expense"] as const).map((type) => (
              <div key={type}>
                <h3
                  className={`font-semibold text-sm mb-2 ${type === "income" ? "text-green-400" : "text-red-400"}`}
                >
                  {type === "income" ? "Income Heads" : "Expense Heads"}
                </h3>
                <div className="space-y-2">
                  {heads
                    .filter((h) => h.type === type)
                    .map((h, i) => (
                      <div
                        key={h.id}
                        className="rounded-lg p-3 flex items-center justify-between"
                        style={{
                          background: "#1a1f2e",
                          border: "1px solid #374151",
                        }}
                        data-ocid={`expenses.heads.item.${i + 1}`}
                      >
                        <span className="text-gray-300 text-xs">{h.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setHeads((prev) =>
                              prev.filter((x) => x.id !== h.id),
                            );
                            toast.success("Removed");
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─ BUDGET ─ */}
      {tab === "budget" && (
        <div>
          <div className="rounded-lg overflow-hidden border border-gray-700 mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#1a1f2e" }}>
                  {[
                    "Head",
                    "Type",
                    "Budgeted (₹)",
                    "Actual (₹)",
                    "Variance (₹)",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2 text-gray-400 font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heads
                  .filter((h) => budgetForHead(h.id) > 0)
                  .map((h, i) => {
                    const budgeted = budgetForHead(h.id);
                    const actual = actualForHead(h.id, h.type);
                    const variance =
                      h.type === "income"
                        ? actual - budgeted
                        : budgeted - actual;
                    return (
                      <tr
                        key={h.id}
                        style={{
                          background: i % 2 === 0 ? "#111827" : "#0f1117",
                        }}
                      >
                        <td className="px-3 py-2 text-white">{h.name}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${h.type === "income" ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400"}`}
                          >
                            {h.type}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-300">
                          ₹{budgeted.toLocaleString("en-IN")}
                        </td>
                        <td className="px-3 py-2 text-white font-medium">
                          ₹{actual.toLocaleString("en-IN")}
                        </td>
                        <td
                          className={`px-3 py-2 font-medium ${variance >= 0 ? "text-green-400" : "text-red-400"}`}
                        >
                          ₹{Math.abs(variance).toLocaleString("en-IN")}{" "}
                          {variance >= 0 ? "▲" : "▼"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${variance >= 0 ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400"}`}
                          >
                            {variance >= 0 ? "On Track" : "Over Budget"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <h3 className="text-gray-200 text-sm font-medium mb-3">
            Budget vs Actual
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={heads
                .filter((h) => budgetForHead(h.id) > 0)
                .map((h) => ({
                  name: h.name,
                  Budgeted: budgetForHead(h.id),
                  Actual: actualForHead(h.id, h.type),
                }))}
              margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 9 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  background: "#1f2937",
                  border: "none",
                  color: "#fff",
                }}
              />
              <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 10 }} />
              <Bar dataKey="Budgeted" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Actual" fill="#22c55e" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ─ REPORTS ─ */}
      {tab === "reports" && (
        <div>
          <div className="flex justify-end mb-3">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("exp-report-print");
                if (!el) return;
                const win = window.open("", "_blank", "width=900,height=600");
                if (!win) return;
                win.document.write(
                  `<html><head><title>Finance Report</title><style>body{font-family:Arial;font-size:11px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 8px}th{background:#e8f0fe}</style></head><body>${el.innerHTML}</body></html>`,
                );
                win.document.close();
                setTimeout(() => {
                  win.print();
                  win.close();
                }, 400);
              }}
              data-ocid="expenses.report.print.button"
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded"
            >
              <Printer size={13} /> Print
            </button>
          </div>
          <div id="exp-report-print">
            <div className="rounded-lg overflow-hidden border border-gray-700 mb-4">
              <h3
                className="text-gray-200 text-sm font-medium px-3 py-2"
                style={{ background: "#1a1f2e" }}
              >
                Monthly Summary
              </h3>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "#1a1f2e" }}>
                    {["Month", "Income (₹)", "Expense (₹)", "Net (₹)"].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left px-3 py-2 text-gray-400 font-medium"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {MONTHLY_DEMO.map((m, i) => (
                    <tr
                      key={m.month}
                      style={{
                        background: i % 2 === 0 ? "#111827" : "#0f1117",
                      }}
                    >
                      <td className="px-3 py-2 text-white">{m.month}</td>
                      <td className="px-3 py-2 text-green-400">
                        ₹{m.income.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 text-red-400">
                        ₹{m.expense.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 font-medium text-blue-400">
                        ₹{(m.income - m.expense).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div
            className="rounded-lg p-4"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <h3 className="text-gray-200 text-sm font-medium mb-3">
              Income vs Expense (Last 6 Months)
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={MONTHLY_DEMO}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#9ca3af", fontSize: 10 }}
                />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "#1f2937",
                    border: "none",
                    color: "#fff",
                  }}
                />
                <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 10 }} />
                <Bar
                  dataKey="income"
                  fill="#22c55e"
                  name="Income"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="expense"
                  fill="#ef4444"
                  name="Expense"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ─ LEDGER MODAL ─ */}
      {showLedgerModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          data-ocid="expenses.ledger.modal"
        >
          <div
            className="rounded-xl p-6 w-full max-w-md"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold capitalize">
                {editRecord ? "Edit" : "Add"} {showLedgerModal} Entry
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowLedgerModal(null);
                  setEditRecord(null);
                }}
                className="text-gray-400 hover:text-white"
                data-ocid="expenses.ledger.close_button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label
                  htmlFor="led-head"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Head
                </label>
                <select
                  id="led-head"
                  value={ledgerForm.head}
                  onChange={(e) =>
                    setLedgerForm((p) => ({ ...p, head: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                  data-ocid="expenses.ledger.select"
                >
                  {heads
                    .filter((h) => h.type === showLedgerModal)
                    .map((h) => (
                      <option key={h.id}>{h.name}</option>
                    ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="led-amount"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Amount (₹)
                </label>
                <input
                  id="led-amount"
                  type="number"
                  value={ledgerForm.amount}
                  onChange={(e) =>
                    setLedgerForm((p) => ({ ...p, amount: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                  data-ocid="expenses.ledger.input"
                />
              </div>
              <div>
                <label
                  htmlFor="led-date"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Date
                </label>
                <input
                  id="led-date"
                  type="date"
                  value={ledgerForm.date}
                  onChange={(e) =>
                    setLedgerForm((p) => ({ ...p, date: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="led-mode"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Payment Mode
                </label>
                <select
                  id="led-mode"
                  value={ledgerForm.mode}
                  onChange={(e) =>
                    setLedgerForm((p) => ({ ...p, mode: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                >
                  {PAYMENT_MODES.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="led-ref"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Reference No.
                </label>
                <input
                  id="led-ref"
                  value={ledgerForm.reference}
                  onChange={(e) =>
                    setLedgerForm((p) => ({ ...p, reference: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                />
              </div>
              <div className="col-span-2">
                <label
                  htmlFor="led-desc"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Description
                </label>
                <input
                  id="led-desc"
                  value={ledgerForm.description}
                  onChange={(e) =>
                    setLedgerForm((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => saveLedgerEntry(showLedgerModal)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded"
                data-ocid="expenses.ledger.submit_button"
              >
                {editRecord ? "Update" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLedgerModal(null);
                  setEditRecord(null);
                }}
                className="flex-1 bg-gray-700 text-white text-xs py-2 rounded"
                data-ocid="expenses.ledger.cancel_button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─ HEAD MODAL ─ */}
      {showHeadModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          data-ocid="expenses.heads.modal"
        >
          <div
            className="rounded-xl p-6 w-full max-w-sm"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">
                Add Expense / Income Head
              </h3>
              <button
                type="button"
                onClick={() => setShowHeadModal(false)}
                className="text-gray-400 hover:text-white"
                data-ocid="expenses.heads.close_button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="head-name"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Head Name
                </label>
                <input
                  id="head-name"
                  value={headForm.name}
                  onChange={(e) =>
                    setHeadForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="head-type"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Type
                </label>
                <select
                  id="head-type"
                  value={headForm.type}
                  onChange={(e) =>
                    setHeadForm((p) => ({
                      ...p,
                      type: e.target.value as "income" | "expense",
                    }))
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={saveHead}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded"
                data-ocid="expenses.heads.submit_button"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowHeadModal(false)}
                className="flex-1 bg-gray-700 text-white text-xs py-2 rounded"
                data-ocid="expenses.heads.cancel_button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
