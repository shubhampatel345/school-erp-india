// Template Studio — full drag-and-drop template designer for all school documents
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Download,
  FileText,
  ImageIcon,
  Italic,
  Layers,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Star,
  Trash2,
  Underline,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { SchoolProfile } from "../types";
import { generateId, ls } from "../utils/localStorage";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface CanvasElement {
  id: string;
  type: "text" | "line" | "image" | "qr";
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right";
}

interface TemplateDesign {
  id: string;
  templateType: string;
  name: string;
  paperSize: string;
  canvasWidth: number;
  canvasHeight: number;
  bgColor: string;
  bgImage: string;
  elements: CanvasElement[];
  isDefault: boolean;
  savedAt: string;
}

type TemplateDef = {
  key: string;
  label: string;
  icon: string;
  paperSize: string;
  w: number;
  h: number;
  color: string;
};

const FONT_FAMILIES = [
  "Space Grotesk",
  "Plus Jakarta Sans",
  "Arial",
  "Times New Roman",
  "Georgia",
  "Verdana",
  "Calibri",
  "Courier New",
];

const PAPER_SIZES: Record<string, { w: number; h: number }> = {
  "A4 Portrait": { w: 794, h: 1123 },
  "A4 Landscape": { w: 1123, h: 794 },
  "A5 Portrait": { w: 559, h: 794 },
  "A5 Landscape": { w: 794, h: 559 },
  "ID Card (54×86mm)": { w: 204, h: 326 },
  "4 Size (105×145mm)": { w: 397, h: 549 },
  Custom: { w: 600, h: 800 },
};

const TEMPLATE_DEFS: TemplateDef[] = [
  {
    key: "student-id",
    label: "Student ID Card",
    icon: "🪪",
    paperSize: "ID Card (54×86mm)",
    w: 204,
    h: 326,
    color: "bg-blue-50 border-blue-200",
  },
  {
    key: "staff-id",
    label: "Staff ID Card",
    icon: "🪪",
    paperSize: "ID Card (54×86mm)",
    w: 204,
    h: 326,
    color: "bg-violet-50 border-violet-200",
  },
  {
    key: "admission-form",
    label: "Admission Form",
    icon: "📋",
    paperSize: "A4 Portrait",
    w: 794,
    h: 1123,
    color: "bg-emerald-50 border-emerald-200",
  },
  {
    key: "fees-receipt",
    label: "Fee Receipt",
    icon: "🧾",
    paperSize: "4 Size (105×145mm)",
    w: 397,
    h: 549,
    color: "bg-amber-50 border-amber-200",
  },
  {
    key: "result-card",
    label: "Exam Result",
    icon: "📊",
    paperSize: "A4 Portrait",
    w: 794,
    h: 1123,
    color: "bg-cyan-50 border-cyan-200",
  },
  {
    key: "admit-card",
    label: "Admit Card",
    icon: "🎫",
    paperSize: "A5 Portrait",
    w: 559,
    h: 794,
    color: "bg-orange-50 border-orange-200",
  },
  {
    key: "bonafide",
    label: "Bonafide Certificate",
    icon: "📜",
    paperSize: "A4 Portrait",
    w: 794,
    h: 1123,
    color: "bg-rose-50 border-rose-200",
  },
  {
    key: "transfer",
    label: "Transfer Certificate",
    icon: "📄",
    paperSize: "A4 Portrait",
    w: 794,
    h: 1123,
    color: "bg-teal-50 border-teal-200",
  },
];

