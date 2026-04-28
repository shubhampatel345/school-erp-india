/**
 * StudentForm.tsx — Add / Edit student modal
 *
 * Waits for server 200 before calling onSave. Never fires success early.
 * StableInput pattern prevents cursor-jump bugs on every keystroke.
 */
import { Button } from "@/components/ui/button";
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
import { AlertCircle, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import type { Student } from "../types";
import phpApiService, { type ClassRecord } from "../utils/phpApiService";

interface StudentFormProps {
  student?: Student;
  onSave: (student: Student) => Promise<void>;
  onClose: () => void;
  saveData?: (
    collection: string,
    item: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  updateData?: (
    collection: string,
    id: string,
    changes: Record<string, unknown>,
  ) => Promise<void>;
}

function normalizeClassName(name: string): string {
  const n = Number(name);
  if (!Number.isNaN(n) && n >= 1 && n <= 12) return `Class ${name}`;
  return name;
}

const CLASS_ORDER_KEYS = [
  "Nursery",
  "LKG",
  "UKG",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
];

function classOrderIndex(name: string): number {
  const norm = normalizeClassName(name);
  const idx = CLASS_ORDER_KEYS.indexOf(norm);
  if (idx !== -1) return idx;
  const direct = CLASS_ORDER_KEYS.indexOf(name);
  return direct !== -1 ? direct : CLASS_ORDER_KEYS.length;
}

function sortClasses(classes: ClassRecord[]): ClassRecord[] {
  return [...classes].sort(
    (a, b) => classOrderIndex(a.className) - classOrderIndex(b.className),
  );
}

/** Self-contained input — holds its own value in state to prevent parent re-render cursor loss */
function StableInput({
  label,
  id,
  defaultValue,
  type = "text",
  placeholder,
  onChange,
  required,
}: {
  label: string;
  id: string;
  defaultValue: string;
  type?: string;
  placeholder?: string;
  onChange: (val: string) => void;
  required?: boolean;
}) {
  const [val, setVal] = useState(defaultValue);
  const onChangeFn = useRef(onChange);
  onChangeFn.current = onChange;

  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        value={val}
        placeholder={placeholder}
        onChange={(e) => {
          setVal(e.target.value);
          onChangeFn.current(e.target.value);
        }}
        className="h-8 text-sm"
      />
    </div>
  );
}

interface FieldState {
  admNo: string;
  fullName: string;
  fatherName: string;
  motherName: string;
  fatherMobile: string;
  motherMobile: string;
  mobile: string;
  dob: string;
  rollNo: string;
  category: string;
  religion: string;
  bloodGroup: string;
  address: string;
  village: string;
  aadhaarNo: string;
  srNo: string;
  penNo: string;
  apaarNo: string;
  previousSchool: string;
  admissionDate: string;
  guardianName: string;
}

export default function StudentForm({
  student,
  onSave,
  onClose,
}: StudentFormProps) {
  const { currentSession, addNotification } = useApp();

  // ── Classes from API ────────────────────────────────────────────────────────
  const [apiClasses, setApiClasses] = useState<ClassRecord[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  useEffect(() => {
    setClassesLoading(true);
    phpApiService
      .getClasses()
      .then((cls) => {
        setApiClasses(sortClasses(cls.filter((c) => c.isEnabled !== false)));
      })
      .catch(() => {
        setApiClasses([]);
      })
      .finally(() => setClassesLoading(false));
  }, []);

  // ── Form field refs (stable, no cursor jump) ────────────────────────────────
  const fields = useRef<FieldState>({
    admNo: student?.admNo ?? "",
    fullName: student?.fullName ?? "",
    fatherName: student?.fatherName ?? "",
    motherName: student?.motherName ?? "",
    fatherMobile: student?.fatherMobile ?? "",
    motherMobile: student?.motherMobile ?? "",
    mobile: student?.mobile ?? "",
    dob: student?.dob ?? "",
    rollNo: (student as Student & { rollNo?: string })?.rollNo ?? "",
    category: student?.category ?? "",
    religion: student?.religion ?? "",
    bloodGroup: student?.bloodGroup ?? "",
    address: student?.address ?? "",
    village: student?.village ?? "",
    aadhaarNo: student?.aadhaarNo ?? "",
    srNo: student?.srNo ?? "",
    penNo: student?.penNo ?? "",
    apaarNo: student?.apaarNo ?? "",
    previousSchool: student?.previousSchool ?? "",
    admissionDate: student?.admissionDate ?? "",
    guardianName: student?.guardianName ?? "",
  });

  const [selectedClass, setSelectedClass] = useState(student?.class ?? "");
  const [selectedSection, setSelectedSection] = useState(
    student?.section ?? "",
  );
  const [selectedGender, setSelectedGender] = useState<Student["gender"]>(
    student?.gender ?? "Male",
  );
  const [selectedStatus, setSelectedStatus] = useState<
    "active" | "discontinued"
  >(student?.status ?? "active");
  const sessionId = student?.sessionId ?? currentSession?.id ?? "";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sections for chosen class
  const sectionsForClass =
    apiClasses.find((c) => c.className === selectedClass)?.sections ?? [];

  const setField = useCallback((key: keyof FieldState, val: string) => {
    fields.current[key] = val;
  }, []);

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const f = fields.current;

    if (!f.admNo.trim()) {
      setError("Admission number is required");
      return;
    }
    if (!f.fullName.trim()) {
      setError("Full name is required");
      return;
    }
    if (!selectedClass) {
      setError("Class is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // All fields sent as strings — never undefined/null
    const payload: Record<string, string> = {
      admNo: f.admNo.trim(),
      fullName: f.fullName.trim(),
      fatherName: f.fatherName.trim(),
      motherName: f.motherName.trim(),
      fatherMobile: f.fatherMobile.trim(),
      motherMobile: f.motherMobile.trim(),
      mobile: f.mobile.trim(),
      dob: f.dob.trim(),
      rollNo: f.rollNo.trim(),
      gender: selectedGender,
      class: selectedClass,
      section: selectedSection,
      category: f.category.trim(),
      religion: f.religion.trim(),
      bloodGroup: f.bloodGroup.trim(),
      address: f.address.trim(),
      village: f.village.trim(),
      aadhaarNo: f.aadhaarNo.trim(),
      srNo: f.srNo.trim(),
      penNo: f.penNo.trim(),
      apaarNo: f.apaarNo.trim(),
      previousSchool: f.previousSchool.trim(),
      admissionDate: f.admissionDate.trim(),
      guardianName: f.guardianName.trim(),
      guardianMobile: f.fatherMobile.trim(),
      status: selectedStatus,
      sessionId: sessionId,
    };

    try {
      let saved: Record<string, unknown>;
      if (student?.id) {
        await phpApiService.updateStudent({ id: student.id, ...payload });
        saved = { ...payload, id: student.id };
      } else {
        const result = await phpApiService.addStudent(payload);
        saved = result as Record<string, unknown>;
      }

      const savedStudent: Student = {
        id: (saved.id as string) ?? student?.id ?? "",
        admNo: (saved.admNo as string) ?? payload.admNo,
        fullName: (saved.fullName as string) ?? payload.fullName,
        fatherName: payload.fatherName,
        motherName: payload.motherName,
        fatherMobile: payload.fatherMobile,
        motherMobile: payload.motherMobile,
        guardianMobile: payload.fatherMobile,
        mobile: payload.mobile,
        dob: payload.dob,
        gender: selectedGender,
        class: selectedClass,
        section: selectedSection,
        category: payload.category,
        religion: payload.religion,
        bloodGroup: payload.bloodGroup,
        address: payload.address,
        village: payload.village,
        aadhaarNo: payload.aadhaarNo,
        srNo: payload.srNo,
        penNo: payload.penNo,
        apaarNo: payload.apaarNo,
        previousSchool: payload.previousSchool,
        admissionDate: payload.admissionDate,
        status: selectedStatus,
        sessionId: sessionId,
        createdAt: student?.createdAt ?? new Date().toISOString(),
      };

      addNotification(
        student?.id
          ? `${savedStudent.fullName} updated`
          : `${savedStudent.fullName} added`,
        "success",
      );

      await onSave(savedStudent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save student");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto"
      data-ocid="student_form.dialog"
    >
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h2 className="font-display font-bold text-foreground text-base">
            {student ? `Edit: ${student.fullName}` : "Add New Student"}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onClose}
            data-ocid="student_form.close_button"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          {error && (
            <div
              className="flex items-center gap-2 px-5 py-2.5 bg-destructive/10 border-b border-destructive/20 text-sm text-destructive"
              data-ocid="student_form.error_state"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-5">
            <Tabs defaultValue="basic">
              <TabsList className="mb-4">
                <TabsTrigger value="basic" data-ocid="student_form.tab_basic">
                  Basic Info
                </TabsTrigger>
                <TabsTrigger
                  value="parents"
                  data-ocid="student_form.tab_parents"
                >
                  Parent / Guardian
                </TabsTrigger>
                <TabsTrigger
                  value="academic"
                  data-ocid="student_form.tab_academic"
                >
                  Academic
                </TabsTrigger>
                <TabsTrigger value="other" data-ocid="student_form.tab_other">
                  Other
                </TabsTrigger>
              </TabsList>

              {/* ── Basic Info ── */}
              <TabsContent value="basic" className="space-y-3 mt-0">
                <div className="grid grid-cols-2 gap-3">
                  <StableInput
                    label="Admission No."
                    id="admNo"
                    defaultValue={fields.current.admNo}
                    onChange={(v) => setField("admNo", v)}
                    placeholder="e.g. 2025/001"
                    required
                  />
                  <StableInput
                    label="Full Name"
                    id="fullName"
                    defaultValue={fields.current.fullName}
                    onChange={(v) => setField("fullName", v)}
                    placeholder="Student full name"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="sf-class" className="text-xs font-medium">
                      Class<span className="text-destructive ml-0.5">*</span>
                    </Label>
                    <Select
                      value={selectedClass}
                      onValueChange={(v) => {
                        setSelectedClass(v);
                        setSelectedSection("");
                      }}
                    >
                      <SelectTrigger
                        id="sf-class"
                        className="h-8 text-sm"
                        data-ocid="student_form.class_select"
                      >
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classesLoading ? (
                          <SelectItem value="__loading__" disabled>
                            Loading classes…
                          </SelectItem>
                        ) : apiClasses.length > 0 ? (
                          apiClasses.map((c) => (
                            <SelectItem key={c.id} value={c.className}>
                              {c.className}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__empty__" disabled>
                            No classes — add in Academics first
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="sf-section" className="text-xs font-medium">
                      Section
                    </Label>
                    <Select
                      value={selectedSection}
                      onValueChange={setSelectedSection}
                    >
                      <SelectTrigger
                        id="sf-section"
                        className="h-8 text-sm"
                        data-ocid="student_form.section_select"
                      >
                        <SelectValue placeholder="Section" />
                      </SelectTrigger>
                      <SelectContent>
                        {sectionsForClass.length > 0 ? (
                          sectionsForClass.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__no_section__" disabled>
                            {selectedClass
                              ? "No sections configured"
                              : "Select a class first"}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <StableInput
                    label="Roll No."
                    id="sf-rollNo"
                    defaultValue={fields.current.rollNo}
                    onChange={(v) => setField("rollNo", v)}
                    placeholder="Roll number"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <StableInput
                    label="Date of Birth"
                    id="sf-dob"
                    defaultValue={fields.current.dob}
                    onChange={(v) => setField("dob", v)}
                    placeholder="DD/MM/YYYY"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="sf-gender" className="text-xs font-medium">
                      Gender
                    </Label>
                    <Select
                      value={selectedGender}
                      onValueChange={(v) =>
                        setSelectedGender(v as Student["gender"])
                      }
                    >
                      <SelectTrigger
                        id="sf-gender"
                        className="h-8 text-sm"
                        data-ocid="student_form.gender_select"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <StableInput
                    label="Admission Date"
                    id="sf-admDate"
                    defaultValue={fields.current.admissionDate}
                    onChange={(v) => setField("admissionDate", v)}
                    placeholder="DD/MM/YYYY"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="sf-status" className="text-xs font-medium">
                      Status
                    </Label>
                    <Select
                      value={selectedStatus}
                      onValueChange={(v) =>
                        setSelectedStatus(v as "active" | "discontinued")
                      }
                    >
                      <SelectTrigger
                        id="sf-status"
                        className="h-8 text-sm"
                        data-ocid="student_form.status_select"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="discontinued">
                          Discontinued
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <StableInput
                  label="Address"
                  id="sf-address"
                  defaultValue={fields.current.address}
                  onChange={(v) => setField("address", v)}
                  placeholder="Full address"
                />
                <StableInput
                  label="Village / Area"
                  id="sf-village"
                  defaultValue={fields.current.village}
                  onChange={(v) => setField("village", v)}
                  placeholder="Village or area"
                />
              </TabsContent>

              {/* ── Parent / Guardian ── */}
              <TabsContent value="parents" className="space-y-3 mt-0">
                <div className="grid grid-cols-2 gap-3">
                  <StableInput
                    label="Father Name"
                    id="sf-fatherName"
                    defaultValue={fields.current.fatherName}
                    onChange={(v) => setField("fatherName", v)}
                    placeholder="Father full name"
                  />
                  <StableInput
                    label="Father Mobile"
                    id="sf-fatherMobile"
                    defaultValue={fields.current.fatherMobile}
                    onChange={(v) => setField("fatherMobile", v)}
                    placeholder="10-digit mobile"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StableInput
                    label="Mother Name"
                    id="sf-motherName"
                    defaultValue={fields.current.motherName}
                    onChange={(v) => setField("motherName", v)}
                    placeholder="Mother full name"
                  />
                  <StableInput
                    label="Mother Mobile"
                    id="sf-motherMobile"
                    defaultValue={fields.current.motherMobile}
                    onChange={(v) => setField("motherMobile", v)}
                    placeholder="10-digit mobile"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StableInput
                    label="Guardian Name"
                    id="sf-guardianName"
                    defaultValue={fields.current.guardianName}
                    onChange={(v) => setField("guardianName", v)}
                    placeholder="Guardian name (if different)"
                  />
                  <StableInput
                    label="Student Mobile"
                    id="sf-mobile"
                    defaultValue={fields.current.mobile}
                    onChange={(v) => setField("mobile", v)}
                    placeholder="Student mobile number"
                  />
                </div>
              </TabsContent>

              {/* ── Academic ── */}
              <TabsContent value="academic" className="space-y-3 mt-0">
                <div className="grid grid-cols-2 gap-3">
                  <StableInput
                    label="Previous School"
                    id="sf-prevSchool"
                    defaultValue={fields.current.previousSchool}
                    onChange={(v) => setField("previousSchool", v)}
                    placeholder="Previous school name"
                  />
                  <StableInput
                    label="S.R. Number"
                    id="sf-srNo"
                    defaultValue={fields.current.srNo}
                    onChange={(v) => setField("srNo", v)}
                    placeholder="Serial register number"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StableInput
                    label="Pen Number"
                    id="sf-penNo"
                    defaultValue={fields.current.penNo}
                    onChange={(v) => setField("penNo", v)}
                    placeholder="PEN number"
                  />
                  <StableInput
                    label="APAAR Number"
                    id="sf-apaarNo"
                    defaultValue={fields.current.apaarNo}
                    onChange={(v) => setField("apaarNo", v)}
                    placeholder="APAAR ID"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StableInput
                    label="Category"
                    id="sf-category"
                    defaultValue={fields.current.category}
                    onChange={(v) => setField("category", v)}
                    placeholder="General, OBC, SC, ST"
                  />
                  <StableInput
                    label="Religion"
                    id="sf-religion"
                    defaultValue={fields.current.religion}
                    onChange={(v) => setField("religion", v)}
                    placeholder="Religion"
                  />
                </div>
                <StableInput
                  label="Blood Group"
                  id="sf-bloodGroup"
                  defaultValue={fields.current.bloodGroup}
                  onChange={(v) => setField("bloodGroup", v)}
                  placeholder="e.g. A+, O-"
                />
              </TabsContent>

              {/* ── Other ── */}
              <TabsContent value="other" className="space-y-3 mt-0">
                <StableInput
                  label="Aadhaar Number"
                  id="sf-aadhaar"
                  defaultValue={fields.current.aadhaarNo}
                  onChange={(v) => setField("aadhaarNo", v)}
                  placeholder="12-digit Aadhaar"
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              data-ocid="student_form.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              data-ocid="student_form.submit_button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{" "}
                  Saving…
                </>
              ) : student ? (
                "Update Student"
              ) : (
                "Add Student"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
