// ──────────────────────────────────────────────────────────
// SHUBH SCHOOL ERP — Complete Type Definitions
// All field names match PHP API camelCase MySQL columns
// ──────────────────────────────────────────────────────────

export interface MySQLRecord {
  /** Numeric auto-increment PK from MySQL. Undefined in local mode. */
  dbId?: number;
  /** ISO timestamp of last server sync. Undefined in local mode. */
  syncedAt?: string;
}

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
export interface Session extends MySQLRecord {
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
export interface Student extends MySQLRecord {
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
  village?: string;
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
  transportMonths?: string[];
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

export interface Staff extends MySQLRecord {
  id: string;
  empId: string;
  name: string;
  fullName?: string; // alias kept for compatibility
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

export interface FeeReceipt extends MySQLRecord {
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
// Old Fee Entry (manual previous-session dues)
// ──────────────────────────────────────────────────────────
export interface OldFeeEntry {
  id: string;
  studentId: string;
  sessionLabel: string; // e.g. "2024-25"
  month: string; // April … March
  headingName: string; // fee heading name or "Other"
  amount: number;
  remarks?: string;
}

// ──────────────────────────────────────────────────────────
// Attendance
// ──────────────────────────────────────────────────────────
export interface AttendanceRecord extends MySQLRecord {
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
// Users & Permissions
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

/** Alias used by AppContext and SyncEngine */
export type User = AppUser;

export interface Permission {
  module: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export type PermissionMatrix = Record<string, Permission>;

// ──────────────────────────────────────────────────────────
// Sync Engine
// ──────────────────────────────────────────────────────────
export interface SyncStatus {
  state: "idle" | "loading" | "synced" | "error" | "offline";
  lastSyncTime: Date | null;
  lastError: string | null;
  pendingCount: number;
  serverCounts: Record<string, number>;
}

export interface ChangelogEntry {
  id: string;
  collection: string;
  recordId: string;
  action: "create" | "update" | "delete";
  changedBy: string;
  changedByRole: string;
  timestamp: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

// ──────────────────────────────────────────────────────────
// App Config
// ──────────────────────────────────────────────────────────
export interface AppConfig {
  apiBaseUrl: string;
  schoolId: string;
  defaultSession: string;
  syncIntervalMs: number;
  offlineMode: boolean;
}

// ──────────────────────────────────────────────────────────
// All data loaded from server in one call
// ──────────────────────────────────────────────────────────
export interface AllData {
  students: Student[];
  staff: Staff[];
  attendance: AttendanceRecord[];
  fee_receipts: FeeReceipt[];
  fees_plan: FeesPlan[];
  fee_headings: FeeHeading[];
  sessions: Session[];
  classes: ClassSection[];
  subjects: Subject[];
  transport_routes: TransportRoute[];
  inventory_items: InventoryItem[];
  expenses: Expense[];
  homework: Homework[];
  alumni: Alumni[];
  notifications: Notification[];
  [key: string]: unknown[];
}

// ──────────────────────────────────────────────────────────
// Academics
// ──────────────────────────────────────────────────────────
export interface ClassSection {
  id: string;
  className: string;
  /** Legacy field — some server records may use 'name' instead of 'className' */
  name?: string;
  sections: string[];
  session?: string;
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
export interface Route {
  id: string;
  busNo: string;
  routeName: string;
  driverName: string;
  driverMobile: string;
  pickupPoints: RoutePickupPoint[];
  studentIds: string[];
}

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
  months?: string[];
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
  backgroundImage?: string;
}

// ──────────────────────────────────────────────────────────
// Chat
// ──────────────────────────────────────────────────────────
export interface ChatConversation {
  id: number;
  type: "direct" | "class_group" | "route_group";
  name: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  member_count: number;
  other_user_name?: string;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_user_id: number;
  sender_name: string;
  sender_role: string;
  content: string;
  sent_at: string;
  is_mine: boolean;
  file_url?: string;
  file_name?: string;
}

export interface ChatUser {
  id: number;
  name: string;
  role: string;
  mobile?: string;
}

export interface ChatGroup {
  id: string;
  name: string;
  type: "class" | "route" | "custom";
  members: string[];
  createdAt: string;
  sessionId?: string;
}

// ──────────────────────────────────────────────────────────
// Calls
// ──────────────────────────────────────────────────────────
export interface Call {
  id: string;
  from: string;
  to: string;
  duration: number; // seconds
  timestamp: string;
  status: "completed" | "missed" | "rejected";
  direction: "inbound" | "outbound";
}
