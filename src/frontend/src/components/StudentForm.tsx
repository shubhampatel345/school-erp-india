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
  Camera,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import type {
  ClassSection,
  FeeHeading,
  Student,
  TransportRoute,
} from "../types";
import { DEFAULT_TRANSPORT_MONTHS, MONTHS } from "../types";
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

const CLASS_ORDER_LOCAL = [
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
    const ai = CLASS_ORDER_LOCAL.indexOf(
      an as (typeof CLASS_ORDER_LOCAL)[number],
    );
    const bi = CLASS_ORDER_LOCAL.indexOf(
      bn as (typeof CLASS_ORDER_LOCAL)[number],
    );
    return (
      (ai === -1 ? CLASS_ORDER_LOCAL.length : ai) -
      (bi === -1 ? CLASS_ORDER_LOCAL.length : bi)
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

  // ── Class data from context ──────────────────────────────────────────────
  const rawClasses = getData("classes") as ClassSection[];
  const availableClasses = useMemo(
    () =>
      sortClasses(
        (Array.isArray(rawClasses) ? rawClasses : []).filter(Boolean),
      ),
    [rawClasses],
  );

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

  // ── Basic Info State ─────────────────────────────────────────────────────
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
      new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
  );
  const [status, setStatus] = useState<Student["status"]>(
    student?.status ?? "active",
  );
  const [photo, setPhoto] = useState(student?.photo ?? "");
  const [guardianOpen, setGuardianOpen] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Transport Tab State ──────────────────────────────────────────────────
  const transportRoutes = getData("transport_routes") as TransportRoute[];
  const [transportRouteId, setTransportRouteId] = useState(
    student?.transportId ?? "",
  );
  const [transportPickup, setTransportPickup] = useState(
    student?.transportPickup ?? "",
  );
  const [transportMonths, setTransportMonths] = useState<string[]>(() => {
    if (student?.transportMonths && student.transportMonths.length > 0) {
      return student.transportMonths;
    }
    const stored = ls.get<Record<string, string[]>>(
      "student_transport_months",
      {},
    );
    if (student?.id && stored[student.id]) return stored[student.id];
    return DEFAULT_TRANSPORT_MONTHS;
  });

  const selectedRoute = transportRoutes.find((r) => r.id === transportRouteId);
  const pickupPoints = useMemo(() => {
    if (!selectedRoute) return [];
    return Array.isArray(selectedRoute.pickupPoints)
      ? selectedRoute.pickupPoints
      : [];
  }, [selectedRoute]);

  const selectedPP = pickupPoints.find(
    (pp) =>
      typeof pp === "object" &&
      pp !== null &&
      "stopName" in pp &&
      (pp as { stopName: string }).stopName === transportPickup,
  );
  const pickupFare =
    selectedPP && typeof selectedPP === "object" && "fare" in selectedPP
      ? (selectedPP as { fare: number }).fare
      : 0;

  function toggleTransportMonth(month: string) {
    setTransportMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month],
    );
  }

  // ── Discounts Tab State ──────────────────────────────────────────────────
  const feeHeadings = getData("fee_headings") as FeeHeading[];
  const applicableHeadings = useMemo(
    () =>
      feeHeadings.filter(
        (h) =>
          h.isActive !== false &&
          (!h.applicableClasses ||
            h.applicableClasses.length === 0 ||
            h.applicableClasses.includes(cls)),
      ),
    [feeHeadings, cls],
  );
  // discountAmounts: headingId -> fixed monthly ₹ amount
  const [discountAmounts, setDiscountAmounts] = useState<
    Record<string, string>
  >(() => {
    const existing = ls
      .get<Array<{ studentId: string; feeHeadingId?: string; amount: number }>>(
        "discounts",
        [],
      )
      .filter((d) => d.studentId === (student?.id ?? ""));
    const map: Record<string, string> = {};
    for (const d of existing) {
      if (d.feeHeadingId) map[d.feeHeadingId] = String(d.amount);
    }
    return map;
  });
  const [discountAll, setDiscountAll] = useState("");
  const [selectedDiscHeadings, setSelectedDiscHeadings] = useState<Set<string>>(
    () => new Set(applicableHeadings.map((h) => h.id)),
  );

  function handleSelectAllDiscount() {
    const allSelected = selectedDiscHeadings.size === applicableHeadings.length;
    if (allSelected) {
      setSelectedDiscHeadings(new Set());
    } else {
      setSelectedDiscHeadings(new Set(applicableHeadings.map((h) => h.id)));
    }
  }

  function applyDiscountAll() {
    if (!discountAll) return;
    const next: Record<string, string> = { ...discountAmounts };
    for (const id of selectedDiscHeadings) {
      next[id] = discountAll;
    }
    setDiscountAmounts(next);
    setDiscountAll("");
  }

  // ── Sections for selected class ──────────────────────────────────────────
  const sectionsForClass = useMemo(() => {
    const found = availableClasses.find(
      (c) =>
        (c.className ?? (c as unknown as { name?: string }).name ?? "") === cls,
    );
    return found?.sections ?? [];
  }, [availableClasses, cls]);

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

  // Stable callbacks — useCallback prevents new references on every render,
  // which would cause BasicInfoFields (React.memo) to re-render and lose focus.
  const handleDayChange = useCallback((val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 2);
    setDobParts((prev) => [clean, prev[1], prev[2]]);
    if (clean.length === 2) mmRef.current?.focus();
  }, []);

  const handleMonthChange = useCallback((val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 2);
    setDobParts((prev) => [prev[0], clean, prev[2]]);
    if (clean.length === 2) yyyyRef.current?.focus();
  }, []);

  const handleYearChange = useCallback((val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 4);
    setDobParts((prev) => [prev[0], prev[1], clean]);
  }, []);

  const handlePhotoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => setPhoto(ev.target?.result as string);
      reader.readAsDataURL(file);
    },
    [],
  );

  // Stable setters for BasicInfoFields — each wrapped once so reference is stable
  const stableSetAdmNo = useCallback((v: string) => setAdmNo(v), []);
  const stableSetFullName = useCallback((v: string) => setFullName(v), []);
  const stableSetFatherName = useCallback((v: string) => setFatherName(v), []);
  const stableSetFatherMobile = useCallback(
    (v: string) => setFatherMobile(v),
    [],
  );
  const stableSetMotherName = useCallback((v: string) => setMotherName(v), []);
  const stableSetMotherMobile = useCallback(
    (v: string) => setMotherMobile(v),
    [],
  );
  const stableSetMobile = useCallback((v: string) => setMobile(v), []);
  const stableSetGuardianMobile = useCallback(
    (v: string) => setGuardianMobile(v),
    [],
  );
  const stableSetAddress = useCallback((v: string) => setAddress(v), []);
  const stableSetVillage = useCallback((v: string) => setVillage(v), []);
  const stableSetAadhaarNo = useCallback((v: string) => setAadhaarNo(v), []);
  const stableSetSrNo = useCallback((v: string) => setSrNo(v), []);
  const stableSetPenNo = useCallback((v: string) => setPenNo(v), []);
  const stableSetApaarNo = useCallback((v: string) => setApaarNo(v), []);
  const stableSetPreviousSchool = useCallback(
    (v: string) => setPreviousSchool(v),
    [],
  );
  const stableSetAdmissionDate = useCallback(
    (v: string) => setAdmissionDate(v),
    [],
  );
  const stableSetCls = useCallback((v: string) => {
    setCls(v);
    setSection("");
  }, []);
  const stableSetSection = useCallback((v: string) => setSection(v), []);
  const stableSetGender = useCallback(
    (v: Student["gender"]) => setGender(v),
    [],
  );
  const stableSetCategory = useCallback((v: string) => setCategory(v), []);
  const stableSetStatus = useCallback(
    (v: Student["status"]) => setStatus(v),
    [],
  );
  const stableSetGuardianOpen = useCallback(
    (v: boolean) => setGuardianOpen(v),
    [],
  );
  const stableSetExtraOpen = useCallback((v: boolean) => setExtraOpen(v), []);

  function validate() {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = "Full name is required";
    if (!admNo.trim()) errs.admNo = "Admission No is required";
    if (!cls) errs.class = "Class is required";
    if (!section) errs.section = "Section is required";
    if (!fatherName.trim()) errs.fatherName = "Father name is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    const dob = makeDobFromParts(dobParts[0], dobParts[1], dobParts[2]);
    const dobForPassword = `${dobParts[0]}${dobParts[1]}${dobParts[2]}`;
    const isNew = !student;

    // Save transport months to localStorage
    if (student?.id) {
      const stored = ls.get<Record<string, string[]>>(
        "student_transport_months",
        {},
      );
      stored[student.id] = transportMonths;
      ls.set("student_transport_months", stored);
    }

    const studentData: Student = {
      id: student?.id ?? generateId(),
      admNo: admNo.trim(),
      fullName: fullName.trim() || "",
      fatherName: fatherName.trim() || "",
      fatherMobile: fatherMobile.trim() || "",
      motherName: motherName.trim() || "",
      motherMobile: motherMobile.trim() || "",
      dob: dob || "",
      gender,
      class: cls,
      section,
      mobile: mobile.trim() || "",
      guardianMobile: guardianMobile.trim() || "",
      address: address.trim() || "",
      village: village.trim() || "",
      photo,
      category: category || "General",
      aadhaarNo: aadhaarNo.trim() || "",
      srNo: srNo.trim() || "",
      penNo: penNo.trim() || "",
      apaarNo: apaarNo.trim() || "",
      previousSchool: previousSchool.trim() || "",
      admissionDate: admissionDate.trim() || "",
      transportId: transportRouteId || "",
      transportBusNo: selectedRoute?.busNo,
      transportRoute: selectedRoute?.routeName,
      transportPickup: transportPickup || "",
      transportMonths,
      credentials: { username: admNo.trim(), password: dobForPassword },
      status: status || "active",
      leavingDate: student?.leavingDate,
      leavingReason: student?.leavingReason,
      leavingRemarks: student?.leavingRemarks,
      remarks: student?.remarks,
      sessionId: student?.sessionId ?? currentSession?.id ?? "sess_2025",
    };

    setSaving(true);
    setSaveError(null);

    // Always send both `name` and `fullName` so MySQL stores the student name
    // correctly regardless of which column PHP uses as primary.
    const payload = {
      ...studentData,
      name: studentData.fullName || studentData.admNo,
      fullName: studentData.fullName || studentData.admNo,
    } as unknown as Record<string, unknown>;

    try {
      if (isNew) {
        await saveData("students", payload);
        // FIX: Call onSave FIRST to add the record to the in-memory students list,
        // THEN fire the notification. This guarantees the record is visible in the
        // grid before the notification appears — no "added but invisible" state.
        onSave(studentData);
        addNotification(
          `New student added: ${studentData.fullName}`,
          "success",
          "👤",
        );
      } else {
        await updateData("students", studentData.id, payload);
        onSave(studentData);
        addNotification(
          `Student updated: ${studentData.fullName}`,
          "success",
          "✅",
        );
      }
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

  const noClassesWarning = availableClasses.length === 0;
  const isEditing = !!student;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Sticky Header */}
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0 bg-card rounded-t-xl">
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

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {isEditing ? (
            <Tabs defaultValue="basic" className="flex flex-col h-full">
              <TabsList className="mx-5 mt-4 flex-shrink-0">
                <TabsTrigger value="basic" className="text-xs">
                  Basic Info
                </TabsTrigger>
                <TabsTrigger value="transport" className="text-xs">
                  Transport
                </TabsTrigger>
                <TabsTrigger value="discounts" className="text-xs">
                  Discounts
                </TabsTrigger>
              </TabsList>

              {/* Basic Info Tab */}
              <TabsContent value="basic" className="p-5 space-y-4 mt-0">
                <BasicInfoFields
                  admNo={admNo}
                  setAdmNo={stableSetAdmNo}
                  fullName={fullName}
                  setFullName={stableSetFullName}
                  cls={cls}
                  setCls={stableSetCls}
                  section={section}
                  setSection={stableSetSection}
                  dobParts={dobParts}
                  handleDayChange={handleDayChange}
                  handleMonthChange={handleMonthChange}
                  handleYearChange={handleYearChange}
                  mmRef={mmRef}
                  yyyyRef={yyyyRef}
                  gender={gender}
                  setGender={stableSetGender}
                  category={category}
                  setCategory={stableSetCategory}
                  fatherName={fatherName}
                  setFatherName={stableSetFatherName}
                  mobile={mobile}
                  setMobile={stableSetMobile}
                  admissionDate={admissionDate}
                  setAdmissionDate={stableSetAdmissionDate}
                  address={address}
                  setAddress={stableSetAddress}
                  village={village}
                  setVillage={stableSetVillage}
                  status={status}
                  setStatus={stableSetStatus}
                  photo={photo}
                  photoRef={photoRef}
                  handlePhotoUpload={handlePhotoUpload}
                  fatherMobile={fatherMobile}
                  setFatherMobile={stableSetFatherMobile}
                  motherName={motherName}
                  setMotherName={stableSetMotherName}
                  motherMobile={motherMobile}
                  setMotherMobile={stableSetMotherMobile}
                  guardianMobile={guardianMobile}
                  setGuardianMobile={stableSetGuardianMobile}
                  aadhaarNo={aadhaarNo}
                  setAadhaarNo={stableSetAadhaarNo}
                  srNo={srNo}
                  setSrNo={stableSetSrNo}
                  penNo={penNo}
                  setPenNo={stableSetPenNo}
                  apaarNo={apaarNo}
                  setApaarNo={stableSetApaarNo}
                  previousSchool={previousSchool}
                  setPreviousSchool={stableSetPreviousSchool}
                  availableClasses={availableClasses}
                  sectionsForClass={sectionsForClass}
                  noClassesWarning={noClassesWarning}
                  errors={errors}
                  isNew={!student}
                  guardianOpen={guardianOpen}
                  setGuardianOpen={stableSetGuardianOpen}
                  extraOpen={extraOpen}
                  setExtraOpen={stableSetExtraOpen}
                />
              </TabsContent>

              {/* Transport Tab */}
              <TabsContent value="transport" className="p-5 space-y-4 mt-0">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label>Route</Label>
                    <Select
                      value={transportRouteId}
                      onValueChange={(v) => {
                        setTransportRouteId(v);
                        setTransportPickup("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select route" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No route</SelectItem>
                        {transportRoutes.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.routeName} (Bus {r.busNo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {transportRouteId && (
                    <div className="space-y-1">
                      <Label>Pickup Point</Label>
                      <Select
                        value={transportPickup}
                        onValueChange={setTransportPickup}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select pickup point" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {pickupPoints.map((pp) => {
                            const name =
                              typeof pp === "object" &&
                              pp !== null &&
                              "stopName" in pp
                                ? (pp as { stopName: string }).stopName
                                : String(pp);
                            const fare =
                              typeof pp === "object" &&
                              pp !== null &&
                              "fare" in pp
                                ? (pp as { fare: number }).fare
                                : 0;
                            return (
                              <SelectItem key={name} value={name}>
                                {name} {fare > 0 ? `(₹${fare}/mo)` : ""}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {transportPickup && pickupFare > 0 && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">
                        Monthly Fare:{" "}
                        <span className="font-semibold text-foreground text-sm">
                          ₹{pickupFare}/month
                        </span>
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Applicable Months</Label>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => setTransportMonths([...MONTHS])}
                        >
                          All
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() =>
                            setTransportMonths(DEFAULT_TRANSPORT_MONTHS)
                          }
                        >
                          Default (11)
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => setTransportMonths([])}
                        >
                          None
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {MONTHS.map((month) => {
                        const selected = transportMonths.includes(month);
                        return (
                          <button
                            key={month}
                            type="button"
                            onClick={() => toggleTransportMonth(month)}
                            className={[
                              "px-2 py-1.5 rounded text-xs font-medium border transition-colors",
                              selected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-muted-foreground border-border hover:border-primary/50",
                            ].join(" ")}
                          >
                            {month}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {transportMonths.length} months selected. June is
                      deselected by default (school holiday month).
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Discounts Tab */}
              <TabsContent value="discounts" className="p-5 space-y-4 mt-0">
                <div className="space-y-4">
                  {applicableHeadings.length === 0 ? (
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-4">
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No fee headings configured. Add fee headings in Fees →
                        Fee Headings.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Bulk apply */}
                      <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-3">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">
                            Apply same discount to selected headings
                          </Label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="₹ amount"
                            value={discountAll}
                            onChange={(e) =>
                              setDiscountAll(
                                e.target.value
                                  .replace(/[^0-9.]/g, "")
                                  .replace(/(\..*)\./g, "$1"),
                              )
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={applyDiscountAll}
                          className="mt-5"
                        >
                          Apply
                        </Button>
                      </div>

                      {/* Select All */}
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-foreground">
                          Fee Headings ({applicableHeadings.length})
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={handleSelectAllDiscount}
                          data-ocid="student-form.discount-select-all"
                        >
                          {selectedDiscHeadings.size ===
                          applicableHeadings.length
                            ? "Deselect All"
                            : "Select All"}
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {applicableHeadings.map((h) => {
                          const isSelected = selectedDiscHeadings.has(h.id);
                          return (
                            <div
                              key={h.id}
                              className={[
                                "flex items-center gap-3 rounded-lg p-3 border transition-colors",
                                isSelected
                                  ? "border-primary/40 bg-primary/5"
                                  : "border-border bg-muted/20",
                              ].join(" ")}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const next = new Set(selectedDiscHeadings);
                                  if (e.target.checked) next.add(h.id);
                                  else next.delete(h.id);
                                  setSelectedDiscHeadings(next);
                                }}
                                className="w-4 h-4 rounded border-border"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                  {h.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Standard: ₹{h.amount}/month
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">
                                  ₹
                                </span>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  placeholder="0"
                                  value={discountAmounts[h.id] ?? ""}
                                  onChange={(e) =>
                                    setDiscountAmounts((prev) => ({
                                      ...prev,
                                      [h.id]: e.target.value
                                        .replace(/[^0-9.]/g, "")
                                        .replace(/(\..*)\./g, "$1"),
                                    }))
                                  }
                                  className="w-24 h-8 text-sm text-right"
                                />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  /mo
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Fixed monthly discount amount per fee heading. Discounts
                        are applied during fee collection.
                      </p>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="p-5 space-y-4">
              <BasicInfoFields
                admNo={admNo}
                setAdmNo={stableSetAdmNo}
                fullName={fullName}
                setFullName={stableSetFullName}
                cls={cls}
                setCls={stableSetCls}
                section={section}
                setSection={stableSetSection}
                dobParts={dobParts}
                handleDayChange={handleDayChange}
                handleMonthChange={handleMonthChange}
                handleYearChange={handleYearChange}
                mmRef={mmRef}
                yyyyRef={yyyyRef}
                gender={gender}
                setGender={stableSetGender}
                category={category}
                setCategory={stableSetCategory}
                fatherName={fatherName}
                setFatherName={stableSetFatherName}
                mobile={mobile}
                setMobile={stableSetMobile}
                admissionDate={admissionDate}
                setAdmissionDate={stableSetAdmissionDate}
                address={address}
                setAddress={stableSetAddress}
                village={village}
                setVillage={stableSetVillage}
                status={status}
                setStatus={stableSetStatus}
                photo={photo}
                photoRef={photoRef}
                handlePhotoUpload={handlePhotoUpload}
                fatherMobile={fatherMobile}
                setFatherMobile={stableSetFatherMobile}
                motherName={motherName}
                setMotherName={stableSetMotherName}
                motherMobile={motherMobile}
                setMotherMobile={stableSetMotherMobile}
                guardianMobile={guardianMobile}
                setGuardianMobile={stableSetGuardianMobile}
                aadhaarNo={aadhaarNo}
                setAadhaarNo={stableSetAadhaarNo}
                srNo={srNo}
                setSrNo={stableSetSrNo}
                penNo={penNo}
                setPenNo={stableSetPenNo}
                apaarNo={apaarNo}
                setApaarNo={stableSetApaarNo}
                previousSchool={previousSchool}
                setPreviousSchool={stableSetPreviousSchool}
                availableClasses={availableClasses}
                sectionsForClass={sectionsForClass}
                noClassesWarning={noClassesWarning}
                errors={errors}
                isNew={!student}
                guardianOpen={guardianOpen}
                setGuardianOpen={stableSetGuardianOpen}
                extraOpen={extraOpen}
                setExtraOpen={stableSetExtraOpen}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-border flex-shrink-0 bg-card rounded-b-xl">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            data-ocid="student-form.cancel_button"
          >
            Cancel
          </Button>
          {saveError && (
            <p className="text-destructive text-xs flex-1 text-center mr-2 bg-destructive/10 px-3 py-1.5 rounded-md border border-destructive/20 truncate">
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

// ── Extracted sub-component: BasicInfoFields ────────────────────────────────

interface BasicInfoFieldsProps {
  admNo: string;
  setAdmNo: (v: string) => void;
  fullName: string;
  setFullName: (v: string) => void;
  cls: string;
  setCls: (v: string) => void;
  section: string;
  setSection: (v: string) => void;
  dobParts: [string, string, string];
  handleDayChange: (v: string) => void;
  handleMonthChange: (v: string) => void;
  handleYearChange: (v: string) => void;
  mmRef: React.RefObject<HTMLInputElement | null>;
  yyyyRef: React.RefObject<HTMLInputElement | null>;
  gender: Student["gender"];
  setGender: (v: Student["gender"]) => void;
  category: string;
  setCategory: (v: string) => void;
  fatherName: string;
  setFatherName: (v: string) => void;
  mobile: string;
  setMobile: (v: string) => void;
  admissionDate: string;
  setAdmissionDate: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  village: string;
  setVillage: (v: string) => void;
  status: Student["status"];
  setStatus: (v: Student["status"]) => void;
  photo: string;
  photoRef: React.RefObject<HTMLInputElement | null>;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fatherMobile: string;
  setFatherMobile: (v: string) => void;
  motherName: string;
  setMotherName: (v: string) => void;
  motherMobile: string;
  setMotherMobile: (v: string) => void;
  guardianMobile: string;
  setGuardianMobile: (v: string) => void;
  aadhaarNo: string;
  setAadhaarNo: (v: string) => void;
  srNo: string;
  setSrNo: (v: string) => void;
  penNo: string;
  setPenNo: (v: string) => void;
  apaarNo: string;
  setApaarNo: (v: string) => void;
  previousSchool: string;
  setPreviousSchool: (v: string) => void;
  availableClasses: ClassSection[];
  sectionsForClass: string[];
  noClassesWarning: boolean;
  errors: Record<string, string>;
  isNew: boolean;
  guardianOpen: boolean;
  setGuardianOpen: (v: boolean) => void;
  extraOpen: boolean;
  setExtraOpen: (v: boolean) => void;
}

const BasicInfoFields = memo(function BasicInfoFields({
  admNo,
  setAdmNo,
  fullName,
  setFullName,
  cls,
  setCls,
  section,
  setSection,
  dobParts,
  handleDayChange,
  handleMonthChange,
  handleYearChange,
  mmRef,
  yyyyRef,
  gender,
  setGender,
  category,
  setCategory,
  fatherName,
  setFatherName,
  mobile,
  setMobile,
  admissionDate,
  setAdmissionDate,
  address,
  setAddress,
  village,
  setVillage,
  status,
  setStatus,
  photo,
  photoRef,
  handlePhotoUpload,
  fatherMobile,
  setFatherMobile,
  motherName,
  setMotherName,
  motherMobile,
  setMotherMobile,
  guardianMobile,
  setGuardianMobile,
  aadhaarNo,
  setAadhaarNo,
  srNo,
  setSrNo,
  penNo,
  setPenNo,
  apaarNo,
  setApaarNo,
  previousSchool,
  setPreviousSchool,
  availableClasses,
  sectionsForClass,
  noClassesWarning,
  errors,
  isNew,
  guardianOpen,
  setGuardianOpen,
  extraOpen,
  setExtraOpen,
}: BasicInfoFieldsProps) {
  return (
    <>
      {noClassesWarning && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800">
            <strong>No classes configured.</strong> Please add classes first in{" "}
            <strong>Academics → Classes &amp; Sections</strong> before adding
            students.
          </p>
        </div>
      )}

      {/* Photo */}
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
            <Camera className="w-3 h-3 mr-1" />
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

      {/* Adm No + Full Name */}
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

      {/* Class + Section */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>
            Class <span className="text-destructive">*</span>
          </Label>
          <Select value={cls} onValueChange={setCls}>
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
                  c.className ?? (c as unknown as { name?: string }).name ?? "";
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
          <Select value={section} onValueChange={setSection} disabled={!cls}>
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

      {/* DOB */}
      <div className="space-y-1">
        <Label>Date of Birth</Label>
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
        {errors.dob && <p className="text-destructive text-xs">{errors.dob}</p>}
        <p className="text-xs text-muted-foreground">
          Auto-advances: day → month → year
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
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
        <div className="space-y-1">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as Student["status"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="discontinued">Discontinued</SelectItem>
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
            placeholder="Student / primary mobile"
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
                placeholder="Guardian mobile"
                type="tel"
              />
            </div>
          </div>
        </div>
      )}

      {/* Additional Details */}
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
      {isNew &&
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
    </>
  );
});
