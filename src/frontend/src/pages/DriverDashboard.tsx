import { Bus, QrCode, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface DriverDashboardProps {
  navigate: (path: string) => void;
}

export function DriverDashboard({ navigate }: DriverDashboardProps) {
  const { user } = useAuth();

  // Find assigned route from transport assignments and staff data
  const routeInfo = (() => {
    try {
      const routes = JSON.parse(
        localStorage.getItem("erp_transport_routes") || "[]",
      ) as Array<{
        id: number;
        name: string;
        vehicle?: string;
        stops?: Array<{ name: string }>;
      }>;
      const staff = JSON.parse(
        localStorage.getItem("erp_staff") || "[]",
      ) as Array<{
        name: string;
        designation: string;
        contact: string;
      }>;
      const staffRecord = staff.find(
        (s) => s.name === user?.name || s.contact === user?.userId,
      );
      if (!staffRecord) return routes[0] || null;
      return routes[0] || null;
    } catch {
      return null;
    }
  })();

  const assignedStudents = (() => {
    try {
      const students = JSON.parse(
        localStorage.getItem("erp_students") || "[]",
      ) as Array<{
        admNo: string;
        name: string;
        className: string;
        section: string;
        route?: string;
      }>;
      if (routeInfo) {
        return students.filter((s) => s.route === routeInfo.name);
      }
      return students.slice(0, 5);
    } catch {
      return [];
    }
  })();

  const todayScans = (() => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const all = JSON.parse(
        localStorage.getItem("erp_qr_attendance") || "[]",
      ) as Array<{
        admNo: string;
        name: string;
        className: string;
        date: string;
        timestamp: string;
      }>;
      return all.filter((r) => r.date === today);
    } catch {
      return [];
    }
  })();

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">Welcome, {user?.name}</h1>
        <p className="text-gray-400 text-sm">
          Driver Dashboard &mdash;{" "}
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div
          className="rounded-xl p-4"
          style={{ background: "#1a1f2e", border: "1px solid #374151" }}
        >
          <p className="text-gray-400 text-xs mb-1">Students on Route</p>
          <p className="text-white text-3xl font-bold">
            {assignedStudents.length}
          </p>
          <p className="text-blue-400 text-xs mt-1 flex items-center gap-1">
            <Users size={12} /> Assigned
          </p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{ background: "#1a1f2e", border: "1px solid #374151" }}
        >
          <p className="text-gray-400 text-xs mb-1">Scanned Today</p>
          <p className="text-white text-3xl font-bold">{todayScans.length}</p>
          <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
            <QrCode size={12} /> Present
          </p>
        </div>
      </div>

      {/* Route Info */}
      {routeInfo && (
        <div
          className="rounded-xl p-4 mb-6"
          style={{ background: "#1a1f2e", border: "1px solid #374151" }}
        >
          <h2 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
            <Bus size={16} className="text-orange-400" /> Assigned Route
          </h2>
          <p className="text-white font-medium">{routeInfo.name}</p>
          {routeInfo.vehicle && (
            <p className="text-gray-400 text-xs mt-1">
              Vehicle: {routeInfo.vehicle}
            </p>
          )}
          {routeInfo.stops && routeInfo.stops.length > 0 && (
            <div className="mt-2">
              <p className="text-gray-500 text-xs mb-1">Stops:</p>
              <div className="flex flex-wrap gap-1">
                {routeInfo.stops.map((s) => (
                  <span
                    key={s.name}
                    className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* QR Scanner CTA */}
      <button
        type="button"
        onClick={() => navigate("/qr-scanner")}
        className="w-full rounded-xl p-5 flex items-center gap-4 transition hover:opacity-90 mb-6"
        style={{
          background: "linear-gradient(135deg, #0891b2 0%, #0e7490 100%)",
          border: "1px solid #0891b2",
        }}
        data-ocid="driver.qr_scanner.button"
      >
        <QrCode size={40} className="text-white flex-shrink-0" />
        <div className="text-left">
          <p className="text-white font-bold text-lg">Open QR Scanner</p>
          <p className="text-cyan-100 text-sm">
            Scan student admit cards to mark attendance
          </p>
        </div>
      </button>

      {/* Students List */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "#1a1f2e", border: "1px solid #374151" }}
      >
        <div className="p-3 border-b border-gray-700">
          <span className="text-white text-sm font-medium flex items-center gap-2">
            <Users size={15} className="text-blue-400" /> Students on My Route
          </span>
        </div>
        {assignedStudents.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No students assigned to your route.
          </div>
        ) : (
          <div>
            {assignedStudents.map((s, i) => {
              const scanned = todayScans.find((sc) => sc.admNo === s.admNo);
              return (
                <div
                  key={s.admNo}
                  className="flex items-center justify-between px-4 py-3"
                  style={{
                    borderBottom: "1px solid #1f2937",
                    background: i % 2 === 0 ? "#0d111c" : "#111827",
                  }}
                  data-ocid={`driver.student.item.${i + 1}`}
                >
                  <div>
                    <p className="text-white text-sm font-medium">{s.name}</p>
                    <p className="text-gray-500 text-xs">
                      {s.admNo} &bull; Class {s.className} {s.section}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${scanned ? "bg-green-900/50 text-green-400" : "bg-gray-700 text-gray-400"}`}
                  >
                    {scanned ? "Present" : "Absent"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
