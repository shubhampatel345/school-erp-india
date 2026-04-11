import { Badge } from "@/components/ui/badge";
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
import {
  AlertCircle,
  Bus,
  Camera,
  Check,
  Copy,
  CreditCard,
  FileText,
  Lock,
  Plus,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import type {
  DiscountEntry,
  FeeHeading,
  FeeReceipt,
  FeesPlan,
  Student,
  TransportRoute,
} from "../types";
import {
  CLASSES,
  MONTHS,
  MONTH_SHORT,
  SECTIONS,
  formatCurrency,
  generateId,
  ls,
} from "../utils/localStorage";

interface Props {
  student: Student;
  onClose: () => void;
  onUpdate: (s: Student) => void;
}

function parseDobToParts(dob: string): [string, string, string] {
  const p = dob.split("/");
  return [p[0] ?? "", p[1] ?? "", p[2] ?? ""];
}
function makeDob(dd: string, mm: string, yyyy: string) {
  return `${dd}/${mm}/${yyyy}`;
}

type PrintTemplate = "basic" | "detailed" | "official";

export default function StudentDetailModal({
  student,
  onClose,
  onUpdate,
}: Props) {
  const { currentUser, currentSession } = useApp();
  const isSuperAdmin = currentUser?.role === "superadmin";
  const isAdmin = currentUser?.role === "admin" || isSuperAdmin;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...student });
  const [dobParts, setDobParts] = useState<[string, string, string]>(
    parseDobToParts(student.dob),
  );
  const [showDiscontinue, setShowDiscontinue] = useState(false);
  const [leaveDate, setLeaveDate] = useState(student.leavingDate ?? "");
  const [leaveReason, setLeaveReason] = useState(student.leavingReason ?? "");
  const [leaveRemarks, setLeaveRemarks] = useState(
    student.leavingRemarks ?? "",
  );
  const [printTemplate, setPrintTemplate] = useState<PrintTemplate | null>(
    null,
  );
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [newDiscMonth, setNewDiscMonth] = useState(MONTHS[0]);
  const [newDiscAmt, setNewDiscAmt] = useState("");
  const [newDiscReason, setNewDiscReason] = useState("");
  // Discount scope: which fee-type IDs (headingIds + 'transport') this discount applies to
  const [newDiscScope, setNewDiscScope] = useState<string[]>([]);

  // Transport months wizard state
  const [transportMonths, setTransportMonths] = useState<string[]>(() => {
    const stored = ls.get<Record<string, string[]>>(
      "student_transport_months",
      {},
    );
    // Default: all months checked
    return stored[student.id] ?? MONTHS;
  });
  const [transportMonthsSaved, setTransportMonthsSaved] = useState(false);

  const mmRef = useRef<HTMLInputElement>(null);
  const yyyyRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const schoolProfile = ls.get("school_profile", {
    name: "SHUBH SCHOOL ERP",
    address: "",
    phone: "",
    principalName: "",
    affiliationNo: "",
  }) as {
    name: string;
    address: string;
    phone: string;
    principalName: string;
    affiliationNo: string;
  };

  const feeHeadings = ls.get<FeeHeading[]>("fee_headings", []);
  const feesPlan = ls.get<FeesPlan[]>("fees_plan", []);
  const receipts = ls
    .get<FeeReceipt[]>("fee_receipts", [])
    .filter((r) => r.studentId === student.id && !r.isDeleted);
  const [discounts, setDiscounts] = useState<DiscountEntry[]>(() =>
    ls
      .get<DiscountEntry[]>("discounts", [])
      .filter(
        (d) => d.studentId === student.id && d.sessionId === currentSession?.id,
      ),
  );

  // Use v2 transport data (from Transport module)
  const studentTransportV2 = ls
    .get<
      Array<{
        studentId: string;
        busNo: string;
        routeName: string;
        routeId: string;
        pickupPointName: string;
      }>
    >("student_transport_v2", [])
    .find((t) => t.studentId === student.id);

  const transportRoutesV2 = ls.get<
    Array<{
      id: string;
      busNo: string;
      routeName: string;
      driverName: string;
      driverMobile: string;
      pickupPoints: Array<{
        id: string;
        stopName: string;
        order: number;
        fare?: number;
      }>;
    }>
  >("transport_routes_v2", []);
  const assignedRouteV2 = studentTransportV2
    ? transportRoutesV2.find((r) => r.id === studentTransportV2.routeId)
    : null;

  // Legacy fallback
  const transportRoutes = ls.get<TransportRoute[]>("transport_routes", []);
  const assignedRoute =
    assignedRouteV2 ??
    transportRoutes.find((r) => r.students?.includes(student.id));

  const prevDues = ls.get<Record<string, Record<string, number>>>(
    "prev_dues",
    {},
  );
  const studentPrevDues = prevDues[student.id] ?? {};

  function handleFieldChange(field: keyof Student, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setForm((prev) => ({ ...prev, photo: dataUrl }));
    };
    reader.readAsDataURL(file);
  }

  function saveEdits() {
    const dob = makeDob(dobParts[0], dobParts[1], dobParts[2]);
    const dobForPwd = `${dobParts[0]}${dobParts[1]}${dobParts[2]}`;
    const updated: Student = {
      ...form,
      dob,
      credentials: { username: form.admNo, password: dobForPwd },
    };
    const all = ls.get<Student[]>("students", []);
    const idx = all.findIndex((s) => s.id === updated.id);
    if (idx >= 0) all[idx] = updated;
    ls.set("students", all);
    onUpdate(updated);
    setEditing(false);
  }

  function handleDiscontinue() {
    const updated: Student = {
      ...student,
      status: "discontinued",
      leavingDate: leaveDate,
      leavingReason: leaveReason,
      leavingRemarks: leaveRemarks,
    };
    const all = ls.get<Student[]>("students", []);
    const idx = all.findIndex((s) => s.id === updated.id);
    if (idx >= 0) all[idx] = updated;
    ls.set("students", all);
    onUpdate(updated);
    setShowDiscontinue(false);
  }

  function handleReinstate() {
    const updated: Student = {
      ...student,
      status: "active",
      leavingDate: undefined,
      leavingReason: undefined,
      leavingRemarks: undefined,
    };
    const all = ls.get<Student[]>("students", []);
    const idx = all.findIndex((s) => s.id === updated.id);
    if (idx >= 0) all[idx] = updated;
    ls.set("students", all);
    onUpdate(updated);
  }

  function getPaidMonthsForHeading(headingId: string): string[] {
    const paid: string[] = [];
    for (const r of receipts) {
      for (const item of r.items) {
        if (item.headingId === headingId) paid.push(item.month);
      }
    }
    return paid;
  }

  function getApplicablePlan(headingId: string) {
    return (
      feesPlan.find(
        (p) =>
          p.headingId === headingId &&
          p.classId === student.class &&
          p.sectionId === student.section,
      ) ??
      feesPlan.find(
        (p) => p.headingId === headingId && p.classId === student.class,
      )
    );
  }

  function saveTransportMonths(months: string[]) {
    const stored = ls.get<Record<string, string[]>>(
      "student_transport_months",
      {},
    );
    stored[student.id] = months;
    ls.set("student_transport_months", stored);
    setTransportMonthsSaved(true);
    setTimeout(() => setTransportMonthsSaved(false), 2000);
  }

  function toggleTransportMonth(month: string) {
    setTransportMonths((prev) => {
      const next = prev.includes(month)
        ? prev.filter((m) => m !== month)
        : [...prev, month];
      return next;
    });
  }

  // Initialize discount scope to all fee headings applicable to student's class + transport
  function buildDefaultScope(): string[] {
    const applicableHeadings = feeHeadings.filter(
      (h) =>
        !h.applicableClasses ||
        h.applicableClasses.length === 0 ||
        h.applicableClasses.includes(student.class),
    );
    return [...applicableHeadings.map((h) => h.id), "transport"];
  }

  function addDiscount() {
    const amt = Number.parseFloat(newDiscAmt);
    if (!newDiscMonth || Number.isNaN(amt) || amt <= 0) return;
    const scope = newDiscScope.length > 0 ? newDiscScope : buildDefaultScope();
    const entry: DiscountEntry = {
      id: generateId(),
      studentId: student.id,
      month: newDiscMonth,
      amount: amt,
      reason: newDiscReason,
      sessionId: currentSession?.id ?? "sess_2025",
      applicableTo: scope,
    };
    const all = ls.get<DiscountEntry[]>("discounts", []);
    all.push(entry);
    ls.set("discounts", all);
    setDiscounts((prev) => [...prev, entry]);
    setNewDiscAmt("");
    setNewDiscReason("");
  }

  function removeDiscount(id: string) {
    const all = ls
      .get<DiscountEntry[]>("discounts", [])
      .filter((d) => d.id !== id);
    ls.set("discounts", all);
    setDiscounts((prev) => prev.filter((d) => d.id !== id));
  }

  function copyToClipboard(text: string, type: "user" | "pass") {
    navigator.clipboard.writeText(text).catch(() => {});
    if (type === "user") {
      setCopiedUser(true);
      setTimeout(() => setCopiedUser(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  }

  function printAdmForm(template: PrintTemplate) {
    setPrintTemplate(template);
    setTimeout(() => window.print(), 300);
  }

  const totalFees = feeHeadings.reduce((sum, h) => {
    const plan = getApplicablePlan(h.id);
    const amt = plan?.amount ?? h.amount;
    const monthCount = MONTHS.filter((m) => h.months.includes(m)).length;
    return sum + amt * monthCount;
  }, 0);
  const totalDiscounts = discounts.reduce((sum, d) => sum + d.amount, 0);
  const totalOldBalance = Object.values(studentPrevDues).reduce(
    (s, a) => s + (a as number),
    0,
  );
  const totalPaid = receipts.reduce((sum, r) => sum + r.totalAmount, 0);
  const netPayable = totalFees - totalDiscounts + totalOldBalance - totalPaid;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-start gap-4 p-5 border-b border-border bg-muted/30">
            <div className="relative group flex-shrink-0">
              <button
                type="button"
                className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center overflow-hidden cursor-pointer"
                onClick={() => isAdmin && photoRef.current?.click()}
                aria-label="Upload student photo"
              >
                {form.photo ? (
                  <img
                    src={form.photo}
                    alt={form.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-primary">
                    {student.fullName.charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => photoRef.current?.click()}
                  className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Upload photo"
                >
                  <Camera className="w-3 h-3" />
                </button>
              )}
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold font-display text-foreground truncate">
                {student.fullName}
              </h2>
              <p className="text-sm text-muted-foreground">
                Adm. No: {student.admNo}
              </p>
              <p className="text-sm text-muted-foreground">
                Class {student.class} – {student.section} &nbsp;|&nbsp;{" "}
                {student.fatherName}
              </p>
              <div className="flex gap-2 mt-1 flex-wrap">
                <Badge
                  variant={
                    student.status === "active" ? "default" : "destructive"
                  }
                >
                  {student.status === "active" ? "Active" : "Discontinued"}
                </Badge>
                {student.category && (
                  <Badge variant="secondary">{student.category}</Badge>
                )}
                {assignedRoute && (
                  <Badge variant="outline" className="text-[10px]">
                    <Bus className="w-2.5 h-2.5 mr-1" /> Bus{" "}
                    {assignedRoute.busNo}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {editing ? (
                <>
                  <Button size="sm" onClick={saveEdits}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                </>
              ) : isAdmin ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(true)}
                >
                  Edit
                </Button>
              ) : null}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Net Payable Summary Bar */}
          <div className="flex items-center gap-4 px-5 py-2 bg-primary/5 border-b border-border text-xs flex-wrap">
            <span className="text-muted-foreground">
              Total Fees:{" "}
              <span className="font-semibold text-foreground">
                {formatCurrency(totalFees)}
              </span>
            </span>
            <span className="text-muted-foreground">
              Paid:{" "}
              <span className="font-semibold text-green-600">
                {formatCurrency(totalPaid)}
              </span>
            </span>
            <span className="text-muted-foreground">
              Discount:{" "}
              <span className="font-semibold text-blue-600">
                {formatCurrency(totalDiscounts)}
              </span>
            </span>
            {totalOldBalance > 0 && (
              <span className="text-muted-foreground">
                Old Balance:{" "}
                <span className="font-semibold text-destructive">
                  {formatCurrency(totalOldBalance)}
                </span>
              </span>
            )}
            <span className="ml-auto font-bold text-sm">
              Net Payable:{" "}
              <span
                className={
                  netPayable > 0 ? "text-destructive" : "text-green-600"
                }
              >
                {formatCurrency(Math.max(0, netPayable))}
              </span>
            </span>
          </div>

          <Tabs defaultValue="personal" className="p-4">
            <TabsList className="mb-4 flex-wrap h-auto gap-1">
              <TabsTrigger value="personal" className="text-xs">
                Personal Info
              </TabsTrigger>
              <TabsTrigger value="fees" className="text-xs">
                Fees Details
              </TabsTrigger>
              <TabsTrigger value="transport" className="text-xs">
                Transport
              </TabsTrigger>
              <TabsTrigger value="discounts" className="text-xs">
                Discounts
              </TabsTrigger>
              <TabsTrigger value="oldfees" className="text-xs">
                Old Fees
              </TabsTrigger>
              {isSuperAdmin && (
                <TabsTrigger value="credentials" className="text-xs">
                  Credentials
                </TabsTrigger>
              )}
            </TabsList>

            {/* Personal Info Tab */}
            <TabsContent value="personal" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Admission No."
                  value={editing ? form.admNo : student.admNo}
                  editing={editing}
                  onChange={(v) => handleFieldChange("admNo", v)}
                />
                <Field
                  label="Full Name"
                  value={editing ? form.fullName : student.fullName}
                  editing={editing}
                  onChange={(v) => handleFieldChange("fullName", v)}
                />
              </div>
              {editing ? (
                <div className="space-y-1">
                  <Label>Date of Birth</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      className="w-16 text-center"
                      placeholder="DD"
                      value={dobParts[0]}
                      maxLength={2}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                        setDobParts([v, dobParts[1], dobParts[2]]);
                        if (v.length === 2) mmRef.current?.focus();
                      }}
                    />
                    <span className="text-muted-foreground">/</span>
                    <Input
                      ref={mmRef}
                      className="w-16 text-center"
                      placeholder="MM"
                      value={dobParts[1]}
                      maxLength={2}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                        setDobParts([dobParts[0], v, dobParts[2]]);
                        if (v.length === 2) yyyyRef.current?.focus();
                      }}
                    />
                    <span className="text-muted-foreground">/</span>
                    <Input
                      ref={yyyyRef}
                      className="w-24 text-center"
                      placeholder="YYYY"
                      value={dobParts[2]}
                      maxLength={4}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setDobParts([dobParts[0], dobParts[1], v]);
                      }}
                    />
                  </div>
                </div>
              ) : (
                <Field
                  label="Date of Birth"
                  value={student.dob}
                  editing={false}
                  onChange={() => {}}
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                {editing ? (
                  <>
                    <div className="space-y-1">
                      <Label>Gender</Label>
                      <Select
                        value={form.gender}
                        onValueChange={(v) => handleFieldChange("gender", v)}
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
                      <Select
                        value={form.category}
                        onValueChange={(v) => handleFieldChange("category", v)}
                      >
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
                  </>
                ) : (
                  <>
                    <Field
                      label="Gender"
                      value={student.gender}
                      editing={false}
                      onChange={() => {}}
                    />
                    <Field
                      label="Category"
                      value={student.category}
                      editing={false}
                      onChange={() => {}}
                    />
                  </>
                )}
              </div>

              {editing ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Class</Label>
                    <Select
                      value={form.class}
                      onValueChange={(v) => handleFieldChange("class", v)}
                    >
                      <SelectTrigger>
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
                    <Label>Section</Label>
                    <Select
                      value={form.section}
                      onValueChange={(v) => handleFieldChange("section", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Class"
                    value={student.class}
                    editing={false}
                    onChange={() => {}}
                  />
                  <Field
                    label="Section"
                    value={student.section}
                    editing={false}
                    onChange={() => {}}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Father's Name"
                  value={editing ? form.fatherName : student.fatherName}
                  editing={editing}
                  onChange={(v) => handleFieldChange("fatherName", v)}
                />
                <Field
                  label="Father Mobile"
                  value={
                    editing
                      ? (form.fatherMobile ?? "")
                      : (student.fatherMobile ?? "")
                  }
                  editing={editing}
                  onChange={(v) => handleFieldChange("fatherMobile", v)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Mother's Name"
                  value={editing ? form.motherName : student.motherName}
                  editing={editing}
                  onChange={(v) => handleFieldChange("motherName", v)}
                />
                <Field
                  label="Mother Mobile"
                  value={
                    editing
                      ? (form.motherMobile ?? "")
                      : (student.motherMobile ?? "")
                  }
                  editing={editing}
                  onChange={(v) => handleFieldChange("motherMobile", v)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Primary Mobile"
                  value={editing ? form.mobile : student.mobile}
                  editing={editing}
                  onChange={(v) => handleFieldChange("mobile", v)}
                />
                <Field
                  label="Guardian Mobile"
                  value={editing ? form.guardianMobile : student.guardianMobile}
                  editing={editing}
                  onChange={(v) => handleFieldChange("guardianMobile", v)}
                />
              </div>
              <Field
                label="Address"
                value={editing ? form.address : student.address}
                editing={editing}
                onChange={(v) => handleFieldChange("address", v)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Aadhaar No."
                  value={
                    editing ? (form.aadhaarNo ?? "") : (student.aadhaarNo ?? "")
                  }
                  editing={editing}
                  onChange={(v) => handleFieldChange("aadhaarNo", v)}
                />
                <Field
                  label="S.R. No."
                  value={editing ? (form.srNo ?? "") : (student.srNo ?? "")}
                  editing={editing}
                  onChange={(v) => handleFieldChange("srNo", v)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Pen No."
                  value={editing ? (form.penNo ?? "") : (student.penNo ?? "")}
                  editing={editing}
                  onChange={(v) => handleFieldChange("penNo", v)}
                />
                <Field
                  label="APAAR No."
                  value={
                    editing ? (form.apaarNo ?? "") : (student.apaarNo ?? "")
                  }
                  editing={editing}
                  onChange={(v) => handleFieldChange("apaarNo", v)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Previous School"
                  value={
                    editing
                      ? (form.previousSchool ?? "")
                      : (student.previousSchool ?? "")
                  }
                  editing={editing}
                  onChange={(v) => handleFieldChange("previousSchool", v)}
                />
                <Field
                  label="Admission Date"
                  value={
                    editing
                      ? (form.admissionDate ?? "")
                      : (student.admissionDate ?? "")
                  }
                  editing={editing}
                  onChange={(v) => handleFieldChange("admissionDate", v)}
                />
              </div>

              {student.status === "discontinued" && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-1">
                  <p className="text-sm font-medium text-destructive flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Discontinued
                  </p>
                  {student.leavingDate && (
                    <p className="text-xs text-muted-foreground">
                      Leaving Date: {student.leavingDate}
                    </p>
                  )}
                  {student.leavingReason && (
                    <p className="text-xs text-muted-foreground">
                      Reason: {student.leavingReason}
                    </p>
                  )}
                  {student.leavingRemarks && (
                    <p className="text-xs text-muted-foreground">
                      Remarks: {student.leavingRemarks}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => printAdmForm("basic")}
                >
                  <FileText className="w-3 h-3 mr-1" /> Adm. Form (Basic)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => printAdmForm("detailed")}
                >
                  <FileText className="w-3 h-3 mr-1" /> Adm. Form (Detailed)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => printAdmForm("official")}
                >
                  <FileText className="w-3 h-3 mr-1" /> Adm. Form (Official)
                </Button>
                {student.status === "active" ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setShowDiscontinue(true)}
                  >
                    Discontinue
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={handleReinstate}>
                    <UserCheck className="w-3 h-3 mr-1" /> Reinstate
                  </Button>
                )}
              </div>
            </TabsContent>

            {/* Fees Details Tab */}
            <TabsContent value="fees">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">
                        Fee Heading
                      </th>
                      {MONTH_SHORT.map((m) => (
                        <th
                          key={m}
                          className="p-2 text-xs font-medium text-muted-foreground text-center"
                        >
                          {m}
                        </th>
                      ))}
                      <th className="p-2 text-xs font-medium text-muted-foreground text-right">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeHeadings.map((h) => {
                      const plan = getApplicablePlan(h.id);
                      const paidMonths = getPaidMonthsForHeading(h.id);
                      const amt = plan?.amount ?? h.amount;
                      const rowTotal =
                        MONTHS.filter((m) => h.months.includes(m)).length * amt;
                      return (
                        <tr key={h.id} className="border-t border-border">
                          <td className="p-2 font-medium text-foreground text-xs">
                            {h.name}
                          </td>
                          {MONTHS.map((month) => {
                            const applicable = h.months.includes(month);
                            const paid = paidMonths.includes(month);
                            if (!applicable)
                              return (
                                <td
                                  key={month}
                                  className="p-2 text-center text-muted-foreground text-xs"
                                >
                                  —
                                </td>
                              );
                            return (
                              <td
                                key={month}
                                className="p-2 text-center text-xs"
                              >
                                {paid ? (
                                  <span className="inline-flex items-center justify-center w-5 h-5 bg-green-100 rounded-full">
                                    <Check className="w-3 h-3 text-green-600" />
                                  </span>
                                ) : (
                                  <span className="text-destructive font-medium">
                                    {amt}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="p-2 text-right text-xs font-semibold">
                            {formatCurrency(rowTotal)}
                          </td>
                        </tr>
                      );
                    })}
                    {feeHeadings.length === 0 && (
                      <tr>
                        <td
                          colSpan={14}
                          className="p-4 text-center text-muted-foreground text-sm"
                        >
                          No fee headings configured
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/30">
                      <td
                        colSpan={13}
                        className="p-2 text-xs font-bold text-right"
                      >
                        Net Payable (after discount + old balance):
                      </td>
                      <td
                        className={`p-2 text-right text-xs font-bold ${netPayable > 0 ? "text-destructive" : "text-green-600"}`}
                      >
                        {formatCurrency(Math.max(0, netPayable))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </TabsContent>

            {/* Transport Tab */}
            <TabsContent value="transport">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Bus className="w-4 h-4" />
                  {studentTransportV2 || assignedRoute
                    ? "Auto-populated from Transport module"
                    : "Student not assigned to any route"}
                </div>
                {(() => {
                  // Resolve pickup point fare
                  const ppId = (
                    studentTransportV2 as { pickupPointId?: string } | undefined
                  )?.pickupPointId;
                  const assignedPP =
                    ppId && assignedRouteV2
                      ? assignedRouteV2.pickupPoints.find((p) => p.id === ppId)
                      : null;
                  const pickupFare = assignedPP?.fare ?? 0;
                  return (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        <InfoCard
                          label="Bus No."
                          value={
                            studentTransportV2?.busNo ??
                            (
                              assignedRoute as
                                | { busNo?: string }
                                | null
                                | undefined
                            )?.busNo ??
                            student.transportBusNo ??
                            "—"
                          }
                        />
                        <InfoCard
                          label="Route"
                          value={
                            studentTransportV2?.routeName ??
                            (
                              assignedRoute as
                                | { routeName?: string }
                                | null
                                | undefined
                            )?.routeName ??
                            student.transportRoute ??
                            "—"
                          }
                        />
                        <InfoCard
                          label="Pickup Point"
                          value={
                            studentTransportV2?.pickupPointName ||
                            student.transportPickup ||
                            "—"
                          }
                          extra={
                            pickupFare > 0
                              ? `₹${pickupFare.toLocaleString("en-IN")}/month`
                              : undefined
                          }
                        />
                      </div>
                      {pickupFare > 0 && (
                        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                          <span className="text-lg">🚌</span>
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              Monthly Transport Fee
                            </p>
                            <p className="text-sm font-bold text-primary">
                              ₹{pickupFare.toLocaleString("en-IN")} / month
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* ── Transport Months Wizard ── */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted/40 px-3 py-2 border-b border-border flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground uppercase tracking-wide">
                      🗓️ Transport Fee Months
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {transportMonths.length} / {MONTHS.length} months selected
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-muted-foreground mb-3">
                      Select the months transport fees apply for this student.
                      Only selected months will appear in fee collection.
                    </p>
                    {/* Month checkboxes - 4 per row */}
                    <div className="grid grid-cols-4 gap-1.5 mb-3">
                      {MONTHS.map((month, idx) => {
                        const short = MONTH_SHORT[idx];
                        const checked = transportMonths.includes(month);
                        return (
                          <label
                            key={month}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border cursor-pointer transition-colors select-none ${
                              checked
                                ? "bg-primary/10 border-primary/40 text-primary"
                                : "bg-muted/20 border-border text-muted-foreground hover:bg-muted/40"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTransportMonth(month)}
                              className="w-3 h-3 accent-primary"
                              data-ocid={`transport-month-${short.toLowerCase()}`}
                            />
                            <span className="text-[11px] font-semibold">
                              {short}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {/* Select All / Clear */}
                    <div className="flex gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setTransportMonths(MONTHS)}
                        className="text-[10px] px-2 py-1 rounded border border-border hover:bg-muted/50 transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransportMonths([])}
                        className="text-[10px] px-2 py-1 rounded border border-border hover:bg-muted/50 transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                    {/* Fare summary */}
                    {(() => {
                      const ppId = (
                        studentTransportV2 as
                          | { pickupPointId?: string }
                          | undefined
                      )?.pickupPointId;
                      const assignedPP =
                        ppId && assignedRouteV2
                          ? assignedRouteV2.pickupPoints.find(
                              (p) => p.id === ppId,
                            )
                          : null;
                      const pickupFare = assignedPP?.fare ?? 0;
                      const total = pickupFare * transportMonths.length;
                      if (pickupFare <= 0) return null;
                      return (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800 flex items-center justify-between mb-3">
                          <span>
                            Monthly Fare:{" "}
                            <strong>
                              ₹{pickupFare.toLocaleString("en-IN")}
                            </strong>
                          </span>
                          <span className="font-bold">
                            {transportMonths.length} months × ₹
                            {pickupFare.toLocaleString("en-IN")} ={" "}
                            <span className="text-blue-900">
                              ₹{total.toLocaleString("en-IN")}
                            </span>
                          </span>
                        </div>
                      );
                    })()}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => saveTransportMonths(transportMonths)}
                        className="w-full py-1.5 rounded text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                        data-ocid="save-transport-months"
                      >
                        {transportMonthsSaved
                          ? "✓ Saved!"
                          : "💾 Save Transport Months"}
                      </button>
                    )}
                  </div>
                </div>

                {assignedRouteV2 && (
                  <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
                    <p className="font-medium text-foreground">
                      Driver: {assignedRouteV2.driverName || "—"}
                    </p>
                    {assignedRouteV2.driverMobile && (
                      <p className="text-muted-foreground">
                        Mobile: {assignedRouteV2.driverMobile}
                      </p>
                    )}
                    <p className="text-muted-foreground text-xs">
                      All Stops:{" "}
                      {assignedRouteV2.pickupPoints
                        .sort((a, b) => a.order - b.order)
                        .map(
                          (p) =>
                            `${p.stopName}${p.fare ? ` (₹${p.fare})` : ""}`,
                        )
                        .join(" → ")}
                    </p>
                  </div>
                )}
                {!studentTransportV2 && !assignedRoute && (
                  <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                    To assign transport, go to <strong>Transport</strong> module
                    → Student Assignments tab, search for this student, select a
                    route and pickup point, then save.
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Discounts Tab */}
            <TabsContent value="discounts">
              <div className="space-y-4">
                {isAdmin && (
                  <div className="bg-muted/30 rounded-lg p-3 border border-border space-y-3">
                    <p className="text-xs font-bold text-foreground">
                      Add Discount Entry
                    </p>

                    {/* Month + Amount + Reason row */}
                    <div className="flex gap-2 flex-wrap items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">Month</Label>
                        <Select
                          value={newDiscMonth}
                          onValueChange={setNewDiscMonth}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS.map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Amount (₹)</Label>
                        <input
                          className="w-24 h-8 px-2 text-xs border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                          value={newDiscAmt}
                          onChange={(e) => setNewDiscAmt(e.target.value)}
                          placeholder="0"
                          type="number"
                          min="0"
                        />
                      </div>
                      <div className="space-y-1 flex-1 min-w-[120px]">
                        <Label className="text-xs">Reason</Label>
                        <input
                          className="h-8 w-full px-2 text-xs border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                          value={newDiscReason}
                          onChange={(e) => setNewDiscReason(e.target.value)}
                          placeholder="e.g. Scholarship"
                        />
                      </div>
                      <Button size="sm" onClick={addDiscount} className="h-8">
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </Button>
                    </div>

                    {/* Discount Scope: which fee types */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-foreground">
                        Discount Scope{" "}
                        <span className="font-normal text-muted-foreground">
                          (select which fee types get this discount)
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {/* One checkbox per applicable fee heading */}
                        {feeHeadings
                          .filter(
                            (h) =>
                              !h.applicableClasses ||
                              h.applicableClasses.length === 0 ||
                              h.applicableClasses.includes(student.class),
                          )
                          .map((h) => {
                            const checked =
                              newDiscScope.length === 0
                                ? true
                                : newDiscScope.includes(h.id);
                            return (
                              <label
                                key={h.id}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded border cursor-pointer text-[11px] transition-colors ${
                                  checked
                                    ? "bg-primary/10 border-primary/40 text-primary"
                                    : "bg-muted/20 border-border text-muted-foreground"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="w-3 h-3 accent-primary"
                                  checked={checked}
                                  onChange={() => {
                                    setNewDiscScope((prev) => {
                                      // First interaction: expand from "all" to explicit list
                                      const defaultScope = [
                                        ...feeHeadings
                                          .filter(
                                            (fh) =>
                                              !fh.applicableClasses ||
                                              fh.applicableClasses.length ===
                                                0 ||
                                              fh.applicableClasses.includes(
                                                student.class,
                                              ),
                                          )
                                          .map((fh) => fh.id),
                                        "transport",
                                      ];
                                      const base =
                                        prev.length === 0 ? defaultScope : prev;
                                      return base.includes(h.id)
                                        ? base.filter((x) => x !== h.id)
                                        : [...base, h.id];
                                    });
                                  }}
                                  data-ocid={`disc-scope-${h.id}`}
                                />
                                <span className="font-medium">{h.name}</span>
                              </label>
                            );
                          })}
                        {/* Transport checkbox */}
                        {(() => {
                          const checked =
                            newDiscScope.length === 0
                              ? true
                              : newDiscScope.includes("transport");
                          return (
                            <label
                              className={`flex items-center gap-1.5 px-2 py-1 rounded border cursor-pointer text-[11px] transition-colors ${
                                checked
                                  ? "bg-blue-50 border-blue-300 text-blue-700"
                                  : "bg-muted/20 border-border text-muted-foreground"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="w-3 h-3 accent-blue-600"
                                checked={checked}
                                onChange={() => {
                                  setNewDiscScope((prev) => {
                                    const defaultScope = [
                                      ...feeHeadings
                                        .filter(
                                          (fh) =>
                                            !fh.applicableClasses ||
                                            fh.applicableClasses.length === 0 ||
                                            fh.applicableClasses.includes(
                                              student.class,
                                            ),
                                        )
                                        .map((fh) => fh.id),
                                      "transport",
                                    ];
                                    const base =
                                      prev.length === 0 ? defaultScope : prev;
                                    return base.includes("transport")
                                      ? base.filter((x) => x !== "transport")
                                      : [...base, "transport"];
                                  });
                                }}
                                data-ocid="disc-scope-transport"
                              />
                              <span className="font-medium">
                                🚌 Transport Fees
                              </span>
                            </label>
                          );
                        })()}
                      </div>
                      {newDiscScope.length > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          Discount will apply only to:{" "}
                          <span className="text-foreground font-medium">
                            {newDiscScope
                              .map((id) =>
                                id === "transport"
                                  ? "Transport"
                                  : (feeHeadings.find((h) => h.id === id)
                                      ?.name ?? id),
                              )
                              .join(", ")}
                          </span>
                        </p>
                      )}
                      {newDiscScope.length === 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          No scope selected — discount will apply to all fee
                          types.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Discount entries table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left p-2 text-xs font-medium text-muted-foreground">
                          Month
                        </th>
                        <th className="text-right p-2 text-xs font-medium text-muted-foreground">
                          Discount
                        </th>
                        <th className="text-left p-2 text-xs font-medium text-muted-foreground">
                          Applies To
                        </th>
                        <th className="text-left p-2 text-xs font-medium text-muted-foreground">
                          Reason
                        </th>
                        {isAdmin && <th className="p-2 w-8" />}
                      </tr>
                    </thead>
                    <tbody>
                      {MONTHS.map((month) => {
                        const monthDiscounts = discounts.filter(
                          (d) => d.month === month,
                        );
                        const discount = monthDiscounts.reduce(
                          (s, d) => s + d.amount,
                          0,
                        );
                        return (
                          <tr key={month} className="border-t border-border">
                            <td className="p-2 text-xs">{month}</td>
                            <td className="p-2 text-right text-xs font-medium">
                              {discount > 0 ? (
                                <span className="text-green-600">
                                  {formatCurrency(discount)}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="p-2 text-xs text-muted-foreground max-w-[120px]">
                              {monthDiscounts.length > 0
                                ? monthDiscounts
                                    .map((d) => {
                                      if (
                                        !d.applicableTo ||
                                        d.applicableTo.length === 0
                                      )
                                        return "All fees";
                                      return d.applicableTo
                                        .map((id) =>
                                          id === "transport"
                                            ? "Transport"
                                            : (feeHeadings.find(
                                                (h) => h.id === id,
                                              )?.name ?? id),
                                        )
                                        .join(", ");
                                    })
                                    .join(" | ")
                                : "—"}
                            </td>
                            <td className="p-2 text-xs text-muted-foreground">
                              {monthDiscounts
                                .map((d) => d.reason)
                                .filter(Boolean)
                                .join(", ") || "—"}
                            </td>
                            {isAdmin && (
                              <td className="p-2">
                                {monthDiscounts.map((d) => (
                                  <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => removeDiscount(d.id)}
                                    className="text-destructive hover:opacity-70 ml-1"
                                    aria-label="Remove discount"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                ))}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/30">
                        <td className="p-2 text-xs font-bold">
                          Total Discount
                        </td>
                        <td className="p-2 text-right text-xs font-bold text-green-600">
                          {formatCurrency(totalDiscounts)}
                        </td>
                        <td colSpan={isAdmin ? 3 : 2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Net Payable Breakdown */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs font-bold text-foreground mb-2">
                    Net Payable Breakdown
                  </p>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total Fees</span>
                    <span className="font-semibold">
                      {formatCurrency(totalFees)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      Total Discounts
                    </span>
                    <span className="font-semibold text-green-600">
                      − {formatCurrency(totalDiscounts)}
                    </span>
                  </div>
                  {totalOldBalance > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Old Balance</span>
                      <span className="font-semibold text-destructive">
                        + {formatCurrency(totalOldBalance)}
                      </span>
                    </div>
                  )}
                  {totalPaid > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Paid So Far</span>
                      <span className="font-semibold text-green-600">
                        − {formatCurrency(totalPaid)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold border-t border-primary/20 pt-1.5">
                    <span>Net Payable</span>
                    <span
                      className={
                        netPayable > 0 ? "text-destructive" : "text-green-600"
                      }
                    >
                      {formatCurrency(Math.max(0, netPayable))}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Old Fees Tab */}
            <TabsContent value="oldfees">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">
                  Unpaid dues from previous session carried forward as old
                  balance
                </p>
                {Object.keys(studentPrevDues).length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">
                    No old balance carried forward
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left p-2 text-xs font-medium text-muted-foreground">
                            Month
                          </th>
                          <th className="text-right p-2 text-xs font-medium text-muted-foreground">
                            Due Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(studentPrevDues).map(
                          ([month, amount]) => (
                            <tr key={month} className="border-t border-border">
                              <td className="p-2 text-xs">{month}</td>
                              <td className="p-2 text-right text-xs font-medium text-destructive">
                                {formatCurrency(amount as number)}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border bg-muted/30">
                          <td className="p-2 text-xs font-bold">
                            Total Old Balance
                          </td>
                          <td className="p-2 text-right text-xs font-bold text-destructive">
                            {formatCurrency(totalOldBalance)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Credentials Tab */}
            {isSuperAdmin && (
              <TabsContent value="credentials">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Lock className="w-4 h-4" />
                    Auto-generated login credentials for this student
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">
                        Username (Adm. No.)
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground flex-1 font-mono">
                          {student.credentials.username}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(
                              student.credentials.username,
                              "user",
                            )
                          }
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copiedUser ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">
                        Password (DOB ddmmyyyy)
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground flex-1 font-mono">
                          {student.credentials.password}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(
                              student.credentials.password,
                              "pass",
                            )
                          }
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copiedPass ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs text-amber-800 font-medium">
                      <CreditCard className="w-3 h-3 inline mr-1" />
                      Username = Admission Number &nbsp;|&nbsp; Password = Date
                      of Birth as ddmmyyyy
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      e.g. DOB 15/08/2010 → Password: 15082010
                    </p>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Discontinue Modal */}
      {showDiscontinue && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <h3 className="text-lg font-semibold font-display text-foreground">
              Discontinue Student
            </h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Leaving Date</Label>
                <Input
                  type="date"
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Reason</Label>
                <Input
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Reason for leaving"
                />
              </div>
              <div className="space-y-1">
                <Label>Remarks</Label>
                <Input
                  value={leaveRemarks}
                  onChange={(e) => setLeaveRemarks(e.target.value)}
                  placeholder="Additional remarks"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDiscontinue(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDiscontinue}>
                Confirm Discontinue
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Print Template */}
      {printTemplate && (
        <div
          id="print-adm-form"
          className="hidden print:block fixed inset-0 bg-white z-[100] p-8"
        >
          {printTemplate === "basic" && (
            <BasicAdmForm student={student} schoolProfile={schoolProfile} />
          )}
          {printTemplate === "detailed" && (
            <DetailedAdmForm student={student} schoolProfile={schoolProfile} />
          )}
          {printTemplate === "official" && (
            <OfficialAdmForm student={student} schoolProfile={schoolProfile} />
          )}
          <style>
            {
              "@media print { body > *:not(#print-adm-form) { display: none !important; } #print-adm-form { display: block !important; } }"
            }
          </style>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {editing ? (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-sm"
        />
      ) : (
        <p className="text-sm text-foreground font-medium min-h-[2rem] leading-8 px-1">
          {value || "—"}
        </p>
      )}
    </div>
  );
}

function InfoCard({
  label,
  value,
  extra,
}: { label: string; value: string; extra?: string }) {
  return (
    <div className="bg-muted/40 rounded-lg p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
      {extra && (
        <p className="text-xs font-semibold text-primary mt-0.5">{extra}</p>
      )}
    </div>
  );
}

type ProfileShape = {
  name: string;
  address: string;
  phone: string;
  principalName: string;
  affiliationNo: string;
};

function BasicAdmForm({
  student,
  schoolProfile,
}: { student: Student; schoolProfile: ProfileShape }) {
  return (
    <div className="font-sans text-black">
      <div className="text-center mb-4">
        <h1 className="text-xl font-bold">{schoolProfile.name}</h1>
        <p className="text-sm">{schoolProfile.address}</p>
        <h2 className="text-base font-semibold mt-2 border-b border-black pb-1">
          ADMISSION FORM
        </h2>
      </div>
      <table className="w-full text-sm border-collapse">
        <tbody>
          {[
            ["Admission No.", student.admNo],
            ["Student Name", student.fullName],
            ["Class", `${student.class} – ${student.section}`],
            ["Father's Name", student.fatherName],
            ["Date of Birth", student.dob],
            ["Address", student.address],
          ].map(([label, value]) => (
            <tr key={label} className="border border-black">
              <td className="p-2 font-medium w-1/3">{label}</td>
              <td className="p-2">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-8 flex justify-between">
        <div>Principal's Signature: _______________</div>
        <div>Date: _______________</div>
      </div>
    </div>
  );
}

function DetailedAdmForm({
  student,
  schoolProfile,
}: { student: Student; schoolProfile: ProfileShape }) {
  return (
    <div className="font-sans text-black">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">{schoolProfile.name}</h1>
        <p className="text-sm">
          {schoolProfile.address} &nbsp;|&nbsp; {schoolProfile.phone}
        </p>
        <h2 className="text-lg font-semibold mt-2 bg-gray-200 py-1">
          STUDENT ADMISSION FORM
        </h2>
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <table className="w-full text-sm border-collapse">
            <tbody>
              {[
                ["Admission No.", student.admNo],
                ["Full Name", student.fullName],
                ["Class", student.class],
                ["Section", student.section],
                ["Date of Birth", student.dob],
                ["Gender", student.gender],
                ["Category", student.category],
                ["Father's Name", student.fatherName],
                ["Mother's Name", student.motherName],
                ["Mobile", student.mobile],
                ["Guardian Mobile", student.guardianMobile],
                ["Address", student.address],
                ["Aadhaar No.", student.aadhaarNo ?? ""],
                ["Previous School", student.previousSchool ?? ""],
              ].map(([label, value]) => (
                <tr key={label} className="border border-black">
                  <td className="p-1.5 font-medium bg-gray-50 w-2/5 text-xs">
                    {label}
                  </td>
                  <td className="p-1.5 text-xs">{value || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="w-28 flex-shrink-0">
          {student.photo ? (
            <img
              src={student.photo}
              alt={student.fullName}
              className="w-28 h-32 object-cover border-2 border-black"
            />
          ) : (
            <div className="border-2 border-black w-28 h-32 flex items-center justify-center text-xs text-gray-400">
              Photo
            </div>
          )}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
        <div>Parent's Signature: _______________</div>
        <div>Principal's Signature: _______________</div>
        <div>Date: _______________</div>
      </div>
    </div>
  );
}

function OfficialAdmForm({
  student,
  schoolProfile,
}: { student: Student; schoolProfile: ProfileShape }) {
  return (
    <div className="font-serif text-black">
      <div className="border-4 border-double border-black p-4 mb-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold uppercase tracking-widest">
            {schoolProfile.name}
          </h1>
          {schoolProfile.affiliationNo && (
            <p className="text-xs mt-1">
              Affiliation No: {schoolProfile.affiliationNo}
            </p>
          )}
          <p className="text-sm">{schoolProfile.address}</p>
          <p className="text-sm">Tel: {schoolProfile.phone}</p>
        </div>
      </div>
      <h2 className="text-center text-lg font-bold uppercase mb-4 underline">
        APPLICATION FOR ADMISSION
      </h2>
      <p className="text-sm mb-4">
        This is to certify that <strong>{student.fullName}</strong>, S/D/O of{" "}
        <strong>{student.fatherName}</strong>, is hereby admitted to Class{" "}
        <strong>
          {student.class}-{student.section}
        </strong>{" "}
        under Admission No. <strong>{student.admNo}</strong> with effect from
        the current academic session.
      </p>
      <table className="w-full text-sm border-collapse mb-6">
        <tbody>
          {[
            ["Date of Birth", student.dob],
            ["Gender", student.gender],
            ["Category", student.category],
            ["Residential Address", student.address],
            ["Contact Number", `${student.mobile} / ${student.guardianMobile}`],
            ["Aadhaar No.", student.aadhaarNo ?? "—"],
            ["S.R. No.", student.srNo ?? "—"],
            ["Pen No.", student.penNo ?? "—"],
            ["APAAR No.", student.apaarNo ?? "—"],
          ].map(([label, value]) => (
            <tr key={label} className="border border-black">
              <td className="p-2 font-medium w-1/3 bg-gray-50">{label}</td>
              <td className="p-2">{value || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-8 flex justify-between">
        <div>
          <p className="text-sm">
            Principal: {schoolProfile.principalName || "_____________"}
          </p>
          <p className="text-sm mt-4">Signature & Seal</p>
        </div>
        <div className="text-right">
          <p className="text-sm">Date: _______________</p>
          <p className="text-sm mt-4">Parent/Guardian Signature</p>
        </div>
      </div>
    </div>
  );
}
