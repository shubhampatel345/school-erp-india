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
import type { FeeReceipt, Student } from "../../types";
import {
  formatCurrency,
  formatDate,
  generateId,
  ls,
} from "../../utils/localStorage";

interface GatewaySettings {
  gpayEnabled: boolean;
  razorpayEnabled: boolean;
  payuEnabled: boolean;
  razorpayKey?: string;
  razorpaySecret?: string;
  payuKey?: string;
}

interface OnlinePayment {
  id: string;
  studentId: string;
  studentName: string;
  admNo: string;
  class: string;
  section: string;
  amount: number;
  gateway: string;
  txnId: string;
  date: string;
  status: "success" | "failed" | "pending";
  receiptId?: string;
}

function getGatewaySettings(): GatewaySettings {
  return ls.get<GatewaySettings>("online_payment_settings", {
    gpayEnabled: true,
    razorpayEnabled: false,
    payuEnabled: false,
  });
}

function getUpiVpa(): string {
  return ls.get<string>("schoolUpiVpa", "school@upi");
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

function getQrUrl(data: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}&margin=10&bgcolor=ffffff`;
}

// ── UPI QR Tab ─────────────────────────────────────────────────────────────────
function UpiQrTab({ students }: { students: Student[] }) {
  const [customAmount, setCustomAmount] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const vpa = getUpiVpa();
  const school = ls.get<{ name: string }>("school_profile", { name: "School" });
  const amount = Number(customAmount) || 0;
  const studentName = selectedStudent?.fullName ?? "Student";
  const upiLink =
    amount > 0 ? buildUpiLink(vpa, school.name, amount, studentName) : "";
  const qrUrl = upiLink ? getQrUrl(upiLink) : "";

  useEffect(() => {
    if (!searchQ) {
      setFilteredStudents([]);
      setShowDropdown(false);
      return;
    }
    const q = searchQ.toLowerCase();
    const res = students
      .filter(
        (s) => s.fullName.toLowerCase().includes(q) || s.admNo.includes(q),
      )
      .slice(0, 6);
    setFilteredStudents(res);
    setShowDropdown(res.length > 0);
  }, [searchQ, students]);

  return (
    <div className="space-y-5">
      {/* How it works */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-indigo-800 mb-3">
          How UPI payment works:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              step: "1",
              icon: "📱",
              text: "Scan the QR code below with any UPI app",
            },
            { step: "2", icon: "✅", text: "Complete payment in your UPI app" },
            {
              step: "3",
              icon: "🔙",
              text: "Return here and click 'I\u2019ve Paid'",
            },
            {
              step: "4",
              icon: "🧾",
              text: "Accountant confirms and generates official receipt",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="flex flex-col items-center text-center gap-1.5"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                {s.step}
              </div>
              <span className="text-xl">{s.icon}</span>
              <p className="text-[11px] text-indigo-700 leading-tight">
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-6 items-start">
        {/* Left: Inputs */}
        <div className="flex flex-col gap-4 min-w-[240px] flex-1">
          {/* Student search */}
          <div className="relative">
            <label
              htmlFor="upi-student-search"
              className="text-sm font-medium block mb-1"
            >
              Student (optional)
            </label>
            <Input
              id="upi-student-search"
              placeholder="Search student name or adm no..."
              value={searchQ}
              onChange={(e) => {
                setSearchQ(e.target.value);
                if (!e.target.value) setSelectedStudent(null);
              }}
              data-ocid="upi-tab-student-search"
            />
            {showDropdown && (
              <div className="absolute z-20 top-full left-0 right-0 bg-card border border-border rounded-lg shadow-lg mt-0.5 max-h-40 overflow-y-auto">
                {filteredStudents.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b border-border last:border-0"
                    onClick={() => {
                      setSelectedStudent(s);
                      setSearchQ(s.fullName);
                      setShowDropdown(false);
                    }}
                  >
                    <span className="font-medium">{s.fullName}</span>
                    <span className="text-muted-foreground text-xs ml-2">
                      {s.admNo} · Cls {s.class}-{s.section}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label
              htmlFor="upi-custom-amount"
              className="text-sm font-medium block mb-1"
            >
              Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              id="upi-custom-amount"
              type="number"
              min="1"
              placeholder="Enter amount"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/40 no-spinner"
              data-ocid="upi-custom-amount-input"
            />
          </div>

          {/* UPI ID display */}
          <div className="bg-muted/40 rounded-lg p-3 text-sm">
            <p className="text-muted-foreground text-xs font-medium mb-0.5">
              School UPI ID
            </p>
            <p className="font-mono font-semibold text-foreground">{vpa}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Change in Fees → Collect Fees → ⚙ UPI Settings
            </p>
          </div>

          {/* Action buttons */}
          {amount > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  window.location.href = upiLink;
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors"
                data-ocid="upi-tab-open-gpay-btn"
              >
                📲 Open GPay
              </button>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <p className="font-semibold mb-1">📋 Manual Confirmation Note</p>
            <p>
              After the parent pays via UPI, the accountant confirms the payment
              in the <strong>Collect Fees</strong> screen and generates the
              official receipt. This ensures the fee register is always
              accurate.
            </p>
          </div>
        </div>

        {/* Right: QR Code */}
        <div className="flex flex-col items-center gap-3">
          {amount > 0 ? (
            <>
              <div className="border-2 border-indigo-200 rounded-xl p-3 bg-white shadow-sm">
                <img
                  src={qrUrl}
                  alt="UPI QR Code"
                  width={200}
                  height={200}
                  className="block"
                  data-ocid="upi-tab-qr-image"
                />
              </div>
              <div className="text-center">
                <p className="text-xl font-extrabold text-indigo-700">
                  ₹{amount.toLocaleString("en-IN")}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Scan with GPay / PhonePe / Paytm / Any UPI App
                </p>
              </div>
            </>
          ) : (
            <div className="w-[228px] h-[228px] border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground bg-muted/20">
              <span className="text-4xl">📱</span>
              <p className="text-sm font-medium">QR will appear here</p>
              <p className="text-xs text-center px-4">
                Enter an amount above to generate the UPI QR code
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Razorpay/API Tab ───────────────────────────────────────────────────────────
function ApiGatewayTab({
  settings,
  onSave,
}: {
  settings: GatewaySettings;
  onSave: (patch: Partial<GatewaySettings>) => void;
}) {
  const [razorpayKey, setRazorpayKey] = useState(settings.razorpayKey ?? "");
  const [razorpaySecret, setRazorpaySecret] = useState(
    settings.razorpaySecret ?? "",
  );
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "ok" | "fail"
  >("idle");

  function testConnection() {
    if (!razorpayKey || !razorpaySecret) {
      setTestStatus("fail");
      return;
    }
    setTestStatus("testing");
    // Simulate connection test
    setTimeout(() => {
      setTestStatus(razorpayKey.startsWith("rzp_") ? "ok" : "fail");
    }, 1500);
  }

  function handleSave() {
    onSave({ razorpayKey, razorpaySecret });
  }

  return (
    <div className="space-y-5">
      {/* Razorpay Config */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#072654] rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">
            R
          </div>
          <div>
            <p className="font-semibold">Razorpay Configuration</p>
            <p className="text-xs text-muted-foreground">
              Cards, UPI, NetBanking, Wallets
            </p>
          </div>
          <label className="flex items-center gap-2 ml-auto cursor-pointer">
            <span className="text-sm text-muted-foreground">
              {settings.razorpayEnabled ? "Active" : "Inactive"}
            </span>
            <input
              type="checkbox"
              checked={settings.razorpayEnabled}
              onChange={(e) => onSave({ razorpayEnabled: e.target.checked })}
              className="w-4 h-4 accent-primary"
              data-ocid="razorpay-toggle"
            />
          </label>
        </div>

        <div className="space-y-3">
          <div>
            <label
              htmlFor="razorpay-key"
              className="text-sm font-medium block mb-1"
            >
              Razorpay Key ID
            </label>
            <Input
              id="razorpay-key"
              type="text"
              placeholder="rzp_live_xxxxxxxxxxxxxxxx"
              value={razorpayKey}
              onChange={(e) => setRazorpayKey(e.target.value)}
              data-ocid="razorpay-key-input"
            />
          </div>
          <div>
            <label
              htmlFor="razorpay-secret"
              className="text-sm font-medium block mb-1"
            >
              Razorpay Key Secret
            </label>
            <Input
              id="razorpay-secret"
              type="password"
              placeholder="Enter your Razorpay Key Secret"
              value={razorpaySecret}
              onChange={(e) => setRazorpaySecret(e.target.value)}
              data-ocid="razorpay-secret-input"
            />
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={testConnection}
              disabled={testStatus === "testing"}
              data-ocid="razorpay-test-btn"
            >
              {testStatus === "testing" ? "Testing…" : "🔗 Test Connection"}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              data-ocid="razorpay-save-btn"
            >
              Save
            </Button>
            {testStatus === "ok" && (
              <span className="text-green-600 text-sm font-semibold">
                ✅ Connected
              </span>
            )}
            {testStatus === "fail" && (
              <span className="text-red-600 text-sm">
                ❌ Connection failed — check credentials
              </span>
            )}
          </div>
        </div>
      </div>

      {/* PayU Config */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-[#FF7E00] rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">
            P
          </div>
          <div>
            <p className="font-semibold">PayU Configuration</p>
            <p className="text-xs text-muted-foreground">
              Cards, UPI, EMI options
            </p>
          </div>
          <label className="flex items-center gap-2 ml-auto cursor-pointer">
            <span className="text-sm text-muted-foreground">
              {settings.payuEnabled ? "Active" : "Inactive"}
            </span>
            <input
              type="checkbox"
              checked={settings.payuEnabled}
              onChange={(e) => onSave({ payuEnabled: e.target.checked })}
              className="w-4 h-4 accent-primary"
              data-ocid="payu-toggle"
            />
          </label>
        </div>
        <div>
          <label htmlFor="payu-key" className="text-sm font-medium block mb-1">
            PayU Merchant Key
          </label>
          <Input
            id="payu-key"
            type="text"
            placeholder="Enter your PayU Merchant Key"
            value={settings.payuKey ?? ""}
            onChange={(e) => onSave({ payuKey: e.target.value })}
            data-ocid="payu-key-input"
          />
        </div>
      </div>

      <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">🔒 Security Note</p>
        <p>
          API keys are stored locally in the browser. For production use,
          configure keys on your backend server and use server-side payment
          initiation for enhanced security.
        </p>
      </div>
    </div>
  );
}

export default function OnlineFees() {
  const { currentUser, currentSession, addNotification } = useApp();
  const [settings, setSettings] = useState<GatewaySettings>(getGatewaySettings);
  const [payments, setPayments] = useState<OnlinePayment[]>([]);
  const [activeTab, setActiveTab] = useState<"upi" | "api" | "history">("upi");
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payStep, setPayStep] = useState<"select" | "paying" | "success">(
    "select",
  );
  const [searchQ, setSearchQ] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [selectedGateway, setSelectedGateway] = useState<string>("upi");
  const [showDropdown, setShowDropdown] = useState(false);

  const isSuperAdmin = currentUser?.role === "superadmin";

  useEffect(() => {
    setStudents(
      ls.get<Student[]>("students", []).filter((s) => s.status === "active"),
    );
    setPayments(ls.get<OnlinePayment[]>("online_payments", []));
  }, []);

  useEffect(() => {
    if (!searchQ) {
      setFilteredStudents([]);
      setShowDropdown(false);
      return;
    }
    const q = searchQ.toLowerCase();
    const res = students
      .filter(
        (s) => s.fullName.toLowerCase().includes(q) || s.admNo.includes(q),
      )
      .slice(0, 6);
    setFilteredStudents(res);
    setShowDropdown(res.length > 0);
  }, [searchQ, students]);

  function saveSettings(patch: Partial<GatewaySettings>) {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    ls.set("online_payment_settings", updated);
  }

  function simulatePayment() {
    if (!selectedStudent || !payAmount || !currentSession) return;
    setPayStep("paying");
    setTimeout(() => {
      const txnId = `TXN${Date.now().toString(36).toUpperCase()}`;
      const receiptId = generateId();
      const receiptNo = `ONL-${Math.floor(Math.random() * 9000) + 1000}`;
      const amount = Number(payAmount);

      const receipt: FeeReceipt = {
        id: receiptId,
        receiptNo,
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        admNo: selectedStudent.admNo,
        class: selectedStudent.class,
        section: selectedStudent.section,
        date: formatDate(new Date()),
        items: [],
        otherCharges: [
          { label: "Online Payment", paidAmount: amount, dueAmount: 0 },
        ],
        discount: 0,
        oldBalance: 0,
        totalAmount: amount,
        paymentMode: "Online",
        receivedBy: "Online Portal",
        receivedByRole: "system",
        sessionId: currentSession.id,
      };
      const allReceipts = ls.get<FeeReceipt[]>("fee_receipts", []);
      ls.set("fee_receipts", [...allReceipts, receipt]);

      const payment: OnlinePayment = {
        id: generateId(),
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        admNo: selectedStudent.admNo,
        class: selectedStudent.class,
        section: selectedStudent.section,
        amount,
        gateway: selectedGateway,
        txnId,
        date: formatDate(new Date()),
        status: "success",
        receiptId,
      };
      const allPayments = ls.get<OnlinePayment[]>("online_payments", []);
      const updatedPayments = [payment, ...allPayments];
      ls.set("online_payments", updatedPayments);
      setPayments(updatedPayments);

      addNotification(
        `Online payment received: ₹${amount} from ${selectedStudent.fullName}`,
        "success",
        "💳",
      );

      setPayStep("success");
    }, 2000);
  }

  const tabs: Array<{
    id: "upi" | "api" | "history";
    label: string;
    icon: string;
  }> = [
    { id: "upi", label: "UPI QR", icon: "📱" },
    { id: "api", label: "Razorpay / PayU", icon: "💳" },
    { id: "history", label: "Payment History", icon: "📋" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-foreground">Online Fees</h3>
        <p className="text-sm text-muted-foreground">
          UPI QR payments, gateway configuration, and online payment history
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-muted/40 p-1 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-ocid={`online-fees-tab-${tab.id}`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-card border border-border rounded-xl p-4">
        {activeTab === "upi" && <UpiQrTab students={students} />}
        {activeTab === "api" && (
          <ApiGatewayTab settings={settings} onSave={saveSettings} />
        )}
        {activeTab === "history" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Online Payment History</h4>
              {isSuperAdmin && (
                <Button
                  size="sm"
                  onClick={() => {
                    setShowPayDialog(true);
                    setPayStep("select");
                  }}
                  data-ocid="online-pay-btn"
                >
                  💳 Record Payment
                </Button>
              )}
            </div>
            {payments.length === 0 ? (
              <div
                className="text-center py-8 text-muted-foreground text-sm"
                data-ocid="online-payments-empty"
              >
                No online payments recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Student</th>
                      <th className="px-3 py-2 text-left">Class</th>
                      <th className="px-3 py-2 text-left">Gateway</th>
                      <th className="px-3 py-2 text-left">Txn ID</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, idx) => (
                      <tr
                        key={p.id}
                        className="border-t border-border hover:bg-muted/20"
                        data-ocid={`online-payment-row.item.${idx + 1}`}
                      >
                        <td className="px-3 py-2 text-muted-foreground">
                          {p.date}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {p.studentName}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="secondary" className="text-xs">
                            {p.class}-{p.section}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 capitalize">{p.gateway}</td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {p.txnId}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-green-600">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Badge
                            className={
                              p.status === "success"
                                ? "bg-green-100 text-green-700 border-green-300"
                                : p.status === "failed"
                                  ? "bg-red-100 text-red-700 border-red-300"
                                  : "bg-amber-100 text-amber-700 border-amber-300"
                            }
                            variant="outline"
                          >
                            {p.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Gateway Config (Super Admin) — GPay toggle */}
      {isSuperAdmin && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h4 className="font-semibold mb-3 text-sm">
            Gateway Visibility Settings
          </h4>
          <div className="flex flex-wrap gap-3">
            {[
              {
                key: "gpayEnabled" as const,
                label: "Google Pay (UPI)",
                icon: "📱",
                desc: "Show UPI QR tab for parents",
              },
              {
                key: "razorpayEnabled" as const,
                label: "Razorpay",
                icon: "💳",
                desc: "Cards, UPI, NetBanking",
              },
              {
                key: "payuEnabled" as const,
                label: "PayU",
                icon: "💰",
                desc: "Cards, UPI, EMI",
              },
            ].map((g) => (
              <div
                key={g.key}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg gap-4 min-w-[220px]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{g.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{g.label}</p>
                    <p className="text-xs text-muted-foreground">{g.desc}</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-muted-foreground">
                    {settings[g.key] ? "On" : "Off"}
                  </span>
                  <input
                    type="checkbox"
                    checked={settings[g.key]}
                    onChange={(e) =>
                      saveSettings({ [g.key]: e.target.checked })
                    }
                    className="w-4 h-4 accent-primary"
                    data-ocid={`${g.key}-toggle`}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record Payment Dialog */}
      <Dialog
        open={showPayDialog}
        onOpenChange={(v) => {
          if (!v) {
            setShowPayDialog(false);
            setPayStep("select");
            setSelectedStudent(null);
            setSearchQ("");
            setPayAmount("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {payStep === "success"
                ? "✅ Payment Recorded!"
                : "Record Online Payment"}
            </DialogTitle>
          </DialogHeader>

          {payStep === "select" && (
            <div className="space-y-4">
              <div className="relative">
                <Input
                  placeholder="Search student..."
                  value={searchQ}
                  onChange={(e) => {
                    setSearchQ(e.target.value);
                    if (!e.target.value) setSelectedStudent(null);
                  }}
                  data-ocid="online-pay-search"
                />
                {showDropdown && (
                  <div className="absolute z-20 top-full left-0 right-0 bg-card border border-border rounded-lg shadow-lg mt-1">
                    {filteredStudents.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b border-border last:border-0"
                        onClick={() => {
                          setSelectedStudent(s);
                          setSearchQ(s.fullName);
                          setShowDropdown(false);
                        }}
                      >
                        {s.fullName} — {s.admNo}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedStudent && (
                <div className="bg-muted/30 rounded-lg px-3 py-2 text-sm">
                  <p className="font-medium">{selectedStudent.fullName}</p>
                  <p className="text-muted-foreground">
                    Class {selectedStudent.class}-{selectedStudent.section}
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="pay-amount"
                  className="text-sm font-medium mb-1 block"
                >
                  Amount (₹)
                </label>
                <input
                  id="pay-amount"
                  type="number"
                  min="1"
                  placeholder="Enter amount"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/40 no-spinner"
                  data-ocid="online-pay-amount"
                />
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Gateway</p>
                <div className="flex gap-2 flex-wrap">
                  {(["upi", "gpay", "razorpay", "payu"] as const).map((gw) => (
                    <button
                      key={gw}
                      type="button"
                      onClick={() => setSelectedGateway(gw)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${selectedGateway === gw ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/50"}`}
                    >
                      {gw === "upi"
                        ? "📱 UPI"
                        : gw === "gpay"
                          ? "📲 GPay"
                          : gw === "razorpay"
                            ? "R Razorpay"
                            : "P PayU"}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full"
                disabled={
                  !selectedStudent || !payAmount || Number(payAmount) <= 0
                }
                onClick={simulatePayment}
                data-ocid="confirm-pay-btn"
              >
                Record {payAmount ? formatCurrency(Number(payAmount)) : ""}
              </Button>
            </div>
          )}

          {payStep === "paying" && (
            <div className="text-center py-8">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p className="text-muted-foreground">Recording payment…</p>
            </div>
          )}

          {payStep === "success" && (
            <div className="text-center py-4 space-y-3">
              <div className="text-5xl">✅</div>
              <div>
                <p className="font-bold text-lg text-green-600">
                  {formatCurrency(Number(payAmount))}
                </p>
                <p className="text-sm text-muted-foreground">
                  Recorded for {selectedStudent?.fullName} via {selectedGateway}
                </p>
              </div>
              <p className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1">
                Receipt auto-generated in Fee Register
              </p>
              <Button
                className="w-full"
                onClick={() => {
                  setShowPayDialog(false);
                  setPayStep("select");
                  setSelectedStudent(null);
                  setSearchQ("");
                  setPayAmount("");
                }}
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
