import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import type { Staff, Student } from "../../types";

interface CheckIn {
  id: string;
  name: string;
  subtitle: string;
  cls: string;
  photo: string;
  timeIn: string;
  type: "student" | "staff";
  scannedAt: number;
}

function Clock() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }),
  );
  useEffect(() => {
    const id = setInterval(
      () =>
        setTime(
          new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          }),
        ),
      1000,
    );
    return () => clearInterval(id);
  }, []);
  return <>{time}</>;
}

export default function WelcomeDisplay() {
  const { getData } = useApp();

  const students = useMemo(() => getData("students") as Student[], [getData]);
  const staff = useMemo(() => getData("staff") as Staff[], [getData]);

  const schoolName = useMemo(() => {
    try {
      const profile = localStorage.getItem("school_profile");
      if (profile) {
        const parsed = JSON.parse(profile) as { name?: string };
        return parsed.name ?? "SHUBH SCHOOL ERP";
      }
    } catch {}
    return "SHUBH SCHOOL ERP";
  }, []);

  const [activeCard, setActiveCard] = useState<CheckIn | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<CheckIn[]>([]);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildCheckIn = useCallback(
    (
      personId: string,
      personType: "student" | "staff",
      timeIn: string,
    ): CheckIn | null => {
      if (personType === "student") {
        const s = students.find((x) => x.id === personId);
        if (!s) return null;
        return {
          id: personId,
          name: s.fullName,
          subtitle: s.fatherName ? `Father: ${s.fatherName}` : "",
          cls: `Class ${s.class} - ${s.section}`,
          photo: s.photo ?? "",
          timeIn,
          type: "student",
          scannedAt: Date.now(),
        };
      }
      const m = staff.find((x) => x.id === personId);
      if (!m) return null;
      return {
        id: personId,
        name: m.name ?? m.fullName ?? "",
        subtitle: m.designation,
        cls: m.department ?? "Staff",
        photo: m.photo ?? "",
        timeIn,
        type: "staff",
        scannedAt: Date.now(),
      };
    },
    [students, staff],
  );

  const showCard = useCallback((checkin: CheckIn) => {
    setActiveCard(checkin);
    setRecentCheckins((prev) => [checkin, ...prev].slice(0, 5));
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => setActiveCard(null), 6000);
  }, []);

  // Listen for real-time CustomEvents dispatched by QR/RFID tabs (same page/tab)
  useEffect(() => {
    function handleScan(e: Event) {
      const { personId, personType, record } = (e as CustomEvent).detail as {
        personId: string;
        personType: "student" | "staff";
        record: { timeIn?: string };
      };
      const checkin = buildCheckIn(
        personId,
        personType,
        record.timeIn ??
          new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
      );
      if (checkin) showCard(checkin);
    }
    window.addEventListener("attendance_scan", handleScan);
    return () => window.removeEventListener("attendance_scan", handleScan);
  }, [buildCheckIn, showCard]);

  // Also accept keyboard input directly (kiosk mode) - auto-mark from typed admNo
  const kioskInputRef = useRef<HTMLInputElement>(null);
  const kioskTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [kioskValue, setKioskValue] = useState("");

  function processKioskScan(raw: string) {
    const admNo = raw.trim();
    if (!admNo) return;
    const student = students.find(
      (s) => s.admNo.toLowerCase() === admNo.toLowerCase(),
    );
    if (student) {
      const timeIn = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const checkin: CheckIn = {
        id: student.id,
        name: student.fullName,
        subtitle: student.fatherName ? `Father: ${student.fatherName}` : "",
        cls: `Class ${student.class} - ${student.section}`,
        photo: student.photo ?? "",
        timeIn,
        type: "student",
        scannedAt: Date.now(),
      };
      showCard(checkin);
    }
    setKioskValue("");
  }

  function handleKioskChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setKioskValue(val);
    if (kioskTimerRef.current) clearTimeout(kioskTimerRef.current);
    if (val.trim().length >= 3) {
      kioskTimerRef.current = setTimeout(() => processKioskScan(val), 150);
    }
  }

  function handleKioskKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      processKioskScan(kioskValue);
    }
  }

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="relative w-full min-h-[calc(100vh-120px)] flex flex-col items-center justify-center overflow-hidden rounded-2xl"
      style={{ background: "oklch(0.13 0.04 260)" }}
      data-ocid="welcome-display.screen"
      onClick={() => kioskInputRef.current?.focus()}
      onKeyDown={() => kioskInputRef.current?.focus()}
    >
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.5 0.18 260) 1px, transparent 1px), linear-gradient(90deg, oklch(0.5 0.18 260) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Hidden kiosk input - captures scanner input when display is focused */}
      <input
        ref={kioskInputRef}
        value={kioskValue}
        onChange={handleKioskChange}
        onKeyDown={handleKioskKeyDown}
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        aria-label="Kiosk scan input"
        autoComplete="off"
      />

      {/* School name header */}
      <div className="absolute top-6 text-center z-10">
        <p
          className="text-xs tracking-[0.3em] uppercase font-semibold"
          style={{ color: "oklch(0.65 0.15 260)" }}
        >
          Welcome to
        </p>
        <p
          className="text-2xl md:text-3xl font-bold font-display mt-1"
          style={{ color: "oklch(0.95 0.01 260)" }}
        >
          {schoolName}
        </p>
      </div>

      {/* Idle State */}
      {!activeCard && (
        <div className="flex flex-col items-center gap-6 text-center z-10 px-8">
          <div
            className="text-6xl md:text-8xl font-bold font-mono tracking-tight"
            style={{
              color: "oklch(0.9 0.01 260)",
              textShadow: "0 0 40px oklch(0.55 0.18 260 / 0.4)",
            }}
          >
            <Clock />
          </div>
          <p
            className="text-xl md:text-2xl"
            style={{ color: "oklch(0.6 0.01 260)" }}
          >
            {today}
          </p>
          <div
            className="mt-4 px-8 py-4 rounded-2xl border"
            style={{
              borderColor: "oklch(0.45 0.15 260 / 0.5)",
              background: "oklch(0.2 0.04 260 / 0.6)",
              animation: "pulse 2.5s ease-in-out infinite",
            }}
          >
            <p
              className="text-lg md:text-xl font-semibold tracking-wide"
              style={{ color: "oklch(0.75 0.16 260)" }}
            >
              📡 SCAN YOUR CARD TO CHECK IN
            </p>
          </div>
        </div>
      )}

      {/* Welcome Card — animated slide-in */}
      {activeCard && (
        <div
          key={activeCard.scannedAt}
          className="z-20 flex flex-col items-center gap-5 text-center px-8"
          style={{ animation: "fadeInScale 0.4s ease-out" }}
        >
          <div
            className="w-36 h-36 md:w-48 md:h-48 rounded-full flex items-center justify-center text-5xl overflow-hidden border-4"
            style={{
              borderColor: "oklch(0.65 0.18 260)",
              boxShadow: "0 0 60px oklch(0.55 0.18 260 / 0.5)",
            }}
          >
            {activeCard.photo ? (
              <img
                src={activeCard.photo}
                alt={activeCard.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span
                className="w-full h-full flex items-center justify-center text-6xl font-bold"
                style={{
                  background: "oklch(0.25 0.06 260)",
                  color: "oklch(0.75 0.16 260)",
                }}
              >
                {activeCard.name.charAt(0)}
              </span>
            )}
          </div>

          <div>
            <p
              className="text-4xl md:text-6xl font-bold font-display"
              style={{
                color: "oklch(0.97 0.005 260)",
                textShadow: "0 2px 20px rgba(0,0,0,0.3)",
              }}
            >
              {activeCard.name}
            </p>
            {activeCard.subtitle && (
              <p
                className="text-lg md:text-2xl mt-2"
                style={{ color: "oklch(0.65 0.12 260)" }}
              >
                {activeCard.subtitle}
              </p>
            )}
            <p
              className="text-base md:text-lg mt-1"
              style={{ color: "oklch(0.55 0.08 260)" }}
            >
              {activeCard.cls}
            </p>
          </div>

          <div
            className="flex items-center gap-3 px-6 py-2 rounded-full"
            style={{ background: "oklch(0.25 0.04 260 / 0.8)" }}
          >
            <span style={{ color: "oklch(0.6 0.1 260)" }} className="text-sm">
              Entry Time:
            </span>
            <span
              className="text-xl font-mono font-bold"
              style={{ color: "oklch(0.8 0.18 260)" }}
            >
              {activeCard.timeIn}
            </span>
          </div>

          <div
            className="px-10 py-4 rounded-2xl text-2xl md:text-3xl font-bold"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.42 0.18 260), oklch(0.55 0.15 150))",
              boxShadow: "0 8px 32px oklch(0.42 0.18 260 / 0.4)",
              color: "oklch(0.97 0.005 0)",
            }}
          >
            🎉 WELCOME TO SCHOOL!
          </div>
        </div>
      )}

      {/* Recent Check-ins Ticker */}
      {recentCheckins.length > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 px-4 py-3 z-10"
          style={{
            background: "oklch(0.1 0.03 260 / 0.9)",
            borderTop: "1px solid oklch(0.25 0.04 260)",
          }}
        >
          <p
            className="text-xs uppercase tracking-widest mb-2"
            style={{ color: "oklch(0.45 0.08 260)" }}
          >
            Recent Check-ins
          </p>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {recentCheckins.map((c) => (
              <div
                key={`${c.id}-${c.scannedAt}`}
                className="flex items-center gap-2 flex-shrink-0"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden"
                  style={{ background: "oklch(0.3 0.06 260)" }}
                >
                  {c.photo ? (
                    <img
                      src={c.photo}
                      alt={c.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span style={{ color: "oklch(0.75 0.16 260)" }}>
                      {c.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "oklch(0.8 0.01 260)" }}
                  >
                    {c.name}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "oklch(0.5 0.01 260)" }}
                  >
                    {c.timeIn}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
