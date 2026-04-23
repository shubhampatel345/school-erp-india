// ──────────────────────────────────────────────────────────
// SHUBH SCHOOL ERP — Complete Type Definitions (School B)
// All data stored in Internet Computer canister — no PHP/MySQL
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

export const ROLES: UserRole[] = [
  "superadmin",
  "admin",
  "receptionist",
  "accountant",
  "librarian",
  "driver",
  "teacher",
  "parent",
  "student",
];

export interface Credentials {
  username: string;
  password: string;
}

// ──────────────────────────────────────────────────────────
// Users & Permissions
// ──────────────────────────────────────────────────────────
export interface AppUser {
  id: string;
  username: string;
  role: UserRole;
  fullName?: string;
  name: string;
  mobile?: string;
  email?: string;
  studentId?: string;
  staffId?: string;
  position?: string;
  isActive?: boolean;
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
  name?: string;
  photo?: string;
  dob?: string;
  gender: "Male" | "Female" | "Other";
  class: string;
  section: string;
  category?: string;
  religion?: string;
  bloodGroup?: string;
  fatherName: string;
  fatherMobile?: string;
  motherName?: string;
  motherMobile?: string;
  guardianName?: string;
  guardianMobile: string;
  mobile: string;
  address?: string;
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
  updatedAt?: string;
  credentials?: Credentials;
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
  fullName?: string;
  designation: string;
  department?: string;
  mobile: string;
  dob?: string;
  email?: string;
  address?: string;
  village?: string;
  qualification?: string;
  joiningDate?: string;
  salary?: number;
  baseSalary?: number;
  status?: "active" | "inactive";
  photo?: string;
  subjects?: SubjectAssignment[];
  sessionId?: string;
  credentials?: Credentials;
  classTeacher?: { class: string; section: string };
  position?: string;
  aadhaarNo?: string;
  bankAccount?: string;
  ifscCode?: string;
  bankName?: string;
  gender?: "Male" | "Female" | "Other";
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
  months: string[];
  applicableClasses?: string[];
  amount: number;
  accountId?: string;
  accountName?: string;
  headType?: "tuition" | "transport" | "other";
  isActive?: boolean;
  displayOrder?: number;
  sessionId?: string;
}

export interface FeesPlan {
  id: string;
  classId: string;
  sectionId: string;
  headingId: string;
  headingName: string;
  amount: number;
  sessionId?: string;
  amounts?: Record<string, number>;
}

/** Alias for backward compatibility */
export type FeePlan = FeesPlan;

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
  receivedByRole?: string;
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
  applicableTo?: string[];
}

export interface FeeAccount {
  id: string;
  name: string;
}

export interface OldFeeEntry {
  id: string;
  studentId: string;
  sessionLabel: string;
  month: string;
  headingName: string;
  amount: number;
  remarks?: string;
}

// ──────────────────────────────────────────────────────────
// Attendance
// ──────────────────────────────────────────────────────────
export interface AttendanceRecord {
  id: string;
  studentId?: string;
  staffId?: string;
  date: string;
  status: "Present" | "Absent" | "Late" | "Half Day";
  timeIn?: string;
  timeOut?: string;
  markedBy?: string;
  type: "student" | "staff";
  method?: "manual" | "qr" | "rfid" | "essl" | "face";
  class?: string;
  section?: string;
  sessionId?: string;
  admNo?: string;
  studentName?: string;
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
// Sync Engine
// ──────────────────────────────────────────────────────────
export interface SyncStatus {
  state: "idle" | "loading" | "synced" | "error" | "offline";
  lastSyncTime: Date | null;
  lastError: string | null;
  pendingCount: number;
  serverCounts: Record<string, number>;
}

export type SyncStatusState = "idle" | "syncing" | "error" | "offline";

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
  schoolId: string;
  defaultSession: string;
  syncIntervalMs: number;
  offlineMode: boolean;
}

// ──────────────────────────────────────────────────────────
// All data loaded from canister in one call
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
  name?: string;
  sections: string[];
  session?: string;
  sessionId?: string;
  displayOrder?: number;
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  classes: string[];
  sessionId?: string;
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
  pickupPoints: string[] | RoutePickupPoint[];
  students?: string[];
  sessionId?: string;
}

export interface StudentTransport {
  studentId: string;
  routeId: string;
  busNo: string;
  routeName: string;
  pickupPoint: string;
  pickupPointId?: string;
  months?: string[];
  monthlyFare?: number;
}

export interface RoutePickupPoint {
  id: string;
  stopName: string;
  order: number;
  distance?: string;
  fare: number;
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
  storeLocation?: string;
  description?: string;
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
  paymentMode?: "Cash" | "Cheque" | "Online";
  headId?: string;
  headName?: string;
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
  attachmentUrl?: string;
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
  dashboardBackground?: string;
}

// ──────────────────────────────────────────────────────────
// Payroll
// ──────────────────────────────────────────────────────────
export interface PayrollSetup {
  id: string;
  staffId: string;
  empId: string;
  staffName: string;
  baseSalary: number;
  hra: number;
  da: number;
  otherAllowance: number;
  pf: number;
  esi: number;
  otherDeduction: number;
  sessionId: string;
}

