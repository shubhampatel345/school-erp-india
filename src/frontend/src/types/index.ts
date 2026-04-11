// ──────────────────────────────────────────────────────────
// SHUBH SCHOOL ERP — Complete Type Definitions
// ──────────────────────────────────────────────────────────

export type UserRole =
  | "superadmin"
  | "admin"
  | "teacher"
  | "parent"
  | "student"
  | "driver"
  | "receptionist"
  | "accountant"
  | "librarian";

export interface Credentials {
  username: string;
  password: string;
}

// ──────────────────────────────────────────────────────────
// Session
// ──────────────────────────────────────────────────────────
export interface Session {
  id: string;
  label: string;
  startYear: number;
  endYear: number;
  isArchived: boolean;
  isActive: boolean;
  createdAt: string;
}

// ──────────────────────────────────────────────────────────
// Student
// ──────────────────────────────────────────────────────────
export interface Student {
  id: string;
  admNo: string;
  fullName: string;
  photo: string;
  dob: string; // DD/MM/YYYY
  gender: "Male" | "Female" | "Other";
  class: string;
  section: string;
  category: string;
  fatherName: string;
  fatherMobile?: string;
  motherName: string;
  motherMobile?: string;
  guardianName?: string;
  guardianMobile: string;
  mobile: string;
  address: string;
  aadhaarNo?: string;
  srNo?: string;
  penNo?: string;
  apaarNo?: string;
  previousSchool?: string;
  admissionDate?: string;
  status: "active" | "discontinued";
  leavingDate?: string;
  leavingReason?: string;
  leavingRemarks?: string;
  sessionId: string;
  transportId?: string;
  transportBusNo?: string;
  transportRoute?: string;
  transportPickup?: string;
  createdAt?: string;
  credentials: Credentials;
  remarks?: string;
}

// ──────────────────────────────────────────────────────────
// Staff / HR
// ──────────────────────────────────────────────────────────
export interface SubjectAssignment {
  subject: string;
  classFrom: string;
  classTo: string;
}

export interface Staff {
  id: string;
  empId: string;
  name: string;
  designation: string;
  department?: string;
  mobile: string;
  dob: string; // DD/MM/YYYY
  email?: string;
  address?: string;
  qualification?: string;
  joiningDate?: string;
  salary?: number;
  status?: "active" | "inactive";
  photo?: string;
  subjects: SubjectAssignment[];
  sessionId?: string;
  credentials: Credentials;
  classTeacher?: { class: string; section: string };
  position?: string;
}

export interface ClassTeacher {
  class: string;
  section: string;
  staffId: string;
  staffName: string;
}

// ──────────────────────────────────────────────────────────
// Fees
// ──────────────────────────────────────────────────────────
export interface FeeHeading {
  id: string;
  name: string;
  months: string[]; // Indian academic months e.g. ['April','May']
  applicableClasses?: string[];
  amount: number;
}

export interface FeesPlan {
  id: string;
  classId: string;
  sectionId: string;
  headingId: string;
  headingName: string;
  amount: number;
}

export interface OtherCharge {
  label: string;
  paidAmount: number;
  dueAmount: number;
}

export interface ReceiptItem {
  headingId: string;
  headingName: string;
  month: string;
  amount: number;
}

export interface FeeReceipt {
  id: string;
  receiptNo: string;
  studentId: string;
  studentName: string;
  admNo: string;
  class: string;
  section: string;
  date: string;
  items: ReceiptItem[];
  otherCharges: OtherCharge[];
  discount: number;
  oldBalance: number;
  totalAmount: number;
  paidAmount?: number;
  balance?: number;
  paymentMode: "Cash" | "Online" | "Cheque" | "DD" | "UPI";
  receivedBy: string;
  receivedByRole: string;
  sessionId: string;
  template?: 1 | 2 | 3 | 4;
  isDeleted?: boolean;
}

export interface Discount {
  id: string;
  studentId: string;
  feeHeadingId?: string;
  month: string;
  amount: number;
  reason?: string;
  sessionId: string;
}

export interface DiscountEntry {
  id: string;
  studentId: string;
  month: string;
  amount: number;
  reason: string;
  sessionId: string;
  /** headingIds + 'transport' that this discount applies to; empty/undefined = all fees (legacy) */
  applicableTo?: string[];
}

export interface FeeAccount {
  id: string;
  name: string;
}

// ──────────────────────────────────────────────────────────
// Attendance
// ──────────────────────────────────────────────────────────
export interface AttendanceRecord {
  id: string;
  studentId?: string;
  staffId?: string;
  date: string; // YYYY-MM-DD
  status: "Present" | "Absent" | "Late" | "Half Day";
  timeIn?: string;
  timeOut?: string;
  markedBy: string;
  type: "student" | "staff";
  method?: "manual" | "qr" | "rfid" | "essl";
  class?: string;
  section?: string;
  sessionId?: string;
}

