import { useEffect, useState } from "react";
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
import type { FeeReceipt } from "../../types";
import type { SchoolProfile } from "../../types";
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
  const itemRows = Object.values(grouped)
    .map(
      (g, idx) =>
        `<tr><td>${idx + 1}</td><td>${g.headingName}</td><td>${g.months.map((m) => m.slice(0, 3)).join(",")}</td><td style="text-align:right">₹${g.amount * g.months.length}</td></tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fee Receipt - ${receipt.receiptNo}</title>
    <style>@page{size:105mm 145mm;margin:0}*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:9px;padding:4mm;background:#fff}.header{text-align:center;border-bottom:1.5px solid #000;padding-bottom:3px;margin-bottom:3px}.school-name{font-size:13px;font-weight:bold}.receipt-title{text-align:center;font-weight:bold;font-size:10px;letter-spacing:1px;margin:3px 0;border-top:1px solid #ccc;border-bottom:1px solid #ccc;padding:2px 0}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px 8px;margin:3px 0;font-size:8.5px}.lbl{color:#555}table{width:100%;border-collapse:collapse;margin:3px 0;font-size:8px}th,td{border:.5px solid #aaa;padding:1.5px 3px}th{background:#f2f2f2;font-weight:bold}.total-row td{font-weight:bold;font-size:9px;background:#f8f8f8}.qr-row{display:flex;justify-content:space-between;align-items:flex-end;margin-top:4px}</style>
    </head><body><div class="header"><div class="school-name">${school.name}</div><div style="font-size:7.5px;color:#333">${school.address || ""}</div></div>
    <div class="receipt-title">CASH RECEIPT</div>
    <div class="info-grid"><div><span class="lbl">Receipt No:</span><b>${receipt.receiptNo}</b></div><div><span class="lbl">Date:</span>${receipt.date}</div><div><span class="lbl">Name:</span><b>${receipt.studentName}</b></div><div><span class="lbl">Adm No:</span>${receipt.admNo}</div><div><span class="lbl">Class:</span>${receipt.class}-${receipt.section}</div><div><span class="lbl">Mode:</span>${receipt.paymentMode}</div></div>
    <table><thead><tr><th>#</th><th>Particulars</th><th>Months</th><th>Amount</th></tr></thead><tbody>${itemRows}<tr class="total-row"><td colspan="3">TOTAL PAID</td><td style="text-align:right">₹${receipt.totalAmount}</td></tr></tbody></table>
    <div class="qr-row"><div><div style="font-size:8px;">Received By: <b>${receipt.receivedBy}</b></div><div style="margin-top:10px;font-size:8px;">Signature: _______________</div></div><img src="${qrUrl}" width="60" height="60" alt="QR"/></div>
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
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 500);
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
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close();
        setTimeout(() => w.print(), 300);
      }
    }
    setTimeout(() => frame.remove(), 3000);
  }, 400);
}

export default function FeeRegister() {
  const {
    getData,
    updateData,
    deleteData,
    currentUser,
    currentSession,
    addNotification,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<FeeReceipt | null>(
    null,
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FeeReceipt | null>(null);
  const [editMode, setEditMode] = useState<FeeReceipt["paymentMode"]>("Cash");
  const [editAmount, setEditAmount] = useState("");

  const isSuperAdmin = currentUser?.role === "superadmin";
  const canEdit =
    currentUser?.role === "superadmin" || currentUser?.role === "admin";
  const currentSessionId = currentSession?.id ?? null;

  // Read from context — collection key "fee_receipts" matches server MySQL table
  const allReceipts = (getData("fee_receipts") as FeeReceipt[])
    .filter(
      (r) =>
        !r.isDeleted && (!currentSessionId || r.sessionId === currentSessionId),
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  const filtered = allReceipts.filter((r) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !r.studentName.toLowerCase().includes(q) &&
        !r.admNo.toLowerCase().includes(q) &&
        !r.receiptNo.toLowerCase().includes(q)
      )
        return false;
    }
    if (classFilter && r.class !== classFilter) return false;
    if (modeFilter && r.paymentMode !== modeFilter) return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    return true;
  });

  const [uniqueClasses, setUniqueClasses] = useState<string[]>([]);
  const [uniqueModes, setUniqueModes] = useState<string[]>([]);

  useEffect(() => {
    setUniqueClasses([...new Set(allReceipts.map((r) => r.class))].sort());
    setUniqueModes([...new Set(allReceipts.map((r) => r.paymentMode))]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allReceipts]);

  async function handleDelete(id: string) {
    if (!isSuperAdmin) return;
    if (!confirm("Delete this receipt? This cannot be undone.")) return;
    await deleteData("feeReceipts", id);
    setDetailOpen(false);
    addNotification("Receipt deleted", "info");
  }

  async function saveEdit() {
    if (!editTarget) return;
    const newAmount = Number(editAmount);
    if (Number.isNaN(newAmount) || newAmount <= 0) return;
    await updateData("feeReceipts", editTarget.id, {
      paymentMode: editMode,
      totalAmount: newAmount,
      paidAmount: newAmount,
    });
    setEditOpen(false);
    setEditTarget(null);
    setDetailOpen(false);
    addNotification("Receipt updated", "success");
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
  const studentReceipts = selectedReceipt
    ? allReceipts.filter((r) => r.studentId === selectedReceipt.studentId)
    : [];

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
                        onClick={() => {
                          setSelectedReceipt(r);
                          setDetailOpen(true);
                        }}
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
                    {(selectedReceipt.otherCharges ?? [])
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

              {studentReceipts.length > 1 && (
                <div>
                  <p className="font-semibold text-sm mb-2">
                    All Payments — {selectedReceipt.studentName}
                  </p>
                  <div className="space-y-1">
                    {studentReceipts.map((sr) => (
                      <div
                        key={sr.id}
                        className={`flex justify-between items-center text-xs px-3 py-2 rounded-lg gap-2 ${sr.id === selectedReceipt.id ? "bg-primary/10 border border-primary/20" : "bg-muted/30"}`}
                      >
                        <span className="text-muted-foreground">{sr.date}</span>
                        <span className="font-mono">{sr.receiptNo}</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(sr.totalAmount)}
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
                    onClick={() => {
                      setEditTarget(selectedReceipt);
                      setEditMode(selectedReceipt.paymentMode);
                      setEditAmount(String(selectedReceipt.totalAmount));
                      setEditOpen(true);
                    }}
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
                    onClick={() => void handleDelete(selectedReceipt.id)}
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
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${editMode === mode ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/50"}`}
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
              <Button onClick={() => void saveEdit()} data-ocid="save-edit-btn">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
