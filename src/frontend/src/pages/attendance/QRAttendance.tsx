import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Camera,
  CheckCircle2,
  Download,
  Keyboard,
  QrCode,
  ShieldOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { AttendanceRecord, Student } from "../../types";
import { generateId, ls } from "../../utils/localStorage";

interface QRAttendanceProps {
  date: string;
}

type ScanMode = "camera" | "device";

const ALLOWED_ROLES = new Set(["superadmin", "admin", "teacher", "driver"]);

/** Broadcast scan event for WelcomeDisplay */
function broadcastScan(
  personId: string,
  personType: "student" | "staff",
  record: AttendanceRecord,
) {
  ls.set("last_scan", { personId, personType, record, ts: Date.now() });
  window.dispatchEvent(
    new CustomEvent("attendance_scan", {
      detail: { personId, personType, record },
    }),
  );
}

/** Parse admission number from QR code value (JSON or plain text) */
function parseAdmNo(raw: string): string {
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed) as Record<string, string>;
    return parsed.admNo ?? parsed.admissionNo ?? parsed.id ?? trimmed;
  } catch {
    return trimmed;
  }
}

export default function QRAttendance({ date }: QRAttendanceProps) {
  const { addNotification, currentSession, currentUser } = useApp();
  const [mode, setMode] = useState<ScanMode>("camera");

  // Camera state
  const [manualAdm, setManualAdm] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const jsQRRef = useRef<
    | ((
        data: Uint8ClampedArray,
        width: number,
        height: number,
      ) => { data: string } | null)
    | null
  >(null);
  const lastDecodedRef = useRef<string>("");
  const lastDecodeTimeRef = useRef<number>(0);

  // Device scanner state
  const deviceInputRef = useRef<HTMLInputElement>(null);
  const [deviceInputValue, setDeviceInputValue] = useState("");
  const [lastScanFeedback, setLastScanFeedback] = useState<{
    name: string;
    time: string;
  } | null>(null);
  // Rapid-input timeout: if no keypress within 100ms after chars were typed, treat as scan
  const deviceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [scanLog, setScanLog] = useState<
    Array<{ name: string; admNo: string; cls: string; time: string }>
  >([]);

  const students = useRef<Student[]>([]);
  students.current = ls
    .get<Student[]>("students", [])
    .filter(
      (s) =>
        s.sessionId === (currentSession?.id ?? "") && s.status === "active",
    );

  const [_records, setRecords] = useState<AttendanceRecord[]>(() =>
    ls.get<AttendanceRecord[]>("attendance", []),
  );

  // Role gate
  const canAccess = currentUser ? ALLOWED_ROLES.has(currentUser.role) : false;

  const markStudent = useCallback(
    (student: Student) => {
      const existing = ls
        .get<AttendanceRecord[]>("attendance", [])
        .find((r) => r.date === date && r.studentId === student.id);
      if (existing) {
        toast.info(`${student.fullName} already marked present`);
        return false;
      }
      const now = new Date();
      const timeIn = now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const rec: AttendanceRecord = {
        id: generateId(),
        studentId: student.id,
        date,
        status: "Present",
        timeIn,
        markedBy: currentUser?.name ?? "System",
        type: "student",
        method: "qr",
      };
      setRecords((prev) => {
        const updated = [...prev, rec];
        ls.set("attendance", updated);
        return updated;
      });
      setScanLog((prev) =>
        [
          {
            name: student.fullName,
            admNo: student.admNo,
            cls: `${student.class}-${student.section}`,
            time: timeIn,
          },
          ...prev,
        ].slice(0, 50),
      );
      toast.success(`✅ ${student.fullName} marked Present`);
      addNotification(
        `📷 QR Scan: ${student.fullName} checked in`,
        "success",
        "📷",
      );
      broadcastScan(student.id, "student", rec);
      return true;
    },
    [date, currentUser, addNotification],
  );

  // ── Camera helpers ──────────────────────────────────────

  function handleManualCamera() {
    const q = manualAdm.trim().toLowerCase();
    if (!q) return;
    const student = students.current.find((s) => s.admNo.toLowerCase() === q);
    if (!student) {
      toast.error("Student not found");
      return;
    }
    markStudent(student);
    setManualAdm("");
  }

  function tryDecode() {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !jsQRRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQRRef.current(
      imageData.data,
      imageData.width,
      imageData.height,
    );
    if (code?.data) {
      const decoded = code.data.trim();
      const now = Date.now();
      if (
        decoded === lastDecodedRef.current &&
        now - lastDecodeTimeRef.current < 2000
      ) {
        return;
      }
      lastDecodedRef.current = decoded;
      lastDecodeTimeRef.current = now;
      const admNo = parseAdmNo(decoded);
      const student = students.current.find(
        (s) => s.admNo.toLowerCase() === admNo.toLowerCase(),
      );
      if (student) {
        markStudent(student);
      } else {
        toast.error(`QR decoded: "${admNo}" — student not found`);
      }
    }
  }

  function scanLoop() {
    tryDecode();
    animFrameRef.current = requestAnimationFrame(scanLoop);
  }

  async function startCamera() {
    setCameraError("");
    if (!jsQRRef.current) {
      type JsQRFn = (
        data: Uint8ClampedArray,
        width: number,
        height: number,
      ) => { data: string } | null;
      const globalJsQR = (window as Window & { jsQR?: JsQRFn }).jsQR;
      if (typeof globalJsQR === "function") {
        jsQRRef.current = globalJsQR;
      }
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      scanLoop();
    } catch {
      setCameraError(
        "Camera access denied or not available. Use manual entry below.",
      );
      setScanning(false);
    }
  }

  function stopCamera() {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const tracks = streamRef.current?.getTracks() ?? [];
    for (const t of tracks) t.stop();
    streamRef.current = null;
    setScanning(false);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: cleanup only
  useEffect(() => () => stopCamera(), []);

  // ── Device scanner helpers ──────────────────────────────

  /** Auto-focus the device input when switching to device mode */
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — only re-run when mode changes
  useEffect(() => {
    if (mode === "device") {
      // Stop camera if running
      stopCamera();
      setTimeout(() => deviceInputRef.current?.focus(), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function processDeviceScan(raw: string) {
    const value = raw.trim();
    if (!value) return;
    const admNo = parseAdmNo(value);
    const student = students.current.find(
      (s) => s.admNo.toLowerCase() === admNo.toLowerCase(),
    );
    if (!student) {
      toast.error(`Not found: "${admNo}"`);
    } else {
      const ok = markStudent(student);
      if (ok !== false) {
        const now = new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        setLastScanFeedback({ name: student.fullName, time: now });
        setTimeout(() => setLastScanFeedback(null), 3000);
      }
    }
    // Clear input and re-focus for next scan
    setDeviceInputValue("");
    setTimeout(() => deviceInputRef.current?.focus(), 50);
  }

  function handleDeviceKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Clear any pending timeout
    if (deviceTimerRef.current) clearTimeout(deviceTimerRef.current);

    if (e.key === "Enter") {
      e.preventDefault();
      processDeviceScan(deviceInputValue);
      return;
    }
  }

  function handleDeviceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setDeviceInputValue(val);

    // Set a short timeout — if no more keys come within 150ms, treat as complete scan
    if (deviceTimerRef.current) clearTimeout(deviceTimerRef.current);
    if (val.length > 0) {
      deviceTimerRef.current = setTimeout(() => {
        // Only auto-submit if we have a reasonable length (scanner sends full code at once)
        // USB scanners typically send 6-20 chars very fast; manual typists are slower
        // We only auto-submit if the value hasn't changed in 150ms AND length >= 3
        if (val.trim().length >= 3) {
          processDeviceScan(val);
        }
      }, 150);
    }
  }

  function exportCSV() {
    const rows = [["Adm No", "Name", "Class", "Time"]];
    for (const entry of scanLog) {
      rows.push([entry.admNo, entry.name, entry.cls, entry.time]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    a.download = `qr_scan_log_${date}.csv`;
    a.click();
  }

  // Role-gated view
  if (!canAccess) {
    return (
      <Card className="p-10 flex flex-col items-center gap-4 border-dashed">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <ShieldOff className="w-8 h-8 text-destructive/60" />
        </div>
        <div className="text-center">
          <p className="font-display font-semibold text-foreground text-lg">
            Access Restricted
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            QR Attendance scanning is available to Super Admin, Admin, Teacher,
            and Driver roles only.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Mode Toggle */}
      <div className="flex gap-1 p-1 bg-muted/40 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setMode("camera")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === "camera"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-ocid="qr-mode-camera"
        >
          <Camera className="w-4 h-4" />📷 Camera
        </button>
        <button
          type="button"
          onClick={() => setMode("device")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === "device"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-ocid="qr-mode-device"
        >
          <Keyboard className="w-4 h-4" />
          ⌨️ Scanner Device
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Scanner Panel */}
        <Card className="p-5 space-y-4">
          {mode === "camera" ? (
            <>
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                <h3 className="font-display font-semibold text-foreground">
                  Camera QR Scanner
                </h3>
                <Badge
                  variant={scanning ? "default" : "secondary"}
                  className="ml-auto"
                >
                  {scanning ? "🔴 Live" : "Offline"}
                </Badge>
              </div>

              {/* Camera viewport */}
              <div className="relative bg-foreground/5 rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-border">
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${scanning ? "block" : "hidden"}`}
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
                {!scanning && (
                  <div className="flex flex-col items-center gap-3 text-center p-6">
                    <Camera className="w-12 h-12 text-muted-foreground opacity-40" />
                    <p className="text-muted-foreground text-sm">
                      {cameraError ||
                        "Tap Start Camera to scan student QR codes"}
                    </p>
                    {cameraError && (
                      <p className="text-xs text-muted-foreground">
                        Use manual entry below as fallback
                      </p>
                    )}
                  </div>
                )}
                {scanning && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="relative w-48 h-48">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br" />
                    </div>
                    <div className="absolute bottom-3 left-0 right-0 text-center">
                      <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">
                        Point at student's admit card QR
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {!scanning ? (
                  <Button
                    className="flex-1"
                    onClick={startCamera}
                    data-ocid="qr-start-camera"
                  >
                    <Camera className="w-4 h-4 mr-2" /> Start Camera
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={stopCamera}
                    data-ocid="qr-stop-camera"
                  >
                    <X className="w-4 h-4 mr-2" /> Stop Camera
                  </Button>
                )}
              </div>

              {/* Manual fallback */}
              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">
                  Manual Entry (Admission No.)
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type Admission No. and press Enter..."
                    value={manualAdm}
                    onChange={(e) => setManualAdm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleManualCamera()}
                    data-ocid="qr-manual-input"
                  />
                  <Button
                    onClick={handleManualCamera}
                    data-ocid="qr-manual-submit"
                  >
                    Mark
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* ── Device Scanner Mode ── */
            <>
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-primary" />
                <h3 className="font-display font-semibold text-foreground">
                  Scanner Device (USB/Bluetooth)
                </h3>
                <Badge variant="default" className="ml-auto bg-green-600">
                  ● Ready
                </Badge>
              </div>

              {/* Feedback banner */}
              {lastScanFeedback ? (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl animate-in fade-in duration-200">
                  <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-green-800 text-lg">
                      ✅ {lastScanFeedback.name}
                    </p>
                    <p className="text-green-600 text-sm">
                      Marked Present at {lastScanFeedback.time}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-6 bg-muted/30 rounded-xl border-2 border-dashed border-border">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Keyboard className="w-8 h-8 text-primary opacity-70" />
                  </div>
                  <p className="text-muted-foreground text-sm font-medium">
                    Waiting for scan…
                  </p>
                  <p className="text-xs text-muted-foreground text-center px-4">
                    Point your USB/Bluetooth barcode scanner at the student's
                    admit card. The scanner will automatically type the code and
                    mark attendance.
                  </p>
                </div>
              )}

              {/* Always-visible, always-focused scan input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="device-scan-input"
                  className="text-xs text-muted-foreground font-semibold uppercase tracking-wide"
                >
                  Scan Input (auto-focused)
                </label>
                <Input
                  id="device-scan-input"
                  ref={deviceInputRef}
                  value={deviceInputValue}
                  onChange={handleDeviceChange}
                  onKeyDown={handleDeviceKeyDown}
                  onClick={() => deviceInputRef.current?.focus()}
                  placeholder="Scan or type Admission Number, then Enter…"
                  className="text-base font-mono h-12 border-primary/40 focus:border-primary"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-ocid="device-scan-input"
                />
                <p className="text-[10px] text-muted-foreground">
                  USB scanner: auto-submits on Enter. Manual typing: press Enter
                  to mark attendance.
                </p>
              </div>

              {/* Keep input focused hint */}
              <button
                type="button"
                onClick={() => deviceInputRef.current?.focus()}
                className="w-full py-1.5 text-xs text-muted-foreground border border-dashed border-border rounded-lg hover:bg-muted/30 transition-colors"
                data-ocid="device-refocus-btn"
              >
                🔁 Click here to re-focus scan input
              </button>
            </>
          )}
        </Card>

        {/* Scan Log */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-accent" />
            <h3 className="font-display font-semibold text-foreground">
              Today's Scan Log
            </h3>
            <Badge variant="secondary" className="ml-auto">
              {scanLog.length} scanned
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={exportCSV}
              data-ocid="qr-export-csv"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> CSV
            </Button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {scanLog.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <QrCode className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No scans yet today</p>
                <p className="text-xs mt-1">
                  {mode === "camera"
                    ? "Start the camera or enter an admission number above"
                    : "Scan a student's QR code with your scanner device"}
                </p>
              </div>
            ) : (
              scanLog.map((entry, i) => (
                <div
                  key={`${entry.admNo}-${i}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40"
                  data-ocid={`scan-log-row-${entry.admNo}`}
                >
                  <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 text-accent font-bold">
                    {entry.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {entry.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.admNo} · Class {entry.cls}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0 font-mono">
                    {entry.time}
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Info */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <p className="text-sm text-foreground">
          <span className="font-semibold">📷 Camera mode:</span> Start the
          camera and point it at a student's admit card QR code.{" "}
          <span className="font-semibold ml-2">⌨️ Scanner Device mode:</span>{" "}
          Connect a USB/Bluetooth barcode scanner — it will type the code into
          the input and auto-submit on Enter. Both modes share the same scan
          log. Accessible to: Super Admin, Admin, Teacher, Driver.
        </p>
      </Card>
    </div>
  );
}
