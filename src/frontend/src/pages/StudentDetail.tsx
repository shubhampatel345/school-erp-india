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
  CreditCard,
  FileText,
  Lock,
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
  ls,
} from "../utils/localStorage";

interface StudentDetailProps {
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

export default function StudentDetail({
  student,
  onClose,
  onUpdate,
}: StudentDetailProps) {
  const { currentUser, currentSession } = useApp();
  const isSuperAdmin = currentUser?.role === "superadmin";

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...student });
  const [dobParts, setDobParts] = useState<[string, string, string]>(
    parseDobToParts(student.dob),
  );
  const [showDiscontinue, setShowDiscontinue] = useState(false);
  const [leaveDate, setLeaveDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [printTemplate, setPrintTemplate] = useState<PrintTemplate | null>(
    null,
  );

  const mmRef = useRef<HTMLInputElement>(null);
  const yyyyRef = useRef<HTMLInputElement>(null);

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

  // Fees data
  const feeHeadings = ls.get<FeeHeading[]>("fee_headings", []);
  const feesPlan = ls.get<FeesPlan[]>("fees_plan", []);
  const receipts = ls
    .get<FeeReceipt[]>("fee_receipts", [])
    .filter((r) => r.studentId === student.id && !r.isDeleted);
  const discounts = ls
    .get<DiscountEntry[]>("discounts", [])
    .filter(
      (d) => d.studentId === student.id && d.sessionId === currentSession?.id,
    );

  // Transport auto-populate
  const transportRoutes = ls.get<TransportRoute[]>("transport_routes", []);
  const assignedRoute = transportRoutes.find((r) =>
    r.students.includes(student.id),
  );

  // Previous session dues
  const prevDues = ls.get<Record<string, Record<string, number>>>(
    "prev_dues",
    {},
  );
  const studentPrevDues = prevDues[student.id] ?? {};

  function handleFieldChange(field: keyof Student, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function saveEdits() {
    const dob = makeDob(dobParts[0], dobParts[1], dobParts[2]);
    const dobForPwd = `${dobParts[0]}${dobParts[1]}${dobParts[2]}`;
    const updated: Student = {
      ...form,
      dob,
      credentials: {
        username: form.admNo,
        password: dobForPwd,
      },
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
      remarks,
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
      remarks: undefined,
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

  function getDiscountForMonth(month: string) {
    return discounts
      .filter((d) => d.month === month)
      .reduce((sum, d) => sum + d.amount, 0);
  }

  function printAdmForm(template: PrintTemplate) {
    setPrintTemplate(template);
    setTimeout(() => window.print(), 300);
  }

  const tabClass = "text-xs";

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-start gap-4 p-5 border-b border-border bg-muted/30">
            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center overflow-hidden flex-shrink-0">
              {student.photo ? (
                <img
                  src={student.photo}
                  alt={student.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-primary">
                  {student.fullName.charAt(0).toUpperCase()}
                </span>
              )}
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
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
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
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(true)}
                >
                  Edit
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Tabs defaultValue="personal" className="p-4">
            <TabsList className="mb-4 flex-wrap h-auto gap-1">
              <TabsTrigger value="personal" className={tabClass}>
                Personal Info
              </TabsTrigger>
              <TabsTrigger value="fees" className={tabClass}>
                Fees Details
              </TabsTrigger>
              <TabsTrigger value="transport" className={tabClass}>
                Transport
              </TabsTrigger>
              <TabsTrigger value="discounts" className={tabClass}>
                Discounts
              </TabsTrigger>
              <TabsTrigger value="oldfees" className={tabClass}>
                Old Fees
              </TabsTrigger>
              {isSuperAdmin && (
                <TabsTrigger value="credentials" className={tabClass}>
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
                    <span>/</span>
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
                    <span>/</span>
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
                  label="Mother's Name"
                  value={editing ? form.motherName : student.motherName}
                  editing={editing}
                  onChange={(v) => handleFieldChange("motherName", v)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Mobile"
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

              {student.status === "discontinued" && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-1">
                  <p className="text-sm font-medium text-destructive flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Discontinued
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Leaving Date: {student.leavingDate}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Reason: {student.leavingReason}
                  </p>
                  {student.remarks && (
                    <p className="text-xs text-muted-foreground">
                      Remarks: {student.remarks}
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
                    </tr>
                  </thead>
                  <tbody>
                    {feeHeadings.map((h) => {
                      const plan = getApplicablePlan(h.id);
                      const paidMonths = getPaidMonthsForHeading(h.id);
                      return (
                        <tr key={h.id} className="border-t border-border">
                          <td className="p-2 font-medium text-foreground text-xs">
                            {h.name}
                          </td>
                          {MONTHS.map((month) => {
                            const applicable = h.months.includes(month);
                            const paid = paidMonths.includes(month);
                            const amt = plan?.amount ?? h.amount;
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
                                  <span className="text-green-600 font-medium">
                                    ✓
                                  </span>
                                ) : (
                                  <span className="text-destructive">
                                    {formatCurrency(amt)}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    {feeHeadings.length === 0 && (
                      <tr>
                        <td
                          colSpan={13}
                          className="p-4 text-center text-muted-foreground text-sm"
                        >
                          No fee headings configured
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* Transport Tab */}
            <TabsContent value="transport">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Bus className="w-4 h-4" />
                  {assignedRoute
                    ? "Auto-populated from Transport module"
                    : "Student not assigned to any route"}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <InfoCard
                    label="Bus No."
                    value={
                      assignedRoute?.busNo ?? student.transportBusNo ?? "—"
                    }
                  />
                  <InfoCard
                    label="Route"
                    value={
                      assignedRoute?.routeName ?? student.transportRoute ?? "—"
                    }
                  />
                  <InfoCard
                    label="Pickup Point"
                    value={
                      student.transportPickup ||
                      (assignedRoute?.pickupPoints[0] ?? "—")
                    }
                  />
                </div>
                {assignedRoute && (
                  <div className="bg-muted/30 rounded-lg p-3 text-sm">
                    <p className="font-medium text-foreground mb-1">
                      Driver: {assignedRoute.driverName}
                    </p>
                    <p className="text-muted-foreground">
                      Mobile: {assignedRoute.driverMobile}
                    </p>
                    <p className="text-muted-foreground mt-1">
                      Pickup Points: {assignedRoute.pickupPoints.join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Discounts Tab */}
            <TabsContent value="discounts">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">
                  Per-month discounts applied to this student
                </p>
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
                          Reason
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {MONTHS.map((month) => {
                        const discount = getDiscountForMonth(month);
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
                            <td className="p-2 text-xs text-muted-foreground">
                              {discounts
                                .filter((d) => d.month === month)
                                .map((d) => d.reason)
                                .join(", ") || "—"}
                            </td>
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
                          {formatCurrency(
                            discounts.reduce((sum, d) => sum + d.amount, 0),
                          )}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
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
                            {formatCurrency(
                              Object.values(studentPrevDues).reduce(
                                (s, a) => s + (a as number),
                                0,
                              ),
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Credentials Tab (Super Admin only) */}
            {isSuperAdmin && (
              <TabsContent value="credentials">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Lock className="w-4 h-4" />
                    Auto-generated login credentials for this student
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoCard
                      label="Username (Adm. No.)"
                      value={student.credentials.username}
                    />
                    <InfoCard
                      label="Password (DOB)"
                      value={student.credentials.password}
                    />
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
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
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
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <p className="text-sm text-foreground font-medium min-h-[2rem] leading-8 px-1">
          {value || "—"}
        </p>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-lg p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
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
          <div className="border-2 border-black w-28 h-32 flex items-center justify-center text-xs text-gray-400">
            Photo
          </div>
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
