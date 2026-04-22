import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Bus,
  Calendar,
  CreditCard,
  Edit2,
  FileText,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import StudentDetailModal from "../components/StudentDetailModal";
import StudentForm from "../components/StudentForm";
import { useApp } from "../context/AppContext";
import type { Student } from "../types";

interface StudentDetailPageProps {
  studentId: string;
  onBack: () => void;
  onNavigate?: (page: string) => void;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/60 last:border-0">
      <span className="text-xs text-muted-foreground w-36 flex-shrink-0 mt-0.5">
        {label}
      </span>
      <span className="text-sm text-foreground font-medium break-words flex-1">
        {value}
      </span>
    </div>
  );
}

export default function StudentDetailPage({
  studentId,
  onBack,
  onNavigate,
}: StudentDetailPageProps) {
  const { getData, saveData, updateData, deleteData, refreshCollection } =
    useApp();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // All students for sibling lookup
  const allStudents = (getData("students") as Student[]).filter(Boolean);

  // Keep a ref to getData so loadStudent can call it without stale closure
  const getDataRef = useRef(getData);
  getDataRef.current = getData;
  const refreshRef = useRef(refreshCollection);
  refreshRef.current = refreshCollection;

  // biome-ignore lint/correctness/useExhaustiveDependencies: studentId is the dependency
  useEffect(() => {
    void loadStudent();
  }, [studentId]);

  async function loadStudent() {
    setLoading(true);
    try {
      // Try in-memory cache first (instant)
      const cached = (getDataRef.current("students") as Student[])
        .filter(Boolean)
        .find((s) => s?.id === studentId);

      if (cached) {
        setStudent(cached);
        setLoading(false);
        return;
      }

      // Not in cache — refresh from canister
      await refreshRef.current("students");
      const fresh = (getDataRef.current("students") as Student[])
        .filter(Boolean)
        .find((s) => s?.id === studentId);
      setStudent(fresh ?? null);
    } catch {
      // Refresh failed — student not found
      setStudent(null);
    } finally {
      setLoading(false);
    }
  }

  function handleUpdate(updated: Student) {
    if (!updated) return;
    setStudent(updated);
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-8 h-8 rounded" />
          <Skeleton className="w-40 h-6" />
        </div>
        <div className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card">
          <Skeleton className="w-20 h-20 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="w-48 h-6" />
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-24 h-5" />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows
            <Skeleton key={i} className="w-full h-8" />
          ))}
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-4 text-center">
        <User className="w-12 h-12 text-muted-foreground opacity-40" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Student Not Found
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            The student record could not be loaded.
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Student List
        </Button>
      </div>
    );
  }

  // Safe accessors — guard every field access
  const safeName = student.fullName ?? student.admNo ?? "Unknown Student";
  const safeAdmNo = student.admNo ?? "—";
  const safeClass = student.class ?? "—";
  const safeSection = student.section ?? "—";
  const safeFatherName = student.fatherName ?? "—";
  const safeInitial = safeName.charAt(0).toUpperCase();

  // Siblings — students sharing the same primary mobile
  const primaryMobile =
    student.mobile ?? student.guardianMobile ?? student.fatherMobile;
  const siblings = primaryMobile
    ? allStudents.filter(
        (s) =>
          s?.id !== student.id &&
          (s?.mobile === primaryMobile ||
            s?.guardianMobile === primaryMobile ||
            s?.fatherMobile === primaryMobile),
      )
    : [];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-4 md:px-6 pt-4 pb-3 bg-card border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={onBack}
            data-ocid="student-detail-page.back_button"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <span className="text-muted-foreground text-sm">/</span>
          <span className="text-sm font-medium text-foreground truncate">
            {safeName}
          </span>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 space-y-4 max-w-3xl">
        {/* Student Card */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
              {student.photo ? (
                <img
                  src={student.photo}
                  alt={safeName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-primary">
                  {safeInitial}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold font-display text-foreground">
                {safeName}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Adm. No:{" "}
                <span className="font-mono font-medium">{safeAdmNo}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Class {safeClass} – {safeSection} &nbsp;·&nbsp; {safeFatherName}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge
                  variant={
                    student.status === "active" ? "default" : "destructive"
                  }
                  className="text-xs"
                >
                  {student.status === "active" ? "Active" : "Discontinued"}
                </Badge>
                {student.category && (
                  <Badge variant="secondary" className="text-xs">
                    {student.category}
                  </Badge>
                )}
                {student.gender && (
                  <Badge variant="outline" className="text-xs">
                    {student.gender}
                  </Badge>
                )}
                {student.transportRoute && (
                  <Badge variant="outline" className="text-xs">
                    <Bus className="w-2.5 h-2.5 mr-1" />
                    {student.transportRoute}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDetailModal(true)}
                data-ocid="student-detail-page.view_details_button"
              >
                <FileText className="w-3.5 h-3.5 mr-1" />
                Full Details
              </Button>
              <Button
                size="sm"
                onClick={() => setShowForm(true)}
                data-ocid="student-detail-page.edit_button"
              >
                <Edit2 className="w-3.5 h-3.5 mr-1" />
                Edit
              </Button>
            </div>
          </div>
        </div>

        {/* Info Sections */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Personal Info */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-primary" />
              Personal Information
            </h3>
            <InfoRow label="Date of Birth" value={student.dob} />
            <InfoRow label="Gender" value={student.gender} />
            <InfoRow label="Category" value={student.category} />
            <InfoRow label="Blood Group" value={student.bloodGroup} />
            <InfoRow label="Religion" value={student.religion} />
            <InfoRow label="Admission Date" value={student.admissionDate} />
            <InfoRow label="Session" value={student.sessionId} />
          </div>

          {/* Contact Info */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Phone className="w-4 h-4 text-primary" />
              Contact Information
            </h3>
            <InfoRow label="Father's Name" value={student.fatherName} />
            <InfoRow label="Father Mobile" value={student.fatherMobile} />
            <InfoRow label="Mother's Name" value={student.motherName} />
            <InfoRow label="Mother Mobile" value={student.motherMobile} />
            <InfoRow label="Primary Mobile" value={student.mobile} />
            <InfoRow label="Guardian Mobile" value={student.guardianMobile} />
            <InfoRow label="Address" value={student.address} />
            <InfoRow label="Village" value={student.village} />
          </div>

          {/* Academic Info */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-primary" />
              Academic Information
            </h3>
            <InfoRow label="Class" value={`Class ${safeClass}`} />
            <InfoRow label="Section" value={safeSection} />
            <InfoRow label="Previous School" value={student.previousSchool} />
          </div>

          {/* Identity Documents */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4 text-primary" />
              Identity Documents
            </h3>
            <InfoRow label="Aadhaar No." value={student.aadhaarNo} />
            <InfoRow label="S.R. No." value={student.srNo} />
            <InfoRow label="Pen No." value={student.penNo} />
            <InfoRow label="APAAR No." value={student.apaarNo} />
          </div>
        </div>

        {/* Transport */}
        {(student.transportRoute || student.transportBusNo) && (
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Bus className="w-4 h-4 text-primary" />
              Transport
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {student.transportBusNo && (
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Bus No.</p>
                  <p className="font-semibold text-foreground mt-0.5">
                    {student.transportBusNo}
                  </p>
                </div>
              )}
              {student.transportRoute && (
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Route</p>
                  <p className="font-semibold text-foreground mt-0.5">
                    {student.transportRoute}
                  </p>
                </div>
              )}
              {student.transportPickup && (
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Pickup Point</p>
                  <p className="font-semibold text-foreground mt-0.5">
                    {student.transportPickup}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Family Siblings */}
        {siblings.length > 0 && (
          <div className="bg-card rounded-xl border border-primary/30 p-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Mail className="w-4 h-4 text-primary" />
              Family Members ({siblings.length})
            </h3>
            <div className="space-y-2">
              {siblings.map((s) => {
                if (!s?.id) return null;
                const siblingName = s.fullName ?? s.admNo ?? "Unknown";
                const siblingInitial = siblingName.charAt(0).toUpperCase();
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {s.photo ? (
                        <img
                          src={s.photo}
                          alt={siblingName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-primary">
                          {siblingInitial}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {siblingName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Adm: {s.admNo ?? "—"} · Class {s.class ?? "—"}-
                        {s.section ?? "—"}
                      </p>
                    </div>
                    <Badge
                      variant={
                        s.status === "active" ? "default" : "destructive"
                      }
                      className="text-xs"
                    >
                      {s.status === "active" ? "Active" : "Disc."}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Edit Form */}
      {showForm && (
        <StudentForm
          student={student}
          onSave={(updated) => {
            if (updated) setStudent(updated);
            setShowForm(false);
          }}
          onClose={() => setShowForm(false)}
          saveData={saveData}
          updateData={updateData}
        />
      )}

      {/* Full Detail Modal */}
      {showDetailModal && student && (
        <StudentDetailModal
          student={student}
          onClose={() => setShowDetailModal(false)}
          onUpdate={handleUpdate}
          onNavigate={onNavigate}
          updateData={updateData}
          deleteData={deleteData}
          allStudents={allStudents}
        />
      )}
    </div>
  );
}