// ──────────────────────────────────────────────────────────
// Notifications
// ──────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: number;
  isRead: boolean;
  icon?: string;
}

// ──────────────────────────────────────────────────────────
// Users
// ──────────────────────────────────────────────────────────
export interface AppUser {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  mobile?: string;
  studentId?: string;
  staffId?: string;
  position?: string;
}

// ──────────────────────────────────────────────────────────
// Academics
// ──────────────────────────────────────────────────────────
export interface ClassSection {
  id: string;
  className: string;
  sections: string[];
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  classes: string[];
}

// ──────────────────────────────────────────────────────────
// Transport
// ──────────────────────────────────────────────────────────
export interface TransportRoute {
  id: string;
  busNo: string;
  routeName: string;
  driverName: string;
  driverMobile: string;
  pickupPoints: string[];
  students: string[];
}

export interface StudentTransport {
  studentId: string;
  routeId: string;
  busNo: string;
  routeName: string;
  pickupPoint: string;
}

export interface RoutePickupPoint {
  id: string;
  stopName: string;
  order: number;
  distance: string;
  fare: number; // monthly fare for this pickup point
}

// ──────────────────────────────────────────────────────────
// Examinations
// ──────────────────────────────────────────────────────────
export interface ExamTimetableEntry {
  id: string;
  examName: string;
  class: string;
  section: string;
  subject: string;
  date: string;
  timeFrom: string;
  timeTo: string;
  maxMarks: number;
  minMarks: number;
  sessionId: string;
}

export interface ExamTimetableGroup {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  timeFrom: string;
  timeTo: string;
  classes: string[];
  classSubjects: Record<string, string[]>;
  generatedEntries: ExamEntry[];
  isSaved: boolean;
  sessionId: string;
}

export interface ExamEntry {
  date: string;
  day: string;
  classSubjects: { class_: string; subject: string }[];
}

// ──────────────────────────────────────────────────────────
// Teacher Timetable
// ──────────────────────────────────────────────────────────
export interface PeriodConfig {
  days: string[];
  periodsPerDay: number;
  startTime: string;
  periodDurations: number[];
  intervalMinutes: number;
}

export interface PeriodSlot {
  teacherName?: string;
  subjectName?: string;
  teacherStaffId?: string;
  isEmpty: boolean;
}

export interface SectionTimetable {
  class_: string;
  section: string;
  periods: PeriodSlot[][];
}

export interface TeacherTimetable {
  id: string;
  sessionLabel: string;
  periodConfig: PeriodConfig;
  sections: SectionTimetable[];
  isSaved: boolean;
  sessionId: string;
  splitPairs?: SplitSubjectPair[];
}

export interface SplitSubjectPair {
  subjectA: string;
  subjectB: string;
  class_: string;
  section: string;
}

// ──────────────────────────────────────────────────────────
// Inventory
// ──────────────────────────────────────────────────────────
export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  purchasePrice: number;
  sellPrice: number;
  unit: string;
}

export interface InventoryPurchase {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  rate: number;
  totalCost: number;
  date: string;
  supplier?: string;
  sessionId: string;
}

export interface InventorySale {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  sellPrice: number;
  totalAmount: number;
  date: string;
  studentId?: string;
  buyerName?: string;
  sessionId: string;
}

// ──────────────────────────────────────────────────────────
// Expenses
// ──────────────────────────────────────────────────────────
export interface Expense {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: "income" | "expense";
  sessionId: string;
}

export interface ExpenseHead {
  id: string;
  name: string;
}

// ──────────────────────────────────────────────────────────
// Homework
// ──────────────────────────────────────────────────────────
export interface Homework {
  id: string;
  class: string;
  section: string;
  subject: string;
  title: string;
  description: string;
  dueDate: string;
  assignedBy: string;
  createdAt: string;
  sessionId?: string;
}

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  studentId: string;
  submittedAt: string;
  status: "submitted" | "late" | "missing";
}

// ──────────────────────────────────────────────────────────
// Alumni
// ──────────────────────────────────────────────────────────
export interface Alumni {
  id: string;
  name: string;
  batch: string;
  class_: string;
  admNo?: string;
  mobile?: string;
  email?: string;
  address?: string;
  photo?: string;
}

export interface AlumniEvent {
  id: string;
  title: string;
  date: string;
  description: string;
  attendees: string[];
}

// ──────────────────────────────────────────────────────────
// Settings
// ──────────────────────────────────────────────────────────
export interface WhatsAppSettings {
  appKey: string;
  authKey: string;
  enabled: boolean;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
}

export interface SchoolProfile {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo: string;
  principalName: string;
  affiliationNo: string;
  schoolCode: string;
  city: string;
  state: string;
  pincode: string;
  bank?: BankDetails;
}

export interface Permission {
  module: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}