export interface Payslip {
  id: string;
  staffId: string;
  empId: string;
  staffName: string;
  month: string;
  year: number;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  isPaid: boolean;
  paidDate?: string;
  sessionId: string;
  createdAt: string;
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
  duration: number;
  timestamp: string;
  status: "completed" | "missed" | "rejected";
  direction: "inbound" | "outbound";
}

// ──────────────────────────────────────────────────────────
// Face Recognition Attendance
// ──────────────────────────────────────────────────────────
export interface FaceDescriptor {
  studentId: string;
  descriptors: number[][];
  enrolledAt: string;
}

export interface FaceAttendanceLog {
  id: string;
  studentId: string;
  timestamp: string;
  confidence: number;
  method: "face" | "qr" | "manual";
  sessionId: string;
}

// ──────────────────────────────────────────────────────────
// Library Management
// ──────────────────────────────────────────────────────────
export interface LibraryBook {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher?: string;
  category: string;
  totalQty: number;
  availableQty: number;
  location?: string;
  addedAt: string;
}

export interface BookIssue {
  id: string;
  bookId: string;
  studentId: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  fine: number;
  status: "issued" | "returned" | "overdue";
}

// ──────────────────────────────────────────────────────────
// Online Examinations
// ──────────────────────────────────────────────────────────
export interface ExamQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswers: number[];
  marks: number;
}

export interface OnlineExam {
  id: string;
  title: string;
  subject: string;
  classId: string;
  sections: string[];
  duration: number;
  totalMarks: number;
  passPercentage: number;
  startTime: string;
  endTime: string;
  questions: ExamQuestion[];
  status: "draft" | "active" | "completed";
  createdBy: string;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  studentId: string;
  answers: Record<string, number[]>;
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  startedAt: string;
  submittedAt: string;
  timeTaken: number;
}

// ──────────────────────────────────────────────────────────
// GPS Transport Tracking
// ──────────────────────────────────────────────────────────
export interface DriverLocation {
  driverId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  routeId: string;
  isActive: boolean;
}

export interface TransportTrip {
  id: string;
  routeId: string;
  driverId: string;
  startTime: string;
  endTime?: string;
  status: "active" | "completed";
  locations: DriverLocation[];
}

// ──────────────────────────────────────────────────────────
// Bulk WhatsApp / SMS Broadcast
// ──────────────────────────────────────────────────────────
export interface BroadcastRecipientFilter {
  type: "class" | "all" | "route";
  classId?: string;
  section?: string;
  routeId?: string;
}

export interface BroadcastCampaign {
  id: string;
  title: string;
  channel: "whatsapp" | "sms" | "both";
  recipients: BroadcastRecipientFilter;
  template: string;
  message: string;
  scheduledAt?: string;
  sentAt?: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "failed";
  totalRecipients: number;
  delivered: number;
  failed: number;
  createdBy: string;
}

// ──────────────────────────────────────────────────────────
// Parent PWA Push Notifications
// ──────────────────────────────────────────────────────────
export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  role: string;
  createdAt: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  type: "attendance" | "fees" | "exam" | "homework" | "broadcast";
  studentId?: string;
}

// ──────────────────────────────────────────────────────────
// Student Performance Analytics
// ──────────────────────────────────────────────────────────
export interface MarksHistoryEntry {
  examTitle: string;
  subject: string;
  score: number;
  totalMarks: number;
  date: string;
}

export interface AttendanceSummaryEntry {
  present: number;
  total: number;
  month: string;
}

export interface FeesHistoryEntry {
  month: string;
  paid: number;
  due: number;
}

export interface StudentAnalytics {
  studentId: string;
  marksHistory: MarksHistoryEntry[];
  attendanceSummary: AttendanceSummaryEntry[];
  feesHistory: FeesHistoryEntry[];
}

// ──────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────

/** 10 selectable themes */
export const THEMES = [
  { id: "default", label: "Navy Blue", description: "Dark navy + cyan" },
  { id: "ocean", label: "Deep Ocean", description: "Deep blue + teal" },
  { id: "forest", label: "Forest Green", description: "Forest + lime" },
  { id: "rose", label: "Sunset Rose", description: "Rose + coral" },
  { id: "dark-navy", label: "Dark Night", description: "Midnight dark mode" },
  { id: "slate", label: "Slate Gray", description: "Cool slate + indigo" },
  { id: "purple", label: "Royal Purple", description: "Deep purple + violet" },
  { id: "copper", label: "Copper Bronze", description: "Warm copper + gold" },
  { id: "cherry", label: "Cherry Red", description: "Deep red + orange" },
  { id: "midnight", label: "Midnight Teal", description: "Midnight + teal" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

/** Indian school class ordering — Nursery → Class 12 */
export const CLASSES_ORDER: string[] = [
  "Nursery",
  "LKG",
  "UKG",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
];

/** Alias for backward compatibility */
export const CLASS_ORDER: string[] = CLASSES_ORDER;

/** Indian academic year months (April start) */
export const MONTHS: string[] = [
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "January",
  "February",
  "March",
];

/** Short month labels */
export const MONTHS_SHORT: string[] = [
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
];

/** Alias for backward compatibility */
export const MONTHS_FULL = MONTHS;

/** Transport months — 11 months auto-selected (June deselected by default) */
export const DEFAULT_TRANSPORT_MONTHS = [
  "Apr",
  "May",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
];

/** Format a number as Indian currency: ₹1,23,456 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}
