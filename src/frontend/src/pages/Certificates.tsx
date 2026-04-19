import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Edit2, FileText, Printer, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import type { SchoolProfile, Student } from "../types";
import { ls } from "../utils/localStorage";

// ── Certificate types ─────────────────────────────────────────────────────────

type CertType =
  | "bonafide"
  | "transfer"
  | "experience"
  | "idcard"
  | "admission"
  | "character";

interface CertTemplate {
  type: CertType;
  title: string;
  paperSize: "A4" | "A5" | "Letter";
  headerText: string;
  footerText: string;
  bodyTemplate: string;
  fontSize: number;
  showSchoolLogo: boolean;
  showPrincipalSign: boolean;
}

const CERT_TYPES: { key: CertType; label: string; description: string }[] = [
  {
    key: "bonafide",
    label: "Bonafide Certificate",
    description: "Confirms student is enrolled",
  },
  {
    key: "transfer",
    label: "Transfer Certificate (TC)",
    description: "Issued on student leaving",
  },
  {
    key: "experience",
    label: "Experience Certificate",
    description: "For staff leaving",
  },
  { key: "idcard", label: "ID Card", description: "Student identity card" },
  {
    key: "admission",
    label: "Admission Form",
    description: "New student admission document",
  },
  {
    key: "character",
    label: "Character Certificate",
    description: "Student character attestation",
  },
];

