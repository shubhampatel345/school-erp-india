/**
 * StudentDetailModal.tsx — Full student detail view
 *
 * Tabs: Info | Fees | Transport | Attendance | Results | Documents
 * Works as both a floating modal (inline=false) and inline page content (inline=true).
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bus,
  Calendar,
  CreditCard,
  Edit2,
  FileText,
  Phone,
  Printer,
  User,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import type { Student } from "../types";
import { formatCurrency } from "../types";
import phpApiService from "../utils/phpApiService";
import StudentForm from "./StudentForm";

interface Props {
  student: Student;
  onClose: () => void;
  onUpdate: (s: Student) => void;
  updateData?: (
    collection: string,
    id: string,
    changes: Record<string, unknown>,
  ) => Promise<void>;
  deleteData?: (collection: string, id: string) => Promise<void>;
  allStudents?: Student[];
  /** When true, renders as inline content (no fixed overlay) */
  inline?: boolean;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground w-32 flex-shrink-0 mt-0.5">
        {label}
      </span>
      <span className="text-sm text-foreground font-medium flex-1 break-words">
        {value}
      </span>
    </div>
  );
}

function SectionHead({ title }: { title: string }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2 first:mt-0">
      {title}
    </p>
  );
}

type FeeRecord = {
  id: string;
  receiptNo: string;
  date: string;
  totalAmount: number;
  paymentMode: string;
  months?: string;
};

type AttendanceEntry = {
  date: string;
  status: string;
};

