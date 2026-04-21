import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import type { AppUser, Staff, SubjectAssignment } from "../../types";
import { CLASSES, generateId, ls } from "../../utils/localStorage";

const DESIGNATIONS = [
  "Teacher",
  "Principal",
  "Vice Principal",
  "Admin",
  "Receptionist",
  "Accountant",
  "Librarian",
  "Driver",
  "Peon",
  "Security",
  "Cook",
  "Other",
];

const DEPARTMENTS = [
  "Teaching",
  "Admin",
  "Support",
  "Accounts",
  "Library",
  "Transport",
];

function designationToRole(designation: string): string {
  const map: Record<string, string> = {
    Teacher: "teacher",
    Principal: "admin",
    "Vice Principal": "admin",
    Admin: "admin",
    Receptionist: "receptionist",
    Accountant: "accountant",
    Librarian: "librarian",
    Driver: "driver",
  };
  return map[designation] ?? "teacher";
}

interface Props {
  initial?: Staff;
  existingStaff?: Staff[];
  onSave: (s: Staff) => void;
  onCancel: () => void;
}

function dobToPassword(dob: string): string {
  if (!dob) return "00000000";
  const clean = dob.trim();
  if (clean.includes("-") && clean.length === 10) {
    const [y, m, d] = clean.split("-");
    return `${(d ?? "").padStart(2, "0")}${(m ?? "").padStart(2, "0")}${y ?? ""}`;
  }
  if (clean.includes("/")) {
    const parts = clean.split("/");
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return `${(d ?? "").padStart(2, "0")}${(m ?? "").padStart(2, "0")}${y ?? ""}`;
    }
  }
  return clean.replace(/\D/g, "");
}

function parseDobParts(dob?: string): {
  day: string;
  month: string;
  year: string;
} {
  if (!dob) return { day: "", month: "", year: "" };
  const clean = dob.trim();
  if (clean.includes("-") && clean.length === 10) {
    const [y, m, d] = clean.split("-");
    return { day: d ?? "", month: m ?? "", year: y ?? "" };
  }
  if (clean.includes("/")) {
    const parts = clean.split("/");
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return { day: d ?? "", month: m ?? "", year: y ?? "" };
    }
  }
  return { day: "", month: "", year: "" };
}

function autoEmpId(existing: Staff[]): string {
  const nums = existing
    .map((s) => {
      const m = s.empId?.match(/^EMP(\d+)$/);
      return m ? Number.parseInt(m[1], 10) : 0;
    })
    .filter(Boolean);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `EMP${String(next).padStart(3, "0")}`;
}

const STEP_LABELS = ["Basic Info", "Contact & Bank", "Payroll Setup"];

