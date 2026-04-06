import { Printer, X } from "lucide-react";
import { useState } from "react";
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

const MONTHLY_FINANCE = [
  { month: "Oct", income: 760000, expense: 120000 },
  { month: "Nov", income: 820000, expense: 130000 },
  { month: "Dec", income: 690000, expense: 115000 },
  { month: "Jan", income: 800000, expense: 125000 },
  { month: "Feb", income: 750000, expense: 118000 },
  { month: "Mar", income: 920000, expense: 140000 },
];

function loadLS<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

export function Reports() {
  const [openReport, setOpenReport] = useState<string | null>(null);

  const students = loadLS<Array<Record<string, string>>>("erp_students", []);
  const staff = loadLS<Array<Record<string, string>>>("erp_staff", []);
  const payments = loadLS<Array<Record<string, number | string>>>(
    "erp_fee_payments",
    [],
  );
  const attendance = loadLS<Record<string, Record<string, string>>>(
    "erp_attendance",
    {},
  );
  const examResults = loadLS<Array<Record<string, string | number>>>(
    "erp_exam_results",
    [],
  );
  const inventory = loadLS<Array<Record<string, string | number>>>(
    "erp_inventory",
    [],
  );

  const todayStr = new Date().toISOString().split("T")[0];
  const todayPayments = (
    payments as Array<{ date: string; receiptAmt: number }>
  ).filter((p) => p.date === todayStr);
  const totalToday = todayPayments.reduce(
    (s, p) => s + (Number(p.receiptAmt) || 0),
    0,
  );
  const pendingDues = (payments as Array<{ balance: number }>).filter(
    (p) => (Number(p.balance) || 0) > 0,
  );
  const totalDue = pendingDues.reduce(
    (s, p) => s + (Number(p.balance) || 0),
    0,
  );

  // Class-wise student counts
  const classCounts: Record<string, number> = {};
  for (const s of students) {
    const cls = String(s.className || s.class || "Unknown");
    classCounts[cls] = (classCounts[cls] || 0) + 1;
  }

  // Dept-wise staff
  const deptCounts: Record<string, number> = {};
  for (const s of staff as Array<Record<string, string>>) {
    const dept = String(s.department || s.dept || "Unknown");
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  }

  // Route-wise students
  const routeCounts: Record<string, number> = {};
  for (const s of students) {
    if (s.route) {
      routeCounts[String(s.route)] = (routeCounts[String(s.route)] || 0) + 1;
    }
  }

  // Monthly fee collection from payments
  const monthlyFee: Record<string, number> = {};
  for (const p of payments as Array<{ date: string; receiptAmt: number }>) {
    if (p.date) {
      const month = String(p.date).slice(0, 7);
      monthlyFee[month] =
        (monthlyFee[month] || 0) + (Number(p.receiptAmt) || 0);
    }
  }

  // Attendance avg
  const attRecords = Object.values(attendance);
  const totalPresent = attRecords.reduce(
    (s, day) => s + Object.values(day).filter((v) => v === "P").length,
    0,
  );
  const totalMarked = attRecords.reduce(
    (s, day) => s + Object.values(day).length,
    0,
  );
  const attPct =
    totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;

  // Inventory low stock
  const lowStock = (
    inventory as Array<{
      name: string;
      quantity: number;
      reorderLevel: number;
      category: string;
    }>
  ).filter((i) => Number(i.quantity) <= Number(i.reorderLevel));

  const kpis = [
    { label: "Total Students", value: students.length, color: "text-blue-400" },
    { label: "Total Staff", value: staff.length, color: "text-purple-400" },
    {
      label: "Fees Collected Today",
      value: `₹${totalToday.toLocaleString("en-IN")}`,
      color: "text-green-400",
    },
    {
      label: "Pending Dues",
      value: `₹${totalDue.toLocaleString("en-IN")}`,
      color: "text-red-400",
    },
  ];

  const reports: {
    key: string;
    title: string;
    count: string;
    color: string;
    desc: string;
    content: () => React.ReactNode;
  }[] = [
    {
      key: "students",
      title: "Student Report",
      count: `${students.length} Students`,
      color: "#3b82f6",
      desc: "Class-wise student listing",
      content: () => (
        <div>
          <h3 className="text-white font-semibold mb-3">
            Class-wise Student Count
          </h3>
          {Object.keys(classCounts).length === 0 ? (
            <p className="text-gray-400 text-xs">
              No student data found. Add students first.
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#1a1f2e" }}>
                  {["Class", "Students"].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(classCounts)
                  .sort()
                  .map(([cls, count], i) => (
                    <tr
                      key={cls}
                      style={{
                        background: i % 2 === 0 ? "#111827" : "#0f1117",
                      }}
                    >
                      <td className="px-3 py-2 text-white">{cls}</td>
                      <td className="px-3 py-2 text-blue-400 font-bold">
                        {count}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
          <div className="mt-3 text-xs text-gray-400">
            Total: <strong className="text-white">{students.length}</strong>
          </div>
        </div>
      ),
    },
    {
      key: "finance",
      title: "Finance Report",
      count: `₹${(payments as Array<{ receiptAmt: number }>).reduce((s, p) => s + Number(p.receiptAmt || 0), 0).toLocaleString("en-IN")}`,
      color: "#22c55e",
      desc: "Income & expense summary",
      content: () => (
        <div>
          <h3 className="text-white font-semibold mb-3">
            Monthly Fee Collection
          </h3>
          {Object.keys(monthlyFee).length === 0 ? (
            <p className="text-gray-400 text-xs">No fee payment data found.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#1a1f2e" }}>
                  {["Month", "Collected (₹)"].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(monthlyFee)
                  .sort()
                  .reverse()
                  .map(([month, amt], i) => (
                    <tr
                      key={month}
                      style={{
                        background: i % 2 === 0 ? "#111827" : "#0f1117",
                      }}
                    >
                      <td className="px-3 py-2 text-white">{month}</td>
                      <td className="px-3 py-2 text-green-400 font-bold">
                        ₹{(amt as number).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      ),
    },
    {
      key: "attendance",
      title: "Attendance Report",
      count: `${attPct}% Avg`,
      color: "#f97316",
      desc: "Monthly attendance summary",
      content: () => (
        <div>
          <h3 className="text-white font-semibold mb-3">Attendance Summary</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              {
                label: "Total Present",
                value: totalPresent,
                color: "text-green-400",
              },
              {
                label: "Total Marked",
                value: totalMarked,
                color: "text-white",
              },
              {
                label: "Attendance %",
                value: `${attPct}%`,
                color: "text-orange-400",
              },
            ].map((k) => (
              <div
                key={k.label}
                className="rounded-lg p-3"
                style={{ background: "#111827" }}
              >
                <p className="text-gray-400 text-xs">{k.label}</p>
                <p className={`${k.color} text-xl font-bold`}>{k.value}</p>
              </div>
            ))}
          </div>
          {totalMarked === 0 && (
            <p className="text-gray-400 text-xs">No attendance data found.</p>
          )}
        </div>
      ),
    },
    {
      key: "exams",
      title: "Exam Report",
      count:
        examResults.length > 0
          ? `${Math.round((examResults.filter((r) => Number(r.result || r.status === "Pass") > 0).length / examResults.length) * 100)}% Pass`
          : "No Data",
      color: "#8b5cf6",
      desc: "Exam results overview",
      content: () => (
        <div>
          <h3 className="text-white font-semibold mb-3">Exam Results</h3>
          {examResults.length === 0 ? (
            <p className="text-gray-400 text-xs">No exam results found.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#1a1f2e" }}>
                  {["Student", "Subject", "Marks", "Result"].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(examResults as Array<Record<string, string | number>>)
                  .slice(0, 20)
                  .map((r, i) => (
                    <tr
                      key={String(r.id || r.admNo || i)}
                      style={{
                        background: i % 2 === 0 ? "#111827" : "#0f1117",
                      }}
                    >
                      <td className="px-3 py-2 text-white">
                        {String(r.studentName || r.name || "-")}
                      </td>
                      <td className="px-3 py-2 text-blue-400">
                        {String(r.subject || "-")}
                      </td>
                      <td className="px-3 py-2 text-gray-300">
                        {String(r.marks || r.score || "-")}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${String(r.result || r.grade) === "Pass" ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}
                        >
                          {String(r.result || r.grade || "-")}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      ),
    },
    {
      key: "hr",
      title: "HR Report",
      count: `${staff.length} Staff`,
      color: "#14b8a6",
      desc: "Staff information",
      content: () => (
        <div>
          <h3 className="text-white font-semibold mb-3">
            Department-wise Staff
          </h3>
          {staff.length === 0 ? (
            <p className="text-gray-400 text-xs">No staff records found.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#1a1f2e" }}>
                  {["Department", "Staff Count"].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(deptCounts).map(([dept, count], i) => (
                  <tr
                    key={dept}
                    style={{ background: i % 2 === 0 ? "#111827" : "#0f1117" }}
                  >
                    <td className="px-3 py-2 text-white">{dept}</td>
                    <td className="px-3 py-2 text-teal-400 font-bold">
                      {count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ),
    },
    {
      key: "transport",
      title: "Transport Report",
      count: `${students.filter((s) => s.route).length} Students`,
      color: "#eab308",
      desc: "Route-wise student count",
      content: () => (
        <div>
          <h3 className="text-white font-semibold mb-3">Route-wise Students</h3>
          {Object.keys(routeCounts).length === 0 ? (
            <p className="text-gray-400 text-xs">No transport data found.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#1a1f2e" }}>
                  {["Route", "Students"].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(routeCounts)
                  .sort()
                  .map(([route, count], i) => (
                    <tr
                      key={route}
                      style={{
                        background: i % 2 === 0 ? "#111827" : "#0f1117",
                      }}
                    >
                      <td className="px-3 py-2 text-white">{route}</td>
                      <td className="px-3 py-2 text-yellow-400 font-bold">
                        {count}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      ),
    },
    {
      key: "inventory",
      title: "Inventory Report",
      count: `${inventory.length} Items`,
      color: "#ef4444",
      desc: "Stock & issue summary",
      content: () => (
        <div>
          <h3 className="text-white font-semibold mb-3">
            Low Stock Items ({lowStock.length})
          </h3>
          {lowStock.length === 0 ? (
            <p className="text-gray-400 text-xs">
              All items are adequately stocked.
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#1a1f2e" }}>
                  {["Item", "Category", "Qty", "Reorder Level"].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lowStock.map((item, i) => (
                  <tr
                    key={String(item.name || i)}
                    style={{ background: i % 2 === 0 ? "#111827" : "#0f1117" }}
                  >
                    <td className="px-3 py-2 text-white">
                      {String(item.name)}
                    </td>
                    <td className="px-3 py-2 text-gray-400">
                      {String(item.category)}
                    </td>
                    <td className="px-3 py-2 text-red-400 font-bold">
                      {String(item.quantity)}
                    </td>
                    <td className="px-3 py-2 text-gray-400">
                      {String(item.reorderLevel)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ),
    },
    {
      key: "feesdue",
      title: "Fees Due Report",
      count: `${pendingDues.length} Students`,
      color: "#ec4899",
      desc: "Outstanding fees summary",
      content: () => (
        <div>
          <h3 className="text-white font-semibold mb-3">Fees Due Records</h3>
          {pendingDues.length === 0 ? (
            <p className="text-gray-400 text-xs">No outstanding dues found.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#1a1f2e" }}>
                  {["Student", "Class", "Net Fees", "Paid", "Balance"].map(
                    (h) => (
                      <th key={h} className="text-left px-3 py-2 text-gray-400">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {(pendingDues as Array<Record<string, string | number>>)
                  .slice(0, 30)
                  .map((p, i) => (
                    <tr
                      key={String(p.id || p.receiptNo || `due-${i}`)}
                      style={{
                        background: i % 2 === 0 ? "#111827" : "#0f1117",
                      }}
                    >
                      <td className="px-3 py-2 text-white">
                        {String(p.studentName || "-")}
                      </td>
                      <td className="px-3 py-2 text-gray-300">
                        {String(p.className || "-")}
                      </td>
                      <td className="px-3 py-2 text-gray-300">
                        ₹{Number(p.netFees || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 text-green-400">
                        ₹{Number(p.receiptAmt || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 text-red-400 font-bold">
                        ₹{Number(p.balance || 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      ),
    },
  ];

  const activeReport = reports.find((r) => r.key === openReport);

  const printReport = () => {
    const el = document.getElementById("report-modal-content");
    if (!el) return;
    const win = window.open("", "_blank", "width=900,height=600");
    if (!win) return;
    win.document.write(
      `<html><head><title>Report</title><style>body{font-family:Arial,sans-serif;font-size:11px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 8px}th{background:#e8f0fe}</style></head><body>${el.innerHTML}</body></html>`,
    );
    win.document.close();
    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  };

  return (
    <div>
      <h2 className="text-white text-lg font-semibold mb-4">Reports</h2>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-lg p-3"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <p className="text-gray-400 text-xs">{k.label}</p>
            <p className={`${k.color} text-xl font-bold`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {reports.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setOpenReport(r.key)}
            data-ocid={`reports.${r.key}.card`}
            className="rounded-lg p-3 cursor-pointer hover:opacity-80 transition text-left w-full"
            style={{ background: "#1a1f2e", border: `1px solid ${r.color}33` }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: r.color }}>
              {r.title}
            </p>
            <p className="text-white text-base font-bold">{r.count}</p>
            <p className="text-gray-500 text-[10px] mt-0.5">{r.desc}</p>
          </button>
        ))}
      </div>

      {/* Finance chart */}
      <div
        className="rounded-lg p-4"
        style={{ background: "#1a1f2e", border: "1px solid #374151" }}
      >
        <h3 className="text-gray-200 text-sm font-medium mb-3">
          Finance Overview (Last 6 Months)
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={MONTHLY_FINANCE}
            margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 10 }} />
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

      {/* Report detail modal */}
      {openReport && activeReport && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          data-ocid="reports.modal"
        >
          <div
            className="rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <span className="text-lg">📊</span> {activeReport.title}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={printReport}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded"
                  data-ocid="reports.modal.print_button"
                >
                  <Printer size={13} /> Print
                </button>
                <button
                  type="button"
                  onClick={() => setOpenReport(null)}
                  className="text-gray-400 hover:text-white"
                  data-ocid="reports.modal.close_button"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-5" id="report-modal-content">
              {activeReport.content()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
