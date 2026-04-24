/**
 * CollectFees.tsx — Direct phpApiService (no getData, no context data cache)
 *
 * - Student search via server (debounced)
 * - Fee plan loaded from server on student select
 * - Receipt saved to server, wait for HTTP 200
 * - Dropdown closes after student select
 * - No local pending queue, no IndexedDB
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { useApp } from "../../context/AppContext";
import type { FeeReceipt, SchoolProfile, Student } from "../../types";
import {
  MONTHS,
  formatCurrency,
  formatDate,
  generateId,
  ls,
} from "../../utils/localStorage";
import phpApiService, { type StudentRecord } from "../../utils/phpApiService";
import { buildFeeReceiptMessage, sendWhatsApp } from "../../utils/whatsapp";

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTH_SHORT = [
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

// ── Types ─────────────────────────────────────────────────────────────────────
interface ReceiptRow {
  headingId: string;
  headingName: string;
  applicableMonths: string[];
  amount: number;
  paidMonths: string[];
  checked: boolean;
}

interface OtherChargeRow {
  label: string;
  paidAmount: number;
  dueAmount: number;
}

interface EditReceiptState {
  receiptId: string;
  date: string;
  paymentMode: FeeReceipt["paymentMode"];
  paidAmount: number;
  discount: number;
  selectedMonths: string[];
  headings: Array<{
    headingId: string;
    headingName: string;
    months: string[];
    rate: number;
  }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeMonths(v: string[] | string | undefined): string[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v) {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

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
    guardianMobile: (s.guardianMobile as string) ?? r.fatherMobile ?? "",
    mobile: r.mobile ?? "",
    dob: r.dob ?? "",
    gender: (r.gender as Student["gender"]) ?? "Male",
    class: r.class ?? "",
    section: r.section ?? "",
    category: (s.category as string) ?? "",
    address: r.address ?? "",
    village: (s.village as string) ?? "",
    photo: (s.photo as string) ?? (s.photo_url as string) ?? "",
    admissionDate:
      (s.admissionDate as string) ?? (s.admission_date as string) ?? "",
    status: (s.status as string) === "discontinued" ? "discontinued" : "active",
    sessionId: r.sessionId ?? "",
  } as Student;
}

function buildQRData(r: FeeReceipt): string {
  const months = [...new Set(r.items.map((i) => i.month))].join(",");
  return `Receipt:${r.receiptNo}|Student:${r.studentName}|Adm:${r.admNo}|Class:${r.class}-${r.section}|Amount:${r.totalAmount}|Date:${r.date}|Mode:${r.paymentMode}|Months:${months}`;
}

function buildUpiLink(
  vpa: string,
  schoolName: string,
  amount: number,
  studentName: string,
): string {
  const params = new URLSearchParams({
    pa: vpa,
    pn: schoolName,
    am: amount.toFixed(2),
    cu: "INR",
    tn: `Fees ${studentName}`,
  });
  return `upi://pay?${params.toString()}`;
}

function printReceiptHTML(receipt: FeeReceipt) {
  const school = ls.get<SchoolProfile>("school_profile", {
    name: "SHUBH SCHOOL ERP",
    address: "",
    phone: "",
    email: "",
    website: "",
    logo: "",
    principalName: "Principal",
    affiliationNo: "",
    schoolCode: "",
    city: "",
    state: "",
    pincode: "",
  });
  const nonZeroItems = receipt.items.filter((i) => i.amount > 0);
  const grouped: Record<
    string,
    { months: string[]; amount: number; headingName: string }
  > = {};
  for (const item of nonZeroItems) {
    if (!grouped[item.headingId])
      grouped[item.headingId] = {
        months: [],
        amount: item.amount,
        headingName: item.headingName,
      };
    grouped[item.headingId].months.push(item.month);
  }
  const qrData = buildQRData(receipt);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(qrData)}`;
  const itemRows = Object.values(grouped)
    .map(
      (g, idx) =>
        `<tr><td>${idx + 1}</td><td>${g.headingName}</td><td>${g.months.map((m) => m.slice(0, 3)).join(",")}</td><td style="text-align:right">₹${(g.amount * g.months.length).toLocaleString("en-IN")}</td></tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fee Receipt - ${receipt.receiptNo}</title>
  <style>@page{size:105mm 145mm;margin:0}*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:9px;padding:4mm;background:#fff}.header{text-align:center;border-bottom:1.5px solid #000;padding-bottom:3px;margin-bottom:3px}.school-name{font-size:13px;font-weight:bold}.receipt-title{text-align:center;font-weight:bold;font-size:10px;letter-spacing:1px;margin:3px 0;border-top:1px solid #ccc;border-bottom:1px solid #ccc;padding:2px 0}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px 8px;margin:3px 0;font-size:8.5px}.lbl{color:#555}table{width:100%;border-collapse:collapse;margin:3px 0;font-size:8px}th,td{border:.5px solid #aaa;padding:1.5px 3px}th{background:#f2f2f2;font-weight:bold}.total-row td{font-weight:bold;font-size:9px;background:#f8f8f8}.qr-row{display:flex;justify-content:space-between;align-items:flex-end;margin-top:4px}</style>
  </head><body>
  <div class="header"><div class="school-name">${school.name}</div><div style="font-size:7.5px;color:#333">${school.address ?? ""}</div></div>
  <div class="receipt-title">CASH RECEIPT</div>
  <div class="info-grid"><div><span class="lbl">Receipt No:</span><b>${receipt.receiptNo}</b></div><div><span class="lbl">Date:</span>${receipt.date}</div><div><span class="lbl">Name:</span><b>${receipt.studentName}</b></div><div><span class="lbl">Adm No:</span>${receipt.admNo}</div><div><span class="lbl">Class:</span>${receipt.class}-${receipt.section}</div><div><span class="lbl">Mode:</span>${receipt.paymentMode}</div></div>
  <table><thead><tr><th>#</th><th>Particulars</th><th>Months</th><th>Amount</th></tr></thead><tbody>${itemRows}<tr class="total-row"><td colspan="3">Net Fees</td><td style="text-align:right">₹${receipt.totalAmount.toLocaleString("en-IN")}</td></tr></tbody></table>
  <div class="qr-row"><div><div style="font-size:8px;">Received By: <b>${receipt.receivedBy}</b> (${receipt.receivedByRole})</div><div style="margin-top:10px;font-size:8px;">Signature: _______________</div></div><img src="${qrUrl}" width="60" height="60" alt="QR"/></div>
  </body></html>`;

  const existing = document.getElementById(
    "shubh-print-frame",
  ) as HTMLIFrameElement | null;
  if (existing) existing.remove();
  const frame = document.createElement("iframe");
  frame.id = "shubh-print-frame";
  frame.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;";
  document.body.appendChild(frame);
  const frameDoc = frame.contentDocument ?? frame.contentWindow?.document;
  if (!frameDoc) {
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
    return;
  }
  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();
  setTimeout(() => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 300);
      }
    }
    setTimeout(() => frame.remove(), 3000);
  }, 400);
}

// ── UPI QR ─────────────────────────────────────────────────────────────────────
function UpiQrSection({
  netPayable,
  studentName,
  onPaymentDone,
}: {
  netPayable: number;
  studentName: string;
  onPaymentDone: (utr: string) => void;
}) {
  const [vpa, setVpa] = useState(() =>
    ls.get<string>("schoolUpiVpa", "school@upi"),
  );
  const [showVpaEdit, setShowVpaEdit] = useState(false);
  const [vpaInput, setVpaInput] = useState(vpa);
  const [showUtrDialog, setShowUtrDialog] = useState(false);
  const [utrInput, setUtrInput] = useState("");
  const school = ls.get<{ name: string }>("school_profile", { name: "School" });
  const upiLink = buildUpiLink(vpa, school.name, netPayable, studentName);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}&margin=10&bgcolor=ffffff`;
  if (netPayable <= 0) return null;
  return (
    <div className="bg-card border border-border border-t-0 shadow-sm overflow-hidden">
      <div className="px-3 py-2 bg-indigo-50 border-b border-border flex items-center justify-between">
        <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
          📱 Pay via UPI
        </span>
        <button
          type="button"
          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
          onClick={() => {
            setVpaInput(vpa);
            setShowVpaEdit(true);
          }}
          data-ocid="upi-settings-btn"
        >
          ⚙ UPI Settings
        </button>
      </div>
      <div className="p-4 flex flex-wrap gap-6 items-start">
        <div className="flex flex-col items-center gap-2">
          <div className="border-2 border-indigo-200 rounded-xl p-2 bg-card shadow-sm">
            <img
              src={qrUrl}
              alt="UPI QR Code"
              width={200}
              height={200}
              className="block"
              data-ocid="upi-qr-image"
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-center max-w-[200px]">
            Scan with GPay / PhonePe / Paytm / Any UPI App
          </p>
          <div className="text-xl font-extrabold text-indigo-700 tracking-tight">
            ₹{netPayable.toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-muted-foreground">
            UPI ID:{" "}
            <span className="font-mono font-semibold text-foreground">
              {vpa}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-3 justify-center min-w-[180px]">
          <button
            type="button"
            onClick={() => {
              window.location.href = upiLink;
            }}
            className="flex items-center gap-2 justify-center px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm"
            data-ocid="open-gpay-btn"
          >
            📲 Open GPay
          </button>
          <button
            type="button"
            onClick={() => setShowUtrDialog(true)}
            className="flex items-center gap-2 justify-center px-4 py-2.5 rounded-xl border-2 border-green-500 text-green-700 text-sm font-bold hover:bg-green-50 transition-colors"
            data-ocid="upi-payment-done-btn"
          >
            ✅ Payment Done
          </button>
        </div>
      </div>
      <Dialog open={showVpaEdit} onOpenChange={setShowVpaEdit}>
        <DialogContent className="max-w-sm" data-ocid="upi-settings-dialog">
          <DialogHeader>
            <DialogTitle>⚙ UPI Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <label
                htmlFor="upi-vpa-input"
                className="text-sm font-medium block mb-1"
              >
                School UPI VPA
              </label>
              <input
                id="upi-vpa-input"
                type="text"
                value={vpaInput}
                onChange={(e) => setVpaInput(e.target.value)}
                placeholder="e.g. school@okicici"
                className="w-full h-9 px-3 text-sm border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                data-ocid="upi-vpa-input"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVpaEdit(false)}
                data-ocid="upi-settings-cancel-btn"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  ls.set("schoolUpiVpa", vpaInput.trim());
                  setVpa(vpaInput.trim());
                  setShowVpaEdit(false);
                }}
                disabled={!vpaInput.trim()}
                data-ocid="upi-settings-save-btn"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showUtrDialog} onOpenChange={setShowUtrDialog}>
        <DialogContent className="max-w-sm" data-ocid="upi-utr-dialog">
          <DialogHeader>
            <DialogTitle>✅ Confirm UPI Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              <p className="font-semibold">
                Amount: ₹{netPayable.toLocaleString("en-IN")}
              </p>
              <p className="text-green-700 text-xs mt-0.5">for {studentName}</p>
            </div>
            <div>
              <label
                htmlFor="utr-input"
                className="text-sm font-medium block mb-1"
              >
                UTR / Transaction ID{" "}
                <span className="text-muted-foreground font-normal text-xs">
                  (optional)
                </span>
              </label>
              <input
                id="utr-input"
                type="text"
                value={utrInput}
                onChange={(e) => setUtrInput(e.target.value)}
                placeholder="e.g. 403612345678"
                className="w-full h-9 px-3 text-sm border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                data-ocid="upi-utr-input"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUtrDialog(false)}
                data-ocid="upi-utr-cancel-btn"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onPaymentDone(utrInput.trim());
                  setShowUtrDialog(false);
                  setUtrInput("");
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-ocid="upi-utr-confirm-btn"
              >
                ✅ Confirm & Save Receipt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LabelValue({
  label,
  value,
  red,
}: { label: string; value: string | undefined; red?: boolean }) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight">
        {label}
      </span>
      <span
        className={`text-[11px] font-semibold truncate leading-tight mt-0.5 ${red ? "text-red-600" : "text-foreground"}`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CollectFees() {
  const { currentUser, currentSession, isReadOnly, addNotification } = useApp();

  const [admNoInput, setAdmNoInput] = useState("");
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [oldBalance, setOldBalance] = useState(0);
  const [panelMonths, setPanelMonths] = useState<string[]>([]);
  const [cellAmounts, setCellAmounts] = useState<
    Record<string, Record<string, number>>
  >({});
  const [otherCharge, setOtherCharge] = useState<OtherChargeRow>({
    label: "",
    paidAmount: 0,
    dueAmount: 0,
  });
  const [paymentMode, setPaymentMode] =
    useState<FeeReceipt["paymentMode"]>("Cash");
  const [receiptDate, setReceiptDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [remarks, setRemarks] = useState("");
  const [lateFees, setLateFees] = useState(0);
  const [concessionAmt, setConcessionAmt] = useState(0);
  const [receiptAmt, setReceiptAmt] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [feeLoadState, setFeeLoadState] = useState<
    "idle" | "loading" | "loaded" | "empty"
  >("idle");

  const [receiptHistory, setReceiptHistory] = useState<FeeReceipt[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [savedReceipt, setSavedReceipt] = useState<FeeReceipt | null>(null);
  const [printDone, setPrintDone] = useState(false);
  const [waDone, setWaDone] = useState(false);
  const [waSending, setWaSending] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editState, setEditState] = useState<EditReceiptState | null>(null);
  const [familyOpen, setFamilyOpen] = useState(true);
  const [familyMembers, setFamilyMembers] = useState<Student[]>([]);

  const isSuperAdmin = currentUser?.role === "superadmin";
  const canEdit =
    isSuperAdmin ||
    currentUser?.role === "admin" ||
    currentUser?.role === "accountant";

  // Stable handlers — never recreated, prevents focus loss
  const handleLateFeesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setLateFees(
        Math.max(
          0,
          Number(
            e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"),
          ) || 0,
        ),
      ),
    [],
  );
  const handleConcessionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setConcessionAmt(
        Math.max(
          0,
          Number(
            e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"),
          ) || 0,
        ),
      ),
    [],
  );
  const handleReceiptAmtChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setReceiptAmt(
        Math.max(
          0,
          Number(
            e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"),
          ) || 0,
        ),
      ),
    [],
  );
  const handleRemarksChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setRemarks(e.target.value),
    [],
  );
  const handleOtherLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setOtherCharge((p) => ({ ...p, label: e.target.value })),
    [],
  );
  const handleOtherAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setOtherCharge((p) => ({
        ...p,
        paidAmount: Math.max(
          0,
          Number(
            e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"),
          ) || 0,
        ),
      })),
    [],
  );

  // Debounced server search
  const handleAdmNoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setAdmNoInput(val);
      if (!val) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const result = await phpApiService.getStudents({
            search: val,
            limit: "8",
          });
          const mapped = (result.data ?? []).map(toStudent);
          setSearchResults(mapped);
          setShowDropdown(mapped.length > 0);
        } catch {
          setSearchResults([]);
          setShowDropdown(false);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    },
    [],
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      )
        setShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function getPaidMonths(receipts: FeeReceipt[], headingId: string): string[] {
    const sessionId = currentSession?.id ?? "";
    const paid: string[] = [];
    for (const r of receipts) {
      if (r.sessionId === sessionId && !r.isDeleted) {
        for (const item of r.items) {
          if (item.headingId === headingId && !paid.includes(item.month))
            paid.push(item.month);
        }
      }
    }
    return paid;
  }

  function calcOldBalance(receipts: FeeReceipt[]): number {
    const sessionId = currentSession?.id ?? "";
    const remaining = receipts
      .filter((r) => r.sessionId === sessionId && !r.isDeleted)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (remaining.length === 0) return 0;
    return remaining[remaining.length - 1].balance ?? 0;
  }

  async function loadStudentFees(student: Student) {
    if (!currentSession) return;
    setFeeLoadState("loading");
    try {
      // Load receipts from server
      const rawReceipts = await phpApiService.getReceipts(student.id);
      const receipts = rawReceipts as unknown as FeeReceipt[];
      setReceiptHistory(
        receipts
          .filter((r) => !r.isDeleted)
          .sort((a, b) => b.date.localeCompare(a.date)),
      );

      // Load fee plan from server
      const planItems = await phpApiService.getFeePlan(
        student.class,
        student.section,
      );
      // Load fee headings
      const headings = await phpApiService.getFeeHeadings();

      const newRows: ReceiptRow[] = [];
      for (const plan of planItems) {
        const heading = headings.find((h) => h.id === plan.headingId);
        if (!heading) continue;
        if (!plan.amount || plan.amount === 0) continue;
        const months = safeMonths(
          heading.months as string[] | string | undefined,
        );
        const paidMonths = getPaidMonths(receipts, heading.id);
        newRows.push({
          headingId: heading.id,
          headingName: heading.name,
          applicableMonths: months,
          amount: plan.amount,
          paidMonths,
          checked: true,
        });
      }

      setRows(newRows);

      // Auto-select April through current month (not already paid)
      const jsMonth = new Date().getMonth();
      const currentAcademicIdx = jsMonth >= 3 ? jsMonth - 3 : jsMonth + 9;
      const applicableSet = new Set(newRows.flatMap((r) => r.applicableMonths));
      const autoSelected = MONTHS.slice(0, currentAcademicIdx + 1).filter((m) =>
        applicableSet.has(m),
      );
      setPanelMonths(
        autoSelected.length > 0
          ? autoSelected
          : MONTHS.filter((m) => applicableSet.has(m)),
      );
      setCellAmounts({});

      const bal = calcOldBalance(receipts);
      setOldBalance(bal);
      setLateFees(0);
      setConcessionAmt(0);
      setRemarks("");

      setFeeLoadState(newRows.length === 0 ? "empty" : "loaded");
    } catch {
      setFeeLoadState("empty");
    }
  }

  function selectStudent(student: Student) {
    // IMPORTANT: close dropdown before anything else — prevents stale UI
    setShowDropdown(false);
    setAdmNoInput("");
    setSearchResults([]);
    setSelectedStudent(student);
    setErrorMsg("");
    setOtherCharge({ label: "", paidAmount: 0, dueAmount: 0 });
    setFamilyMembers([]);
    void loadStudentFees(student);
    // Load family (same guardian mobile)
    const pm =
      student.fatherMobile?.trim() || student.guardianMobile?.trim() || "";
    if (pm) {
      phpApiService
        .getStudents({ search: pm, limit: "10" })
        .then((r) => {
          const others = r.data
            .map(toStudent)
            .filter(
              (s) =>
                s.id !== student.id &&
                s.status === "active" &&
                (s.fatherMobile?.trim() === pm ||
                  s.guardianMobile?.trim() === pm),
            );
          setFamilyMembers(others);
        })
        .catch(() => {
          /* silent */
        });
    }
  }

  function clearStudent() {
    setSelectedStudent(null);
    setAdmNoInput("");
    setSearchResults([]);
    setRows([]);
    setPanelMonths([]);
    setOldBalance(0);
    setLateFees(0);
    setConcessionAmt(0);
    setReceiptAmt(0);
    setRemarks("");
    setOtherCharge({ label: "", paidAmount: 0, dueAmount: 0 });
    setErrorMsg("");
    setFeeLoadState("idle");
    setReceiptHistory([]);
    setFamilyMembers([]);
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  const applicableMonths = MONTHS.filter((m) =>
    rows.some((r) => r.applicableMonths.includes(m)),
  );
  function isMonthFullyPaid(month: string): boolean {
    const applicable = rows.filter((r) => r.applicableMonths.includes(month));
    return (
      applicable.length > 0 &&
      applicable.every((r) => r.paidMonths.includes(month))
    );
  }
  function togglePanelMonth(month: string) {
    if (isMonthFullyPaid(month)) return;
    setPanelMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month],
    );
  }
  const unpaidApplicable = applicableMonths.filter((m) => !isMonthFullyPaid(m));
  const allSelected =
    unpaidApplicable.length > 0 &&
    unpaidApplicable.every((m) => panelMonths.includes(m));

  function getRowSelectedMonths(row: ReceiptRow): string[] {
    return panelMonths.filter(
      (m) => row.applicableMonths.includes(m) && !row.paidMonths.includes(m),
    );
  }

  const feesSubtotal = rows
    .filter((r) => r.checked)
    .flatMap((row) =>
      getRowSelectedMonths(row).map(
        (m) => cellAmounts[row.headingId]?.[m] ?? row.amount,
      ),
    )
    .reduce((a, b) => a + b, 0);

  const otherTotal = otherCharge.paidAmount > 0 ? otherCharge.paidAmount : 0;
  const totalFees = feesSubtotal + otherTotal;
  const netFees = Math.max(
    0,
    totalFees + oldBalance + lateFees - concessionAmt,
  );
  const balanceAmt = netFees - receiptAmt;

  useEffect(() => {
    setReceiptAmt(netFees);
  }, [netFees]);

  // Receipt number
  function nextReceiptNo(): string {
    const yy = String(new Date().getFullYear()).slice(-2);
    const seq = (receiptHistory.length + 1).toString().padStart(4, "0");
    return `R${yy}-${seq}`;
  }

  // ── Save receipt ──────────────────────────────────────────────────────────
  async function handleSave(upiUtr?: string) {
    if (!selectedStudent || !currentSession || isReadOnly) return;
    setErrorMsg("");
    if (
      panelMonths.length === 0 &&
      otherCharge.paidAmount === 0 &&
      oldBalance === 0
    ) {
      setErrorMsg("Please select at least one month.");
      return;
    }
    if (receiptAmt <= 0) {
      setErrorMsg("Cannot save receipt with ₹0 amount.");
      return;
    }

    const receiptItems: FeeReceipt["items"] = [];
    for (const row of rows.filter((r) => r.checked)) {
      for (const month of getRowSelectedMonths(row)) {
        const amt = cellAmounts[row.headingId]?.[month] ?? row.amount;
        if (amt > 0)
          receiptItems.push({
            headingId: row.headingId,
            headingName: row.headingName,
            month,
            amount: amt,
          });
      }
    }
    const otherCharges =
      otherCharge.label && otherCharge.paidAmount > 0 ? [otherCharge] : [];
    const finalMode: FeeReceipt["paymentMode"] = upiUtr ? "UPI" : paymentMode;
    const receipt: FeeReceipt = {
      id: generateId(),
      receiptNo: nextReceiptNo(),
      studentId: selectedStudent.id,
      studentName: selectedStudent.fullName,
      admNo: selectedStudent.admNo,
      class: selectedStudent.class,
      section: selectedStudent.section,
      date: formatDate(new Date(`${receiptDate}T00:00:00`)),
      items: receiptItems,
      otherCharges,
      discount: concessionAmt,
      oldBalance,
      totalAmount: netFees,
      paidAmount: receiptAmt,
      balance: balanceAmt,
      paymentMode: finalMode,
      receivedBy: currentUser?.fullName ?? currentUser?.name ?? "Staff",
      receivedByRole: currentUser?.role ?? "admin",
      sessionId: currentSession.id,
      template: 4,
    };

    try {
      const result = await phpApiService.collectFees(
        receipt as unknown as Record<string, unknown>,
      );
      const savedNo =
        (result as { receiptNo?: string }).receiptNo ?? receipt.receiptNo;
      const savedR = { ...receipt, receiptNo: savedNo };
      setSavedReceipt(savedR);
      addNotification(
        `💰 Fee receipt saved: ${formatCurrency(receiptAmt)} for ${selectedStudent.fullName}`,
        "success",
      );
      setPrintDone(false);
      setWaDone(false);
      setShowDialog(true);
      setOtherCharge({ label: "", paidAmount: 0, dueAmount: 0 });
      // Reload fees to reflect new payment
      void loadStudentFees(selectedStudent);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Save failed. Please try again.",
      );
    }
  }

  async function handleWhatsApp() {
    if (!savedReceipt || !selectedStudent) return;
    setWaSending(true);
    const school = ls.get<{ name: string }>("school_profile", {
      name: "School",
    });
    const months = [...new Set(savedReceipt.items.map((i) => i.month))];
    const msg = buildFeeReceiptMessage(
      savedReceipt.studentName,
      savedReceipt.receiptNo,
      savedReceipt.totalAmount,
      months,
      school.name,
    );
    const phone =
      selectedStudent.guardianMobile ||
      selectedStudent.fatherMobile ||
      selectedStudent.mobile;
    await sendWhatsApp(phone, msg);
    setWaSending(false);
    setWaDone(true);
  }

  async function handleDeleteReceipt(receiptId: string) {
    if (!isSuperAdmin) return;
    if (!confirm("Delete this receipt? This cannot be undone.")) return;
    try {
      await phpApiService.post("fees/receipts/delete", { id: receiptId });
      addNotification("Receipt deleted", "info");
      if (selectedStudent) void loadStudentFees(selectedStudent);
    } catch (err) {
      addNotification(
        `Delete failed: ${err instanceof Error ? err.message : "Unknown"}`,
        "error",
      );
    }
  }

  function openEditReceipt(r: FeeReceipt) {
    const headingMap: Record<
      string,
      { headingId: string; headingName: string; months: string[]; rate: number }
    > = {};
    for (const item of r.items) {
      if (!headingMap[item.headingId])
        headingMap[item.headingId] = {
          headingId: item.headingId,
          headingName: item.headingName,
          months: [],
          rate: item.amount,
        };
      headingMap[item.headingId].months.push(item.month);
    }
    setEditState({
      receiptId: r.id,
      date: r.date,
      paymentMode: r.paymentMode,
      paidAmount: r.paidAmount ?? r.totalAmount,
      discount: r.discount ?? 0,
      selectedMonths: [...new Set(r.items.map((i) => i.month))],
      headings: Object.values(headingMap),
    });
    setEditOpen(true);
  }

  async function saveEditReceipt() {
    if (!editState || !selectedStudent) return;
    const newItems: FeeReceipt["items"] = [];
    for (const h of editState.headings) {
      for (const m of editState.selectedMonths) {
        newItems.push({
          headingId: h.headingId,
          headingName: h.headingName,
          month: m,
          amount: h.rate,
        });
      }
    }
    const newTotal =
      newItems.reduce((s, i) => s + i.amount, 0) - editState.discount;
    try {
      await phpApiService.put("fees/receipts/update", {
        id: editState.receiptId,
        date: editState.date,
        paymentMode: editState.paymentMode,
        items: newItems,
        discount: editState.discount,
        totalAmount: newTotal,
        paidAmount: editState.paidAmount,
      });
      setEditOpen(false);
      setEditState(null);
      addNotification("✅ Receipt updated", "success");
      void loadStudentFees(selectedStudent);
    } catch (err) {
      addNotification(
        `Update failed: ${err instanceof Error ? err.message : "Unknown"}`,
        "error",
      );
    }
  }

  const displayMonths =
    panelMonths.length > 0
      ? panelMonths
      : MONTHS.filter((m) => applicableMonths.includes(m));
  const isCredit = balanceAmt < 0;
  const isDue = balanceAmt > 0;
  const isOldCredit = oldBalance < 0;
  const isOldDue = oldBalance > 0;

  return (
    <div className="space-y-0 flex flex-col gap-0">
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2.5 text-xs mb-2">
          ⚠️ Archived session — read-only mode. Fee collection is disabled.
        </div>
      )}

      {/* TOP ACTION BAR */}
      <div className="bg-card border border-border rounded-t-xl border-b-0 shadow-sm">
        <div className="px-3 py-2 flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-0.5">
            <label
              htmlFor="receipt-date"
              className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider"
            >
              Date
            </label>
            <input
              id="receipt-date"
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              className="h-7 px-2 text-xs border border-input rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 w-32"
              data-ocid="collect-fees-date"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
              Receipt No.
            </span>
            <div className="h-7 px-2 flex items-center text-xs font-mono font-bold bg-muted/40 border border-border rounded text-primary w-28">
              {nextReceiptNo()}
            </div>
          </div>

          {/* Search — hidden once student selected */}
          {!selectedStudent && (
            <div
              ref={dropdownRef}
              className="relative flex flex-col gap-0.5 flex-1 min-w-[180px]"
            >
              <label
                htmlFor="adm-no-search"
                className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider"
              >
                Admission No. / Name
              </label>
              <div className="relative">
                <input
                  id="adm-no-search"
                  type="text"
                  placeholder="Search by Adm No or Name..."
                  value={admNoInput}
                  onChange={handleAdmNoChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchResults.length > 0)
                      selectStudent(searchResults[0]);
                  }}
                  className="h-7 w-full px-2 pr-7 text-xs border border-input rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  data-ocid="collect-fees-search"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[11px]">
                  {isSearching ? "⏳" : "🔍"}
                </span>
              </div>
              {showDropdown && (
                <div className="absolute z-40 top-full left-0 right-0 bg-card border border-border rounded-lg shadow-elevated mt-0.5 max-h-52 overflow-y-auto">
                  {searchResults.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="w-full text-left px-2.5 py-1.5 hover:bg-muted/50 text-xs flex items-center gap-2 border-b border-border last:border-0"
                      onClick={() => selectStudent(s)}
                    >
                      {s.photo ? (
                        <img
                          src={s.photo}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] flex-shrink-0">
                          {s.fullName[0]}
                        </div>
                      )}
                      <span className="min-w-0">
                        <span className="font-semibold block truncate">
                          {s.fullName}
                        </span>
                        <span className="text-muted-foreground text-[10px]">
                          {s.admNo} · Cls {s.class}-{s.section}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected student chip */}
          {selectedStudent && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-lg px-2.5 py-1 min-w-0">
                <span className="text-[10px] font-bold text-primary truncate">
                  {selectedStudent.fullName}
                </span>
                <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                  #{selectedStudent.admNo} · {selectedStudent.class}-
                  {selectedStudent.section}
                </span>
              </div>
              <button
                type="button"
                onClick={clearStudent}
                className="h-7 px-2 text-[10px] font-semibold rounded border border-border hover:bg-muted/50 transition-colors text-muted-foreground whitespace-nowrap flex-shrink-0"
                data-ocid="collect-fees-change-student"
              >
                Change
              </button>
            </div>
          )}

          <div className="flex items-end gap-1.5 flex-wrap ml-auto">
            {canEdit && (
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isReadOnly || !selectedStudent}
                className="h-7 px-3 text-xs font-bold rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                data-ocid="collect-fees-save"
              >
                💾 Save
              </button>
            )}
            {savedReceipt && (
              <button
                type="button"
                onClick={() => savedReceipt && printReceiptHTML(savedReceipt)}
                className="h-7 px-3 text-xs font-bold rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                data-ocid="collect-fees-print"
              >
                🖨️ Print
              </button>
            )}
            <button
              type="button"
              onClick={clearStudent}
              className="h-7 px-3 text-xs font-bold rounded border border-border hover:bg-muted/50 transition-colors text-muted-foreground"
              data-ocid="collect-fees-close"
            >
              ✕ Clear
            </button>
          </div>
        </div>
      </div>

      {/* STUDENT INFO + MONTHS PANEL */}
      {selectedStudent ? (
        <div className="flex border border-border border-t-0 bg-card shadow-sm">
          <div
            className="flex flex-col"
            style={{ minWidth: 360, maxWidth: 480 }}
          >
            <div className="flex gap-3 p-3 border-b border-border bg-muted/20">
              <div className="w-[64px] h-[72px] rounded border-2 border-border bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
                {selectedStudent.photo ? (
                  <img
                    src={selectedStudent.photo}
                    alt={selectedStudent.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl">👤</span>
                )}
              </div>
              <div className="flex flex-col justify-center gap-0.5 min-w-0">
                <div className="text-sm font-bold text-foreground truncate">
                  {selectedStudent.fullName}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Adm No:{" "}
                  <span className="font-bold text-primary font-mono">
                    {selectedStudent.admNo}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Class:{" "}
                  <span className="font-bold text-foreground">
                    {selectedStudent.class} - {selectedStudent.section}
                  </span>
                </div>
              </div>
              {isOldDue && (
                <div className="ml-auto flex-shrink-0 flex flex-col items-center justify-center bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 text-center">
                  <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider">
                    Old Balance
                  </span>
                  <span className="text-base font-extrabold text-red-600 leading-tight">
                    ₹{oldBalance.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
              {isOldCredit && (
                <div className="ml-auto flex-shrink-0 flex flex-col items-center justify-center bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-center">
                  <span className="text-[9px] font-bold text-green-600 uppercase tracking-wider">
                    Credit Balance
                  </span>
                  <span className="text-base font-extrabold text-green-700 leading-tight">
                    -₹{Math.abs(oldBalance).toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </div>
            <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-2">
              <LabelValue
                label="Father's Name"
                value={selectedStudent.fatherName}
              />
              <LabelValue
                label="Mother's Name"
                value={selectedStudent.motherName}
              />
              <LabelValue
                label="Category"
                value={selectedStudent.category || "General"}
              />
              <LabelValue
                label="Contact No."
                value={
                  selectedStudent.guardianMobile ||
                  selectedStudent.fatherMobile ||
                  selectedStudent.mobile ||
                  "—"
                }
              />
            </div>
          </div>
          <div className="w-px bg-border flex-shrink-0" />
          {/* Month Selector */}
          <div className="flex flex-col flex-shrink-0 w-[148px] bg-muted/20">
            <div className="px-2.5 py-2 bg-primary/10 border-b border-border">
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
                Select Month ({panelMonths.length})
              </p>
            </div>
            <div className="px-2.5 py-1.5 border-b border-border">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) =>
                    setPanelMonths(e.target.checked ? unpaidApplicable : [])
                  }
                  className="w-3 h-3 accent-primary"
                  data-ocid="month-select-all"
                />
                <span className="text-[11px] font-semibold text-foreground">
                  Select All
                </span>
              </label>
            </div>
            <div className="flex-1 overflow-y-auto">
              {MONTHS.map((month, idx) => {
                const short = MONTH_SHORT[idx];
                const isApplicable = applicableMonths.includes(month);
                const isFullPaid = isMonthFullyPaid(month);
                const isChecked = panelMonths.includes(month);
                if (!isApplicable)
                  return (
                    <div
                      key={month}
                      className="px-2.5 py-1 flex items-center gap-1.5 opacity-25"
                    >
                      <div className="w-3 h-3 rounded border border-border bg-muted/50" />
                      <span className="text-[11px] text-muted-foreground">
                        {short}
                      </span>
                    </div>
                  );
                if (isFullPaid)
                  return (
                    <div
                      key={month}
                      className="px-2.5 py-1 flex items-center gap-1.5 bg-green-50"
                    >
                      <span className="text-green-600 text-[11px] w-3 text-center">
                        ✓
                      </span>
                      <span className="text-[11px] text-green-600 line-through font-medium">
                        {short}
                      </span>
                      <span className="ml-auto text-[9px] text-green-500 font-bold">
                        Paid
                      </span>
                    </div>
                  );
                return (
                  <label
                    key={month}
                    className={`px-2.5 py-1 flex items-center gap-1.5 cursor-pointer hover:bg-primary/5 transition-colors ${isChecked ? "bg-primary/10" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => togglePanelMonth(month)}
                      className="w-3 h-3 accent-primary"
                      data-ocid="month-checkbox"
                    />
                    <span
                      className={`text-[11px] font-medium ${isChecked ? "text-primary font-semibold" : "text-foreground"}`}
                    >
                      {short}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border border-t-0 rounded-b-xl p-12 text-center">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-base font-semibold text-foreground mb-1">
            Search for a Student
          </p>
          <p className="text-sm text-muted-foreground">
            Enter student name or admission number above.
          </p>
        </div>
      )}

      {/* FAMILY MEMBERS */}
      {selectedStudent && familyMembers.length > 0 && (
        <div className="bg-card border border-border border-t-0 shadow-sm">
          <button
            type="button"
            className="w-full px-3 py-2 flex items-center gap-2 bg-violet-50 border-b border-border hover:bg-violet-100 transition-colors"
            onClick={() => setFamilyOpen((v) => !v)}
            data-ocid="family-members-toggle"
          >
            <span className="text-sm font-bold text-violet-700">
              👨‍👩‍👧 Family Members
            </span>
            <span className="text-xs bg-violet-200 text-violet-800 px-2 py-0.5 rounded-full font-semibold">
              {familyMembers.length} sibling
              {familyMembers.length !== 1 ? "s" : ""}
            </span>
            <span className="text-xs text-violet-600 ml-auto">
              {familyOpen ? "▲ Collapse" : "▼ Expand"}
            </span>
          </button>
          {familyOpen && (
            <div className="p-3 flex flex-wrap gap-3">
              {familyMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  data-ocid="family-member-card"
                  onClick={() => selectStudent(member)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-violet-300 hover:bg-violet-50 transition-all group min-w-[200px] max-w-[280px] bg-background"
                >
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-base flex-shrink-0">
                    {member.fullName[0]}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-semibold text-foreground truncate group-hover:text-violet-700">
                      {member.fullName}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Class {member.class}-{member.section} · #{member.admNo}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FEE GRID */}
      {selectedStudent && (
        <div className="bg-card border border-border border-t-0 shadow-sm overflow-hidden">
          {feeLoadState === "loading" && (
            <div
              className="p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground"
              data-ocid="fee-grid-loading"
            >
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium">Loading fee data…</p>
            </div>
          )}
          {feeLoadState === "empty" && (
            <div
              className="p-8 text-center text-muted-foreground"
              data-ocid="fee-grid-empty"
            >
              <div className="text-3xl mb-2">📋</div>
              <p className="text-sm font-medium mb-1">
                No fee plan configured for Class {selectedStudent.class}-
                {selectedStudent.section}
              </p>
              <p className="text-xs opacity-70">
                Go to Fees → Fees Plan and set up a plan for this class first.
              </p>
            </div>
          )}
          {feeLoadState === "loaded" && rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/70">
                    <th className="border border-border px-2 py-1.5 text-center font-bold sticky left-0 bg-muted/70 w-8">
                      #
                    </th>
                    <th className="border border-border px-3 py-1.5 text-left font-bold sticky left-8 bg-muted/70 min-w-[140px]">
                      Fees Head
                    </th>
                    <th className="border border-border px-2 py-1.5 font-bold text-center bg-muted/70 w-16">
                      Rate/Mo
                    </th>
                    {displayMonths.map((m) => (
                      <th
                        key={m}
                        className="border border-border px-1.5 py-1.5 font-bold min-w-[44px] text-center bg-muted/70"
                      >
                        {MONTH_SHORT[MONTHS.indexOf(m)] ?? m.slice(0, 3)}
                      </th>
                    ))}
                    <th className="border border-border px-2 py-1.5 font-bold text-right bg-muted/70 sticky right-0 w-20">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIdx) => {
                    const rowTotal = displayMonths.reduce((sum, m) => {
                      if (
                        !row.applicableMonths.includes(m) ||
                        row.paidMonths.includes(m) ||
                        !row.checked
                      )
                        return sum;
                      return (
                        sum + (cellAmounts[row.headingId]?.[m] ?? row.amount)
                      );
                    }, 0);
                    return (
                      <tr
                        key={row.headingId}
                        className={`hover:bg-muted/10 ${!row.checked ? "opacity-50" : ""}`}
                      >
                        <td className="border border-border px-2 py-1 text-center sticky left-0 bg-card">
                          <input
                            type="checkbox"
                            checked={row.checked}
                            onChange={() =>
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.headingId === row.headingId
                                    ? { ...r, checked: !r.checked }
                                    : r,
                                ),
                              )
                            }
                            className="w-3 h-3 accent-primary"
                          />
                        </td>
                        <td className="border border-border px-3 py-1 font-medium sticky left-8 bg-card text-[11px]">
                          {rowIdx + 1}. {row.headingName}
                        </td>
                        <td className="border border-border px-2 py-1 text-center text-muted-foreground text-[11px]">
                          ₹{row.amount}
                        </td>
                        {displayMonths.map((month) => {
                          const isApplicable =
                            row.applicableMonths.includes(month);
                          const isPaid = row.paidMonths.includes(month);
                          if (!isApplicable)
                            return (
                              <td
                                key={month}
                                className="border border-border px-1.5 py-1 text-center bg-muted/20"
                              >
                                <span className="text-muted-foreground/30 text-xs">
                                  —
                                </span>
                              </td>
                            );
                          if (isPaid)
                            return (
                              <td
                                key={month}
                                className="border border-border px-1.5 py-1 text-center bg-green-50"
                              >
                                <span className="text-green-600 text-[11px] font-bold">
                                  ✓
                                </span>
                              </td>
                            );
                          if (!panelMonths.includes(month))
                            return (
                              <td
                                key={month}
                                className="border border-border px-1.5 py-1 text-center bg-muted/10"
                              >
                                <span className="text-muted-foreground/50 text-[10px]">
                                  —
                                </span>
                              </td>
                            );
                          const amt =
                            cellAmounts[row.headingId]?.[month] ?? row.amount;
                          return (
                            <td
                              key={month}
                              className="border border-border px-1 py-0.5 text-center bg-primary/5"
                            >
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={amt}
                                onChange={(e) => {
                                  const val = Math.max(
                                    0,
                                    Number(
                                      e.target.value
                                        .replace(/[^0-9.]/g, "")
                                        .replace(/(\..*)\./g, "$1"),
                                    ) || 0,
                                  );
                                  setCellAmounts((prev) => ({
                                    ...prev,
                                    [row.headingId]: {
                                      ...prev[row.headingId],
                                      [month]: val,
                                    },
                                  }));
                                }}
                                className="w-[48px] h-5 px-1 text-center text-[11px] border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                                disabled={!row.checked}
                              />
                            </td>
                          );
                        })}
                        <td className="border border-border px-2 py-1 text-right font-semibold sticky right-0 bg-card text-[11px]">
                          {rowTotal > 0
                            ? `₹${rowTotal.toLocaleString("en-IN")}`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Other Charges */}
                  <tr className="bg-amber-50/40">
                    <td className="border border-border px-2 py-1 text-center sticky left-0 bg-amber-50/40">
                      <span className="text-amber-600 text-xs">+</span>
                    </td>
                    <td className="border border-border px-2 py-1 sticky left-8 bg-amber-50/40">
                      <input
                        type="text"
                        placeholder="Other fee label..."
                        value={otherCharge.label}
                        onChange={handleOtherLabelChange}
                        className="w-full h-5 px-2 text-[11px] border border-input rounded bg-background focus:outline-none italic"
                        data-ocid="other-charge-label"
                      />
                    </td>
                    <td className="border border-border px-1 py-1 text-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="0"
                        value={otherCharge.paidAmount || ""}
                        onChange={handleOtherAmountChange}
                        className="w-14 h-5 px-1 text-center text-[11px] border border-input rounded bg-background focus:outline-none"
                        data-ocid="other-charge-paid"
                      />
                    </td>
                    <td
                      colSpan={displayMonths.length}
                      className="border border-border px-2 py-1 text-[10px] text-muted-foreground italic"
                    >
                      Other / miscellaneous
                    </td>
                    <td className="border border-border px-2 py-1 text-right font-semibold sticky right-0 bg-amber-50/40 text-[11px]">
                      {otherCharge.paidAmount > 0
                        ? `₹${otherCharge.paidAmount.toLocaleString("en-IN")}`
                        : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TOTALS + PAYMENT */}
      {selectedStudent && rows.length > 0 && (
        <div className="bg-card border border-border border-t-0 shadow-sm overflow-hidden">
          <div className="flex flex-wrap divide-y sm:divide-y-0 sm:divide-x divide-border">
            <div className="p-3 flex flex-col gap-1 min-w-[170px]">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Fee Summary
              </p>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Fee Installments</span>
                <span className="font-semibold">
                  ₹{feesSubtotal.toLocaleString("en-IN")}
                </span>
              </div>
              {otherTotal > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    {otherCharge.label || "Other"}
                  </span>
                  <span className="font-semibold">
                    ₹{otherTotal.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
              {isOldDue && (
                <div className="flex justify-between text-[11px] text-red-600">
                  <span>Old Balance</span>
                  <span className="font-bold">
                    + ₹{oldBalance.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
              {isOldCredit && (
                <div className="flex justify-between text-[11px] text-green-600">
                  <span>Credit Balance</span>
                  <span className="font-bold">
                    -₹{Math.abs(oldBalance).toLocaleString("en-IN")}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[11px] font-bold border-t border-border pt-1">
                <span>Total Fees</span>
                <span>₹{(totalFees + oldBalance).toLocaleString("en-IN")}</span>
              </div>
            </div>
            <div className="p-3 flex flex-col gap-1.5 min-w-[180px]">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Adjustments
              </p>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="late-fees-input"
                  className="text-[11px] text-muted-foreground w-20 flex-shrink-0"
                >
                  Late Fees ₹
                </label>
                <input
                  id="late-fees-input"
                  type="text"
                  inputMode="numeric"
                  value={lateFees || ""}
                  placeholder="0"
                  onChange={handleLateFeesChange}
                  className="w-20 h-5 px-1.5 text-[11px] text-right border border-input rounded bg-background focus:outline-none"
                  data-ocid="late-fees-input"
                />
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="concession-amt-input"
                  className="text-[11px] text-muted-foreground w-20 flex-shrink-0"
                >
                  Concession ₹
                </label>
                <input
                  id="concession-amt-input"
                  type="text"
                  inputMode="numeric"
                  value={concessionAmt || ""}
                  placeholder="0"
                  onChange={handleConcessionChange}
                  className="w-20 h-5 px-1.5 text-[11px] text-right border border-input rounded bg-background focus:outline-none"
                  data-ocid="concession-amt-input"
                />
              </div>
            </div>
            <div className="p-3 flex flex-col gap-1.5 min-w-[200px]">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Net Fees
              </p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">
                  Net Fees
                </span>
                <span className="text-base font-extrabold text-primary">
                  ₹{netFees.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="receipt-amt-input"
                  className="text-[11px] text-muted-foreground flex-shrink-0 w-20"
                >
                  Receipt Amt ₹
                </label>
                <input
                  id="receipt-amt-input"
                  type="text"
                  inputMode="numeric"
                  value={receiptAmt || ""}
                  placeholder="0"
                  onChange={handleReceiptAmtChange}
                  className="w-24 h-6 px-2 text-[11px] text-right border border-input rounded bg-background font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"
                  data-ocid="receipt-amt-input"
                />
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span
                  className={`text-[11px] font-semibold ${isDue ? "text-red-600" : isCredit ? "text-green-600" : "text-muted-foreground"}`}
                >
                  {isCredit ? "Credit Balance" : "Balance Amt"}
                </span>
                <span
                  className={`text-sm font-extrabold ${isDue ? "text-red-600" : isCredit ? "text-green-600" : "text-muted-foreground"}`}
                >
                  {isCredit
                    ? `-₹${Math.abs(balanceAmt).toLocaleString("en-IN")}`
                    : `₹${balanceAmt.toLocaleString("en-IN")}`}
                </span>
              </div>
            </div>
            <div className="p-3 flex flex-col gap-2 min-w-[220px]">
              <div>
                <label
                  htmlFor="remarks-input"
                  className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5"
                >
                  Remarks
                </label>
                <input
                  id="remarks-input"
                  type="text"
                  value={remarks}
                  onChange={handleRemarksChange}
                  placeholder="Any notes..."
                  className="w-full h-6 px-2 text-[11px] border border-input rounded bg-background focus:outline-none"
                  data-ocid="remarks-input"
                />
              </div>
              <div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Payment Mode
                </p>
                <div className="flex flex-wrap gap-1">
                  {(["Cash", "Cheque", "Online", "DD", "UPI"] as const).map(
                    (mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMode(mode)}
                        className={`px-2 py-0.5 text-[10px] rounded-full border font-semibold transition-colors ${paymentMode === mode ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/60 text-foreground"}`}
                        data-ocid={`payment-mode-${mode.toLowerCase()}`}
                      >
                        {mode}
                      </button>
                    ),
                  )}
                </div>
              </div>
              {errorMsg && (
                <div
                  className="bg-red-50 border border-red-200 text-red-700 rounded px-2 py-1.5 text-[10px]"
                  data-ocid="fee-error-msg"
                >
                  ⚠️ {errorMsg}
                </div>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isReadOnly || netFees === 0}
                  className="mt-auto w-full h-8 rounded font-bold text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  data-ocid="collect-fees-save-bottom"
                >
                  💾 Save Receipt
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* UPI QR */}
      {selectedStudent && !isReadOnly && canEdit && (
        <UpiQrSection
          netPayable={netFees}
          studentName={selectedStudent.fullName}
          onPaymentDone={(utr) => void handleSave(utr)}
        />
      )}

      {/* PAYMENT HISTORY */}
      {selectedStudent && (
        <div className="bg-card border border-border border-t-0 rounded-b-xl shadow-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
              Payment History
            </h3>
            {receiptHistory.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                {receiptHistory.length}
              </Badge>
            )}
          </div>
          {receiptHistory.length === 0 ? (
            <div
              className="p-6 text-center text-muted-foreground"
              data-ocid="payment-history-empty"
            >
              <p className="text-sm">No payment history for this student.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-2.5 py-1.5 text-left font-semibold">
                      Sr.
                    </th>
                    <th className="px-2.5 py-1.5 text-left font-semibold">
                      Date
                    </th>
                    <th className="px-2.5 py-1.5 text-left font-semibold">
                      Receipt No
                    </th>
                    <th className="px-2.5 py-1.5 text-left font-semibold">
                      Months
                    </th>
                    <th className="px-2.5 py-1.5 text-right font-semibold">
                      Amount
                    </th>
                    <th className="px-2.5 py-1.5 text-left font-semibold">
                      Mode
                    </th>
                    <th className="px-2.5 py-1.5 text-center font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {receiptHistory.map((r, idx) => (
                    <tr
                      key={r.id}
                      className="border-t border-border hover:bg-muted/20"
                      data-ocid={`receipt-history-row.item.${idx + 1}`}
                    >
                      <td className="px-2.5 py-1.5 text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="px-2.5 py-1.5 text-muted-foreground whitespace-nowrap">
                        {r.date}
                      </td>
                      <td className="px-2.5 py-1.5 font-mono font-bold text-primary whitespace-nowrap">
                        <button
                          type="button"
                          className="hover:underline"
                          onClick={() => printReceiptHTML(r)}
                        >
                          {r.receiptNo}
                        </button>
                      </td>
                      <td className="px-2.5 py-1.5">
                        {[
                          ...new Set(r.items.map((i) => i.month.slice(0, 3))),
                        ].join(", ")}
                      </td>
                      <td className="px-2.5 py-1.5 text-right font-bold text-green-600 whitespace-nowrap">
                        {formatCurrency(r.paidAmount ?? r.totalAmount)}
                      </td>
                      <td className="px-2.5 py-1.5">
                        <Badge
                          variant="outline"
                          className="text-[9px] h-4 px-1"
                        >
                          {r.paymentMode}
                        </Badge>
                      </td>
                      <td className="px-2.5 py-1.5">
                        <div className="flex gap-1 justify-center flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-5 text-[9px] px-1.5"
                            onClick={() => printReceiptHTML(r)}
                            data-ocid={`reprint-receipt-btn.${idx + 1}`}
                          >
                            🖨️ Reprint
                          </Button>
                          {(isSuperAdmin || currentUser?.role === "admin") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-5 text-[9px] px-1.5 text-amber-600 border-amber-200 hover:bg-amber-50"
                              onClick={() => openEditReceipt(r)}
                              data-ocid={`edit-receipt-btn.${idx + 1}`}
                            >
                              ✏️ Edit
                            </Button>
                          )}
                          {isSuperAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-5 text-[9px] px-1.5 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => void handleDeleteReceipt(r.id)}
                              data-ocid={`delete-receipt-btn.${idx + 1}`}
                            >
                              🗑️ Del
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Post-save Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm" data-ocid="receipt-saved-dialog">
          <DialogHeader>
            <DialogTitle>✅ Receipt Saved Successfully</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
              <p className="font-bold text-base font-mono">
                {savedReceipt?.receiptNo}
              </p>
              <p className="text-green-700">
                {savedReceipt?.studentName} —{" "}
                {formatCurrency(
                  savedReceipt?.paidAmount ?? savedReceipt?.totalAmount ?? 0,
                )}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => savedReceipt && printReceiptHTML(savedReceipt)}
                data-ocid="receipt-print-btn"
              >
                {printDone ? "✓ Printed" : "🖨️ Print Receipt"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleWhatsApp()}
                disabled={waSending || waDone}
                data-ocid="receipt-whatsapp-btn"
              >
                {waSending ? "Sending…" : waDone ? "✓ Sent" : "💬 WhatsApp"}
              </Button>
              <Button
                size="sm"
                onClick={() => setShowDialog(false)}
                data-ocid="receipt-close-btn"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Receipt Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md" data-ocid="edit-receipt-dialog">
          <DialogHeader>
            <DialogTitle>Edit Receipt</DialogTitle>
          </DialogHeader>
          {editState && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="edit-date"
                    className="text-sm font-medium block mb-1"
                  >
                    Date
                  </label>
                  <input
                    id="edit-date"
                    type="date"
                    value={editState.date}
                    onChange={(e) =>
                      setEditState((s) =>
                        s ? { ...s, date: e.target.value } : s,
                      )
                    }
                    className="w-full h-8 px-2 text-sm border border-input rounded bg-background focus:outline-none"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Mode</p>
                  <div className="flex flex-wrap gap-1">
                    {(["Cash", "Cheque", "Online", "DD", "UPI"] as const).map(
                      (mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() =>
                            setEditState((s) =>
                              s ? { ...s, paymentMode: mode } : s,
                            )
                          }
                          className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${editState.paymentMode === mode ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/50"}`}
                        >
                          {mode}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label
                  htmlFor="edit-paid-amt"
                  className="text-sm font-medium block mb-1"
                >
                  Amount Paid (₹)
                </label>
                <input
                  id="edit-paid-amt"
                  type="text"
                  inputMode="numeric"
                  value={editState.paidAmount}
                  onChange={(e) =>
                    setEditState((s) =>
                      s
                        ? {
                            ...s,
                            paidAmount:
                              Number(e.target.value.replace(/[^0-9.]/g, "")) ||
                              0,
                          }
                        : s,
                    )
                  }
                  className="w-full h-8 px-2 text-sm border border-input rounded bg-background focus:outline-none"
                />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditOpen(false);
                    setEditState(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={() => void saveEditReceipt()}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
