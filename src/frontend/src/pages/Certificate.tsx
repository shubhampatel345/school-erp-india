import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Award,
  ChevronDown,
  ClipboardList,
  Eye,
  FileText,
  IdCard,
  Move,
  Palette,
  Printer,
  RotateCcw,
  Save,
  Settings2,
  Star,
  Upload,
  Users,
  X as XIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Student {
  name: string;
  admNo: string;
  class: string;
  section: string;
  dob: string;
  blood: string;
  father: string;
  mother: string;
  contact: string;
  rollNo: string;
  address: string;
}

interface Staff {
  name: string;
  empId: string;
  designation: string;
  department: string;
  contact: string;
  blood: string;
  joining: string;
}

interface FieldPos {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
}

type FieldPositions = Record<string, FieldPos>;

// ─── Sample Data ──────────────────────────────────────────────────────────────

// Helper to load students from localStorage and map to Certificate Student type
function loadStudentsFromLS(): Student[] {
  try {
    const raw = JSON.parse(localStorage.getItem("erp_students") || "[]");
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((s: any) => ({
        name: s.name || "",
        admNo: s.admNo || "",
        class: (s.className || "").replace("Class ", ""),
        section: s.section || "",
        dob: s.dob
          ? (() => {
              const parts = s.dob.split("-");
              return parts.length === 3
                ? `${parts[2]}/${parts[1]}/${parts[0]}`
                : s.dob;
            })()
          : "",
        blood: s.blood || "O+",
        father: s.fatherName || "",
        mother: s.motherName || "",
        contact: s.contact || "",
        rollNo: s.rollNo || "",
        address: "",
      }));
    }
  } catch {
    /* ignore */
  }
  return FALLBACK_STUDENTS;
}

const FALLBACK_STUDENTS: Student[] = [
  {
    name: "Aarav Sharma",
    admNo: "ADM-1001",
    class: "5",
    section: "A",
    dob: "12/03/2014",
    blood: "O+",
    father: "Rajesh Sharma",
    mother: "Sunita Sharma",
    contact: "9876543210",
    rollNo: "15",
    address: "123, MG Road, New Delhi",
  },
  {
    name: "Priya Patel",
    admNo: "ADM-1002",
    class: "7",
    section: "B",
    dob: "22/07/2012",
    blood: "A+",
    father: "Mahesh Patel",
    mother: "Rekha Patel",
    contact: "9812345678",
    rollNo: "22",
    address: "45, Park Street, Mumbai",
  },
  {
    name: "Rohit Kumar",
    admNo: "ADM-1003",
    class: "10",
    section: "A",
    dob: "05/01/2009",
    blood: "B+",
    father: "Suresh Kumar",
    mother: "Anita Kumar",
    contact: "9988776655",
    rollNo: "08",
    address: "78, Gandhi Nagar, Jaipur",
  },
];

function loadStaffFromLS(): Staff[] {
  try {
    const raw = JSON.parse(localStorage.getItem("erp_staff") || "[]");
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((s: any, i: number) => ({
        name: s.name || "",
        empId: s.employeeId || `STAFF-${String(i + 1).padStart(3, "0")}`,
        designation: s.designation || "",
        department: s.department || "",
        contact: s.contact || "",
        blood: s.blood || "O+",
        joining: s.joiningDate
          ? (() => {
              const parts = s.joiningDate.split("-");
              return parts.length === 3
                ? `${parts[2]}/${parts[1]}/${parts[0]}`
                : s.joiningDate;
            })()
          : "",
      }));
    }
  } catch {
    /* ignore */
  }
  return FALLBACK_STAFF;
}

const FALLBACK_STAFF: Staff[] = [
  {
    name: "Rekha Singh",
    empId: "STAFF-001",
    designation: "Principal",
    department: "Administration",
    contact: "9811223344",
    blood: "A+",
    joining: "01/07/2008",
  },
  {
    name: "Amit Verma",
    empId: "STAFF-002",
    designation: "Senior Teacher",
    department: "Science Dept",
    contact: "9922334455",
    blood: "O+",
    joining: "15/06/2012",
  },
  {
    name: "Geeta Joshi",
    empId: "STAFF-003",
    designation: "Clerk",
    department: "Office",
    contact: "9933445566",
    blood: "B+",
    joining: "10/03/2015",
  },
  {
    name: "Raju Yadav",
    empId: "STAFF-004",
    designation: "Driver",
    department: "Transport",
    contact: "9944556677",
    blood: "AB+",
    joining: "20/08/2018",
  },
];

const SCHOOL = {
  name: "Delhi Public School",
  address: "Sector 14, Dwarka, New Delhi - 110078",
  phone: "011-28050123",
  email: "info@dpsdelhi.edu.in",
  udise: "09040312345",
  affiliation: "CBSE | Affiliation No: 2730123",
};

// ─── Default Field Positions ─────────────────────────────────────────────────

const DEFAULT_POSITIONS: Record<string, FieldPositions> = {
  student_t1: {
    photo: { x: 32, y: 15 },
    name: { x: 10, y: 38 },
    class: { x: 10, y: 48 },
    rollNo: { x: 10, y: 57 },
    dob: { x: 10, y: 66 },
    blood: { x: 10, y: 75 },
    admNo: { x: 55, y: 57 },
    contact: { x: 55, y: 66 },
  },
  student_t2: {
    photo: { x: 35, y: 12 },
    name: { x: 25, y: 42 },
    class: { x: 10, y: 54 },
    dob: { x: 10, y: 63 },
    blood: { x: 60, y: 54 },
    admNo: { x: 10, y: 72 },
    contact: { x: 60, y: 63 },
  },
  student_t3: {
    photo: { x: 32, y: 12 },
    name: { x: 10, y: 40 },
    class: { x: 10, y: 52 },
    dob: { x: 10, y: 62 },
    blood: { x: 10, y: 72 },
    admNo: { x: 55, y: 52 },
    contact: { x: 55, y: 62 },
  },
  student_t4: {
    photo: { x: 32, y: 12 },
    name: { x: 10, y: 40 },
    class: { x: 10, y: 50 },
    rollNo: { x: 10, y: 60 },
    dob: { x: 10, y: 70 },
    blood: { x: 55, y: 50 },
    admNo: { x: 55, y: 60 },
    contact: { x: 55, y: 70 },
  },
  staff_ta: {
    photo: { x: 3, y: 22 },
    name: { x: 35, y: 22 },
    designation: { x: 35, y: 38 },
    department: { x: 35, y: 50 },
    empId: { x: 35, y: 62 },
    contact: { x: 35, y: 74 },
    blood: { x: 70, y: 62 },
  },
  staff_tb: {
    photo: { x: 32, y: 22 },
    name: { x: 20, y: 55 },
    designation: { x: 20, y: 65 },
    empId: { x: 20, y: 75 },
    contact: { x: 20, y: 84 },
    blood: { x: 65, y: 75 },
  },
};

// ─── Print Helper ─────────────────────────────────────────────────────────────

