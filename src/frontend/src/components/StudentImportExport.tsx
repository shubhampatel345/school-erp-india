/**
 * StudentImportExport.tsx — Bulk import students from CSV / Excel
 *
 * Uses SheetJS (xlsx) for both parsing uploads and generating the template.
 * Server count (not local array length) drives the success message.
 * All empty fields are sent as "" not undefined/null.
 */
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import phpApiService from "../utils/phpApiService";

interface Props {
  onClose: () => void;
  onImported: () => Promise<void>;
}

const TEMPLATE_HEADERS = [
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
  "Roll No",
  "Mobile",
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
];

/** Normalize header string for fuzzy matching */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Map a raw row object to StudentRecord payload */
function rowToPayload(row: Record<string, unknown>): Record<string, string> {
  const get = (keys: string[]): string => {
    for (const k of keys) {
      const val = row[k] ?? row[norm(k)] ?? "";
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        return String(val).trim();
      }
    }
    // fuzzy match
    for (const rk of Object.keys(row)) {
      for (const k of keys) {
        if (norm(rk) === norm(k) || norm(rk).includes(norm(k).slice(0, 5))) {
          const v = row[rk];
          if (v !== undefined && v !== null && String(v).trim() !== "")
            return String(v).trim();
        }
      }
    }
    return "";
  };

  const status = get(["Status", "status"]).toLowerCase();
  return {
    admNo: get(["Adm.No", "AdmNo", "admNo", "Admission No", "adm_no"]),
    fullName: get(["Full Name", "fullName", "full_name", "Name"]),
    fatherName: get(["Father Name", "fatherName", "father_name"]),
    fatherMobile: get(["Father Mobile", "fatherMobile", "father_mobile"]),
    motherName: get(["Mother Name", "motherName", "mother_name"]),
    motherMobile: get(["Mother Mobile", "motherMobile", "mother_mobile"]),
    mobile: get(["Mobile", "mobile", "Phone"]),
    dob: get(["DOB", "dob", "Date of Birth"]),
    gender: get(["Gender", "gender"]) || "Male",
    class: get(["Class", "class", "className"]),
    section: get(["Section", "section"]),
    rollNo: get(["Roll No", "rollNo", "roll_no"]),
    category: get(["Category", "category"]),
    address: get(["Address", "address"]),
    village: get(["Village", "village"]),
    aadhaarNo: get(["Aadhaar No", "aadhaarNo", "aadhaar_no", "Aadhaar"]),
    srNo: get(["SR No", "srNo", "sr_no", "SR Number"]),
    penNo: get(["Pen No", "penNo", "pen_no", "PEN"]),
    apaarNo: get(["APAAR No", "apaarNo", "apaar_no", "APAAR"]),
    previousSchool: get([
      "Previous School",
      "previousSchool",
      "previous_school",
    ]),
    admissionDate: get(["Admission Date", "admissionDate", "admission_date"]),
    guardianMobile: get(["Father Mobile", "fatherMobile", "father_mobile"]),
    status: status === "discontinued" ? "discontinued" : "active",
  };
}

type ImportPhase =
  | "idle"
  | "parsing"
  | "preview"
  | "importing"
  | "done"
  | "error";

