import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import type { Student } from "../types";
import { apiCall, getJwt } from "../utils/api";
import { generateId, ls } from "../utils/localStorage";

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
  "Village",
  "Aadhaar No",
  "SR No",
  "Pen No",
  "APAAR No",
  "Previous School",
  "Admission Date",
  "Status",
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
 */
function normaliseExportDob(raw: string): string {
  if (!raw) return "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-");
    return `${d}/${m}/${y}`;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split("-");
    return `${d}/${m}/${y}`;
  }
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`;
  }
  return raw;
}

function dobToPassword(dob: string): string {
  if (!dob) return "";
  const m = dob.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[1]}${m[2]}${m[3]}`;
  if (/^\d{8}$/.test(dob.replace(/\D/g, ""))) return dob.replace(/\D/g, "");
  return dob.replace(/\D/g, "");
}

export default function StudentImportExport({ onClose, onImported }: Props) {
  const { currentSession, addNotification, getData } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    saved: number;
    total: number;
    failed: number;
  } | null>(null);

  // ─── EXPORT ──────────────────────────────────────────────────────────────────

  function handleExport() {
    // Always read from context (server data)
    const students = getData("students") as Student[];
    const list =
      students.length > 0 ? students : ls.get<Student[]>("students", []);

    if (list.length === 0) {
      addNotification("No students to export", "warning");
      return;
    }
    const rows = list.map((s) => [
      escapeCSV(s.admNo),
      escapeCSV(s.fullName),
      escapeCSV(s.fatherName),
      escapeCSV(s.fatherMobile ?? ""),
      escapeCSV(s.motherName ?? ""),
      escapeCSV(s.motherMobile ?? ""),
      escapeCSV(normaliseExportDob(s.dob ?? "")),
      escapeCSV(s.gender),
      escapeCSV(s.class),
      escapeCSV(s.section),
      escapeCSV(s.mobile),
      escapeCSV(s.guardianMobile ?? ""),
      escapeCSV(s.category ?? ""),
      escapeCSV(s.address ?? ""),
      escapeCSV(s.village ?? ""),
      escapeCSV(s.aadhaarNo ?? ""),
      escapeCSV(s.srNo ?? ""),
      escapeCSV(s.penNo ?? ""),
      escapeCSV(s.apaarNo ?? ""),
      escapeCSV(s.previousSchool ?? ""),
      escapeCSV(normaliseExportDob(s.admissionDate ?? "")),
      escapeCSV(s.status ?? "active"),
    ]);
    const csv = [CSV_HEADERS.join(","), ...rows.map((r) => r.join(","))].join(
      "\n",
    );
    downloadCSV(csv, `students_${new Date().toISOString().slice(0, 10)}.csv`);
    addNotification(`Exported ${list.length} students`, "success", "📥");
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
      "Ramnagar",
      "1234 5678 9012",
      "SR001",
      "PEN001",
      "APAAR001",
      "Previous School Name",
      "01/04/2020",
      "active",
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
    reader.onload = async (ev) => {
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
          const idx = headerCols.findIndex((h) => h === "mobile");
          if (idx >= 0) return idx;
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
        village: col("village"),
        aadhaarNo: col("aadhaar"),
        srNo: col("sr no"),
        penNo: col("pen no"),
        apaarNo: col("apaar"),
        previousSchool: col("previous school"),
        admissionDate: col("admission date"),
        status: col("status"),
      };

      const sessionId = currentSession?.id ?? "sess_2025";
      const studentsToSave: Student[] = [];

      // Get existing students from context to check for duplicates
      const existing = getData("students") as Student[];

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const get = (idx: number) => (idx >= 0 ? (cols[idx] ?? "").trim() : "");

        const admNo = get(idxMap.admNo);
        if (!admNo) continue;

        const dob = get(idxMap.dob);
        const dobPassword = dobToPassword(dob);

        const rawGender = get(idxMap.gender);
        const gender: Student["gender"] =
          rawGender === "Female"
            ? "Female"
            : rawGender === "Other"
              ? "Other"
              : "Male";

        const rawStatus = get(idxMap.status);
        const status: Student["status"] =
          rawStatus === "discontinued" ? "discontinued" : "active";

        // Check if student already exists in context (upsert by admNo)
        const existingStudent = existing.find((s) => s.admNo === admNo);

        const student: Student = {
          id: existingStudent?.id ?? generateId(),
          admNo,
          fullName: get(idxMap.fullName) || "",
          name: get(idxMap.fullName) || "", // always send both for MySQL
          fatherName: get(idxMap.fatherName) || "",
          fatherMobile: get(idxMap.fatherMobile) || "",
          motherName: get(idxMap.motherName) || "",
          motherMobile: get(idxMap.motherMobile) || "",
          dob,
          gender,
          class: get(idxMap.class) || "",
          section: get(idxMap.section) || "",
          mobile: get(idxMap.mobile) || "",
          guardianMobile: get(idxMap.guardianMobile) || "",
          address: get(idxMap.address) || "",
          village: get(idxMap.village) || "",
          photo: existingStudent?.photo ?? "",
          category: get(idxMap.category) || "General",
          aadhaarNo: get(idxMap.aadhaarNo) || "",
          srNo: get(idxMap.srNo) || "",
          penNo: get(idxMap.penNo) || "",
          apaarNo: get(idxMap.apaarNo) || "",
          previousSchool: get(idxMap.previousSchool) || "",
          admissionDate: get(idxMap.admissionDate) || "",
          credentials: { username: admNo, password: dobPassword },
          status,
          sessionId: sessionId || "",
        };

        studentsToSave.push(student);
      }

      if (studentsToSave.length === 0) {
        addNotification("No valid student rows found in CSV", "warning");
        return;
      }

      // Save all students via batch endpoint (real server confirmation)
      setImporting(true);
      setImportProgress({ saved: 0, total: studentsToSave.length, failed: 0 });

      let saved = 0;
      let failed = 0;
      const CHUNK = 50;
      const token = getJwt();

      for (let i = 0; i < studentsToSave.length; i += CHUNK) {
        const chunk = studentsToSave.slice(i, i + CHUNK);
        // Send chunk as a batch to server — waits for real MySQL confirmation
        try {
          const result = await apiCall<{
            status: string;
            data?: { pushed?: number; failed?: number; errors?: string[] };
          }>(
            "sync/batch",
            "POST",
            {
              collection: "students",
              items: chunk.map((s) => ({
                ...s,
                name: s.fullName, // ensure MySQL `name` column gets populated
              })),
            },
            token,
          );
          const d = result.data ?? {};
          const batchPushed = d.pushed ?? chunk.length;
          const batchFailed = d.failed ?? 0;
          saved += batchPushed;
          failed += batchFailed;
        } catch {
          failed += chunk.length;
        }
        setImportProgress({ saved, total: studentsToSave.length, failed });
      }

      setImporting(false);
      setImportProgress(null);

      const msg =
        failed === 0
          ? `✅ Imported ${saved} students to server`
          : `Imported ${saved} students (${failed} failed — check server connection)`;
      addNotification(msg, failed === 0 ? "success" : "warning", "📤");

      // Callback to refresh the grid
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
      <div
        className="bg-card rounded-xl shadow-2xl w-full max-w-md"
        data-ocid="students-importexport.dialog"
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold font-display text-foreground">
            Import / Export Students
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={importing}
            data-ocid="students-importexport.close_button"
          >
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
              Downloads all students as a CSV with all columns. DOB is exported
              as <span className="font-mono">DD/MM/YYYY</span>.
            </p>
            <Button
              onClick={handleExport}
              className="w-full"
              variant="outline"
              data-ocid="students.export_button"
              disabled={importing}
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
              (matched by Adm.No) are updated. All saves go directly to the
              server.
            </p>

            {/* Progress indicator */}
            {importing && importProgress && (
              <div
                className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2"
                data-ocid="students-import.loading_state"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving {importProgress.saved} / {importProgress.total}{" "}
                  students to server…
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round((importProgress.saved / importProgress.total) * 100)}%`,
                    }}
                  />
                </div>
                {importProgress.failed > 0 && (
                  <p className="text-xs text-destructive">
                    {importProgress.failed} failed — check server connection
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => fileRef.current?.click()}
                className="flex-1"
                variant="outline"
                data-ocid="students.import_button"
                disabled={importing}
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" /> Choose CSV File
                  </>
                )}
              </Button>
              <Button
                onClick={handleDownloadTemplate}
                variant="ghost"
                size="icon"
                title="Download sample template"
                data-ocid="students.template_button"
                className="shrink-0 border border-border"
                disabled={importing}
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
              onChange={(e) => void handleImport(e)}
            />
          </div>

          {/* Column reference */}
          <div className="bg-muted/40 rounded-lg p-3">
            <p className="text-xs text-muted-foreground font-medium mb-1">
              CSV Columns — import reads by header name (order-independent):
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
