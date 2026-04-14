import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { useRef } from "react";
import { useApp } from "../context/AppContext";
import type { Student } from "../types";
import { CLASSES, SECTIONS, generateId, ls } from "../utils/localStorage";

/**
 * Single source of truth for CSV column headers.
 * Both export and import use this exact array — order matters for export,
 * but import reads by header name (case-insensitive partial match).
 */
const CSV_HEADERS = [
  "Adm.No",
  "Full Name",
  "Father Name",
  "Father Mobile",
  "Mother Name",
  "Mother Mobile",
  "DOB",
  "Gender",
  "Class",
  "Section",
  "Mobile",
  "Guardian Mobile",
  "Category",
  "Address",
  "Aadhaar No",
  "SR No",
  "Pen No",
  "APAAR No",
  "Previous School",
  "Admission Date",
] as const;

interface Props {
  onClose: () => void;
  onImported: () => void;
}

/** Escape a CSV field value — wraps in quotes if it contains comma/quote/newline */
function escapeCSV(val: string): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Parse a single CSV line respecting quoted fields.
 * Returns an array of unquoted, trimmed field values.
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Convert a DOB value to DD/MM/YYYY for export, regardless of input format.
 * Supports: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, ddmmyyyy (8 digits).
 */
function normaliseExportDob(raw: string): string {
  if (!raw) return "";
  // Already DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  // ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-");
    return `${d}/${m}/${y}`;
  }
  // DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split("-");
    return `${d}/${m}/${y}`;
  }
  // 8-digit ddmmyyyy
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`;
  }
  return raw;
}

/**
 * Convert a DOB value from CSV to password format ddmmyyyy.
 * Input is expected as DD/MM/YYYY (how we export it).
 */
function dobToPassword(dob: string): string {
  if (!dob) return "";
  // DD/MM/YYYY → ddmmyyyy
  const m = dob.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[1]}${m[2]}${m[3]}`;
  // Already 8 digits
  if (/^\d{8}$/.test(dob.replace(/\D/g, ""))) return dob.replace(/\D/g, "");
  return dob.replace(/\D/g, "");
}

