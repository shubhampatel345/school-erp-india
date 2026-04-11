const PREFIX = "shubh_erp_";

export const ls = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // storage full — fail silently
    }
  },
  remove(key: string): void {
    localStorage.removeItem(PREFIX + key);
  },
  clear(): void {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));
    for (const k of keys) localStorage.removeItem(k);
  },
};

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Format a Date or ISO string as DD/MM/YYYY */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Format number as Indian currency string: ₹1,23,456 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Parse a DOB string in ddmmyyyy format to a Date */
export function parseDate(ddmmyyyy: string): Date {
  const d = ddmmyyyy.replace(/\D/g, "");
  const day = Number.parseInt(d.slice(0, 2), 10);
  const month = Number.parseInt(d.slice(2, 4), 10) - 1;
  const year = Number.parseInt(d.slice(4, 8), 10);
  return new Date(year, month, day);
}

/** Get zero-based month index within the Indian academic year (April=0) */
export function getMonthIndex(monthName: string): number {
  return MONTHS.indexOf(monthName);
}

/** Get current academic year month name (April=start) */
export function getCurrentAcademicMonth(): string {
  const m = new Date().getMonth(); // 0=Jan
  const idx = m >= 3 ? m - 3 : m + 9;
  return MONTHS[idx];
}

/** Indian academic year months: April (0) → March (11) */
export const MONTHS = [
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

export const MONTH_SHORT = [
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

export const CLASSES = [
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
];

export const SECTIONS = ["A", "B", "C", "D", "E"];

// ──────────────────────────────────────────────────────────
// localStorage key constants
// ──────────────────────────────────────────────────────────
export const LS_KEYS = {
  students: "students",
  staff: "staff",
  sessions: "sessions",
  currentSession: "current_session",
  currentUser: "current_user",
  userPasswords: "user_passwords",
  customUsers: "custom_users",
  notifications: "notifications",
  feeHeadings: "fee_headings",
  feesPlan: "fees_plan",
  feeReceipts: "fee_receipts",
  feeAccounts: "fee_accounts",
  attendance: "attendance",
  transport: "transport",
  studentTransport: "student_transport",
  examTimetables: "exam_timetables",
  teacherTimetables: "teacher_timetables",
  classSections: "class_sections",
  subjects: "subjects",
  classTeachers: "class_teachers",
  inventoryItems: "inventory_items",
  inventoryPurchases: "inventory_purchases",
  inventorySales: "inventory_sales",
  expenses: "expenses",
  expenseHeads: "expense_heads",
  homework: "homework",
  homeworkSubmissions: "homework_submissions",
  alumni: "alumni",
  alumniEvents: "alumni_events",
  discounts: "discounts",
  whatsappSettings: "whatsapp_settings",
  whatsappLogs: "whatsapp_logs",
  schoolProfile: "school_profile",
  onlinePaymentSettings: "online_payment_settings",
  notificationScheduler: "notification_scheduler",
  theme: "theme",
} as const;
