import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Camera,
  CheckCircle2,
  Download,
  QrCode,
  ShieldOff,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { AttendanceRecord, Student } from "../../types";
import { generateId, ls } from "../../utils/localStorage";

interface QRAttendanceProps {
  date: string;
}

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

export default function QRAttendance({ date }: QRAttendanceProps) {
  const { addNotification, currentSession, currentUser } = useApp();
  const [manualAdm, setManualAdm] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scanLog, setScanLog] = useState<
    Array<{ name: string; admNo: string; cls: string; time: string }>
  >([]);
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

  const students = useMemo(
    () =>
      ls
        .get<Student[]>("students", [])
        .filter(
          (s) =>
            s.sessionId === (currentSession?.id ?? "") && s.status === "active",
        ),
    [currentSession],
  );

  const [records, setRecords] = useState<AttendanceRecord[]>(() =>
    ls.get<AttendanceRecord[]>("attendance", []),
  );

  // Role gate
  const canAccess = currentUser ? ALLOWED_ROLES.has(currentUser.role) : false;

  function markStudent(student: Student) {
    const existing = records.find(
      (r) => r.date === date && r.studentId === student.id,
    );
    if (existing) {
      toast.info(`${student.fullName} already marked present`);
      return;
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
    const updated = [...records, rec];
    setRecords(updated);
    ls.set("attendance", updated);
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
  }

  function handleManual() {
    const q = manualAdm.trim().toLowerCase();
    if (!q) return;
    const student = students.find((s) => s.admNo.toLowerCase() === q);
    if (!student) {
      toast.error("Student not found");
      return;
    }
    markStudent(student);
    setManualAdm("");
  }

  /** Try to decode from canvas; throttled to 1 decode per 1.5s for same code */
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
      // Throttle same code to prevent double-marking
      if (
        decoded === lastDecodedRef.current &&
        now - lastDecodeTimeRef.current < 2000
      ) {
        return;
      }
      lastDecodedRef.current = decoded;
      lastDecodeTimeRef.current = now;

      // QR data may be: just admission number, or JSON like {"admNo":"xxx"}
      let admNo = decoded;
      try {
        const parsed = JSON.parse(decoded) as Record<string, string>;
        admNo = parsed.admNo ?? parsed.admissionNo ?? parsed.id ?? decoded;
      } catch {
        // plain text admNo
      }
      const student = students.find(
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
    // Lazy-load jsQR from window global (CDN script tag)
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
      // If not available, scanning works in manual mode only
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Scanner Panel */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold text-foreground">
              QR Code Scanner
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
                  {cameraError || "Tap Start Camera to scan student QR codes"}
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
                {/* Corner brackets */}
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
                onKeyDown={(e) => e.key === "Enter" && handleManual()}
                data-ocid="qr-manual-input"
              />
              <Button onClick={handleManual} data-ocid="qr-manual-submit">
                Mark
              </Button>
            </div>
          </div>
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
                  Start the camera or enter an admission number above
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
          <span className="font-semibold">How it works:</span> Start the camera
          and point it at a student's admit card QR code — the ERP will decode
          the Admission No. and mark attendance instantly. Manual entry is
          always available as a fallback. Accessible to: Super Admin, Admin,
          Teacher, Driver.
        </p>
      </Card>
    </div>
  );
}
