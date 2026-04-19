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
import {
  AlertCircle,
  Camera,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import type { ClassSection, Student } from "../types";
import { generateId, ls } from "../utils/localStorage";

interface StudentFormProps {
  student?: Student;
  onSave: (student: Student) => void;
  onClose: () => void;
  saveData: (
    collection: string,
    item: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  updateData: (
    collection: string,
    id: string,
    changes: Record<string, unknown>,
  ) => Promise<void>;
}

function makeDobFromParts(dd: string, mm: string, yyyy: string): string {
  if (dd.length === 2 && mm.length === 2 && yyyy.length === 4) {
    return `${dd}/${mm}/${yyyy}`;
  }
  return "";
}

function parseDobToParts(dob: string): [string, string, string] {
  const parts = dob.split("/");
  return [parts[0] ?? "", parts[1] ?? "", parts[2] ?? ""];
}

const CLASS_ORDER = [
  "Nursery",
  "LKG",
  "UKG",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
] as const;

function classDisplayName(name: string): string {
  const n = Number(name);
  if (!Number.isNaN(n) && n >= 1 && n <= 12) return `Class ${name}`;
  return name;
}

function sortClasses(classes: ClassSection[]): ClassSection[] {
  return [...classes].sort((a, b) => {
    const an = a.className ?? (a as unknown as { name?: string }).name ?? "";
    const bn = b.className ?? (b as unknown as { name?: string }).name ?? "";
    const ai = CLASS_ORDER.indexOf(an as (typeof CLASS_ORDER)[number]);
    const bi = CLASS_ORDER.indexOf(bn as (typeof CLASS_ORDER)[number]);
    return (
      (ai === -1 ? CLASS_ORDER.length : ai) -
      (bi === -1 ? CLASS_ORDER.length : bi)
    );
  });
}

export default function StudentForm({
  student,
  onSave,
  onClose,
  saveData,
  updateData,
}: StudentFormProps) {
  const { currentSession, addNotification, getData } = useApp();

  // ── Class data from context (server-loaded) ──────────────────────────────
  const rawClasses = getData("classes") as ClassSection[];
  const availableClasses = useMemo(
    () =>
      sortClasses(
        (Array.isArray(rawClasses) ? rawClasses : []).filter(Boolean),
      ),
    [rawClasses],
  );
  const classesLoading = false; // Data is already loaded by AppContext on login

  // Next admission number
  const getNextAdmNo = () => {
    try {
      const students = getData("students") as Student[];
      const list =
        students.length > 0 ? students : ls.get<Student[]>("students", []);
      if (list.length === 0) return "1001";
      const nums = list
        .map((s) => Number.parseInt((s.admNo ?? "").replace(/\D/g, ""), 10))
        .filter((n) => !Number.isNaN(n));
      if (nums.length === 0) return "1001";
      return String(Math.max(...nums) + 1);
    } catch {
      return "1001";
    }
  };

  const [admNo, setAdmNo] = useState(student?.admNo ?? getNextAdmNo());
  const [fullName, setFullName] = useState(student?.fullName ?? "");
  const [fatherName, setFatherName] = useState(student?.fatherName ?? "");
  const [fatherMobile, setFatherMobile] = useState(student?.fatherMobile ?? "");
  const [motherName, setMotherName] = useState(student?.motherName ?? "");
  const [motherMobile, setMotherMobile] = useState(student?.motherMobile ?? "");
  const [dobParts, setDobParts] = useState<[string, string, string]>(
    student?.dob ? parseDobToParts(student.dob) : ["", "", ""],
  );
  const [gender, setGender] = useState<Student["gender"]>(
    student?.gender ?? "Male",
  );
  const [cls, setCls] = useState(student?.class ?? "");
  const [section, setSection] = useState(student?.section ?? "");
  const [mobile, setMobile] = useState(student?.mobile ?? "");
  const [guardianMobile, setGuardianMobile] = useState(
    student?.guardianMobile ?? "",
  );
  const [address, setAddress] = useState(student?.address ?? "");
  const [village, setVillage] = useState(student?.village ?? "");
  const [category, setCategory] = useState(student?.category ?? "General");
  const [aadhaarNo, setAadhaarNo] = useState(student?.aadhaarNo ?? "");
  const [srNo, setSrNo] = useState(student?.srNo ?? "");
  const [penNo, setPenNo] = useState(student?.penNo ?? "");
  const [apaarNo, setApaarNo] = useState(student?.apaarNo ?? "");
  const [previousSchool, setPreviousSchool] = useState(
    student?.previousSchool ?? "",
  );
  const [admissionDate, setAdmissionDate] = useState(
    student?.admissionDate ??
      new Date()
        .toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
        .replace(/\//g, "/"),
  );
  const [photo, setPhoto] = useState(student?.photo ?? "");
  const [guardianOpen, setGuardianOpen] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sections for the currently selected class
  const sectionsForClass = useMemo(() => {
    const found = availableClasses.find(
      (c) =>
        (c.className ?? (c as unknown as { name?: string }).name ?? "") === cls,
    );
    return found?.sections ?? [];
  }, [availableClasses, cls]);

  // When selected class changes, reset section if it's no longer valid
  useEffect(() => {
    if (
      cls &&
      sectionsForClass.length > 0 &&
      section &&
      !sectionsForClass.includes(section)
    ) {
      setSection("");
    }
  }, [cls, sectionsForClass, section]);

  const mmRef = useRef<HTMLInputElement>(null);
  const yyyyRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  function handleDayChange(val: string) {
    const clean = val.replace(/\D/g, "").slice(0, 2);
    setDobParts([clean, dobParts[1], dobParts[2]]);
    if (clean.length === 2) mmRef.current?.focus();
  }

  function handleMonthChange(val: string) {
    const clean = val.replace(/\D/g, "").slice(0, 2);
    setDobParts([dobParts[0], clean, dobParts[2]]);
    if (clean.length === 2) yyyyRef.current?.focus();
  }

  function handleYearChange(val: string) {
    const clean = val.replace(/\D/g, "").slice(0, 4);
    setDobParts([dobParts[0], dobParts[1], clean]);
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = "Full name is required";
    if (!admNo.trim()) errs.admNo = "Admission No is required";
    if (!cls) errs.class = "Class is required";
    if (!section) errs.section = "Section is required";
    if (!fatherName.trim()) errs.fatherName = "Father name is required";
    const dob = makeDobFromParts(dobParts[0], dobParts[1], dobParts[2]);
    if (!dob) errs.dob = "Valid date of birth is required (DD/MM/YYYY)";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    const dob = makeDobFromParts(dobParts[0], dobParts[1], dobParts[2]);
    const dobForPassword = `${dobParts[0]}${dobParts[1]}${dobParts[2]}`;
    const isNew = !student;

    const studentData: Student = {
      id: student?.id ?? generateId(),
      admNo: admNo.trim(),
      fullName: fullName.trim(),
      fatherName: fatherName.trim(),
      fatherMobile: fatherMobile.trim() || undefined,
      motherName: motherName.trim(),
      motherMobile: motherMobile.trim() || undefined,
      dob,
      gender,
      class: cls,
      section,
      mobile: mobile.trim(),
      guardianMobile: guardianMobile.trim(),
      address: address.trim(),
      village: village.trim() || undefined,
      photo,
      category,
      aadhaarNo: aadhaarNo.trim() || undefined,
      srNo: srNo.trim() || undefined,
      penNo: penNo.trim() || undefined,
      apaarNo: apaarNo.trim() || undefined,
      previousSchool: previousSchool.trim() || undefined,
      admissionDate: admissionDate.trim() || undefined,
      transportBusNo: student?.transportBusNo,
      transportRoute: student?.transportRoute,
      transportPickup: student?.transportPickup,
      transportId: student?.transportId,
      credentials: { username: admNo.trim(), password: dobForPassword },
      status: student?.status ?? "active",
      leavingDate: student?.leavingDate,
      leavingReason: student?.leavingReason,
      leavingRemarks: student?.leavingRemarks,
      remarks: student?.remarks,
      sessionId: student?.sessionId ?? currentSession?.id ?? "sess_2025",
    };

    setSaving(true);
    setSaveError(null);

    try {
      if (isNew) {
        // saveData creates a new record via context → server
        await saveData("students", {
          ...studentData,
          name: studentData.fullName, // MySQL column alias
        } as unknown as Record<string, unknown>);
        addNotification(
          `New student added: ${studentData.fullName}`,
          "success",
          "👤",
        );
      } else {
        // updateData patches the existing record via context → server
        await updateData("students", studentData.id, {
          ...studentData,
          name: studentData.fullName,
        } as unknown as Record<string, unknown>);
        addNotification(
          `Student updated: ${studentData.fullName}`,
          "success",
          "✅",
        );
      }

      onSave(studentData);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as Record<string, unknown>).message)
            : "Failed to save student. Please try again.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  const noClassesWarning = !classesLoading && availableClasses.length === 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-semibold font-display text-foreground">
            {student ? "Edit Student" : "Add New Student"}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-ocid="student-form.close_button"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-5 space-y-4">
          {/* No classes warning */}
          {noClassesWarning && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                <strong>No classes configured.</strong> Please add classes first
                in <strong>Academics → Classes &amp; Sections</strong> before
                adding students.
              </p>
            </div>
          )}

          {/* Photo Upload */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
              {photo ? (
                <img
                  src={photo}
                  alt="Student"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="w-6 h-6 text-primary/60" />
              )}
            </div>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => photoRef.current?.click()}
              >
                <Camera className="w-3 h-3 mr-1" />{" "}
                {photo ? "Change Photo" : "Upload Photo"}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                JPG or PNG, max 2MB
              </p>
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>
                Admission No. <span className="text-destructive">*</span>
              </Label>
              <Input
                value={admNo}
                onChange={(e) => setAdmNo(e.target.value)}
                placeholder="e.g. 1001"
                data-ocid="student-form.admno"
              />
              {errors.admNo && (
                <p className="text-destructive text-xs">{errors.admNo}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Student full name"
                data-ocid="student-form.fullname"
              />
              {errors.fullName && (
                <p className="text-destructive text-xs">{errors.fullName}</p>
              )}
            </div>
          </div>

          {/* Class + Section from context */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>
                Class <span className="text-destructive">*</span>
              </Label>
              <Select
                value={cls}
                onValueChange={(v) => {
                  setCls(v);
                  setSection("");
                }}
                disabled={classesLoading}
              >
                <SelectTrigger data-ocid="student-form.class">
                  <SelectValue
                    placeholder={
                      availableClasses.length === 0
                        ? "No classes — add in Academics"
                        : "Select class"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.length === 0 && (
                    <SelectItem value="_none" disabled>
                      No classes configured
                    </SelectItem>
                  )}
                  {availableClasses.map((c) => {
                    const cn =
                      c.className ??
                      (c as unknown as { name?: string }).name ??
                      "";
                    return (
                      <SelectItem key={c.id} value={cn}>
                        {classDisplayName(cn)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.class && (
                <p className="text-destructive text-xs">{errors.class}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>
                Section <span className="text-destructive">*</span>
              </Label>
              <Select
                value={section}
                onValueChange={setSection}
                disabled={!cls}
              >
                <SelectTrigger data-ocid="student-form.section">
                  <SelectValue
                    placeholder={
                      !cls
                        ? "Select class first"
                        : sectionsForClass.length === 0
                          ? "No sections"
                          : "Select section"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {sectionsForClass.length === 0 && cls && (
                    <SelectItem value="_none" disabled>
                      No sections for {cls}
                    </SelectItem>
                  )}
                  {sectionsForClass.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.section && (
                <p className="text-destructive text-xs">{errors.section}</p>
              )}
            </div>
          </div>

          {/* Date of Birth */}
          <div className="space-y-1">
            <Label>
              Date of Birth <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2 items-center">
              <Input
                className="w-16 text-center"
                placeholder="DD"
                value={dobParts[0]}
                maxLength={2}
                onChange={(e) => handleDayChange(e.target.value)}
                data-ocid="student-form.dob-dd"
              />
              <span className="text-muted-foreground">/</span>
              <Input
                ref={mmRef}
                className="w-16 text-center"
                placeholder="MM"
                value={dobParts[1]}
                maxLength={2}
                onChange={(e) => handleMonthChange(e.target.value)}
                data-ocid="student-form.dob-mm"
              />
              <span className="text-muted-foreground">/</span>
              <Input
                ref={yyyyRef}
                className="w-24 text-center"
                placeholder="YYYY"
                value={dobParts[2]}
                maxLength={4}
                onChange={(e) => handleYearChange(e.target.value)}
                data-ocid="student-form.dob-yyyy"
              />
            </div>
            {errors.dob && (
              <p className="text-destructive text-xs">{errors.dob}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Auto-advances: day → month → year
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Gender</Label>
              <Select
                value={gender}
                onValueChange={(v) => setGender(v as Student["gender"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["General", "OBC", "SC", "ST", "EWS"].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>
              Father's Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
              placeholder="Father's full name"
            />
            {errors.fatherName && (
              <p className="text-destructive text-xs">{errors.fatherName}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Primary Mobile</Label>
              <Input
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Student/primary mobile"
                type="tel"
              />
            </div>
            <div className="space-y-1">
              <Label>Admission Date</Label>
              <Input
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
                placeholder="DD/MM/YYYY"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Address</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full address"
              />
            </div>
            <div className="space-y-1">
              <Label>Village</Label>
              <Input
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="Village / locality"
              />
            </div>
          </div>

          {/* Guardian Info */}
          <button
            type="button"
            onClick={() => setGuardianOpen(!guardianOpen)}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {guardianOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Guardian / Parent Details (Optional)
          </button>

          {guardianOpen && (
            <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/30">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Father Mobile</Label>
                  <Input
                    value={fatherMobile}
                    onChange={(e) => setFatherMobile(e.target.value)}
                    placeholder="Father's mobile"
                    type="tel"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Mother's Name</Label>
                  <Input
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    placeholder="Mother's full name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Mother Mobile</Label>
                  <Input
                    value={motherMobile}
                    onChange={(e) => setMotherMobile(e.target.value)}
                    placeholder="Mother's mobile"
                    type="tel"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Guardian Mobile</Label>
                  <Input
                    value={guardianMobile}
                    onChange={(e) => setGuardianMobile(e.target.value)}
                    placeholder="Guardian mobile number"
                    type="tel"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Additional Fields */}
          <button
            type="button"
            onClick={() => setExtraOpen(!extraOpen)}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {extraOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Additional Details (Aadhaar, SR No, Pen No, APAAR, Previous School)
          </button>

          {extraOpen && (
            <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/30">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Aadhaar No.</Label>
                  <Input
                    value={aadhaarNo}
                    onChange={(e) => setAadhaarNo(e.target.value)}
                    placeholder="12-digit Aadhaar"
                    maxLength={12}
                  />
                </div>
                <div className="space-y-1">
                  <Label>S.R. No.</Label>
                  <Input
                    value={srNo}
                    onChange={(e) => setSrNo(e.target.value)}
                    placeholder="School Register No."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Pen No.</Label>
                  <Input
                    value={penNo}
                    onChange={(e) => setPenNo(e.target.value)}
                    placeholder="Permanent Enrolment No."
                  />
                </div>
                <div className="space-y-1">
                  <Label>APAAR No.</Label>
                  <Input
                    value={apaarNo}
                    onChange={(e) => setApaarNo(e.target.value)}
                    placeholder="Academic Bank of Credits ID"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Previous School</Label>
                <Input
                  value={previousSchool}
                  onChange={(e) => setPreviousSchool(e.target.value)}
                  placeholder="Name of previous school"
                />
              </div>
            </div>
          )}

          {/* Credential preview for new students */}
          {!student &&
            admNo &&
            dobParts[0].length === 2 &&
            dobParts[1].length === 2 &&
            dobParts[2].length === 4 && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-xs font-semibold text-primary mb-1.5">
                  Auto-Generated Login Credentials
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Username:</span>{" "}
                    <span className="font-mono font-semibold text-foreground">
                      {admNo}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Password:</span>{" "}
                    <span className="font-mono font-semibold text-foreground">
                      {dobParts[0]}
                      {dobParts[1]}
                      {dobParts[2]}
                    </span>
                  </div>
                </div>
              </div>
            )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            data-ocid="student-form.cancel_button"
          >
            Cancel
          </Button>
          {saveError && (
            <p className="text-destructive text-xs flex-1 text-center mr-2 bg-destructive/10 px-3 py-1.5 rounded-md border border-destructive/20">
              ⚠️ {saveError}
            </p>
          )}
          <Button
            onClick={() => void handleSave()}
            disabled={saving}
            data-ocid="student-form.submit_button"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving to server…
              </>
            ) : student ? (
              "Save Changes"
            ) : (
              "Add Student"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
