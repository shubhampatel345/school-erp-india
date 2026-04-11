import { Button } from "@/components/ui/button";
import { Download, Upload, X } from "lucide-react";
import { useRef } from "react";
import { useApp } from "../context/AppContext";
import type { Student } from "../types";
import { CLASSES, SECTIONS, generateId, ls } from "../utils/localStorage";

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
];

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export default function StudentImportExport({ onClose, onImported }: Props) {
  const { currentSession, addNotification } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);

  function escapeCSV(val: string) {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }

  function handleExport() {
    const students = ls.get<Student[]>("students", []);
    if (students.length === 0) {
      addNotification("No students to export", "warning");
      return;
    }
    const rows = students.map((s) => [
      s.admNo,
      s.fullName,
      s.fatherName,
      s.fatherMobile ?? "",
      s.motherName,
      s.motherMobile ?? "",
      s.dob,
      s.gender,
      s.class,
      s.section,
      s.mobile,
      s.guardianMobile,
      s.category,
      escapeCSV(s.address),
      s.aadhaarNo ?? "",
      s.srNo ?? "",
      s.penNo ?? "",
      s.apaarNo ?? "",
      escapeCSV(s.previousSchool ?? ""),
      s.admissionDate ?? "",
    ]);
    const csv = [CSV_HEADERS.join(","), ...rows.map((r) => r.join(","))].join(
      "\n",
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students_export.csv";
    a.click();
    URL.revokeObjectURL(url);
    addNotification(`Exported ${students.length} students`, "success", "📥");
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) {
        addNotification("CSV file is empty or invalid", "error");
        return;
      }
      const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const getIdx = (name: string) =>
        header.findIndex((h) => h.includes(name.toLowerCase()));

      const idxMap = {
        admNo: getIdx("adm"),
        fullName: getIdx("full name"),
        fatherName: getIdx("father name"),
        fatherMobile: getIdx("father mobile"),
        motherName: getIdx("mother name"),
        motherMobile: getIdx("mother mobile"),
        dob: getIdx("dob"),
        gender: getIdx("gender"),
        class: getIdx("class"),
        section: getIdx("section"),
        mobile: getIdx("mobile"),
        guardianMobile: getIdx("guardian"),
        category: getIdx("category"),
        address: getIdx("address"),
        aadhaarNo: getIdx("aadhaar"),
        srNo: getIdx("sr no"),
        penNo: getIdx("pen no"),
        apaarNo: getIdx("apaar"),
        previousSchool: getIdx("previous school"),
        admissionDate: getIdx("admission date"),
      };

      const existing = ls.get<Student[]>("students", []);
      const sessionId = currentSession?.id ?? "sess_2025";
      let count = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols =
          lines[i].match(/(".*?"|[^,]+)(?=,|$)/g) ?? lines[i].split(",");
        const get = (idx: number) =>
          idx >= 0 ? (cols[idx] ?? "").trim().replace(/^"|"$/g, "") : "";

        const admNo = get(idxMap.admNo);
        if (!admNo) continue;

        const dob = get(idxMap.dob);
        const dobForPassword = dob.replace(/\//g, "").replace(/-/g, "");
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
          credentials: { username: admNo, password: dobForPassword },
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
          <div className="border border-border rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              Export Students to CSV
            </h3>
            <p className="text-sm text-muted-foreground">
              Downloads all students as a CSV. Includes: Adm.No, Full Name,
              Father/Mother details, DOB, Gender, Class, Section, Mobile,
              Category, Address, Aadhaar, SR No, Pen No, APAAR No, Previous
              School, Admission Date.
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

          <div className="border border-border rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              Import Students from CSV
            </h3>
            <p className="text-sm text-muted-foreground">
              Upload a CSV with the same column structure. Existing students
              (matching Adm.No) are updated. Credentials are auto-set:
              username=Adm.No, password=DOB (ddmmyyyy).
            </p>
            <Button
              onClick={() => fileRef.current?.click()}
              className="w-full"
              variant="outline"
              data-ocid="students-import-btn"
            >
              <Upload className="w-4 h-4 mr-2" /> Choose CSV File
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImport}
            />
          </div>

          <div className="bg-muted/40 rounded-lg p-3">
            <p className="text-xs text-muted-foreground font-medium mb-1">
              CSV Column Order:
            </p>
            <p className="text-xs text-muted-foreground font-mono leading-relaxed">
              {CSV_HEADERS.join(", ")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