export default function StudentDetailModal({
  student,
  onClose,
  onUpdate,
  updateData,
  deleteData: _deleteData,
  allStudents = [],
  inline = false,
}: Props) {
  const { updateData: ctxUpdateData } = useApp();
  const effectiveUpdateData = updateData ?? ctxUpdateData;

  const [showEditForm, setShowEditForm] = useState(false);
  const [current, setCurrent] = useState(student);

  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [feesLoading, setFeesLoading] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceEntry[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Sync if parent updates student prop
  useEffect(() => {
    setCurrent(student);
  }, [student]);

  function loadFees() {
    setFeesLoading(true);
    phpApiService
      .getReceipts(current.id)
      .then((res) => setFees(res as FeeRecord[]))
      .catch(() => setFees([]))
      .finally(() => setFeesLoading(false));
  }

  function loadAttendance() {
    setAttendanceLoading(true);
    phpApiService
      .getStudentAttendance(current.id)
      .then((res) => setAttendance(res as AttendanceEntry[]))
      .catch(() => setAttendance([]))
      .finally(() => setAttendanceLoading(false));
  }

  // ── Toggle active/discontinued ─────────────────────────────────────────────
  async function toggleStatus() {
    const newStatus = current.status === "active" ? "discontinued" : "active";
    try {
      await effectiveUpdateData("students", current.id, { status: newStatus });
      const updated = {
        ...current,
        status: newStatus as "active" | "discontinued",
      };
      setCurrent(updated);
      onUpdate(updated);
      toast.success(
        `Student ${newStatus === "active" ? "activated" : "discontinued"}`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status",
      );
    }
  }

  // ── Print ──────────────────────────────────────────────────────────────────
  function handlePrint(type: "admission" | "idcard" | "admitcard") {
    const msgs = {
      admission:
        "Admission form print not available. Please configure in Settings → Certificate Studio.",
      idcard:
        "ID card print not available. Please configure in Settings → Certificate Studio.",
      admitcard:
        "Admit card print not available. Please configure in Settings → Certificate Studio.",
    };
    toast.info(msgs[type]);
  }

  // ── Family members ─────────────────────────────────────────────────────────
  const familyMembers = allStudents.filter(
    (s) =>
      s.id !== current.id &&
      s.fatherMobile &&
      s.fatherMobile === current.fatherMobile,
  );

  const content = (
    <div
      className="flex flex-col h-full max-h-full"
      data-ocid="student_detail.panel"
    >
      {/* Header */}
      <div className="flex items-start gap-4 p-5 border-b border-border bg-card">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary flex-shrink-0 overflow-hidden">
          {current.photo ? (
            <img
              src={current.photo}
              alt={current.fullName}
              className="w-full h-full object-cover"
            />
          ) : (
            current.fullName.charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display font-bold text-foreground text-lg truncate">
              {current.fullName}
            </h2>
            <Badge
              variant={current.status === "active" ? "default" : "secondary"}
              className="text-xs"
            >
              {current.status === "active" ? "Active" : "Discontinued"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {current.class}
            {current.section ? ` – ${current.section}` : ""} · Adm. No:{" "}
            {current.admNo}
          </p>
          {current.fatherMobile && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Phone className="w-3 h-3" />
              {current.fatherMobile}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8"
            onClick={() => setShowEditForm(true)}
            data-ocid="student_detail.edit_button"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`gap-1.5 h-7 text-xs ${current.status === "active" ? "text-destructive" : "text-green-600"}`}
            onClick={() => void toggleStatus()}
            data-ocid="student_detail.toggle_status_button"
          >
            {current.status === "active" ? (
              <UserX className="w-3 h-3" />
            ) : (
              <UserCheck className="w-3 h-3" />
            )}
            {current.status === "active" ? "Discontinue" : "Re-activate"}
          </Button>
        </div>

        {!inline && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 flex-shrink-0 ml-2"
            onClick={onClose}
            data-ocid="student_detail.close_button"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Print actions */}
      <div className="flex items-center gap-2 px-5 py-2 border-b border-border bg-muted/30 flex-wrap">
        <span className="text-xs text-muted-foreground mr-1">Print:</span>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-7 text-xs"
          onClick={() => handlePrint("admission")}
          data-ocid="student_detail.print_admission_button"
        >
          <Printer className="w-3 h-3" /> Admission Form
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-7 text-xs"
          onClick={() => handlePrint("idcard")}
          data-ocid="student_detail.print_idcard_button"
        >
          <FileText className="w-3 h-3" /> ID Card
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-7 text-xs"
          onClick={() => handlePrint("admitcard")}
          data-ocid="student_detail.print_admitcard_button"
        >
          <FileText className="w-3 h-3" /> Admit Card
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-auto min-h-0">
        <Tabs defaultValue="info" className="h-full flex flex-col">
          <TabsList className="mx-5 mt-3 self-start flex-wrap">
            <TabsTrigger
              value="info"
              className="gap-1.5 text-xs"
              data-ocid="student_detail.info_tab"
            >
              <User className="w-3.5 h-3.5" /> Info
            </TabsTrigger>
            <TabsTrigger
              value="fees"
              className="gap-1.5 text-xs"
              onClick={loadFees}
              data-ocid="student_detail.fees_tab"
            >
              <CreditCard className="w-3.5 h-3.5" /> Fees
            </TabsTrigger>
            <TabsTrigger
              value="transport"
              className="gap-1.5 text-xs"
              data-ocid="student_detail.transport_tab"
            >
              <Bus className="w-3.5 h-3.5" /> Transport
            </TabsTrigger>
            <TabsTrigger
              value="attendance"
              className="gap-1.5 text-xs"
              onClick={loadAttendance}
              data-ocid="student_detail.attendance_tab"
            >
              <Calendar className="w-3.5 h-3.5" /> Attendance
            </TabsTrigger>
          </TabsList>

          {/* ── Info ── */}
          <TabsContent
            value="info"
            className="flex-1 overflow-auto px-5 pb-5 mt-0"
          >
            <SectionHead title="Personal Details" />
            <InfoRow label="Full Name" value={current.fullName} />
            <InfoRow label="Adm. Number" value={current.admNo} />
            <InfoRow
              label="Class / Section"
              value={`${current.class}${current.section ? ` – ${current.section}` : ""}`}
            />
            <InfoRow
              label="Roll Number"
              value={(current as Student & { rollNo?: string }).rollNo}
            />
            <InfoRow label="Date of Birth" value={current.dob} />
            <InfoRow label="Gender" value={current.gender} />
            <InfoRow label="Category" value={current.category} />
            <InfoRow label="Religion" value={current.religion} />
            <InfoRow label="Blood Group" value={current.bloodGroup} />
            <InfoRow label="Aadhaar No." value={current.aadhaarNo} />
            <InfoRow label="SR Number" value={current.srNo} />
            <InfoRow label="Pen Number" value={current.penNo} />
            <InfoRow label="APAAR Number" value={current.apaarNo} />

            <SectionHead title="Contact" />
            <InfoRow label="Student Mobile" value={current.mobile} />
            <InfoRow label="Address" value={current.address} />
            <InfoRow label="Village / Area" value={current.village} />

            <SectionHead title="Parent / Guardian" />
            <InfoRow label="Father Name" value={current.fatherName} />
            <InfoRow label="Father Mobile" value={current.fatherMobile} />
            <InfoRow label="Mother Name" value={current.motherName} />
            <InfoRow label="Mother Mobile" value={current.motherMobile} />
            <InfoRow label="Guardian Name" value={current.guardianName} />

            <SectionHead title="Academic" />
            <InfoRow label="Previous School" value={current.previousSchool} />
            <InfoRow label="Admission Date" value={current.admissionDate} />
            <InfoRow label="Session" value={current.sessionId} />

            {familyMembers.length > 0 && (
              <>
                <Separator className="my-4" />
                <SectionHead title="Family Members" />
                {familyMembers.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {s.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {s.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.class} {s.section}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {s.status === "active" ? "Active" : "Discontinued"}
                    </Badge>
                  </div>
                ))}
              </>
            )}
          </TabsContent>

          {/* ── Fees ── */}
          <TabsContent
            value="fees"
            className="flex-1 overflow-auto px-5 pb-5 mt-3"
          >
            {feesLoading ? (
              <div
                className="space-y-2"
                data-ocid="student_detail.fees_loading_state"
              >
                {["f1", "f2", "f3"].map((k) => (
                  <Skeleton key={k} className="h-10 w-full" />
                ))}
              </div>
            ) : fees.length === 0 ? (
              <div
                className="py-8 text-center text-muted-foreground"
                data-ocid="student_detail.fees_empty_state"
              >
                <CreditCard className="w-8 h-8 opacity-30 mx-auto mb-2" />
                <p className="text-sm">No fee receipts found</p>
                <p className="text-xs mt-1">
                  Go to Fees → Collect Fees to record a payment
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-3">
                  {fees.length} receipt{fees.length !== 1 ? "s" : ""} found
                </p>
                {fees.map((f, idx) => (
                  <div
                    key={f.id ?? `fee-${idx}`}
                    className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border/60"
                    data-ocid={`student_detail.fees.item.${idx + 1}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        Receipt #{f.receiptNo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {f.date} · {f.paymentMode}
                      </p>
                    </div>
                    <span className="font-bold text-foreground text-sm">
                      {formatCurrency(f.totalAmount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Transport ── */}
          <TabsContent
            value="transport"
            className="flex-1 overflow-auto px-5 pb-5 mt-3"
          >
            {current.transportRoute ||
            current.transportBusNo ||
            current.transportPickup ? (
              <div className="space-y-1">
                <InfoRow label="Bus Number" value={current.transportBusNo} />
                <InfoRow label="Route" value={current.transportRoute} />
                <InfoRow label="Pickup Point" value={current.transportPickup} />
                {current.transportMonths &&
                  current.transportMonths.length > 0 && (
                    <div className="flex gap-3 py-2">
                      <span className="text-xs text-muted-foreground w-32 flex-shrink-0 mt-0.5">
                        Transport Months
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {current.transportMonths.map((m) => (
                          <Badge
                            key={m}
                            variant="secondary"
                            className="text-xs"
                          >
                            {m}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <div
                className="py-8 text-center text-muted-foreground"
                data-ocid="student_detail.transport_empty_state"
              >
                <Bus className="w-8 h-8 opacity-30 mx-auto mb-2" />
                <p className="text-sm">No transport details assigned</p>
                <p className="text-xs mt-1">
                  Edit this student to add transport information
                </p>
              </div>
            )}
          </TabsContent>

          {/* ── Attendance ── */}
          <TabsContent
            value="attendance"
            className="flex-1 overflow-auto px-5 pb-5 mt-3"
          >
            {attendanceLoading ? (
              <div
                className="space-y-2"
                data-ocid="student_detail.attendance_loading_state"
              >
                {["a1", "a2", "a3"].map((k) => (
                  <Skeleton key={k} className="h-8 w-full" />
                ))}
              </div>
            ) : attendance.length === 0 ? (
              <div
                className="py-8 text-center text-muted-foreground"
                data-ocid="student_detail.attendance_empty_state"
              >
                <Calendar className="w-8 h-8 opacity-30 mx-auto mb-2" />
                <p className="text-sm">No attendance records found</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground mb-3">
                  {attendance.length} records
                </p>
                {attendance.slice(0, 30).map((a) => (
                  <div
                    key={`att-${a.date}-${a.status}`}
                    className="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0"
                    data-ocid="student_detail.attendance.item"
                  >
                    <span className="text-xs text-muted-foreground w-24 flex-shrink-0">
                      {a.date}
                    </span>
                    <Badge
                      variant={
                        a.status === "Present"
                          ? "default"
                          : a.status === "Absent"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-xs"
                    >
                      {a.status}
                    </Badge>
                  </div>
                ))}
                {attendance.length > 30 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Showing 30 of {attendance.length} records
                  </p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Form */}
      {showEditForm && (
        <StudentForm
          student={current}
          onSave={async (saved) => {
            setCurrent(saved);
            onUpdate(saved);
            setShowEditForm(false);
          }}
          onClose={() => setShowEditForm(false)}
          saveData={async (_col, item) => item}
          updateData={async (_col, id, changes) => {
            await effectiveUpdateData(_col, id, changes);
          }}
        />
      )}
    </div>
  );

  if (inline) {
    return <div className="flex flex-col min-h-full">{content}</div>;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-background/60 backdrop-blur-sm"
      data-ocid="student_detail.dialog"
    >
      <div
        className="w-full max-w-lg h-full bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden"
        style={{ maxWidth: "min(480px, 100vw)" }}
      >
        {content}
      </div>
    </div>
  );
}