// Pre-built default elements per template
function getDefaultElements(key: string): CanvasElement[] {
  const school = ls.get<SchoolProfile>("school_profile", {
    name: "SHUBH SCHOOL ERP",
  } as SchoolProfile);
  const sn = school.name || "SHUBH SCHOOL ERP";

  const base = (
    id: string,
    content: string,
    x: number,
    y: number,
    w: number,
    h: number,
    size = 12,
    bold = false,
    align: CanvasElement["align"] = "center",
    color = "#1a1a2e",
  ): CanvasElement => ({
    id,
    type: "text",
    content,
    x,
    y,
    width: w,
    height: h,
    fontFamily: "Space Grotesk",
    fontSize: size,
    fontColor: color,
    bold,
    italic: false,
    underline: false,
    align,
  });

  switch (key) {
    case "student-id":
    case "staff-id":
      return [
        base("e1", sn, 10, 10, 184, 24, 11, true, "center", "#1a237e"),
        base(
          "e2",
          key === "student-id"
            ? "STUDENT IDENTITY CARD"
            : "STAFF IDENTITY CARD",
          10,
          36,
          184,
          18,
          8,
          true,
          "center",
          "#283593",
        ),
        base("e3", "[Photo]", 12, 62, 60, 80, 10, false, "center", "#888"),
        base("e4", "Name: {studentName}", 82, 62, 110, 16, 9, false, "left"),
        base(
          "e5",
          "Class: {class} - {section}",
          82,
          82,
          110,
          16,
          9,
          false,
          "left",
        ),
        base("e6", "Adm.No: {admNo}", 82, 102, 110, 16, 9, false, "left"),
        base("e7", "DOB: {dob}", 82, 122, 110, 16, 9, false, "left"),
        base(
          "e8",
          "Blood Grp: {bloodGroup}",
          82,
          142,
          110,
          16,
          9,
          false,
          "left",
        ),
        base(
          "e9",
          school.address || "School Address, City",
          10,
          280,
          184,
          28,
          7,
          false,
          "center",
          "#555",
        ),
        base(
          "e10",
          `Ph: ${school.phone || "0000000000"}`,
          10,
          308,
          184,
          14,
          7,
          false,
          "center",
          "#555",
        ),
      ];

    case "admit-card":
      return [
        base("e1", sn, 20, 14, 519, 28, 16, true, "center", "#1a237e"),
        base(
          "e2",
          school.address || "School Address",
          20,
          44,
          519,
          16,
          9,
          false,
          "center",
          "#555",
        ),
        base(
          "e3",
          "ADMIT CARD",
          20,
          74,
          519,
          28,
          18,
          true,
          "center",
          "#b71c1c",
        ),
        base(
          "e4",
          "Examination: {examName}",
          20,
          114,
          300,
          20,
          11,
          false,
          "left",
        ),
        base("e5", "[Photo]", 420, 114, 80, 100, 10, false, "center", "#888"),
        base(
          "e6",
          "Student Name: {studentName}",
          20,
          140,
          380,
          18,
          10,
          false,
          "left",
        ),
        base(
          "e7",
          "Class: {class}  Section: {section}",
          20,
          162,
          380,
          18,
          10,
          false,
          "left",
        ),
        base(
          "e8",
          "Adm.No: {admNo}  Roll No: {rollNo}",
          20,
          184,
          380,
          18,
          10,
          false,
          "left",
        ),
        base("e9", "Date of Birth: {dob}", 20, 206, 380, 18, 10, false, "left"),
        base("e10", "Exam Schedule", 20, 240, 519, 20, 11, true, "center"),
        base(
          "e11",
          "Subject | Date | Time | Max Marks | Min Marks",
          20,
          264,
          519,
          18,
          9,
          false,
          "left",
          "#555",
        ),
        base(
          "e12",
          "Instructions: Bring this card to every exam. No electronic devices.",
          20,
          540,
          519,
          32,
          8,
          false,
          "left",
          "#555",
        ),
        base(
          "e13",
          "Principal's Signature",
          380,
          740,
          160,
          20,
          9,
          false,
          "center",
        ),
        base("e14", "[QR Code]", 20, 720, 80, 60, 9, false, "center", "#888"),
      ];

    case "bonafide":
      return [
        base("e1", sn, 80, 40, 634, 36, 22, true, "center", "#1a237e"),
        base(
          "e2",
          school.address || "School Address",
          80,
          80,
          634,
          18,
          10,
          false,
          "center",
          "#555",
        ),
        base(
          "e3",
          "BONAFIDE CERTIFICATE",
          80,
          130,
          634,
          36,
          20,
          true,
          "center",
          "#b71c1c",
        ),
        base(
          "e4",
          `Date: ${new Date().toLocaleDateString("en-IN")}`,
          540,
          190,
          170,
          20,
          10,
          false,
          "right",
        ),
        base(
          "e5",
          "This is to certify that",
          80,
          230,
          634,
          24,
          12,
          false,
          "left",
        ),
        base("e6", "{studentName}", 80, 260, 634, 28, 14, true, "center"),
        base(
          "e7",
          "Son/Daughter of {fatherName}",
          80,
          296,
          634,
          24,
          12,
          false,
          "left",
        ),
        base(
          "e8",
          "is a bonafide student of this school studying in Class {class}, Section {section}",
          80,
          326,
          634,
          48,
          12,
          false,
          "left",
        ),
        base(
          "e9",
          "for the academic session {session}.",
          80,
          382,
          634,
          24,
          12,
          false,
          "left",
        ),
        base(
          "e10",
          "Admission No.: {admNo}",
          80,
          420,
          634,
          24,
          12,
          false,
          "left",
        ),
        base(
          "e11",
          "This certificate is issued on his/her request for the purpose stated by him/her.",
          80,
          456,
          634,
          48,
          12,
          false,
          "left",
        ),
        base("e12", "Principal", 540, 620, 170, 24, 12, false, "center"),
        base("e13", "Date: ___________", 80, 660, 200, 24, 11, false, "left"),
        base(
          "e14",
          "School Seal",
          80,
          700,
          160,
          40,
          10,
          false,
          "center",
          "#aaa",
        ),
      ];

    case "transfer":
      return [
        base("e1", sn, 80, 40, 634, 36, 22, true, "center", "#1a237e"),
        base(
          "e2",
          school.address || "School Address",
          80,
          80,
          634,
          18,
          10,
          false,
          "center",
          "#555",
        ),
        base(
          "e3",
          "TRANSFER CERTIFICATE",
          80,
          130,
          634,
          36,
          20,
          true,
          "center",
          "#b71c1c",
        ),
        base("e4", "T.C. No: ________", 80, 190, 300, 20, 10, false, "left"),
        base(
          "e5",
          `Date: ${new Date().toLocaleDateString("en-IN")}`,
          540,
          190,
          170,
          20,
          10,
          false,
          "right",
        ),
        base(
          "e6",
          "1. Student Name: {studentName}",
          80,
          240,
          634,
          24,
          12,
          false,
          "left",
        ),
        base(
          "e7",
          "2. Father's Name: {fatherName}",
          80,
          272,
          634,
          24,
          12,
          false,
          "left",
        ),
        base(
          "e8",
          "3. Date of Birth: {dob}",
          80,
          304,
          634,
          24,
          12,
          false,
          "left",
        ),
        base(
          "e9",
          "4. Admission No.: {admNo}",
          80,
          336,
          634,
          24,
          12,
          false,
          "left",
        ),
        base(
          "e10",
          "5. Class in which studied: {class} ({section})",
          80,
          368,
          634,
          24,
          12,
          false,
          "left",
        ),
        base(
          "e11",
          "6. Whether failed: No",
          80,
          400,
          634,
          24,
          12,
          false,
          "left",
        ),
        base(
          "e12",
          "7. Last Date of Attendance: {leavingDate}",
          80,
          432,
          634,
          24,
          12,
          false,
          "left",
        ),
        base(
          "e13",
          "8. Reason for Leaving: {leavingReason}",
          80,
          464,
          634,
          24,
          12,
          false,
          "left",
        ),
        base("e14", "9. Conduct: Good", 80, 496, 634, 24, 12, false, "left"),
        base("e15", "Principal", 540, 620, 170, 24, 12, false, "center"),
        base(
          "e16",
          "School Seal",
          80,
          680,
          160,
          40,
          10,
          false,
          "center",
          "#aaa",
        ),
      ];

    case "fees-receipt":
      return [
        base("e1", sn, 10, 10, 377, 28, 13, true, "center", "#1a237e"),
        base(
          "e2",
          school.address || "Address",
          10,
          40,
          377,
          18,
          7,
          false,
          "center",
          "#555",
        ),
        base(
          "e3",
          "FEES RECEIPT",
          10,
          64,
          377,
          22,
          12,
          true,
          "center",
          "#b71c1c",
        ),
        base(
          "e4",
          "Receipt No: {receiptNo}   Date: {date}",
          10,
          92,
          377,
          18,
          8,
          false,
          "left",
        ),
        base(
          "e5",
          "Student: {studentName}  Adm.No: {admNo}",
          10,
          114,
          377,
          18,
          9,
          false,
          "left",
        ),
        base(
          "e6",
          "Class: {class} - {section}",
          10,
          136,
          377,
          18,
          9,
          false,
          "left",
        ),
        base("e7", "Fee Details:", 10, 162, 377, 18, 9, true, "left"),
        base("e8", "{feeItems}", 10, 184, 377, 80, 9, false, "left"),
        base(
          "e9",
          "Total Amount: ₹{totalAmount}",
          10,
          276,
          377,
          22,
          11,
          true,
          "right",
          "#1a5276",
        ),
        base(
          "e10",
          "Mode: {paymentMode}   Received By: {receivedBy}",
          10,
          304,
          377,
          18,
          8,
          false,
          "left",
          "#555",
        ),
        base("e11", "Signature", 270, 488, 120, 18, 8, false, "center"),
      ];

    case "result-card":
      return [
        base("e1", sn, 80, 30, 634, 32, 18, true, "center", "#1a237e"),
        base(
          "e2",
          school.address || "Address",
          80,
          66,
          634,
          18,
          9,
          false,
          "center",
          "#555",
        ),
        base(
          "e3",
          "RESULT CARD / MARK SHEET",
          80,
          104,
          634,
          28,
          16,
          true,
          "center",
          "#b71c1c",
        ),
        base(
          "e4",
          "Examination: {examName}   Session: {session}",
          80,
          148,
          634,
          20,
          10,
          false,
          "left",
        ),
        base(
          "e5",
          "Student: {studentName}   Adm.No: {admNo}",
          80,
          172,
          634,
          20,
          10,
          false,
          "left",
        ),
        base(
          "e6",
          "Class: {class} - {section}   Roll No: {rollNo}",
          80,
          196,
          634,
          20,
          10,
          false,
          "left",
        ),
        base(
          "e7",
          "Subject | Max Marks | Min Marks | Marks Obtained | Grade",
          80,
          236,
          634,
          20,
          9,
          true,
          "left",
        ),
        base("e8", "{subjectRows}", 80, 260, 634, 180, 10, false, "left"),
        base(
          "e9",
          "Total: {total}  Percentage: {percentage}%  Result: {result}",
          80,
          460,
          634,
          24,
          11,
          true,
          "center",
        ),
        base(
          "e10",
          "Class Teacher Signature",
          80,
          560,
          200,
          20,
          9,
          false,
          "center",
        ),
        base(
          "e11",
          "Principal Signature",
          520,
          560,
          180,
          20,
          9,
          false,
          "center",
        ),
      ];

    case "admission-form":
      return [
        base("e1", sn, 80, 30, 634, 36, 20, true, "center", "#1a237e"),
        base(
          "e2",
          school.address || "Address",
          80,
          70,
          634,
          18,
          9,
          false,
          "center",
          "#555",
        ),
        base(
          "e3",
          "APPLICATION / ADMISSION FORM",
          80,
          108,
          634,
          28,
          15,
          true,
          "center",
          "#b71c1c",
        ),
        base(
          "e4",
          "Admission No: ___________",
          80,
          152,
          300,
          20,
          10,
          false,
          "left",
        ),
        base(
          "e5",
          `Date: ${new Date().toLocaleDateString("en-IN")}`,
          500,
          152,
          200,
          20,
          10,
          false,
          "right",
        ),
        base(
          "e6",
          "STUDENT DETAILS",
          80,
          192,
          634,
          22,
          11,
          true,
          "left",
          "#1a5276",
        ),
        base(
          "e7",
          "Full Name: {studentName}",
          80,
          222,
          400,
          20,
          10,
          false,
          "left",
        ),
        base(
          "e8",
          "Date of Birth: {dob}   Gender: {gender}",
          80,
          248,
          634,
          20,
          10,
          false,
          "left",
        ),
        base(
          "e9",
          "Aadhaar No.: ___________   Category: ___________",
          80,
          274,
          634,
          20,
          10,
          false,
          "left",
        ),
        base(
          "e10",
          "PARENT / GUARDIAN DETAILS",
          80,
          314,
          634,
          22,
          11,
          true,
          "left",
          "#1a5276",
        ),
        base(
          "e11",
          "Father's Name: {fatherName}   Mobile: {fatherMobile}",
          80,
          344,
          634,
          20,
          10,
          false,
          "left",
        ),
        base(
          "e12",
          "Mother's Name: {motherName}   Mobile: {motherMobile}",
          80,
          370,
          634,
          20,
          10,
          false,
          "left",
        ),
        base("e13", "Address: {address}", 80, 410, 634, 20, 10, false, "left"),
        base(
          "e14",
          "PREVIOUS SCHOOL DETAILS",
          80,
          450,
          634,
          22,
          11,
          true,
          "left",
          "#1a5276",
        ),
        base(
          "e15",
          "School Name: ___________   Class Passed: ___________",
          80,
          480,
          634,
          20,
          10,
          false,
          "left",
        ),
        base(
          "e16",
          "Class Applying For: {class}   Section: {section}",
          80,
          520,
          634,
          20,
          10,
          false,
          "left",
        ),
        base(
          "e17",
          "Parent/Guardian Signature",
          80,
          660,
          240,
          20,
          9,
          false,
          "center",
        ),
        base(
          "e18",
          "Principal Signature",
          500,
          660,
          180,
          20,
          9,
          false,
          "center",
        ),
      ];

    default:
      return [];
  }
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function Certificates() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDef | null>(
    null,
  );
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paperSize, setPaperSize] = useState("A4 Portrait");
  const [canvasW, setCanvasW] = useState(794);
  const [canvasH, setCanvasH] = useState(1123);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [bgImage, setBgImage] = useState("");
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState<{
    id: string;
    ox: number;
    oy: number;
  } | null>(null);
  const [history, setHistory] = useState<CanvasElement[][]>([]);
  const [savedDesigns, setSavedDesigns] = useState<TemplateDesign[]>(() =>
    ls.get<TemplateDesign[]>("certificates_templates", []),
  );
  const canvasRef = useRef<HTMLDivElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const importJsonRef = useRef<HTMLInputElement>(null);

  const selectedEl = elements.find((e) => e.id === selectedId) ?? null;

  const openTemplate = useCallback((t: TemplateDef) => {
    const saved = ls
      .get<TemplateDesign[]>("certificates_templates", [])
      .find((d) => d.templateType === t.key && d.isDefault);
    if (saved) {
      setElements(saved.elements);
      setPaperSize(saved.paperSize);
      setCanvasW(saved.canvasWidth);
      setCanvasH(saved.canvasHeight);
      setBgColor(saved.bgColor);
      setBgImage(saved.bgImage);
    } else {
      setElements(getDefaultElements(t.key));
      setPaperSize(t.paperSize);
      setCanvasW(t.w);
      setCanvasH(t.h);
      setBgColor("#ffffff");
      setBgImage("");
    }
    setSelectedTemplate(t);
    setSelectedId(null);
    setHistory([]);
    setZoom(1);
  }, []);

  function pushHistory() {
    setHistory((h) => [...h.slice(-19), [...elements]]);
  }

  function undo() {
    if (history.length === 0) return;
    setElements(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
  }

  function addTextElement() {
    pushHistory();
    const el: CanvasElement = {
      id: generateId(),
      type: "text",
      content: "New Text",
      x: 40,
      y: 40,
      width: 200,
      height: 30,
      fontFamily: "Space Grotesk",
      fontSize: 12,
      fontColor: "#1a1a2e",
      bold: false,
      italic: false,
      underline: false,
      align: "left",
    };
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
  }

  function deleteSelected() {
    if (!selectedId) return;
    pushHistory();
    setElements((prev) => prev.filter((e) => e.id !== selectedId));
    setSelectedId(null);
  }

  function updateEl(id: string, patch: Partial<CanvasElement>) {
    setElements((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    );
  }

  function handleMouseDown(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragging({ id, ox: e.clientX - rect.left, oy: e.clientY - rect.top });
    setSelectedId(id);
  }

  function handleCanvasMouseMove(e: React.MouseEvent) {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = (canvasW * zoom) / rect.width;
    const x = Math.round((e.clientX - rect.left) * scale - dragging.ox);
    const y = Math.round((e.clientY - rect.top) * scale - dragging.oy);
    updateEl(dragging.id, { x: Math.max(0, x), y: Math.max(0, y) });
  }

  function handleCanvasMouseUp() {
    if (dragging) {
      pushHistory();
      setDragging(null);
    }
  }

  function handlePaperSizeChange(val: string) {
    setPaperSize(val);
    if (val !== "Custom" && PAPER_SIZES[val]) {
      setCanvasW(PAPER_SIZES[val].w);
      setCanvasH(PAPER_SIZES[val].h);
    }
  }

  function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setBgImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleSaveDesign() {
    if (!selectedTemplate) return;
    const existing = savedDesigns.find(
      (d) => d.templateType === selectedTemplate.key && !d.isDefault,
    );
    const design: TemplateDesign = {
      id: existing?.id ?? generateId(),
      templateType: selectedTemplate.key,
      name: `${selectedTemplate.label} — ${new Date().toLocaleDateString("en-IN")}`,
      paperSize,
      canvasWidth: canvasW,
      canvasHeight: canvasH,
      bgColor,
      bgImage,
      elements: [...elements],
      isDefault: existing?.isDefault ?? false,
      savedAt: new Date().toISOString(),
    };
    const updated = [
      ...savedDesigns.filter(
        (d) => !(d.templateType === selectedTemplate.key && !d.isDefault),
      ),
      design,
    ];
    setSavedDesigns(updated);
    ls.set("certificates_templates", updated);
  }

  function setAsDefault(designId: string) {
    const target = savedDesigns.find((x) => x.id === designId);
    if (!target) return;
    const updated = savedDesigns.map((d) => ({
      ...d,
      isDefault:
        d.id === designId
          ? true
          : d.templateType === target.templateType
            ? false
            : d.isDefault,
    }));
    setSavedDesigns(updated);
    ls.set("certificates_templates", updated);
  }

  function loadDesign(d: TemplateDesign) {
    setElements(d.elements);
    setPaperSize(d.paperSize);
    setCanvasW(d.canvasWidth);
    setCanvasH(d.canvasHeight);
    setBgColor(d.bgColor);
    setBgImage(d.bgImage);
  }

  function deleteDesign(designId: string) {
    const updated = savedDesigns.filter((d) => d.id !== designId);
    setSavedDesigns(updated);
    ls.set("certificates_templates", updated);
  }

  function handleExportJSON() {
    if (!selectedTemplate) return;
    const blob = new Blob(
      [
        JSON.stringify(
          { paperSize, canvasW, canvasH, bgColor, elements },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${selectedTemplate.key}-design.json`;
    a.click();
  }

  function handleImportJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.elements) setElements(data.elements);
        if (data.paperSize) setPaperSize(data.paperSize);
        if (data.canvasW) setCanvasW(data.canvasW);
        if (data.canvasH) setCanvasH(data.canvasH);
        if (data.bgColor) setBgColor(data.bgColor);
      } catch {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handlePrint() {
    if (!canvasRef.current) return;
    const html = `<html><head><title>Print — ${selectedTemplate?.label}</title>
      <style>
        @page { margin: 0; size: ${canvasW}px ${canvasH}px; }
        body { margin: 0; padding: 0; }
        .print-canvas { position: relative; width: ${canvasW}px; height: ${canvasH}px; background-color: ${bgColor}; ${bgImage ? `background-image: url(${bgImage}); background-size: cover; background-position: center;` : ""} overflow: hidden; }
        .el { position: absolute; overflow: hidden; display: flex; align-items: center; white-space: pre-wrap; word-break: break-word; padding: 1px 2px; }
      </style>
      </head><body><div class="print-canvas">${elements
        .map(
          (el) =>
            `<div class="el" style="left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;font-family:${el.fontFamily};font-size:${el.fontSize}px;color:${el.fontColor};font-weight:${el.bold ? "bold" : "normal"};font-style:${el.italic ? "italic" : "normal"};text-decoration:${el.underline ? "underline" : "none"};text-align:${el.align};line-height:1.3;">${el.content}</div>`,
        )
        .join("")}</div></body></html>`;

    // Primary: hidden iframe — avoids popup blockers completely
    const existingFrame = document.getElementById(
      "shubh-print-frame",
    ) as HTMLIFrameElement | null;
    if (existingFrame) existingFrame.remove();
    const frame = document.createElement("iframe");
    frame.id = "shubh-print-frame";
    frame.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;";
    document.body.appendChild(frame);
    const frameDoc = frame.contentDocument ?? frame.contentWindow?.document;
    if (!frameDoc) {
      console.error(
        "shubh-print: iframe contentDocument unavailable, falling back to window.open",
      );
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close();
        setTimeout(() => {
          w.focus();
          w.print();
          w.close();
        }, 400);
      }
      return;
    }
    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();
    setTimeout(() => {
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
      } catch {
        const w = window.open("", "_blank");
        if (w) {
          w.document.write(html);
          w.document.close();
          setTimeout(() => {
            w.focus();
            w.print();
            w.close();
          }, 300);
        }
      }
      setTimeout(() => frame.remove(), 5000);
    }, 400);
  }

  const currentScale = Math.min(zoom, 1.5);
  const baseScale = Math.min(1, 580 / canvasW);
  const scale = baseScale * currentScale;

  // ── TEMPLATE LIST (no template selected) ──
  if (!selectedTemplate) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">
              Template Studio
            </h1>
            <p className="text-sm text-muted-foreground">
              Design and customize all school documents
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {TEMPLATE_DEFS.map((t) => {
            const designs = savedDesigns.filter(
              (d) => d.templateType === t.key,
            );
            const hasDefault = designs.some((d) => d.isDefault);
            const count = designs.length;
            return (
              <button
                key={t.key}
                type="button"
                className="group text-left border rounded-xl p-5 bg-card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                onClick={() => openTemplate(t)}
                data-ocid={`template-card-${t.key}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{t.icon}</span>
                  <div className="flex flex-col items-end gap-1">
                    {hasDefault && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] gap-1 h-5"
                      >
                        <Star className="w-2.5 h-2.5 fill-current" /> Default
                        set
                      </Badge>
                    )}
                    {count > 0 && !hasDefault && (
                      <Badge variant="outline" className="text-[10px] h-5">
                        {count} saved
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
                  {t.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.paperSize}
                </p>
                <div className="mt-3 pt-3 border-t border-border">
                  <span className="text-xs font-medium text-primary group-hover:underline">
                    Open Designer →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── DESIGNER VIEW ──
  const thisTemplateDesigns = savedDesigns.filter(
    (d) => d.templateType === selectedTemplate.key,
  );

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Top Toolbar */}
      <div className="bg-card border-b border-border px-3 py-2 flex items-center gap-1.5 flex-wrap shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedTemplate(null)}
          className="gap-1 text-xs"
        >
          ← Templates
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <div className="font-semibold text-sm text-foreground hidden sm:block">
          {selectedTemplate.icon} {selectedTemplate.label}
        </div>
        <div className="flex-1" />

        {/* Paper Size */}
        <select
          className="text-xs border border-input rounded px-2 py-1.5 bg-background text-foreground"
          value={paperSize}
          onChange={(e) => handlePaperSizeChange(e.target.value)}
          data-ocid="paper-size-select"
        >
          {Object.keys(PAPER_SIZES).map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>

        {paperSize === "Custom" && (
          <>
            <Input
              type="number"
              className="w-16 h-7 text-xs"
              value={canvasW}
              onChange={(e) => setCanvasW(Number(e.target.value))}
              placeholder="W"
            />
            <span className="text-muted-foreground text-xs">×</span>
            <Input
              type="number"
              className="w-16 h-7 text-xs"
              value={canvasH}
              onChange={(e) => setCanvasH(Number(e.target.value))}
              placeholder="H"
            />
          </>
        )}

        <Separator orientation="vertical" className="h-5" />

        {/* BG Color */}
        <div className="flex items-center gap-1">
          <Label className="text-xs text-muted-foreground">BG:</Label>
          <input
            type="color"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
            className="w-7 h-7 rounded border border-input cursor-pointer"
            title="Background color"
          />
        </div>

        {/* BG Image */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => bgInputRef.current?.click()}
          className="gap-1 h-7 px-2"
          title="Upload background image"
        >
          <ImageIcon className="w-3 h-3" />
          <span className="hidden sm:inline text-xs">BG</span>
        </Button>
        <input
          ref={bgInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleBgUpload}
        />
        {bgImage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBgImage("")}
            className="text-destructive h-7 px-2 text-xs"
          >
            ✕
          </Button>
        )}

        <Separator orientation="vertical" className="h-5" />

        {/* Add / Undo */}
        <Button
          variant="outline"
          size="sm"
          onClick={addTextElement}
          className="gap-1 h-7 px-2"
          data-ocid="add-text-btn"
        >
          <Plus className="w-3 h-3" />
          <span className="hidden sm:inline text-xs">Text</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={undo}
          disabled={history.length === 0}
          className="h-7 px-2"
          title="Undo"
        >
          <RotateCcw className="w-3 h-3" />
        </Button>
        {selectedId && (
          <Button
            variant="destructive"
            size="sm"
            onClick={deleteSelected}
            className="h-7 px-2"
            title="Delete element"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}

        <Separator orientation="vertical" className="h-5" />

        {/* Zoom */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2"
          onClick={() => setZoom((z) => Math.min(z + 0.2, 2))}
          title="Zoom in"
        >
          <ZoomIn className="w-3 h-3" />
        </Button>
        <span className="text-xs text-muted-foreground w-10 text-center">
          {Math.round(currentScale * 100)}%
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2"
          onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}
          title="Zoom out"
        >
          <ZoomOut className="w-3 h-3" />
        </Button>

        <Separator orientation="vertical" className="h-5" />

        {/* Export / Import / Save / Print */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportJSON}
          className="gap-1 h-7 px-2"
          title="Export design as JSON"
        >
          <Download className="w-3 h-3" />
          <span className="hidden sm:inline text-xs">Export</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => importJsonRef.current?.click()}
          className="gap-1 h-7 px-2"
          title="Import design JSON"
        >
          <Upload className="w-3 h-3" />
          <span className="hidden sm:inline text-xs">Import</span>
        </Button>
        <input
          ref={importJsonRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportJSON}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveDesign}
          className="gap-1 h-7 px-2"
          data-ocid="save-template-btn"
        >
          <Save className="w-3 h-3" />
          <span className="text-xs">Save</span>
        </Button>
        <Button size="sm" onClick={handlePrint} className="gap-1 h-7 px-2">
          <Printer className="w-3 h-3" />
          <span className="hidden sm:inline text-xs">Print</span>
        </Button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 bg-muted/30 overflow-auto flex flex-col items-center gap-6 p-6">
          {/* Canvas */}
          <div
            style={{ width: canvasW * scale, height: canvasH * scale }}
            className="flex-shrink-0"
          >
            <div
              ref={canvasRef}
              className="relative overflow-hidden shadow-2xl"
              style={{
                width: canvasW * scale,
                height: canvasH * scale,
                backgroundColor: bgColor,
                backgroundImage: bgImage ? `url(${bgImage})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                cursor: dragging ? "grabbing" : "default",
              }}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onClick={() => setSelectedId(null)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSelectedId(null);
              }}
            >
              {elements.map((el) => (
                <button
                  type="button"
                  key={el.id}
                  className={`absolute select-none bg-transparent border-0 p-0 m-0 text-left ${
                    selectedId === el.id
                      ? "outline outline-2 outline-primary outline-offset-1 z-10"
                      : "hover:outline hover:outline-1 hover:outline-muted-foreground/40"
                  }`}
                  style={{
                    left: el.x * scale,
                    top: el.y * scale,
                    width: el.width * scale,
                    height: el.height * scale,
                    fontFamily: el.fontFamily,
                    fontSize: el.fontSize * scale,
                    color: el.fontColor,
                    fontWeight: el.bold ? "bold" : "normal",
                    fontStyle: el.italic ? "italic" : "normal",
                    textDecoration: el.underline ? "underline" : "none",
                    textAlign: el.align,
                    cursor: "grab",
                    display: "flex",
                    alignItems: "center",
                    overflow: "hidden",
                    lineHeight: 1.3,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    padding: "1px 2px",
                  }}
                  onMouseDown={(e) => handleMouseDown(e, el.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(el.id);
                  }}
                >
                  {el.content}
                </button>
              ))}
            </div>
          </div>

          {/* Saved Designs Section (below canvas) */}
          {thisTemplateDesigns.length > 0 && (
            <div className="w-full max-w-3xl bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Saved Versions — {selectedTemplate.label}
                </h3>
              </div>
              <div className="space-y-2">
                {thisTemplateDesigns.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg border border-border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {d.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {d.paperSize} · {d.elements.length} elements ·{" "}
                        {new Date(d.savedAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 flex-wrap">
                      <Button
                        variant={d.isDefault ? "default" : "outline"}
                        size="sm"
                        className="h-6 px-2 text-[10px] gap-1"
                        onClick={() => setAsDefault(d.id)}
                        title="Set as default for printing"
                        data-ocid={`set-default-${d.id}`}
                      >
                        <Star
                          className={`w-2.5 h-2.5 ${d.isDefault ? "fill-current" : ""}`}
                        />
                        {d.isDefault ? "Default" : "Set Default"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => loadDesign(d)}
                        data-ocid={`load-design-${d.id}`}
                      >
                        Load
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px] gap-1"
                        onClick={() => {
                          const blob = new Blob(
                            [
                              JSON.stringify(
                                {
                                  paperSize: d.paperSize,
                                  canvasW: d.canvasWidth,
                                  canvasH: d.canvasHeight,
                                  bgColor: d.bgColor,
                                  elements: d.elements,
                                },
                                null,
                                2,
                              ),
                            ],
                            { type: "application/json" },
                          );
                          const a = document.createElement("a");
                          a.href = URL.createObjectURL(blob);
                          a.download = `${d.templateType}-v${d.id.slice(-4)}.json`;
                          a.click();
                        }}
                        title="Export this design"
                        data-ocid={`export-design-${d.id}`}
                      >
                        <Download className="w-2.5 h-2.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px] gap-1"
                        onClick={() => {
                          setElements(d.elements);
                          setPaperSize(d.paperSize);
                          setCanvasW(d.canvasWidth);
                          setCanvasH(d.canvasHeight);
                          setBgColor(d.bgColor);
                          setBgImage(d.bgImage);
                          setTimeout(handlePrint, 100);
                        }}
                        title="Print preview"
                        data-ocid={`print-design-${d.id}`}
                      >
                        <Printer className="w-2.5 h-2.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                        onClick={() => deleteDesign(d.id)}
                        title="Delete this design"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Variable Reference */}
          <div className="w-full max-w-3xl bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Available Variables
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                "{studentName}",
                "{fatherName}",
                "{class}",
                "{section}",
                "{admNo}",
                "{dob}",
                "{rollNo}",
                "{gender}",
                "{session}",
                "{examName}",
                "{receiptNo}",
                "{totalAmount}",
                "{date}",
                "{address}",
                "{bloodGroup}",
                "{designation}",
                "{staffName}",
                "{joiningDate}",
                "{leavingDate}",
              ].map((v) => (
                <code
                  key={v}
                  className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground font-mono"
                >
                  {v}
                </code>
              ))}
            </div>
          </div>
        </div>

        {/* Properties Panel */}
        <div
          className="w-64 bg-card border-l border-border overflow-y-auto shrink-0"
          data-ocid="properties-panel"
        >
          <div className="p-3 space-y-3">
            {selectedEl ? (
              <>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Element Properties
                </p>

                {/* Content */}
                <div className="space-y-1">
                  <Label className="text-xs">Text / Variable</Label>
                  <textarea
                    className="w-full border border-input rounded px-2 py-1.5 text-xs bg-background resize-none text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    rows={3}
                    value={selectedEl.content}
                    onChange={(e) =>
                      updateEl(selectedEl.id, { content: e.target.value })
                    }
                    data-ocid="el-content"
                  />
                </div>

                {/* Font Family */}
                <div className="space-y-1">
                  <Label className="text-xs">Font Family</Label>
                  <select
                    className="w-full border border-input rounded px-2 py-1.5 text-xs bg-background text-foreground focus:outline-none"
                    value={selectedEl.fontFamily}
                    onChange={(e) =>
                      updateEl(selectedEl.id, { fontFamily: e.target.value })
                    }
                    data-ocid="el-font-family"
                  >
                    {FONT_FAMILIES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Font Size + Color */}
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Size (px)</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={selectedEl.fontSize}
                      onChange={(e) =>
                        updateEl(selectedEl.id, {
                          fontSize: Number(e.target.value),
                        })
                      }
                      data-ocid="el-font-size"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Color</Label>
                    <input
                      type="color"
                      value={selectedEl.fontColor}
                      onChange={(e) =>
                        updateEl(selectedEl.id, { fontColor: e.target.value })
                      }
                      className="w-8 h-8 rounded border border-input cursor-pointer block"
                      data-ocid="el-font-color"
                    />
                  </div>
                </div>

                {/* Style Toggles */}
                <div className="space-y-1">
                  <Label className="text-xs">Style</Label>
                  <div className="flex gap-1">
                    <Button
                      variant={selectedEl.bold ? "default" : "outline"}
                      size="sm"
                      className="w-9 h-8 p-0"
                      onClick={() =>
                        updateEl(selectedEl.id, { bold: !selectedEl.bold })
                      }
                      data-ocid="el-bold"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant={selectedEl.italic ? "default" : "outline"}
                      size="sm"
                      className="w-9 h-8 p-0"
                      onClick={() =>
                        updateEl(selectedEl.id, { italic: !selectedEl.italic })
                      }
                      data-ocid="el-italic"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant={selectedEl.underline ? "default" : "outline"}
                      size="sm"
                      className="w-9 h-8 p-0"
                      onClick={() =>
                        updateEl(selectedEl.id, {
                          underline: !selectedEl.underline,
                        })
                      }
                      data-ocid="el-underline"
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Alignment */}
                <div className="space-y-1">
                  <Label className="text-xs">Alignment</Label>
                  <div className="flex gap-1">
                    <Button
                      variant={
                        selectedEl.align === "left" ? "default" : "outline"
                      }
                      size="sm"
                      className="flex-1 h-8 p-0"
                      onClick={() => updateEl(selectedEl.id, { align: "left" })}
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant={
                        selectedEl.align === "center" ? "default" : "outline"
                      }
                      size="sm"
                      className="flex-1 h-8 p-0"
                      onClick={() =>
                        updateEl(selectedEl.id, { align: "center" })
                      }
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant={
                        selectedEl.align === "right" ? "default" : "outline"
                      }
                      size="sm"
                      className="flex-1 h-8 p-0"
                      onClick={() =>
                        updateEl(selectedEl.id, { align: "right" })
                      }
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Position & Size */}
                <Separator />
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Position & Size
                  </Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["x", "y", "width", "height"] as const).map((key) => (
                      <div key={key} className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">
                          {key.toUpperCase()}
                        </Label>
                        <Input
                          type="number"
                          className="h-7 text-xs"
                          value={selectedEl[key]}
                          onChange={(e) =>
                            updateEl(selectedEl.id, {
                              [key]: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={deleteSelected}
                >
                  <Trash2 className="w-3 h-3 mr-1.5" /> Delete Element
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Canvas Info
                </p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>
                    📐 {canvasW} × {canvasH} px
                  </p>
                  <p>📄 {paperSize}</p>
                  <p>🔷 {elements.length} elements</p>
                  <p>🔍 Zoom: {Math.round(currentScale * 100)}%</p>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  Click any element on the canvas to select and edit it. Drag to
                  reposition.
                </p>
                <div className="space-y-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 h-8 text-xs"
                    onClick={addTextElement}
                  >
                    <Plus className="w-3 h-3" /> Add Text Element
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 h-8 text-xs"
                    onClick={() => {
                      setElements(getDefaultElements(selectedTemplate.key));
                      setSelectedId(null);
                    }}
                  >
                    <RotateCcw className="w-3 h-3" /> Reset to Default
                  </Button>
                </div>
                <Separator />
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Keyboard Shortcuts
                  </Label>
                  <div className="space-y-0.5 text-[10px] text-muted-foreground">
                    <p>Esc — Deselect element</p>
                    <p>Click — Select element</p>
                    <p>Drag — Move element</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
