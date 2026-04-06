import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  CreditCard,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getAllCredentials } from "../context/AuthContext";

interface ParentDashboardProps {
  navigate: (path: string) => void;
}

interface ChildInfo {
  admNo: string;
  name: string;
  className: string;
  section: string;
  status: string;
  feesDue: number;
  attendancePct: number;
}

export function ParentDashboard({ navigate }: ParentDashboardProps) {
  const { user } = useAuth();
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedChild, setSelectedChild] = useState<ChildInfo | null>(null);

  // Find children linked to this parent
  const children = (() => {
    try {
      const creds = getAllCredentials();
      const parentCred = creds.find(
        (c) => c.userId === user?.userId && c.role === "parent",
      );
      const childAdmNos = parentCred?.parentOf || [];

      const students = JSON.parse(
        localStorage.getItem("erp_students") || "[]",
      ) as Array<{
        admNo: string;
        name: string;
        className: string;
        section: string;
        status: string;
        oldBalance?: number;
      }>;
      const payments = JSON.parse(
        localStorage.getItem("erp_fee_payments") || "[]",
      ) as Array<{
        admNo: string;
        receiptAmt: number;
      }>;
      const attendance = JSON.parse(
        localStorage.getItem("erp_attendance") || "[]",
      ) as Array<{
        admNo: string;
        status: string;
      }>;

      if (childAdmNos.length > 0) {
        return students
          .filter((s) => childAdmNos.includes(s.admNo))
          .map((s) => {
            const paid = payments
              .filter((p) => p.admNo === s.admNo)
              .reduce((sum, p) => sum + p.receiptAmt, 0);
            const attRecords = attendance.filter((a) => a.admNo === s.admNo);
            const presentCount = attRecords.filter(
              (a) => a.status === "Present",
            ).length;
            const attPct =
              attRecords.length > 0
                ? Math.round((presentCount / attRecords.length) * 100)
                : 0;
            return {
              admNo: s.admNo,
              name: s.name,
              className: s.className,
              section: s.section,
              status: s.status,
              feesDue: Math.max(0, (s.oldBalance || 0) - paid),
              attendancePct: attPct,
            } as ChildInfo;
          });
      }
      // Fallback: demo parent
      return students.slice(0, 2).map(
        (s) =>
          ({
            admNo: s.admNo,
            name: s.name,
            className: s.className,
            section: s.section,
            status: s.status,
            feesDue: s.oldBalance || 0,
            attendancePct: 85,
          }) as ChildInfo,
      );
    } catch {
      return [];
    }
  })();

  const totalDue = children.reduce((s, c) => s + c.feesDue, 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">Welcome, {user?.name}</h1>
        <p className="text-gray-400 text-sm">
          Parent Dashboard &mdash;{" "}
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div
          className="rounded-xl p-4"
          style={{ background: "#1a1f2e", border: "1px solid #374151" }}
        >
          <p className="text-gray-400 text-xs mb-1">Children</p>
          <p className="text-white text-3xl font-bold">{children.length}</p>
          <p className="text-blue-400 text-xs mt-1 flex items-center gap-1">
            <Users size={12} /> Enrolled
          </p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{
            background: totalDue > 0 ? "#1f0a0a" : "#0a1f0a",
            border: `1px solid ${totalDue > 0 ? "#7f1d1d" : "#14532d"}`,
          }}
        >
          <p className="text-gray-400 text-xs mb-1">Total Fees Due</p>
          <p
            className={`text-3xl font-bold ${totalDue > 0 ? "text-red-400" : "text-green-400"}`}
          >
            ₹{totalDue.toLocaleString("en-IN")}
          </p>
          <p
            className={`text-xs mt-1 flex items-center gap-1 ${totalDue > 0 ? "text-red-400" : "text-green-400"}`}
          >
            {totalDue > 0 ? (
              <AlertCircle size={12} />
            ) : (
              <CheckCircle size={12} />
            )}
            {totalDue > 0 ? "Pending" : "All Clear"}
          </p>
        </div>
        <div
          className="rounded-xl p-4 col-span-2 sm:col-span-1"
          style={{ background: "#1a1f2e", border: "1px solid #374151" }}
        >
          <p className="text-gray-400 text-xs mb-1">Avg Attendance</p>
          <p className="text-white text-3xl font-bold">
            {children.length > 0
              ? Math.round(
                  children.reduce((s, c) => s + c.attendancePct, 0) /
                    children.length,
                )
              : 0}
            %
          </p>
          <p className="text-yellow-400 text-xs mt-1 flex items-center gap-1">
            <CheckCircle size={12} /> Average
          </p>
        </div>
      </div>

      {/* Children Cards */}
      <div className="space-y-4 mb-6">
        {children.map((child, i) => (
          <div
            key={child.admNo}
            className="rounded-xl p-4"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
            data-ocid={`parent.student.item.${i + 1}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-white font-semibold">{child.name}</h3>
                <p className="text-gray-400 text-xs">
                  Adm: {child.admNo} &bull; Class {child.className}{" "}
                  {child.section}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${child.status === "Active" ? "bg-green-900/50 text-green-400" : "bg-gray-700 text-gray-400"}`}
              >
                {child.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg p-3" style={{ background: "#0d111c" }}>
                <p className="text-gray-500 text-xs">Fees Due</p>
                <p
                  className={`font-bold text-lg ${child.feesDue > 0 ? "text-red-400" : "text-green-400"}`}
                >
                  ₹{child.feesDue.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-lg p-3" style={{ background: "#0d111c" }}>
                <p className="text-gray-500 text-xs">Attendance</p>
                <p className="text-white font-bold text-lg">
                  {child.attendancePct}%
                </p>
              </div>
            </div>
            {child.feesDue > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedChild(child);
                  setShowPayModal(true);
                }}
                className="mt-3 w-full bg-orange-600 hover:bg-orange-700 text-white rounded-lg py-2 text-sm font-medium transition"
                data-ocid="parent.fees.button"
              >
                Pay Fees Online
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => navigate("/fees")}
          className="rounded-xl p-4 flex flex-col items-center gap-2 transition hover:opacity-90"
          style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          data-ocid="parent.fees.link"
        >
          <CreditCard size={22} className="text-orange-400" />
          <span className="text-white text-xs font-medium">View Fees</span>
        </button>
        <button
          type="button"
          onClick={() => navigate("/attendance")}
          className="rounded-xl p-4 flex flex-col items-center gap-2 transition hover:opacity-90"
          style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          data-ocid="parent.attendance.link"
        >
          <CheckCircle size={22} className="text-green-400" />
          <span className="text-white text-xs font-medium">Attendance</span>
        </button>
        <button
          type="button"
          onClick={() => navigate("/communicate")}
          className="rounded-xl p-4 flex flex-col items-center gap-2 transition hover:opacity-90"
          style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          data-ocid="parent.notices.link"
        >
          <BookOpen size={22} className="text-blue-400" />
          <span className="text-white text-xs font-medium">Notices</span>
        </button>
      </div>

      {/* Online Payment Modal */}
      {showPayModal && selectedChild && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          data-ocid="parent.payment.dialog"
        >
          <div
            className="rounded-xl p-6 w-full max-w-sm shadow-2xl"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <h3 className="text-white text-base font-semibold mb-1">
              Pay Fees Online
            </h3>
            <p className="text-gray-400 text-xs mb-4">
              For {selectedChild.name}
            </p>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Amount Due</span>
                <span className="text-red-400 font-bold">
                  ₹{selectedChild.feesDue.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
            <p className="text-yellow-400 text-xs mb-4 bg-yellow-900/20 border border-yellow-800 rounded p-2">
              Online payment requires the school to enable payment gateways.
              Please contact the school office.
            </p>
            <button
              type="button"
              onClick={() => setShowPayModal(false)}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2 text-sm"
              data-ocid="parent.payment.close_button"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
