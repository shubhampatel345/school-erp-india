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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { AttendanceRecord, Student } from "../../types";
import { generateId } from "../../utils/localStorage";

interface QRAttendanceProps {
  date: string;
}

type ScanMode = "camera" | "device";

const ALLOWED_ROLES = new Set(["superadmin", "admin", "teacher", "driver"]);

/** Broadcast scan event for WelcomeDisplay (same tab) */
function broadcastScan(
  personId: string,
  personType: "student" | "staff",
  record: AttendanceRecord,
) {
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
  const { getData, saveData, addNotification, currentSession, currentUser } =
    useApp();
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
  const deviceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [scanLog, setScanLog] = useState<
    Array<{ name: string; admNo: string; cls: string; time: string }>
  >([]);

  const activeStudents = useMemo(
    () =>
      (getData("students") as Student[]).filter(
        (s) =>
          s.sessionId === (currentSession?.id ?? "") && s.status === "active",
      ),
    [getData, currentSession],
  );

  // Role gate
  const canAccess = currentUser ? ALLOWED_ROLES.has(currentUser.role) : false;

  const markStudent = useCallback(
    async (student: Student) => {
      // Check if already marked today
      const existing = (getData("attendance") as AttendanceRecord[]).find(
        (r) => r.date === date && r.studentId === student.id,
      );
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
        markedBy: currentUser?.username ?? currentUser?.name ?? "System",
        type: "student",
        method: "qr",
        class: student.class,
        section: student.section,
        sessionId: currentSession?.id,
      };

      try {
        await saveData("attendance", rec as unknown as Record<string, unknown>);
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
      } catch {
        toast.error(`Failed to save attendance for ${student.fullName}`);
        return false;
      }
    },
    [date, currentUser, currentSession, getData, saveData, addNotification],
  );

  // ── Camera helpers ──────────────────────────────────────

  function handleManualCamera() {
    const q = manualAdm.trim().toLowerCase();
    if (!q) return;
    const student = activeStudents.find((s) => s.admNo.toLowerCase() === q);
    if (!student) {
      toast.error("Student not found");
      return;
    }
    void markStudent(student);
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
      const student = activeStudents.find(
        (s) => s.admNo.toLowerCase() === admNo.toLowerCase(),
      );
      if (student) {
        void markStudent(student);
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — only re-run when mode changes
  useEffect(() => {
    if (mode === "device") {
      stopCamera();
      const cb = (el: HTMLInputElement | null) => el?.focus();
      setTimeout(() => cb(deviceInputRef.current), 100);
    }
  }, [mode]);

  function processDeviceScan(raw: string) {
    const value = raw.trim();
    if (!value) return;
    const admNo = parseAdmNo(value);
    const student = activeStudents.find(
      (s) => s.admNo.toLowerCase() === admNo.toLowerCase(),
    );
    if (!student) {
      toast.error(`Not found: "${admNo}"`);
    } else {
      const now = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      void markStudent(student).then((ok) => {
        if (ok !== false) {
          setLastScanFeedback({ name: student.fullName, time: now });
          setTimeout(() => setLastScanFeedback(null), 3000);
        }
      });
    }
    setDeviceInputValue("");
    setTimeout(() => deviceInputRef.current?.focus(), 50);
  }

  function handleDeviceKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (deviceTimerRef.current) clearTimeout(deviceTimerRef.current);
    if (e.key === "Enter") {
      e.preventDefault();
      processDeviceScan(deviceInputValue);
    }
  }

  function handleDeviceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setDeviceInputValue(val);
    if (deviceTimerRef.current) clearTimeout(deviceTimerRef.current);
    if (val.length > 0) {
      deviceTimerRef.current = setTimeout(() => {
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
          data-ocid="qr.camera-mode.tab"
        >
          <Camera className="w-4 h-4" /> Camera
        </button>
        <button
          type="button"
          onClick={() => setMode("device")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === "device"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-ocid="qr.device-mode.tab"
        >
          <Keyboard className="w-4 h-4" /> Scanner Device
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
                    onClick={() => {
                      void startCamera();
                    }}
                    data-ocid="qr.start-camera.button"
                  >
                    <Camera className="w-4 h-4 mr-2" /> Start Camera
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={stopCamera}
                    data-ocid="qr.stop-camera.button"
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
                    data-ocid="qr.manual-adm.input"
                  />
                  <Button
                    onClick={handleManualCamera}
                    data-ocid="qr.manual-submit.button"
                  >
                    Mark
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Device Scanner Mode */
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

              {lastScanFeedback ? (
                <div className="flex items-center gap-3 p-4 bg-accent/10 border border-accent/30 rounded-xl animate-in fade-in duration-200">
                  <CheckCircle2 className="w-8 h-8 text-accent flex-shrink-0" />
                  <div>
                    <p className="font-bold text-foreground text-lg">
                      ✅ {lastScanFeedback.name}
                    </p>
                    <p className="text-muted-foreground text-sm">
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
                  data-ocid="qr.device-scan.input"
                />
                <p className="text-[10px] text-muted-foreground">
                  USB scanner: auto-submits on Enter. Manual typing: press Enter
                  to mark attendance.
                </p>
              </div>

              <button
                type="button"
                onClick={() => deviceInputRef.current?.focus()}
                className="w-full py-1.5 text-xs text-muted-foreground border border-dashed border-border rounded-lg hover:bg-muted/30 transition-colors"
                data-ocid="qr.refocus.button"
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
              data-ocid="qr.export-csv.button"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> CSV
            </Button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {scanLog.length === 0 ? (
              <div
                className="py-10 text-center text-muted-foreground"
                data-ocid="qr.scan-log.empty-state"
              >
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
                  data-ocid={`qr.scan-log.item.${i + 1}`}
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

      <Card className="p-4 bg-primary/5 border-primary/20">
        <p className="text-sm text-foreground">
          <span className="font-semibold">📷 Camera mode:</span> Start the
          camera and point it at a student's admit card QR code.{" "}
          <span className="font-semibold ml-2">⌨️ Scanner Device mode:</span>{" "}
          Connect a USB/Bluetooth barcode scanner — it will type the code into
          the input and auto-submit on Enter. All scans save directly to MySQL
          via the server.
        </p>
      </Card>
    </div>
  );
}
