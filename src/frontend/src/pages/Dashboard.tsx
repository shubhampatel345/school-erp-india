import {
  ClipboardList,
  CreditCard,
  GraduationCap,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const monthlyData = [
  { day: "01", collection: 45000, expenses: 8000 },
  { day: "03", collection: 78000, expenses: 12000 },
  { day: "05", collection: 92000, expenses: 15000 },
  { day: "07", collection: 65000, expenses: 10000 },
  { day: "09", collection: 110000, expenses: 18000 },
  { day: "11", collection: 88000, expenses: 14000 },
  { day: "13", collection: 95000, expenses: 16000 },
  { day: "15", collection: 142000, expenses: 22000 },
  { day: "17", collection: 76000, expenses: 11000 },
  { day: "19", collection: 83000, expenses: 13000 },
  { day: "21", collection: 55000, expenses: 9000 },
  { day: "23", collection: 99000, expenses: 17000 },
  { day: "25", collection: 72000, expenses: 12000 },
  { day: "27", collection: 88000, expenses: 15000 },
  { day: "31", collection: 62000, expenses: 10000 },
];

const sessionData = [
  { month: "Apr", fees: 450000, expenses: 80000 },
  { month: "May", fees: 620000, expenses: 90000 },
  { month: "Jun", fees: 580000, expenses: 85000 },
  { month: "Jul", fees: 890000, expenses: 110000 },
  { month: "Aug", fees: 1200000, expenses: 130000 },
  { month: "Sep", fees: 980000, expenses: 120000 },
  { month: "Oct", fees: 760000, expenses: 100000 },
  { month: "Nov", fees: 820000, expenses: 105000 },
  { month: "Dec", fees: 690000, expenses: 95000 },
  { month: "Jan", fees: 800000, expenses: 100000 },
  { month: "Feb", fees: 750000, expenses: 98000 },
  { month: "Mar", fees: 920000, expenses: 115000 },
];

function readLS<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

interface AttRow {
  admNo?: string;
  name?: string;
  className?: string;
  section?: string;
  route?: string;
  date?: string;
  status?: string;
  staffId?: string;
  role?: string;
}

interface StudentRow {
  admNo?: string;
  name?: string;
  className?: string;
  section?: string;
  route?: string;
  status?: string;
  oldBalance?: number;
}

interface ReceiptRow {
  date?: string;
  totalAmount?: number;
  amount?: number;
}

const chartStyle = {
  background: "#1a1f2e",
  border: "1px solid #374151",
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
};

interface DashboardProps {
  navigate: (path: string) => void;
}

export function Dashboard({ navigate }: DashboardProps) {
  const today = new Date().toISOString().split("T")[0];

  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showFeesModal, setShowFeesModal] = useState(false);

  const data = useMemo(() => {
    const attendance: AttRow[] = [
      ...readLS<AttRow[]>("erp_attendance", []),
      ...readLS<AttRow[]>("erp_attendance_logs", []),
    ];
    const students: StudentRow[] = readLS<StudentRow[]>("erp_students", []);
    const receipts: ReceiptRow[] = readLS<ReceiptRow[]>("erp_receipts", []);

    const activeStudents = students.filter((s) => s.status !== "Discontinued");
    const totalStudents = activeStudents.length;

    const todayAttendance = attendance.filter((a) => a.date === today);
    const studentPresentToday = todayAttendance.filter(
      (a) => a.status === "Present" && !a.staffId,
    ).length;
    const staffPresentToday = todayAttendance.filter(
      (a) => a.status === "Present" && !!a.staffId,
    ).length;

    // Class+section wise attendance
    type SectionKey = string;
    const sectionMap: Record<
      SectionKey,
      { present: number; absent: number; total: number }
    > = {};
    for (const s of activeStudents) {
      const key = `${s.className || ""}-${s.section || ""}`;
      if (!sectionMap[key])
        sectionMap[key] = { present: 0, absent: 0, total: 0 };
      sectionMap[key].total++;
    }
    for (const a of todayAttendance.filter((x) => !x.staffId)) {
      const key = `${a.className || ""}-${a.section || ""}`;
      if (!sectionMap[key])
        sectionMap[key] = { present: 0, absent: 0, total: 1 };
      if (a.status === "Present") sectionMap[key].present++;
      else sectionMap[key].absent++;
    }

    // Route wise attendance
    const routeMap: Record<
      string,
      { present: number; absent: number; total: number }
    > = {};
    for (const s of activeStudents) {
      const r = s.route || "N.A.";
      if (!routeMap[r]) routeMap[r] = { present: 0, absent: 0, total: 0 };
      routeMap[r].total++;
    }
    for (const a of todayAttendance.filter((x) => !x.staffId)) {
      const student = activeStudents.find((s) => s.admNo === a.admNo);
      const r = student?.route || a.route || "N.A.";
      if (!routeMap[r]) routeMap[r] = { present: 0, absent: 0, total: 0 };
      if (a.status === "Present") routeMap[r].present++;
      else routeMap[r].absent++;
    }

    // Fees data
    const totalPaidToday = receipts
      .filter((r) => r.date === today)
      .reduce((sum, r) => sum + (r.totalAmount || r.amount || 0), 0);
    const totalDues = activeStudents.reduce(
      (sum, s) => sum + (s.oldBalance || 0),
      0,
    );

    return {
      totalStudents,
      studentPresentToday,
      staffPresentToday,
      sectionMap,
      routeMap,
      totalPaidToday,
      totalDues,
    };
  }, [today]);

  const studentPct =
    data.totalStudents > 0
      ? Math.round((data.studentPresentToday / data.totalStudents) * 100)
      : 0;

  const statCards = [
    {
      icon: <CreditCard size={18} />,
      label: "Fees Awaiting Payment",
      value:
        data.totalDues > 0 ? `₹${(data.totalDues / 1000).toFixed(0)}K` : "0",
      sub: "Due: 15th every month",
      pct: data.totalDues > 0 ? 60 : 0,
      color: "#3b82f6",
      clickable: true,
      onClick: () => setShowFeesModal(true),
    },
    {
      icon: <UserCheck size={18} />,
      label: "Staff Approved Leave",
      value: "0",
      sub: "No pending requests",
      pct: 0,
      color: "#8b5cf6",
      clickable: false,
    },
    {
      icon: <GraduationCap size={18} />,
      label: "Student Approved Leave",
      value: "0",
      sub: "No pending requests",
      pct: 0,
      color: "#eab308",
      clickable: false,
    },
    {
      icon: <TrendingUp size={18} />,
      label: "Converted Leads",
      value: "0",
      sub: "No leads",
      pct: 0,
      color: "#22c55e",
      clickable: false,
    },
    {
      icon: <ClipboardList size={18} />,
      label: "Staff Present Today",
      value: `${data.staffPresentToday}`,
      sub: `${data.staffPresentToday} present`,
      pct:
        data.staffPresentToday > 0
          ? Math.min(100, data.staffPresentToday * 5)
          : 0,
      color: "#f97316",
      clickable: false,
    },
    {
      icon: <Users size={18} />,
      label: "Student Present Today",
      value: `${data.studentPresentToday}/${data.totalStudents}`,
      sub: `${studentPct}% attendance`,
      pct: studentPct,
      color: "#14b8a6",
      clickable: true,
      onClick: () => setShowStudentModal(true),
    },
  ];

  return (
    <div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            role={card.clickable ? "button" : undefined}
            tabIndex={card.clickable ? 0 : undefined}
            className={`rounded-lg p-3 ${
              card.clickable ? "cursor-pointer hover:ring-1 transition" : ""
            }`}
            style={{
              background: "#1a1f2e",
              border: "1px solid #374151",
              ...(card.clickable
                ? ({ "--tw-ring-color": card.color } as React.CSSProperties)
                : {}),
            }}
            onClick={card.clickable ? card.onClick : undefined}
            onKeyDown={
              card.clickable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") card.onClick?.();
                  }
                : undefined
            }
            data-ocid={card.clickable ? "dashboard.card.button" : undefined}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span style={{ color: card.color }}>{card.icon}</span>
                <span className="text-gray-300 text-xs">{card.label}</span>
              </div>
              <span className="text-white text-sm font-bold">{card.value}</span>
            </div>
            <div className="h-1 bg-gray-700 rounded-full mb-1">
              <div
                className="h-1 rounded-full"
                style={{ width: `${card.pct}%`, background: card.color }}
              />
            </div>
            {card.sub && (
              <p className="text-gray-500 text-[10px]">{card.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Fees Collection & Expenses Chart */}
      <div style={chartStyle}>
        <h3 className="text-gray-200 text-sm font-medium mb-3">
          Fees Collection &amp; Expenses For March 2026
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={monthlyData}
            margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="day" tick={{ fill: "#9ca3af", fontSize: 10 }} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                background: "#1f2937",
                border: "none",
                color: "#fff",
              }}
            />
            <Bar
              dataKey="collection"
              fill="#22c55e"
              name="Collection"
              radius={[2, 2, 0, 0]}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="#ef4444"
              strokeDasharray="4 4"
              dot={false}
              name="Expenses"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Session Chart */}
      <div style={chartStyle}>
        <h3 className="text-gray-200 text-sm font-medium mb-3">
          Fees Collection &amp; Expenses For Session 2025-26
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart
            data={sessionData}
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
            <Line
              type="monotone"
              dataKey="fees"
              stroke="#22c55e"
              dot={false}
              name="Fees Collection"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="#ef4444"
              dot={false}
              name="Expenses"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom overview cards */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-lg p-4"
          style={{ background: "#1a1f2e", border: "1px solid #374151" }}
        >
          <h4 className="text-gray-300 text-sm font-medium mb-2">
            Fees Overview
          </h4>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Paid Today</span>
              <span className="text-green-400">
                ₹{data.totalPaidToday.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Total Dues (Old Balance)</span>
              <span className="text-yellow-400">
                ₹{data.totalDues.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Due Date</span>
              <span className="text-red-400">15th of every month</span>
            </div>
          </div>
        </div>
        <div
          className="rounded-lg p-4"
          style={{ background: "#1a1f2e", border: "1px solid #374151" }}
        >
          <h4 className="text-gray-300 text-sm font-medium mb-2">
            Enquiry Overview
          </h4>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Total Enquiries</span>
              <span className="text-blue-400">142</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Converted</span>
              <span className="text-green-400">0</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Pending</span>
              <span className="text-yellow-400">142</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick navigation */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {[
          { label: "Students", path: "/students", color: "#3b82f6" },
          { label: "Fees", path: "/fees", color: "#22c55e" },
          { label: "Attendance", path: "/attendance", color: "#f97316" },
          { label: "Examinations", path: "/examinations", color: "#8b5cf6" },
          { label: "HR", path: "/hr", color: "#14b8a6" },
          { label: "Transport", path: "/transport", color: "#eab308" },
          { label: "Reports", path: "/reports", color: "#ef4444" },
          { label: "Communicate", path: "/communicate", color: "#ec4899" },
        ].map((item) => (
          <button
            type="button"
            key={item.label}
            onClick={() => navigate(item.path)}
            className="rounded-lg p-2 text-xs text-white font-medium hover:opacity-80 transition"
            style={{
              background: `${item.color}22`,
              border: `1px solid ${item.color}44`,
              color: item.color,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Student Present Drill-down Modal */}
      {showStudentModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 pt-16 overflow-auto"
          data-ocid="dashboard.attendance.modal"
        >
          <div
            className="rounded-xl w-full max-w-3xl mx-4 mb-8"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div>
                <h3 className="text-white font-semibold">
                  Student Attendance — Today
                </h3>
                <p className="text-gray-400 text-xs mt-0.5">
                  {today} &nbsp;•&nbsp; {data.studentPresentToday} present /{" "}
                  {data.totalStudents} total
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStudentModal(false)}
                className="text-gray-400 hover:text-white"
                data-ocid="dashboard.attendance.close_button"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-6">
              {/* Class/Section wise */}
              <div>
                <h4 className="text-gray-300 text-sm font-medium mb-2">
                  Class / Section Wise
                </h4>
                <div className="rounded-lg overflow-hidden border border-gray-700">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: "#111827" }}>
                        {[
                          "Class",
                          "Section",
                          "Present",
                          "Absent",
                          "Total",
                          "% Att.",
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
                      {Object.keys(data.sectionMap).length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-3 py-6 text-center text-gray-500"
                            data-ocid="dashboard.attendance.empty_state"
                          >
                            No attendance data for today.
                          </td>
                        </tr>
                      ) : (
                        Object.entries(data.sectionMap).map(([key, val], i) => {
                          const [cls, sec] = key.split("-");
                          const pct =
                            val.total > 0
                              ? Math.round((val.present / val.total) * 100)
                              : 0;
                          return (
                            <tr
                              key={key}
                              style={{
                                background: i % 2 === 0 ? "#111827" : "#0f1117",
                              }}
                            >
                              <td className="px-3 py-2 text-white">{cls}</td>
                              <td className="px-3 py-2 text-blue-400">{sec}</td>
                              <td className="px-3 py-2 text-green-400 font-medium">
                                {val.present}
                              </td>
                              <td className="px-3 py-2 text-red-400">
                                {val.absent}
                              </td>
                              <td className="px-3 py-2 text-gray-300">
                                {val.total}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                                    pct >= 75
                                      ? "bg-green-900/50 text-green-400"
                                      : pct >= 50
                                        ? "bg-yellow-900/50 text-yellow-400"
                                        : "bg-red-900/50 text-red-400"
                                  }`}
                                >
                                  {pct}%
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Route wise */}
              <div>
                <h4 className="text-gray-300 text-sm font-medium mb-2">
                  Route Wise
                </h4>
                <div className="rounded-lg overflow-hidden border border-gray-700">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: "#111827" }}>
                        {["Route", "Present", "Absent", "Total"].map((h) => (
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
                      {Object.keys(data.routeMap).length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-3 py-6 text-center text-gray-500"
                          >
                            No route data available.
                          </td>
                        </tr>
                      ) : (
                        Object.entries(data.routeMap).map(([route, val], i) => (
                          <tr
                            key={route}
                            style={{
                              background: i % 2 === 0 ? "#111827" : "#0f1117",
                            }}
                          >
                            <td className="px-3 py-2 text-white">{route}</td>
                            <td className="px-3 py-2 text-green-400 font-medium">
                              {val.present}
                            </td>
                            <td className="px-3 py-2 text-red-400">
                              {val.absent}
                            </td>
                            <td className="px-3 py-2 text-gray-300">
                              {val.total}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fees Awaiting Modal */}
      {showFeesModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 pt-16"
          data-ocid="dashboard.fees.modal"
        >
          <div
            className="rounded-xl w-full max-w-md mx-4"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-white font-semibold">Fees Summary</h3>
              <button
                type="button"
                onClick={() => setShowFeesModal(false)}
                className="text-gray-400 hover:text-white"
                data-ocid="dashboard.fees.close_button"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-400 text-sm">
                  Total Fees Paid Today
                </span>
                <span className="text-green-400 font-bold text-lg">
                  ₹{data.totalPaidToday.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-400 text-sm">
                  Total Dues (Old Balance)
                </span>
                <span className="text-red-400 font-bold text-lg">
                  ₹{data.totalDues.toLocaleString("en-IN")}
                </span>
              </div>
              <div
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{
                  background: "#fef3c720",
                  border: "1px solid #d9770620",
                }}
              >
                <span className="text-yellow-400 text-xl">📅</span>
                <div>
                  <div className="text-yellow-300 text-sm font-medium">
                    Fee Due Date
                  </div>
                  <div className="text-yellow-400/80 text-xs">
                    15th of every month
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowFeesModal(false);
                  navigate("/fees");
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded mt-2"
                data-ocid="dashboard.fees.button"
              >
                Go to Fees Module
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
