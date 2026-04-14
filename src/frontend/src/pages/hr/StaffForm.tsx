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
  "Clerk",
  "Peon",
  "Other",
];

const DEPARTMENTS = [
  "Teaching",
  "Administration",
  "Accounts",
  "Library",
  "Transport",
  "Security",
  "Housekeeping",
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
  onSave: (s: Staff) => void;
  onCancel: () => void;
}

/** Convert a DOB string (dd/mm/yyyy or yyyy-mm-dd) to ddmmyyyy password */
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
  // Already in ddmmyyyy or similar — strip non-digits
  return clean.replace(/\D/g, "");
}

/** Parse initial DOB string into DD, MM, YYYY parts */
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

export default function StaffForm({ initial, onSave, onCancel }: Props) {
  const { addNotification } = useApp();
  const photoRef = useRef<HTMLInputElement>(null);
  const dobDayRef = useRef<HTMLInputElement>(null);
  const dobMonthRef = useRef<HTMLInputElement>(null);
  const dobYearRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);

  // Basic fields
  const [name, setName] = useState(initial?.name ?? "");
  const [empId, setEmpId] = useState(
    initial?.empId ?? `EMP${Date.now().toString().slice(-5)}`,
  );
  const [designation, setDesignation] = useState(initial?.designation ?? "");
  const [department, setDepartment] = useState(initial?.department ?? "");
  const [mobile, setMobile] = useState(initial?.mobile ?? "");

  // DOB split parts
  const initDob = parseDobParts(initial?.dob);
  const [dobDay, setDobDay] = useState(initDob.day);
  const [dobMonth, setDobMonth] = useState(initDob.month);
  const [dobYear, setDobYear] = useState(initDob.year);

  const [email, setEmail] = useState(initial?.email ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [qualification, setQualification] = useState(
    initial?.qualification ?? "",
  );
  const [joiningDate, setJoiningDate] = useState(initial?.joiningDate ?? "");
  const [salary, setSalary] = useState(
    initial?.salary != null ? String(initial.salary) : "",
  );
  const [status, setStatus] = useState<"active" | "inactive">(
    initial?.status ?? "active",
  );
  const [photo, setPhoto] = useState(initial?.photo ?? "");
  const [subjects, setSubjects] = useState<SubjectAssignment[]>(
    initial?.subjects?.length ? [...initial.subjects] : [],
  );
  const [ctError, setCtError] = useState("");

  const isTeacher = designation === "Teacher";

  // Reconstruct full DOB string as dd/mm/yyyy
  const dobFull =
    dobDay && dobMonth && dobYear
      ? `${dobDay.padStart(2, "0")}/${dobMonth.padStart(2, "0")}/${dobYear}`
      : "";

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

  function handleSave() {
    setCtError("");

    // Validate required fields
    if (!name.trim()) {
      alert("Please enter the staff member's full name.");
      setStep(1);
      return;
    }
    if (!designation) {
      alert("Please select a designation.");
      setStep(1);
      return;
    }
    if (!mobile.trim() || mobile.trim().length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      setStep(1);
      return;
    }

    // For teachers, require at least one subject
    if (isTeacher && subjects.filter((s) => s.subject.trim()).length === 0) {
      setCtError("Teachers must have at least one subject assignment.");
      setStep(2);
      return;
    }

    // Build password from DOB
    const dobString = dobFull || initial?.dob || "";
    const password = dobToPassword(dobString) || mobile.trim();

    const staffMember: Staff = {
      id: initial?.id ?? generateId(),
      empId: empId.trim() || `EMP${generateId()}`,
      name: name.trim(),
      designation,
      department: department || undefined,
      mobile: mobile.trim(),
      dob: dobString,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      qualification: qualification.trim() || undefined,
      joiningDate: joiningDate || undefined,
      salary: salary ? Number(salary) : undefined,
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
        staffId: staffMember.id,
      };

      const appUsers = ls.get<AppUser[]>("app_users", []);
      // Only create user if username doesn't already exist
      if (!appUsers.some((u) => u.username === mobile.trim())) {
        ls.set("app_users", [...appUsers, newUser]);
      }

      // Store password in user_passwords map
      const passwords = ls.get<Record<string, string>>("user_passwords", {});
      passwords[mobile.trim()] = password;
      ls.set("user_passwords", passwords);
    } else {
      // On edit: update password if DOB or mobile changed
      const passwords = ls.get<Record<string, string>>("user_passwords", {});
      passwords[mobile.trim()] = password;
      ls.set("user_passwords", passwords);

      // Update username in app_users if mobile changed
      const appUsers = ls.get<AppUser[]>("app_users", []);
      const updated = appUsers.map((u) =>
        u.staffId === initial.id
          ? { ...u, username: mobile.trim(), name: name.trim() }
          : u,
      );
      ls.set("app_users", updated);
    }

    addNotification(
      initial ? `Staff updated: ${name}` : `New staff member added: ${name}`,
      "success",
      "👤",
    );

    onSave(staffMember);
  }

  // ── RENDER ─────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">
            {initial ? "Edit Staff Member" : "Add Staff Member"}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isTeacher ? `Step ${step} of 2` : "Fill in staff details below"}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" /> Cancel
        </Button>
      </div>

      {/* Step indicators for Teacher */}
      {isTeacher && (
        <div className="flex gap-2 mb-6">
          {[1, 2].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Step {s}: {s === 1 ? "Basic Info" : "Subject Assignment"}
            </button>
          ))}
        </div>
      )}

      {/* ── STEP 1: Basic Info ─────────────────────────── */}
      {step === 1 && (
        <Card className="p-6 space-y-5">
          {/* Photo upload */}
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
                JPG/PNG, max 3MB. Stored as base64.
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
                onValueChange={(v) => {
                  setDesignation(v);
                  // If switching away from Teacher, go back to step 1
                  if (v !== "Teacher") setStep(1);
                }}
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
              <Label htmlFor="sf-salary">Net Salary (₹)</Label>
              <Input
                id="sf-salary"
                type="number"
                value={salary}
                onChange={(e) =>
                  setSalary(e.target.value.replace(/^0+(?=\d)/, ""))
                }
                placeholder="e.g. 25000"
                min={0}
                data-ocid="staff-salary"
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

          <div className="space-y-1.5">
            <Label htmlFor="sf-address">Address</Label>
            <Input
              id="sf-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full address"
            />
          </div>

          {ctError && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {ctError}
            </div>
          )}

          {/* Credential preview */}
          {mobile && (
            <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-0.5 border border-border">
              <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Auto Login Credentials
                {initial ? " (password updated on save)" : ""}
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
                    : "ddmmyyyy (complete DOB above)"}
                </span>
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            {isTeacher ? (
              <Button onClick={() => setStep(2)} data-ocid="staff-next">
                Next: Subjects →
              </Button>
            ) : (
              <Button onClick={handleSave} data-ocid="staff-save">
                {initial ? "Update Staff" : "Save Staff Member"}
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* ── STEP 2: Subject Assignment (Teacher only) ───── */}
      {step === 2 && isTeacher && (
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">
                Subject Assignments
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Define each subject and the class range this teacher covers
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={addSubject}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Subject
            </Button>
          </div>

          {subjects.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground border border-dashed border-border rounded-lg">
              <p className="text-sm">
                No subjects assigned yet. Add the subjects this teacher teaches.
              </p>
              <Button size="sm" className="mt-3" onClick={addSubject}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Subject
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {subjects.map((sub, i) => (
                <div
                  key={`subj-row-${
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
                    <Label className="text-xs">Class From</Label>
                    <Select
                      value={sub.classFrom}
                      onValueChange={(v) => updateSubject(i, "classFrom", v)}
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
                    <Label className="text-xs">Class To</Label>
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
            </div>
          )}

          {subjects.filter((s) => s.subject).length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-3 bg-muted/30 rounded-lg">
              <p className="w-full text-xs text-muted-foreground mb-1">
                Summary:
              </p>
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
            <Button onClick={handleSave} data-ocid="staff-save">
              {initial ? "Update Staff" : "Save Staff Member"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
