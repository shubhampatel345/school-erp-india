import {
  ArrowRight,
  Calendar,
  ChevronRight,
  Download,
  FileText,
  GraduationCap,
  MessageSquare,
  Pencil,
  Printer,
  Upload,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { addERPNotification } from "../components/layout/Header";
import {
  generateCredentialsFromData,
  getAllCredentials,
  useAuth,
} from "../context/AuthContext";
import { StudentAdmissionForm } from "./StudentAdmissionForm";

interface Student {
  id: number;
  admNo: string;
  name: string;
  fatherName: string;
  motherName: string;
  className: string;
  section: string;
  rollNo: string;
  dob: string;
  contact: string;
  route: string;
  schNo: string;
  oldBalance: number;
  status: "Active" | "Inactive" | "Discontinued";
  category?: string;
  // Extra fields
  admissionDate?: string;
  aadharNo?: string;
  srNo?: string;
  penNo?: string;
  apaarNo?: string;
  prevSchoolName?: string;
  prevSchoolTcNo?: string;
  prevSchoolLeavingDate?: string;
  prevSchoolClass?: string;
  gender?: string;
  bloodGroup?: string;
  religion?: string;
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
  // Discontinued fields
  leavingDate?: string;
  leavingReason?: string;
  leavingRemarks?: string;
  session?: string;
  prevSessionDues?: Array<{
    month: string;
    sessionLabel: string;
    amount: number;
  }>;
}

const MONTHS = [
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

const SORT_FIELDS = [
  { label: "Admission No.", key: "admNo" },
  { label: "Student Name", key: "name" },
  { label: "Father Name", key: "fatherName" },
  { label: "Class", key: "className" },
  { label: "Roll No.", key: "rollNo" },
  { label: "D.O.B", key: "dob" },
];

const FILTER_FIELDS = ["Admission No.", "Student Name", "Father Name"];

const CSV_HEADERS = [
  "Adm No",
  "Full Name",
  "Admission Date",
  "Aadhar No",
  "SR No",
  "PEN No",
  "APAAR No",
  "Father",
  "Mother",
  "Class",
  "Section",
  "Roll No",
  "DOB",
  "Contact",
  "Route",
  "Sch No",
  "Old Balance",
  "Category",
  "Prev School Name",
  "Prev School TC No",
  "Prev School Leaving Date",
  "Prev School Class",
];

const LEAVING_REASONS = [
  "TC Issued",
  "Transfer",
  "Family Relocation",
  "Fee Default",
  "Passed Out",
  "Other",
];

// Print list columns
const PRINT_COLUMNS = [
  { key: "admNo", label: "Adm No" },
  { key: "name", label: "Name" },
  { key: "fatherName", label: "Father" },
  { key: "motherName", label: "Mother" },
  { key: "className", label: "Class" },
  { key: "section", label: "Section" },
  { key: "rollNo", label: "Roll No" },
  { key: "dob", label: "DOB" },
  { key: "contact", label: "Contact" },
  { key: "route", label: "Route" },
  { key: "category", label: "Category" },
  { key: "status", label: "Status" },
  { key: "oldBalance", label: "Old Balance" },
];

function getFieldValue(s: Student, field: string): string {
  const map: Record<string, string> = {
    "Admission No.": s.admNo,
    "Student Name": s.name,
    "Father Name": s.fatherName,
  };
  return (map[field] || "").toLowerCase();
}

function parseCSV(text: string): Student[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  const students: Student[] = [];
  let nextId = Date.now();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    if (cols.length < 2) continue;
    const get = (h: string) => cols[headers.indexOf(h)] ?? "";
    students.push({
      id: nextId++,
      admNo: get("Adm No"),
      name: get("Full Name"),
      admissionDate: get("Admission Date"),
      aadharNo: get("Aadhar No"),
      srNo: get("SR No"),
      penNo: get("PEN No"),
      apaarNo: get("APAAR No"),
      fatherName: get("Father"),
      motherName: get("Mother"),
      className: get("Class"),
      section: get("Section"),
      rollNo: get("Roll No"),
      dob: get("DOB"),
      contact: get("Contact"),
      route: get("Route") || "N.A.",
      schNo: get("Sch No"),
      oldBalance: Number(get("Old Balance")) || 0,
      category: get("Category") || "General",
      prevSchoolName: get("Prev School Name"),
      prevSchoolTcNo: get("Prev School TC No"),
      prevSchoolLeavingDate: get("Prev School Leaving Date"),
      prevSchoolClass: get("Prev School Class"),
      status: "Active",
    });
  }
  return students;
}

// ─── Admission Form Print Preview ─────────────────────────────────────────────
function AdmissionFormPreview({
  student,
  onClose,
}: {
  student: Student;
  onClose: () => void;
}) {
  const [template, setTemplate] = useState<1 | 2 | 3>(1);

  const schoolProfile = (() => {
    try {
      return JSON.parse(localStorage.getItem("erp_school_profile") || "{}");
    } catch {
      return {};
    }
  })();
  const schoolName = schoolProfile.name || "Delhi Public School";
  const schoolAddress = schoolProfile.address || "Sector 14, Dwarka, New Delhi";
  const schoolPhone = schoolProfile.phone || "";

  const handlePrint = () => {
    const el = document.getElementById("adm-form-print-area");
    if (!el) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(
      `<html><head><title>Admission Form - ${student.name}</title><style>@page{size:A4;margin:10mm}body{margin:0;font-family:Arial,sans-serif;font-size:10px}*{box-sizing:border-box}table{border-collapse:collapse;width:100%}th,td{padding:4px 6px}@media print{.no-print{display:none}}</style></head><body>${el.innerHTML}</body></html>`,
    );
    win.document.close();
    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  };

  const renderTemplate1 = () => (
    <div
      style={{
        background: "#fff",
        color: "#1a1a1a",
        fontFamily: "Arial, sans-serif",
        fontSize: 10,
        padding: 20,
        width: "100%",
        maxWidth: 700,
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: "center",
          borderBottom: "3px double #1e3a5f",
          paddingBottom: 10,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 18,
            color: "#1e3a5f",
            letterSpacing: 1,
          }}
        >
          {schoolName.toUpperCase()}
        </div>
        <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
          {schoolAddress}
          {schoolPhone ? ` | Ph: ${schoolPhone}` : ""}
        </div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 14,
            marginTop: 8,
            background: "#1e3a5f",
            color: "#fff",
            padding: "4px 0",
            letterSpacing: 2,
          }}
        >
          ADMISSION FORM
        </div>
      </div>

      {/* Photo + Adm No */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <table style={{ width: "70%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td
                style={{
                  border: "1px solid #aaa",
                  padding: "4px 8px",
                  background: "#e8f0fe",
                  fontWeight: 700,
                  width: 140,
                }}
              >
                Admission No.
              </td>
              <td style={{ border: "1px solid #aaa", padding: "4px 8px" }}>
                {student.admNo}
              </td>
              <td
                style={{
                  border: "1px solid #aaa",
                  padding: "4px 8px",
                  background: "#e8f0fe",
                  fontWeight: 700,
                }}
              >
                Date
              </td>
              <td style={{ border: "1px solid #aaa", padding: "4px 8px" }}>
                {student.admissionDate || ""}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  border: "1px solid #aaa",
                  padding: "4px 8px",
                  background: "#e8f0fe",
                  fontWeight: 700,
                }}
              >
                Class
              </td>
              <td style={{ border: "1px solid #aaa", padding: "4px 8px" }}>
                {student.className}
              </td>
              <td
                style={{
                  border: "1px solid #aaa",
                  padding: "4px 8px",
                  background: "#e8f0fe",
                  fontWeight: 700,
                }}
              >
                Section
              </td>
              <td style={{ border: "1px solid #aaa", padding: "4px 8px" }}>
                {student.section}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  border: "1px solid #aaa",
                  padding: "4px 8px",
                  background: "#e8f0fe",
                  fontWeight: 700,
                }}
              >
                Roll No.
              </td>
              <td style={{ border: "1px solid #aaa", padding: "4px 8px" }}>
                {student.rollNo}
              </td>
              <td
                style={{
                  border: "1px solid #aaa",
                  padding: "4px 8px",
                  background: "#e8f0fe",
                  fontWeight: 700,
                }}
              >
                SR No.
              </td>
              <td style={{ border: "1px solid #aaa", padding: "4px 8px" }}>
                {student.srNo || ""}
              </td>
            </tr>
          </tbody>
        </table>
        <div
          style={{
            width: 90,
            height: 110,
            border: "2px solid #1e3a5f",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            color: "#aaa",
            fontSize: 9,
            gap: 4,
          }}
        >
          <div style={{ fontSize: 22 }}>👤</div>
          <span>PHOTO</span>
        </div>
      </div>

      {/* Section 2: Personal Details */}
      <SectionBlock title="PERSONAL DETAILS" color="#1e3a5f">
        <TwoColTable
          rows={[
            ["Full Name", student.name, "Gender", student.gender || ""],
            [
              "Date of Birth",
              student.dob,
              "Blood Group",
              student.bloodGroup || "",
            ],
            [
              "Category",
              student.category || "",
              "Religion",
              student.religion || "",
            ],
            ["Nationality", "Indian", "Aadhaar No.", student.aadharNo || ""],
            [
              "PEN No.",
              student.penNo || "",
              "APAAR No.",
              student.apaarNo || "",
            ],
          ]}
        />
      </SectionBlock>

      {/* Section 3: Parent/Guardian */}
      <SectionBlock title="PARENT / GUARDIAN DETAILS" color="#1e3a5f">
        <TwoColTable
          rows={[
            [
              "Father's Name",
              student.fatherName,
              "Mother's Name",
              student.motherName,
            ],
            [
              "Contact No.",
              student.contact,
              "Guardian Name",
              student.guardianName || "",
            ],
          ]}
        />
      </SectionBlock>

      {/* Section 4: Address */}
      <SectionBlock title="ADDRESS DETAILS" color="#1e3a5f">
        <TwoColTable
          rows={[
            [
              "Current Address",
              student.address || "",
              "Permanent Address",
              student.address || "",
            ],
          ]}
        />
      </SectionBlock>

      {/* Section 5: Previous School */}
      <SectionBlock title="PREVIOUS SCHOOL DETAILS" color="#1e3a5f">
        <TwoColTable
          rows={[
            [
              "School Name",
              student.prevSchoolName || "",
              "Last Class",
              student.prevSchoolClass || "",
            ],
            [
              "TC Number",
              student.prevSchoolTcNo || "",
              "Leaving Date",
              student.prevSchoolLeavingDate || "",
            ],
          ]}
        />
      </SectionBlock>

      {/* Section 6: Transport */}
      <SectionBlock title="TRANSPORT DETAILS" color="#1e3a5f">
        <TwoColTable
          rows={[
            ["Route", student.route || "N.A.", "Sch. No.", student.schNo || ""],
          ]}
        />
      </SectionBlock>

      {/* Section 7: Documents */}
      <SectionBlock title="DOCUMENTS SUBMITTED" color="#1e3a5f">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 4,
            padding: "4px 0",
          }}
        >
          {[
            "Birth Certificate",
            "Aadhaar Card",
            "Transfer Certificate",
            "Report Card",
            "Passport Photo",
            "Address Proof",
          ].map((doc) => (
            <div
              key={doc}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 12,
                  border: "1px solid #555",
                }}
              />
              <span>{doc}</span>
            </div>
          ))}
        </div>
      </SectionBlock>

      {/* Section 8: Declaration */}
      <SectionBlock title="DECLARATION" color="#1e3a5f">
        <p style={{ marginBottom: 8, lineHeight: 1.6 }}>
          I hereby declare that the information provided above is true and
          correct to the best of my knowledge. I agree to abide by the rules and
          regulations of the school.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            marginTop: 24,
            gap: 16,
          }}
        >
          <div
            style={{
              textAlign: "center",
              borderTop: "1px solid #555",
              paddingTop: 4,
            }}
          >
            Parent / Guardian Signature
          </div>
          <div
            style={{
              textAlign: "center",
              borderTop: "1px solid #555",
              paddingTop: 4,
            }}
          >
            Date
          </div>
          <div
            style={{
              textAlign: "center",
              borderTop: "1px solid #555",
              paddingTop: 4,
            }}
          >
            Principal Signature
          </div>
        </div>
      </SectionBlock>
    </div>
  );

  const renderTemplate2 = () => (
    <div
      style={{
        background: "#fff",
        color: "#1a1a1a",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        fontSize: 10,
        padding: 20,
        width: "100%",
        maxWidth: 700,
      }}
    >
      {/* Modern gradient header */}
      <div
        style={{
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          color: "#fff",
          padding: "16px 20px",
          borderRadius: 8,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            flexShrink: 0,
          }}
        >
          🏫
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: 0.5 }}>
            {schoolName}
          </div>
          <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>
            {schoolAddress}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>ADMISSION FORM</div>
          <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>
            Adm. No: {student.admNo}
          </div>
        </div>
      </div>

      {/* Photo circle + name */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            border: "3px solid #6366f1",
            background: "#f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            margin: "0 auto 8px",
          }}
        >
          👤
        </div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{student.name}</div>
        <div style={{ color: "#6366f1", fontSize: 11 }}>
          Class {student.className} | Section {student.section}
        </div>
        <div style={{ color: "#6b7280", fontSize: 10, marginTop: 2 }}>
          Admitted: {student.admissionDate || "—"}
        </div>
      </div>

      {/* Card grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <CardSection
          title="📋 Academic Info"
          items={[
            { label: "Roll No.", value: student.rollNo },
            { label: "Class", value: student.className },
            { label: "Section", value: student.section },
            { label: "SR No.", value: student.srNo || "—" },
            { label: "Category", value: student.category || "—" },
          ]}
        />
        <CardSection
          title="👤 Personal Info"
          items={[
            { label: "Date of Birth", value: student.dob },
            { label: "Gender", value: student.gender || "—" },
            { label: "Blood Group", value: student.bloodGroup || "—" },
            { label: "Aadhaar No.", value: student.aadharNo || "—" },
            { label: "Religion", value: student.religion || "—" },
          ]}
        />
        <CardSection
          title="👨‍👩‍👧 Parent Details"
          items={[
            { label: "Father", value: student.fatherName },
            { label: "Mother", value: student.motherName },
            { label: "Contact", value: student.contact },
            { label: "Guardian", value: student.guardianName || "—" },
          ]}
        />
        <CardSection
          title="🏫 Previous School"
          items={[
            { label: "School", value: student.prevSchoolName || "—" },
            { label: "Last Class", value: student.prevSchoolClass || "—" },
            { label: "TC No.", value: student.prevSchoolTcNo || "—" },
            {
              label: "Leaving Date",
              value: student.prevSchoolLeavingDate || "—",
            },
          ]}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          marginTop: 24,
          gap: 16,
          borderTop: "2px solid #e5e7eb",
          paddingTop: 12,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ height: 32 }} />
          <div
            style={{
              borderTop: "1px solid #555",
              paddingTop: 4,
              fontSize: 10,
              color: "#555",
            }}
          >
            Parent Signature
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ height: 32 }} />
          <div
            style={{
              borderTop: "1px solid #555",
              paddingTop: 4,
              fontSize: 10,
              color: "#555",
            }}
          >
            Date
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ height: 32 }} />
          <div
            style={{
              borderTop: "1px solid #555",
              paddingTop: 4,
              fontSize: 10,
              color: "#555",
            }}
          >
            Principal
          </div>
        </div>
      </div>
    </div>
  );

  const renderTemplate3 = () => (
    <div
      style={{
        background: "#fff",
        color: "#1a1a1a",
        fontFamily: "Arial, sans-serif",
        fontSize: 10,
        padding: 20,
        width: "100%",
        maxWidth: 700,
        border: "2px solid #1e3a5f",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 18,
            color: "#1e3a5f",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {schoolName}
        </div>
        <div style={{ fontSize: 10, color: "#555" }}>{schoolAddress}</div>
        <div
          style={{
            marginTop: 6,
            fontWeight: 700,
            fontSize: 13,
            background: "#1e3a5f",
            color: "#fff",
            padding: "3px 0",
            letterSpacing: 3,
          }}
        >
          STUDENT ADMISSION FORM
        </div>
        <div style={{ fontSize: 9, color: "#888", marginTop: 2 }}>
          Session: {new Date().getFullYear()}-{new Date().getFullYear() + 1}
        </div>
      </div>

      {/* Full form table */}
      <table
        style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}
      >
        <tbody>
          <DRow
            label="Admission No."
            value={student.admNo}
            label2="Admission Date"
            value2={student.admissionDate || ""}
          />
          <DRow
            label="Full Name"
            value={student.name}
            label2="Roll No."
            value2={student.rollNo}
          />
          <DRow
            label="Class"
            value={student.className}
            label2="Section"
            value2={student.section}
          />
          <DRow
            label="Date of Birth"
            value={student.dob}
            label2="Gender"
            value2={student.gender || ""}
          />
          <DRow
            label="Blood Group"
            value={student.bloodGroup || ""}
            label2="Category"
            value2={student.category || ""}
          />
          <DRow
            label="Religion"
            value={student.religion || ""}
            label2="Nationality"
            value2="Indian"
          />
          <DRow
            label="Aadhaar No."
            value={student.aadharNo || ""}
            label2="SR No."
            value2={student.srNo || ""}
          />
          <DRow
            label="PEN No."
            value={student.penNo || ""}
            label2="APAAR No."
            value2={student.apaarNo || ""}
          />
        </tbody>
      </table>

      <FullWidthSection title="PARENT / GUARDIAN INFORMATION">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <DRow
              label="Father's Name"
              value={student.fatherName}
              label2="Mobile"
              value2={student.contact}
            />
            <DRow
              label="Mother's Name"
              value={student.motherName}
              label2="Guardian Name"
              value2={student.guardianName || ""}
            />
            <DRow
              label="Guardian Phone"
              value={student.guardianPhone || ""}
              label2="Address"
              value2={student.address || ""}
            />
          </tbody>
        </table>
      </FullWidthSection>

      <FullWidthSection title="PREVIOUS SCHOOL DETAILS">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <DRow
              label="Previous School"
              value={student.prevSchoolName || ""}
              label2="Last Class"
              value2={student.prevSchoolClass || ""}
            />
            <DRow
              label="TC Number"
              value={student.prevSchoolTcNo || ""}
              label2="Leaving Date"
              value2={student.prevSchoolLeavingDate || ""}
            />
          </tbody>
        </table>
      </FullWidthSection>

      <FullWidthSection title="TRANSPORT / MISCELLANEOUS">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <DRow
              label="Route"
              value={student.route || "N.A."}
              label2="Sch. No."
              value2={student.schNo || ""}
            />
            <DRow
              label="Old Balance"
              value={student.oldBalance ? `₹${student.oldBalance}` : "0"}
              label2="Status"
              value2={student.status}
            />
          </tbody>
        </table>
      </FullWidthSection>

      <FullWidthSection title="DOCUMENTS CHECKLIST">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 6,
            padding: "4px 0",
          }}
        >
          {[
            "Birth Certificate",
            "Aadhaar Card",
            "TC Certificate",
            "Report Card",
            "Passport Photos (4)",
            "Address Proof",
            "Income Certificate",
            "Caste Certificate",
            "Medical Certificate",
          ].map((doc) => (
            <div
              key={doc}
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 11,
                  height: 11,
                  border: "1px solid #555",
                }}
              />
              <span style={{ fontSize: 9 }}>{doc}</span>
            </div>
          ))}
        </div>
      </FullWidthSection>

      <div
        style={{
          background: "#f0f4ff",
          border: "1px solid #1e3a5f",
          padding: "6px 10px",
          marginBottom: 12,
          borderRadius: 2,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 10,
            color: "#1e3a5f",
            marginBottom: 4,
          }}
        >
          FOR OFFICE USE ONLY
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
          }}
        >
          <div style={{ borderBottom: "1px dotted #555", paddingBottom: 4 }}>
            Fee Category: ____________
          </div>
          <div style={{ borderBottom: "1px dotted #555", paddingBottom: 4 }}>
            Verified By: ____________
          </div>
          <div style={{ borderBottom: "1px dotted #555", paddingBottom: 4 }}>
            Entry No: ____________
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          marginTop: 20,
          gap: 16,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ height: 40 }} />
          <div style={{ borderTop: "1px solid #333", paddingTop: 4 }}>
            Parent / Guardian Signature
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ height: 40 }} />
          <div style={{ borderTop: "1px solid #333", paddingTop: 4 }}>
            Student Signature
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ height: 40 }} />
          <div style={{ borderTop: "1px solid #333", paddingTop: 4 }}>
            Principal / Registrar
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gray-900/95"
      style={{ overflowY: "auto" }}
      data-ocid="admform.modal"
    >
      {/* Controls bar */}
      <div
        className="no-print sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-gray-700"
        style={{ background: "#1a1f2e" }}
      >
        <span className="text-white font-bold text-sm">
          Admission Form Preview — {student.name}
        </span>
        <div className="flex gap-1 ml-4">
          {([1, 2, 3] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTemplate(t)}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                template === t
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              data-ocid={`admform.template.${t}`}
            >
              Template {t}{" "}
              {t === 1 ? "(Classic)" : t === 2 ? "(Modern)" : "(Detailed)"}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded font-semibold transition"
            data-ocid="admform.print_button"
          >
            <Printer size={13} /> Print
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs px-4 py-2 rounded font-medium transition"
            data-ocid="admform.close_button"
          >
            <X size={13} /> Close
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto px-6 py-6 flex justify-center">
        <div
          id="adm-form-print-area"
          style={{
            background: "#fff",
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            borderRadius: 4,
            minHeight: 800,
          }}
        >
          {template === 1 && renderTemplate1()}
          {template === 2 && renderTemplate2()}
          {template === 3 && renderTemplate3()}
        </div>
      </div>
    </div>
  );
}