const DEFAULT_TEMPLATES: Record<CertType, CertTemplate> = {
  bonafide: {
    type: "bonafide",
    title: "Bonafide Certificate",
    paperSize: "A4",
    headerText: "TO WHOMSOEVER IT MAY CONCERN",
    bodyTemplate:
      "This is to certify that {studentName}, son/daughter of {fatherName}, bearing Admission No. {admNo}, is a bonafide student of Class {class} Section {section} during the academic session {session}. His/Her Date of Birth as per school records is {dob}.\n\nThis certificate is issued on request of the student/parents for the purpose of {purpose}.",
    footerText: "Principal",
    fontSize: 12,
    showSchoolLogo: true,
    showPrincipalSign: true,
  },
  transfer: {
    type: "transfer",
    title: "Transfer Certificate",
    paperSize: "A4",
    headerText: "",
    bodyTemplate:
      "This is to certify that {studentName}, Admission No. {admNo}, studied in this school from {admissionDate} to {leavingDate}. He/She was a student of Class {class} at the time of leaving.\n\nHis/Her Date of Birth is {dob}. His/Her conduct and character were {character}.\n\nHe/She has cleared all school dues.",
    footerText: "Principal",
    fontSize: 12,
    showSchoolLogo: true,
    showPrincipalSign: true,
  },
  experience: {
    type: "experience",
    title: "Experience Certificate",
    paperSize: "A4",
    headerText: "TO WHOMSOEVER IT MAY CONCERN",
    bodyTemplate:
      "This is to certify that {staffName} was employed as {designation} in our school from {joiningDate} to {leavingDate}.\n\nDuring his/her tenure, he/she performed his/her duties sincerely and with dedication. His/Her conduct was good.\n\nWe wish him/her all the best for future endeavors.",
    footerText: "Principal",
    fontSize: 12,
    showSchoolLogo: true,
    showPrincipalSign: true,
  },
  idcard: {
    type: "idcard",
    title: "Student ID Card",
    paperSize: "A5",
    headerText: "",
    bodyTemplate:
      "Name: {studentName}\nClass: {class} - {section}\nAdm No: {admNo}\nFather: {fatherName}\nMobile: {mobile}",
    footerText: "",
    fontSize: 11,
    showSchoolLogo: true,
    showPrincipalSign: false,
  },
  admission: {
    type: "admission",
    title: "Admission Form",
    paperSize: "A4",
    headerText: "APPLICATION FOR ADMISSION",
    bodyTemplate:
      "Student Name: {studentName}\nDate of Birth: {dob}\nGender: {gender}\nClass Applying for: {class}\nFather's Name: {fatherName}\nMother's Name: {motherName}\nMobile: {mobile}\nAddress: {address}\nPrevious School: {previousSchool}",
    footerText: "Signature of Parent/Guardian",
    fontSize: 12,
    showSchoolLogo: true,
    showPrincipalSign: false,
  },
  character: {
    type: "character",
    title: "Character Certificate",
    paperSize: "A4",
    headerText: "TO WHOMSOEVER IT MAY CONCERN",
    bodyTemplate:
      "This is to certify that {studentName}, Admission No. {admNo}, is a student of Class {class} of this school. His/Her character and conduct during his/her stay in the school have been {character}.\n\nThis certificate is issued on the request of the student.",
    footerText: "Principal",
    fontSize: 12,
    showSchoolLogo: true,
    showPrincipalSign: true,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fillTemplate(
  template: string,
  student: Student | null,
  profile: SchoolProfile | null,
  extras: Record<string, string>,
): string {
  if (!student) return template;
  const vars: Record<string, string> = {
    studentName: student.fullName ?? "",
    admNo: student.admNo ?? "",
    class: student.class ?? "",
    section: student.section ?? "",
    dob: student.dob ?? "",
    fatherName: student.fatherName ?? "",
    motherName: student.motherName ?? "",
    mobile: student.mobile ?? student.guardianMobile ?? "",
    address: student.address ?? "",
    previousSchool: student.previousSchool ?? "",
    gender: student.gender ?? "",
    admissionDate: student.admissionDate ?? "",
    leavingDate: student.leavingDate ?? "",
    session: profile
      ? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
      : "",
    ...extras,
  };
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

// ── Template Editor ───────────────────────────────────────────────────────────

function TemplateEditor({
  template,
  onSave,
  onClose,
}: {
  template: CertTemplate;
  onSave: (t: CertTemplate) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...template });
  const set = (k: keyof CertTemplate, v: CertTemplate[keyof CertTemplate]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Paper Size</Label>
          <Select
            value={form.paperSize}
            onValueChange={(v) => set("paperSize", v as "A4" | "A5" | "Letter")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["A4", "A5", "Letter"].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Font Size</Label>
          <Input
            type="number"
            value={form.fontSize}
            min={9}
            max={18}
            onChange={(e) => set("fontSize", Number(e.target.value))}
          />
        </div>
        <div className="col-span-2">
          <Label>Header Text</Label>
          <Input
            value={form.headerText}
            onChange={(e) => set("headerText", e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <Label>Body Template</Label>
          <p className="text-xs text-muted-foreground mb-1">
            Use &#123;studentName&#125;, &#123;admNo&#125;, &#123;class&#125;,
            &#123;fatherName&#125;, &#123;dob&#125;, etc.
          </p>
          <Textarea
            value={form.bodyTemplate}
            onChange={(e) => set("bodyTemplate", e.target.value)}
            rows={6}
            className="text-sm"
          />
        </div>
        <div className="col-span-2">
          <Label>Footer / Signature Line</Label>
          <Input
            value={form.footerText}
            onChange={(e) => set("footerText", e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            onSave(form);
            onClose();
          }}
          data-ocid="certificates.template.save_button"
        >
          <Save className="w-4 h-4 mr-1" /> Save Template
        </Button>
      </div>
    </div>
  );
}

// ── Certificate Preview ────────────────────────────────────────────────────────

function CertificatePreview({
  template,
  student,
  profile,
  extras,
}: {
  template: CertTemplate;
  student: Student | null;
  profile: SchoolProfile | null;
  extras: Record<string, string>;
}) {
  const body = fillTemplate(template.bodyTemplate, student, profile, extras);
  const header = fillTemplate(template.headerText, student, profile, extras);

  return (
    <div
      id="certificate-print-area"
      className="bg-card border-2 border-border rounded-xl p-8 space-y-4 min-h-[400px]"
      style={{ fontSize: `${template.fontSize}px` }}
    >
      {/* School Header */}
      <div className="text-center border-b border-border pb-4">
        {template.showSchoolLogo && (
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <FileText className="w-8 h-8 text-primary" />
          </div>
        )}
        <p className="font-bold text-lg text-foreground font-display">
          {profile?.name ?? "School Name"}
        </p>
        <p className="text-xs text-muted-foreground">
          {profile?.address ?? "School Address"}
        </p>
        <p className="text-xs text-muted-foreground">
          {profile?.phone ?? ""} | {profile?.email ?? ""}
        </p>
      </div>

      {/* Certificate Title */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground underline decoration-1 underline-offset-4">
          {template.title}
        </h2>
        {header && (
          <p className="text-sm text-muted-foreground mt-1">{header}</p>
        )}
      </div>

      {/* Body */}
      <div className="whitespace-pre-wrap text-foreground leading-relaxed">
        {body}
      </div>

      {/* Footer */}
      {template.showPrincipalSign && (
        <div className="pt-8 flex justify-end">
          <div className="text-center">
            <div className="h-8 border-b border-foreground w-32 mb-1" />
            <p className="text-xs text-muted-foreground">
              {template.footerText}
            </p>
          </div>
        </div>
      )}

      {!student && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-xl">
          <p className="text-muted-foreground text-sm">
            Select a student to fill the certificate
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Certificates() {
  const { getData } = useApp();
  const students = getData("students") as Student[];
  const profile = ls.get<SchoolProfile | null>("school_profile", null);

  const [customTemplates, setCustomTemplates] = useState<
    Partial<Record<CertType, CertTemplate>>
  >({});
  const [editingType, setEditingType] = useState<CertType | null>(null);
  const [selectedType, setSelectedType] = useState<CertType>("bonafide");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [extras, setExtras] = useState({
    purpose: "general purpose",
    character: "Good",
  });
  const [studentSearch, setStudentSearch] = useState("");

  const getTemplate = (t: CertType) =>
    customTemplates[t] ?? DEFAULT_TEMPLATES[t];

  const handleSaveTemplate = (t: CertTemplate) => {
    setCustomTemplates((prev) => ({ ...prev, [t.type]: t }));
  };

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? null,
    [students, selectedStudentId],
  );

  const filteredStudents = useMemo(() => {
    if (!studentSearch) return students.slice(0, 30);
    const q = studentSearch.toLowerCase();
    return students
      .filter(
        (s) =>
          s.fullName?.toLowerCase().includes(q) ||
          s.admNo?.toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [students, studentSearch]);

  const printCertificate = () => {
    const el = document.getElementById("certificate-print-area");
    if (!el) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<html><head><title>${getTemplate(selectedType).title}</title><style>body{font-family:serif;padding:40px;font-size:${getTemplate(selectedType).fontSize}px}@media print{body{padding:0}}</style></head><body>${el.innerHTML}<script>window.print();window.close();<\/script></body></html>`,
    );
    w.document.close();
  };

  return (
    <div className="p-4 md:p-6 bg-background min-h-screen space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display">
          Certificate Studio
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Customize and generate school certificates
        </p>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates" data-ocid="certificates.templates.tab">
            Templates
          </TabsTrigger>
          <TabsTrigger value="generate" data-ocid="certificates.generate.tab">
            Generate Certificate
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-4">
          {editingType ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Edit2 className="w-4 h-4" />
                  Editing: {getTemplate(editingType).title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TemplateEditor
                  template={getTemplate(editingType)}
                  onSave={handleSaveTemplate}
                  onClose={() => setEditingType(null)}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {CERT_TYPES.map((ct, i) => {
                const hasCustom = !!customTemplates[ct.key];
                return (
                  <Card
                    key={ct.key}
                    data-ocid={`certificates.template.item.${i + 1}`}
                  >
                    <CardContent className="pt-4 pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-foreground text-sm">
                            {ct.label}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {ct.description}
                          </p>
                          {hasCustom && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              Customized
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-2"
                          onClick={() => setEditingType(ct.key)}
                          data-ocid={`certificates.edit_button.${i + 1}`}
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Generate Tab */}
        <TabsContent value="generate" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-4 pb-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Certificate Type</Label>
                  <Select
                    value={selectedType}
                    onValueChange={(v) => setSelectedType(v as CertType)}
                  >
                    <SelectTrigger data-ocid="certificates.generate.type_select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CERT_TYPES.map((ct) => (
                        <SelectItem key={ct.key} value={ct.key}>
                          {ct.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Search Student</Label>
                  <Input
                    placeholder="Name or adm no…"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    data-ocid="certificates.generate.student_search"
                  />
                </div>
              </div>
              <div>
                <Label>Select Student</Label>
                <Select
                  value={selectedStudentId}
                  onValueChange={setSelectedStudentId}
                >
                  <SelectTrigger data-ocid="certificates.generate.student_select">
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStudents.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.fullName} — {s.admNo} (Class {s.class}-{s.section})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Purpose (for bonafide)</Label>
                  <Input
                    value={extras.purpose}
                    onChange={(e) =>
                      setExtras((x) => ({ ...x, purpose: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Character (for TC/character cert)</Label>
                  <Input
                    value={extras.character}
                    onChange={(e) =>
                      setExtras((x) => ({ ...x, character: e.target.value }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="relative">
            <CertificatePreview
              template={getTemplate(selectedType)}
              student={selectedStudent}
              profile={profile}
              extras={extras}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={printCertificate}
              disabled={!selectedStudent}
              data-ocid="certificates.print_button"
            >
              <Printer className="w-4 h-4 mr-1" /> Print Certificate
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