export default function StaffForm({
  initial,
  existingStaff = [],
  onSave,
  onCancel,
}: Props) {
  useApp(); // ensure context is available for future use
  const photoRef = useRef<HTMLInputElement>(null);
  const dobDayRef = useRef<HTMLInputElement>(null);
  const dobMonthRef = useRef<HTMLInputElement>(null);
  const dobYearRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [ctError, setCtError] = useState("");

  // ── Step 1: Basic Info ─────────────────────────────────────
  const [name, setName] = useState(initial?.name ?? "");
  const [empId, setEmpId] = useState(
    initial?.empId ?? autoEmpId(existingStaff),
  );
  const [designation, setDesignation] = useState(initial?.designation ?? "");
  const [department, setDepartment] = useState(initial?.department ?? "");
  const [gender, setGender] = useState<"Male" | "Female" | "Other" | "">(
    initial?.gender ?? "",
  );
  const [qualification, setQualification] = useState(
    initial?.qualification ?? "",
  );
  const [joiningDate, setJoiningDate] = useState(initial?.joiningDate ?? "");
  const [status, setStatus] = useState<"active" | "inactive">(
    initial?.status ?? "active",
  );
  const [photo, setPhoto] = useState(initial?.photo ?? "");

  // Subject assignments (Teacher only)
  const [subjects, setSubjects] = useState<SubjectAssignment[]>(
    initial?.subjects?.length ? [...initial.subjects] : [],
  );

  const isTeacher = designation === "Teacher";

  // ── Step 2: Contact & Bank ─────────────────────────────────
  const [mobile, setMobile] = useState(initial?.mobile ?? "");
  const [altMobile, setAltMobile] = useState(
    (initial as unknown as { altMobile?: string })?.altMobile ?? "",
  );
  const [email, setEmail] = useState(initial?.email ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [village, setVillage] = useState(initial?.village ?? "");
  const [aadhaarNo, setAadhaarNo] = useState(initial?.aadhaarNo ?? "");
  const [bankAccount, setBankAccount] = useState(initial?.bankAccount ?? "");
  const [ifscCode, setIfscCode] = useState(initial?.ifscCode ?? "");
  const [bankName, setBankName] = useState(initial?.bankName ?? "");

  // DOB split parts
  const initDob = parseDobParts(initial?.dob);
  const [dobDay, setDobDay] = useState(initDob.day);
  const [dobMonth, setDobMonth] = useState(initDob.month);
  const [dobYear, setDobYear] = useState(initDob.year);

  // ── Step 3: Payroll Setup ──────────────────────────────────
  const [baseSalary, setBaseSalary] = useState(
    initial?.baseSalary != null
      ? String(initial.baseSalary)
      : initial?.salary != null
        ? String(initial.salary)
        : "",
  );
  const payrollData = ls.get<
    Record<
      string,
      {
        hra?: number;
        da?: number;
        otherAllowance?: number;
        pf?: number;
        esi?: number;
        otherDeduction?: number;
      }
    >
  >("payroll_setup", {});
  const existingPayroll = initial ? (payrollData[initial.id] ?? {}) : {};
  const [hra, setHra] = useState(
    existingPayroll.hra != null ? String(existingPayroll.hra) : "",
  );
  const [da, setDa] = useState(
    existingPayroll.da != null ? String(existingPayroll.da) : "",
  );
  const [otherAllowance, setOtherAllowance] = useState(
    existingPayroll.otherAllowance != null
      ? String(existingPayroll.otherAllowance)
      : "",
  );
  const [pf, setPf] = useState(
    existingPayroll.pf != null ? String(existingPayroll.pf) : "",
  );
  const [esi, setEsi] = useState(
    existingPayroll.esi != null ? String(existingPayroll.esi) : "",
  );
  const [otherDeduction, setOtherDeduction] = useState(
    existingPayroll.otherDeduction != null
      ? String(existingPayroll.otherDeduction)
      : "",
  );

  // Reconstruct full DOB string as dd/mm/yyyy
  const dobFull =
    dobDay && dobMonth && dobYear
      ? `${dobDay.padStart(2, "0")}/${dobMonth.padStart(2, "0")}/${dobYear}`
      : "";

  // Gross / Net preview
  const grossSalary =
    (Number(baseSalary) || 0) +
    (Number(hra) || 0) +
    (Number(da) || 0) +
    (Number(otherAllowance) || 0);
  const totalDeductions =
    (Number(pf) || 0) + (Number(esi) || 0) + (Number(otherDeduction) || 0);
  const netSalary = grossSalary - totalDeductions;

  // Subject list from academics + defaults
  const academicSubjects = ls
    .get<{ name: string }[]>("academics_subjects", [])
    .map((s) => s.name);
  const allSubjects = Array.from(
    new Set([
      "Hindi",
      "English",
      "Mathematics",
      "Science",
      "Social Science",
      "Sanskrit",
      "Computer",
      "Art",
      "Physical Education",
      "Music",
      "EVS",
      "GK",
      ...academicSubjects,
    ]),
  );

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("Photo must be under 3MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleDobDayChange(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 2);
    setDobDay(digits);
    if (digits.length === 2) dobMonthRef.current?.focus();
  }

  function handleDobMonthChange(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 2);
    setDobMonth(digits);
    if (digits.length === 2) dobYearRef.current?.focus();
  }

  function handleDobYearChange(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    setDobYear(digits);
  }

  function addSubject() {
    setSubjects((prev) => [
      ...prev,
      { subject: "", classFrom: "1", classTo: "10" },
    ]);
  }

  function updateSubject(
    i: number,
    field: keyof SubjectAssignment,
    value: string,
  ) {
    setSubjects((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)),
    );
  }

  function removeSubject(i: number) {
    setSubjects((prev) => prev.filter((_, idx) => idx !== i));
  }

  function validateStep1(): boolean {
    if (!name.trim()) {
      setCtError("Please enter the staff member's full name.");
      return false;
    }
    if (!designation) {
      setCtError("Please select a designation.");
      return false;
    }
    return true;
  }

  function validateStep2(): boolean {
    if (!mobile.trim() || mobile.trim().length < 10) {
      setCtError("Please enter a valid 10-digit mobile number.");
      return false;
    }
    return true;
  }

  function handleSave() {
    setCtError("");

    if (!validateStep1()) {
      setStep(1);
      return;
    }
    if (!validateStep2()) {
      setStep(2);
      return;
    }

    // For teachers, require at least one subject
    if (isTeacher && subjects.filter((s) => s.subject.trim()).length === 0) {
      setCtError("Teachers must have at least one subject assignment.");
      setStep(1);
      return;
    }

    const dobString = dobFull || initial?.dob || "";
    const password = dobToPassword(dobString) || mobile.trim();

    const staffId = initial?.id ?? generateId();

    // Save payroll setup separately in localStorage
    const payrollSetup = ls.get<Record<string, unknown>>("payroll_setup", {});
    payrollSetup[staffId] = {
      hra: Number(hra) || 0,
      da: Number(da) || 0,
      otherAllowance: Number(otherAllowance) || 0,
      pf: Number(pf) || 0,
      esi: Number(esi) || 0,
      otherDeduction: Number(otherDeduction) || 0,
    };
    ls.set("payroll_setup", payrollSetup);

    const staffMember: Staff & { altMobile?: string } = {
      id: staffId,
      empId: empId.trim() || autoEmpId(existingStaff),
      name: name.trim(),
      fullName: name.trim(),
      designation,
      department: department || undefined,
      gender: gender || undefined,
      mobile: mobile.trim(),
      dob: dobString,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      village: village.trim() || undefined,
      qualification: qualification.trim() || undefined,
      joiningDate: joiningDate || undefined,
      baseSalary: baseSalary ? Number(baseSalary) : undefined,
      salary: netSalary || (baseSalary ? Number(baseSalary) : undefined),
      aadhaarNo: aadhaarNo.trim() || undefined,
      bankAccount: bankAccount.trim() || undefined,
      ifscCode: ifscCode.trim() || undefined,
      bankName: bankName.trim() || undefined,
      altMobile: altMobile.trim() || undefined,
      status,
      photo: photo || undefined,
      subjects: subjects.filter((s) => s.subject.trim()),
      credentials: { username: mobile.trim(), password },
    };

    // Create AppUser entry when adding NEW staff (not editing)
    if (!initial) {
      const role = designationToRole(designation) as
        | "teacher"
        | "admin"
        | "receptionist"
        | "accountant"
        | "librarian"
        | "driver";

      const newUser: AppUser = {
        id: generateId(),
        username: mobile.trim(),
        role,
        name: name.trim(),
        mobile: mobile.trim(),
        staffId,
      };

      const appUsers = ls.get<AppUser[]>("app_users", []);
      if (!appUsers.some((u) => u.username === mobile.trim())) {
        ls.set("app_users", [...appUsers, newUser]);
      }

      const passwords = ls.get<Record<string, string>>("user_passwords", {});
      passwords[mobile.trim()] = password;
      ls.set("user_passwords", passwords);
    } else {
      const passwords = ls.get<Record<string, string>>("user_passwords", {});
      passwords[mobile.trim()] = password;
      ls.set("user_passwords", passwords);

      const appUsers = ls.get<AppUser[]>("app_users", []);
      const updated = appUsers.map((u) =>
        u.staffId === initial.id
          ? { ...u, username: mobile.trim(), name: name.trim() }
          : u,
      );
      ls.set("app_users", updated);
    }

    // Notification is fired by the caller (StaffDirectory.handleSave) AFTER
    // the server save is confirmed — not here, to avoid premature success messages.
    onSave(staffMember as Staff);
  }

  function goNext() {
    setCtError("");
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => Math.min(3, s + 1));
  }

  const totalSteps = 3;

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">
            {initial ? "Edit Staff Member" : "Add Staff Member"}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Step {step} of {totalSteps}: {STEP_LABELS[step - 1]}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" /> Cancel
        </Button>
      </div>

      {/* Step indicators */}
      <div className="flex gap-1 mb-6">
        {STEP_LABELS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i + 1)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors truncate px-2 ${
              step === i + 1
                ? "bg-primary text-primary-foreground"
                : step > i + 1
                  ? "bg-accent/20 text-accent border border-accent/30"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {/* ── STEP 1: Basic Info ──────────────────────────────── */}
      {step === 1 && (
        <Card className="p-6 space-y-5">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {photo ? (
                <img
                  src={photo}
                  alt={name || "Staff member"}
                  className="w-20 h-20 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground border-2 border-dashed border-border">
                  <ImagePlus className="w-7 h-7" />
                </div>
              )}
            </div>
            <div>
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => photoRef.current?.click()}
              >
                {photo ? "Change Photo" : "Upload Photo"}
              </Button>
              {photo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-2 text-destructive"
                  onClick={() => setPhoto("")}
                >
                  Remove
                </Button>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                JPG/PNG, max 3MB.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sf-name">Full Name *</Label>
              <Input
                id="sf-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Kumar Sharma"
                data-ocid="staff-name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sf-empid">Employee ID</Label>
              <Input
                id="sf-empid"
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                placeholder="Auto-generated"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Designation *</Label>
              <Select
                value={designation}
                onValueChange={(v) => setDesignation(v)}
              >
                <SelectTrigger data-ocid="staff-designation">
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  {DESIGNATIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select
                value={department || "__none__"}
                onValueChange={(v) => setDepartment(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select
                value={gender || "__none__"}
                onValueChange={(v) =>
                  setGender(
                    v === "__none__" ? "" : (v as "Male" | "Female" | "Other"),
                  )
                }
              >
                <SelectTrigger data-ocid="staff-gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not specified</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sf-qual">Qualification</Label>
              <Input
                id="sf-qual"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="e.g. B.Ed., M.A."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sf-join">Joining Date</Label>
              <Input
                id="sf-join"
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as "active" | "inactive")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subject assignments for teachers */}
          {isTeacher && (
            <div className="space-y-3 border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">
                    Subject Assignments
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Define each subject and the class range
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={addSubject}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Subject
                </Button>
              </div>

              {subjects.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground border border-dashed border-border rounded-lg text-sm">
                  No subjects assigned.{" "}
                  <button
                    type="button"
                    onClick={addSubject}
                    className="text-primary hover:underline"
                  >
                    Add subject
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {subjects.map((sub, i) => (
                    <div
                      key={`subj-${
                        // biome-ignore lint/suspicious/noArrayIndexKey: indexed rows
                        i
                      }`}
                      className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="space-y-1">
                        <Label className="text-xs">Subject</Label>
                        <Select
                          value={sub.subject}
                          onValueChange={(v) => updateSubject(i, "subject", v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {allSubjects.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">From</Label>
                        <Select
                          value={sub.classFrom}
                          onValueChange={(v) =>
                            updateSubject(i, "classFrom", v)
                          }
                        >
                          <SelectTrigger className="h-9 w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CLASSES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">To</Label>
                        <Select
                          value={sub.classTo}
                          onValueChange={(v) => updateSubject(i, "classTo", v)}
                        >
                          <SelectTrigger className="h-9 w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CLASSES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSubject(i)}
                        className="text-destructive hover:text-destructive/80 p-2 mt-5"
                        aria-label="Remove subject"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {subjects.filter((s) => s.subject).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-3 bg-muted/30 rounded-lg">
                      {subjects
                        .filter((s) => s.subject)
                        .map((s) => (
                          <Badge
                            key={`badge-${s.subject}-${s.classFrom}-${s.classTo}`}
                            variant="secondary"
                            className="text-xs"
                          >
                            {s.subject}: Class {s.classFrom}–{s.classTo}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {ctError && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {ctError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={goNext} data-ocid="staff-next">
              Next: Contact & Bank →
            </Button>
          </div>
        </Card>
      )}

      {/* ── STEP 2: Contact & Bank ──────────────────────────── */}
      {step === 2 && (
        <Card className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sf-mobile">Mobile No. * (Login Username)</Label>
              <Input
                id="sf-mobile"
                value={mobile}
                onChange={(e) =>
                  setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                placeholder="10-digit mobile number"
                maxLength={10}
                inputMode="numeric"
                data-ocid="staff-mobile"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sf-altmobile">Alternate Mobile</Label>
              <Input
                id="sf-altmobile"
                value={altMobile}
                onChange={(e) =>
                  setAltMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                placeholder="Alternate number"
                maxLength={10}
                inputMode="numeric"
              />
            </div>

            {/* DOB with auto-advance: DD → MM → YYYY */}
            <div className="space-y-1.5">
              <Label>Date of Birth (Password = ddmmyyyy)</Label>
              <div className="flex items-center gap-1.5">
                <Input
                  ref={dobDayRef}
                  placeholder="DD"
                  value={dobDay}
                  onChange={(e) => handleDobDayChange(e.target.value)}
                  maxLength={2}
                  className="w-14 text-center"
                  data-ocid="staff-dob-day"
                  inputMode="numeric"
                />
                <span className="text-muted-foreground">/</span>
                <Input
                  ref={dobMonthRef}
                  placeholder="MM"
                  value={dobMonth}
                  onChange={(e) => handleDobMonthChange(e.target.value)}
                  maxLength={2}
                  className="w-14 text-center"
                  data-ocid="staff-dob-month"
                  inputMode="numeric"
                />
                <span className="text-muted-foreground">/</span>
                <Input
                  ref={dobYearRef}
                  placeholder="YYYY"
                  value={dobYear}
                  onChange={(e) => handleDobYearChange(e.target.value)}
                  maxLength={4}
                  className="w-20 text-center"
                  data-ocid="staff-dob-year"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sf-email">Email</Label>
              <Input
                id="sf-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@school.in"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sf-village">Village</Label>
              <Input
                id="sf-village"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="Village / Town"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sf-aadhaar">Aadhaar No.</Label>
              <Input
                id="sf-aadhaar"
                value={aadhaarNo}
                onChange={(e) =>
                  setAadhaarNo(e.target.value.replace(/\D/g, "").slice(0, 12))
                }
                placeholder="12-digit Aadhaar number"
                maxLength={12}
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sf-address">Address</Label>
            <Input
              id="sf-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full address"
            />
          </div>

          <div className="border border-border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-foreground text-sm">
              Bank Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sf-bank">Bank Account No.</Label>
                <Input
                  id="sf-bank"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="Account number"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sf-ifsc">IFSC Code</Label>
                <Input
                  id="sf-ifsc"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SBIN0001234"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sf-bankname">Bank Name</Label>
                <Input
                  id="sf-bankname"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. State Bank of India"
                />
              </div>
            </div>
          </div>

          {/* Credential preview */}
          {mobile && (
            <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-0.5 border border-border">
              <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Auto Login Credentials
              </p>
              <p>
                <span className="text-muted-foreground">Username: </span>
                <span className="font-mono font-medium text-foreground">
                  {mobile}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Password: </span>
                <span className="font-mono font-medium text-foreground">
                  {dobFull
                    ? `${dobDay.padStart(2, "0")}${dobMonth.padStart(2, "0")}${dobYear}`
                    : "ddmmyyyy (complete DOB)"}
                </span>
              </p>
            </div>
          )}

          {ctError && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {ctError}
            </div>
          )}

          <div className="flex justify-between gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              ← Back
            </Button>
            <Button onClick={goNext} data-ocid="staff-next-payroll">
              Next: Payroll Setup →
            </Button>
          </div>
        </Card>
      )}

      {/* ── STEP 3: Payroll Setup ───────────────────────────── */}
      {step === 3 && (
        <Card className="p-6 space-y-5">
          <div>
            <h3 className="font-semibold text-foreground">Payroll Setup</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set salary components for payslip generation. All amounts in
              ₹/month.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sf-base">Base Salary (₹) *</Label>
              <Input
                id="sf-base"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={baseSalary}
                onChange={(e) =>
                  setBaseSalary(
                    e.target.value
                      .replace(/[^0-9.]/g, "")
                      .replace(/(\..*)\./g, "$1"),
                  )
                }
                placeholder="e.g. 25000"
                data-ocid="staff-salary"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sf-hra">HRA (₹)</Label>
              <Input
                id="sf-hra"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={hra}
                onChange={(e) =>
                  setHra(
                    e.target.value
                      .replace(/[^0-9.]/g, "")
                      .replace(/(\..*)\./g, "$1"),
                  )
                }
                placeholder="House Rent Allowance"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sf-da">DA (₹)</Label>
              <Input
                id="sf-da"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={da}
                onChange={(e) =>
                  setDa(
                    e.target.value
                      .replace(/[^0-9.]/g, "")
                      .replace(/(\..*)\./g, "$1"),
                  )
                }
                placeholder="Dearness Allowance"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sf-other-allow">Other Allowance (₹)</Label>
              <Input
                id="sf-other-allow"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={otherAllowance}
                onChange={(e) =>
                  setOtherAllowance(
                    e.target.value
                      .replace(/[^0-9.]/g, "")
                      .replace(/(\..*)\./g, "$1"),
                  )
                }
                placeholder="e.g. Travel, Special"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sf-pf">PF Deduction (₹)</Label>
              <Input
                id="sf-pf"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pf}
                onChange={(e) =>
                  setPf(
                    e.target.value
                      .replace(/[^0-9.]/g, "")
                      .replace(/(\..*)\./g, "$1"),
                  )
                }
                placeholder="Provident Fund"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sf-esi">ESI Deduction (₹)</Label>
              <Input
                id="sf-esi"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={esi}
                onChange={(e) =>
                  setEsi(
                    e.target.value
                      .replace(/[^0-9.]/g, "")
                      .replace(/(\..*)\./g, "$1"),
                  )
                }
                placeholder="Employee State Insurance"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sf-other-ded">Other Deduction (₹)</Label>
              <Input
                id="sf-other-ded"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={otherDeduction}
                onChange={(e) =>
                  setOtherDeduction(
                    e.target.value
                      .replace(/[^0-9.]/g, "")
                      .replace(/(\..*)\./g, "$1"),
                  )
                }
                placeholder="Loan, TDS, etc."
              />
            </div>
          </div>

          {/* Salary preview */}
          {(baseSalary ||
            hra ||
            da ||
            otherAllowance ||
            pf ||
            esi ||
            otherDeduction) && (
            <div className="bg-muted/30 rounded-lg p-4 border border-border">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Salary Preview
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Salary</span>
                  <span className="font-mono">
                    ₹{(Number(baseSalary) || 0).toLocaleString("en-IN")}
                  </span>
                </div>
                {Number(hra) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">HRA</span>
                    <span className="font-mono">
                      ₹{Number(hra).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                {Number(da) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">DA</span>
                    <span className="font-mono">
                      ₹{Number(da).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                {Number(otherAllowance) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Other Allow.</span>
                    <span className="font-mono">
                      ₹{Number(otherAllowance).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1 col-span-1">
                  <span>Gross Salary</span>
                  <span className="font-mono text-foreground">
                    ₹{grossSalary.toLocaleString("en-IN")}
                  </span>
                </div>
                {Number(pf) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PF</span>
                    <span className="font-mono text-destructive">
                      -₹{Number(pf).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                {Number(esi) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ESI</span>
                    <span className="font-mono text-destructive">
                      -₹{Number(esi).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                {Number(otherDeduction) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Other Ded.</span>
                    <span className="font-mono text-destructive">
                      -₹{Number(otherDeduction).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
                <span className="font-bold text-foreground">Net Salary</span>
                <span className="font-bold font-mono text-primary text-lg">
                  ₹{netSalary.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          )}

          {ctError && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {ctError}
            </div>
          )}

          <div className="flex justify-between gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              ← Back
            </Button>
            <Button onClick={handleSave} data-ocid="staff-save">
              {initial ? "Update Staff Member" : "Save Staff Member"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
