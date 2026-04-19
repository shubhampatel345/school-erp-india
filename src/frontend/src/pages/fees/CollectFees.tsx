import { useEffect, useRef, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { useApp } from "../../context/AppContext";
import type {
  FeeHeading,
  FeeReceipt,
  FeesPlan,
  SchoolProfile,
  Student,
} from "../../types";
import {
  MONTHS,
  MONTH_SHORT,
  formatCurrency,
  formatDate,
  generateId,
  ls,
} from "../../utils/localStorage";
import { buildFeeReceiptMessage, sendWhatsApp } from "../../utils/whatsapp";

// ── Types ──────────────────────────────────────────────────────────────────────
interface ReceiptRow {
  headingId: string;
  headingName: string;
  applicableMonths: string[];
  amount: number;
  paidMonths: string[];
  checked: boolean;
  isTransport?: boolean;
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
  otherLabel: string;
  otherAmount: number;
  selectedMonths: string[];
  headings: Array<{
    headingId: string;
    headingName: string;
    months: string[];
    rate: number;
  }>;
  itemAmounts: Record<string, Record<string, number>>;
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

function buildQRData(r: FeeReceipt): string {
  const months = [...new Set(r.items.map((i) => i.month))].join(",");
  return `Receipt:${r.receiptNo}|Student:${r.studentName}|Adm:${r.admNo}|Class:${r.class}-${r.section}|Amount:${r.totalAmount}|Date:${r.date}|Mode:${r.paymentMode}|Months:${months}`;
}

function printReceiptHTML(receipt: FeeReceipt, allReceipts: FeeReceipt[]) {
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
    if (!grouped[item.headingId]) {
      grouped[item.headingId] = {
        months: [],
        amount: item.amount,
        headingName: item.headingName,
      };
    }
    grouped[item.headingId].months.push(item.month);
  }

  const historyRows = allReceipts
    .filter((r) => r.studentId === receipt.studentId && !r.isDeleted)
    .sort((a, b) => a.date.localeCompare(b.date));

  const qrData = buildQRData(receipt);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(qrData)}`;
  const itemRows = Object.values(grouped)
    .map(
      (g, idx) =>
        `<tr><td>${idx + 1}</td><td>${g.headingName}</td><td>${g.months.map((m) => m.slice(0, 3)).join(",")}</td><td style="text-align:right">₹${(g.amount * g.months.length).toLocaleString("en-IN")}</td></tr>`,
    )
    .join("");
  const otherRows = (receipt.otherCharges ?? [])
    .filter((c) => c.paidAmount > 0)
    .map(
      (c) =>
        `<tr><td>-</td><td>${c.label}</td><td>-</td><td style="text-align:right">₹${c.paidAmount.toLocaleString("en-IN")}</td></tr>`,
    )
    .join("");

  const oldBalAbs = Math.abs(receipt.oldBalance ?? 0);
  const oldBalRow =
    (receipt.oldBalance ?? 0) > 0
      ? `<tr><td>-</td><td>Old Balance</td><td>-</td><td style="text-align:right;color:red">₹${oldBalAbs.toLocaleString("en-IN")}</td></tr>`
      : (receipt.oldBalance ?? 0) < 0
        ? `<tr><td>-</td><td>Advance/Credit</td><td>-</td><td style="text-align:right;color:green">-₹${oldBalAbs.toLocaleString("en-IN")}</td></tr>`
        : "";

  const discRow =
    receipt.discount > 0
      ? `<tr><td>-</td><td>Discount</td><td>-</td><td style="text-align:right;color:green">-₹${receipt.discount.toLocaleString("en-IN")}</td></tr>`
      : "";

  const bal = receipt.balance ?? 0;
  const balRow =
    receipt.paidAmount !== undefined &&
    receipt.paidAmount !== receipt.totalAmount
      ? bal < 0
        ? `<tr style="background:#f0fdf4"><td colspan="3"><b>Amount Paid</b></td><td style="text-align:right;font-weight:bold;color:green">₹${(receipt.paidAmount).toLocaleString("en-IN")}</td></tr><tr style="background:#f0fdf4"><td colspan="3"><b>Credit Balance</b></td><td style="text-align:right;font-weight:bold;color:green">-₹${Math.abs(bal).toLocaleString("en-IN")}</td></tr>`
        : bal > 0
          ? `<tr style="background:#f0fdf4"><td colspan="3"><b>Amount Paid</b></td><td style="text-align:right;font-weight:bold;color:green">₹${(receipt.paidAmount).toLocaleString("en-IN")}</td></tr><tr style="background:#fff5f5"><td colspan="3"><b>Balance Due</b></td><td style="text-align:right;font-weight:bold;color:red">₹${bal.toLocaleString("en-IN")}</td></tr>`
          : ""
      : "";

  const histHtml = historyRows
    .map((r) => {
      const months = [...new Set(r.items.map((i) => i.month.slice(0, 3)))].join(
        ",",
      );
      return `<tr><td>${r.date}</td><td>${r.receiptNo}</td><td>${months}</td><td style="text-align:right">₹${r.totalAmount.toLocaleString("en-IN")}</td><td>${r.receivedBy} (${r.receivedByRole})</td></tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fee Receipt - ${receipt.receiptNo}</title>
  <style>@page{size:105mm 145mm;margin:0}*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:9px;padding:4mm;background:#fff}.header{text-align:center;border-bottom:1.5px solid #000;padding-bottom:3px;margin-bottom:3px}.school-name{font-size:13px;font-weight:bold}.school-sub{font-size:7.5px;color:#333;line-height:1.4}.receipt-title{text-align:center;font-weight:bold;font-size:10px;letter-spacing:1px;margin:3px 0;border-top:1px solid #ccc;border-bottom:1px solid #ccc;padding:2px 0}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px 8px;margin:3px 0;font-size:8.5px}.lbl{color:#555}table{width:100%;border-collapse:collapse;margin:3px 0;font-size:8px}th,td{border:.5px solid #aaa;padding:1.5px 3px}th{background:#f2f2f2;font-weight:bold}.total-row td{font-weight:bold;font-size:9px;background:#f8f8f8}.qr-row{display:flex;justify-content:space-between;align-items:flex-end;margin-top:4px}.history-section{margin-top:4px;border-top:1px dashed #999;padding-top:3px}</style>
  </head><body>
  <div class="header"><div class="school-name">${school.name}</div><div class="school-sub">${school.address ? `${school.address}<br>` : ""}${[school.phone ? `Ph: ${school.phone}` : "", school.website || ""].filter(Boolean).join(" | ")}${school.affiliationNo ? `<br>Affiliation No: ${school.affiliationNo}` : ""}</div></div>
  <div class="receipt-title">CASH RECEIPT</div>
  <div class="info-grid"><div class="info-item"><span class="lbl">Receipt No:</span><b>${receipt.receiptNo}</b></div><div class="info-item"><span class="lbl">Date:</span>${receipt.date}</div><div class="info-item"><span class="lbl">Name:</span><b>${receipt.studentName}</b></div><div class="info-item"><span class="lbl">Adm No:</span>${receipt.admNo}</div><div class="info-item"><span class="lbl">Class:</span>${receipt.class}-${receipt.section}</div><div class="info-item"><span class="lbl">Mode:</span>${receipt.paymentMode}</div></div>
  <table><thead><tr><th>#</th><th>Particulars</th><th>Months</th><th>Amount</th></tr></thead><tbody>${itemRows}${otherRows}${oldBalRow}${discRow}<tr class="total-row"><td colspan="3">Net Fees</td><td style="text-align:right">₹${receipt.totalAmount.toLocaleString("en-IN")}</td></tr>${balRow}</tbody></table>
  <div class="qr-row"><div><div style="font-size:8px;">Received By: <b>${receipt.receivedBy}</b> (${receipt.receivedByRole})</div><div style="margin-top:10px;font-size:8px;">Signature: _______________</div></div><img src="${qrUrl}" width="60" height="60" alt="QR"/></div>
  ${historyRows.length > 0 ? `<div class="history-section"><div style="font-weight:bold;font-size:8px;margin-bottom:2px;">Payment History</div><table><thead><tr><th>Date</th><th>Receipt</th><th>Months</th><th>Amount</th><th>Received By</th></tr></thead><tbody>${histHtml}</tbody></table></div>` : ""}
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
    if (!win) {
      alert("⚠️ Print blocked. Allow popups.");
      return;
    }
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
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

// ── Sub-components ────────────────────────────────────────────────────────────
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

function getPrimaryMobile(s: Student): string {
  return (s.fatherMobile?.trim() || s.guardianMobile?.trim() || "").trim();
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CollectFees() {
  const {
    currentUser,
    currentSession,
    getData,
    saveData,
    updateData,
    deleteData,
    addNotification,
    isReadOnly,
  } = useApp();

  const [admNoInput, setAdmNoInput] = useState("");
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const admNoRef = useRef<HTMLInputElement>(null);

  const [familyOpen, setFamilyOpen] = useState(true);
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

  const [showDialog, setShowDialog] = useState(false);
  const [savedReceipt, setSavedReceipt] = useState<FeeReceipt | null>(null);
  const [printDone, setPrintDone] = useState(false);
  const [waDone, setWaDone] = useState(false);
  const [waSending, setWaSending] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editState, setEditState] = useState<EditReceiptState | null>(null);

  const isSuperAdmin = currentUser?.role === "superadmin";
  const canEdit =
    isSuperAdmin ||
    currentUser?.role === "admin" ||
    currentUser?.role === "accountant";

  // All data from context — already fetched from server
  // Collection keys MUST match server MySQL table names (snake_case)
  const allStudents = (getData("students") as Student[]).filter(
    (s) => s.status === "active",
  );
  const allReceipts = getData("fee_receipts") as FeeReceipt[];
  const allHeadings = getData("fee_headings") as FeeHeading[];
  const allPlans = getData("fees_plan") as FeesPlan[];

  // ── Receipt number from existing receipts ─────────────────────────────────
  const nextReceiptNo = (): string => {
    const yy = String(new Date().getFullYear()).slice(-2);
    const seq = (allReceipts.filter((r) => !r.isDeleted).length + 1)
      .toString()
      .padStart(4, "0");
    return `R${yy}-${seq}`;
  };
  const [receiptNo, setReceiptNo] = useState(() => nextReceiptNo());

  // ── Preload from sessionStorage (global search navigation) ─────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: one-time preload on mount
  useEffect(() => {
    const preloadId = sessionStorage.getItem("collectFees_preload");
    if (preloadId) {
      sessionStorage.removeItem("collectFees_preload");
      const student = allStudents.find((s) => s.id === preloadId);
      if (student) selectStudent(student);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allStudents.length]);

  // ── Live search ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (admNoInput.length < 1) {
      setFilteredStudents([]);
      setShowDropdown(false);
      return;
    }
    const q = admNoInput.toLowerCase();
    const res = allStudents
      .filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.admNo.toLowerCase().includes(q),
      )
      .slice(0, 8);
    setFilteredStudents(res);
    setShowDropdown(res.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admNoInput, allStudents]);

  // ── Close dropdown on outside click ───────────────────────────────────────
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

  // ── Transport fare helper ──────────────────────────────────────────────────
  function getTransportFare(student: Student): {
    fare: number;
    pickupName: string;
  } {
    const assignment = ls
      .get<
        Array<{
          studentId: string;
          routeId: string;
          pickupPointId: string;
          pickupPointName: string;
        }>
      >("student_transport_v2", [])
      .find((t) => t.studentId === student.id);
    if (!assignment) return { fare: 0, pickupName: "" };
    const route = ls
      .get<
        Array<{
          id: string;
          pickupPoints: Array<{ id: string; stopName: string; fare?: number }>;
        }>
      >("transport_routes_v2", [])
      .find((r) => r.id === assignment.routeId);
    if (!route) return { fare: 0, pickupName: assignment.pickupPointName };
    const pp = route.pickupPoints.find(
      (p) => p.id === assignment.pickupPointId,
    );
    return { fare: pp?.fare ?? 0, pickupName: assignment.pickupPointName };
  }

  // ── Paid months lookup from context receipts ───────────────────────────────
  function getPaidMonths(studentId: string, headingId: string): string[] {
    const sessionId = currentSession?.id ?? "";
    const paid: string[] = [];
    for (const r of allReceipts) {
      if (
        r.studentId === studentId &&
        r.sessionId === sessionId &&
        !r.isDeleted
      ) {
        for (const item of r.items) {
          if (item.headingId === headingId && !paid.includes(item.month))
            paid.push(item.month);
        }
      }
    }
    return paid;
  }

  // ── Old balance from context receipts ─────────────────────────────────────
  function calcOldBalance(studentId: string): number {
    const sessionId = currentSession?.id ?? "";
    const remaining = allReceipts
      .filter(
        (r) =>
          r.studentId === studentId &&
          r.sessionId === sessionId &&
          !r.isDeleted,
      )
      .sort((a, b) => a.date.localeCompare(b.date));
    if (remaining.length === 0) return 0;
    const last = remaining[remaining.length - 1];
    return last.balance ?? 0;
  }

  // ── Load fees for selected student (synchronous — uses context data) ───────
  function loadStudentFees(student: Student) {
    if (!currentSession) return;
    setFeeLoadState("loading");

    const headings = allHeadings
      .map((h) => ({
        ...h,
        months: safeMonths(h.months as unknown as string[]),
      }))
      .filter(
        (h) => h.id && h.name && h.name.trim() !== "" && h.months.length > 0,
      );

    const applicablePlans = allPlans.filter(
      (p) => p.classId === student.class && p.sectionId === student.section,
    );

    const newRows: ReceiptRow[] = [];
    for (const plan of applicablePlans) {
      const heading = headings.find((h) => h.id === plan.headingId);
      if (!heading) continue;
      if (
        heading.applicableClasses &&
        heading.applicableClasses.length > 0 &&
        !heading.applicableClasses.includes(student.class)
      )
        continue;
      if (!plan.amount || plan.amount === 0) continue;

      const paidMonths = getPaidMonths(student.id, heading.id);
      newRows.push({
        headingId: heading.id,
        headingName: heading.name,
        applicableMonths: heading.months,
        amount: plan.amount,
        paidMonths,
        checked: true,
      });
    }

    // Transport fee row
    const { fare: transportFare, pickupName } = getTransportFare(student);
    const TRANSPORT_HEADING_ID = `transport_${student.id}`;
    const studentTransportMonths =
      ls.get<Record<string, string[]>>("student_transport_months", {})[
        student.id
      ] ?? MONTHS;
    if (transportFare > 0) {
      const paidTransportMonths = getPaidMonths(
        student.id,
        TRANSPORT_HEADING_ID,
      );
      newRows.push({
        headingId: TRANSPORT_HEADING_ID,
        headingName: `Transport Fee (${pickupName})`,
        applicableMonths: studentTransportMonths,
        amount: transportFare,
        paidMonths: paidTransportMonths,
        checked: true,
        isTransport: true,
      });
    }

    setRows(newRows);

    // Auto-select months: April through current month
    const jsMonth = new Date().getMonth();
    const currentAcademicIdx = jsMonth >= 3 ? jsMonth - 3 : jsMonth + 9;
    const applicableSet = new Set(
      newRows.flatMap((row) => row.applicableMonths),
    );
    const autoSelected = MONTHS.slice(0, currentAcademicIdx + 1).filter((m) =>
      applicableSet.has(m),
    );
    const monthsToSelect =
      autoSelected.length > 0
        ? autoSelected
        : MONTHS.filter((m) => applicableSet.has(m));
    setPanelMonths(monthsToSelect);
    setCellAmounts({});

    const bal = calcOldBalance(student.id);
    setOldBalance(bal);
    setLateFees(0);
    setConcessionAmt(0);
    setRemarks("");

    setFeeLoadState(newRows.length === 0 ? "empty" : "loaded");
  }

  function selectStudent(student: Student) {
    setSelectedStudent(student);
    setAdmNoInput(student.admNo);
    setShowDropdown(false);
    setErrorMsg("");
    setOtherCharge({ label: "", paidAmount: 0, dueAmount: 0 });
    setReceiptNo(nextReceiptNo());
    loadStudentFees(student);
  }

  function clearStudent() {
    setSelectedStudent(null);
    setAdmNoInput("");
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
  }

  // ── Month panel helpers ────────────────────────────────────────────────────
  const applicableMonths = MONTHS.filter((m) =>
    rows.some((row) => row.applicableMonths.includes(m)),
  );

  function isMonthFullyPaid(month: string): boolean {
    const applicable = rows.filter((r) => r.applicableMonths.includes(month));
    if (applicable.length === 0) return false;
    return applicable.every((r) => r.paidMonths.includes(month));
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

  // ── Compute totals ─────────────────────────────────────────────────────────
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

  // ── Save receipt ───────────────────────────────────────────────────────────
  async function handleSave() {
    if (!selectedStudent || !currentSession || isReadOnly) return;
    setErrorMsg("");

    const checkedRows = rows.filter((r) => r.checked);
    if (
      panelMonths.length === 0 &&
      otherCharge.paidAmount === 0 &&
      oldBalance === 0
    ) {
      setErrorMsg("Please select at least one month.");
      return;
    }
    if (
      checkedRows.length === 0 &&
      otherCharge.paidAmount === 0 &&
      oldBalance === 0
    ) {
      setErrorMsg("Please select at least one fee head.");
      return;
    }
    if (receiptAmt <= 0) {
      setErrorMsg("Cannot save receipt with ₹0 amount.");
      return;
    }

    const receiptItems: FeeReceipt["items"] = [];
    for (const row of checkedRows) {
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
    const newBalance = balanceAmt;

    const receipt: FeeReceipt = {
      id: generateId(),
      receiptNo,
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
      balance: newBalance,
      paymentMode,
      receivedBy: currentUser?.fullName ?? currentUser?.name ?? "Staff",
      receivedByRole: currentUser?.position ?? currentUser?.role ?? "admin",
      sessionId: currentSession.id,
      template: 4,
    };

    await saveData(
      "fee_receipts",
      receipt as unknown as Record<string, unknown>,
    );
    addNotification(
      `💰 Fee receipt saved: ${formatCurrency(receiptAmt)} for ${selectedStudent.fullName}`,
      "success",
    );

    setSavedReceipt(receipt);
    setPrintDone(false);
    setWaDone(false);
    setShowDialog(true);
    loadStudentFees(selectedStudent);
    setOtherCharge({ label: "", paidAmount: 0, dueAmount: 0 });
    setReceiptNo(nextReceiptNo());
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

  function handlePrint(r: FeeReceipt) {
    printReceiptHTML(r, allReceipts);
    setPrintDone(true);
  }

  async function handleDeleteReceipt(receiptId: string) {
    if (!isSuperAdmin) return;
    if (!confirm("Delete this receipt? This cannot be undone.")) return;
    await deleteData("fee_receipts", receiptId);
    if (selectedStudent) loadStudentFees(selectedStudent);
    addNotification("Receipt deleted", "info");
  }

  // ── Open Full Edit Dialog ──────────────────────────────────────────────────
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
    const headings = Object.values(headingMap);
    const selectedMonths = [...new Set(r.items.map((i) => i.month))];
    const itemAmounts: Record<string, Record<string, number>> = {};
    for (const item of r.items) {
      if (!itemAmounts[item.headingId]) itemAmounts[item.headingId] = {};
      itemAmounts[item.headingId][item.month] = item.amount;
    }
    const otherC = r.otherCharges?.[0];
    setEditState({
      receiptId: r.id,
      date: r.date,
      paymentMode: r.paymentMode,
      paidAmount: r.paidAmount ?? r.totalAmount,
      discount: r.discount ?? 0,
      otherLabel: otherC?.label ?? "",
      otherAmount: otherC?.paidAmount ?? 0,
      selectedMonths,
      headings,
      itemAmounts,
    });
    setEditOpen(true);
  }

  function computeEditTotal(state: EditReceiptState): number {
    let total = 0;
    for (const h of state.headings) {
      for (const m of state.selectedMonths) {
        total += state.itemAmounts[h.headingId]?.[m] ?? h.rate;
      }
    }
    total += state.otherAmount - state.discount;
    return Math.max(0, total);
  }

  async function saveEditReceipt() {
    if (!editState || !selectedStudent) return;
    const newTotal = computeEditTotal(editState);
    const newItems: FeeReceipt["items"] = [];
    for (const h of editState.headings) {
      for (const m of editState.selectedMonths) {
        const amt = editState.itemAmounts[h.headingId]?.[m] ?? h.rate;
        if (amt > 0)
          newItems.push({
            headingId: h.headingId,
            headingName: h.headingName,
            month: m,
            amount: amt,
          });
      }
    }
    const newOtherCharges =
      editState.otherLabel && editState.otherAmount > 0
        ? [
            {
              label: editState.otherLabel,
              paidAmount: editState.otherAmount,
              dueAmount: 0,
            },
          ]
        : [];
    const newBalance = editState.paidAmount - newTotal;

    await updateData("fee_receipts", editState.receiptId, {
      date: editState.date,
      paymentMode: editState.paymentMode,
      items: newItems,
      otherCharges: newOtherCharges,
      discount: editState.discount,
      totalAmount: newTotal,
      paidAmount: editState.paidAmount,
      balance: newBalance,
    });

    setEditOpen(false);
    setEditState(null);
    addNotification("✅ Receipt updated", "success");
    loadStudentFees(selectedStudent);
  }

  // ── Display months ─────────────────────────────────────────────────────────
  const displayMonths =
    panelMonths.length > 0
      ? panelMonths
      : MONTHS.filter((m) => applicableMonths.includes(m));

  // ── Balance display ────────────────────────────────────────────────────────
  const isCredit = balanceAmt < 0;
  const isDue = balanceAmt > 0;
  const balanceDisplay = isCredit
    ? `-₹${Math.abs(balanceAmt).toLocaleString("en-IN")}`
    : `₹${balanceAmt.toLocaleString("en-IN")}`;
  const isOldCredit = oldBalance < 0;
  const isOldDue = oldBalance > 0;

  // Receipt history from context
  const receiptHistory = allReceipts
    .filter(
      (r) =>
        r.studentId === selectedStudent?.id &&
        r.sessionId === (currentSession?.id ?? "") &&
        !r.isDeleted,
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  // Family members
  const familyMembers = selectedStudent
    ? allStudents.filter((s) => {
        const pm = getPrimaryMobile(selectedStudent);
        return (
          s.id !== selectedStudent.id &&
          s.status === "active" &&
          pm &&
          getPrimaryMobile(s) === pm
        );
      })
    : [];

  return (
    <div className="space-y-0 flex flex-col gap-0">
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2.5 text-xs mb-2">
          ⚠️ Archived session — read-only mode. Fee collection is disabled.
        </div>
      )}

      {/* ── TOP ACTION BAR ── */}
      <div className="bg-card border border-border rounded-t-xl border-b-0 shadow-sm">
        <div className="px-3 py-2 flex flex-wrap items-end gap-2">
          {/* Date */}
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
          {/* Receipt No */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
              Receipt No.
            </span>
            <div className="h-7 px-2 flex items-center text-xs font-mono font-bold bg-muted/40 border border-border rounded text-primary w-28">
              {receiptNo}
            </div>
          </div>
          {/* Search */}
          <div
            ref={dropdownRef}
            className="relative flex flex-col gap-0.5 flex-1 min-w-[180px]"
          >
            <label
              htmlFor="adm-no-search"
              className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider"
            >
              Admission No.{" "}
              <span className="text-[8px] text-muted-foreground/60 normal-case">
                (F4-Search)
              </span>
            </label>
            <div className="relative">
              <input
                id="adm-no-search"
                ref={admNoRef}
                type="text"
                placeholder="Search by Adm No or Name..."
                value={admNoInput}
                onChange={(e) => {
                  setAdmNoInput(e.target.value);
                  if (!e.target.value) clearStudent();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filteredStudents.length > 0)
                    selectStudent(filteredStudents[0]);
                  if (e.key === "F4") {
                    e.preventDefault();
                    admNoRef.current?.select();
                  }
                }}
                className="h-7 w-full px-2 pr-7 text-xs border border-input rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                data-ocid="collect-fees-search"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[11px]">
                🔍
              </span>
            </div>
            {showDropdown && (
              <div className="absolute z-40 top-full left-0 right-0 bg-card border border-border rounded-lg shadow-elevated mt-0.5 max-h-52 overflow-y-auto">
                {filteredStudents.map((s) => (
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

          {/* Action Buttons */}
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
                onClick={() => savedReceipt && handlePrint(savedReceipt)}
                className="h-7 px-3 text-xs font-bold rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                data-ocid="collect-fees-print"
              >
                🖨️ Print
              </button>
            )}
            <button
              type="button"
              onClick={clearStudent}
              className="h-7 px-3 text-xs font-bold rounded border border-border hover:bg-muted/50 transition-colors"
              data-ocid="collect-fees-close"
            >
              ✕ Close
            </button>
          </div>
        </div>
      </div>

      {/* ── STUDENT INFO + MONTHS PANEL ── */}
      {selectedStudent ? (
        <div className="flex border border-border border-t-0 bg-card shadow-sm">
          {/* LEFT: Student Info */}
          <div
            className="flex flex-col"
            style={{ minWidth: 420, maxWidth: 520 }}
          >
            <div className="flex gap-3 p-3 border-b border-border bg-muted/20">
              <div className="w-[72px] h-[80px] rounded border-2 border-border bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
                {selectedStudent.photo ? (
                  <img
                    src={selectedStudent.photo}
                    alt={selectedStudent.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <span className="text-3xl">👤</span>
                    <span className="text-[8px] mt-0.5">No Photo</span>
                  </div>
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
                  <span className="text-[8px] text-red-400">Auto-added</span>
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
                  <span className="text-[8px] text-green-500">
                    Adjusts next payment
                  </span>
                </div>
              )}
            </div>

            <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-2">
              <LabelValue
                label="Student Name"
                value={selectedStudent.fullName}
              />
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
                label="Class / Section"
                value={`Class ${selectedStudent.class} - ${selectedStudent.section}`}
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
              <LabelValue
                label="Village / City"
                value={selectedStudent.address || "—"}
              />
              <LabelValue
                label="Adm. Date"
                value={selectedStudent.admissionDate || "—"}
              />
            </div>
          </div>

          <div className="w-px bg-border flex-shrink-0" />

          {/* RIGHT: Month Selector */}
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
            <div className="p-2 border-t border-border">
              <button
                type="button"
                className="w-full py-1.5 rounded text-[11px] font-bold bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                data-ocid="month-ok-btn"
                onClick={() =>
                  document
                    .getElementById("fee-grid-section")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                OK ✓
              </button>
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
            Enter student name or admission number in the search field above.
          </p>
        </div>
      )}

      {/* ── FAMILY MEMBERS PANEL ── */}
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
              {familyMembers.map((member) => {
                const memberBal = calcOldBalance(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    data-ocid="family-member-card"
                    onClick={() => selectStudent(member)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-violet-300 hover:bg-violet-50 transition-all group min-w-[200px] max-w-[280px] bg-background"
                  >
                    {member.photo ? (
                      <img
                        src={member.photo}
                        alt={member.fullName}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-base flex-shrink-0">
                        {member.fullName[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-semibold text-foreground truncate group-hover:text-violet-700">
                        {member.fullName}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Class {member.class}-{member.section} · #{member.admNo}
                      </div>
                      <div
                        className={`text-[11px] font-bold mt-0.5 ${memberBal > 0 ? "text-red-600" : memberBal < 0 ? "text-green-600" : "text-muted-foreground"}`}
                      >
                        {memberBal > 0
                          ? `Due: ₹${memberBal.toLocaleString("en-IN")}`
                          : memberBal < 0
                            ? `Credit: -₹${Math.abs(memberBal).toLocaleString("en-IN")}`
                            : "No dues"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── FEE GRID ── */}
      {selectedStudent && (
        <div
          id="fee-grid-section"
          className="bg-card border border-border border-t-0 shadow-sm overflow-hidden"
        >
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
                No fee headings configured for Class {selectedStudent.class}-
                {selectedStudent.section}
              </p>
              <p className="text-xs text-muted-foreground/70 mb-3">
                Go to <strong>Fees → Fees Plan</strong> and add fee plans for
                this class/section first.
              </p>
              <button
                type="button"
                onClick={() => loadStudentFees(selectedStudent)}
                className="px-3 py-1 text-xs font-semibold rounded border border-border hover:bg-muted/50 transition-colors"
                data-ocid="fee-grid-refresh-btn"
              >
                🔄 Refresh
              </button>
            </div>
          )}
          {feeLoadState === "idle" && rows.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-sm">
                Set up Fee Headings and Fees Plan for Class{" "}
                {selectedStudent.class}-{selectedStudent.section} first.
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
                    <th className="border border-border px-2 py-1.5 font-bold text-center bg-muted/70 whitespace-nowrap w-16">
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
                        className={`hover:bg-muted/10 ${!row.checked ? "opacity-50" : ""} ${row.isTransport ? "bg-blue-50/40" : ""}`}
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
                          {row.isTransport ? "🚌 " : `${rowIdx + 1}. `}
                          {row.headingName}
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
                                type="number"
                                min="0"
                                value={amt}
                                onChange={(e) => {
                                  const val = Math.max(
                                    0,
                                    Number(e.target.value),
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

                  {/* Other Charges row */}
                  <tr className="bg-amber-50/40">
                    <td className="border border-border px-2 py-1 text-center sticky left-0 bg-amber-50/40">
                      <span className="text-amber-600 text-xs">+</span>
                    </td>
                    <td className="border border-border px-2 py-1 sticky left-8 bg-amber-50/40">
                      <input
                        type="text"
                        placeholder="Other fee label..."
                        value={otherCharge.label}
                        onChange={(e) =>
                          setOtherCharge((p) => ({
                            ...p,
                            label: e.target.value,
                          }))
                        }
                        className="w-full h-5 px-2 text-[11px] border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/40 italic"
                        data-ocid="other-charge-label"
                      />
                    </td>
                    <td className="border border-border px-1 py-1 text-center">
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={otherCharge.paidAmount || ""}
                        onChange={(e) =>
                          setOtherCharge((p) => ({
                            ...p,
                            paidAmount: Math.max(0, Number(e.target.value)),
                          }))
                        }
                        className="w-14 h-5 px-1 text-center text-[11px] border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
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

                  {isOldDue && (
                    <tr className="bg-red-50">
                      <td
                        colSpan={3}
                        className="border border-border px-3 py-1 font-medium text-red-700 text-[11px] sticky left-0 bg-red-50"
                      >
                        Previous Balance (Carried Forward)
                      </td>
                      <td
                        colSpan={displayMonths.length}
                        className="border border-border px-2 py-1 text-red-500 text-[10px] italic"
                      >
                        from previous unpaid amount
                      </td>
                      <td className="border border-border px-2 py-1 text-right font-bold text-red-700 sticky right-0 bg-red-50 text-[11px]">
                        ₹{oldBalance.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  )}
                  {isOldCredit && (
                    <tr className="bg-green-50">
                      <td
                        colSpan={3}
                        className="border border-border px-3 py-1 font-medium text-green-700 text-[11px] sticky left-0 bg-green-50"
                      >
                        Credit Balance (Advance)
                      </td>
                      <td
                        colSpan={displayMonths.length}
                        className="border border-border px-2 py-1 text-green-600 text-[10px] italic"
                      >
                        advance auto-adjusting
                      </td>
                      <td className="border border-border px-2 py-1 text-right font-bold text-green-700 sticky right-0 bg-green-50 text-[11px]">
                        -₹{Math.abs(oldBalance).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TOTALS + PAYMENT ── */}
      {selectedStudent && rows.length > 0 && (
        <div className="bg-card border border-border border-t-0 shadow-sm overflow-hidden">
          <div className="flex flex-wrap divide-y sm:divide-y-0 sm:divide-x divide-border">
            {/* Fee Summary */}
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
                    {otherCharge.label || "Other Charges"}
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

            {/* Adjustments */}
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
                  type="number"
                  min="0"
                  value={lateFees || ""}
                  placeholder="0"
                  onChange={(e) =>
                    setLateFees(Math.max(0, Number(e.target.value)))
                  }
                  className="w-20 h-5 px-1.5 text-[11px] text-right border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
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
                  type="number"
                  min="0"
                  value={concessionAmt || ""}
                  placeholder="0"
                  onChange={(e) =>
                    setConcessionAmt(Math.max(0, Number(e.target.value)))
                  }
                  className="w-20 h-5 px-1.5 text-[11px] text-right border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                  data-ocid="concession-amt-input"
                />
              </div>
            </div>

            {/* Net + Receipt + Balance */}
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
                  type="number"
                  min="0"
                  value={receiptAmt || ""}
                  placeholder="0"
                  onChange={(e) =>
                    setReceiptAmt(Math.max(0, Number(e.target.value)))
                  }
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
                  {balanceDisplay}
                </span>
              </div>
              {isDue && (
                <div className="text-[9px] text-red-400">
                  ↑ ₹{balanceAmt.toLocaleString("en-IN")} will carry forward as
                  Old Balance
                </div>
              )}
              {isCredit && (
                <div className="text-[9px] text-green-500">
                  ✦ -₹{Math.abs(balanceAmt).toLocaleString("en-IN")} credit will
                  adjust next payment
                </div>
              )}
            </div>

            {/* Remarks + Mode + Save */}
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
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Any notes..."
                  className="w-full h-6 px-2 text-[11px] border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
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

      {/* ── PAYMENT HISTORY ── */}
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
                    <th className="px-2.5 py-1.5 text-right font-semibold">
                      Balance
                    </th>
                    <th className="px-2.5 py-1.5 text-left font-semibold">
                      Received By
                    </th>
                    <th className="px-2.5 py-1.5 text-center font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {receiptHistory.map((r, idx) => {
                    const bal = r.balance ?? 0;
                    return (
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
                            onClick={() => handlePrint(r)}
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
                        <td
                          className={`px-2.5 py-1.5 text-right font-semibold whitespace-nowrap ${bal < 0 ? "text-green-600" : bal > 0 ? "text-red-600" : "text-muted-foreground"}`}
                        >
                          {bal < 0
                            ? `-₹${Math.abs(bal).toLocaleString("en-IN")}`
                            : bal > 0
                              ? `₹${bal.toLocaleString("en-IN")}`
                              : "—"}
                        </td>
                        <td className="px-2.5 py-1.5 whitespace-nowrap">
                          <span className="font-medium">{r.receivedBy}</span>{" "}
                          <span className="text-muted-foreground text-[10px]">
                            ({r.receivedByRole})
                          </span>
                        </td>
                        <td className="px-2.5 py-1.5">
                          <div className="flex gap-1 justify-center flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-5 text-[9px] px-1.5"
                              onClick={() => handlePrint(r)}
                              data-ocid={`reprint-receipt-btn.${idx + 1}`}
                            >
                              🖨️ Reprint
                            </Button>
                            {(isSuperAdmin ||
                              currentUser?.role === "admin") && (
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Post-save Dialog ── */}
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
                onClick={() => savedReceipt && handlePrint(savedReceipt)}
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

      {/* ── Edit Receipt Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          data-ocid="edit-receipt-dialog"
        >
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
                    className="w-full h-8 px-2 text-sm border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Payment Mode</p>
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
                <p className="text-sm font-medium mb-2">Months</p>
                <div className="flex flex-wrap gap-1">
                  {MONTHS.map((m) => {
                    const inState = editState.selectedMonths.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() =>
                          setEditState((s) =>
                            s
                              ? {
                                  ...s,
                                  selectedMonths: inState
                                    ? s.selectedMonths.filter((x) => x !== m)
                                    : [...s.selectedMonths, m],
                                }
                              : s,
                          )
                        }
                        className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${inState ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/50"}`}
                      >
                        {m.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="edit-paid-amt"
                    className="text-sm font-medium block mb-1"
                  >
                    Amount Paid (₹)
                  </label>
                  <input
                    id="edit-paid-amt"
                    type="number"
                    min="0"
                    value={editState.paidAmount}
                    onChange={(e) =>
                      setEditState((s) =>
                        s ? { ...s, paidAmount: Number(e.target.value) } : s,
                      )
                    }
                    className="w-full h-8 px-2 text-sm border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-discount"
                    className="text-sm font-medium block mb-1"
                  >
                    Discount (₹)
                  </label>
                  <input
                    id="edit-discount"
                    type="number"
                    min="0"
                    value={editState.discount}
                    onChange={(e) =>
                      setEditState((s) =>
                        s ? { ...s, discount: Number(e.target.value) } : s,
                      )
                    }
                    className="w-full h-8 px-2 text-sm border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Computed Total</span>
                  <span className="font-bold">
                    ₹{computeEditTotal(editState).toLocaleString("en-IN")}
                  </span>
                </div>
                <div
                  className={`flex justify-between mt-1 font-semibold ${(editState.paidAmount - computeEditTotal(editState)) < 0 ? "text-red-600" : "text-green-600"}`}
                >
                  <span>Balance</span>
                  <span>
                    ₹
                    {(
                      editState.paidAmount - computeEditTotal(editState)
                    ).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditOpen(false);
                    setEditState(null);
                  }}
                  data-ocid="edit-receipt-cancel-btn"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void saveEditReceipt()}
                  data-ocid="edit-receipt-save-btn"
                >
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
