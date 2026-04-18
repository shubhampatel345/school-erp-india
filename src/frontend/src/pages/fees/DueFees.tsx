import { useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useApp } from "../../context/AppContext";
import type { FeeReceipt, FeesPlan, Student } from "../../types";
import { CLASSES, MONTHS, formatCurrency, ls } from "../../utils/localStorage";
import { buildFeesDueMessage, sendWhatsApp } from "../../utils/whatsapp";

interface DueRow {
  student: Student;
  dueMonths: string[];
  dueAmount: number;
}

type SubTab = "report" | "groups" | "accounts";

interface FeeGroup {
  id: string;
  name: string;
}

interface FeeAccount {
  id: string;
  name: string;
}

export default function DueFees() {
  const { currentSession } = useApp();
  const [step, setStep] = useState<1 | 2>(1);
  const [selMonths, setSelMonths] = useState<string[]>([]);
  const [selClasses, setSelClasses] = useState<string[]>([]);
  const [dueRows, setDueRows] = useState<DueRow[]>([]);
  const [generated, setGenerated] = useState(false);
  const [waSending, setWaSending] = useState(false);
  const [waStatus, setWaStatus] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<SubTab>("report");

  // Groups sub-module state
  const [groups, setGroups] = useState<FeeGroup[]>(() =>
    ls.get<FeeGroup[]>("fee_groups", []),
  );
  const [newGroupName, setNewGroupName] = useState("");
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");

  // Accounts sub-module state
  const [accounts, setAccounts] = useState<FeeAccount[]>(() =>
    ls.get<FeeAccount[]>("fee_accounts", []),
  );
  const [newAccountName, setNewAccountName] = useState("");
  const [editAccountId, setEditAccountId] = useState<string | null>(null);
  const [editAccountName, setEditAccountName] = useState("");

  function toggleMonth(m: string) {
    setSelMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  }

  function toggleClass(c: string) {
    setSelClasses((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  }

  function generate() {
    if (!currentSession) return;
    const students = ls
      .get<Student[]>("students", [])
      .filter(
        (s) =>
          s.status === "active" &&
          (selClasses.length === 0 || selClasses.includes(s.class)),
      );
    const receipts = ls
      .get<FeeReceipt[]>("fee_receipts", [])
      .filter((r) => r.sessionId === currentSession.id && !r.isDeleted);
    const plans = ls.get<FeesPlan[]>("fees_plan", []);

    const rows: DueRow[] = [];
    for (const student of students) {
      const paidMonths: string[] = [];
      for (const r of receipts.filter((r) => r.studentId === student.id)) {
        for (const item of r.items) {
          if (!paidMonths.includes(item.month)) paidMonths.push(item.month);
        }
      }

      const studentPlans = plans.filter(
        (p) => p.classId === student.class && p.sectionId === student.section,
      );
      const dueMonths = selMonths.filter((m) => !paidMonths.includes(m));
      if (dueMonths.length === 0) continue;

      let dueAmount = 0;
      for (const plan of studentPlans) {
        if (plan.amount > 0) dueAmount += plan.amount * dueMonths.length;
      }
      if (dueAmount === 0) continue;

      rows.push({ student, dueMonths, dueAmount });
    }

    setDueRows(rows);
    setGenerated(true);
    setSubTab("report");
  }

  function handlePrint() {
    const school = ls.get<{ name: string; address: string }>("school_profile", {
      name: "SHUBH SCHOOL ERP",
      address: "",
    });
    const html = `<!DOCTYPE html><html><head><title>Dues Report</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
      h2 { text-align: center; margin-bottom: 4px; }
      p.sub { text-align: center; margin-bottom: 16px; color: #555; font-size: 11px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ccc; padding: 6px 10px; }
      th { background: #f5f5f5; font-weight: bold; }
      .total { font-weight: bold; background: #f0f0f0; }
    </style></head><body>
    <h2>${school.name}</h2>
    <p class="sub">Fees Due Report — Months: ${selMonths.join(", ")} | Classes: ${selClasses.length > 0 ? selClasses.join(", ") : "All"}</p>
    <table>
      <thead><tr><th>#</th><th>Student Name</th><th>Adm No</th><th>Class</th><th>Months Due</th><th>Amount Due</th></tr></thead>
      <tbody>
        ${dueRows
          .map(
            (r, i) =>
              `<tr><td>${i + 1}</td><td>${r.student.fullName}</td><td>${r.student.admNo}</td><td>${r.student.class}-${r.student.section}</td><td>${r.dueMonths.join(", ")}</td><td>₹${r.dueAmount}</td></tr>`,
          )
          .join("")}
        <tr class="total"><td colspan="5">Grand Total</td><td>₹${dueRows.reduce((s, r) => s + r.dueAmount, 0)}</td></tr>
      </tbody>
    </table>
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
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        win.print();
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
      setTimeout(() => frame.remove(), 5000);
    }, 400);
  }

  function handleExcel() {
    const header = [
      "#",
      "Student Name",
      "Adm No",
      "Class",
      "Section",
      "Months Due",
      "Amount Due",
    ];
    const rows = dueRows.map((r, i) => [
      i + 1,
      r.student.fullName,
      r.student.admNo,
      r.student.class,
      r.student.section,
      r.dueMonths.join("; "),
      r.dueAmount,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    a.download = "dues_report.csv";
    a.click();
  }

  function handleReminderPrint() {
    const school = ls.get<{
      name: string;
      address: string;
      principalName?: string;
    }>("school_profile", {
      name: "SHUBH SCHOOL ERP",
      address: "",
      principalName: "Principal",
    });
    const today = new Date().toLocaleDateString("en-IN");
    const pages = dueRows
      .map(
        (r) => `
      <div style="padding:30px;border-bottom:2px dashed #ccc;page-break-after:always;font-family:Arial,sans-serif;">
        <div style="text-align:center;margin-bottom:20px;">
          <h2 style="margin:0;">${school.name}</h2>
          <p style="margin:4px 0;color:#555;">${school.address}</p>
        </div>
        <p style="text-align:center;font-weight:bold;font-size:15px;margin-bottom:20px;">Fee Reminder Notice</p>
        <p>Date: ${today}</p>
        <p>To,</p>
        <p>The Parent/Guardian of <b>${r.student.fullName}</b></p>
        <p>Admission No: ${r.student.admNo} | Class: ${r.student.class}-${r.student.section}</p>
        <br/>
        <p>This is to remind you that the following fee installments are pending:</p>
        <p><b>Due Months:</b> ${r.dueMonths.join(", ")}</p>
        <p><b>Total Due Amount: ₹${r.dueAmount}</b></p>
        <br/>
        <p>Kindly pay the dues by <b>15th of the current month</b> to avoid any inconvenience.</p>
        <br/>
        <p style="margin-top:50px;text-align:right;">Authorized Signatory</p>
        <p style="text-align:right;font-style:italic;">${school.principalName ?? "Principal"}</p>
      </div>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><title>Fee Reminder Letters</title></head><body>${pages}</body></html>`;

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
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        win.print();
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
      setTimeout(() => frame.remove(), 5000);
    }, 400);
  }

  async function handleWhatsAppReminder() {
    setWaSending(true);
    setWaStatus(null);
    const school = ls.get<{ name: string }>("school_profile", {
      name: "School",
    });
    let sent = 0;
    let failed = 0;
    for (const row of dueRows) {
      const phone = row.student.guardianMobile || row.student.mobile;
      if (!phone) {
        failed++;
        continue;
      }
      const msg = buildFeesDueMessage(
        row.student.fullName,
        row.dueMonths,
        row.dueAmount,
        school.name,
      );
      const res = await sendWhatsApp(phone, msg);
      if (res.success) sent++;
      else failed++;
    }
    setWaSending(false);
    setWaStatus(`Sent: ${sent}, Failed: ${failed}`);
  }

  // Group CRUD
  function addGroup() {
    if (!newGroupName.trim()) return;
    const g: FeeGroup = {
      id: Date.now().toString(36),
      name: newGroupName.trim(),
    };
    const updated = [...groups, g];
    ls.set("fee_groups", updated);
    setGroups(updated);
    setNewGroupName("");
  }

  function saveGroupEdit(id: string) {
    if (!editGroupName.trim()) return;
    const updated = groups.map((g) =>
      g.id === id ? { ...g, name: editGroupName.trim() } : g,
    );
    ls.set("fee_groups", updated);
    setGroups(updated);
    setEditGroupId(null);
    setEditGroupName("");
  }

  function deleteGroup(id: string) {
    if (!confirm("Delete this group?")) return;
    const updated = groups.filter((g) => g.id !== id);
    ls.set("fee_groups", updated);
    setGroups(updated);
  }

  // Account CRUD
  function addAccount() {
    if (!newAccountName.trim()) return;
    const a: FeeAccount = {
      id: `${Date.now().toString(36)}a`,
      name: newAccountName.trim(),
    };
    const updated = [...accounts, a];
    ls.set("fee_accounts", updated);
    setAccounts(updated);
    setNewAccountName("");
  }

  function saveAccountEdit(id: string) {
    if (!editAccountName.trim()) return;
    const updated = accounts.map((a) =>
      a.id === id ? { ...a, name: editAccountName.trim() } : a,
    );
    ls.set("fee_accounts", updated);
    setAccounts(updated);
    setEditAccountId(null);
    setEditAccountName("");
  }

  function deleteAccount(id: string) {
    if (!confirm("Delete this account?")) return;
    const updated = accounts.filter((a) => a.id !== id);
    ls.set("fee_accounts", updated);
    setAccounts(updated);
  }

  const totalReceipts = ls
    .get<FeeReceipt[]>("fee_receipts", [])
    .filter(
      (r) =>
        !r.isDeleted && currentSession && r.sessionId === currentSession.id,
    )
    .reduce((s, r) => s + r.totalAmount, 0);

  return (
    <div className="space-y-4">
      {/* Sub-tab nav */}
      <div className="flex gap-2 border-b border-border pb-3">
        {(
          [
            { id: "report" as SubTab, label: "Dues Report" },
            { id: "groups" as SubTab, label: "Groups" },
            { id: "accounts" as SubTab, label: "Accounts" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`px-4 py-1.5 text-sm rounded-lg border transition-colors ${
              subTab === t.id
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-muted/50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Report Tab ──────────────────────────────────── */}
      {subTab === "report" && (
        <>
          {/* Wizard */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex gap-4 mb-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  step === 1
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                Step 1: Select Months
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  step === 2
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                Step 2: Select Classes
              </button>
            </div>

            {step === 1 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">
                    Select months to check for dues
                  </p>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setSelMonths([...MONTHS])}
                  >
                    Select All
                  </button>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {MONTHS.map((m) => (
                    <label
                      key={m}
                      className="flex items-center gap-2 cursor-pointer text-sm bg-muted/30 px-2 py-1.5 rounded-lg"
                    >
                      <input
                        type="checkbox"
                        checked={selMonths.includes(m)}
                        onChange={() => toggleMonth(m)}
                        className="accent-primary"
                        data-ocid="due-fees-month-checkbox"
                      />
                      {m.slice(0, 3)}
                    </label>
                  ))}
                </div>
                <Button
                  className="mt-4"
                  onClick={() => setStep(2)}
                  disabled={selMonths.length === 0}
                >
                  Next →
                </Button>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">
                    Select classes to include
                  </p>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setSelClasses([...CLASSES])}
                  >
                    Select All
                  </button>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {CLASSES.map((c) => (
                    <label
                      key={c}
                      className="flex items-center gap-2 cursor-pointer text-sm bg-muted/30 px-2 py-1.5 rounded-lg"
                    >
                      <input
                        type="checkbox"
                        checked={selClasses.includes(c)}
                        onChange={() => toggleClass(c)}
                        className="accent-primary"
                        data-ocid="due-fees-class-checkbox"
                      />
                      {c}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    ← Back
                  </Button>
                  <Button onClick={generate} data-ocid="generate-dues-btn">
                    Generate Report
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {generated && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <p className="font-semibold">
                    Dues Report —{" "}
                    {selMonths.map((m) => m.slice(0, 3)).join(", ")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {dueRows.length} student(s) with pending fees
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePrint}
                    data-ocid="dues-print-btn"
                  >
                    🖨️ Print
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExcel}
                    data-ocid="dues-excel-btn"
                  >
                    📊 Excel
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReminderPrint}
                    data-ocid="dues-reminder-btn"
                  >
                    📄 Reminder Letter
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleWhatsAppReminder}
                    disabled={waSending}
                    data-ocid="dues-whatsapp-btn"
                  >
                    {waSending ? "Sending..." : "💬 WhatsApp All"}
                  </Button>
                </div>
              </div>

              {waStatus && (
                <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg">
                  WhatsApp result: {waStatus}
                </div>
              )}

              {dueRows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No dues found for the selected months and classes. 🎉
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Student Name</th>
                        <th className="px-3 py-2 text-left">Adm No</th>
                        <th className="px-3 py-2 text-left">Class</th>
                        <th className="px-3 py-2 text-left">Months Due</th>
                        <th className="px-3 py-2 text-right">Amount Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dueRows.map((row, i) => (
                        <tr
                          key={row.student.id}
                          className="border-t border-border hover:bg-muted/20"
                          data-ocid="due-fees-row"
                        >
                          <td className="px-3 py-2 text-muted-foreground">
                            {i + 1}
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {row.student.fullName}
                          </td>
                          <td className="px-3 py-2">{row.student.admNo}</td>
                          <td className="px-3 py-2">
                            <Badge variant="secondary">
                              {row.student.class}-{row.student.section}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {row.dueMonths.map((m) => m.slice(0, 3)).join(", ")}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-red-600">
                            {formatCurrency(row.dueAmount)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-border bg-muted/30 font-bold">
                        <td colSpan={5} className="px-3 py-2 text-right">
                          Grand Total
                        </td>
                        <td className="px-3 py-2 text-right text-red-600">
                          {formatCurrency(
                            dueRows.reduce((s, r) => s + r.dueAmount, 0),
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Groups Tab ──────────────────────────────────── */}
      {subTab === "groups" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Fee Groups</h4>
              <p className="text-sm text-muted-foreground">
                Manage fee group names for categorization
              </p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="New group name..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addGroup()}
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground"
                data-ocid="add-group-input"
              />
              <Button
                onClick={addGroup}
                disabled={!newGroupName.trim()}
                data-ocid="add-group-btn"
              >
                Add Group
              </Button>
            </div>

            {groups.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No groups added yet.
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map((g, idx) => (
                  <div
                    key={g.id}
                    className="flex items-center gap-3 bg-muted/30 px-3 py-2 rounded-lg"
                    data-ocid="fee-group-row"
                  >
                    <span className="text-muted-foreground text-sm w-6">
                      {idx + 1}
                    </span>
                    {editGroupId === g.id ? (
                      <input
                        type="text"
                        value={editGroupName}
                        onChange={(e) => setEditGroupName(e.target.value)}
                        className="flex-1 border border-border rounded px-2 py-1 text-sm bg-background"
                      />
                    ) : (
                      <span className="flex-1 font-medium text-sm">
                        {g.name}
                      </span>
                    )}
                    {editGroupId === g.id ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => saveGroupEdit(g.id)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            setEditGroupId(null);
                            setEditGroupName("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            setEditGroupId(g.id);
                            setEditGroupName(g.name);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => deleteGroup(g.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Accounts Tab ──────────────────────────────────── */}
      {subTab === "accounts" && (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold">Fee Accounts</h4>
            <p className="text-sm text-muted-foreground">
              Manage account names and view collected totals
            </p>
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-1">
              Total Fees Received (Current Session)
            </p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(totalReceipts)}
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="New account name (e.g. Main Account, Lab Fund)..."
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAccount()}
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground"
                data-ocid="add-account-input"
              />
              <Button
                onClick={addAccount}
                disabled={!newAccountName.trim()}
                data-ocid="add-account-btn"
              >
                Add Account
              </Button>
            </div>

            {accounts.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No accounts added yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">#</th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Account Name
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Fees Received
                      </th>
                      <th className="px-4 py-3 text-center font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((acc, idx) => (
                      <tr
                        key={acc.id}
                        className="border-t border-border hover:bg-muted/20"
                        data-ocid="fee-account-row"
                      >
                        <td className="px-4 py-3 text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          {editAccountId === acc.id ? (
                            <input
                              type="text"
                              value={editAccountName}
                              onChange={(e) =>
                                setEditAccountName(e.target.value)
                              }
                              className="border border-border rounded px-2 py-1 text-sm bg-background w-48"
                            />
                          ) : (
                            <span className="font-medium">{acc.name}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">
                          {/* First account shows total; others show 0 unless tagged */}
                          {idx === 0
                            ? formatCurrency(totalReceipts)
                            : formatCurrency(0)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1 justify-center">
                            {editAccountId === acc.id ? (
                              <>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => saveAccountEdit(acc.id)}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    setEditAccountId(null);
                                    setEditAccountName("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    setEditAccountId(acc.id);
                                    setEditAccountName(acc.name);
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => deleteAccount(acc.id)}
                                >
                                  Delete
                                </Button>
                              </>
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
        </div>
      )}
    </div>
  );
}
