import { Cpu, Download, Monitor, Search, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { addERPNotification } from "../components/layout/Header";

type AttStatus = "Present" | "Absent" | "Late";

interface StudentRow {
  id: number;
  name: string;
  admNo: string;
  className: string;
  section: string;
  rollNo: string;
}

interface StaffRow {
  id: number;
  name: string;
  designation: string;
  status: string;
}

interface BiometricEntry {
  id: string;
  personId: string;
  name: string;
  type: "Student" | "Staff";
  className?: string;
  section?: string;
  designation?: string;
  fatherName?: string;
  photo?: string;
  date: string;
  inTime: string;
  outTime: string;
  deviceType: "RFID" | "ESSL Biometric" | "Manual";
}

interface LastCheckin {
  personId: string;
  name: string;
  type: "Student" | "Staff";
  className?: string;
  section?: string;
  designation?: string;
  fatherName?: string;
  photo?: string;
  inTime: string;
  date: string;
}

function calcDuration(inT: string, outT: string): string {
  const [ih, im] = inT.split(":").map(Number);
  const [oh, om] = outT.split(":").map(Number);
  const mins = oh * 60 + om - (ih * 60 + im);
  if (mins < 0) return "-";
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function loadBioLog(): BiometricEntry[] {
  try {
    return JSON.parse(localStorage.getItem("erp_biometric_log") || "[]");
  } catch {
    return [];
  }
}

function saveBioLog(log: BiometricEntry[]) {
  localStorage.setItem("erp_biometric_log", JSON.stringify(log));
}

function broadcastCheckin(entry: LastCheckin) {
  localStorage.setItem("erp_last_checkin", JSON.stringify(entry));
  window.dispatchEvent(new CustomEvent("erp_last_checkin_updated"));
}

// ─── Welcome Display Tab ───────────────────────────────────────────────────────────────
function WelcomeDisplayTab() {
  const [clock, setClock] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [checkin, setCheckin] = useState<LastCheckin | null>(null);
  const [visible, setVisible] = useState(false);
  const [recentCheckins, setRecentCheckins] = useState<LastCheckin[]>([]);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schoolName = (() => {
    try {
      return (
        JSON.parse(localStorage.getItem("erp_settings") || "{}").schoolName ||
        "SHUBH SCHOOL ERP"
      );
    } catch {
      return "SHUBH SCHOOL ERP";
    }
  })();

  // Live clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      setClock(`${h}:${m}:${s}`);
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      setDateStr(
        `${days[now.getDay()]}, ${String(now.getDate()).padStart(2, "0")} ${months[now.getMonth()]} ${now.getFullYear()}`,
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleNewCheckin = useCallback((entry: LastCheckin) => {
    setCheckin(entry);
    setVisible(true);
    setRecentCheckins((prev) => {
      const updated = [
        entry,
        ...prev.filter(
          (c) => c.personId !== entry.personId || c.inTime !== entry.inTime,
        ),
      ];
      return updated.slice(0, 5);
    });
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setVisible(false), 6000);
  }, []);

  // Listen for checkin events
  useEffect(() => {
    const handler = () => {
      try {
        const data: LastCheckin = JSON.parse(
          localStorage.getItem("erp_last_checkin") || "null",
        );
        if (data) handleNewCheckin(data);
      } catch {
        // ignore
      }
    };
    window.addEventListener("erp_last_checkin_updated", handler);
    // Poll fallback: track last seen to avoid duplicates
    let lastSeenKey = "";
    const pollId = setInterval(() => {
      try {
        const raw = localStorage.getItem("erp_last_checkin");
        if (!raw || raw === lastSeenKey) return;
        const data: LastCheckin = JSON.parse(raw);
        if (data) {
          const key = `${data.personId}_${data.inTime}`;
          if (key !== lastSeenKey) {
            lastSeenKey = key;
            handleNewCheckin(data);
          }
        }
      } catch {
        // ignore
      }
    }, 2000);
    return () => {
      window.removeEventListener("erp_last_checkin_updated", handler);
      clearInterval(pollId);
    };
  }, [handleNewCheckin]);

  function getInitials(name: string): string {
    return name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }

  const GRADIENT_COLORS = [
    "from-blue-900 to-indigo-900",
    "from-emerald-900 to-teal-900",
    "from-purple-900 to-violet-900",
    "from-rose-900 to-pink-900",
    "from-amber-900 to-orange-900",
  ];

  function getColorForName(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return GRADIENT_COLORS[hash % GRADIENT_COLORS.length];
  }

  return (
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{
        minHeight: 520,
        background:
          "linear-gradient(135deg, #0a0f1e 0%, #0d1635 40%, #0a1628 100%)",
        border: "1px solid rgba(99,102,241,0.2)",
      }}
      data-ocid="attendance.display.panel"
    >
      {/* Decorative grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col" style={{ minHeight: 520 }}>
        {/* Idle state */}
        <div
          className="transition-all duration-500"
          style={{
            opacity: visible ? 0 : 1,
            pointerEvents: visible ? "none" : "auto",
          }}
        >
          <div
            className="flex flex-col items-center justify-center"
            style={{ minHeight: 440, paddingTop: 24 }}
          >
            {/* School crest */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{
                background: "linear-gradient(135deg, #16a34a, #065f46)",
                boxShadow:
                  "0 0 40px rgba(22,163,74,0.4), 0 0 80px rgba(22,163,74,0.15)",
              }}
            >
              <span className="text-white text-3xl font-black">
                {schoolName[0] || "S"}
              </span>
            </div>

            <h1
              className="text-white text-center font-black mb-1"
              style={{
                fontSize: 28,
                letterSpacing: 3,
                textShadow: "0 0 30px rgba(99,102,241,0.5)",
              }}
            >
              {schoolName.toUpperCase()}
            </h1>

            {/* Clock */}
            <div
              className="font-mono font-bold my-4"
              style={{
                fontSize: 72,
                color: "#a5f3fc",
                textShadow:
                  "0 0 20px rgba(165,243,252,0.5), 0 0 40px rgba(165,243,252,0.2)",
                letterSpacing: 4,
              }}
            >
              {clock}
            </div>

            <div
              className="text-center"
              style={{ fontSize: 20, color: "#94a3b8", letterSpacing: 2 }}
            >
              {dateStr}
            </div>

            {/* Scan prompt */}
            <div className="mt-8 flex flex-col items-center gap-2">
              <div
                className="px-8 py-4 rounded-2xl text-center"
                style={{
                  background: "rgba(22,163,74,0.1)",
                  border: "2px solid rgba(22,163,74,0.4)",
                  animation: "pulse 2s ease-in-out infinite",
                }}
              >
                <p
                  style={{
                    fontSize: 18,
                    color: "#4ade80",
                    fontWeight: 700,
                    letterSpacing: 2,
                  }}
                >
                  🏫 SCAN YOUR CARD TO CHECK IN
                </p>
              </div>
              <p className="text-gray-500 text-xs mt-2">
                RFID • QR Code • Biometric
              </p>
            </div>
          </div>
        </div>

        {/* Active check-in card (overlaid) */}
        {checkin && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible
                ? "translateY(0) scale(1)"
                : "translateY(20px) scale(0.98)",
              transition: "opacity 0.5s ease, transform 0.5s ease",
              pointerEvents: visible ? "auto" : "none",
              padding: "24px 24px 80px",
            }}
          >
            <div
              className={`w-full max-w-2xl rounded-3xl overflow-hidden bg-gradient-to-br ${getColorForName(checkin.name)}`}
              style={{
                boxShadow:
                  "0 25px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1)",
              }}
            >
              {/* Welcome banner */}
              <div
                className="text-center py-4"
                style={{
                  background:
                    "linear-gradient(90deg, #16a34a, #15803d, #16a34a)",
                }}
              >
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: "#fff",
                    letterSpacing: 3,
                  }}
                >
                  🎉 WELCOME TO SCHOOL!
                </p>
              </div>

              <div className="flex gap-6 p-8">
                {/* Photo / Avatar */}
                <div className="flex-shrink-0">
                  {checkin.photo ? (
                    <img
                      src={checkin.photo}
                      alt={checkin.name}
                      className="rounded-2xl object-cover"
                      style={{
                        width: 140,
                        height: 160,
                        border: "4px solid rgba(255,255,255,0.2)",
                      }}
                    />
                  ) : (
                    <div
                      className="rounded-2xl flex items-center justify-center"
                      style={{
                        width: 140,
                        height: 160,
                        background: "rgba(255,255,255,0.1)",
                        border: "4px solid rgba(255,255,255,0.2)",
                        fontSize: 60,
                        fontWeight: 900,
                        color: "rgba(255,255,255,0.9)",
                      }}
                    >
                      {getInitials(checkin.name)}
                    </div>
                  )}
                  {/* Type badge */}
                  <div
                    className="mt-3 text-center rounded-lg py-1"
                    style={{
                      background:
                        checkin.type === "Student"
                          ? "rgba(59,130,246,0.4)"
                          : "rgba(168,85,247,0.4)",
                      border:
                        checkin.type === "Student"
                          ? "1px solid rgba(59,130,246,0.6)"
                          : "1px solid rgba(168,85,247,0.6)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color:
                          checkin.type === "Student" ? "#93c5fd" : "#d8b4fe",
                        letterSpacing: 2,
                      }}
                    >
                      {checkin.type === "Student" ? "📚 STUDENT" : "👨‍🏫 STAFF"}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <p
                      style={{
                        fontSize: 44,
                        fontWeight: 900,
                        color: "#fff",
                        lineHeight: 1.1,
                        textShadow: "0 2px 10px rgba(0,0,0,0.5)",
                        textTransform: "uppercase",
                      }}
                    >
                      {checkin.name}
                    </p>

                    {checkin.type === "Student" && checkin.fatherName && (
                      <p
                        style={{
                          fontSize: 16,
                          color: "rgba(255,255,255,0.7)",
                          marginTop: 8,
                        }}
                      >
                        S/O:{" "}
                        <span style={{ color: "#fde68a", fontWeight: 700 }}>
                          {checkin.fatherName}
                        </span>
                      </p>
                    )}

                    {checkin.type === "Student" && (
                      <p
                        style={{
                          fontSize: 15,
                          color: "rgba(255,255,255,0.6)",
                          marginTop: 4,
                        }}
                      >
                        Class:{" "}
                        <span style={{ color: "#a5f3fc", fontWeight: 700 }}>
                          {checkin.className}
                          {checkin.section ? ` - ${checkin.section}` : ""}
                        </span>
                      </p>
                    )}

                    {checkin.type === "Staff" && checkin.designation && (
                      <p
                        style={{
                          fontSize: 18,
                          color: "#fde68a",
                          fontWeight: 700,
                          marginTop: 8,
                        }}
                      >
                        {checkin.designation}
                      </p>
                    )}

                    {checkin.type === "Staff" && (
                      <p
                        style={{
                          fontSize: 13,
                          color: "rgba(255,255,255,0.5)",
                          marginTop: 4,
                        }}
                      >
                        Department: Staff
                      </p>
                    )}

                    <p
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.35)",
                        marginTop: 6,
                        letterSpacing: 1,
                      }}
                    >
                      ID: {checkin.personId}
                    </p>
                  </div>

                  {/* Entry time */}
                  <div
                    className="rounded-2xl px-5 py-4 mt-4"
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.4)",
                        letterSpacing: 2,
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      Entry Time
                    </p>
                    <p
                      style={{
                        fontSize: 36,
                        fontWeight: 900,
                        color: "#4ade80",
                        fontFamily: "monospace",
                        letterSpacing: 2,
                        textShadow: "0 0 15px rgba(74,222,128,0.5)",
                      }}
                    >
                      {checkin.inTime}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.3)",
                        marginTop: 2,
                      }}
                    >
                      {checkin.date}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent checkins ticker */}
        {recentCheckins.length > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 px-4 pb-4"
            style={{ opacity: visible ? 0.6 : 1, transition: "opacity 0.3s" }}
          >
            <p className="text-[10px] text-gray-600 mb-2 uppercase tracking-widest">
              Recent Check-ins
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {recentCheckins.map((c, i) => (
                <div
                  key={`${c.personId}-${i}`}
                  className="flex-shrink-0 flex items-center gap-2 rounded-xl px-3 py-2"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    minWidth: 150,
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "rgba(99,102,241,0.3)",
                      fontSize: 10,
                      fontWeight: 800,
                      color: "#c7d2fe",
                    }}
                  >
                    {c.name
                      .split(" ")
                      .slice(0, 2)
                      .map((w: string) => w[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div>
                    <p
                      className="text-white text-[10px] font-medium leading-none truncate"
                      style={{ maxWidth: 90 }}
                    >
                      {c.name}
                    </p>
                    <p className="text-gray-500 text-[9px] mt-0.5">
                      {c.inTime}
                    </p>
                  </div>
                  <span
                    className="ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      background:
                        c.type === "Student"
                          ? "rgba(59,130,246,0.2)"
                          : "rgba(168,85,247,0.2)",
                      color: c.type === "Student" ? "#93c5fd" : "#d8b4fe",
                    }}
                  >
                    {c.type === "Student" ? "STU" : "STF"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(0.99); }
        }
      `}</style>
    </div>
  );
}

// ─── RFID/Biometric Tab ────────────────────────────────────────────────────────────────
function RFIDTab() {
  const [log, setLog] = useState<BiometricEntry[]>(loadBioLog);
  const [filterDate, setFilterDate] = useState(todayDate());
  const [filterType, setFilterType] = useState<"All" | "Student" | "Staff">(
    "All",
  );
  const [filterClass, setFilterClass] = useState("");
  const [filterDevice, setFilterDevice] = useState<
    "All" | "RFID" | "ESSL Biometric" | "Manual"
  >("All");
  const [showManual, setShowManual] = useState(false);

  // Manual entry form state
  const [manualPersonType, setManualPersonType] = useState<"Student" | "Staff">(
    "Student",
  );
  const [manualSearch, setManualSearch] = useState("");
  const [manualDate, setManualDate] = useState(todayDate());
  const [manualInTime, setManualInTime] = useState("");
  const [manualOutTime, setManualOutTime] = useState("");
  const [manualDevice, setManualDevice] = useState<
    "RFID" | "ESSL Biometric" | "Manual"
  >("Manual");
  const [manualSearchResults, setManualSearchResults] = useState<
    Array<{
      id: string;
      name: string;
      className?: string;
      designation?: string;
      fatherName?: string;
      section?: string;
      photo?: string;
    }>
  >([]);
  const [selectedPerson, setSelectedPerson] = useState<{
    id: string;
    name: string;
    className?: string;
    designation?: string;
    fatherName?: string;
    section?: string;
    photo?: string;
  } | null>(null);

  const allStudents: StudentRow[] = useMemo(() => {
    try {
      const data = JSON.parse(localStorage.getItem("erp_students") || "[]");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }, []);

  const allStudentsFull = useMemo(() => {
    try {
      const data = JSON.parse(localStorage.getItem("erp_students") || "[]");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }, []);

  const allStaff: StaffRow[] = useMemo(() => {
    try {
      const data = JSON.parse(localStorage.getItem("erp_staff") || "[]");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }, []);

  const classOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: string[] = [];
    for (const s of allStudents) {
      const cls = s.className || "";
      if (cls && !seen.has(cls)) {
        seen.add(cls);
        opts.push(cls);
      }
    }
    return opts.sort();
  }, [allStudents]);

  // Search persons for manual entry
  useEffect(() => {
    if (!manualSearch.trim()) {
      setManualSearchResults([]);
      return;
    }
    const q = manualSearch.toLowerCase();
    if (manualPersonType === "Student") {
      setManualSearchResults(
        allStudentsFull
          .filter(
            (s: any) =>
              s.name.toLowerCase().includes(q) ||
              s.admNo.toLowerCase().includes(q),
          )
          .slice(0, 8)
          .map((s: any) => ({
            id: s.admNo,
            name: s.name,
            className: s.className,
            section: s.section,
            fatherName: s.fatherName,
            photo: s.photo,
          })),
      );
    } else {
      setManualSearchResults(
        allStaff
          .filter((s) => s.name.toLowerCase().includes(q))
          .slice(0, 8)
          .map((s) => ({
            id: String(s.id),
            name: s.name,
            designation: s.designation,
          })),
      );
    }
  }, [manualSearch, manualPersonType, allStudentsFull, allStaff]);

  const filteredLog = useMemo(() => {
    return log.filter((e) => {
      if (e.date !== filterDate) return false;
      if (filterType !== "All" && e.type !== filterType) return false;
      if (filterClass && e.type === "Student" && e.className !== filterClass)
        return false;
      if (filterDevice !== "All" && e.deviceType !== filterDevice) return false;
      return true;
    });
  }, [log, filterDate, filterType, filterClass, filterDevice]);

  // Today summary
  const todayEntries = log.filter((e) => e.date === todayDate());
  const todayStudents = todayEntries.filter((e) => e.type === "Student").length;
  const todayStaff = todayEntries.filter((e) => e.type === "Staff").length;
  const totalPersons = allStudents.length + allStaff.length;
  const todayPresent = todayEntries.length;
  const todayAbsent = Math.max(0, totalPersons - todayPresent);

  const simulateScan = () => {
    const allPersons: Array<{
      id: string;
      name: string;
      type: "Student" | "Staff";
      className?: string;
      section?: string;
      designation?: string;
      fatherName?: string;
      photo?: string;
    }> = [
      ...allStudentsFull.map((s: any) => ({
        id: s.admNo,
        name: s.name,
        type: "Student" as const,
        className: s.className,
        section: s.section,
        fatherName: s.fatherName,
        photo: s.photo,
      })),
      ...allStaff.map((s) => ({
        id: String(s.id),
        name: s.name,
        type: "Staff" as const,
        designation: s.designation,
      })),
    ];
    if (allPersons.length === 0) {
      toast.error("No students or staff found. Add some data first.");
      return;
    }
    const person = allPersons[Math.floor(Math.random() * allPersons.length)];
    const today = todayDate();
    const currentLog = loadBioLog();
    const existingEntry = currentLog.find(
      (e) => e.personId === person.id && e.date === today,
    );
    let updatedLog: BiometricEntry[];
    let action: string;
    if (!existingEntry) {
      const inT = nowTime();
      const newEntry: BiometricEntry = {
        id: `${person.id}_${today}_${Date.now()}`,
        personId: person.id,
        name: person.name,
        type: person.type,
        className: person.className,
        section: person.section,
        designation: person.designation,
        fatherName: person.fatherName,
        photo: person.photo,
        date: today,
        inTime: inT,
        outTime: "",
        deviceType: "RFID",
      };
      updatedLog = [...currentLog, newEntry];
      action = "IN";

      // Broadcast to Welcome Display
      broadcastCheckin({
        personId: person.id,
        name: person.name,
        type: person.type,
        className: person.className,
        section: person.section,
        designation: person.designation,
        fatherName: person.fatherName,
        photo: person.photo,
        inTime: inT,
        date: today,
      });

      // ERP Notification
      addERPNotification({
        type: "checkin",
        icon: "📍",
        title: `${person.name} Checked In`,
        message: `${person.type === "Student" ? `Class ${person.className}` : person.designation || "Staff"} • ${inT}`,
      });
    } else if (!existingEntry.outTime) {
      updatedLog = currentLog.map((e) =>
        e.id === existingEntry.id ? { ...e, outTime: nowTime() } : e,
      );
      action = "OUT";
    } else {
      toast.info(`${person.name} already has full attendance today.`);
      return;
    }
    saveBioLog(updatedLog);
    setLog(updatedLog);
    toast.success(`✓ ${person.name} punched ${action} at ${nowTime()}`, {
      duration: 3000,
    });
  };

  const handleManualSave = () => {
    if (!selectedPerson) {
      toast.error("Please select a person first");
      return;
    }
    if (!manualInTime) {
      toast.error("In-Time is required");
      return;
    }
    const currentLog = loadBioLog();
    const newEntry: BiometricEntry = {
      id: `${selectedPerson.id}_${manualDate}_${Date.now()}`,
      personId: selectedPerson.id,
      name: selectedPerson.name,
      type: manualPersonType,
      className: selectedPerson.className,
      section: selectedPerson.section,
      designation: selectedPerson.designation,
      fatherName: selectedPerson.fatherName,
      photo: selectedPerson.photo,
      date: manualDate,
      inTime: manualInTime,
      outTime: manualOutTime,
      deviceType: manualDevice,
    };
    const updatedLog = [...currentLog, newEntry];
    saveBioLog(updatedLog);
    setLog(updatedLog);

    // Broadcast to Welcome Display
    broadcastCheckin({
      personId: selectedPerson.id,
      name: selectedPerson.name,
      type: manualPersonType,
      className: selectedPerson.className,
      section: selectedPerson.section,
      designation: selectedPerson.designation,
      fatherName: selectedPerson.fatherName,
      photo: selectedPerson.photo,
      inTime: manualInTime,
      date: manualDate,
    });

    // ERP Notification
    addERPNotification({
      type: "checkin",
      icon: "📍",
      title: `${selectedPerson.name} Checked In`,
      message: `${manualPersonType === "Student" ? `Class ${selectedPerson.className}` : selectedPerson.designation || "Staff"} • ${manualInTime} (Manual)`,
    });

    toast.success("Attendance entry saved!");
    setManualSearch("");
    setSelectedPerson(null);
    setManualInTime("");
    setManualOutTime("");
    setShowManual(false);
  };

  const exportCSV = () => {
    const headers = [
      "Sr",
      "Name",
      "ID/Adm No",
      "Type",
      "Class/Designation",
      "Date",
      "In Time",
      "Out Time",
      "Duration",
      "Device",
      "Status",
    ];
    const rows = filteredLog.map((e, i) => {
      const duration =
        e.inTime && e.outTime ? calcDuration(e.inTime, e.outTime) : "-";
      const status = !e.inTime
        ? "Absent"
        : !e.outTime
          ? "In School"
          : "Present";
      return [
        i + 1,
        e.name,
        e.personId,
        e.type,
        e.className || e.designation || "-",
        e.date,
        e.inTime || "-",
        e.outTime || "-",
        duration,
        e.deviceType,
        status,
      ];
    });
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `biometric_attendance_${filterDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Today", value: todayPresent, color: "text-blue-400" },
          { label: "Students", value: todayStudents, color: "text-green-400" },
          { label: "Staff", value: todayStaff, color: "text-yellow-400" },
          { label: "Absent", value: todayAbsent, color: "text-red-400" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3"
          >
            <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-gray-400 text-xs mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={simulateScan}
          className="bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-2 rounded font-medium transition"
          data-ocid="rfid.simulate.button"
        >
          📡 Simulate RFID Scan
        </button>
        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded font-medium transition"
          data-ocid="rfid.manual.toggle"
        >
          ✏️ Manual Entry {showManual ? "▲" : "▼"}
        </button>
        <button
          type="button"
          onClick={exportCSV}
          className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-4 py-2 rounded font-medium transition flex items-center gap-1.5"
          data-ocid="rfid.export.button"
        >
          <Download size={12} /> Export CSV
        </button>
      </div>

      {/* Manual Entry Form */}
      {showManual && (
        <div
          className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 space-y-3"
          data-ocid="rfid.manual.panel"
        >
          <h4 className="text-white text-sm font-semibold">
            Manual Attendance Entry
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="manual-person-type"
                className="text-gray-400 text-xs block mb-1"
              >
                Person Type
              </label>
              <select
                id="manual-person-type"
                value={manualPersonType}
                onChange={(e) => {
                  setManualPersonType(e.target.value as "Student" | "Staff");
                  setManualSearch("");
                  setSelectedPerson(null);
                }}
                className="w-full bg-gray-900 border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none"
                data-ocid="rfid.manual.select"
              >
                <option value="Student">Student</option>
                <option value="Staff">Staff</option>
              </select>
            </div>
            <div className="relative">
              <label
                htmlFor="manual-person-search"
                className="text-gray-400 text-xs block mb-1"
              >
                Search Person
              </label>
              <input
                id="manual-person-search"
                type="text"
                value={selectedPerson ? selectedPerson.name : manualSearch}
                onChange={(e) => {
                  setManualSearch(e.target.value);
                  setSelectedPerson(null);
                }}
                placeholder="Search by name or ID..."
                className="w-full bg-gray-900 border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none focus:border-blue-400"
                data-ocid="rfid.manual.search_input"
              />
              {manualSearchResults.length > 0 && !selectedPerson && (
                <div className="absolute top-full left-0 right-0 bg-gray-900 border border-gray-600 rounded-b z-10 max-h-40 overflow-y-auto">
                  {manualSearchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPerson(p);
                        setManualSearch(p.name);
                        setManualSearchResults([]);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-white hover:bg-gray-700 cursor-pointer"
                    >
                      {p.name} <span className="text-gray-400">({p.id})</span>
                      {p.className && (
                        <span className="text-blue-400 ml-1">
                          Cls: {p.className}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label
                htmlFor="manual-date"
                className="text-gray-400 text-xs block mb-1"
              >
                Date
              </label>
              <input
                id="manual-date"
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none"
                data-ocid="rfid.manual.date.input"
              />
            </div>
            <div>
              <label
                htmlFor="manual-intime"
                className="text-gray-400 text-xs block mb-1"
              >
                In-Time
              </label>
              <input
                id="manual-intime"
                type="time"
                value={manualInTime}
                onChange={(e) => setManualInTime(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none"
                data-ocid="rfid.manual.intime.input"
              />
            </div>
            <div>
              <label
                htmlFor="manual-outtime"
                className="text-gray-400 text-xs block mb-1"
              >
                Out-Time
              </label>
              <input
                id="manual-outtime"
                type="time"
                value={manualOutTime}
                onChange={(e) => setManualOutTime(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none"
                data-ocid="rfid.manual.outtime.input"
              />
            </div>
            <div>
              <label
                htmlFor="manual-device"
                className="text-gray-400 text-xs block mb-1"
              >
                Device Type
              </label>
              <select
                id="manual-device"
                value={manualDevice}
                onChange={(e) =>
                  setManualDevice(
                    e.target.value as BiometricEntry["deviceType"],
                  )
                }
                className="w-full bg-gray-900 border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none"
              >
                <option>RFID</option>
                <option>ESSL Biometric</option>
                <option>Manual</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleManualSave}
              className="bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-1.5 rounded font-medium transition"
              data-ocid="rfid.manual.submit_button"
            >
              Save Entry
            </button>
            <button
              type="button"
              onClick={() => setShowManual(false)}
              className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-4 py-1.5 rounded transition"
              data-ocid="rfid.manual.cancel_button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex gap-3 flex-wrap items-end bg-gray-800/40 border border-gray-700 rounded-lg p-3">
        <div>
          <label
            htmlFor="rfid-filter-date"
            className="text-gray-400 text-xs block mb-1"
          >
            Date
          </label>
          <input
            id="rfid-filter-date"
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-gray-900 border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none"
            data-ocid="rfid.filter.date.input"
          />
        </div>
        <div>
          <label
            htmlFor="rfid-filter-type"
            className="text-gray-400 text-xs block mb-1"
          >
            Type
          </label>
          <select
            id="rfid-filter-type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            className="bg-gray-900 border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none"
            data-ocid="rfid.filter.type.select"
          >
            <option>All</option>
            <option>Student</option>
            <option>Staff</option>
          </select>
        </div>
        {filterType !== "Staff" && (
          <div>
            <label
              htmlFor="rfid-filter-class"
              className="text-gray-400 text-xs block mb-1"
            >
              Class
            </label>
            <select
              id="rfid-filter-class"
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="bg-gray-900 border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none"
            >
              <option value="">All Classes</option>
              {classOptions.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label
            htmlFor="rfid-filter-device"
            className="text-gray-400 text-xs block mb-1"
          >
            Device
          </label>
          <select
            id="rfid-filter-device"
            value={filterDevice}
            onChange={(e) =>
              setFilterDevice(e.target.value as typeof filterDevice)
            }
            className="bg-gray-900 border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none"
          >
            <option>All</option>
            <option>RFID</option>
            <option>ESSL Biometric</option>
            <option>Manual</option>
          </select>
        </div>
        <span className="text-gray-400 text-xs ml-auto">
          {filteredLog.length} records
        </span>
      </div>

      {/* Excel-Style Table */}
      <div className="rounded-lg overflow-hidden border border-gray-700 overflow-x-auto">
        <table
          className="w-full text-xs"
          style={{ minWidth: 800 }}
          data-ocid="rfid.table"
        >
          <thead>
            <tr style={{ background: "#1a1f2e" }}>
              {[
                "Sr",
                "Name",
                "ID/Adm No",
                "Type",
                "Class/Desig.",
                "Date",
                "In Time",
                "Out Time",
                "Duration",
                "Device",
                "Status",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-3 py-2 text-gray-400 font-semibold border-b border-gray-700 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredLog.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-3 py-10 text-center text-gray-500"
                  data-ocid="rfid.empty_state"
                >
                  No attendance records found for selected filters
                </td>
              </tr>
            ) : (
              filteredLog.map((e, i) => {
                const duration =
                  e.inTime && e.outTime
                    ? calcDuration(e.inTime, e.outTime)
                    : "-";
                const status = !e.inTime
                  ? "Absent"
                  : !e.outTime
                    ? "In School"
                    : "Present";
                const statusColor =
                  status === "Present"
                    ? "#16a34a"
                    : status === "In School"
                      ? "#2563eb"
                      : "#dc2626";
                const statusBg =
                  status === "Present"
                    ? "#14532d"
                    : status === "In School"
                      ? "#1e3a8a"
                      : "#7f1d1d";
                return (
                  <tr
                    key={e.id}
                    style={{
                      background: i % 2 === 0 ? "#111827" : "#0f1117",
                      borderBottom: "1px solid #1f2937",
                    }}
                    data-ocid={`rfid.item.${i + 1}`}
                  >
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 text-white font-medium whitespace-nowrap">
                      {e.name}
                    </td>
                    <td className="px-3 py-2 text-blue-400">{e.personId}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${e.type === "Student" ? "bg-blue-900/50 text-blue-300" : "bg-purple-900/50 text-purple-300"}`}
                      >
                        {e.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-300">
                      {e.className || e.designation || "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-300">{e.date}</td>
                    <td className="px-3 py-2 text-green-400 font-mono">
                      {e.inTime || "-"}
                    </td>
                    <td className="px-3 py-2 text-orange-400 font-mono">
                      {e.outTime || "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-300">{duration}</td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-800 text-gray-300">
                        {e.deviceType}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-semibold"
                        style={{ background: statusBg, color: statusColor }}
                      >
                        {status}
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
  );
}

// ─── Main Attendance Component ────────────────────────────────────────────────────────────────
export function Attendance() {
  const [tab, setTab] = useState<"student" | "staff" | "rfid" | "display">(
    "student",
  );
  const [selectedClass, setSelectedClass] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendance, setAttendance] = useState<Record<string, AttStatus>>({});
  const [saved, setSaved] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");

  const [allStudents, setAllStudents] = useState<StudentRow[]>([]);
  const [allStaff, setAllStaff] = useState<StaffRow[]>([]);

  // Load from localStorage
  useEffect(() => {
    try {
      const studs = JSON.parse(localStorage.getItem("erp_students") || "[]");
      if (Array.isArray(studs)) {
        setAllStudents(
          studs.map((s: any) => ({
            id: s.id,
            name: s.name,
            admNo: s.admNo,
            className: s.className,
            section: s.section,
            rollNo: s.rollNo,
          })),
        );
        if (studs.length > 0) {
          setSelectedClass(
            (prev: string) =>
              prev || `${studs[0].className}-${studs[0].section}`,
          );
        }
      }
    } catch {
      /* ignore */
    }

    try {
      const staffData = JSON.parse(localStorage.getItem("erp_staff") || "[]");
      if (Array.isArray(staffData)) {
        setAllStaff(
          staffData.map((s: any, i: number) => ({
            id: s.id ?? i + 1,
            name: s.name,
            designation: s.designation,
            status: s.status || "Active",
          })),
        );
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Unique class-section combinations
  const classOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: string[] = [];
    for (const s of allStudents) {
      const key = `${s.className}-${s.section}`;
      if (!seen.has(key)) {
        seen.add(key);
        opts.push(key);
      }
    }
    return opts.sort();
  }, [allStudents]);

  // Students for selected class, filtered by live search
  const classStudents = useMemo(() => {
    const base = allStudents.filter(
      (s) => `${s.className}-${s.section}` === selectedClass,
    );
    if (!studentSearch.trim()) return base;
    const q = studentSearch.toLowerCase();
    return base.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.admNo.toLowerCase().includes(q) ||
        s.rollNo.toLowerCase().includes(q),
    );
  }, [allStudents, selectedClass, studentSearch]);

  // Staff filtered by live search
  const filteredStaff = useMemo(() => {
    if (!staffSearch.trim()) return allStaff;
    const q = staffSearch.toLowerCase();
    return allStaff.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.designation.toLowerCase().includes(q),
    );
  }, [allStaff, staffSearch]);

  const setStatus = (name: string, status: AttStatus) => {
    setAttendance((prev) => ({ ...prev, [name]: status }));
  };

  const handleMarkAll = (status: AttStatus) => {
    const list =
      tab === "student"
        ? classStudents.map((s) => s.name)
        : filteredStaff.map((s) => s.name);
    const newAtt: Record<string, AttStatus> = { ...attendance };
    for (const name of list) newAtt[name] = status;
    setAttendance(newAtt);
  };

  const handleSave = () => {
    setSaved(true);
    const key = `att_${tab}_${date}_${selectedClass}`;
    localStorage.setItem(key, JSON.stringify(attendance));
    toast.success("Attendance saved!");
    addERPNotification({
      type: "attendance",
      icon: "✅",
      title: "Attendance Saved",
      message: `${tab === "student" ? selectedClass : "Staff"} attendance for ${date} saved`,
    });
    setTimeout(() => setSaved(false), 2000);
  };

  const presentCount = Object.values(attendance).filter(
    (s) => s === "Present",
  ).length;
  const absentCount = Object.values(attendance).filter(
    (s) => s === "Absent",
  ).length;
  const lateCount = Object.values(attendance).filter(
    (s) => s === "Late",
  ).length;

  const TAB_CONFIG = [
    { key: "student", label: "Student Attendance", icon: <Users size={13} /> },
    { key: "staff", label: "Staff Attendance", icon: <Users size={13} /> },
    { key: "rfid", label: "RFID/Biometric", icon: <Cpu size={13} /> },
    {
      key: "display",
      label: "📺 Welcome Display",
      icon: <Monitor size={13} />,
    },
  ] as const;

  return (
    <div>
      <h2 className="text-white text-lg font-semibold mb-4">Attendance</h2>
      <div className="flex gap-1 mb-4 flex-wrap">
        {TAB_CONFIG.map((t) => (
          <button
            type="button"
            key={t.key}
            onClick={() => {
              setTab(t.key);
              if (t.key !== "display") setAttendance({});
            }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-medium capitalize transition ${
              tab === t.key
                ? t.key === "display"
                  ? "bg-indigo-700 text-white"
                  : "bg-green-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
            data-ocid={`attendance.${t.key}.tab`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "display" && <WelcomeDisplayTab />}

      {tab === "rfid" && <RFIDTab />}

      {(tab === "student" || tab === "staff") && (
        <>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div>
              <label
                htmlFor="att-date"
                className="text-gray-400 text-xs block mb-1"
              >
                Date
              </label>
              <input
                id="att-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                data-ocid="attendance.date.input"
              />
            </div>
            {tab === "student" && (
              <div>
                <label
                  htmlFor="att-class"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Class-Section
                </label>
                <select
                  id="att-class"
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setAttendance({});
                  }}
                  className="bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                  data-ocid="attendance.class.select"
                >
                  <option value="">-- Select Class --</option>
                  {classOptions.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
            {/* Live search */}
            <div className="flex items-center bg-gray-800 border border-gray-700 rounded px-2 py-1.5">
              <Search size={12} className="text-gray-400 mr-1" />
              <input
                value={tab === "student" ? studentSearch : staffSearch}
                onChange={(e) =>
                  tab === "student"
                    ? setStudentSearch(e.target.value)
                    : setStaffSearch(e.target.value)
                }
                placeholder={
                  tab === "student" ? "Search students..." : "Search staff..."
                }
                className="bg-transparent text-gray-300 text-xs outline-none w-32"
                data-ocid="attendance.search_input"
              />
            </div>
            <div className="flex gap-3">
              <span className="text-green-400 text-xs">
                Present: {presentCount}
              </span>
              <span className="text-red-400 text-xs">
                Absent: {absentCount}
              </span>
              <span className="text-yellow-400 text-xs">Late: {lateCount}</span>
            </div>
            <div className="flex gap-1 ml-auto">
              {(["Present", "Absent", "Late"] as AttStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleMarkAll(s)}
                  className={`px-2 py-1 rounded text-[10px] font-medium ${
                    s === "Present"
                      ? "bg-green-700 text-white"
                      : s === "Absent"
                        ? "bg-red-700 text-white"
                        : "bg-yellow-700 text-white"
                  }`}
                >
                  All {s}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg overflow-hidden border border-gray-700">
            <table className="w-full text-xs" data-ocid="attendance.table">
              <thead>
                <tr style={{ background: "#1a1f2e" }}>
                  <th className="text-left px-3 py-2 text-gray-400">#</th>
                  {tab === "student" && (
                    <th className="text-left px-3 py-2 text-gray-400">
                      Adm. No.
                    </th>
                  )}
                  <th className="text-left px-3 py-2 text-gray-400">Name</th>
                  {tab === "student" && (
                    <th className="text-left px-3 py-2 text-gray-400">Roll</th>
                  )}
                  {tab === "staff" && (
                    <th className="text-left px-3 py-2 text-gray-400">
                      Designation
                    </th>
                  )}
                  <th className="text-left px-3 py-2 text-gray-400">Present</th>
                  <th className="text-left px-3 py-2 text-gray-400">Absent</th>
                  <th className="text-left px-3 py-2 text-gray-400">Late</th>
                </tr>
              </thead>
              <tbody>
                {(tab === "student" ? classStudents : filteredStaff).length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-gray-500"
                      data-ocid="attendance.empty_state"
                    >
                      {tab === "student" && !selectedClass
                        ? "Select a class to take attendance"
                        : "No records found"}
                    </td>
                  </tr>
                ) : (
                  (tab === "student" ? classStudents : filteredStaff).map(
                    (row, i) => (
                      <tr
                        key={row.id}
                        style={{
                          background: i % 2 === 0 ? "#111827" : "#0f1117",
                        }}
                        data-ocid={`attendance.item.${i + 1}`}
                      >
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        {tab === "student" && (
                          <td className="px-3 py-2 text-blue-400">
                            {(row as StudentRow).admNo}
                          </td>
                        )}
                        <td className="px-3 py-2 text-white">{row.name}</td>
                        {tab === "student" && (
                          <td className="px-3 py-2 text-gray-400">
                            {(row as StudentRow).rollNo}
                          </td>
                        )}
                        {tab === "staff" && (
                          <td className="px-3 py-2 text-gray-400">
                            {(row as StaffRow).designation}
                          </td>
                        )}
                        {(["Present", "Absent", "Late"] as AttStatus[]).map(
                          (status) => (
                            <td key={status} className="px-3 py-2">
                              <input
                                type="radio"
                                name={`att-${row.id}`}
                                value={status}
                                checked={attendance[row.name] === status}
                                onChange={() => setStatus(row.name, status)}
                                className="accent-green-500"
                                data-ocid={`attendance.radio.${i + 1}`}
                              />
                            </td>
                          ),
                        )}
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="mt-3 bg-green-600 hover:bg-green-700 text-white text-xs px-6 py-2 rounded"
            data-ocid="attendance.submit_button"
          >
            {saved ? "✓ Attendance Saved" : "Save Attendance"}
          </button>
        </>
      )}
    </div>
  );
}
