/**
 * SHUBH SCHOOL ERP — AI Face Recognition Attendance
 *
 * Uses a simulated face descriptor (canvas pixel hash → 128-value vector)
 * so the same API surface can be upgraded to real face-api.js later.
 * All data (face descriptors, attendance, logs) stored in canister via useApp().
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Brain,
  Camera,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  List,
  ShieldOff,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { AttendanceRecord, Student } from "../../types";
import { generateId } from "../../utils/localStorage";

// ── Types ──────────────────────────────────────────────────────────────────────

interface FaceDescriptor {
  id: string;
  studentId: string;
  descriptor: number[]; // 128-value pixel hash vector
  enrolledAt: string;
}

interface FaceLog {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  timestamp: string;
  confidence: number; // 0–1
  method: "face";
}

interface WelcomeCard {
  student: Student;
  confidence: number;
  timeIn: string;
}

type FaceTab = "enrollment" | "live" | "log";

const ALLOWED_ROLES = new Set(["superadmin", "admin", "teacher"]);
const DETECTION_INTERVAL_MS = 2000;
const MATCH_THRESHOLD = 0.6;
const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

// ── Descriptor helpers ─────────────────────────────────────────────────────────

/**
 * Compute a 128-value pixel-hash "descriptor" from a canvas frame.
 * Divides the image into 128 sample points and reads brightness values.
 */
function computeDescriptor(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): number[] {
  const desc: number[] = new Array(128).fill(0);
  const stepX = width / 16;
  const stepY = height / 8;
  let idx = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 16; col++) {
      const x = Math.floor(col * stepX + stepX / 2);
      const y = Math.floor(row * stepY + stepY / 2);
      const px = ctx.getImageData(x, y, 1, 1).data;
      desc[idx++] = (px[0] * 0.299 + px[1] * 0.587 + px[2] * 0.114) / 255;
    }
  }
  return desc;
}