export default function StudentImportExport({ onClose, onImported }: Props) {
  const { currentSession, addNotification } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);

  // ─── EXPORT ──────────────────────────────────────────────────────────────────

  function handleExport() {
    const students = ls.get<Student[]>("students", []);
    if (students.length === 0) {
      addNotification("No students to export", "warning");
      return;
    }
    const rows = students.map((s) => [
      escapeCSV(s.admNo),
      escapeCSV(s.fullName),
      escapeCSV(s.fatherName),
      escapeCSV(s.fatherMobile ?? ""),
      escapeCSV(s.motherName),
      escapeCSV(s.motherMobile ?? ""),
      escapeCSV(normaliseExportDob(s.dob)),
      escapeCSV(s.gender),
      escapeCSV(s.class),
      escapeCSV(s.section),
      escapeCSV(s.mobile),
      escapeCSV(s.guardianMobile),
      escapeCSV(s.category),
      escapeCSV(s.address),
      escapeCSV(s.aadhaarNo ?? ""),
      escapeCSV(s.srNo ?? ""),
      escapeCSV(s.penNo ?? ""),
      escapeCSV(s.apaarNo ?? ""),
      escapeCSV(s.previousSchool ?? ""),
      escapeCSV(normaliseExportDob(s.admissionDate ?? "")),
    ]);
    const csv = [CSV_HEADERS.join(","), ...rows.map((r) => r.join(","))].join(
      "\n",
    );
    downloadCSV(csv, "students_export.csv");
    addNotification(`Exported ${students.length} students`, "success", "📥");
  }

  // ─── SAMPLE TEMPLATE ─────────────────────────────────────────────────────────

  function handleDownloadTemplate() {
    const sampleRow = [
      "ADM001",
      "Rahul Sharma",
      "Rakesh Sharma",
      "9876543210",
      "Sunita Sharma",
      "9876543211",
      "15/08/2010",
      "Male",
      "5",
      "A",
      "9876543210",
      "9876543210",
      "General",
      "123 Main Street, City",
      "1234 5678 9012",
      "SR001",
      "PEN001",
      "APAAR001",
      "Previous School Name",
      "01/04/2020",
    ];
    const csv = [CSV_HEADERS.join(","), sampleRow.join(",")].join("\n");
    downloadCSV(csv, "students_import_template.csv");
    addNotification("Sample template downloaded", "success", "📋");
  }

  // ─── IMPORT ──────────────────────────────────────────────────────────────────

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        addNotification("CSV file is empty or has no data rows", "error");
        return;
      }

      // Parse header row by name (case-insensitive) — order-independent
      const headerCols = parseCSVLine(lines[0]).map((h) =>
        h.toLowerCase().trim(),
      );

      const col = (name: string): number =>
        headerCols.findIndex((h) => h.includes(name.toLowerCase()));

      const idxMap = {
        admNo: col("adm"),
        fullName: col("full name"),
        fatherName: col("father name"),
        fatherMobile: col("father mobile"),
        motherName: col("mother name"),
        motherMobile: col("mother mobile"),
        dob: col("dob"),
        gender: col("gender"),
        class: col("class"),
        section: col("section"),
        mobile: (() => {
          // "Mobile" must not match "Father Mobile" or "Mother Mobile" or "Guardian Mobile"
          const idx = headerCols.findIndex((h) => h === "mobile");
          if (idx >= 0) return idx;
          // Fallback: find a "mobile" that isn't prefixed
          return headerCols.findIndex(
            (h) =>
              h.includes("mobile") &&
              !h.includes("father") &&
              !h.includes("mother") &&
              !h.includes("guardian"),
          );
        })(),
        guardianMobile: col("guardian"),
        category: col("category"),
        address: col("address"),
        aadhaarNo: col("aadhaar"),
        srNo: col("sr no"),
        penNo: col("pen no"),
        apaarNo: col("apaar"),
        previousSchool: col("previous school"),
        admissionDate: col("admission date"),
      };

      const existing = ls.get<Student[]>("students", []);
      const sessionId = currentSession?.id ?? "sess_2025";
      let count = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const get = (idx: number) => (idx >= 0 ? (cols[idx] ?? "").trim() : "");

        const admNo = get(idxMap.admNo);
        if (!admNo) continue;

        const dob = get(idxMap.dob); // Will be DD/MM/YYYY from our export
        const dobPassword = dobToPassword(dob);

        const rawGender = get(idxMap.gender);
        const gender: Student["gender"] =
          rawGender === "Female"
            ? "Female"
            : rawGender === "Other"
              ? "Other"
              : "Male";

        const classVal = get(idxMap.class);
        const sectionVal = get(idxMap.section);

        const student: Student = {
          id: generateId(),
          admNo,
          fullName: get(idxMap.fullName),
          fatherName: get(idxMap.fatherName),
          fatherMobile: get(idxMap.fatherMobile) || undefined,
          motherName: get(idxMap.motherName),
          motherMobile: get(idxMap.motherMobile) || undefined,
          dob,
          gender,
          class: CLASSES.includes(classVal) ? classVal : "",
          section: SECTIONS.includes(sectionVal) ? sectionVal : "",
          mobile: get(idxMap.mobile),
          guardianMobile: get(idxMap.guardianMobile),
          address: get(idxMap.address),
          photo: "",
          category: get(idxMap.category) || "General",
          aadhaarNo: get(idxMap.aadhaarNo) || undefined,
          srNo: get(idxMap.srNo) || undefined,
          penNo: get(idxMap.penNo) || undefined,
          apaarNo: get(idxMap.apaarNo) || undefined,
          previousSchool: get(idxMap.previousSchool) || undefined,
          admissionDate: get(idxMap.admissionDate) || undefined,
          credentials: { username: admNo, password: dobPassword },
          status: "active",
          sessionId,
        };

        const dupIdx = existing.findIndex((s) => s.admNo === admNo);
        if (dupIdx >= 0) {
          existing[dupIdx] = {
            ...existing[dupIdx],
            ...student,
            id: existing[dupIdx].id,
          };
        } else {
          existing.push(student);
        }
        count++;
      }

      ls.set("students", existing);
      addNotification(`Imported ${count} students`, "success", "📤");
      onImported();
      onClose();
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  function downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold font-display text-foreground">
            Import / Export Students
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-5 space-y-4">
          {/* Export */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              Export Students to CSV
            </h3>
            <p className="text-sm text-muted-foreground">
              Downloads all students as a CSV with all 20 columns. DOB is
              exported as <span className="font-mono">DD/MM/YYYY</span>.
            </p>
            <Button
              onClick={handleExport}
              className="w-full"
              variant="outline"
              data-ocid="students-export-btn"
            >
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>

          {/* Import */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              Import Students from CSV
            </h3>
            <p className="text-sm text-muted-foreground">
              Upload a CSV matching the column structure. Existing students
              (matched by Adm.No) are updated. Credentials are auto-created:
              username = Adm.No, password = DOB as{" "}
              <span className="font-mono">ddmmyyyy</span>.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => fileRef.current?.click()}
                className="flex-1"
                variant="outline"
                data-ocid="students-import-btn"
              >
                <Upload className="w-4 h-4 mr-2" /> Choose CSV File
              </Button>
              <Button
                onClick={handleDownloadTemplate}
                variant="ghost"
                size="icon"
                title="Download sample template"
                data-ocid="students-template-btn"
                className="shrink-0 border border-border"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Click <span className="font-medium">📊</span> to download a blank
              sample template with the correct column headers.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImport}
            />
          </div>

          {/* Column reference */}
          <div className="bg-muted/40 rounded-lg p-3">
            <p className="text-xs text-muted-foreground font-medium mb-1">
              CSV Columns (20 total — import reads by header name,
              order-independent):
            </p>
            <p className="text-xs text-muted-foreground font-mono leading-relaxed break-words">
              {CSV_HEADERS.join(", ")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
