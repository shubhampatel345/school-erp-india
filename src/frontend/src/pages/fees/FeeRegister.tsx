import { useCallback, useEffect, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { useApp } from "../../context/AppContext";
import type { FeeReceipt, SchoolProfile } from "../../types";
import { formatCurrency, ls } from "../../utils/localStorage";

function printReceipt(receipt: FeeReceipt) {
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

  const qrData = `Receipt:${receipt.receiptNo}|Student:${receipt.studentName}|Adm:${receipt.admNo}|Class:${receipt.class}-${receipt.section}|Amount:${receipt.totalAmount}|Date:${receipt.date}|Mode:${receipt.paymentMode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(qrData)}`;

  const historyRows = ls
    .get<FeeReceipt[]>("fee_receipts", [])
    .filter((r) => r.studentId === receipt.studentId && !r.isDeleted)
    .sort((a, b) => a.date.localeCompare(b.date));

  const itemRows = Object.values(grouped)
    .map(
      (g, idx) =>
        `<tr><td>${idx + 1}</td><td>${g.headingName}</td><td>${g.months.map((m) => m.slice(0, 3)).join(",")}</td><td style="text-align:right">₹${g.amount * g.months.length}</td></tr>`,
    )
    .join("");

  const otherRows = receipt.otherCharges
    .filter((c) => c.paidAmount > 0)
    .map(
      (c) =>
        `<tr><td>-</td><td>${c.label}</td><td>-</td><td style="text-align:right">₹${c.paidAmount}</td></tr>`,
    )
    .join("");

  const oldBalRow =
    receipt.oldBalance > 0
      ? `<tr><td>-</td><td>Old Balance</td><td>-</td><td style="text-align:right">₹${receipt.oldBalance}</td></tr>`
      : "";

  const discRow =
    receipt.discount > 0
      ? `<tr><td>-</td><td>Discount</td><td>-</td><td style="text-align:right;color:green">-₹${receipt.discount}</td></tr>`
      : "";

  const histHtml = historyRows
    .map((r) => {
      const months = [...new Set(r.items.map((i) => i.month.slice(0, 3)))].join(
        ",",
      );
      return `<tr><td>${r.date}</td><td>${r.receiptNo}</td><td>${months}</td><td style="text-align:right">₹${r.totalAmount}</td><td>${r.receivedBy} (${r.receivedByRole})</td></tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <title>Fee Receipt - ${receipt.receiptNo}</title>
    <style>
      @page { size: 105mm 145mm; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 9px; padding: 4mm; background: #fff; }
      .header { text-align: center; border-bottom: 1.5px solid #000; padding-bottom: 3px; margin-bottom: 3px; }
      .school-name { font-size: 13px; font-weight: bold; margin-bottom: 1px; }
      .school-sub { font-size: 7.5px; color: #333; line-height: 1.4; }
      .receipt-title { text-align: center; font-weight: bold; font-size: 10px; letter-spacing: 1px; margin: 3px 0; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; padding: 2px 0; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px 8px; margin: 3px 0; font-size: 8.5px; }
      .info-item { display: flex; gap: 2px; }
      .lbl { color: #555; }
      table { width: 100%; border-collapse: collapse; margin: 3px 0; font-size: 8px; }
      th, td { border: 0.5px solid #aaa; padding: 1.5px 3px; }
      th { background: #f2f2f2; font-weight: bold; text-align: left; }
      .total-row td { font-weight: bold; font-size: 9px; background: #f8f8f8; }
      .qr-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 6px; }
      .history-section { margin-top: 4px; border-top: 1px dashed #999; padding-top: 3px; }
      .history-title { font-weight: bold; font-size: 8px; margin-bottom: 2px; }
    </style>
  </head><body>
    <div class="header">
      <div class="school-name">${school.name}</div>
      <div class="school-sub">
        ${school.address ? `${school.address}<br>` : ""}
        ${[school.phone ? `Ph: ${school.phone}` : "", school.website || ""].filter(Boolean).join(" | ")}
        ${school.affiliationNo ? `<br>Affiliation No: ${school.affiliationNo}` : ""}
      </div>
    </div>
    <div class="receipt-title">CASH RECEIPT</div>
    <div class="info-grid">
      <div class="info-item"><span class="lbl">Receipt No:</span><b>${receipt.receiptNo}</b></div>
      <div class="info-item"><span class="lbl">Date:</span>${receipt.date}</div>
      <div class="info-item"><span class="lbl">Name:</span><b>${receipt.studentName}</b></div>
      <div class="info-item"><span class="lbl">Adm No:</span>${receipt.admNo}</div>
      <div class="info-item"><span class="lbl">Class:</span>${receipt.class}-${receipt.section}</div>
      <div class="info-item"><span class="lbl">Mode:</span>${receipt.paymentMode}</div>
    </div>
    <table>
      <thead><tr><th>#</th><th>Particulars</th><th>Months</th><th>Amount</th></tr></thead>
      <tbody>
        ${itemRows}${otherRows}${oldBalRow}${discRow}
        <tr class="total-row"><td colspan="3">TOTAL PAID</td><td style="text-align:right">₹${receipt.totalAmount}</td></tr>
      </tbody>
    </table>
    <div class="qr-row">
      <div>
        <div style="font-size:8px;">Received By: <b>${receipt.receivedBy}</b> (${receipt.receivedByRole})</div>
        <div style="margin-top:10px;font-size:8px;">Signature: _______________</div>
      </div>
      <img src="${qrUrl}" width="60" height="60" alt="QR"/>
    </div>
    ${
      historyRows.length > 0
        ? `<div class="history-section">
      <div class="history-title">Payment History</div>
      <table>
        <thead><tr><th>Date</th><th>Receipt</th><th>Months</th><th>Amount</th><th>Received By</th></tr></thead>
        <tbody>${histHtml}</tbody>
      </table>
    </div>`
        : ""
    }
  </body></html>`;

  // Primary: hidden iframe — avoids popup blockers completely
  const existingFrame = document.getElementById(
    "shubh-print-frame",
  ) as HTMLIFrameElement | null;
  if (existingFrame) existingFrame.remove();

  const frame = document.createElement("iframe");
  frame.id = "shubh-print-frame";
  frame.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;";
  document.body.appendChild(frame);

  const frameDoc = frame.contentDocument ?? frame.contentWindow?.document;
  if (!frameDoc) {
    console.error(
      "shubh-print: iframe contentDocument unavailable, falling back to window.open",
    );
    // Fallback: window.open if iframe unavailable
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
      // Final fallback
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

export default function FeeRegister() {
  const { currentUser, currentSession } = useApp();
  const [receipts, setReceipts] = useState<FeeReceipt[]>([]);
  const [filtered, setFiltered] = useState<FeeReceipt[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<FeeReceipt | null>(
    null,
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [studentReceipts, setStudentReceipts] = useState<FeeReceipt[]>([]);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FeeReceipt | null>(null);
  const [editMode, setEditMode] = useState<FeeReceipt["paymentMode"]>("Cash");
  const [editAmount, setEditAmount] = useState("");

  const isSuperAdmin = currentUser?.role === "superadmin";
  const canEdit =
    currentUser?.role === "superadmin" || currentUser?.role === "admin";
  const currentSessionId = currentSession?.id ?? null;

  const loadReceipts = useCallback(() => {
    const all = ls
      .get<FeeReceipt[]>("fee_receipts", [])
      .filter(
        (r) =>
          !r.isDeleted &&
          (!currentSessionId || r.sessionId === currentSessionId),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
    setReceipts(all);
    setFiltered(all);
  }, [currentSessionId]);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  useEffect(() => {
    let res = [...receipts];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      res = res.filter(
        (r) =>
          r.studentName.toLowerCase().includes(q) ||
          r.admNo.toLowerCase().includes(q) ||
          r.receiptNo.toLowerCase().includes(q),
      );
    }
    if (classFilter) res = res.filter((r) => r.class === classFilter);
    if (modeFilter) res = res.filter((r) => r.paymentMode === modeFilter);
    if (dateFrom) res = res.filter((r) => r.date >= dateFrom);
    if (dateTo) res = res.filter((r) => r.date <= dateTo);
    setFiltered(res);
  }, [searchQuery, classFilter, modeFilter, dateFrom, dateTo, receipts]);

  function openDetail(receipt: FeeReceipt) {
    setSelectedReceipt(receipt);
    setStudentReceipts(
      receipts.filter((r) => r.studentId === receipt.studentId),
    );
    setDetailOpen(true);
  }

  function handleDelete(id: string) {
    if (!isSuperAdmin) return;
    if (!confirm("Delete this receipt? This cannot be undone.")) return;
    const all = ls
      .get<FeeReceipt[]>("fee_receipts", [])
      .map((r) => (r.id === id ? { ...r, isDeleted: true } : r));
    ls.set("fee_receipts", all);

    // Recalculate running balance for affected student
    const deletedReceipt = ls
      .get<FeeReceipt[]>("fee_receipts", [])
      .find((r) => r.id === id);
    const studentId = deletedReceipt?.studentId;
    const sessionId = deletedReceipt?.sessionId;
    if (studentId && sessionId) {
      const remaining = all
        .filter(
          (r) =>
            r.studentId === studentId &&
            r.sessionId === sessionId &&
            !r.isDeleted,
        )
        .sort((a, b) => a.date.localeCompare(b.date));

      let runningBalance = 0;
      for (const r of remaining) {
        runningBalance +=
          (r.totalAmount ?? 0) - (r.paidAmount ?? r.totalAmount ?? 0);
      }
      const balances = ls.get<Record<string, number>>("old_balances", {});
      if (runningBalance === 0) delete balances[studentId];
      else balances[studentId] = runningBalance;
      ls.set("old_balances", balances);
    }

    setDetailOpen(false);
    loadReceipts();
  }

  function openEdit(r: FeeReceipt) {
    setEditTarget(r);
    setEditMode(r.paymentMode);
    setEditAmount(String(r.totalAmount));
    setEditOpen(true);
  }

  function saveEdit() {
    if (!editTarget) return;
    const newAmount = Number(editAmount);
    if (Number.isNaN(newAmount) || newAmount <= 0) return;
    const all = ls
      .get<FeeReceipt[]>("fee_receipts", [])
      .map((r) =>
        r.id === editTarget.id
          ? { ...r, paymentMode: editMode, totalAmount: newAmount }
          : r,
      );
    ls.set("fee_receipts", all);
    setEditOpen(false);
    setEditTarget(null);
    setDetailOpen(false);
    loadReceipts();
  }

  function exportCSV() {
    const header = [
      "Date",
      "Receipt No",
      "Student",
      "Adm No",
      "Class",
      "Months",
      "Amount",
      "Mode",
      "Received By",
    ];
    const rows = filtered.map((r) => [
      r.date,
      r.receiptNo,
      r.studentName,
      r.admNo,
      `${r.class}-${r.section}`,
      [...new Set(r.items.map((i) => i.month.slice(0, 3)))].join(";"),
      r.totalAmount,
      r.paymentMode,
      `${r.receivedBy} (${r.receivedByRole})`,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${v}"`).join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    a.download = "fee_register.csv";
    a.click();
  }

  const totalCollected = filtered.reduce((s, r) => s + r.totalAmount, 0);
  const uniqueClasses = [...new Set(receipts.map((r) => r.class))].sort();
  const uniqueModes = [...new Set(receipts.map((r) => r.paymentMode))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-foreground">Fee Register</h3>
          <p className="text-sm text-muted-foreground">
            Full ledger of all fee transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            data-ocid="fee-register-print"
          >
            🖨️ Print
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={exportCSV}
            data-ocid="fee-register-export"
          >
            📊 Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3">
        <Input
          placeholder="Search by name, adm no, receipt..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[180px]"
          data-ocid="fee-register-search"
        />
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground"
          data-ocid="fee-register-class-filter"
        >
          <option value="">All Classes</option>
          {uniqueClasses.map((c) => (
            <option key={c} value={c}>
              Class {c}
            </option>
          ))}
        </select>
        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground"
          data-ocid="fee-register-mode-filter"
        >
          <option value="">All Modes</option>
          {uniqueModes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-36"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-36"
        />
      </div>

      {/* Summary */}
      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-green-700 font-medium">
          {filtered.length} receipt(s) shown
        </span>
        <span className="font-bold text-green-700">
          Total: {formatCurrency(totalCollected)}
        </span>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p className="text-lg mb-1">No receipts found</p>
            <p className="text-sm">Collect fees to see records here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold">Date</th>
                  <th className="px-3 py-3 text-left font-semibold">
                    Receipt No
                  </th>
                  <th className="px-3 py-3 text-left font-semibold">
                    Student Name
                  </th>
                  <th className="px-3 py-3 text-left font-semibold">Class</th>
                  <th className="px-3 py-3 text-left font-semibold">Months</th>
                  <th className="px-3 py-3 text-right font-semibold">Amount</th>
                  <th className="px-3 py-3 text-left font-semibold">Mode</th>
                  <th className="px-3 py-3 text-left font-semibold">
                    Received By
                  </th>
                  <th className="px-3 py-3 text-center font-semibold">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-border hover:bg-muted/20"
                    data-ocid="fee-register-row"
                  >
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.date}
                    </td>
                    <td className="px-3 py-2 font-mono font-medium text-xs">
                      {r.receiptNo}
                    </td>
                    <td className="px-3 py-2 font-medium">{r.studentName}</td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary" className="text-xs">
                        {r.class}-{r.section}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {[
                        ...new Set(r.items.map((i) => i.month.slice(0, 3))),
                      ].join(", ")}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-green-600">
                      {formatCurrency(r.totalAmount)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-xs">
                        {r.paymentMode}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.receivedBy}{" "}
                      <span className="text-muted-foreground">
                        ({r.receivedByRole})
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => openDetail(r)}
                        data-ocid="fee-register-view-btn"
                      >
                        👁️ View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Payment Details — {selectedReceipt?.studentName}
            </DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm bg-muted/30 rounded-xl p-3">
                <div>
                  <span className="text-muted-foreground">Receipt No: </span>
                  <span className="font-medium">
                    {selectedReceipt.receiptNo}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Date: </span>
                  <span className="font-medium">{selectedReceipt.date}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Adm No: </span>
                  <span className="font-medium">{selectedReceipt.admNo}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Class: </span>
                  <span className="font-medium">
                    {selectedReceipt.class}-{selectedReceipt.section}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Mode: </span>
                  <Badge variant="outline">{selectedReceipt.paymentMode}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Received By: </span>
                  <span className="font-medium">
                    {selectedReceipt.receivedBy} (
                    {selectedReceipt.receivedByRole})
                  </span>
                </div>
              </div>

              {/* Fee items */}
              <div>
                <p className="font-semibold text-sm mb-2">Fee Items</p>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border border-border px-3 py-2 text-left">
                        Heading
                      </th>
                      <th className="border border-border px-3 py-2 text-left">
                        Month
                      </th>
                      <th className="border border-border px-3 py-2 text-right">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReceipt.items
                      .filter((i) => i.amount > 0)
                      .map((item, idx) => (
                        <tr
                          key={`${item.headingId}-${item.month}-${idx}`}
                          className="border-t border-border"
                        >
                          <td className="border border-border px-3 py-1.5">
                            {item.headingName}
                          </td>
                          <td className="border border-border px-3 py-1.5">
                            {item.month}
                          </td>
                          <td className="border border-border px-3 py-1.5 text-right">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                    {selectedReceipt.otherCharges
                      .filter((c) => c.paidAmount > 0)
                      .map((c) => (
                        <tr
                          key={`oc-${c.label}`}
                          className="border-t border-border"
                        >
                          <td className="border border-border px-3 py-1.5">
                            {c.label}
                          </td>
                          <td className="border border-border px-3 py-1.5">
                            Other
                          </td>
                          <td className="border border-border px-3 py-1.5 text-right">
                            {formatCurrency(c.paidAmount)}
                          </td>
                        </tr>
                      ))}
                    {selectedReceipt.oldBalance > 0 && (
                      <tr className="border-t border-border">
                        <td
                          colSpan={2}
                          className="border border-border px-3 py-1.5 text-amber-600"
                        >
                          Old Balance
                        </td>
                        <td className="border border-border px-3 py-1.5 text-right">
                          {formatCurrency(selectedReceipt.oldBalance)}
                        </td>
                      </tr>
                    )}
                    {selectedReceipt.discount > 0 && (
                      <tr className="border-t border-border">
                        <td
                          colSpan={2}
                          className="border border-border px-3 py-1.5 text-green-600"
                        >
                          Discount
                        </td>
                        <td className="border border-border px-3 py-1.5 text-right text-green-600">
                          -{formatCurrency(selectedReceipt.discount)}
                        </td>
                      </tr>
                    )}
                    <tr className="border-t-2 border-border font-bold bg-muted/30">
                      <td
                        colSpan={2}
                        className="border border-border px-3 py-2"
                      >
                        TOTAL
                      </td>
                      <td className="border border-border px-3 py-2 text-right">
                        {formatCurrency(selectedReceipt.totalAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* All payments for this student */}
              {studentReceipts.length > 1 && (
                <div>
                  <p className="font-semibold text-sm mb-2">
                    All Payments — {selectedReceipt.studentName}
                  </p>
                  <div className="space-y-1">
                    {studentReceipts.map((sr) => (
                      <div
                        key={sr.id}
                        className={`flex justify-between items-center text-xs px-3 py-2 rounded-lg gap-2 ${
                          sr.id === selectedReceipt.id
                            ? "bg-primary/10 border border-primary/20"
                            : "bg-muted/30"
                        }`}
                      >
                        <span className="text-muted-foreground">{sr.date}</span>
                        <span className="font-mono">{sr.receiptNo}</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(sr.totalAmount)}
                        </span>
                        <span className="text-muted-foreground truncate">
                          {sr.receivedBy} ({sr.receivedByRole})
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs px-2"
                          onClick={() => printReceipt(sr)}
                          data-ocid="student-history-reprint"
                        >
                          🖨️
                        </Button>
                        {isSuperAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs px-2 text-amber-600 hover:bg-amber-50"
                            onClick={() => openEdit(sr)}
                          >
                            ✏️
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => printReceipt(selectedReceipt)}
                  data-ocid="register-reprint-btn"
                >
                  🖨️ Reprint
                </Button>
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-amber-600 border-amber-200 hover:bg-amber-50"
                    onClick={() => openEdit(selectedReceipt)}
                    data-ocid="register-edit-btn"
                  >
                    ✏️ Edit Receipt
                  </Button>
                )}
                {isSuperAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleDelete(selectedReceipt.id)}
                    data-ocid="register-delete-btn"
                  >
                    🗑️ Delete
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Receipt Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Receipt — {editTarget?.receiptNo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <p className="text-sm font-medium mb-1">Payment Mode</p>
              <div className="flex gap-2 flex-wrap">
                {(["Cash", "Cheque", "Online", "DD", "UPI"] as const).map(
                  (mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setEditMode(mode)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                        editMode === mode
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      {mode}
                    </button>
                  ),
                )}
              </div>
            </div>
            <div>
              <label
                htmlFor="register-edit-amount"
                className="text-sm font-medium block mb-1"
              >
                Amount (₹)
              </label>
              <Input
                id="register-edit-amount"
                type="number"
                min="1"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                data-ocid="register-edit-amount"
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button
                variant="outline"
                onClick={() => {
                  setEditOpen(false);
                  setEditTarget(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={saveEdit} data-ocid="save-edit-btn">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