/** Euclidean distance between two 128-d descriptors */
function euclidean(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < 128; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/** Convert Euclidean distance to a 0–1 confidence score */
function distanceToConfidence(dist: number): number {
  return Math.max(0, 1 - dist / 3);
}

// ── Confidence badge ───────────────────────────────────────────────────────────

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  if (pct >= 85)
    return (
      <Badge className="bg-green-500/15 text-green-700 border-green-300">
        {pct}%
      </Badge>
    );
  if (pct >= 60)
    return (
      <Badge className="bg-yellow-500/15 text-yellow-700 border-yellow-300">
        {pct}%
      </Badge>
    );
  return (
    <Badge className="bg-destructive/15 text-destructive border-destructive/30">
      {pct}%
    </Badge>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface FaceAttendanceProps {
  date: string;
}

export default function FaceAttendance({ date }: FaceAttendanceProps) {
  const {
    getData,
    saveData,
    updateData,
    addNotification,
    currentSession,
    currentUser,
  } = useApp();
  const [activeTab, setActiveTab] = useState<FaceTab>("enrollment");

  // Enrollment
  const [enrollSearch, setEnrollSearch] = useState("");
  const [enrollingStudent, setEnrollingStudent] = useState<Student | null>(
    null,
  );
  const [enrollCameraOn, setEnrollCameraOn] = useState(false);
  const [enrollCameraError, setEnrollCameraError] = useState("");
  const enrollVideoRef = useRef<HTMLVideoElement>(null);
  const enrollCanvasRef = useRef<HTMLCanvasElement>(null);
  const enrollStreamRef = useRef<MediaStream | null>(null);

  // Live detection
  const [detectionOn, setDetectionOn] = useState(false);
  const [welcomeCard, setWelcomeCard] = useState<WelcomeCard | null>(null);
  const [noMatchMsg, setNoMatchMsg] = useState(false);
  const [recentCheckins, setRecentCheckins] = useState<FaceLog[]>([]);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const detectionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownMapRef = useRef<Map<string, number>>(new Map());
  const welcomeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noMatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Log tab
  const [logDateFilter, setLogDateFilter] = useState(date);
  const [logClassFilter, setLogClassFilter] = useState("");

  const canAccess = currentUser ? ALLOWED_ROLES.has(currentUser.role) : false;
  const canEnroll = currentUser
    ? currentUser.role === "superadmin" || currentUser.role === "admin"
    : false;

  const activeStudents = useMemo(
    () =>
      (getData("students") as Student[]).filter(
        (s) =>
          s.sessionId === (currentSession?.id ?? "") && s.status === "active",
      ),
    [getData, currentSession],
  );

  // Face descriptors from canister
  const enrollDescriptors = useMemo(
    () => getData("face_descriptors") as FaceDescriptor[],
    [getData],
  );

  // Face logs from canister
  const faceLogs = useMemo(() => getData("face_logs") as FaceLog[], [getData]);

  const enrolledIds = useMemo(
    () => new Set(enrollDescriptors.map((d) => d.studentId)),
    [enrollDescriptors],
  );

  const filteredStudents = useMemo(() => {
    const q = enrollSearch.toLowerCase();
    return activeStudents.filter(
      (s) =>
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.admNo.toLowerCase().includes(q) ||
        s.class.toLowerCase().includes(q),
    );
  }, [activeStudents, enrollSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopEnrollCamera();
      stopLiveCamera();
    };
  }, []);

  // ── Enrollment camera ──────────────────────────────────────────────────────

  async function startEnrollCamera() {
    setEnrollCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      enrollStreamRef.current = stream;
      if (enrollVideoRef.current) {
        enrollVideoRef.current.srcObject = stream;
        await enrollVideoRef.current.play();
      }
      setEnrollCameraOn(true);
    } catch {
      setEnrollCameraError(
        "Camera access denied. Please allow camera permissions.",
      );
    }
  }

  function stopEnrollCamera() {
    const tracks = enrollStreamRef.current?.getTracks() ?? [];
    for (const t of tracks) t.stop();
    enrollStreamRef.current = null;
    setEnrollCameraOn(false);
  }

  async function captureAndEnroll() {
    if (
      !enrollingStudent ||
      !enrollVideoRef.current ||
      !enrollCanvasRef.current
    )
      return;
    const video = enrollVideoRef.current;
    const canvas = enrollCanvasRef.current;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const descriptor = computeDescriptor(ctx, canvas.width, canvas.height);

    try {
      // Check if descriptor already exists for this student — update or create
      const existing = enrollDescriptors.find(
        (d) => d.studentId === enrollingStudent.id,
      );
      const descriptorRecord: FaceDescriptor = {
        id: existing?.id ?? generateId(),
        studentId: enrollingStudent.id,
        descriptor,
        enrolledAt: new Date().toISOString(),
      };

      if (existing?.id) {
        await updateData(
          "face_descriptors",
          existing.id,
          descriptorRecord as unknown as Record<string, unknown>,
        );
      } else {
        await saveData(
          "face_descriptors",
          descriptorRecord as unknown as Record<string, unknown>,
        );
      }

      toast.success(
        `✅ ${enrollingStudent.fullName} enrolled for face recognition`,
      );
      addNotification(
        `🎭 Face enrolled: ${enrollingStudent.fullName}`,
        "success",
        "🎭",
      );
      stopEnrollCamera();
      setEnrollingStudent(null);
    } catch {
      toast.error("Failed to save face descriptor. Try again.");
    }
  }

  // ── Live detection camera ──────────────────────────────────────────────────

  async function startLiveCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      liveStreamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        await liveVideoRef.current.play();
      }
      setDetectionOn(true);
    } catch {
      toast.error("Camera access denied. Please allow camera permissions.");
    }
  }

  function stopLiveCamera() {
    if (detectionTimerRef.current) clearInterval(detectionTimerRef.current);
    detectionTimerRef.current = null;
    const tracks = liveStreamRef.current?.getTracks() ?? [];
    for (const t of tracks) t.stop();
    liveStreamRef.current = null;
    setDetectionOn(false);
    setWelcomeCard(null);
    setNoMatchMsg(false);
  }

  const runDetectionFrame = useCallback(() => {
    const video = liveVideoRef.current;
    const canvas = liveCanvasRef.current;
    if (!video || !canvas || !detectionOn) return;
    if (video.readyState < 2) return;

    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frameDescriptor = computeDescriptor(ctx, canvas.width, canvas.height);

    // Match against enrolled descriptors from canister
    let bestMatch: { descriptor: FaceDescriptor; confidence: number } | null =
      null;
    for (const enrolled of enrollDescriptors) {
      const dist = euclidean(frameDescriptor, enrolled.descriptor);
      const confidence = distanceToConfidence(dist);
      if (confidence > MATCH_THRESHOLD) {
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { descriptor: enrolled, confidence };
        }
      }
    }

    if (bestMatch) {
      const { descriptor: match, confidence } = bestMatch;
      const now = Date.now();
      const lastSeen = cooldownMapRef.current.get(match.studentId) ?? 0;
      if (now - lastSeen < COOLDOWN_MS) return;

      cooldownMapRef.current.set(match.studentId, now);
      const student = activeStudents.find((s) => s.id === match.studentId);
      if (!student) return;

      const timeIn = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      setWelcomeCard({ student, confidence, timeIn });
      setNoMatchMsg(false);
      if (welcomeTimerRef.current) clearTimeout(welcomeTimerRef.current);
      welcomeTimerRef.current = setTimeout(() => setWelcomeCard(null), 5000);

      const faceLog: FaceLog = {
        id: generateId(),
        studentId: student.id,
        studentName: student.fullName,
        class: student.class,
        section: student.section,
        timestamp: new Date().toISOString(),
        confidence,
        method: "face",
      };

      setRecentCheckins((prev) => [faceLog, ...prev].slice(0, 5));

      // Save attendance record to canister
      const attRec: AttendanceRecord = {
        id: generateId(),
        studentId: student.id,
        date,
        status: "Present",
        timeIn,
        markedBy: "AI Face Recognition",
        type: "student",
        method: "face",
        class: student.class,
        section: student.section,
        sessionId: currentSession?.id,
      };

      saveData(
        "attendance",
        attRec as unknown as Record<string, unknown>,
      ).catch(() => {});
      saveData(
        "face_logs",
        faceLog as unknown as Record<string, unknown>,
      ).catch(() => {});
      addNotification(
        `🎭 Face: ${student.fullName} marked Present`,
        "success",
        "🎭",
      );
    } else if (enrollDescriptors.length > 0) {
      setNoMatchMsg(true);
      if (noMatchTimerRef.current) clearTimeout(noMatchTimerRef.current);
      noMatchTimerRef.current = setTimeout(() => setNoMatchMsg(false), 3000);
    }
  }, [
    enrollDescriptors,
    activeStudents,
    date,
    currentSession,
    saveData,
    addNotification,
    detectionOn,
  ]);

  // Start/stop detection loop when detectionOn changes
  useEffect(() => {
    if (detectionOn) {
      if (detectionTimerRef.current) clearInterval(detectionTimerRef.current);
      detectionTimerRef.current = setInterval(() => {
        runDetectionFrame();
      }, DETECTION_INTERVAL_MS);
    } else {
      if (detectionTimerRef.current) clearInterval(detectionTimerRef.current);
    }
    return () => {
      if (detectionTimerRef.current) clearInterval(detectionTimerRef.current);
    };
  }, [runDetectionFrame, detectionOn]);

  // ── Log helpers ───────────────────────────────────────────────────────────

  const filteredLogs = useMemo(() => {
    return faceLogs.filter((log) => {
      const logDate = log.timestamp.split("T")[0];
      const matchDate = !logDateFilter || logDate === logDateFilter;
      const matchClass = !logClassFilter || log.class === logClassFilter;
      return matchDate && matchClass;
    });
  }, [faceLogs, logDateFilter, logClassFilter]);

  function exportLogCSV() {
    const rows = [
      ["Student", "Class", "Section", "Time", "Confidence", "Method"],
    ];
    for (const log of filteredLogs) {
      rows.push([
        log.studentName,
        log.class,
        log.section,
        new Date(log.timestamp).toLocaleTimeString("en-IN"),
        `${Math.round(log.confidence * 100)}%`,
        log.method,
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    a.download = `face_log_${logDateFilter}.csv`;
    a.click();
  }

  const uniqueClasses = useMemo(
    () => [...new Set(activeStudents.map((s) => s.class))].sort(),
    [activeStudents],
  );

  // ── Access gate ───────────────────────────────────────────────────────────

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
            Face Recognition Attendance is available to Super Admin, Admin, and
            Teacher roles only.
          </p>
        </div>
      </Card>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Demo mode banner */}
      <Card className="p-3 bg-yellow-500/10 border-yellow-400/30 flex items-center gap-3">
        <Brain className="w-5 h-5 text-yellow-600 flex-shrink-0" />
        <p className="text-sm text-yellow-800 dark:text-yellow-300">
          <span className="font-semibold">AI Face Detection (Demo Mode)</span> —
          Uses pixel-hash descriptors for face matching. All data stored in the
          canister — works across all devices automatically.
        </p>
      </Card>

      {/* Sub-tabs */}
      <div
        className="flex gap-1 p-1 bg-muted/40 rounded-lg w-fit"
        role="tablist"
      >
        {[
          { id: "enrollment" as FaceTab, label: "Enrollment", icon: UserCheck },
          { id: "live" as FaceTab, label: "Live Detection", icon: Camera },
          { id: "log" as FaceTab, label: "Face Log", icon: List },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            data-ocid={`face.${id}.tab`}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── ENROLLMENT TAB ─────────────────────────────────────────────────── */}
      {activeTab === "enrollment" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <Input
                placeholder="Search student by name or adm no..."
                value={enrollSearch}
                onChange={(e) => setEnrollSearch(e.target.value)}
                data-ocid="face.enroll-search.input"
              />
            </div>
            <Badge variant="secondary" className="flex-shrink-0">
              <UserCheck className="w-3.5 h-3.5 mr-1" />
              {enrolledIds.size} / {activeStudents.length} enrolled
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredStudents.slice(0, 60).map((student, idx) => {
              const enrolled = enrolledIds.has(student.id);
              return (
                <Card
                  key={student.id}
                  className="p-3 flex items-center gap-3"
                  data-ocid={`face.enroll-student.item.${idx + 1}`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-sm overflow-hidden">
                    {student.photo ? (
                      <img
                        src={student.photo}
                        alt={student.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      student.fullName.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {student.fullName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {student.admNo} · Class {student.class}-{student.section}
                    </p>
                  </div>
                  {enrolled ? (
                    <Badge className="bg-green-500/15 text-green-700 border-green-300 flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Enrolled
                    </Badge>
                  ) : canEnroll ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEnrollingStudent(student);
                        setEnrollCameraError("");
                        setTimeout(() => void startEnrollCamera(), 100);
                      }}
                      data-ocid={`face.enroll-button.${idx + 1}`}
                    >
                      <Camera className="w-3.5 h-3.5 mr-1" /> Enroll
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="flex-shrink-0">
                      Not enrolled
                    </Badge>
                  )}
                </Card>
              );
            })}
            {filteredStudents.length === 0 && (
              <div
                className="col-span-full py-10 text-center text-muted-foreground"
                data-ocid="face.enroll.empty_state"
              >
                <UserX className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No students found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ENROLL CAMERA DIALOG ──────────────────────────────────────────── */}
      {enrollingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Card
            className="w-full max-w-md p-5 space-y-4 shadow-2xl"
            data-ocid="face.enroll.dialog"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-foreground">
                  Enroll Face — {enrollingStudent.fullName}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Position the student's face in the frame and capture
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  stopEnrollCamera();
                  setEnrollingStudent(null);
                }}
                data-ocid="face.enroll.close_button"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="relative bg-foreground/5 rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-border">
              <video
                ref={enrollVideoRef}
                className={`w-full h-full object-cover ${enrollCameraOn ? "block" : "hidden"}`}
                playsInline
                muted
              />
              <canvas ref={enrollCanvasRef} className="hidden" />
              {!enrollCameraOn && (
                <div className="flex flex-col items-center gap-2 text-center p-6">
                  <Camera className="w-10 h-10 text-muted-foreground opacity-40" />
                  <p className="text-sm text-muted-foreground">
                    {enrollCameraError || "Starting camera..."}
                  </p>
                </div>
              )}
              {enrollCameraOn && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-40 h-40 rounded-full border-2 border-primary border-dashed opacity-70" />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {enrollCameraOn ? (
                <Button
                  className="flex-1"
                  onClick={() => void captureAndEnroll()}
                  data-ocid="face.enroll.confirm_button"
                >
                  <Eye className="w-4 h-4 mr-2" /> Capture & Enroll
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  onClick={() => void startEnrollCamera()}
                  data-ocid="face.enroll.start_camera.button"
                >
                  <Camera className="w-4 h-4 mr-2" /> Start Camera
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  stopEnrollCamera();
                  setEnrollingStudent(null);
                }}
                data-ocid="face.enroll.cancel_button"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── LIVE DETECTION TAB ───────────────────────────────────────────── */}
      {activeTab === "live" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Camera panel */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                <h3 className="font-display font-semibold text-foreground">
                  Live Face Detection
                </h3>
                <Badge
                  variant={detectionOn ? "default" : "secondary"}
                  className="ml-auto"
                >
                  {detectionOn ? "🔴 Detecting" : "Stopped"}
                </Badge>
              </div>

              <div className="relative bg-foreground/5 rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-border">
                <video
                  ref={liveVideoRef}
                  className={`w-full h-full object-cover ${detectionOn ? "block" : "hidden"}`}
                  playsInline
                  muted
                />
                <canvas ref={liveCanvasRef} className="hidden" />

                {!detectionOn && (
                  <div className="flex flex-col items-center gap-3 p-6 text-center">
                    <Brain className="w-12 h-12 text-muted-foreground opacity-30" />
                    <p className="text-muted-foreground text-sm">
                      Start detection to auto-mark students as they enter
                    </p>
                    {enrollDescriptors.length === 0 && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">
                        ⚠ No enrolled faces yet — go to Enrollment tab first
                      </p>
                    )}
                  </div>
                )}

                {/* Scanning overlay */}
                {detectionOn && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute bottom-0 left-0 right-0 h-1">
                      <div className="h-full bg-primary/50 animate-[scan_2s_ease-in-out_infinite]" />
                    </div>
                    <div className="absolute bottom-3 left-0 right-0 text-center">
                      <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">
                        AI Face Detection Active • Every 2s
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {!detectionOn ? (
                  <Button
                    className="flex-1"
                    onClick={() => void startLiveCamera()}
                    disabled={enrollDescriptors.length === 0}
                    data-ocid="face.live.start_button"
                  >
                    <Camera className="w-4 h-4 mr-2" /> Start Detection
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={stopLiveCamera}
                    data-ocid="face.live.stop_button"
                  >
                    <X className="w-4 h-4 mr-2" /> Stop Detection
                  </Button>
                )}
              </div>
            </Card>

            {/* Welcome card */}
            {welcomeCard && (
              <Card className="p-5 border-green-400/40 bg-green-500/5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 overflow-hidden flex-shrink-0 flex items-center justify-center text-2xl font-bold text-primary border-2 border-green-400">
                    {welcomeCard.student.photo ? (
                      <img
                        src={welcomeCard.student.photo}
                        alt={welcomeCard.student.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      welcomeCard.student.fullName.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-xl text-foreground truncate">
                      {welcomeCard.student.fullName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Class {welcomeCard.student.class}-
                      {welcomeCard.student.section}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge className="bg-green-500/20 text-green-700 border-green-400">
                        ✓ PRESENT
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {welcomeCard.timeIn}
                      </span>
                      <ConfidenceBadge value={welcomeCard.confidence} />
                    </div>
                  </div>
                  <div className="text-4xl flex-shrink-0">🎉</div>
                </div>
              </Card>
            )}

            {/* No match message */}
            {noMatchMsg && !welcomeCard && (
              <Card className="p-4 border-orange-400/30 bg-orange-500/5 flex items-center gap-3 animate-in fade-in duration-200">
                <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Face not recognized
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Try QR scan or manual entry as fallback
                  </p>
                </div>
              </Card>
            )}
          </div>

          {/* Recent check-ins panel */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              <h3 className="font-display font-semibold text-foreground">
                Last Check-ins
              </h3>
              <Badge variant="secondary" className="ml-auto">
                {recentCheckins.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {recentCheckins.length === 0 ? (
                <div
                  className="py-8 text-center text-muted-foreground"
                  data-ocid="face.live.empty_state"
                >
                  <Brain className="w-7 h-7 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No face detections yet</p>
                </div>
              ) : (
                recentCheckins.map((log, i) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40"
                    data-ocid={`face.checkin.item.${i + 1}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 text-accent font-bold text-xs">
                      {log.studentName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {log.studentName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Class {log.class}-{log.section}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <ConfidenceBadge value={log.confidence} />
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(log.timestamp).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── FACE LOG TAB ───────────────────────────────────────────────────── */}
      {activeTab === "log" && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap items-center">
            <Input
              type="date"
              value={logDateFilter}
              onChange={(e) => setLogDateFilter(e.target.value)}
              className="w-40"
              data-ocid="face.log-date.input"
            />
            <select
              value={logClassFilter}
              onChange={(e) => setLogClassFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              data-ocid="face.log-class.select"
            >
              <option value="">All Classes</option>
              {uniqueClasses.map((cls) => (
                <option key={cls} value={cls}>
                  Class {cls}
                </option>
              ))}
            </select>
            <Badge variant="secondary" className="flex-shrink-0">
              {filteredLogs.length} records
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={exportLogCSV}
              className="ml-auto"
              data-ocid="face.log-export.button"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </Button>
          </div>

          <Card className="overflow-hidden">
            {filteredLogs.length === 0 ? (
              <div
                className="py-12 text-center text-muted-foreground"
                data-ocid="face.log.empty_state"
              >
                <List className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  No face attendance records for selected filters
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        #
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        Student
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        Class
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        Time
                      </th>
                      <th className="text-right p-3 font-medium text-muted-foreground">
                        Confidence
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        Method
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredLogs.map((log, idx) => (
                      <tr
                        key={log.id}
                        className="hover:bg-muted/30 transition-colors"
                        data-ocid={`face.log.item.${idx + 1}`}
                      >
                        <td className="p-3 text-muted-foreground">{idx + 1}</td>
                        <td className="p-3 font-medium text-foreground">
                          {log.studentName}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {log.class}-{log.section}
                        </td>
                        <td className="p-3 text-muted-foreground font-mono text-xs">
                          {new Date(log.timestamp).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="p-3 text-right">
                          <ConfidenceBadge value={log.confidence} />
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary">
                            <Brain className="w-3 h-3 mr-1" /> Face AI
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
