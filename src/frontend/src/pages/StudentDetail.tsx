/**
 * StudentDetail.tsx — Full-screen student detail page
 *
 * Fetches the student from the server by ID, then renders
 * the StudentDetailModal as the main content.
 */
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import StudentDetailModal from "../components/StudentDetailModal";
import StudentForm from "../components/StudentForm";
import { useApp } from "../context/AppContext";
import type { Student } from "../types";
import phpApiService, { type StudentRecord } from "../utils/phpApiService";

interface StudentDetailPageProps {
  studentId: string;
  onBack: () => void;
  onNavigate?: (page: string) => void;
}

/** Map raw API record → Student */
function toStudent(r: StudentRecord): Student {
  const s = r as unknown as Record<string, unknown>;
  return {
    id: r.id,
    admNo: r.admNo ?? (s.adm_no as string) ?? "",
    fullName: r.fullName ?? (s.full_name as string) ?? "",
    fatherName: (s.fatherName as string) ?? (s.father_name as string) ?? "",
    motherName: (s.motherName as string) ?? (s.mother_name as string) ?? "",
    fatherMobile: r.fatherMobile ?? (s.father_mobile as string) ?? "",
    motherMobile: (s.motherMobile as string) ?? "",
    guardianMobile: r.fatherMobile ?? "",
    mobile: r.mobile ?? "",
    dob: r.dob ?? "",
    gender: (r.gender as Student["gender"]) ?? "Male",
    class: r.class ?? "",
    section: r.section ?? "",
    category: (s.category as string) ?? "",
    religion: (s.religion as string) ?? "",
    bloodGroup: (s.bloodGroup as string) ?? "",
    address: r.address ?? "",
    village: (s.village as string) ?? "",
    aadhaarNo: (s.aadhaarNo as string) ?? "",
    srNo: (s.srNo as string) ?? "",
    penNo: (s.penNo as string) ?? "",
    apaarNo: (s.apaarNo as string) ?? "",
    previousSchool: (s.previousSchool as string) ?? "",
    admissionDate: (s.admissionDate as string) ?? "",
    photo: (s.photo as string) ?? "",
    status: (s.status as string) === "discontinued" ? "discontinued" : "active",
    sessionId: r.sessionId ?? "",
    transportRoute: (s.transportRoute as string) ?? "",
    transportBusNo: (s.transportBusNo as string) ?? "",
    transportPickup: (s.transportPickup as string) ?? "",
    createdAt: r.createdAt ?? "",
  } as Student;
}

export default function StudentDetailPage({
  studentId,
  onBack,
  onNavigate: _onNavigate,
}: StudentDetailPageProps) {
  const { saveData, updateData, deleteData } = useApp();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    setLoading(true);
    phpApiService
      .getStudents({ search: studentId })
      .then((res) => {
        const match = res.data.find((r) => r.id === studentId);
        if (match) {
          setStudent(toStudent(match));
        } else {
          setError("Student not found");
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load student");
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="w-48 h-5" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
            <Skeleton key={`skel-${k}`} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="p-6 space-y-4 text-center">
        <p className="text-destructive">{error ?? "Student not found"}</p>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      {/* Back nav */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-8"
          onClick={onBack}
          data-ocid="student_detail.back_button"
        >
          <ArrowLeft className="w-4 h-4" />
          Students
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium text-foreground truncate">
          {student.fullName}
        </span>
      </div>

      {/* Detail modal rendered inline */}
      <StudentDetailModal
        student={student}
        onClose={onBack}
        onUpdate={(updated) => setStudent(updated)}
        updateData={updateData}
        deleteData={deleteData}
        inline
      />

      {/* Edit form */}
      {showEditForm && (
        <StudentForm
          student={student}
          onSave={async (saved) => {
            setStudent(saved);
            setShowEditForm(false);
          }}
          onClose={() => setShowEditForm(false)}
          saveData={saveData}
          updateData={updateData}
        />
      )}
    </div>
  );
}
