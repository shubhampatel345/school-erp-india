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
import { Camera, ChevronDown, ChevronUp, X } from "lucide-react";
import { useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import type { AppUser, Student } from "../types";
import { CLASSES, SECTIONS, generateId, ls } from "../utils/localStorage";

interface StudentFormProps {
  student?: Student;
  onSave: (student: Student) => void;
  onClose: () => void;
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

export default function StudentForm({
  student,
  onSave,
  onClose,
}: StudentFormProps) {
  const { currentSession, addNotification } = useApp();

  const students = ls.get<Student[]>("students", []);
  const nextAdmNo = () => {
    if (students.length === 0) return "1001";
    const nums = students
      .map((s) => Number.parseInt(s.admNo.replace(/\D/g, ""), 10))
      .filter((n) => !Number.isNaN(n));
    if (nums.length === 0) return "1001";
    return String(Math.max(...nums) + 1);
  };

  const [admNo, setAdmNo] = useState(student?.admNo ?? nextAdmNo());
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
  const [category, setCategory] = useState(student?.category ?? "General");
  const [aadhaarNo, setAadhaarNo] = useState(student?.aadhaarNo ?? "");
  const [srNo, setSrNo] = useState(student?.srNo ?? "");
  const [penNo, setPenNo] = useState(student?.penNo ?? "");
  const [apaarNo, setApaarNo] = useState(student?.apaarNo ?? "");
  const [previousSchool, setPreviousSchool] = useState(
    student?.previousSchool ?? "",
  );
  const [admissionDate, setAdmissionDate] = useState(
    student?.admissionDate ?? "",
  );
  const [photo, setPhoto] = useState(student?.photo ?? "");
  const [guardianOpen, setGuardianOpen] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  function handleSave() {
    if (!validate()) return;
    const dob = makeDobFromParts(dobParts[0], dobParts[1], dobParts[2]);
    const dobForPassword = `${dobParts[0]}${dobParts[1]}${dobParts[2]}`;
    const isNew = !student;

    const saved: Student = {
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

    const all = ls.get<Student[]>("students", []);
    if (student) {
      const idx = all.findIndex((s) => s.id === saved.id);
      if (idx >= 0) all[idx] = saved;
      else all.push(saved);
    } else {
      all.push(saved);
      addNotification(`New student added: ${saved.fullName}`, "success", "👤");
    }
    ls.set("students", all);

    // Auto-create AppUser credentials only when adding (not editing)
    if (isNew) {
      const appUsers = ls.get<AppUser[]>("app_users", []);
      const existingUser = appUsers.find((u) => u.username === saved.admNo);
      if (!existingUser) {
        const newUser: AppUser = {
          id: generateId(),
          username: saved.admNo,
          role: "student",
          name: saved.fullName,
          studentId: saved.id,
        };
        appUsers.push(newUser);
        ls.set("app_users", appUsers);

        // Store password in user_passwords map
        const passwords = ls.get<Record<string, string>>("user_passwords", {});
        passwords[saved.admNo] = dobForPassword;
        ls.set("user_passwords", passwords);
      }

      // Also create parent login if father mobile is provided (mobile/mobile)
      const parentMobile =
        fatherMobile.trim() || guardianMobile.trim() || mobile.trim();
      if (parentMobile) {
        const parentPassword = parentMobile;
        const existingParent = appUsers.find(
          (u) => u.username === parentMobile && u.role === "parent",
        );
        if (!existingParent) {
          const parentUser: AppUser = {
            id: generateId(),
            username: parentMobile,
            role: "parent",
            name: fatherName.trim() || fullName.trim(),
            mobile: parentMobile,
          };
          const updatedUsers = ls.get<AppUser[]>("app_users", []);
          updatedUsers.push(parentUser);
          ls.set("app_users", updatedUsers);
          const passwords2 = ls.get<Record<string, string>>(
            "user_passwords",
            {},
          );
          passwords2[parentMobile] = parentPassword;
          ls.set("user_passwords", passwords2);
        }
      }
    }

    onSave(saved);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-semibold font-display text-foreground">
            {student ? "Edit Student" : "Add New Student"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-5 space-y-4">
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
                data-ocid="student-admno"
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
                data-ocid="student-name"
              />
              {errors.fullName && (
                <p className="text-destructive text-xs">{errors.fullName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>
                Class <span className="text-destructive">*</span>
              </Label>
              <Select value={cls} onValueChange={setCls}>
                <SelectTrigger data-ocid="student-class">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
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
              <Select value={section} onValueChange={setSection}>
                <SelectTrigger data-ocid="student-section">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((s) => (
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

          {/* Date of Birth with auto-advance */}
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
                data-ocid="student-dob-dd"
              />
              <span className="text-muted-foreground">/</span>
              <Input
                ref={mmRef}
                className="w-16 text-center"
                placeholder="MM"
                value={dobParts[1]}
                maxLength={2}
                onChange={(e) => handleMonthChange(e.target.value)}
                data-ocid="student-dob-mm"
              />
              <span className="text-muted-foreground">/</span>
              <Input
                ref={yyyyRef}
                className="w-24 text-center"
                placeholder="YYYY"
                value={dobParts[2]}
                maxLength={4}
                onChange={(e) => handleYearChange(e.target.value)}
                data-ocid="student-dob-yyyy"
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

          <div className="space-y-1">
            <Label>Address</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full address"
            />
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
                    placeholder="Father's mobile (used for parent login)"
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
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} data-ocid="student-form-save">
            {student ? "Save Changes" : "Add Student"}
          </Button>
        </div>
      </div>
    </div>
  );
}
