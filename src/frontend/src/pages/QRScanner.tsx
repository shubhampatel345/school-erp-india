import { Button } from "@/components/ui/button";
import {
  Camera,
  CheckCircle,
  ClipboardList,
  QrCode,
  UserCheck,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

interface QRAttendanceRecord {
  admNo: string;
  name: string;
  className: string;
  section: string;
  timestamp: string;
  scannedBy: string;
  scannedByRole: string;
  date: string;
}

interface ScannedStudent {
  admNo: string;
  name: string;
  class: string;
  section: string;
  dob?: string;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export function QRScanner() {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScannedStudent | null>(null);
  const [scanError, setScanError] = useState("");
  const [manualAdm, setManualAdm] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [records, setRecords] = useState<QRAttendanceRecord[]>(() => {
    try {
      const all = JSON.parse(
        localStorage.getItem("erp_qr_attendance") || "[]",
      ) as QRAttendanceRecord[];
      const today = todayStr();
      return all.filter((r) => r.date === today);
    } catch {
      return [];
    }
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const saveRecord = useCallback(
    (student: ScannedStudent) => {
      const now = new Date();
      const record: QRAttendanceRecord = {
        admNo: student.admNo,
        name: student.name,
        className: student.class,
        section: student.section,
        timestamp: now.toISOString(),
        scannedBy: user?.name || "Unknown",
        scannedByRole: user?.role || "unknown",
        date: todayStr(),
      };
      setRecords((prev) => {
        // Avoid duplicate entry for same student today (within 5 min)
        const exists = prev.find((r) => r.admNo === student.admNo);
        if (exists) {
          setSuccessMsg(`⚠️ ${student.name} already marked present today`);
          setTimeout(() => setSuccessMsg(""), 3000);
          return prev;
        }
        const updated = [record, ...prev];
        // Persist all records
        try {
          const allRecords = JSON.parse(
            localStorage.getItem("erp_qr_attendance") || "[]",
          ) as QRAttendanceRecord[];
          const filtered = allRecords.filter((r) => r.date !== todayStr());
          localStorage.setItem(
            "erp_qr_attendance",
            JSON.stringify([...updated, ...filtered]),
          );
        } catch {}
        setSuccessMsg(
          `✅ ${student.name} marked Present at ${formatTime(now.toISOString())}`,
        );
        setTimeout(() => setSuccessMsg(""), 4000);
        return updated;
      });
    },
    [user],
  );

  const processQRData = useCallback(
    (data: string) => {
      try {
        const parsed = JSON.parse(data) as Partial<ScannedStudent>;
        if (parsed.admNo && parsed.name) {
          const student: ScannedStudent = {
            admNo: parsed.admNo,
            name: parsed.name,
            class: parsed.class || "",
            section: parsed.section || "",
            dob: parsed.dob,
          };
          setScanResult(student);
          saveRecord(student);
          return true;
        }
      } catch {}
      // Try to look up by admNo if plain text
      try {
        const students = JSON.parse(
          localStorage.getItem("erp_students") || "[]",
        ) as Array<{
          admNo: string;
          name: string;
          className: string;
          section: string;
        }>;
        const s = students.find((st) => st.admNo === data.trim());
        if (s) {
          const student: ScannedStudent = {
            admNo: s.admNo,
            name: s.name,
            class: s.className,
            section: s.section,
          };
          setScanResult(student);
          saveRecord(student);
          return true;
        }
      } catch {}
      return false;
    },
    [saveRecord],
  );

  const startScanner = async () => {
    setScanError("");
    setScanResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setScanning(true);
      // Poll frames for QR
      const tick = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
          animFrameRef.current = requestAnimationFrame(tick);
          return;
        }
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Try to detect via BarcodeDetector if available
        if ("BarcodeDetector" in window) {
          const detector = new (window as any).BarcodeDetector({
            formats: ["qr_code"],
          });
          detector
            .detect(canvas)
            .then((barcodes: Array<{ rawValue: string }>) => {
              if (barcodes.length > 0) {
                const qrData = barcodes[0].rawValue;
                const success = processQRData(qrData);
                if (success) {
                  stopScanner();
                }
              }
            })
            .catch(() => {});
        }
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setScanError(
        "Camera access denied. Please allow camera permissions and try again.",
      );
      console.error(err);
    }
  };

  const stopScanner = () => {
    cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: cleanup only
  useEffect(
    () => () => {
      stopScanner();
    },
    [],
  );

  const handleManualSubmit = () => {
    if (!manualAdm.trim()) return;
    try {
      const students = JSON.parse(
        localStorage.getItem("erp_students") || "[]",
      ) as Array<{
        admNo: string;
        name: string;
        className: string;
        section: string;
      }>;
      const s = students.find(
        (st) => st.admNo.toLowerCase() === manualAdm.trim().toLowerCase(),
      );
      if (s) {
        const student: ScannedStudent = {
          admNo: s.admNo,
          name: s.name,
          class: s.className,
          section: s.section,
        };
        setScanResult(student);
        saveRecord(student);
        setManualAdm("");
      } else {
        setScanError(`Student with Adm. No. "${manualAdm}" not found.`);
        setTimeout(() => setScanError(""), 3000);
      }
    } catch {
      setScanError("Error looking up student.");
    }
  };

  const exportCSV = () => {
    const rows = [
      ["Adm No", "Name", "Class", "Section", "Time In", "Scanned By", "Date"],
    ];
    for (const r of records) {
      rows.push([
        r.admNo,
        r.name,
        r.className,
        r.section,
        formatTime(r.timestamp),
        r.scannedBy,
        r.date,
      ]);
    }
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-attendance-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold flex items-center gap-2">
            <QrCode size={22} className="text-cyan-400" />
            QR Attendance Scanner
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            {currentTime.toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            &nbsp;|&nbsp;
            <span className="font-mono text-cyan-300">
              {currentTime.toLocaleTimeString("en-IN")}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-xs">Scanned by</p>
          <p className="text-white text-sm font-semibold">{user?.name}</p>
          <p className="text-gray-500 text-xs capitalize">
            {user?.role?.replace("_", " ")}
          </p>
        </div>
      </div>

      {/* Success Alert */}
      {successMsg && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            successMsg.startsWith("✅")
              ? "bg-green-900/40 text-green-300 border border-green-700"
              : "bg-yellow-900/40 text-yellow-300 border border-yellow-700"
          }`}
          data-ocid="qr_scanner.success_state"
        >
          {successMsg}
        </div>
      )}

      {/* Camera Scanner */}
      <div
        className="rounded-xl overflow-hidden mb-4"
        style={{ background: "#1a1f2e", border: "1px solid #374151" }}
      >
        <div className="p-3 border-b border-gray-700 flex items-center justify-between">
          <span className="text-white text-sm font-medium flex items-center gap-2">
            <Camera size={16} className="text-cyan-400" /> Camera Scanner
          </span>
          {scanning && (
            <span className="flex items-center gap-1 text-green-400 text-xs">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          )}
        </div>
        <div
          className="relative"
          style={{ minHeight: "280px", background: "#0d111c" }}
        >
          <video
            ref={videoRef}
            className="w-full"
            playsInline
            muted
            style={{ display: scanning ? "block" : "none" }}
          />
          <canvas ref={canvasRef} className="hidden" />
          {!scanning && (
            <div className="flex flex-col items-center justify-center h-64">
              <QrCode size={60} className="text-gray-600 mb-4" />
              <p className="text-gray-500 text-sm mb-4">
                Camera is off. Press Start to scan.
              </p>
              {scanError && (
                <p
                  className="text-red-400 text-xs px-4 text-center"
                  data-ocid="qr_scanner.error_state"
                >
                  {scanError}
                </p>
              )}
            </div>
          )}
          {/* QR frame overlay */}
          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="w-48 h-48 border-2 border-cyan-400 rounded-lg opacity-60"
                style={{ boxShadow: "0 0 0 1000px rgba(0,0,0,0.4)" }}
              >
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-400" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-400" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-400" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-400" />
              </div>
            </div>
          )}
        </div>
        <div className="p-3 flex gap-2 justify-center">
          {!scanning ? (
            <Button
              onClick={startScanner}
              className="bg-cyan-600 hover:bg-cyan-700 text-white text-sm min-h-[48px] px-8"
              data-ocid="qr_scanner.button"
            >
              <Camera size={18} className="mr-2" /> Start Scanner
            </Button>
          ) : (
            <Button
              onClick={stopScanner}
              variant="outline"
              className="border-red-600 text-red-400 hover:bg-red-900/20 text-sm min-h-[48px] px-8"
              data-ocid="qr_scanner.button"
            >
              <XCircle size={18} className="mr-2" /> Stop Scanner
            </Button>
          )}
        </div>
      </div>

      {/* Scan Result Card */}
      {scanResult && (
        <div
          className="rounded-xl p-4 mb-4 flex items-center gap-4"
          style={{ background: "#052e16", border: "1px solid #166534" }}
          data-ocid="qr_scanner.success_state"
        >
          <div className="w-14 h-14 rounded-full bg-green-800 flex items-center justify-center flex-shrink-0">
            <CheckCircle size={30} className="text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-green-300 font-bold text-base">
              {scanResult.name}
            </p>
            <p className="text-green-400 text-xs">Adm: {scanResult.admNo}</p>
            <p className="text-green-400 text-xs">
              Class {scanResult.class} {scanResult.section}
            </p>
          </div>
          <div className="text-right">
            <p className="text-white text-lg font-mono">
              {new Date().toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="text-green-400 text-xs">Marked Present</p>
          </div>
        </div>
      )}

      {/* Manual Entry */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{ background: "#1a1f2e", border: "1px solid #374151" }}
      >
        <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
          <UserCheck size={15} className="text-blue-400" /> Manual Entry
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualAdm}
            onChange={(e) => setManualAdm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
            placeholder="Enter Admission No. (e.g. ADM-2024-001)"
            className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-3 text-white text-sm outline-none focus:border-cyan-500 min-h-[48px]"
            data-ocid="qr_scanner.input"
          />
          <Button
            onClick={handleManualSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white min-h-[48px] px-5"
            data-ocid="qr_scanner.button"
          >
            Mark Present
          </Button>
        </div>
      </div>

      {/* Today's Attendance Log */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "#1a1f2e", border: "1px solid #374151" }}
      >
        <div className="p-3 border-b border-gray-700 flex items-center justify-between">
          <span className="text-white text-sm font-medium flex items-center gap-2">
            <ClipboardList size={15} className="text-blue-400" />
            Today's Scan Log
            <span className="bg-blue-900/50 text-blue-300 text-[10px] px-2 py-0.5 rounded-full">
              {records.length} students
            </span>
          </span>
          {records.length > 0 && (
            <button
              type="button"
              onClick={exportCSV}
              className="text-xs text-green-400 hover:text-green-300 bg-green-900/20 hover:bg-green-900/30 border border-green-700 rounded px-2 py-1 transition"
              data-ocid="qr_scanner.button"
            >
              Export CSV
            </button>
          )}
        </div>
        {records.length === 0 ? (
          <div
            className="text-center py-12 text-gray-500"
            data-ocid="qr_scanner.empty_state"
          >
            <QrCode size={40} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No scans yet today</p>
          </div>
        ) : (
          <div className="overflow-x-auto" data-ocid="qr_scanner.table">
            <table className="w-full text-xs">
              <thead>
                <tr
                  style={{
                    background: "#111827",
                    borderBottom: "1px solid #1f2937",
                  }}
                >
                  <th className="px-3 py-2 text-left text-gray-400 font-medium">
                    #
                  </th>
                  <th className="px-3 py-2 text-left text-gray-400 font-medium">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-gray-400 font-medium">
                    Class
                  </th>
                  <th className="px-3 py-2 text-left text-gray-400 font-medium">
                    Time In
                  </th>
                  <th className="px-3 py-2 text-left text-gray-400 font-medium">
                    Scanned By
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr
                    key={`${r.admNo}-${r.timestamp}`}
                    style={{
                      background: i % 2 === 0 ? "#0d111c" : "#111827",
                      borderBottom: "1px solid #1f2937",
                    }}
                    data-ocid={`qr_scanner.row.${i + 1}`}
                  >
                    <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2">
                      <p className="text-white font-medium">{r.name}</p>
                      <p className="text-gray-500">{r.admNo}</p>
                    </td>
                    <td className="px-3 py-2 text-gray-300">
                      {r.className} {r.section}
                    </td>
                    <td className="px-3 py-2 text-cyan-300 font-mono">
                      {formatTime(r.timestamp)}
                    </td>
                    <td className="px-3 py-2 text-gray-400">{r.scannedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