function printArea(contentId: string) {
  const el = document.getElementById(contentId);
  if (!el) return;
  const html = el.innerHTML;
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(`
    <html><head><title>Print</title>
    <style>
      @page { margin: 10mm; }
      body { margin: 0; font-family: Arial, sans-serif; }
      * { box-sizing: border-box; }
    </style></head>
    <body>${html}</body></html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 400);
}

// ─── Drag Hook ────────────────────────────────────────────────────────────────

function useDraggableFields(templateKey: string, fieldKeys: string[]) {
  const storageKey = `cert_positions_${templateKey}`;
  const [positions, setPositions] = useState<FieldPositions>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved) as FieldPositions;
    } catch {
      /* ignore */
    }
    return DEFAULT_POSITIONS[templateKey] ?? {};
  });

  const dragging = useRef<{
    field: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const savePositions = useCallback(
    (pos: FieldPositions) => {
      localStorage.setItem(storageKey, JSON.stringify(pos));
      setPositions(pos);
    },
    [storageKey],
  );

  const resetPositions = useCallback(() => {
    const defaults = DEFAULT_POSITIONS[templateKey] ?? {};
    localStorage.removeItem(storageKey);
    setPositions(defaults);
  }, [templateKey, storageKey]);

  const onMouseDown = useCallback(
    (field: string, e: React.MouseEvent) => {
      e.preventDefault();
      const pos = positions[field] ?? { x: 50, y: 50 };
      dragging.current = {
        field,
        startX: e.clientX,
        startY: e.clientY,
        origX: pos.x,
        origY: pos.y,
      };
    },
    [positions],
  );

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragging.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragging.current.startY) / rect.height) * 100;
    const newX = Math.max(0, Math.min(90, dragging.current.origX + dx));
    const newY = Math.max(0, Math.min(92, dragging.current.origY + dy));
    setPositions((prev) => ({
      ...prev,
      [dragging.current!.field]: { x: newX, y: newY },
    }));
  }, []);

  const onMouseUp = useCallback(() => {
    if (dragging.current) {
      setPositions((prev) => {
        localStorage.setItem(storageKey, JSON.stringify(prev));
        return prev;
      });
      dragging.current = null;
    }
  }, [storageKey]);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  // Sync positions when template key changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setPositions(JSON.parse(saved) as FieldPositions);
        return;
      }
    } catch {
      /* ignore */
    }
    setPositions(DEFAULT_POSITIONS[templateKey] ?? {});
  }, [templateKey, storageKey]);

  return {
    positions,
    containerRef,
    onMouseDown,
    savePositions,
    resetPositions,
    fieldKeys,
  };
}

// ─── Student ID Card Templates ────────────────────────────────────────────────

function StudentCardT1({
  student,
  positions,
  editMode,
  onMouseDown,
}: {
  student: Student;
  positions: FieldPositions;
  editMode: boolean;
  onMouseDown: (field: string, e: React.MouseEvent) => void;
}) {
  const fp = (field: string) =>
    positions[field] ?? DEFAULT_POSITIONS.student_t1[field] ?? { x: 50, y: 50 };
  const fieldStyle = (field: string): React.CSSProperties => ({
    position: "absolute",
    left: `${fp(field).x}%`,
    top: `${fp(field).y}%`,
    cursor: editMode ? "move" : "default",
    outline: editMode ? "1.5px dashed #3b82f6" : "none",
    padding: "1px 3px",
    borderRadius: 2,
    userSelect: "none",
    zIndex: 10,
  });

  return (
    <div
      style={{
        width: 397,
        height: 548,
        background: "#fff",
        borderRadius: 10,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg,#1e3a8a,#1d4ed8)",
          height: 90,
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            background: "rgba(255,255,255,0.2)",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 24,
          }}
        >
          🏫
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: 0.5,
            }}
          >
            {SCHOOL.name.toUpperCase()}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: 9.5,
              marginTop: 2,
            }}
          >
            {SCHOOL.affiliation}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 8.5,
              marginTop: 1,
            }}
          >
            {SCHOOL.address}
          </div>
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.15)",
            borderRadius: 4,
            padding: "3px 8px",
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
          }}
        >
          STUDENT ID
        </div>
      </div>

      {/* Photo */}
      <div
        onMouseDown={editMode ? (e) => onMouseDown("photo", e) : undefined}
        style={{
          ...fieldStyle("photo"),
          width: 90,
          height: 110,
          background: "#e5e7eb",
          border: "2px dashed #94a3b8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          transform: "translateX(-50%)",
        }}
      >
        <span style={{ fontSize: 36 }}>👤</span>
        <span style={{ fontSize: 8, color: "#64748b" }}>PHOTO</span>
      </div>

      {/* Fields */}
      <div
        onMouseDown={editMode ? (e) => onMouseDown("name", e) : undefined}
        style={fieldStyle("name")}
      >
        <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>
          {student.name}
        </div>
      </div>
      <div
        onMouseDown={editMode ? (e) => onMouseDown("class", e) : undefined}
        style={fieldStyle("class")}
      >
        <div style={{ fontSize: 9, color: "#64748b" }}>Class &amp; Section</div>
        <div style={{ fontWeight: 600, fontSize: 11, color: "#1e3a8a" }}>
          Class {student.class} - {student.section}
        </div>
      </div>
      <div
        onMouseDown={editMode ? (e) => onMouseDown("rollNo", e) : undefined}
        style={fieldStyle("rollNo")}
      >
        <div style={{ fontSize: 9, color: "#64748b" }}>Roll No</div>
        <div style={{ fontWeight: 600, fontSize: 11, color: "#1e293b" }}>
          {student.rollNo}
        </div>
      </div>
      <div
        onMouseDown={editMode ? (e) => onMouseDown("dob", e) : undefined}
        style={fieldStyle("dob")}
      >
        <div style={{ fontSize: 9, color: "#64748b" }}>Date of Birth</div>
        <div style={{ fontWeight: 600, fontSize: 11, color: "#1e293b" }}>
          {student.dob}
        </div>
      </div>
      <div
        onMouseDown={editMode ? (e) => onMouseDown("blood", e) : undefined}
        style={fieldStyle("blood")}
      >
        <div style={{ fontSize: 9, color: "#64748b" }}>Blood Group</div>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#dc2626" }}>
          {student.blood}
        </div>
      </div>
      <div
        onMouseDown={editMode ? (e) => onMouseDown("admNo", e) : undefined}
        style={fieldStyle("admNo")}
      >
        <div style={{ fontSize: 9, color: "#64748b" }}>Adm. No</div>
        <div style={{ fontWeight: 600, fontSize: 11, color: "#1e293b" }}>
          {student.admNo}
        </div>
      </div>
      <div
        onMouseDown={editMode ? (e) => onMouseDown("contact", e) : undefined}
        style={fieldStyle("contact")}
      >
        <div style={{ fontSize: 9, color: "#64748b" }}>Contact</div>
        <div style={{ fontWeight: 600, fontSize: 11, color: "#1e293b" }}>
          {student.contact}
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          position: "absolute",
          top: "85%",
          left: 14,
          right: 14,
          height: 1,
          background: "rgba(30,58,138,0.2)",
        }}
      />

      {/* Signature line */}
      <div
        style={{
          position: "absolute",
          bottom: 28,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "space-around",
          padding: "0 14px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 80,
              height: 1,
              background: "#94a3b8",
              margin: "0 auto 3px",
            }}
          />
          <div style={{ fontSize: 8, color: "#94a3b8" }}>Student Signature</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 80,
              height: 1,
              background: "#94a3b8",
              margin: "0 auto 3px",
            }}
          />
          <div style={{ fontSize: 8, color: "#94a3b8" }}>Principal</div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#1e3a8a",
          height: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 8 }}>
          {SCHOOL.phone} | {SCHOOL.email}
        </div>
      </div>
    </div>
  );
}

function StudentCardT2({
  student,
  positions,
  editMode,
  onMouseDown,
}: {
  student: Student;
  positions: FieldPositions;
  editMode: boolean;
  onMouseDown: (field: string, e: React.MouseEvent) => void;
}) {
  const fp = (field: string) =>
    positions[field] ?? DEFAULT_POSITIONS.student_t2[field] ?? { x: 50, y: 50 };
  const fieldStyle = (field: string): React.CSSProperties => ({
    position: "absolute",
    left: `${fp(field).x}%`,
    top: `${fp(field).y}%`,
    cursor: editMode ? "move" : "default",
    outline: editMode ? "1.5px dashed rgba(255,255,255,0.7)" : "none",
    padding: "1px 3px",
    borderRadius: 2,
    userSelect: "none",
    zIndex: 10,
  });

  return (
    <div
      style={{
        width: 397,
        height: 548,
        background: "linear-gradient(160deg,#4f46e5,#7c3aed,#2563eb)",
        borderRadius: 12,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(79,70,229,0.5)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.06)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: -30,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.04)",
        }}
      />

      {/* School name */}
      <div style={{ padding: "18px 14px 0", textAlign: "center" }}>
        <div
          style={{
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: 1,
          }}
        >
          {SCHOOL.name.toUpperCase()}
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 9,
            marginTop: 3,
          }}
        >
          STUDENT IDENTITY CARD
        </div>
        <div
          style={{ color: "rgba(255,255,255,0.5)", fontSize: 8, marginTop: 2 }}
        >
          {SCHOOL.affiliation}
        </div>
        <div
          style={{
            width: 40,
            height: 2,
            background: "rgba(255,255,255,0.4)",
            margin: "6px auto 0",
          }}
        />
      </div>

      {/* Photo circle */}
      <div
        onMouseDown={editMode ? (e) => onMouseDown("photo", e) : undefined}
        style={{
          ...fieldStyle("photo"),
          width: 90,
          height: 90,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.15)",
          border: "3px solid rgba(255,255,255,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "translateX(-50%)",
        }}
      >
        <span style={{ fontSize: 36 }}>👤</span>
      </div>

      <div
        onMouseDown={editMode ? (e) => onMouseDown("name", e) : undefined}
        style={{
          ...fieldStyle("name"),
          width: "60%",
          textAlign: "center",
          transform: "translateX(-50%)",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>
          {student.name}
        </div>
        <div
          style={{ fontSize: 9, color: "rgba(255,255,255,0.65)", marginTop: 2 }}
        >
          Class {student.class} - {student.section}
        </div>
      </div>

      <div
        onMouseDown={editMode ? (e) => onMouseDown("class", e) : undefined}
        style={{ ...fieldStyle("class"), width: "38%" }}
      >
        <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.65)" }}>
          CLASS
        </div>
        <div style={{ fontWeight: 600, fontSize: 11, color: "#fff" }}>
          {student.class} - {student.section}
        </div>
      </div>
      <div
        onMouseDown={editMode ? (e) => onMouseDown("dob", e) : undefined}
        style={{ ...fieldStyle("dob"), width: "38%" }}
      >
        <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.65)" }}>
          DATE OF BIRTH
        </div>
        <div style={{ fontWeight: 600, fontSize: 11, color: "#fff" }}>
          {student.dob}
        </div>
      </div>
      <div
        onMouseDown={editMode ? (e) => onMouseDown("blood", e) : undefined}
        style={{ ...fieldStyle("blood"), width: "30%" }}
      >
        <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.65)" }}>
          BLOOD
        </div>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#fca5a5" }}>
          {student.blood}
        </div>
      </div>
      <div
        onMouseDown={editMode ? (e) => onMouseDown("admNo", e) : undefined}
        style={{ ...fieldStyle("admNo"), width: "38%" }}
      >
        <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.65)" }}>
          ADM NO
        </div>
        <div style={{ fontWeight: 600, fontSize: 11, color: "#fff" }}>
          {student.admNo}
        </div>
      </div>
      <div
        onMouseDown={editMode ? (e) => onMouseDown("contact", e) : undefined}
        style={{ ...fieldStyle("contact"), width: "38%" }}
      >
        <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.65)" }}>
          CONTACT
        </div>
        <div style={{ fontWeight: 600, fontSize: 11, color: "#fff" }}>
          {student.contact}
        </div>
      </div>

      {/* Barcode strip */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 42,
          background: "rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
        }}
      >
        {Array.from({ length: 44 }, (_, i) => i).map((i) => (
          <div
            key={`bar2-${i}`}
            style={{
              width: i % 3 === 0 ? 3 : 1.5,
              height: i % 5 === 0 ? 26 : 16,
              background: "rgba(255,255,255,0.7)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function StudentCardT3({
  student,
  positions,
  editMode,
  onMouseDown,
}: {
  student: Student;
  positions: FieldPositions;
  editMode: boolean;
  onMouseDown: (field: string, e: React.MouseEvent) => void;
}) {
  const fp = (field: string) =>
    positions[field] ?? DEFAULT_POSITIONS.student_t3[field] ?? { x: 50, y: 50 };
  const fieldStyle = (field: string): React.CSSProperties => ({
    position: "absolute",
    left: `${fp(field).x}%`,
    top: `${fp(field).y}%`,
    cursor: editMode ? "move" : "default",
    outline: editMode ? "1.5px dashed #10b981" : "none",
    padding: "1px 3px",
    borderRadius: 2,
    userSelect: "none",
    zIndex: 10,
  });

  return (
    <div
      style={{
        width: 397,
        height: 548,
        background: "#0f172a",
        borderRadius: 10,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Top accent stripe */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 8,
          background: "linear-gradient(90deg,#10b981,#059669)",
        }}
      />

      {/* Header */}
      <div
        style={{
          padding: "16px 14px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 8,
        }}
      >
        <div>
          <div
            style={{
              color: "#10b981",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: 0.8,
            }}
          >
            {SCHOOL.name.toUpperCase()}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: 8.5,
              marginTop: 2,
            }}
          >
            {SCHOOL.affiliation}
          </div>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 8 }}>
            {SCHOOL.address}
          </div>
        </div>
        <div
          style={{
            background: "#10b981",
            borderRadius: 4,
            padding: "3px 8px",
            color: "#fff",
            fontSize: 8.5,
            fontWeight: 700,
          }}
        >
          STUDENT
        </div>
      </div>

      {/* Photo */}
      <div
        onMouseDown={editMode ? (e) => onMouseDown("photo", e) : undefined}
        style={{
          ...fieldStyle("photo"),
          width: 88,
          height: 108,
          background: "rgba(255,255,255,0.06)",
          border: "2px dashed rgba(16,185,129,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          transform: "translateX(-50%)",
        }}
      >
        <span style={{ fontSize: 34 }}>👤</span>
        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.4)" }}>
          PHOTO
        </span>
      </div>

      <div
        onMouseDown={editMode ? (e) => onMouseDown("name", e) : undefined}
        style={fieldStyle("name")}
      >
        <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>
          {student.name}
        </div>
      </div>
      <div
        onMouseDown={editMode ? (e) => onMouseDown("class", e) : undefined}
        style={fieldStyle("class")}
      >
        <div style={{ fontSize: 8.5, color: "#10b981" }}>CLASS / SECTION</div>
        <div style={{ fontWeight: 600, fontSize: 11, color: "#e2e8f0" }}>
          Class {student.class} - Sec {student.section}
        </div>
      </div>
      <div
        onMouseDown={editMode ? (e) => onMouseDown("dob", e) : undefined}
        style={fieldStyle("dob")}
      >
        <div style={{ fontSize: 8.5, color: "#10b981" }}>DATE OF BIRTH</div>
        <div style={{ fontWeight: 600, fontSize: 11, color: "#e2e8f0" }}>
          {student.dob}
        </div>
      </div>
      <div
        onMouseDown={editMode ? (e) => onMouseDown("blood", e) : undefined}
        style={fieldStyle("blood")}
      >
        <div style={{ fontSize: 8.5, color: "#10b981" }}>BLOOD GROUP</div>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#f87171" }}>
          {student.blood}
        </div>
      </div>
      <div
        onMouseDown={editMode ? (e) => onMouseDown("admNo", e) : undefined}
        style={fieldStyle("admNo")}
      >
        <div style={{ fontSize: 8.5, color: "#10b981" }}>ADM NO</div>
        <div style={{ fontWeight: 600, fontSize: 11, color: "#e2e8f0" }}>
          {student.admNo}
        </div>
      </div>
      <div
        onMouseDown={editMode ? (e) => onMouseDown("contact", e) : undefined}
        style={fieldStyle("contact")}
      >
        <div style={{ fontSize: 8.5, color: "#10b981" }}>CONTACT</div>
        <div style={{ fontWeight: 600, fontSize: 11, color: "#e2e8f0" }}>
          {student.contact}
        </div>
      </div>

      {/* QR placeholder */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          right: 14,
          width: 54,
          height: 54,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(16,185,129,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
        }}
      >
        ▦
      </div>

      {/* Bottom bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 8,
          background: "linear-gradient(90deg,#059669,#10b981)",
        }}
      />
    </div>
  );
}

function StudentCardT4({
  student,
  positions,
  editMode,
  onMouseDown,
}: {
  student: Student;
  positions: FieldPositions;
  editMode: boolean;
  onMouseDown: (field: string, e: React.MouseEvent) => void;
}) {
  const fp = (field: string) =>
    positions[field] ?? DEFAULT_POSITIONS.student_t4[field] ?? { x: 50, y: 50 };
  const fieldStyle = (field: string): React.CSSProperties => ({
    position: "absolute",
    left: `${fp(field).x}%`,
    top: `${fp(field).y}%`,
    cursor: editMode ? "move" : "default",
    outline: editMode ? "1.5px dashed #f59e0b" : "none",
    padding: "1px 3px",
    borderRadius: 2,
    userSelect: "none",
    zIndex: 10,
  });

  return (
    <div
      style={{
        width: 397,
        height: 548,
        background: "#fff",
        borderRadius: 10,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        fontFamily: "Arial, sans-serif",
        border: "2px solid #f59e0b",
      }}
    >
      {/* Top gradient header */}
      <div
        style={{
          background: "linear-gradient(135deg,#b45309,#d97706,#f59e0b)",
          height: 100,
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            background: "rgba(255,255,255,0.25)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
          }}
        >
          🏫
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: 0.6,
              textShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}
          >
            {SCHOOL.name.toUpperCase()}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: 9,
              marginTop: 2,
            }}
          >
            {SCHOOL.affiliation}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: 8.5,
              marginTop: 1,
            }}
          >
            {SCHOOL.address}
          </div>
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: 4,
            padding: "3px 8px",
            color: "#fff",
            fontSize: 8.5,
            fontWeight: 700,
          }}
        >
          STUDENT ID
        </div>
      </div>

      {/* Decorative gold stripe */}
      <div
        style={{
          height: 4,
          background: "linear-gradient(90deg,#f59e0b,#fbbf24,#f59e0b)",
        }}
      />

      {/* Photo */}
      <div
        onMouseDown={editMode ? (e) => onMouseDown("photo", e) : undefined}
        style={{
          ...fieldStyle("photo"),
          width: 90,
          height: 110,
          background: "#fef3c7",
          border: "2px dashed #f59e0b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          transform: "translateX(-50%)",
        }}
      >
        <span style={{ fontSize: 36 }}>👤</span>
        <span style={{ fontSize: 8, color: "#b45309" }}>PHOTO</span>
      </div>

      {/* Name */}
      <div
        onMouseDown={editMode ? (e) => onMouseDown("name", e) : undefined}
        style={fieldStyle("name")}
      >
        <div style={{ fontWeight: 700, fontSize: 14, color: "#92400e" }}>
          {student.name}
        </div>
      </div>

      {/* Class */}
      <div
        onMouseDown={editMode ? (e) => onMouseDown("class", e) : undefined}
        style={fieldStyle("class")}
      >
        <div style={{ fontSize: 8.5, color: "#b45309" }}>
          CLASS &amp; SECTION
        </div>
        <div style={{ fontWeight: 600, fontSize: 11, color: "#1e293b" }}>
          Class {student.class} - {student.section}
        </div>
      </div>

      {/* Roll No */}
      <div
        onMouseDown={editMode ? (e) => onMouseDown("rollNo", e) : undefined}
        style={fieldStyle("rollNo")}
      >
        <div style={{ fontSize: 8.5, color: "#b45309" }}>ROLL NO</div>
        <div style={{ fontWeight: 600, fontSize: 11, color: "#1e293b" }}>
          {student.rollNo}
        </div>
      </div>

      {/* DOB */}
      <div
        onMouseDown={editMode ? (e) => onMouseDown("dob", e) : undefined}
        style={fieldStyle("dob")}
      >
        <div style={{ fontSize: 8.5, color: "#b45309" }}>DATE OF BIRTH</div>
        <div style={{ fontWeight: 600, fontSize: 11, color: "#1e293b" }}>
          {student.dob}
        </div>
      </div>

      {/* Blood */}
      <div
        onMouseDown={editMode ? (e) => onMouseDown("blood", e) : undefined}
        style={fieldStyle("blood")}
      >
        <div style={{ fontSize: 8.5, color: "#b45309" }}>BLOOD GROUP</div>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#dc2626" }}>
          {student.blood}
        </div>
      </div>

      {/* Adm No */}
      <div
        onMouseDown={editMode ? (e) => onMouseDown("admNo", e) : undefined}
        style={fieldStyle("admNo")}
      >
        <div style={{ fontSize: 8.5, color: "#b45309" }}>ADM NO</div>
        <div style={{ fontWeight: 600, fontSize: 11, color: "#1e293b" }}>
          {student.admNo}
        </div>
      </div>

      {/* Contact */}
      <div
        onMouseDown={editMode ? (e) => onMouseDown("contact", e) : undefined}
        style={fieldStyle("contact")}
      >
        <div style={{ fontSize: 8.5, color: "#b45309" }}>CONTACT</div>
        <div style={{ fontWeight: 600, fontSize: 11, color: "#1e293b" }}>
          {student.contact}
        </div>
      </div>

      {/* Signature row */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "space-around",
          padding: "0 14px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 80,
              height: 1,
              background: "#d97706",
              margin: "0 auto 3px",
            }}
          />
          <div style={{ fontSize: 8, color: "#b45309" }}>Student Signature</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 80,
              height: 1,
              background: "#d97706",
              margin: "0 auto 3px",
            }}
          />
          <div style={{ fontSize: 8, color: "#b45309" }}>Principal</div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "linear-gradient(135deg,#b45309,#d97706)",
          height: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 8.5 }}>
          {SCHOOL.phone} | {SCHOOL.email}
        </div>
      </div>
    </div>
  );
}

// ─── Staff ID Card Templates ──────────────────────────────────────────────────

function StaffCardTA({
  staff,
  positions,
  editMode,
  onMouseDown,
}: {
  staff: Staff;
  positions: FieldPositions;
  editMode: boolean;
  onMouseDown: (field: string, e: React.MouseEvent) => void;
}) {
  const fp = (field: string) =>
    positions[field] ?? DEFAULT_POSITIONS.staff_ta[field] ?? { x: 50, y: 50 };
  const fieldStyle = (field: string): React.CSSProperties => ({
    position: "absolute",
    left: `${fp(field).x}%`,
    top: `${fp(field).y}%`,
    cursor: editMode ? "move" : "default",
    outline: editMode ? "1.5px dashed #f97316" : "none",
    padding: "1px 3px",
    borderRadius: 2,
    userSelect: "none",
    zIndex: 10,
  });

  return (
    <div
      style={{
        width: 340,
        height: 215,
        background: "#fff",
        borderRadius: 8,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg,#c2410c,#ea580c)",
          height: 50,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            background: "rgba(255,255,255,0.2)",
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 18,
          }}
        >
          🏫
        </div>
        <div>
          <div
            style={{
              color: "#fff",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: 0.5,
            }}
          >
            {SCHOOL.name.toUpperCase()}
          </div>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 8 }}>
            {SCHOOL.affiliation}
          </div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            background: "rgba(255,255,255,0.15)",
            borderRadius: 4,
            padding: "2px 6px",
            color: "#fff",
            fontSize: 8,
            fontWeight: 600,
          }}
        >
          STAFF ID
        </div>
      </div>

      <div
        onMouseDown={editMode ? (e) => onMouseDown("photo", e) : undefined}
        style={{
          ...fieldStyle("photo"),
          width: 55,
          height: 68,
          background: "#e5e7eb",
          border: "1.5px dashed #94a3b8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <span style={{ fontSize: 22 }}>👤</span>
        <span style={{ fontSize: 7, color: "#64748b" }}>PHOTO</span>
      </div>

      <div
        onMouseDown={editMode ? (e) => onMouseDown("name", e) : undefined}
        style={fieldStyle("name")}
      >
        <div style={{ fontWeight: 700, fontSize: 11, color: "#1e293b" }}>
          {staff.name}
        </div>
      </div>
      <div
        onMouseDown={
          editMode ? (e) => onMouseDown("designation", e) : undefined
        }
        style={fieldStyle("designation")}
      >
        <div style={{ fontSize: 9, color: "#64748b" }}>Designation</div>
        <div style={{ fontWeight: 600, fontSize: 10, color: "#c2410c" }}>
          {staff.designation}
        </div>
      </div>
      <div
        onMouseDown={editMode ? (e) => onMouseDown("department", e) : undefined}
        style={fieldStyle("department")}
      >
        <div style={{ fontSize: 9, color: "#64748b" }}>Department</div>
        <div style={{ fontWeight: 600, fontSize: 10, color: "#1e293b" }}>
          {staff.department}
        </div>
      </div>
      <div
        onMouseDown={editMode ? (e) => onMouseDown("empId", e) : undefined}
        style={fieldStyle("empId")}
      >
        <div style={{ fontSize: 9, color: "#64748b" }}>Employee ID</div>
        <div style={{ fontWeight: 600, fontSize: 10, color: "#1e293b" }}>
          {staff.empId}
        </div>
      </div>
      <div
        onMouseDown={editMode ? (e) => onMouseDown("contact", e) : undefined}
        style={fieldStyle("contact")}
      >
        <div style={{ fontSize: 9, color: "#64748b" }}>Contact</div>
        <div style={{ fontWeight: 600, fontSize: 10, color: "#1e293b" }}>
          {staff.contact}
        </div>
      </div>
      <div
        onMouseDown={editMode ? (e) => onMouseDown("blood", e) : undefined}
        style={fieldStyle("blood")}
      >
        <div style={{ fontSize: 9, color: "#64748b" }}>Blood Group</div>
        <div style={{ fontWeight: 700, fontSize: 11, color: "#dc2626" }}>
          {staff.blood}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#c2410c",
          height: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 7 }}>
          {SCHOOL.address} | {SCHOOL.phone}
        </div>
      </div>
    </div>
  );
}

function StaffCardTB({
  staff,
  positions,
  editMode,
  onMouseDown,
}: {
  staff: Staff;
  positions: FieldPositions;
  editMode: boolean;
  onMouseDown: (field: string, e: React.MouseEvent) => void;
}) {
  const fp = (field: string) =>
    positions[field] ?? DEFAULT_POSITIONS.staff_tb[field] ?? { x: 50, y: 50 };
  const fieldStyle = (field: string): React.CSSProperties => ({
    position: "absolute",
    left: `${fp(field).x}%`,
    top: `${fp(field).y}%`,
    cursor: editMode ? "move" : "default",
    outline: editMode ? "1.5px dashed #f97316" : "none",
    padding: "1px 3px",
    borderRadius: 2,
    userSelect: "none",
    zIndex: 10,
  });

  return (
    <div
      style={{
        width: 215,
        height: 340,
        background: "linear-gradient(180deg,#0f172a,#1e293b)",
        borderRadius: 12,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        fontFamily: "Arial, sans-serif",
        border: "1px solid rgba(249,115,22,0.3)",
      }}
    >
      {/* Top accent */}
      <div
        style={{
          height: 6,
          background: "linear-gradient(90deg,#f97316,#ea580c)",
        }}
      />

      {/* School header */}
      <div style={{ padding: "12px 12px 0", textAlign: "center" }}>
        <div
          style={{
            width: 36,
            height: 36,
            background: "rgba(249,115,22,0.15)",
            border: "2px solid rgba(249,115,22,0.4)",
            borderRadius: 8,
            margin: "0 auto 6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          🏫
        </div>
        <div
          style={{
            color: "#f97316",
            fontWeight: 700,
            fontSize: 9,
            letterSpacing: 1,
          }}
        >
          {SCHOOL.name.toUpperCase()}
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: 7.5,
            marginTop: 2,
          }}
        >
          STAFF IDENTITY CARD
        </div>
      </div>

      {/* Photo */}
      <div
        onMouseDown={editMode ? (e) => onMouseDown("photo", e) : undefined}
        style={{
          ...fieldStyle("photo"),
          width: 70,
          height: 70,
          borderRadius: "50%",
          background: "rgba(249,115,22,0.1)",
          border: "2px solid rgba(249,115,22,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "translateX(-50%)",
        }}
      >
        <span style={{ fontSize: 28 }}>👤</span>
      </div>

      <div
        onMouseDown={editMode ? (e) => onMouseDown("name", e) : undefined}
        style={{
          ...fieldStyle("name"),
          width: "75%",
          textAlign: "center",
          transform: "translateX(-50%)",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 12, color: "#fff" }}>
          {staff.name}
        </div>
      </div>
      <div
        onMouseDown={
          editMode ? (e) => onMouseDown("designation", e) : undefined
        }
        style={{
          ...fieldStyle("designation"),
          width: "75%",
          textAlign: "center",
          transform: "translateX(-50%)",
        }}
      >
        <div style={{ fontSize: 9, color: "#f97316", fontWeight: 600 }}>
          {staff.designation}
        </div>
      </div>
      <div
        onMouseDown={editMode ? (e) => onMouseDown("empId", e) : undefined}
        style={{ ...fieldStyle("empId"), width: "50%" }}
      >
        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)" }}>
          EMP ID
        </div>
        <div style={{ fontWeight: 600, fontSize: 10, color: "#fff" }}>
          {staff.empId}
        </div>
      </div>
      <div
        onMouseDown={editMode ? (e) => onMouseDown("contact", e) : undefined}
        style={{ ...fieldStyle("contact"), width: "50%" }}
      >
        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)" }}>
          CONTACT
        </div>
        <div style={{ fontWeight: 600, fontSize: 10, color: "#fff" }}>
          {staff.contact}
        </div>
      </div>
      <div
        onMouseDown={editMode ? (e) => onMouseDown("blood", e) : undefined}
        style={{ ...fieldStyle("blood"), width: "30%" }}
      >
        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)" }}>BLOOD</div>
        <div style={{ fontWeight: 700, fontSize: 11, color: "#fca5a5" }}>
          {staff.blood}
        </div>
      </div>

      {/* Barcode */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 32,
          background: "rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
        }}
      >
        {Array.from({ length: 32 }, (_, i) => i).map((i) => (
          <div
            key={`bar-${i}`}
            style={{
              width: i % 3 === 0 ? 3 : 1.5,
              height: i % 5 === 0 ? 20 : 14,
              background: "rgba(249,115,22,0.7)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Student ID Card Tab ──────────────────────────────────────────────────────

const ALL_ID_FIELDS = [
  { key: "photo", label: "Photo" },
  { key: "name", label: "Student Name" },
  { key: "fatherName", label: "Father Name" },
  { key: "className", label: "Class" },
  { key: "section", label: "Section" },
  { key: "rollNo", label: "Roll No" },
  { key: "dob", label: "Date of Birth" },
  { key: "blood", label: "Blood Group" },
  { key: "admNo", label: "Adm. No" },
  { key: "contact", label: "Contact" },
  { key: "schoolName", label: "School Name" },
  { key: "validTill", label: "Valid Till" },
  { key: "qrCode", label: "QR Code" },
];

function StudentIDTab() {
  const [template, setTemplate] = useState<"t1" | "t2" | "t3" | "t4">("t1");
  const [students, setStudents] = useState<Student[]>(() =>
    loadStudentsFromLS(),
  );
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkClass, setBulkClass] = useState("");

  // ─ ID Card Customizer State ─
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [bgImages, setBgImages] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem("idcard_bg_images") || "{}");
    } catch {
      return {};
    }
  });
  const [visibleFields, setVisibleFields] = useState<Record<string, string[]>>(
    () => {
      try {
        return JSON.parse(
          localStorage.getItem("idcard_visible_fields") || "{}",
        );
      } catch {
        return {};
      }
    },
  );
  const [fontSizes, setFontSizes] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem("idcard_font_sizes") || "{}");
    } catch {
      return {};
    }
  });
  const [fontColors, setFontColors] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem("idcard_font_colors") || "{}");
    } catch {
      return {};
    }
  });
  const [defaultTemplate, setDefaultTemplate] = useState<string>(
    () => localStorage.getItem("idcard_default_template") || "t1",
  );
  const bgFileRef = useRef<HTMLInputElement>(null);

  const custKey = `student_${template}`;
  const curBg = bgImages[custKey] || "";
  const curVisible = visibleFields[custKey] || ALL_ID_FIELDS.map((f) => f.key);
  const curFontSize = fontSizes[custKey] || 10;
  const curFontColor = fontColors[custKey] || "#1e293b";

  function saveCustomization() {
    localStorage.setItem("idcard_bg_images", JSON.stringify(bgImages));
    localStorage.setItem(
      "idcard_visible_fields",
      JSON.stringify(visibleFields),
    );
    localStorage.setItem("idcard_font_sizes", JSON.stringify(fontSizes));
    localStorage.setItem("idcard_font_colors", JSON.stringify(fontColors));
    localStorage.setItem("idcard_default_template", defaultTemplate);
  }

  function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      setBgImages((prev) => ({ ...prev, [custKey]: b64 }));
    };
    reader.readAsDataURL(file);
  }

  function toggleField(fieldKey: string) {
    const cur = visibleFields[custKey] || ALL_ID_FIELDS.map((f) => f.key);
    const next = cur.includes(fieldKey)
      ? cur.filter((k) => k !== fieldKey)
      : [...cur, fieldKey];
    setVisibleFields((prev) => ({ ...prev, [custKey]: next }));
  }

  // Load fresh data and handle pre-selection from Students page
  useEffect(() => {
    const fresh = loadStudentsFromLS();
    setStudents(fresh);
    if (fresh.length > 0) {
      setBulkClass(fresh[0].class);
    }
    try {
      const presel = localStorage.getItem("cert_selected_student");
      if (presel) {
        const sel = JSON.parse(presel);
        const idx = fresh.findIndex((s) => s.admNo === sel.admNo);
        if (idx >= 0) setSelectedIdx(idx);
        localStorage.removeItem("cert_selected_student");
      }
    } catch {
      /* ignore */
    }
  }, []);

  const student = students[selectedIdx] ?? students[0] ?? FALLBACK_STUDENTS[0];

  const templateKey = `student_${template}`;
  const { positions, containerRef, onMouseDown, resetPositions } =
    useDraggableFields(templateKey, [
      "photo",
      "name",
      "class",
      "rollNo",
      "dob",
      "blood",
      "admNo",
      "contact",
    ]);

  const renderCard = (
    s: Student,
    pos: FieldPositions,
    em: boolean,
    omd: (f: string, e: React.MouseEvent) => void,
  ) => {
    if (template === "t1")
      return (
        <StudentCardT1
          student={s}
          positions={pos}
          editMode={em}
          onMouseDown={omd}
        />
      );
    if (template === "t2")
      return (
        <StudentCardT2
          student={s}
          positions={pos}
          editMode={em}
          onMouseDown={omd}
        />
      );
    if (template === "t3")
      return (
        <StudentCardT3
          student={s}
          positions={pos}
          editMode={em}
          onMouseDown={omd}
        />
      );
    return (
      <StudentCardT4
        student={s}
        positions={pos}
        editMode={em}
        onMouseDown={omd}
      />
    );
  };

  const bulkStudents = students.filter((s) => s.class === bulkClass);

  return (
    <div className="space-y-5">
      {/* Controls row */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <Label className="text-gray-400 text-xs mb-1 block">
            Select Template
          </Label>
          <div className="flex gap-2 flex-wrap">
            {(["t1", "t2", "t3", "t4"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTemplate(t);
                  setEditMode(false);
                }}
                className={`px-3 py-1.5 rounded text-xs font-medium border transition flex items-center gap-1 ${
                  template === t
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-400"
                }`}
              >
                {defaultTemplate === t && (
                  <Star className="w-3 h-3 text-yellow-400" />
                )}
                {t === "t1"
                  ? "Size 1 (105×145mm)"
                  : t === "t2"
                    ? "Size 2 (105×145mm)"
                    : t === "t3"
                      ? "Size 3 (105×145mm)"
                      : "Size 4 (105×145mm)"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-gray-400 text-xs mb-1 block">
            Select Student
          </Label>
          <select
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
            className="bg-gray-800 border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none"
          >
            {students.map((s, i) => (
              <option key={s.admNo} value={i}>
                {s.name} ({s.admNo})
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button
            size="sm"
            variant={editMode ? "default" : "outline"}
            onClick={() => setEditMode((e) => !e)}
            className={
              editMode
                ? "bg-amber-600 hover:bg-amber-700 border-amber-500"
                : "border-gray-600 text-gray-300"
            }
            data-ocid="cert.student.edit_button"
          >
            <Move className="w-3 h-3 mr-1" />
            {editMode ? "Exit Edit" : "Edit Layout"}
          </Button>
          {editMode && (
            <Button
              size="sm"
              variant="outline"
              onClick={resetPositions}
              className="border-gray-600 text-gray-300"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => printArea("student-card-print")}
            className="border-gray-600 text-gray-300"
            data-ocid="cert.student.primary_button"
          >
            <Printer className="w-3 h-3 mr-1" />
            Print Card
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCustomizer((v) => !v)}
            className="border-purple-600 text-purple-300 hover:bg-purple-900/30"
            data-ocid="cert.student.open_modal_button"
          >
            <Settings2 className="w-3 h-3 mr-1" />
            Customize
          </Button>
          <Button
            size="sm"
            onClick={() => setBulkModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
            data-ocid="cert.student.secondary_button"
          >
            <Users className="w-3 h-3 mr-1" />
            Bulk Generate
          </Button>
        </div>
      </div>

      {/* Customizer Panel */}
      {showCustomizer && (
        <div
          className="rounded-xl p-5 border"
          style={{ background: "#12172a", border: "1px solid #4c1d95" }}
          data-ocid="cert.student.panel"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-purple-400" />
              <h4 className="text-purple-200 font-semibold text-sm">
                ID Card Customizer — {template.toUpperCase()}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setShowCustomizer(false)}
              className="text-gray-400 hover:text-white"
              data-ocid="cert.student.close_button"
            >
              <XIcon size={16} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {/* Background Image */}
            <div>
              <p className="text-gray-400 text-xs font-medium mb-2 flex items-center gap-1">
                <Upload size={12} /> Background Image
              </p>
              {curBg ? (
                <div className="relative">
                  <img
                    src={curBg}
                    alt="bg"
                    className="w-full h-24 object-cover rounded-lg border border-gray-600 mb-1"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setBgImages((prev) => {
                        const n = { ...prev };
                        delete n[custKey];
                        return n;
                      })
                    }
                    className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 rounded-full p-0.5 text-white"
                  >
                    <XIcon size={10} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full h-24 rounded-lg border-2 border-dashed border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 transition"
                  onClick={() => bgFileRef.current?.click()}
                >
                  <Upload size={16} className="text-gray-500 mb-1" />
                  <span className="text-gray-500 text-[10px]">
                    Click to upload
                  </span>
                </button>
              )}
              <input
                ref={bgFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBgUpload}
              />
              {!curBg && (
                <button
                  type="button"
                  onClick={() => bgFileRef.current?.click()}
                  className="mt-1 w-full text-[10px] text-purple-400 hover:text-purple-300 underline"
                  data-ocid="cert.student.upload_button"
                >
                  Upload background image
                </button>
              )}
            </div>

            {/* Font Controls */}
            <div>
              <p className="text-gray-400 text-xs font-medium mb-2 flex items-center gap-1">
                <Palette size={12} /> Font Style
              </p>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Font Size</span>
                    <span className="text-white">{curFontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={18}
                    value={curFontSize}
                    onChange={(e) =>
                      setFontSizes((prev) => ({
                        ...prev,
                        [custKey]: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-purple-500"
                    data-ocid="cert.student.input"
                  />
                  <div className="flex justify-between text-[9px] text-gray-600">
                    <span>8px</span>
                    <span>18px</span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-1">Font Color</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={curFontColor}
                      onChange={(e) =>
                        setFontColors((prev) => ({
                          ...prev,
                          [custKey]: e.target.value,
                        }))
                      }
                      className="w-8 h-8 rounded cursor-pointer border border-gray-600"
                      data-ocid="cert.student.input"
                    />
                    <span className="text-gray-400 text-xs font-mono">
                      {curFontColor}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Field Checkboxes */}
            <div>
              <p className="text-gray-400 text-xs font-medium mb-2">
                Visible Fields
              </p>
              <div className="grid grid-cols-2 gap-1">
                {ALL_ID_FIELDS.map((f) => (
                  <label
                    key={f.key}
                    className="flex items-center gap-1.5 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={curVisible.includes(f.key)}
                      onChange={() => toggleField(f.key)}
                      className="accent-purple-500"
                      data-ocid="cert.student.checkbox"
                    />
                    <span className="text-gray-300 text-[10px] group-hover:text-white">
                      {f.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700">
            <button
              type="button"
              onClick={() => {
                setDefaultTemplate(template);
                localStorage.setItem("idcard_default_template", template);
              }}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition ${defaultTemplate === template ? "border-yellow-500 text-yellow-400 bg-yellow-900/20" : "border-gray-600 text-gray-400 hover:border-yellow-500 hover:text-yellow-400"}`}
              data-ocid="cert.student.toggle"
            >
              <Star size={12} />
              {defaultTemplate === template
                ? "⭐ Default Template"
                : "Set as Default"}
            </button>
            <button
              type="button"
              onClick={() => {
                saveCustomization();
                setShowCustomizer(false);
              }}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs px-4 py-1.5 rounded"
              data-ocid="cert.student.save_button"
            >
              <Save size={12} />
              Save Customization
            </button>
          </div>
        </div>
      )}

      {editMode && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg px-4 py-2 text-amber-300 text-xs flex items-center gap-2">
          <Move className="w-3 h-3" />
          <span>
            Edit mode active — drag any field to reposition it. Positions are
            saved automatically.
          </span>
        </div>
      )}

      {/* Card Preview */}
      <div className="flex justify-center">
        <div
          ref={containerRef}
          id="student-card-print"
          style={{
            position: "relative",
            width: 397,
            height: 548,
            userSelect: "none",
          }}
        >
          {renderCard(student, positions, editMode, onMouseDown)}
        </div>
      </div>

      {/* Card info */}
      <div className="text-center">
        <p className="text-gray-500 text-xs">
          {"105 × 145mm (ID card)"} &nbsp;•&nbsp; Viewing:{" "}
          <span className="text-white font-medium">{student.name}</span>
        </p>
      </div>

      {/* Bulk Print Modal */}
      <Dialog open={bulkModal} onOpenChange={setBulkModal}>
        <DialogContent className="max-w-3xl bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Bulk Generate ID Cards</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Label className="text-gray-400 text-sm">Select Class:</Label>
              <select
                value={bulkClass}
                onChange={(e) => setBulkClass(e.target.value)}
                className="bg-gray-800 border border-gray-600 text-white text-sm rounded px-2 py-1.5 outline-none"
              >
                {["5", "7", "10"].map((c) => (
                  <option key={c} value={c}>
                    Class {c}
                  </option>
                ))}
              </select>
              <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                {bulkStudents.length} students
              </Badge>
            </div>
            <div
              id="bulk-print-area"
              className="grid grid-cols-2 gap-4 bg-gray-800 p-4 rounded-lg overflow-auto max-h-96"
            >
              {bulkStudents.length === 0 ? (
                <p className="col-span-2 text-center text-gray-500 py-8">
                  No students found for this class.
                </p>
              ) : (
                bulkStudents.map((s) => (
                  <div key={s.admNo} style={{ display: "inline-block" }}>
                    {renderCard(s, positions, false, () => {})}
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setBulkModal(false)}
                className="border-gray-600 text-gray-300"
                data-ocid="cert.bulk.cancel_button"
              >
                Close
              </Button>
              <Button
                onClick={() => printArea("bulk-print-area")}
                className="bg-blue-600 hover:bg-blue-700"
                data-ocid="cert.bulk.primary_button"
              >
                <Printer className="w-3 h-3 mr-1" />
                Print All
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Staff ID Card Tab ────────────────────────────────────────────────────────

function StaffIDTab() {
  const [template, setTemplate] = useState<"ta" | "tb">("ta");
  const [staffList, setStaffList] = useState<Staff[]>(() => loadStaffFromLS());
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [customStaff, setCustomStaff] = useState<Staff>(
    () => loadStaffFromLS()[0] ?? FALLBACK_STAFF[0],
  );
  const [useCustom, setUseCustom] = useState(false);

  useEffect(() => {
    const fresh = loadStaffFromLS();
    setStaffList(fresh);
    if (fresh.length > 0) setCustomStaff(fresh[0]);
  }, []);

  const staff = useCustom
    ? customStaff
    : (staffList[selectedIdx] ?? staffList[0] ?? FALLBACK_STAFF[0]);
  const templateKey = `staff_${template}`;

  const { positions, containerRef, onMouseDown, resetPositions } =
    useDraggableFields(templateKey, [
      "photo",
      "name",
      "designation",
      "department",
      "empId",
      "contact",
      "blood",
    ]);

  const isVertical = template === "tb";

  const renderCard = (
    s: Staff,
    pos: FieldPositions,
    em: boolean,
    omd: (f: string, e: React.MouseEvent) => void,
  ) => {
    if (template === "ta")
      return (
        <StaffCardTA
          staff={s}
          positions={pos}
          editMode={em}
          onMouseDown={omd}
        />
      );
    return (
      <StaffCardTB staff={s} positions={pos} editMode={em} onMouseDown={omd} />
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <Label className="text-gray-400 text-xs mb-1 block">
            Select Template
          </Label>
          <div className="flex gap-2">
            {(["ta", "tb"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTemplate(t);
                  setEditMode(false);
                }}
                className={`px-3 py-1.5 rounded text-xs font-medium border transition ${
                  template === t
                    ? "bg-orange-600 border-orange-500 text-white"
                    : "bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-400"
                }`}
              >
                {t === "ta" ? "Professional Horizontal" : "Vertical Badge"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-gray-400 text-xs mb-1 block">
            Staff Member
          </Label>
          <div className="flex gap-2 items-center">
            <select
              value={selectedIdx}
              onChange={(e) => {
                setSelectedIdx(Number(e.target.value));
                setUseCustom(false);
              }}
              disabled={useCustom}
              className="bg-gray-800 border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none disabled:opacity-50"
            >
              {staffList.map((s, i) => (
                <option key={s.empId} value={i}>
                  {s.name} ({s.empId})
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={useCustom}
                onChange={(e) => setUseCustom(e.target.checked)}
                className="accent-orange-500"
              />
              Custom
            </label>
          </div>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button
            size="sm"
            variant={editMode ? "default" : "outline"}
            onClick={() => setEditMode((e) => !e)}
            className={
              editMode
                ? "bg-amber-600 hover:bg-amber-700 border-amber-500"
                : "border-gray-600 text-gray-300"
            }
            data-ocid="cert.staff.edit_button"
          >
            <Move className="w-3 h-3 mr-1" />
            {editMode ? "Exit Edit" : "Edit Layout"}
          </Button>
          {editMode && (
            <Button
              size="sm"
              variant="outline"
              onClick={resetPositions}
              className="border-gray-600 text-gray-300"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => printArea("staff-card-print")}
            className="border-gray-600 text-gray-300"
            data-ocid="cert.staff.primary_button"
          >
            <Printer className="w-3 h-3 mr-1" />
            Print Card
          </Button>
        </div>
      </div>

      {/* Custom staff form */}
      {useCustom && (
        <div className="grid grid-cols-3 gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          {(
            [
              ["name", "Full Name"],
              ["designation", "Designation"],
              ["department", "Department"],
              ["empId", "Employee ID"],
              ["contact", "Contact No."],
              ["blood", "Blood Group"],
            ] as [keyof Staff, string][]
          ).map(([key, label]) => (
            <div key={key}>
              <Label className="text-gray-400 text-xs mb-1 block">
                {label}
              </Label>
              <Input
                value={customStaff[key]}
                onChange={(e) =>
                  setCustomStaff((prev) => ({ ...prev, [key]: e.target.value }))
                }
                className="bg-gray-800 border-gray-600 text-white text-xs h-8"
                data-ocid="cert.staff.input"
              />
            </div>
          ))}
        </div>
      )}

      {editMode && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg px-4 py-2 text-amber-300 text-xs flex items-center gap-2">
          <Move className="w-3 h-3" />
          <span>Edit mode active — drag any field to reposition it.</span>
        </div>
      )}

      <div className="flex justify-center">
        <div
          ref={containerRef}
          id="staff-card-print"
          style={{
            position: "relative",
            width: isVertical ? 215 : 340,
            height: isVertical ? 340 : 215,
            userSelect: "none",
          }}
        >
          {renderCard(staff, positions, editMode, onMouseDown)}
        </div>
      </div>
    </div>
  );
}

// ─── Transfer Certificate Tab ─────────────────────────────────────────────────

function TCTab() {
  const [tcStudents] = useState<Student[]>(() => loadStudentsFromLS());
  const [selectedStudent, setSelectedStudent] = useState<Student>(() => {
    const s = loadStudentsFromLS();
    return s[0] ?? FALLBACK_STUDENTS[0];
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [form, setForm] = useState({
    serialNo: "TC-2024-001",
    date: new Date().toLocaleDateString("en-IN"),
    dobWords: "Twelfth March Two Thousand Fourteen",
    nationality: "Indian",
    caste: "General",
    scst: "No",
    admissionDate: "01/04/2020",
    board: "CBSE",
    failed: "No",
    subjects: "Hindi, English, Mathematics, Science, Social Science",
    lastAttended: new Date().toLocaleDateString("en-IN"),
    reason: "Family relocated to another city",
    conduct: "Excellent",
    workingDays: "220",
    daysPresent: "198",
    games: "Cricket, Drawing",
    feesPaidUpto: "March 2024",
    dues: "None",
  });

  const handleStudentChange = (admNo: string) => {
    const s = tcStudents.find((st) => st.admNo === admNo);
    if (s) setSelectedStudent(s);
  };

  const set = (k: string, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-gray-400 text-xs mb-1 block">
            Select Student
          </Label>
          <select
            value={selectedStudent.admNo}
            onChange={(e) => handleStudentChange(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none"
            data-ocid="cert.tc.select"
          >
            {tcStudents.map((s) => (
              <option key={s.admNo} value={s.admNo}>
                {s.name} ({s.admNo})
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-gray-400 text-xs mb-1 block">Serial No.</Label>
          <Input
            value={form.serialNo}
            onChange={(e) => set("serialNo", e.target.value)}
            className="bg-gray-800 border-gray-600 text-white text-xs h-8"
            data-ocid="cert.tc.input"
          />
        </div>
        <div>
          <Label className="text-gray-400 text-xs mb-1 block">Date</Label>
          <Input
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            className="bg-gray-800 border-gray-600 text-white text-xs h-8"
          />
        </div>
      </div>

      <div className="p-4 bg-gray-800/40 rounded-lg border border-gray-700 space-y-3">
        <h3 className="text-white text-sm font-semibold">Student Details</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">
              D.O.B in Words
            </Label>
            <Input
              value={form.dobWords}
              onChange={(e) => set("dobWords", e.target.value)}
              className="bg-gray-800 border-gray-600 text-white text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">
              Nationality
            </Label>
            <Input
              value={form.nationality}
              onChange={(e) => set("nationality", e.target.value)}
              className="bg-gray-800 border-gray-600 text-white text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">
              Caste / Category
            </Label>
            <Input
              value={form.caste}
              onChange={(e) => set("caste", e.target.value)}
              className="bg-gray-800 border-gray-600 text-white text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">
              Belongs to SC/ST
            </Label>
            <select
              value={form.scst}
              onChange={(e) => set("scst", e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none"
            >
              <option>No</option>
              <option>Yes</option>
            </select>
          </div>
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">
              Date of Admission
            </Label>
            <Input
              value={form.admissionDate}
              onChange={(e) => set("admissionDate", e.target.value)}
              className="bg-gray-800 border-gray-600 text-white text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">
              Board / Annual Exam
            </Label>
            <Input
              value={form.board}
              onChange={(e) => set("board", e.target.value)}
              className="bg-gray-800 border-gray-600 text-white text-xs h-8"
            />
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-800/40 rounded-lg border border-gray-700 space-y-3">
        <h3 className="text-white text-sm font-semibold">
          Additional Information
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">
              Subjects Studied
            </Label>
            <Input
              value={form.subjects}
              onChange={(e) => set("subjects", e.target.value)}
              className="bg-gray-800 border-gray-600 text-white text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">
              Last Attended Date
            </Label>
            <Input
              value={form.lastAttended}
              onChange={(e) => set("lastAttended", e.target.value)}
              className="bg-gray-800 border-gray-600 text-white text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">
              Reason for Leaving
            </Label>
            <Input
              value={form.reason}
              onChange={(e) => set("reason", e.target.value)}
              className="bg-gray-800 border-gray-600 text-white text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">
              Conduct &amp; Character
            </Label>
            <select
              value={form.conduct}
              onChange={(e) => set("conduct", e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none"
            >
              <option>Excellent</option>
              <option>Good</option>
              <option>Satisfactory</option>
              <option>Poor</option>
            </select>
          </div>
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">
              Working Days / Days Present
            </Label>
            <div className="flex gap-2">
              <Input
                value={form.workingDays}
                onChange={(e) => set("workingDays", e.target.value)}
                placeholder="Working Days"
                className="bg-gray-800 border-gray-600 text-white text-xs h-8"
              />
              <Input
                value={form.daysPresent}
                onChange={(e) => set("daysPresent", e.target.value)}
                placeholder="Days Present"
                className="bg-gray-800 border-gray-600 text-white text-xs h-8"
              />
            </div>
          </div>
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">
              Games &amp; Extra-curricular
            </Label>
            <Input
              value={form.games}
              onChange={(e) => set("games", e.target.value)}
              className="bg-gray-800 border-gray-600 text-white text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">
              Fees Paid Up To
            </Label>
            <Input
              value={form.feesPaidUpto}
              onChange={(e) => set("feesPaidUpto", e.target.value)}
              className="bg-gray-800 border-gray-600 text-white text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">
              Any Dues Outstanding
            </Label>
            <Input
              value={form.dues}
              onChange={(e) => set("dues", e.target.value)}
              className="bg-gray-800 border-gray-600 text-white text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">
              Whether Failed (Year)
            </Label>
            <Input
              value={form.failed}
              onChange={(e) => set("failed", e.target.value)}
              className="bg-gray-800 border-gray-600 text-white text-xs h-8"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          onClick={() => setPreviewOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
          data-ocid="cert.tc.primary_button"
        >
          <Eye className="w-4 h-4 mr-1" />
          Preview TC
        </Button>
      </div>

      {/* TC Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl bg-gray-900 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transfer Certificate Preview</DialogTitle>
          </DialogHeader>
          <div id="tc-print-area">
            <div
              style={{
                background: "#fff",
                color: "#000",
                padding: "40px 48px",
                fontFamily: "Arial, sans-serif",
                minHeight: "1050px",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              {/* Letterhead */}
              <div
                style={{
                  textAlign: "center",
                  borderBottom: "3px double #1e3a8a",
                  paddingBottom: 16,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: "#1e3a8a",
                    letterSpacing: 1,
                  }}
                >
                  {SCHOOL.name.toUpperCase()}
                </div>
                <div style={{ fontSize: 12, color: "#374151", marginTop: 4 }}>
                  {SCHOOL.address}
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                  Phone: {SCHOOL.phone} | Email: {SCHOOL.email}
                </div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>
                  UDISE Code: {SCHOOL.udise} | {SCHOOL.affiliation}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 11 }}>
                  <strong>Serial No:</strong> {form.serialNo}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    textDecoration: "underline",
                    textAlign: "center",
                    flex: 1,
                  }}
                >
                  TRANSFER CERTIFICATE
                </div>
                <div style={{ fontSize: 11 }}>
                  <strong>Date:</strong> {form.date}
                </div>
              </div>

              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                  lineHeight: 2.2,
                }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        width: 32,
                        verticalAlign: "top",
                        paddingRight: 8,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      1.
                    </td>
                    <td style={{ color: "#1f2937" }}>
                      This is to certify that{" "}
                      <strong>{selectedStudent.name}</strong>, son/daughter of{" "}
                      <strong>{selectedStudent.father}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        width: 32,
                        verticalAlign: "top",
                        paddingRight: 8,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      2.
                    </td>
                    <td style={{ color: "#1f2937" }}>
                      {"Mother's Name: "}
                      <strong>{selectedStudent.mother}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        width: 32,
                        verticalAlign: "top",
                        paddingRight: 8,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      3.
                    </td>
                    <td style={{ color: "#1f2937" }}>
                      Date of Birth (in figures):{" "}
                      <strong>{selectedStudent.dob}</strong> &nbsp;&nbsp; (in
                      words): <strong>{form.dobWords}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        width: 32,
                        verticalAlign: "top",
                        paddingRight: 8,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      4.
                    </td>
                    <td style={{ color: "#1f2937" }}>
                      Nationality: <strong>{form.nationality}</strong>{" "}
                      &nbsp;&nbsp; Caste/Category: <strong>{form.caste}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        width: 32,
                        verticalAlign: "top",
                        paddingRight: 8,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      5.
                    </td>
                    <td style={{ color: "#1f2937" }}>
                      Whether the student belongs to SC/ST:{" "}
                      <strong>{form.scst}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        width: 32,
                        verticalAlign: "top",
                        paddingRight: 8,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      6.
                    </td>
                    <td style={{ color: "#1f2937" }}>
                      Admission / Enrollment No:{" "}
                      <strong>{selectedStudent.admNo}</strong> &nbsp;&nbsp; Date
                      of Admission: <strong>{form.admissionDate}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        width: 32,
                        verticalAlign: "top",
                        paddingRight: 8,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      7.
                    </td>
                    <td style={{ color: "#1f2937" }}>
                      Class in which studying (in figures):{" "}
                      <strong>Class {selectedStudent.class}</strong>{" "}
                      &nbsp;&nbsp; Section:{" "}
                      <strong>{selectedStudent.section}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        width: 32,
                        verticalAlign: "top",
                        paddingRight: 8,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      8.
                    </td>
                    <td style={{ color: "#1f2937" }}>
                      School / Board Annual Exam last appeared:{" "}
                      <strong>{form.board}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        width: 32,
                        verticalAlign: "top",
                        paddingRight: 8,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      9.
                    </td>
                    <td style={{ color: "#1f2937" }}>
                      Whether failed, Year: <strong>{form.failed}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        width: 32,
                        verticalAlign: "top",
                        paddingRight: 8,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      10.
                    </td>
                    <td style={{ color: "#1f2937" }}>
                      Subjects studied: <strong>{form.subjects}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        width: 32,
                        verticalAlign: "top",
                        paddingRight: 8,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      11.
                    </td>
                    <td style={{ color: "#1f2937" }}>
                      Date the student last attended school:{" "}
                      <strong>{form.lastAttended}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        width: 32,
                        verticalAlign: "top",
                        paddingRight: 8,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      12.
                    </td>
                    <td style={{ color: "#1f2937" }}>
                      Reason for leaving: <strong>{form.reason}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        width: 32,
                        verticalAlign: "top",
                        paddingRight: 8,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      13.
                    </td>
                    <td style={{ color: "#1f2937" }}>
                      Conduct and Character: <strong>{form.conduct}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        width: 32,
                        verticalAlign: "top",
                        paddingRight: 8,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      14.
                    </td>
                    <td style={{ color: "#1f2937" }}>
                      Total working days: <strong>{form.workingDays}</strong>{" "}
                      &nbsp;&nbsp; Days present:{" "}
                      <strong>{form.daysPresent}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        width: 32,
                        verticalAlign: "top",
                        paddingRight: 8,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      15.
                    </td>
                    <td style={{ color: "#1f2937" }}>
                      Games and Extra-curricular activities:{" "}
                      <strong>{form.games}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        width: 32,
                        verticalAlign: "top",
                        paddingRight: 8,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      16.
                    </td>
                    <td style={{ color: "#1f2937" }}>
                      Fees paid up to: <strong>{form.feesPaidUpto}</strong>{" "}
                      &nbsp;&nbsp; Any dues outstanding:{" "}
                      <strong>{form.dues}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        width: 32,
                        verticalAlign: "top",
                        paddingRight: 8,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      17.
                    </td>
                    <td style={{ color: "#1f2937" }}>
                      Certified that the above information is correct to the
                      best of our knowledge.
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Signatures */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 60,
                  paddingTop: 16,
                  borderTop: "1px solid #d1d5db",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      borderTop: "1px solid #374151",
                      paddingTop: 4,
                      marginTop: 30,
                      width: 150,
                      fontSize: 11,
                    }}
                  >
                    Class Teacher
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: 70,
                      height: 70,
                      border: "2px dashed #9ca3af",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      color: "#9ca3af",
                      marginBottom: 4,
                    }}
                  >
                    SEAL
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      borderTop: "1px solid #374151",
                      paddingTop: 4,
                      marginTop: 30,
                      width: 150,
                      fontSize: 11,
                    }}
                  >
                    Principal / Head of School
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(false)}
              className="border-gray-600 text-gray-300"
              data-ocid="cert.tc.cancel_button"
            >
              Close
            </Button>
            <Button
              onClick={() => printArea("tc-print-area")}
              className="bg-blue-600 hover:bg-blue-700"
              data-ocid="cert.tc.submit_button"
            >
              <Printer className="w-4 h-4 mr-1" />
              Print TC
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Bonafide / Character Certificate Tab ────────────────────────────────────

function BonafideTab() {
  const [bonafideStudents] = useState<Student[]>(() => loadStudentsFromLS());
  const [certType, setCertType] = useState<"bonafide" | "character">(
    "bonafide",
  );
  const [selectedStudent, setSelectedStudent] = useState<Student>(() => {
    const s = loadStudentsFromLS();
    return s[0] ?? FALLBACK_STUDENTS[0];
  });
  const [purpose, setPurpose] = useState("scholarship application");
  const [year, setYear] = useState("2023-24");
  const [previewOpen, setPreviewOpen] = useState(false);
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      {/* Type Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setCertType("bonafide")}
          className={`px-4 py-2 rounded text-sm font-medium border transition ${
            certType === "bonafide"
              ? "bg-green-600 border-green-500 text-white"
              : "bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-400"
          }`}
          data-ocid="cert.bonafide.tab"
        >
          Bonafide Certificate
        </button>
        <button
          type="button"
          onClick={() => setCertType("character")}
          className={`px-4 py-2 rounded text-sm font-medium border transition ${
            certType === "character"
              ? "bg-purple-600 border-purple-500 text-white"
              : "bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-400"
          }`}
          data-ocid="cert.character.tab"
        >
          Character Certificate
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-800/40 rounded-lg border border-gray-700">
        <div>
          <Label className="text-gray-400 text-xs mb-1 block">
            Select Student
          </Label>
          <select
            value={selectedStudent.admNo}
            onChange={(e) => {
              const s = bonafideStudents.find(
                (st) => st.admNo === e.target.value,
              );
              if (s) setSelectedStudent(s);
            }}
            className="w-full bg-gray-800 border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none"
            data-ocid="cert.bonafide.select"
          >
            {bonafideStudents.map((s) => (
              <option key={s.admNo} value={s.admNo}>
                {s.name} ({s.admNo})
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-gray-400 text-xs mb-1 block">
            Academic Year
          </Label>
          <Input
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="bg-gray-800 border-gray-600 text-white text-xs h-8"
            data-ocid="cert.bonafide.input"
          />
        </div>
        {certType === "bonafide" && (
          <div className="col-span-2">
            <Label className="text-gray-400 text-xs mb-1 block">Purpose</Label>
            <Input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white text-xs h-8"
              placeholder="e.g. scholarship application, bank account opening"
            />
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="p-4 bg-white rounded-lg border border-gray-200 max-w-2xl">
        <div
          style={{
            fontFamily: "Arial, sans-serif",
            color: "#000",
            fontSize: 13,
            lineHeight: 1.8,
          }}
        >
          <div
            style={{
              textAlign: "center",
              borderBottom: "2px solid #1e3a8a",
              paddingBottom: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1e3a8a" }}>
              {SCHOOL.name.toUpperCase()}
            </div>
            <div style={{ fontSize: 11, color: "#374151" }}>
              {SCHOOL.address}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                marginTop: 12,
                textDecoration: "underline",
              }}
            >
              {certType === "bonafide"
                ? "BONAFIDE CERTIFICATE"
                : "CHARACTER CERTIFICATE"}
            </div>
          </div>
          <div style={{ textAlign: "right", marginBottom: 16, fontSize: 12 }}>
            Date: <strong>{today}</strong>
          </div>

          {certType === "bonafide" ? (
            <p>
              This is to certify that <strong>{selectedStudent.name}</strong>,
              son/daughter of <strong>{selectedStudent.father}</strong>, is a
              bonafide student of this school studying in{" "}
              <strong>
                Class {selectedStudent.class}, Section {selectedStudent.section}
              </strong>{" "}
              during the academic year <strong>{year}</strong>. His/Her Date of
              Birth as per school record is{" "}
              <strong>{selectedStudent.dob}</strong>. He/She bears a good moral
              character and is regular in attendance.
              <br />
              <br />
              This certificate is issued for the purpose of{" "}
              <strong>{purpose}</strong>.
            </p>
          ) : (
            <p>
              This is to certify that <strong>{selectedStudent.name}</strong>,
              son/daughter of <strong>{selectedStudent.father}</strong>, was a
              student of this school in{" "}
              <strong>
                Class {selectedStudent.class}, Section {selectedStudent.section}
              </strong>{" "}
              during the academic year <strong>{year}</strong>.
              <br />
              <br />
              During his/her period of study in this school, he/she has been
              found to be of <strong>good moral character</strong>. His/Her
              conduct and behavior with teachers and fellow students has been{" "}
              <strong>satisfactory and praiseworthy</strong>. We wish him/her
              all the best in future endeavors.
            </p>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 40,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  borderTop: "1px solid #374151",
                  paddingTop: 4,
                  width: 150,
                  fontSize: 11,
                }}
              >
                Class Teacher
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  borderTop: "1px solid #374151",
                  paddingTop: 4,
                  width: 150,
                  fontSize: 11,
                }}
              >
                Principal
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          onClick={() => setPreviewOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
          data-ocid="cert.bonafide.primary_button"
        >
          <Eye className="w-4 h-4 mr-1" />
          Full Preview &amp; Print
        </Button>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>
              {certType === "bonafide" ? "Bonafide" : "Character"} Certificate
              Preview
            </DialogTitle>
          </DialogHeader>
          <div id="bonafide-print-area">
            <div
              style={{
                background: "#fff",
                color: "#000",
                padding: "48px 56px",
                fontFamily: "Arial, sans-serif",
                fontSize: 13,
                lineHeight: 2,
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  borderBottom: "2px solid #1e3a8a",
                  paddingBottom: 16,
                  marginBottom: 24,
                }}
              >
                <div
                  style={{ fontSize: 24, fontWeight: 700, color: "#1e3a8a" }}
                >
                  {SCHOOL.name.toUpperCase()}
                </div>
                <div style={{ fontSize: 12 }}>
                  {SCHOOL.address} | Tel: {SCHOOL.phone}
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    marginTop: 14,
                    textDecoration: "underline",
                  }}
                >
                  {certType === "bonafide"
                    ? "BONAFIDE CERTIFICATE"
                    : "CHARACTER CERTIFICATE"}
                </div>
              </div>
              <div style={{ textAlign: "right", marginBottom: 20 }}>
                Date: <strong>{today}</strong>
              </div>
              {certType === "bonafide" ? (
                <p>
                  This is to certify that{" "}
                  <strong>{selectedStudent.name}</strong>, son/daughter of{" "}
                  <strong>{selectedStudent.father}</strong>, is a bonafide
                  student of this school studying in{" "}
                  <strong>
                    Class {selectedStudent.class}, Section{" "}
                    {selectedStudent.section}
                  </strong>{" "}
                  during the academic year <strong>{year}</strong>. His/Her Date
                  of Birth as per school record is{" "}
                  <strong>{selectedStudent.dob}</strong>. He/She bears a good
                  moral character and is regular in attendance.
                  <br />
                  <br />
                  This certificate is issued for the purpose of{" "}
                  <strong>{purpose}</strong>.
                </p>
              ) : (
                <p>
                  This is to certify that{" "}
                  <strong>{selectedStudent.name}</strong>, son/daughter of{" "}
                  <strong>{selectedStudent.father}</strong>, was a student of
                  this school in{" "}
                  <strong>
                    Class {selectedStudent.class}, Section{" "}
                    {selectedStudent.section}
                  </strong>{" "}
                  during the academic year <strong>{year}</strong>.<br />
                  <br />
                  During his/her period of study in this school, he/she has been
                  found to be of <strong>good moral character</strong>. His/Her
                  conduct and behavior with teachers and fellow students has
                  been <strong>satisfactory and praiseworthy</strong>. We wish
                  him/her all the best in future endeavors.
                </p>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 60,
                }}
              >
                <div
                  style={{
                    borderTop: "1px solid #374151",
                    paddingTop: 4,
                    width: 160,
                    textAlign: "center",
                    fontSize: 11,
                  }}
                >
                  Class Teacher
                </div>
                <div
                  style={{
                    width: 70,
                    height: 70,
                    border: "2px dashed #9ca3af",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: "#9ca3af",
                  }}
                >
                  SEAL
                </div>
                <div
                  style={{
                    borderTop: "1px solid #374151",
                    paddingTop: 4,
                    width: 160,
                    textAlign: "center",
                    fontSize: 11,
                  }}
                >
                  Principal
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(false)}
              className="border-gray-600 text-gray-300"
              data-ocid="cert.bonafide.cancel_button"
            >
              Close
            </Button>
            <Button
              onClick={() => printArea("bonafide-print-area")}
              className="bg-blue-600 hover:bg-blue-700"
              data-ocid="cert.bonafide.submit_button"
            >
              <Printer className="w-4 h-4 mr-1" />
              Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Admit Card Tab ──────────────────────────────────────────────────────────

const EXAMS = [
  "Mid Term Examination",
  "Final Term Examination",
  "Unit Test 1",
  "Unit Test 2",
  "Unit Test 3",
];
const CLASSES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const SUBJECTS_BY_CLASS: Record<
  string,
  {
    subject: string;
    date: string;
    time: string;
    maxMarks: string;
    room: string;
  }[]
> = {
  "5": [
    {
      subject: "Hindi",
      date: "10/04/2024",
      time: "9:00-11:00 AM",
      maxMarks: "80",
      room: "101",
    },
    {
      subject: "English",
      date: "12/04/2024",
      time: "9:00-11:00 AM",
      maxMarks: "80",
      room: "102",
    },
    {
      subject: "Mathematics",
      date: "15/04/2024",
      time: "9:00-11:00 AM",
      maxMarks: "80",
      room: "103",
    },
    {
      subject: "Science",
      date: "17/04/2024",
      time: "9:00-11:00 AM",
      maxMarks: "80",
      room: "104",
    },
    {
      subject: "Social Science",
      date: "19/04/2024",
      time: "9:00-11:00 AM",
      maxMarks: "80",
      room: "105",
    },
  ],
  "7": [
    {
      subject: "Hindi",
      date: "10/04/2024",
      time: "9:00-11:30 AM",
      maxMarks: "80",
      room: "201",
    },
    {
      subject: "English",
      date: "12/04/2024",
      time: "9:00-11:30 AM",
      maxMarks: "80",
      room: "202",
    },
    {
      subject: "Mathematics",
      date: "15/04/2024",
      time: "9:00-11:30 AM",
      maxMarks: "80",
      room: "203",
    },
    {
      subject: "Science",
      date: "17/04/2024",
      time: "9:00-11:30 AM",
      maxMarks: "80",
      room: "204",
    },
    {
      subject: "Social Science",
      date: "19/04/2024",
      time: "9:00-11:30 AM",
      maxMarks: "80",
      room: "205",
    },
  ],
  "10": [
    {
      subject: "Hindi (Course A)",
      date: "10/04/2024",
      time: "10:30 AM-1:30 PM",
      maxMarks: "80",
      room: "301",
    },
    {
      subject: "English (Lang & Lit)",
      date: "12/04/2024",
      time: "10:30 AM-1:30 PM",
      maxMarks: "80",
      room: "302",
    },
    {
      subject: "Mathematics (Standard)",
      date: "15/04/2024",
      time: "10:30 AM-1:30 PM",
      maxMarks: "80",
      room: "303",
    },
    {
      subject: "Science",
      date: "17/04/2024",
      time: "10:30 AM-1:30 PM",
      maxMarks: "80",
      room: "304",
    },
    {
      subject: "Social Science",
      date: "19/04/2024",
      time: "10:30 AM-1:30 PM",
      maxMarks: "80",
      room: "305",
    },
  ],
};

function AdmitCardView({
  student,
  exam,
  year,
  editOverrides = {},
  onEdit,
}: {
  student: Student;
  exam: string;
  year: string;
  editOverrides?: Record<string, string>;
  onEdit?: (key: string, val: string) => void;
}) {
  const getVal = (key: string, defaultVal: string) =>
    editOverrides[key] ?? defaultVal;
  const setVal = (key: string, val: string) => {
    if (onEdit) onEdit(key, val);
  };
  const subjects = SUBJECTS_BY_CLASS[student.class] ?? SUBJECTS_BY_CLASS["5"];
  const editableStyle = {
    background: "transparent",
    border: "none",
    borderBottom: onEdit ? "1px dashed #9ca3af" : "none",
    outline: "none",
    width: "100%",
    fontSize: "inherit",
    fontFamily: "inherit",
    color: "inherit",
    fontWeight: "inherit",
    cursor: onEdit ? "text" : "default",
  } as React.CSSProperties;
  return (
    <div
      style={{
        background: "#fff",
        color: "#000",
        fontFamily: "Arial, sans-serif",
        width: 380,
        border: "2px solid #1e3a8a",
        borderRadius: 6,
        overflow: "hidden",
        fontSize: 11,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#1e3a8a",
          color: "#fff",
          padding: "8px 12px",
          textAlign: "center",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: 0.5 }}>
          <input
            value={getVal("schoolName", SCHOOL.name.toUpperCase())}
            onChange={(e) => setVal("schoolName", e.target.value)}
            readOnly={!onEdit}
            style={{
              ...editableStyle,
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: 0.5,
              textAlign: "center",
            }}
          />
        </div>
        <div style={{ fontSize: 9, opacity: 0.8 }}>
          <input
            value={getVal("schoolAddress", SCHOOL.address)}
            onChange={(e) => setVal("schoolAddress", e.target.value)}
            readOnly={!onEdit}
            style={{
              ...editableStyle,
              fontSize: 9,
              textAlign: "center",
              opacity: 0.8,
            }}
          />
        </div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 11,
            marginTop: 4,
            textDecoration: "underline",
          }}
        >
          ADMIT CARD —{" "}
          <input
            value={getVal("exam", exam).toUpperCase()}
            onChange={(e) => setVal("exam", e.target.value)}
            readOnly={!onEdit}
            style={{
              ...editableStyle,
              fontWeight: 700,
              fontSize: 11,
              display: "inline",
              width: "auto",
              textDecoration: "underline",
            }}
          />
        </div>
        <div style={{ fontSize: 9, marginTop: 2 }}>
          Academic Year:{" "}
          <input
            value={getVal("year", year)}
            onChange={(e) => setVal("year", e.target.value)}
            readOnly={!onEdit}
            style={{
              ...editableStyle,
              fontSize: 9,
              display: "inline",
              width: "auto",
            }}
          />
        </div>
      </div>

      <div style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <div
            style={{
              width: 52,
              height: 62,
              background: "#f3f4f6",
              border: "1px dashed #9ca3af",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              flexDirection: "column",
              fontSize: 20,
            }}
          >
            👤
            <span style={{ fontSize: 7, color: "#9ca3af", marginTop: 2 }}>
              PHOTO
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <table
              style={{
                width: "100%",
                fontSize: 10,
                borderCollapse: "collapse",
              }}
            >
              <tbody>
                {(
                  [
                    ["Name", "studentName", student.name],
                    [
                      "Class",
                      "studentClass",
                      `${student.class} - ${student.section}`,
                    ],
                    ["Roll No", "rollNo", student.rollNo],
                    ["Adm. No", "admNo", student.admNo],
                  ] as [string, string, string][]
                ).map(([k, key, defVal]) => (
                  <tr key={k}>
                    <td
                      style={{
                        paddingRight: 6,
                        color: "#6b7280",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {k}:
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      <input
                        value={getVal(key, defVal)}
                        onChange={(e) => setVal(key, e.target.value)}
                        readOnly={!onEdit}
                        style={{ ...editableStyle, fontWeight: 600 }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 9.5,
            marginBottom: 8,
          }}
        >
          <thead>
            <tr style={{ background: "#eff6ff" }}>
              {["Subject", "Date", "Time", "Max Marks", "Room"].map((h) => (
                <th
                  key={h}
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "4px 5px",
                    textAlign: "left",
                    color: "#1e3a8a",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subjects.map((s, i) => (
              <tr
                key={s.subject}
                style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}
              >
                <td style={{ border: "1px solid #e5e7eb", padding: "3px 5px" }}>
                  {s.subject}
                </td>
                <td style={{ border: "1px solid #e5e7eb", padding: "3px 5px" }}>
                  <input
                    value={getVal(`subj_date_${i}`, s.date)}
                    onChange={(e) => setVal(`subj_date_${i}`, e.target.value)}
                    readOnly={!onEdit}
                    style={editableStyle}
                  />
                </td>
                <td style={{ border: "1px solid #e5e7eb", padding: "3px 5px" }}>
                  <input
                    value={getVal(`subj_time_${i}`, s.time)}
                    onChange={(e) => setVal(`subj_time_${i}`, e.target.value)}
                    readOnly={!onEdit}
                    style={editableStyle}
                  />
                </td>
                <td
                  style={{
                    border: "1px solid #e5e7eb",
                    padding: "3px 5px",
                    textAlign: "center",
                  }}
                >
                  <input
                    value={getVal(`subj_marks_${i}`, s.maxMarks)}
                    onChange={(e) => setVal(`subj_marks_${i}`, e.target.value)}
                    readOnly={!onEdit}
                    style={{ ...editableStyle, textAlign: "center" }}
                  />
                </td>
                <td
                  style={{
                    border: "1px solid #e5e7eb",
                    padding: "3px 5px",
                    textAlign: "center",
                  }}
                >
                  <input
                    value={getVal(`subj_room_${i}`, s.room)}
                    onChange={(e) => setVal(`subj_room_${i}`, e.target.value)}
                    readOnly={!onEdit}
                    style={{ ...editableStyle, textAlign: "center" }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          style={{
            background: "#fef9c3",
            border: "1px solid #fde68a",
            borderRadius: 3,
            padding: "4px 8px",
            fontSize: 9,
            marginBottom: 8,
          }}
        >
          <strong>Instructions:</strong> Carry this admit card to the
          examination hall. Mobile phones strictly prohibited. Report 30 minutes
          before exam time.
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px dashed #d1d5db",
            paddingTop: 6,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                borderTop: "1px solid #374151",
                paddingTop: 3,
                marginTop: 20,
                width: 100,
                fontSize: 9,
              }}
            >
              Student Signature
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                borderTop: "1px solid #374151",
                paddingTop: 3,
                marginTop: 20,
                width: 100,
                fontSize: 9,
              }}
            >
              Principal Signature
            </div>
          </div>
        </div>

        {/* QR Code */}
        <div
          style={{
            textAlign: "center",
            marginTop: 8,
            paddingTop: 8,
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(`Student:${getVal("studentName", student.name)}|Adm:${student.admNo}|Class:${getVal("studentClass", `${student.class}-${student.section}`)}|Exam:${getVal("exam", exam)}|Year:${getVal("year", year)}`)}`}
            width={60}
            height={60}
            alt="QR"
            style={{ border: "1px solid #d1d5db" }}
            crossOrigin="anonymous"
          />
          <div style={{ fontSize: 8, color: "#6b7280", marginTop: 2 }}>
            Scan to Verify
          </div>
        </div>
      </div>
    </div>
  );
}

function AdmitCardTab() {
  const [exam, setExam] = useState(EXAMS[0]);
  const [selectedClass, setSelectedClass] = useState("5");
  const [mode, setMode] = useState<"single" | "all">("single");
  const [selectedStudentIdx, setSelectedStudentIdx] = useState(0);
  const [year, setYear] = useState("2024-25");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editOverrides, setEditOverrides] = useState<Record<string, string>>(
    {},
  );
  const handleEdit = (key: string, val: string) =>
    setEditOverrides((prev) => ({ ...prev, [key]: val }));

  const allAdmitStudents = loadStudentsFromLS();
  const classStudents = allAdmitStudents.filter(
    (s) => s.class === selectedClass,
  );
  const singleStudent =
    classStudents[selectedStudentIdx] ??
    classStudents[0] ??
    allAdmitStudents[0] ??
    FALLBACK_STUDENTS[0];
  const printStudents =
    mode === "all" ? classStudents : singleStudent ? [singleStudent] : [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        <div>
          <Label className="text-gray-400 text-xs mb-1 block">
            Examination
          </Label>
          <select
            value={exam}
            onChange={(e) => setExam(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none"
            data-ocid="cert.admit.select"
          >
            {EXAMS.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-gray-400 text-xs mb-1 block">Class</Label>
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedStudentIdx(0);
            }}
            className="w-full bg-gray-800 border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none"
          >
            {CLASSES.map((c) => (
              <option key={c} value={c}>
                Class {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-gray-400 text-xs mb-1 block">
            Academic Year
          </Label>
          <Input
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="bg-gray-800 border-gray-600 text-white text-xs h-8"
            data-ocid="cert.admit.input"
          />
        </div>
        <div>
          <Label className="text-gray-400 text-xs mb-1 block">
            Generate For
          </Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("single")}
              className={`px-2 py-1.5 rounded text-xs border transition flex-1 ${
                mode === "single"
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-gray-800 border-gray-600 text-gray-300"
              }`}
              data-ocid="cert.admit.toggle"
            >
              Single
            </button>
            <button
              type="button"
              onClick={() => setMode("all")}
              className={`px-2 py-1.5 rounded text-xs border transition flex-1 ${
                mode === "all"
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-gray-800 border-gray-600 text-gray-300"
              }`}
            >
              All Class
            </button>
          </div>
        </div>
      </div>

      {mode === "single" && classStudents.length > 0 && (
        <div>
          <Label className="text-gray-400 text-xs mb-1 block">
            Select Student
          </Label>
          <select
            value={selectedStudentIdx}
            onChange={(e) => setSelectedStudentIdx(Number(e.target.value))}
            className="bg-gray-800 border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none"
          >
            {classStudents.map((s, i) => (
              <option key={s.admNo} value={i}>
                {s.name} ({s.admNo})
              </option>
            ))}
          </select>
        </div>
      )}

      {classStudents.length === 0 && (
        <div
          className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center"
          data-ocid="cert.admit.empty_state"
        >
          <p className="text-gray-500 text-sm">
            No students found for Class {selectedClass}. Demo students are in
            classes 5, 7, and 10.
          </p>
        </div>
      )}

      {printStudents.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <p className="text-gray-400 text-sm">
              {printStudents.length} admit card(s) will be generated
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPreviewOpen(true)}
                className="border-gray-600 text-gray-300"
                data-ocid="cert.admit.secondary_button"
              >
                <Eye className="w-3 h-3 mr-1" />
                Preview
              </Button>
              <Button
                onClick={() => printArea("admit-print-area")}
                className="bg-blue-600 hover:bg-blue-700"
                data-ocid="cert.admit.primary_button"
              >
                <Printer className="w-3 h-3 mr-1" />
                Print All
              </Button>
            </div>
          </div>

          {/* Preview grid */}
          <div className="grid grid-cols-2 gap-4 overflow-auto max-h-96 bg-gray-800/30 p-4 rounded-lg border border-gray-700">
            {printStudents.map((s) => (
              <AdmitCardView
                key={s.admNo}
                student={s}
                exam={exam}
                year={year}
                editOverrides={editOverrides}
                onEdit={handleEdit}
              />
            ))}
          </div>
        </div>
      )}

      {/* Print Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl bg-gray-900 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Admit Card Print Preview — {exam}</DialogTitle>
          </DialogHeader>
          <div id="admit-print-area">
            <div style={{ background: "#fff", padding: 24 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 20,
                }}
              >
                {printStudents.map((s) => (
                  <AdmitCardView
                    key={s.admNo}
                    student={s}
                    exam={exam}
                    year={year}
                    editOverrides={editOverrides}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(false)}
              className="border-gray-600 text-gray-300"
              data-ocid="cert.admit.cancel_button"
            >
              Close
            </Button>
            <Button
              onClick={() => printArea("admit-print-area")}
              className="bg-blue-600 hover:bg-blue-700"
              data-ocid="cert.admit.submit_button"
            >
              <Printer className="w-4 h-4 mr-1" />
              Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Certificate Component ───────────────────────────────────────────────

export function Certificate() {
  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-bold">
            Certificate &amp; ID Card Module
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            Generate, customize, and print ID cards, certificates, and admit
            cards
          </p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-blue-900/50 text-blue-300 border border-blue-700/50">
            3 Student Templates
          </Badge>
          <Badge className="bg-orange-900/50 text-orange-300 border border-orange-700/50">
            2 Staff Templates
          </Badge>
          <Badge className="bg-green-900/50 text-green-300 border border-green-700/50">
            Drag &amp; Drop Editor
          </Badge>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="student-id" className="w-full">
        <TabsList className="bg-gray-800 border border-gray-700 h-auto p-1 flex gap-1 flex-wrap">
          <TabsTrigger
            value="student-id"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 flex items-center gap-1.5 text-xs px-3 py-2"
            data-ocid="cert.student.tab"
          >
            <IdCard className="w-3.5 h-3.5" />
            Student ID Card
          </TabsTrigger>
          <TabsTrigger
            value="staff-id"
            className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-gray-400 flex items-center gap-1.5 text-xs px-3 py-2"
            data-ocid="cert.staff.tab"
          >
            <IdCard className="w-3.5 h-3.5" />
            Staff ID Card
          </TabsTrigger>
          <TabsTrigger
            value="tc"
            className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-400 flex items-center gap-1.5 text-xs px-3 py-2"
            data-ocid="cert.tc.tab"
          >
            <FileText className="w-3.5 h-3.5" />
            Transfer Certificate
          </TabsTrigger>
          <TabsTrigger
            value="bonafide"
            className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-400 flex items-center gap-1.5 text-xs px-3 py-2"
            data-ocid="cert.bonafide.tab"
          >
            <Award className="w-3.5 h-3.5" />
            Bonafide Certificate
          </TabsTrigger>
          <TabsTrigger
            value="admit"
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-400 flex items-center gap-1.5 text-xs px-3 py-2"
            data-ocid="cert.admit.tab"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Admit Card
          </TabsTrigger>
        </TabsList>

        <div
          className="mt-4 p-4 rounded-lg"
          style={{ background: "#1a1f2e", border: "1px solid #374151" }}
        >
          <TabsContent value="student-id" className="mt-0">
            <StudentIDTab />
          </TabsContent>
          <TabsContent value="staff-id" className="mt-0">
            <StaffIDTab />
          </TabsContent>
          <TabsContent value="tc" className="mt-0">
            <TCTab />
          </TabsContent>
          <TabsContent value="bonafide" className="mt-0">
            <BonafideTab />
          </TabsContent>
          <TabsContent value="admit" className="mt-0">
            <AdmitCardTab />
          </TabsContent>
        </div>
      </Tabs>

      {/* Footer */}
      <div className="text-center py-2">
        <p className="text-gray-600 text-xs">
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noreferrer"
            className="text-gray-500 hover:text-gray-300 underline"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