export default function StudentImportExport({ onClose, onImported }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{
    success: number;
    failed: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Download template ───────────────────────────────────────────────────────
  async function downloadTemplate() {
    try {
      const xlsx = await import("xlsx");
      const ws = xlsx.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Students Template");
      xlsx.writeFile(wb, "students_import_template.xlsx");
    } catch {
      // Fallback: CSV template
      const csv = `${TEMPLATE_HEADERS.join(",")}\n`;
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "students_import_template.csv";
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  // ── Parse uploaded file ─────────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhase("parsing");
    setErrorMsg(null);

    try {
      const xlsx = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = xlsx.read(buffer, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });

      const payloads = raw
        .filter((row) => {
          const r = rowToPayload(row);
          return r.admNo || r.fullName;
        })
        .map(rowToPayload);

      if (payloads.length === 0) {
        setErrorMsg(
          "No valid rows found. Make sure the file has Adm.No or Full Name columns.",
        );
        setPhase("error");
        return;
      }

      setPreviewRows(payloads);
      setPhase("preview");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to parse file");
      setPhase("error");
    }

    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Upload to server ────────────────────────────────────────────────────────
  async function startImport() {
    setPhase("importing");
    setProgress({ done: 0, total: previewRows.length });

    const BATCH = 100;
    let totalSuccess = 0;
    let totalFailed = 0;

    try {
      for (let i = 0; i < previewRows.length; i += BATCH) {
        const batch = previewRows.slice(i, i + BATCH);
        try {
          const res = await phpApiService.bulkImportStudents(batch);
          // Count from SERVER response, not local batch length
          const confirmed = res?.count ?? batch.length;
          totalSuccess += confirmed;
          totalFailed += batch.length - confirmed;
        } catch {
          totalFailed += batch.length;
        }
        setProgress({
          done: Math.min(i + BATCH, previewRows.length),
          total: previewRows.length,
        });
      }

      setResult({ success: totalSuccess, failed: totalFailed });
      setPhase("done");
      // Trigger parent refresh
      if (totalSuccess > 0) {
        await onImported();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Import failed");
      setPhase("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      data-ocid="student_import.dialog"
    >
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            <h2 className="font-display font-bold text-foreground text-base">
              Import Students
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onClose}
            data-ocid="student_import.close_button"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-5 space-y-4">
          {/* Step 1: Download template */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
              1
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Download Template
              </p>
              <p className="text-xs text-muted-foreground">
                Fill this Excel file with your student data
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 flex-shrink-0"
              onClick={() => void downloadTemplate()}
              data-ocid="student_import.template_button"
            >
              <Download className="w-3.5 h-3.5" />
              Template
            </Button>
          </div>

          {/* Step 2: Upload file */}
          {(phase === "idle" || phase === "error") && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                2
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Upload File
                </p>
                <p className="text-xs text-muted-foreground">
                  CSV or Excel (.xlsx) accepted
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
                data-ocid="student_import.upload_button"
              >
                <Upload className="w-3.5 h-3.5" />
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => void handleFileChange(e)}
              />
            </div>
          )}

          {/* Parsing */}
          {phase === "parsing" && (
            <div
              className="flex items-center gap-2 py-4 justify-center text-muted-foreground"
              data-ocid="student_import.loading_state"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Parsing file…</span>
            </div>
          )}

          {/* Error */}
          {phase === "error" && errorMsg && (
            <div
              className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-sm text-destructive"
              data-ocid="student_import.error_state"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview */}
          {phase === "preview" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  {previewRows.length} students ready to import
                </p>
              </div>

              {/* Preview table — first 5 rows */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-44">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60 sticky top-0">
                      <tr>
                        {[
                          "Adm.No",
                          "Full Name",
                          "Class",
                          "Section",
                          "Father Mobile",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.slice(0, 5).map((row, i) => (
                        <tr
                          key={`preview-row-${row.admNo || row.fullName || String(i)}`}
                          className="border-t border-border/40"
                        >
                          <td className="px-2 py-1">{row.admNo || "—"}</td>
                          <td className="px-2 py-1 truncate max-w-[120px]">
                            {row.fullName || "—"}
                          </td>
                          <td className="px-2 py-1">{row.class || "—"}</td>
                          <td className="px-2 py-1">{row.section || "—"}</td>
                          <td className="px-2 py-1">
                            {row.fatherMobile || "—"}
                          </td>
                        </tr>
                      ))}
                      {previewRows.length > 5 && (
                        <tr className="border-t border-border/40">
                          <td
                            colSpan={5}
                            className="px-2 py-1 text-muted-foreground text-center"
                          >
                            … and {previewRows.length - 5} more rows
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Importing progress */}
          {phase === "importing" && (
            <div className="space-y-2" data-ocid="student_import.loading_state">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>
                  Importing {progress.done} of {progress.total}…
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Please wait, do not close this window.
              </p>
            </div>
          )}

          {/* Done */}
          {phase === "done" && result && (
            <div className="space-y-2" data-ocid="student_import.success_state">
              <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg text-sm text-green-700 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">
                  Successfully imported {result.success} student
                  {result.success !== 1 ? "s" : ""}.
                  {result.failed > 0 && ` ${result.failed} failed.`}
                </span>
              </div>
              {result.failed > 0 && (
                <p className="text-xs text-muted-foreground">
                  Failures may be due to duplicate admission numbers or missing
                  required fields.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            data-ocid="student_import.cancel_button"
          >
            {phase === "done" ? "Close" : "Cancel"}
          </Button>
          {phase === "preview" && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => void startImport()}
              data-ocid="student_import.confirm_button"
            >
              <Upload className="w-3.5 h-3.5" />
              Import {previewRows.length} Students
            </Button>
          )}
          {phase === "error" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPhase("idle")}
              data-ocid="student_import.retry_button"
            >
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