// Helper sub-components for Admission Form templates
function SectionBlock({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          background: color,
          color: "#fff",
          padding: "3px 8px",
          fontWeight: 700,
          fontSize: 10,
          letterSpacing: 0.5,
        }}
      >
        {title}
      </div>
      <div
        style={{
          border: "1px solid #aaa",
          borderTop: "none",
          padding: "4px 6px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function FullWidthSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          background: "#1e3a5f",
          color: "#fff",
          padding: "3px 8px",
          fontWeight: 700,
          fontSize: 10,
          letterSpacing: 0.5,
        }}
      >
        {title}
      </div>
      <div
        style={{
          border: "1px solid #aaa",
          borderTop: "none",
          padding: "4px 6px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function TwoColTable({ rows }: { rows: [string, string, string, string][] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <tbody>
        {rows.map((row) => (
          <tr key={`row-${row[0]}-${row[2]}`}>
            <td
              style={{
                border: "1px solid #ccc",
                padding: "3px 6px",
                background: "#f0f4ff",
                fontWeight: 600,
                width: 100,
              }}
            >
              {row[0]}
            </td>
            <td
              style={{
                border: "1px solid #ccc",
                padding: "3px 6px",
                width: 160,
              }}
            >
              {row[1]}
            </td>
            <td
              style={{
                border: "1px solid #ccc",
                padding: "3px 6px",
                background: "#f0f4ff",
                fontWeight: 600,
                width: 100,
              }}
            >
              {row[2]}
            </td>
            <td style={{ border: "1px solid #ccc", padding: "3px 6px" }}>
              {row[3]}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DRow({
  label,
  value,
  label2,
  value2,
}: {
  label: string;
  value: string;
  label2: string;
  value2: string;
}) {
  return (
    <tr>
      <td
        style={{
          border: "1px solid #ccc",
          padding: "3px 6px",
          background: "#f0f4ff",
          fontWeight: 600,
          width: 120,
        }}
      >
        {label}
      </td>
      <td style={{ border: "1px solid #ccc", padding: "3px 6px", width: 160 }}>
        {value}
      </td>
      <td
        style={{
          border: "1px solid #ccc",
          padding: "3px 6px",
          background: "#f0f4ff",
          fontWeight: 600,
          width: 120,
        }}
      >
        {label2}
      </td>
      <td style={{ border: "1px solid #ccc", padding: "3px 6px" }}>{value2}</td>
    </tr>
  );
}

function CardSection({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: string }[];
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: "#6366f1",
          color: "#fff",
          padding: "4px 8px",
          fontWeight: 700,
          fontSize: 10,
        }}
      >
        {title}
      </div>
      <div style={{ padding: "6px 8px" }}>
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "2px 0",
              borderBottom: "1px dotted #eee",
            }}
          >
            <span style={{ color: "#6b7280", fontSize: 9 }}>{item.label}</span>
            <span style={{ fontWeight: 600, fontSize: 10 }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Student Detail Modal ─────────────────────────────────────────────────────
function StudentDetailModal({
  student,
  onClose,
  onEdit,
  onDiscontinue,
}: {
  student: Student;
  onClose: () => void;
  onEdit: () => void;
  onDiscontinue: () => void;
}) {
  const { user: currentUser } = useAuth();
  const [detailTab, setDetailTab] = useState<
    "info" | "fees" | "transport" | "discounts" | "oldfees" | "credentials"
  >("info");

  const SCHOOL_MONTHS = [
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
    "Jan",
    "Feb",
    "Mar",
  ];

  // Load fee data for this student
  const feesData = (() => {
    try {
      const plans = JSON.parse(
        localStorage.getItem("erp_fee_plans") || "[]",
      ) as Array<{
        className: string;
        feesHead: string;
        value: number;
        category?: string;
      }>;
      const payments = JSON.parse(
        localStorage.getItem("erp_fee_payments") || "[]",
      ) as Array<{
        admNo: string;
        months: string[];
        feeRows: Array<{
          feeHead: string;
          months: Record<string, number>;
          checked: boolean;
        }>;
        receiptAmt: number;
      }>;
      const studentPayments = payments.filter((p) => p.admNo === student.admNo);
      const classPlans = plans.filter((p) => p.className === student.className);
      const feeHeads =
        classPlans.length > 0
          ? [...new Set(classPlans.map((p) => p.feesHead))]
          : ["Tuition Fee", "Exam Fee", "Library Fee", "Sports Fee"];
      return feeHeads.map((head) => {
        const planRow = classPlans.find((p) => p.feesHead === head);
        const monthlyAmt =
          planRow?.value ||
          (head === "Tuition Fee"
            ? 1500
            : head === "Exam Fee"
              ? 200
              : head === "Library Fee"
                ? 100
                : 150);
        const monthStatus: Record<string, "paid" | "due"> = {};
        for (const m of SCHOOL_MONTHS) {
          const paid = studentPayments.some(
            (p) =>
              p.months.includes(m) &&
              p.feeRows.some((r) => r.feeHead === head && r.checked),
          );
          monthStatus[m] = paid ? "paid" : "due";
        }
        const annualTotal = SCHOOL_MONTHS.length * monthlyAmt;
        return { head, monthlyAmt, monthStatus, annualTotal };
      });
    } catch {
      return [];
    }
  })();

  const totalFees = feesData.reduce((s, r) => s + r.annualTotal, 0);
  const paidFees = feesData.reduce((s, r) => {
    return (
      s +
      SCHOOL_MONTHS.filter((m) => r.monthStatus[m] === "paid").length *
        r.monthlyAmt
    );
  }, 0);

  // Load discounts for student
  const discountsData = (() => {
    try {
      const discounts = JSON.parse(
        localStorage.getItem("erp_discounts") || "[]",
      ) as Array<{
        studentId?: string;
        admNo?: string;
        name: string;
        monthlyAmount: number;
        months?: string[];
      }>;
      const studentDiscounts = discounts.filter(
        (d) => d.admNo === student.admNo || d.studentId === String(student.id),
      );
      if (studentDiscounts.length === 0) {
        // Check fee plans for discounts
        // const _plans = JSON.parse(localStorage.getItem("erp_fee_plans") || "[]");
        return [];
      }
      return studentDiscounts.map((d) => ({
        name: d.name,
        monthlyAmount: d.monthlyAmount,
        appliedMonths: d.months || SCHOOL_MONTHS,
        total: d.monthlyAmount * (d.months?.length || SCHOOL_MONTHS.length),
      }));
    } catch {
      return [];
    }
  })();

  const totalDiscount = discountsData.reduce((s, d) => s + d.total, 0);

  // Load transport data
  const transportData = (() => {
    try {
      const routes = JSON.parse(
        localStorage.getItem("erp_transport_routes") || "[]",
      ) as Array<{
        id: number;
        name: string;
        vehicle?: string;
        fee?: number;
        stops?: Array<{ name: string }>;
      }>;
      if (!student.route || student.route === "N.A.") return null;
      const route = routes.find(
        (r) => r.name === student.route || r.id === Number(student.route),
      );
      if (!route)
        return {
          route: student.route,
          vehicle: "—",
          pickup: "—",
          fee: 0,
          assigned: "—",
        };
      const pickup = route.stops?.[0]?.name || "—";
      return {
        route: route.name,
        vehicle: route.vehicle || "—",
        pickup,
        fee: route.fee || 0,
        assigned: student.admissionDate || "—",
      };
    } catch {
      return null;
    }
  })();

  // Load old fees from session archive
  const oldFeesData = (() => {
    try {
      const result: Array<{
        session: string;
        month: string;
        feeHead: string;
        amount: number;
      }> = [];
      if (student.prevSessionDues && student.prevSessionDues.length > 0) {
        for (const d of student.prevSessionDues) {
          result.push({
            session: d.sessionLabel,
            month: d.month,
            feeHead: "Total Fees",
            amount: d.amount,
          });
        }
      }
      // Also check session archives
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("erp_session_archive_")) {
          const archive = JSON.parse(localStorage.getItem(key) || "{}");
          const label =
            archive.sessionLabel || key.replace("erp_session_archive_", "");
          if (archive.studentDues?.[student.admNo]) {
            for (const due of archive.studentDues?.[student.admNo] || []) {
              result.push({
                session: label,
                month: due.month,
                feeHead: due.feeHead || "Fees",
                amount: due.amount,
              });
            }
          }
        }
      }
      return result;
    } catch {
      return [];
    }
  })();

  const totalOldBalance =
    oldFeesData.reduce((s, r) => s + r.amount, 0) + (student.oldBalance || 0);
  const netPayable = totalFees - totalDiscount + totalOldBalance - paidFees;

  // Use auth context to check role - need to add useAuth import check
  // We'll add credentials tab conditionally via the existing userRole variable which comes from useAuth
  const detailTabs = [
    { id: "info" as const, label: "Info" },
    { id: "fees" as const, label: "💰 Fees Details" },
    { id: "transport" as const, label: "🚌 Transport" },
    { id: "discounts" as const, label: "🏷 Discounts" },
    { id: "oldfees" as const, label: "📋 Old Fees" },
    ...(currentUser?.role === "super_admin"
      ? [{ id: "credentials" as const, label: "🔑 Credentials" }]
      : []),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 pt-8 pb-8"
      style={{ overflowY: "auto" }}
      data-ocid="student.modal"
    >
      <div
        className="relative w-full max-w-4xl rounded-xl shadow-2xl"
        style={{ background: "#1a1f2e", border: "1px solid #374151" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 rounded-t-xl"
          style={{ background: "#0f172a", borderBottom: "1px solid #374151" }}
        >
          <div className="flex items-center gap-3">
            {/* Student Photo */}
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-500/40 flex-shrink-0">
              {(student as any).photo ? (
                <img
                  src={(student as any).photo}
                  alt={student.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ background: "#1e3a5f" }}
                >
                  {student.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-white font-bold text-base">{student.name}</h2>
              <span className="text-blue-400 text-xs font-medium">
                {student.admNo}
              </span>
              <span className="text-gray-400 text-xs ml-2">
                {student.className} {student.section}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded font-medium transition"
              data-ocid="student.edit_button"
            >
              <Pencil size={12} /> Edit
            </button>
            {student.status !== "Discontinued" && (
              <button
                type="button"
                onClick={onDiscontinue}
                className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1.5 rounded font-medium transition"
                data-ocid="student.discontinue_button"
              >
                Discontinue
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded transition"
              data-ocid="student.close_button"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className="flex gap-1 px-4 pt-3 pb-0 border-b border-gray-700"
          style={{ background: "#0f172a" }}
        >
          {detailTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setDetailTab(t.id)}
              data-ocid={`student.${t.id}.tab`}
              className={`px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition ${detailTab === t.id ? "border-blue-400 text-blue-300 bg-blue-900/20" : "border-transparent text-gray-400 hover:text-white"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-4">
          {/* INFO TAB */}
          {detailTab === "info" && (
            <div>
              <div className="mb-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    student.status === "Active"
                      ? "bg-green-900/50 text-green-400"
                      : student.status === "Discontinued"
                        ? "bg-red-900/50 text-red-400"
                        : "bg-yellow-900/50 text-yellow-400"
                  }`}
                >
                  {student.status}
                </span>
                {student.status === "Discontinued" && student.leavingDate && (
                  <span className="ml-3 text-gray-400 text-xs">
                    Left on: {student.leavingDate} | Reason:{" "}
                    {student.leavingReason || "—"}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <DetailSection title="Academic Details">
                  <DetailRow label="Adm. No." value={student.admNo} />
                  <DetailRow label="Class" value={student.className} />
                  <DetailRow label="Section" value={student.section} />
                  <DetailRow label="Roll No." value={student.rollNo} />
                  <DetailRow
                    label="Admission Date"
                    value={student.admissionDate || "—"}
                  />
                  <DetailRow label="Sch. No." value={student.schNo || "—"} />
                  <DetailRow label="SR No." value={student.srNo || "—"} />
                  <DetailRow
                    label="Old Balance"
                    value={
                      student.oldBalance
                        ? `₹${student.oldBalance.toLocaleString("en-IN")}`
                        : "₹0"
                    }
                    valueColor={student.oldBalance > 0 ? "#f87171" : undefined}
                  />
                </DetailSection>
                <DetailSection title="Personal Details">
                  <DetailRow label="Date of Birth" value={student.dob || "—"} />
                  <DetailRow label="Gender" value={student.gender || "—"} />
                  <DetailRow
                    label="Blood Group"
                    value={student.bloodGroup || "—"}
                  />
                  <DetailRow label="Category" value={student.category || "—"} />
                  <DetailRow label="Religion" value={student.religion || "—"} />
                  <DetailRow
                    label="Aadhaar No."
                    value={student.aadharNo || "—"}
                  />
                  <DetailRow label="PEN No." value={student.penNo || "—"} />
                  <DetailRow label="APAAR No." value={student.apaarNo || "—"} />
                </DetailSection>
                <DetailSection title="Parent / Guardian">
                  <DetailRow
                    label="Father Name"
                    value={student.fatherName || "—"}
                  />
                  <DetailRow
                    label="Mother Name"
                    value={student.motherName || "—"}
                  />
                  <DetailRow
                    label="Contact No."
                    value={student.contact || "—"}
                  />
                  <DetailRow
                    label="Guardian Name"
                    value={student.guardianName || "—"}
                  />
                  <DetailRow
                    label="Guardian Phone"
                    value={student.guardianPhone || "—"}
                  />
                </DetailSection>
                <DetailSection title="Transport &amp; Other">
                  <DetailRow label="Route" value={student.route || "N.A."} />
                  <DetailRow label="Address" value={student.address || "—"} />
                  <DetailRow
                    label="Prev. School"
                    value={student.prevSchoolName || "—"}
                  />
                  <DetailRow
                    label="Prev. Class"
                    value={student.prevSchoolClass || "—"}
                  />
                  <DetailRow
                    label="TC No."
                    value={student.prevSchoolTcNo || "—"}
                  />
                </DetailSection>
              </div>
            </div>
          )}

          {/* FEES DETAILS TAB */}
          {detailTab === "fees" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white text-sm font-semibold">
                  Fee Details — {student.className}
                </h3>
                <div className="flex gap-4 text-xs">
                  <span className="text-gray-400">
                    Net Payable:{" "}
                    <span className="text-red-400 font-bold">
                      ₹{netPayable.toLocaleString("en-IN")}
                    </span>
                  </span>
                  <span className="text-gray-400">
                    Ledger Bal:{" "}
                    <span className="text-yellow-400 font-bold">
                      ₹
                      {(totalFees - paidFees + totalOldBalance).toLocaleString(
                        "en-IN",
                      )}
                    </span>
                  </span>
                </div>
              </div>
              {feesData.length === 0 ? (
                <div
                  className="text-center text-gray-500 py-8"
                  data-ocid="student.fees.empty_state"
                >
                  No fee plan configured for {student.className}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-700">
                  <table
                    className="w-full text-xs"
                    style={{ borderCollapse: "collapse", minWidth: 900 }}
                  >
                    <thead>
                      <tr style={{ background: "#1a1f2e" }}>
                        <th
                          className="text-left px-3 py-2 text-gray-400 font-medium sticky left-0 bg-gray-900"
                          style={{ minWidth: 130 }}
                        >
                          Fee Head
                        </th>
                        {SCHOOL_MONTHS.map((m) => (
                          <th
                            key={m}
                            className="px-2 py-2 text-gray-400 font-medium text-center"
                            style={{ minWidth: 55 }}
                          >
                            {m}
                          </th>
                        ))}
                        <th
                          className="px-3 py-2 text-gray-400 font-medium text-right"
                          style={{ minWidth: 80 }}
                        >
                          Annual
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {feesData.map((row, i) => (
                        <tr
                          key={row.head}
                          style={{
                            background: i % 2 === 0 ? "#111827" : "#0d111c",
                            borderBottom: "1px solid #1f2937",
                          }}
                        >
                          <td
                            className="px-3 py-2 text-white font-medium sticky left-0"
                            style={{
                              background: i % 2 === 0 ? "#111827" : "#0d111c",
                            }}
                          >
                            {row.head}
                          </td>
                          {SCHOOL_MONTHS.map((m) => (
                            <td key={m} className="px-2 py-2 text-center">
                              {row.monthStatus[m] === "paid" ? (
                                <span className="text-green-400 text-[10px] font-medium">
                                  ✓
                                </span>
                              ) : (
                                <span className="text-red-400 text-[10px]">
                                  ₹{row.monthlyAmt.toLocaleString("en-IN")}
                                </span>
                              )}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-right text-gray-300 font-semibold">
                            ₹{row.annualTotal.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr
                        style={{
                          background: "#1a1f2e",
                          borderTop: "2px solid #374151",
                        }}
                      >
                        <td className="px-3 py-2 text-gray-400 font-semibold sticky left-0 bg-gray-800">
                          TOTAL
                        </td>
                        {SCHOOL_MONTHS.map((m) => {
                          const monthTotal = feesData.reduce(
                            (s, r) =>
                              s +
                              (r.monthStatus[m] === "due" ? r.monthlyAmt : 0),
                            0,
                          );
                          return (
                            <td
                              key={m}
                              className="px-2 py-2 text-center font-bold"
                              style={{
                                color: monthTotal > 0 ? "#f87171" : "#4ade80",
                                fontSize: 10,
                              }}
                            >
                              {monthTotal > 0
                                ? `₹${monthTotal.toLocaleString("en-IN")}`
                                : "✓"}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-right font-bold text-white">
                          ₹{totalFees.toLocaleString("en-IN")}
                        </td>
                      </tr>
                      <tr style={{ background: "#0f172a" }}>
                        <td colSpan={14} className="px-3 py-2">
                          <div className="flex items-center gap-6 text-xs">
                            <span className="text-gray-400">
                              Total Fees:{" "}
                              <span className="text-white font-semibold">
                                ₹{totalFees.toLocaleString("en-IN")}
                              </span>
                            </span>
                            <span className="text-gray-400">
                              Discount:{" "}
                              <span className="text-green-400 font-semibold">
                                -₹{totalDiscount.toLocaleString("en-IN")}
                              </span>
                            </span>
                            <span className="text-gray-400">
                              Old Balance:{" "}
                              <span className="text-red-400 font-semibold">
                                +₹{totalOldBalance.toLocaleString("en-IN")}
                              </span>
                            </span>
                            <span className="text-gray-400">
                              Paid:{" "}
                              <span className="text-green-400 font-semibold">
                                -₹{paidFees.toLocaleString("en-IN")}
                              </span>
                            </span>
                            <span className="text-gray-400 border-l border-gray-700 pl-4">
                              Net Payable:{" "}
                              <span className="text-red-400 font-bold text-sm">
                                ₹{netPayable.toLocaleString("en-IN")}
                              </span>
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TRANSPORT TAB */}
          {detailTab === "transport" && (
            <div>
              <h3 className="text-white text-sm font-semibold mb-3">
                Transport Details
              </h3>
              {!transportData ? (
                <div
                  className="text-center text-gray-500 py-8 rounded-lg border border-dashed border-gray-700"
                  data-ocid="student.transport.empty_state"
                >
                  <div className="text-3xl mb-2">🚌</div>
                  <div>No transport assigned for this student</div>
                </div>
              ) : (
                <div className="rounded-lg overflow-hidden border border-gray-700">
                  <table className="w-full text-xs">
                    <tbody>
                      {[
                        { label: "Route Name", value: transportData.route },
                        { label: "Vehicle No.", value: transportData.vehicle },
                        { label: "Pickup Point", value: transportData.pickup },
                        {
                          label: "Transport Fee",
                          value:
                            transportData.fee > 0
                              ? `₹${transportData.fee.toLocaleString("en-IN")}/month`
                              : "—",
                        },
                        {
                          label: "Assigned Date",
                          value: transportData.assigned,
                        },
                      ].map(({ label, value }, i) => (
                        <tr
                          key={label}
                          style={{
                            background: i % 2 === 0 ? "#111827" : "#0d111c",
                            borderBottom: "1px solid #1f2937",
                          }}
                        >
                          <td className="px-4 py-2.5 text-gray-400 font-medium w-40">
                            {label}
                          </td>
                          <td className="px-4 py-2.5 text-white">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* DISCOUNTS TAB */}
          {detailTab === "discounts" && (
            <div>
              <h3 className="text-white text-sm font-semibold mb-3">
                Discounts
              </h3>
              <p className="text-gray-500 text-xs mb-3">
                Discounts are calculated per month — ₹100/month discount = ₹100
                deducted each month
              </p>
              {discountsData.length === 0 ? (
                <div
                  className="text-center text-gray-500 py-8 rounded-lg border border-dashed border-gray-700"
                  data-ocid="student.discounts.empty_state"
                >
                  <div className="text-3xl mb-2">🏷</div>
                  <div>No discounts assigned for this student</div>
                </div>
              ) : (
                <>
                  <div className="rounded-lg overflow-hidden border border-gray-700 mb-4">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: "#1a1f2e" }}>
                          <th className="text-left px-3 py-2 text-gray-400">
                            Discount Name
                          </th>
                          <th className="text-right px-3 py-2 text-gray-400">
                            Monthly Amount
                          </th>
                          <th className="text-right px-3 py-2 text-gray-400">
                            Applied Months
                          </th>
                          <th className="text-right px-3 py-2 text-gray-400">
                            Total Discount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {discountsData.map((d, i) => (
                          <tr
                            key={`discount-${d.name}-${i}`}
                            style={{
                              background: i % 2 === 0 ? "#111827" : "#0d111c",
                              borderBottom: "1px solid #1f2937",
                            }}
                          >
                            <td className="px-3 py-2 text-white">{d.name}</td>
                            <td className="px-3 py-2 text-right text-green-400">
                              ₹{d.monthlyAmount.toLocaleString("en-IN")}/mo
                            </td>
                            <td className="px-3 py-2 text-right text-gray-300">
                              {d.appliedMonths.length} months
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-green-400">
                              ₹{d.total.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))}
                        <tr
                          style={{
                            background: "#1a1f2e",
                            borderTop: "2px solid #374151",
                          }}
                        >
                          <td
                            colSpan={3}
                            className="px-3 py-2 text-right text-gray-400 font-semibold"
                          >
                            Total Discount
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-green-400">
                            ₹{totalDiscount.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div
                    className="text-xs text-gray-400 p-3 rounded-lg"
                    style={{
                      background: "#1a1f2e",
                      border: "1px solid #374151",
                    }}
                  >
                    Net Payable after discount:{" "}
                    <span className="text-red-400 font-bold">
                      ₹
                      {(
                        totalFees -
                        totalDiscount +
                        totalOldBalance -
                        paidFees
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* OLD FEES TAB */}
          {detailTab === "oldfees" && (
            <div>
              <h3 className="text-white text-sm font-semibold mb-3">
                Old / Previous Session Dues
              </h3>
              {oldFeesData.length === 0 && (student.oldBalance || 0) === 0 ? (
                <div
                  className="text-center text-gray-500 py-8 rounded-lg border border-dashed border-gray-700"
                  data-ocid="student.oldfees.empty_state"
                >
                  <div className="text-3xl mb-2">✅</div>
                  <div>No old dues found for this student</div>
                </div>
              ) : (
                <>
                  {(student.oldBalance || 0) > 0 && (
                    <div
                      className="flex items-center gap-3 mb-3 px-3 py-2 rounded-lg"
                      style={{
                        background: "#1a1f2e",
                        border: "1px solid #374151",
                      }}
                    >
                      <span className="text-yellow-400 font-bold">
                        Old Balance: ₹
                        {(student.oldBalance || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                  {oldFeesData.length > 0 && (
                    <div className="rounded-lg overflow-hidden border border-gray-700 mb-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ background: "#1a1f2e" }}>
                            <th className="text-left px-3 py-2 text-gray-400">
                              Session
                            </th>
                            <th className="text-left px-3 py-2 text-gray-400">
                              Month
                            </th>
                            <th className="text-left px-3 py-2 text-gray-400">
                              Fee Head
                            </th>
                            <th className="text-right px-3 py-2 text-gray-400">
                              Amount Due
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {oldFeesData.map((d, i) => (
                            <tr
                              key={`${d.session}-${d.month}-${i}`}
                              style={{
                                background: i % 2 === 0 ? "#111827" : "#0d111c",
                                borderBottom: "1px solid #1f2937",
                              }}
                              data-ocid={`student.oldfees.item.${i + 1}`}
                            >
                              <td className="px-3 py-2">
                                <span
                                  className="text-[10px] px-2 py-0.5 rounded-full"
                                  style={{
                                    background: "#7c3aed20",
                                    color: "#a78bfa",
                                  }}
                                >
                                  {d.session}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-white">
                                {d.month}
                              </td>
                              <td className="px-3 py-2 text-gray-300">
                                {d.feeHead}
                              </td>
                              <td className="px-3 py-2 text-right text-red-400 font-semibold">
                                ₹{d.amount.toLocaleString("en-IN")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr
                            style={{
                              background: "#1a1f2e",
                              borderTop: "2px solid #374151",
                            }}
                          >
                            <td
                              colSpan={3}
                              className="px-3 py-2 text-right text-gray-400 font-semibold"
                            >
                              Total Old Balance
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-red-400">
                              ₹{totalOldBalance.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                  <div
                    className="text-xs text-gray-400 p-3 rounded-lg"
                    style={{
                      background: "#1a1f2e",
                      border: "1px solid #374151",
                    }}
                  >
                    This old balance of{" "}
                    <span className="text-red-400 font-bold">
                      ₹{totalOldBalance.toLocaleString("en-IN")}
                    </span>{" "}
                    is included in the Net Payable calculation.
                  </div>
                </>
              )}
            </div>
          )}

          {/* CREDENTIALS TAB */}
          {detailTab === "credentials" &&
            currentUser?.role === "super_admin" && (
              <CredentialsTab student={student} />
            )}
        </div>
      </div>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid #374151" }}
    >
      <div
        className="px-3 py-2 text-xs font-semibold text-blue-300 uppercase tracking-wider"
        style={{ background: "#0f172a", borderBottom: "1px solid #374151" }}
      >
        {title}
      </div>
      <div className="px-3 py-2">{children}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      className="flex items-center justify-between py-0.5"
      style={{ borderBottom: "1px dotted #374151" }}
    >
      <span className="text-gray-400" style={{ fontSize: 10 }}>
        {label}
      </span>
      <span
        className="text-white font-medium"
        style={{ fontSize: 10, color: valueColor }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Print List Modal ─────────────────────────────────────────────────────────
function PrintListModal({
  students,
  selectedIds,
  onClose,
}: {
  students: Student[];
  selectedIds: Set<number>;
  onClose: () => void;
}) {
  const [checkedCols, setCheckedCols] = useState<Set<string>>(
    new Set(PRINT_COLUMNS.map((c) => c.key)),
  );
  const [scope, setScope] = useState<"all" | "selected">("all");

  const displayStudents =
    scope === "selected" && selectedIds.size > 0
      ? students.filter((s) => selectedIds.has(s.id))
      : students;

  const activeCols = PRINT_COLUMNS.filter((c) => checkedCols.has(c.key));

  const toggleCol = (key: string) => {
    setCheckedCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handlePrint = () => {
    const el = document.getElementById("student-list-print-area");
    if (!el) return;
    const win = window.open("", "_blank", "width=1100,height=700");
    if (!win) return;
    win.document.write(
      `<html><head><title>Student List</title><style>@page{size:A4 landscape;margin:8mm}body{margin:0;font-family:Arial,sans-serif;font-size:9px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:3px 5px}th{background:#c6d9f1;font-weight:700;color:#1e3a5f}.no-print{display:none}</style></head><body>${el.innerHTML}</body></html>`,
    );
    win.document.close();
    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center pt-6 pb-6"
      style={{ overflowY: "auto" }}
      data-ocid="printlist.modal"
    >
      <div
        className="w-full max-w-5xl rounded-xl shadow-2xl"
        style={{ background: "#1a1f2e", border: "1px solid #374151" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 rounded-t-xl"
          style={{ background: "#0f172a", borderBottom: "1px solid #374151" }}
        >
          <span className="text-white font-bold text-sm">
            Student Data Print List
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded font-semibold transition"
              data-ocid="printlist.print_button"
            >
              <Printer size={13} /> Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1"
              data-ocid="printlist.close_button"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Controls (no-print) */}
        <div
          className="px-5 py-4 no-print"
          style={{ borderBottom: "1px solid #374151" }}
        >
          {/* Scope */}
          <div className="flex items-center gap-4 mb-3">
            <span className="text-gray-400 text-xs font-medium">
              Print Scope:
            </span>
            {(["all", "selected"] as const).map((s) => (
              <label
                key={s}
                className="flex items-center gap-1.5 cursor-pointer"
              >
                <input
                  type="radio"
                  checked={scope === s}
                  onChange={() => setScope(s)}
                  className="accent-blue-500"
                  data-ocid={`printlist.scope.${s}`}
                />
                <span className="text-gray-300 text-xs">
                  {s === "all"
                    ? "All Students"
                    : `Selected Only (${selectedIds.size})`}
                </span>
              </label>
            ))}
          </div>
          {/* Column checkboxes */}
          <div className="flex flex-wrap gap-3">
            {PRINT_COLUMNS.map((col) => (
              <label
                key={col.key}
                className="flex items-center gap-1.5 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checkedCols.has(col.key)}
                  onChange={() => toggleCol(col.key)}
                  className="accent-blue-500 w-3 h-3"
                  data-ocid="printlist.col.checkbox"
                />
                <span className="text-gray-300 text-xs">{col.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Preview table */}
        <div
          className="p-4 overflow-x-auto"
          style={{ maxHeight: 480, overflowY: "auto" }}
        >
          <div id="student-list-print-area">
            <div
              style={{
                textAlign: "center",
                fontFamily: "Arial",
                fontWeight: 700,
                fontSize: 14,
                color: "#1e3a5f",
                marginBottom: 4,
              }}
            >
              {(() => {
                try {
                  return (
                    JSON.parse(
                      localStorage.getItem("erp_school_profile") || "{}",
                    ).name || "School Name"
                  );
                } catch {
                  return "School Name";
                }
              })()}
            </div>
            <div
              style={{
                textAlign: "center",
                fontFamily: "Arial",
                fontWeight: 700,
                fontSize: 11,
                marginBottom: 8,
                textDecoration: "underline",
              }}
            >
              LIST OF STUDENTS
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 9,
                fontFamily: "Arial",
              }}
            >
              <thead>
                <tr style={{ background: "#c6d9f1" }}>
                  <th
                    style={{
                      border: "1px solid #aaa",
                      padding: "3px 5px",
                      textAlign: "left",
                    }}
                  >
                    #
                  </th>
                  {activeCols.map((col) => (
                    <th
                      key={col.key}
                      style={{
                        border: "1px solid #aaa",
                        padding: "3px 5px",
                        textAlign: "left",
                        color: "#1e3a5f",
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayStudents.map((s, i) => (
                  <tr
                    key={s.id}
                    style={{ background: i % 2 === 0 ? "#fff" : "#e8f0fe" }}
                  >
                    <td
                      style={{ border: "1px solid #ddd", padding: "2px 5px" }}
                    >
                      {i + 1}
                    </td>
                    {activeCols.map((col) => (
                      <td
                        key={col.key}
                        style={{ border: "1px solid #ddd", padding: "2px 5px" }}
                      >
                        {col.key === "oldBalance"
                          ? s.oldBalance > 0
                            ? `₹${s.oldBalance.toLocaleString("en-IN")}`
                            : "0"
                          : String((s as any)[col.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Discontinue Modal ────────────────────────────────────────────────────────
function DiscontinueModal({
  student,
  onConfirm,
  onCancel,
}: {
  student: Student;
  onConfirm: (data: {
    leavingDate: string;
    leavingReason: string;
    leavingRemarks: string;
  }) => void;
  onCancel: () => void;
}) {
  const [leavingDate, setLeavingDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [leavingReason, setLeavingReason] = useState("TC Issued");
  const [leavingRemarks, setLeavingRemarks] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
      data-ocid="discontinue.modal"
    >
      <div
        className="w-full max-w-md rounded-xl shadow-2xl p-6"
        style={{ background: "#1a1f2e", border: "1px solid #374151" }}
      >
        <h3 className="text-white font-bold text-base mb-1">
          Mark as Discontinued
        </h3>
        <p className="text-gray-400 text-xs mb-4">
          Student:{" "}
          <span className="text-yellow-400 font-medium">{student.name}</span> (
          {student.admNo})
        </p>
        <div className="space-y-3">
          <div>
            <label
              htmlFor="disc-leaving-date"
              className="text-gray-400 text-xs block mb-1"
            >
              Leaving Date
            </label>
            <input
              id="disc-leaving-date"
              type="date"
              value={leavingDate}
              onChange={(e) => setLeavingDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-blue-500"
              data-ocid="discontinue.date.input"
            />
          </div>
          <div>
            <label
              htmlFor="disc-reason"
              className="text-gray-400 text-xs block mb-1"
            >
              Reason
            </label>
            <select
              id="disc-reason"
              value={leavingReason}
              onChange={(e) => setLeavingReason(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-blue-500"
              data-ocid="discontinue.reason.select"
            >
              {LEAVING_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="disc-remarks"
              className="text-gray-400 text-xs block mb-1"
            >
              Remarks
            </label>
            <textarea
              id="disc-remarks"
              value={leavingRemarks}
              onChange={(e) => setLeavingRemarks(e.target.value)}
              rows={2}
              placeholder="Optional remarks..."
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-blue-500 resize-none"
              data-ocid="discontinue.remarks.textarea"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={() =>
              onConfirm({ leavingDate, leavingReason, leavingRemarks })
            }
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold py-2 rounded transition"
            data-ocid="discontinue.confirm_button"
          >
            Confirm Discontinue
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 rounded transition"
            data-ocid="discontinue.cancel_button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Discontinued Students Panel ─────────────────────────────────────────────
function DiscontinuedPanel({
  students,
  onReinstate,
  onClose,
}: {
  students: Student[];
  onReinstate: (id: number) => void;
  onClose: () => void;
}) {
  const discontinued = students.filter((s) => s.status === "Discontinued");
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center pt-8 pb-8"
      style={{ overflowY: "auto" }}
      data-ocid="discontinued.modal"
    >
      <div
        className="w-full max-w-4xl rounded-xl shadow-2xl"
        style={{ background: "#1a1f2e", border: "1px solid #374151" }}
      >
        <div
          className="flex items-center justify-between px-5 py-3 rounded-t-xl"
          style={{ background: "#0f172a", borderBottom: "1px solid #374151" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm">
              Discontinued Students
            </span>
            <span className="bg-red-900/50 text-red-400 text-xs px-2 py-0.5 rounded-full">
              {discontinued.length} students
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            data-ocid="discontinued.close_button"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 overflow-x-auto">
          {discontinued.length === 0 ? (
            <div
              className="text-center py-12 text-gray-500"
              data-ocid="discontinued.empty_state"
            >
              No discontinued students found.
            </div>
          ) : (
            <table
              className="w-full text-xs"
              style={{ borderCollapse: "collapse" }}
              data-ocid="discontinued.table"
            >
              <thead>
                <tr style={{ background: "#0f172a" }}>
                  {[
                    "#",
                    "Adm No",
                    "Name",
                    "Class",
                    "Leaving Date",
                    "Reason",
                    "Remarks",
                    "Action",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2 text-gray-400 font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {discontinued.map((s, i) => (
                  <tr
                    key={s.id}
                    style={{
                      background: i % 2 === 0 ? "#111827" : "#0f1117",
                      borderBottom: "1px solid #374151",
                    }}
                    data-ocid={`discontinued.item.${i + 1}`}
                  >
                    <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2 text-blue-400">{s.admNo}</td>
                    <td className="px-3 py-2 text-white">{s.name}</td>
                    <td className="px-3 py-2 text-gray-300">{s.className}</td>
                    <td className="px-3 py-2 text-orange-300">
                      {s.leavingDate || "—"}
                    </td>
                    <td className="px-3 py-2 text-red-300">
                      {s.leavingReason || "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-400 max-w-32 truncate">
                      {s.leavingRemarks || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => onReinstate(s.id)}
                        className="bg-green-700 hover:bg-green-600 text-white text-xs px-2.5 py-1 rounded transition"
                        data-ocid="discontinued.reinstate_button"
                      >
                        Reinstate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [showAdmissionForm, setShowAdmissionForm] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [highlightedRow, setHighlightedRow] = useState<number | null>(null);
  const [fastSearch, setFastSearch] = useState(false);
  const [showBirthdays, setShowBirthdays] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  // Modal states
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  const [admFormStudent, setAdmFormStudent] = useState<Student | null>(null);
  const [showPrintList, setShowPrintList] = useState(false);
  const [discontinueTarget, setDiscontinueTarget] = useState<Student | null>(
    null,
  );
  const [showDiscontinued, setShowDiscontinued] = useState(false);
  const [showDiscontinuedList, setShowDiscontinuedList] = useState(false);

  // Filter state
  const [filterField1, setFilterField1] = useState("Admission No.");
  const [filterVal1, setFilterVal1] = useState("");
  const [filterField2, setFilterField2] = useState("Student Name");
  const [filterVal2, setFilterVal2] = useState("");
  const [filterField3, setFilterField3] = useState("Father Name");
  const [filterVal3, setFilterVal3] = useState("");
  const [birthMonth, setBirthMonth] = useState("");

  // Sort state
  const [sort1Field, setSort1Field] = useState("admNo");
  const [sort1Desc, setSort1Desc] = useState(false);
  const [sort2Field, setSort2Field] = useState("name");
  const [sort2Desc, setSort2Desc] = useState(false);
  const [sort3Field, setSort3Field] = useState("fatherName");
  const [sort3Desc, setSort3Desc] = useState(false);

  // Double-click timer ref for distinguishing single vs double click
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem("erp_students") || "[]");
      if (Array.isArray(data)) {
        // Migration: stamp session field if missing
        const migrated = data.map((s: Student) =>
          s.session ? s : { ...s, session: "2025-26" },
        );
        setStudents(migrated);
      }
    } catch {
      setStudents([]);
    }
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      localStorage.setItem("erp_students", JSON.stringify(students));
    }
  }, [students]);

  const nextId =
    students.length > 0 ? Math.max(...students.map((s) => s.id)) + 1 : 1;

  const filtered = useMemo(() => {
    let list = [...students];
    // Hide discontinued by default unless showDiscontinued is on
    if (!showDiscontinued) {
      list = list.filter((s) => s.status !== "Discontinued");
    }
    if (filterVal1.trim())
      list = list.filter((s) =>
        getFieldValue(s, filterField1).includes(filterVal1.toLowerCase()),
      );
    if (filterVal2.trim())
      list = list.filter((s) =>
        getFieldValue(s, filterField2).includes(filterVal2.toLowerCase()),
      );
    if (filterVal3.trim())
      list = list.filter((s) =>
        getFieldValue(s, filterField3).includes(filterVal3.toLowerCase()),
      );
    if (birthMonth) {
      const mi = MONTHS.indexOf(birthMonth);
      list = list.filter((s) => {
        const parts = s.dob.split("-");
        return parts.length === 3 && Number(parts[1]) - 1 === mi;
      });
    }
    if (showBirthdays) {
      const curMonth = new Date().getMonth();
      list = list.filter((s) => {
        const parts = s.dob.split("-");
        return parts.length === 3 && Number(parts[1]) - 1 === curMonth;
      });
    }
    return list;
  }, [
    students,
    filterVal1,
    filterField1,
    filterVal2,
    filterField2,
    filterVal3,
    filterField3,
    birthMonth,
    showBirthdays,
    showDiscontinued,
  ]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const getVal = (s: Student, key: string): string =>
        String((s as any)[key] ?? "");
      let cmp = getVal(a, sort1Field).localeCompare(getVal(b, sort1Field));
      if (sort1Desc) cmp = -cmp;
      if (cmp !== 0) return cmp;
      let cmp2 = getVal(a, sort2Field).localeCompare(getVal(b, sort2Field));
      if (sort2Desc) cmp2 = -cmp2;
      if (cmp2 !== 0) return cmp2;
      let cmp3 = getVal(a, sort3Field).localeCompare(getVal(b, sort3Field));
      if (sort3Desc) cmp3 = -cmp3;
      return cmp3;
    });
  }, [
    filtered,
    sort1Field,
    sort1Desc,
    sort2Field,
    sort2Desc,
    sort3Field,
    sort3Desc,
  ]);

  const getSelectedStudent = (): Student | null => {
    if (selectedRows.size === 0) return null;
    const firstId = Array.from(selectedRows)[0];
    return students.find((s) => s.id === firstId) || null;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedRows(new Set(sorted.map((s) => s.id)));
    else setSelectedRows(new Set());
  };

  const handleRowCheck = (id: number, checked: boolean) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleRowClick = (s: Student) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      // Double click — open detail modal
      setDetailStudent(s);
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        // Single click — highlight
        setHighlightedRow((prev) => (prev === s.id ? null : s.id));
      }, 250);
    }
  };

  const handleExport = () => {
    const rows = sorted.map((s) =>
      [
        s.admNo,
        s.name,
        s.admissionDate ?? "",
        s.aadharNo ?? "",
        s.srNo ?? "",
        s.penNo ?? "",
        s.apaarNo ?? "",
        s.fatherName,
        s.motherName,
        s.className,
        s.section,
        s.rollNo,
        s.dob,
        s.contact,
        s.route,
        s.schNo,
        s.oldBalance,
        s.category ?? "",
        s.prevSchoolName ?? "",
        s.prevSchoolTcNo ?? "",
        s.prevSchoolLeavingDate ?? "",
        s.prevSchoolClass ?? "",
      ].join(","),
    );
    const csv = [CSV_HEADERS.join(","), ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "students.csv";
    a.click();
    toast.success("Students exported to CSV");
  };

  const handleDownloadTemplate = () => {
    const csv = `${CSV_HEADERS.join(",")}\n`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "students_template.csv";
    a.click();
    toast.success("Template downloaded");
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast.error("No valid rows found in CSV");
        return;
      }
      setStudents((prev) => [...prev, ...parsed]);
      toast.success(`${parsed.length} student(s) imported`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleAdmissionSave = (data: any) => {
    if (editStudent) {
      setStudents((prev) =>
        prev.map((s) =>
          s.id === editStudent.id
            ? {
                ...s,
                admNo: data.admNo || s.admNo,
                name: data.name || s.name,
                fatherName: data.fatherName || s.fatherName,
                motherName: data.motherName || s.motherName,
                className: data.className || s.className,
                section: data.section || s.section,
                rollNo: data.rollNo || s.rollNo,
                dob: data.dob || s.dob,
                contact: data.contact || s.contact,
                route: data.route || s.route,
                schNo: data.schNo || s.schNo,
                oldBalance: data.oldBalance ?? s.oldBalance,
                category: data.category || s.category,
                admissionDate: data.admissionDate || s.admissionDate,
                aadharNo: data.aadharNo || s.aadharNo,
                srNo: data.srNo || s.srNo,
                penNo: data.penNo || s.penNo,
                apaarNo: data.apaarNo || s.apaarNo,
                prevSchoolName: data.prevSchoolName || s.prevSchoolName,
                prevSchoolTcNo: data.prevSchoolTcNo || s.prevSchoolTcNo,
                prevSchoolLeavingDate:
                  data.prevSchoolLeavingDate || s.prevSchoolLeavingDate,
                prevSchoolClass: data.prevSchoolClass || s.prevSchoolClass,
              }
            : s,
        ),
      );
      toast.success("Student record updated!");
    } else {
      const newStudent: Student = {
        id: nextId,
        admNo: data.admNo || `ADM${String(nextId).padStart(4, "0")}`,
        name: data.name || "",
        fatherName: data.fatherName || "",
        motherName: data.motherName || "",
        className: data.className || "",
        section: data.section || "",
        rollNo: data.rollNo || "",
        dob: data.dob || "",
        contact: data.contact || "",
        route: data.route || "N.A.",
        schNo: data.schNo || "",
        oldBalance: data.oldBalance || 0,
        status: "Active",
        category: data.category || "General",
        admissionDate: data.admissionDate || "",
        aadharNo: data.aadharNo || "",
        srNo: data.srNo || "",
        penNo: data.penNo || "",
        apaarNo: data.apaarNo || "",
        prevSchoolName: data.prevSchoolName || "",
        prevSchoolTcNo: data.prevSchoolTcNo || "",
        prevSchoolLeavingDate: data.prevSchoolLeavingDate || "",
        prevSchoolClass: data.prevSchoolClass || "",
      };
      setStudents((prev) => [...prev, newStudent]);
      toast.success("Student admitted successfully!");
      addERPNotification({
        type: "student",
        icon: "👤",
        title: "New Student Added",
        message: `${newStudent.name} admitted to ${newStudent.className} - ${newStudent.section}`,
      });
    }
    // Auto-generate credentials for new/updated student
    setTimeout(() => generateCredentialsFromData(), 100);
    setEditStudent(null);
    setShowAdmissionForm(false);
  };

  const handleAdmForm = () => {
    const sel = getSelectedStudent();
    if (!sel) {
      toast.error("Please select a student first");
      return;
    }
    setAdmFormStudent(sel);
  };

  const handleList = () => {
    const sel = getSelectedStudent();
    if (!sel && selectedRows.size === 0) {
      setShowPrintList(true);
      return;
    }
    setShowPrintList(true);
  };

  const handleIDCard = () => {
    const sel = getSelectedStudent();
    if (!sel) {
      toast.error("Please select a student first");
      return;
    }
    localStorage.setItem("cert_selected_student", JSON.stringify(sel));
    toast.success(`Opening ID Card for ${sel.name}`);
    window.location.hash = "#/certificate";
  };

  const handleAdmitCard = () => {
    const sel = getSelectedStudent();
    if (!sel) {
      toast.error("Please select a student first");
      return;
    }
    localStorage.setItem("admit_selected_student", JSON.stringify(sel));
    toast.success(`Opening Admit Card for ${sel.name}`);
    window.location.hash = "#/examinations";
  };

  const handleDiscontinueConfirm = (data: {
    leavingDate: string;
    leavingReason: string;
    leavingRemarks: string;
  }) => {
    if (!discontinueTarget) return;
    setStudents((prev) =>
      prev.map((s) =>
        s.id === discontinueTarget.id
          ? {
              ...s,
              status: "Discontinued",
              leavingDate: data.leavingDate,
              leavingReason: data.leavingReason,
              leavingRemarks: data.leavingRemarks,
            }
          : s,
      ),
    );
    setDiscontinueTarget(null);
    setDetailStudent(null);
    toast.success(`${discontinueTarget.name} marked as Discontinued`);
  };

  const handleReinstate = (id: number) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status: "Active",
              leavingDate: undefined,
              leavingReason: undefined,
              leavingRemarks: undefined,
            }
          : s,
      ),
    );
    toast.success("Student reinstated to Active");
  };

  if (showAdmissionForm) {
    return (
      <StudentAdmissionForm
        onCancel={() => {
          setShowAdmissionForm(false);
          setEditStudent(null);
        }}
        onSave={handleAdmissionSave}
        initialData={editStudent}
      />
    );
  }

  const allSelected =
    sorted.length > 0 && sorted.every((s) => selectedRows.has(s.id));

  return (
    <div className="text-xs" style={{ fontFamily: "Arial, sans-serif" }}>
      {/* Modals */}
      {detailStudent && (
        <StudentDetailModal
          student={detailStudent}
          onClose={() => setDetailStudent(null)}
          onEdit={() => {
            setEditStudent(detailStudent);
            setDetailStudent(null);
            setShowAdmissionForm(true);
          }}
          onDiscontinue={() => {
            setDiscontinueTarget(detailStudent);
          }}
        />
      )}

      {admFormStudent && (
        <AdmissionFormPreview
          student={admFormStudent}
          onClose={() => setAdmFormStudent(null)}
        />
      )}

      {showPrintList && (
        <PrintListModal
          students={sorted}
          selectedIds={selectedRows}
          onClose={() => setShowPrintList(false)}
        />
      )}

      {discontinueTarget && (
        <DiscontinueModal
          student={discontinueTarget}
          onConfirm={handleDiscontinueConfirm}
          onCancel={() => setDiscontinueTarget(null)}
        />
      )}

      {showDiscontinuedList && (
        <DiscontinuedPanel
          students={students}
          onReinstate={handleReinstate}
          onClose={() => setShowDiscontinuedList(false)}
        />
      )}

      {/* Title Bar */}
      <div
        style={{ background: "#1e3a5f" }}
        className="flex flex-wrap items-center gap-2 px-3 py-2"
      >
        <GraduationCap size={18} className="text-white flex-shrink-0" />
        <span className="text-white font-bold text-sm tracking-wide">
          LIST OF STUDENTS
        </span>
        <label className="flex items-center gap-1 text-white cursor-pointer ml-2">
          <input
            type="checkbox"
            checked={fastSearch}
            onChange={(e) => setFastSearch(e.target.checked)}
            className="w-3 h-3"
          />
          Enable Fast Search
        </label>
        <button
          type="button"
          className="text-red-300 underline hover:text-red-200 ml-2 text-xs"
          onClick={() => setShowDiscontinuedList(true)}
          data-ocid="students.discontinued_link"
        >
          List of Discontinued Students
        </button>
        <label className="flex items-center gap-1 text-yellow-300 cursor-pointer ml-2">
          <input
            type="checkbox"
            checked={showDiscontinued}
            onChange={(e) => setShowDiscontinued(e.target.checked)}
            className="w-3 h-3"
          />
          Show Discontinued
        </label>
        {/* Page nav */}
        <div className="flex items-center gap-1 text-white ml-2">
          <span>Page No:</span>
          {[1, 2, 3, 4, 5].map((p) => (
            <button
              key={p}
              type="button"
              className="px-1 hover:underline text-yellow-300"
            >
              {p}
            </button>
          ))}
          <ChevronRight size={14} />
          <ChevronRight size={14} className="-ml-2" />
        </div>
        {/* Action buttons row */}
        <div className="ml-auto flex flex-wrap gap-1">
          <div className="flex gap-1 flex-wrap">
            <Btn
              label="By Date"
              color="olive"
              onClick={() => toast.info("Coming soon")}
              ocid="students.button"
            />
            <Btn
              label="New"
              color="red"
              icon={<UserPlus size={11} />}
              onClick={() => {
                setEditStudent(null);
                setShowAdmissionForm(true);
              }}
              ocid="students.primary_button"
            />
            <Btn
              label="Birthdays"
              color="green"
              icon={<Calendar size={11} />}
              onClick={() => {
                setShowBirthdays((prev) => !prev);
              }}
              ocid="students.toggle"
            />
            <Btn
              label="Adm. Form"
              color="green"
              icon={<FileText size={11} />}
              onClick={handleAdmForm}
              ocid="students.secondary_button"
            />
            <Btn
              label="ID Card"
              color="green"
              icon={<Printer size={11} />}
              onClick={handleIDCard}
              ocid="students.button"
            />
            <Btn
              label="List"
              color="green"
              onClick={handleList}
              ocid="students.button"
            />
            <Btn
              label="Close"
              color="grey"
              icon={<X size={11} />}
              onClick={() => {
                setFilterVal1("");
                setFilterVal2("");
                setFilterVal3("");
                setBirthMonth("");
                setShowBirthdays(false);
                setSelectedRows(new Set());
              }}
              ocid="students.cancel_button"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            <Btn
              label="Admit Card"
              color="green"
              onClick={handleAdmitCard}
              ocid="students.button"
            />
            <Btn
              label="Send SMS"
              color="green"
              icon={<MessageSquare size={11} />}
              onClick={() => toast.info("Coming soon")}
              ocid="students.button"
            />
            <Btn
              label="Export"
              color="green"
              icon={<Download size={11} />}
              onClick={handleExport}
              ocid="students.button"
            />
            <Btn
              label="Template"
              color="olive"
              icon={<Download size={11} />}
              onClick={handleDownloadTemplate}
              ocid="students.button"
            />
            <Btn
              label="Import"
              color="green"
              icon={<Upload size={11} />}
              onClick={() => importRef.current?.click()}
              ocid="students.upload_button"
            />
            <input
              ref={importRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
        </div>
      </div>

      {/* Search / Filter Bar */}
      <div
        style={{ background: "#f0f2f5", borderBottom: "1px solid #d1d5db" }}
        className="flex flex-wrap items-center gap-2 px-3 py-2"
      >
        <select
          value={filterField1}
          onChange={(e) => setFilterField1(e.target.value)}
          className="border border-gray-300 rounded px-1.5 py-1 text-xs bg-white"
          data-ocid="students.select"
        >
          {FILTER_FIELDS.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <input
          value={filterVal1}
          onChange={(e) => setFilterVal1(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-xs bg-white w-28"
          placeholder="Search..."
          data-ocid="students.search_input"
        />
        <span className="text-gray-500">|</span>
        <select
          value={filterField2}
          onChange={(e) => setFilterField2(e.target.value)}
          className="border border-gray-300 rounded px-1.5 py-1 text-xs bg-white"
          data-ocid="students.select"
        >
          {FILTER_FIELDS.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <input
          value={filterVal2}
          onChange={(e) => setFilterVal2(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-xs bg-white w-28"
          placeholder="Search..."
          data-ocid="students.input"
        />
        <span className="text-gray-500">|</span>
        <select
          value={filterField3}
          onChange={(e) => setFilterField3(e.target.value)}
          className="border border-gray-300 rounded px-1.5 py-1 text-xs bg-white"
          data-ocid="students.select"
        >
          {FILTER_FIELDS.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <input
          value={filterVal3}
          onChange={(e) => setFilterVal3(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-xs bg-white w-28"
          placeholder="Search..."
          data-ocid="students.input"
        />
        <span className="text-gray-500">|</span>
        <select
          value={birthMonth}
          onChange={(e) => setBirthMonth(e.target.value)}
          className="border border-gray-300 rounded px-1.5 py-1 text-xs bg-white"
          data-ocid="students.select"
        >
          <option value="">-Birth Month-</option>
          {MONTHS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <span className="text-gray-500 ml-auto">
          Results: {sorted.length} &nbsp;|&nbsp; Showing: 1 - {sorted.length}
        </span>
      </div>

      {/* Table */}
      <div style={{ background: "#ffffff" }} className="overflow-x-auto">
        <div
          className="flex items-center gap-2 px-3 py-1.5"
          style={{ background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }}
        >
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-3 h-3"
              data-ocid="students.checkbox"
            />
            <span className="text-gray-600">Select All</span>
          </label>
          {selectedRows.size > 0 && (
            <span
              className="text-blue-600 font-medium"
              style={{ fontSize: 11 }}
            >
              {selectedRows.size} selected
            </span>
          )}
        </div>
        <table
          className="w-full"
          style={{ borderCollapse: "collapse", fontSize: "11px" }}
          data-ocid="students.table"
        >
          <thead>
            <tr
              style={{
                background: "#c6d9f1",
                borderBottom: "2px solid #a8c4e0",
              }}
            >
              {[
                "#",
                "",
                "Adm. No.",
                "Name",
                "Father",
                "Mother",
                "Class",
                "Sec.",
                "Roll No.",
                "D.O.B",
                "Contact No.",
                "Route",
                "Sch. No.",
                "Old Bal",
                "Edit",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-2 py-1.5 font-semibold"
                  style={{ color: "#1e3a5f", whiteSpace: "nowrap" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={15}
                  className="text-center py-10 text-gray-400"
                  data-ocid="students.empty_state"
                >
                  No students found. Click{" "}
                  <strong style={{ color: "#dc2626" }}>New</strong> to add a
                  student.
                </td>
              </tr>
            ) : (
              sorted.map((s, i) => (
                <tr
                  key={s.id}
                  style={{
                    background:
                      highlightedRow === s.id
                        ? "#fff3cd"
                        : selectedRows.has(s.id)
                          ? "#e0f0ff"
                          : s.status === "Discontinued"
                            ? "#fef2f2"
                            : i % 2 === 0
                              ? "#ffffff"
                              : "#e8f0fe",
                    cursor: "pointer",
                    borderBottom: "1px solid #e5e7eb",
                    opacity: s.status === "Discontinued" ? 0.7 : 1,
                  }}
                  onClick={() => handleRowClick(s)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRowClick(s);
                  }}
                  tabIndex={0}
                  data-ocid={`students.item.${i + 1}`}
                >
                  <td className="px-2 py-1" style={{ color: "#6b7280" }}>
                    {i + 1}
                  </td>
                  <td
                    className="px-2 py-1"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      className="w-3 h-3"
                      checked={selectedRows.has(s.id)}
                      onChange={(e) => handleRowCheck(s.id, e.target.checked)}
                      data-ocid={`students.checkbox.${i + 1}`}
                    />
                  </td>
                  <td
                    className="px-2 py-1 font-medium"
                    style={{ color: "#1d4ed8" }}
                  >
                    {s.admNo}
                    {s.status === "Discontinued" && (
                      <span
                        className="ml-1 text-red-500"
                        style={{ fontSize: 9, textDecoration: "none" }}
                      >
                        [D]
                      </span>
                    )}
                  </td>
                  <td
                    className="px-2 py-1 font-medium"
                    style={{
                      color: "#111827",
                      textDecoration:
                        s.status === "Discontinued" ? "line-through" : "none",
                    }}
                  >
                    {s.name}
                  </td>
                  <td className="px-2 py-1" style={{ color: "#374151" }}>
                    {s.fatherName}
                  </td>
                  <td className="px-2 py-1" style={{ color: "#374151" }}>
                    {s.motherName}
                  </td>
                  <td className="px-2 py-1" style={{ color: "#374151" }}>
                    {s.className}
                  </td>
                  <td className="px-2 py-1" style={{ color: "#374151" }}>
                    {s.section}
                  </td>
                  <td className="px-2 py-1" style={{ color: "#374151" }}>
                    {s.rollNo}
                  </td>
                  <td
                    className="px-2 py-1"
                    style={{ color: "#6b7280", whiteSpace: "nowrap" }}
                  >
                    {s.dob}
                  </td>
                  <td className="px-2 py-1" style={{ color: "#6b7280" }}>
                    {s.contact}
                  </td>
                  <td className="px-2 py-1" style={{ color: "#6b7280" }}>
                    {s.route}
                  </td>
                  <td className="px-2 py-1" style={{ color: "#6b7280" }}>
                    {s.schNo}
                  </td>
                  <td
                    className="px-2 py-1 text-right"
                    style={{
                      color: s.oldBalance > 0 ? "#dc2626" : "#374151",
                    }}
                  >
                    {s.oldBalance > 0
                      ? `₹${s.oldBalance.toLocaleString("en-IN")}`
                      : "0"}
                  </td>
                  <td
                    className="px-2 py-1"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      title="Edit student"
                      onClick={() => {
                        setEditStudent(s);
                        setShowAdmissionForm(true);
                      }}
                      className="text-blue-500 hover:text-blue-400 p-0.5 rounded hover:bg-blue-900/30 transition"
                      data-ocid={`students.edit_button.${i + 1}`}
                    >
                      <Pencil size={11} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Sort Bar */}
      <div
        style={{
          background: "#f0f2f5",
          borderTop: "2px solid #c6d9f1",
        }}
        className="flex flex-wrap items-center gap-4 px-3 py-2"
      >
        <SortControl
          num={1}
          label="Sort On"
          value={sort1Field}
          desc={sort1Desc}
          onChange={setSort1Field}
          onDescChange={setSort1Desc}
        />
        <SortControl
          num={2}
          label="If 1st is same then Sort By"
          value={sort2Field}
          desc={sort2Desc}
          onChange={setSort2Field}
          onDescChange={setSort2Desc}
        />
        <SortControl
          num={3}
          label="If 2nd is Same, then Sort By"
          value={sort3Field}
          desc={sort3Desc}
          onChange={setSort3Field}
          onDescChange={setSort3Desc}
        />
        <div className="ml-auto">
          <span style={{ color: "#1e3a5f", fontWeight: "bold" }}>
            No. of Student:{" "}
            {students.filter((s) => s.status !== "Discontinued").length}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────────────────────────

interface BtnProps {
  label: string;
  color: "red" | "green" | "grey" | "olive";
  icon?: React.ReactNode;
  onClick: () => void;
  ocid: string;
}

function Btn({ label, color, icon, onClick, ocid }: BtnProps) {
  const bg =
    color === "red"
      ? "#dc2626"
      : color === "green"
        ? "#16a34a"
        : color === "grey"
          ? "#6b7280"
          : "#78716c";
  return (
    <button
      type="button"
      onClick={onClick}
      data-ocid={ocid}
      style={{ background: bg, fontSize: "11px", whiteSpace: "nowrap" }}
      className="flex items-center gap-1 text-white px-2 py-1 rounded hover:opacity-90 font-medium"
    >
      {icon}
      {label}
    </button>
  );
}

interface SortControlProps {
  num: number;
  label: string;
  value: string;
  desc: boolean;
  onChange: (v: string) => void;
  onDescChange: (v: boolean) => void;
}

function SortControl({
  num,
  label,
  value,
  desc,
  onChange,
  onDescChange,
}: SortControlProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        style={{
          background: "#1e3a5f",
          color: "white",
          borderRadius: "50%",
          width: "18px",
          height: "18px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "10px",
          fontWeight: "bold",
          flexShrink: 0,
        }}
      >
        {num}
      </span>
      <span className="text-gray-600 hidden sm:inline">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-300 rounded px-1.5 py-0.5 text-xs bg-white"
      >
        {SORT_FIELDS.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1 cursor-pointer text-gray-600">
        <input
          type="checkbox"
          checked={desc}
          onChange={(e) => onDescChange(e.target.checked)}
          className="w-3 h-3"
        />
        <ArrowRight size={10} className="rotate-180" />
        Z→A
      </label>
    </div>
  );
}

// CREDENTIALS TAB COMPONENT
interface CredentialsTabProps {
  student: Student;
}

function CredentialsTab({ student }: CredentialsTabProps) {
  const { resetPassword } = useAuth();
  const [showPwd, setShowPwd] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const creds = getAllCredentials().find((c) => c.userId === student.admNo);
  const username = student.admNo;
  const password = creds?.password || "Not set";

  const handleReset = () => {
    setError("");
    if (!newPwd || !confirmPwd) {
      setError("Both fields required.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setError("Passwords do not match.");
      return;
    }
    if (newPwd.length < 4) {
      setError("Minimum 4 characters.");
      return;
    }
    const ok = resetPassword(username, newPwd);
    if (ok) {
      setSuccess(true);
      setTimeout(() => {
        setResetOpen(false);
        setSuccess(false);
        setNewPwd("");
        setConfirmPwd("");
      }, 1500);
    } else {
      setError("Could not reset password.");
    }
  };

  return (
    <div>
      <h3 className="text-white text-sm font-semibold mb-3">
        🔑 Login Credentials
      </h3>
      <div
        className="rounded-lg p-4 space-y-3"
        style={{ background: "#111827", border: "1px solid #1f2937" }}
      >
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-xs">Username (Adm. No.)</span>
          <span className="font-mono text-blue-300 text-sm">{username}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-xs">Password</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-white">
              {showPwd ? password : "•".repeat(Math.min(password.length, 8))}
            </span>
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="text-gray-400 hover:text-white text-xs"
            >
              {showPwd ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <div className="pt-2 border-t border-gray-700">
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded"
            data-ocid="student.credentials.button"
          >
            Reset Password
          </button>
        </div>
      </div>
      {resetOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="rounded-xl p-6 w-full max-w-sm shadow-2xl"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <h3 className="text-white text-base font-semibold mb-1">
              Reset Student Password
            </h3>
            <p className="text-gray-400 text-xs mb-4">
              Student: <span className="text-white">{student.name}</span>
            </p>
            {success ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-green-400 font-semibold">Password reset!</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="cred-new-pwd"
                    className="text-gray-400 text-xs block mb-1"
                  >
                    New Password
                  </label>
                  <input
                    id="cred-new-pwd"
                    type="password"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
                    data-ocid="student.credentials.input"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cred-conf-pwd"
                    className="text-gray-400 text-xs block mb-1"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="cred-conf-pwd"
                    type="password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleReset()}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
                    data-ocid="student.credentials.input"
                  />
                </div>
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 text-sm font-medium transition"
                    data-ocid="student.credentials.confirm_button"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResetOpen(false);
                      setError("");
                      setNewPwd("");
                      setConfirmPwd("");
                    }}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition"
                    data-ocid="student.credentials.cancel_button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
