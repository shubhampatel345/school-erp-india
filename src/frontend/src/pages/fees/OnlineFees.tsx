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
    gpayEnabled: false,
    razorpayEnabled: false,
    payuEnabled: false,
  });
}

export default function OnlineFees() {
  const { currentUser, currentSession, addNotification } = useApp();
  const [settings, setSettings] = useState<GatewaySettings>(getGatewaySettings);
  const [payments, setPayments] = useState<OnlinePayment[]>([]);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payStep, setPayStep] = useState<"select" | "paying" | "success">(
    "select",
  );
  const [searchQ, setSearchQ] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [selectedGateway, setSelectedGateway] = useState<string>("gpay");
  const [showDropdown, setShowDropdown] = useState(false);

  const isSuperAdmin = currentUser?.role === "superadmin";
  const anyEnabled =
    settings.gpayEnabled || settings.razorpayEnabled || settings.payuEnabled;

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

      // Create fee receipt
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

      // Log online payment
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

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-foreground">Online Fees</h3>
        <p className="text-sm text-muted-foreground">
          Configure payment gateways and track online payments
        </p>
      </div>

      {/* Gateway Configuration (Super Admin only) */}
      {isSuperAdmin && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h4 className="font-semibold mb-4">Gateway Configuration</h4>
          <div className="space-y-4">
            {/* GPay */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-border text-lg">
                  📱
                </div>
                <div>
                  <p className="font-medium text-sm">Google Pay (UPI)</p>
                  <p className="text-xs text-muted-foreground">
                    Instant UPI payments via GPay
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm text-muted-foreground">
                  {settings.gpayEnabled ? "Active" : "Inactive"}
                </span>
                <input
                  type="checkbox"
                  checked={settings.gpayEnabled}
                  onChange={(e) =>
                    saveSettings({ gpayEnabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-primary"
                  data-ocid="gpay-toggle"
                />
              </label>
            </div>

            {/* Razorpay */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#072654] rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  R
                </div>
                <div>
                  <p className="font-medium text-sm">Razorpay</p>
                  <p className="text-xs text-muted-foreground">
                    Cards, UPI, NetBanking, Wallets
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm text-muted-foreground">
                  {settings.razorpayEnabled ? "Active" : "Inactive"}
                </span>
                <input
                  type="checkbox"
                  checked={settings.razorpayEnabled}
                  onChange={(e) =>
                    saveSettings({ razorpayEnabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-primary"
                  data-ocid="razorpay-toggle"
                />
              </label>
            </div>

            {/* PayU */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF7E00] rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  P
                </div>
                <div>
                  <p className="font-medium text-sm">PayU</p>
                  <p className="text-xs text-muted-foreground">
                    Cards, UPI, EMI options
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm text-muted-foreground">
                  {settings.payuEnabled ? "Active" : "Inactive"}
                </span>
                <input
                  type="checkbox"
                  checked={settings.payuEnabled}
                  onChange={(e) =>
                    saveSettings({ payuEnabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-primary"
                  data-ocid="payu-toggle"
                />
              </label>
            </div>
          </div>

          {!anyEnabled && (
            <div className="mt-3 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Enable at least one gateway for students/parents to pay online.
            </div>
          )}
        </div>
      )}

      {/* Payment Portal */}
      {anyEnabled && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-semibold">Pay Fees Online</h4>
              <p className="text-xs text-muted-foreground">
                Demo simulation — no real money
              </p>
            </div>
            <Button
              onClick={() => {
                setShowPayDialog(true);
                setPayStep("select");
              }}
              data-ocid="online-pay-btn"
            >
              💳 Pay Now
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {settings.gpayEnabled && (
              <Badge variant="secondary" className="gap-1">
                📱 GPay
              </Badge>
            )}
            {settings.razorpayEnabled && (
              <Badge variant="secondary" className="gap-1">
                R Razorpay
              </Badge>
            )}
            {settings.payuEnabled && (
              <Badge variant="secondary" className="gap-1">
                P PayU
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h4 className="font-semibold mb-3">Online Payment History</h4>
        {payments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No online payments yet.
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
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-border hover:bg-muted/20"
                    data-ocid="online-payment-row"
                  >
                    <td className="px-3 py-2 text-muted-foreground">
                      {p.date}
                    </td>
                    <td className="px-3 py-2 font-medium">{p.studentName}</td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary" className="text-xs">
                        {p.class}-{p.section}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 capitalize">{p.gateway}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p.txnId}</td>
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

      {/* Pay Dialog */}
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
                ? "✅ Payment Successful!"
                : "Pay Fees Online"}
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
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
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
                <Input
                  id="pay-amount"
                  type="number"
                  min="1"
                  placeholder="Enter amount"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  data-ocid="online-pay-amount"
                />
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Payment Gateway</p>
                <div className="flex gap-2 flex-wrap">
                  {settings.gpayEnabled && (
                    <button
                      type="button"
                      onClick={() => setSelectedGateway("gpay")}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${selectedGateway === "gpay" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/50"}`}
                    >
                      📱 GPay
                    </button>
                  )}
                  {settings.razorpayEnabled && (
                    <button
                      type="button"
                      onClick={() => setSelectedGateway("razorpay")}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${selectedGateway === "razorpay" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/50"}`}
                    >
                      R Razorpay
                    </button>
                  )}
                  {settings.payuEnabled && (
                    <button
                      type="button"
                      onClick={() => setSelectedGateway("payu")}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${selectedGateway === "payu" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/50"}`}
                    >
                      P PayU
                    </button>
                  )}
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
                Pay {payAmount ? formatCurrency(Number(payAmount)) : ""}
              </Button>
            </div>
          )}

          {payStep === "paying" && (
            <div className="text-center py-8">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p className="text-muted-foreground">
                Processing payment via {selectedGateway}...
              </p>
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
                  Paid by {selectedStudent?.fullName} via {selectedGateway}
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
