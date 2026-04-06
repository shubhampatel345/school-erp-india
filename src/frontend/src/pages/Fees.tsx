import {
  BookOpen,
  Calendar,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  MessageSquare,
  Plus,
  Printer,
  ScrollText,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { addERPNotification } from "../components/layout/Header";

// ─── Number to Words Helper ──────────────────────────────────────────────────
function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tensArr = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  function twoDigits(v: number): string {
    if (v < 20) return ones[v];
    return (
      tensArr[Math.floor(v / 10)] + (v % 10 !== 0 ? ` ${ones[v % 10]}` : "")
    );
  }
  function threeDigits(v: number): string {
    if (v >= 100)
      return `${ones[Math.floor(v / 100)]} Hundred${v % 100 !== 0 ? ` ${twoDigits(v % 100)}` : ""}`;
    return twoDigits(v);
  }
  let result = "";
  let rem = num;
  if (rem >= 10000000) {
    result += `${threeDigits(Math.floor(rem / 10000000))} Crore `;
    rem %= 10000000;
  }
  if (rem >= 100000) {
    result += `${threeDigits(Math.floor(rem / 100000))} Lakh `;
    rem %= 100000;
  }
  if (rem >= 1000) {
    result += `${threeDigits(Math.floor(rem / 1000))} Thousand `;
    rem %= 1000;
  }
  if (rem > 0) result += threeDigits(rem);
  return result.trim();
}

// ─── Receipt Print Modal ──────────────────────────────────────────────────────

interface ReceiptPrintModalProps {
  open: boolean;
  onClose: () => void;
  receiptNo: string;
  date: string;
  student: {
    admNo: string;
    name: string;
    fatherName?: string;
    className: string;
    rollNo: string;
    contact: string;
  } | null;
  selectedMonths: string[];
  feeRows: Array<{
    feeHead: string;
    months: Record<string, number>;
    checked: boolean;
  }>;
  totalFees: number;
  otherTotal: number;
  concessionAmt: number;
  netFees: number;
  receiptAmt: number;
  section?: string;
  sid?: string;
  regNo?: string;
  sess?: string;
  motherName?: string;
  paymentMode?: string;
  otherChargeType?: string;
  sessionDues?: number;
}

function ReceiptPrintModal({
  open,
  onClose,
  receiptNo,
  date,
  student,
  selectedMonths,
  feeRows,
  totalFees: _totalFees,
  otherTotal,
  concessionAmt,
  netFees,
  receiptAmt,
  section,
  sid,
  regNo,
  sess,
  motherName,
  paymentMode: receiptPaymentMode,
  otherChargeType,
  sessionDues,
}: ReceiptPrintModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<1 | 2 | 3 | 4>(1);
  if (!open) return null;

  const schoolName = (() => {
    try {
      return (
        JSON.parse(localStorage.getItem("erp_school_profile") || "{}").name ||
        "Delhi Public School"
      );
    } catch {
      return "Delhi Public School";
    }
  })();
  const schoolAddress = (() => {
    try {
      return (
        JSON.parse(localStorage.getItem("erp_school_profile") || "{}")
          .address || "Sector 14, Dwarka, New Delhi"
      );
    } catch {
      return "Sector 14, Dwarka, New Delhi";
    }
  })();

  const rowsForPrint = feeRows.filter(
    (r) =>
      r.checked &&
      selectedMonths.reduce((s, m) => s + (r.months[m] || 0), 0) > 0,
  );
  const monthsLabel = selectedMonths.join(", ");

  const printReceipt = () => {
    const el = document.getElementById("fee-receipt-print-area");
    if (!el) return;
    const isBharatiFormat = selectedTemplate === 4;
    const win = window.open(
      "",
      "_blank",
      isBharatiFormat ? "width=420,height=580" : "width=800,height=600",
    );
    if (!win) return;
    const pageStyle = isBharatiFormat
      ? "@page { size: 105mm 145mm; margin: 0; } body { margin: 0; padding: 0; width: 105mm; overflow: hidden; display: block; }"
      : "@page { margin: 10mm; } body { margin: 0; font-family: Arial, sans-serif; }";
    win.document.write(`<html><head><title>Fee Receipt - ${receiptNo}</title><style>
      ${pageStyle}
      * { box-sizing: border-box; }
      body { margin: 0; padding: 0; display: block; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ccc; padding: 4px 8px; font-size: 11px; }
      th { background: #f0f2f5; font-weight: 600; }
      .dashed { border-top: 2px dashed #999; margin: 8px 0; }
    </style></head><body><div style="margin:0;padding:0;">${el.innerHTML}</div></body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  };

  const renderTemplate1 = () => (
    <div
      style={{
        background: "#fff",
        padding: 16,
        fontFamily: "Arial, sans-serif",
        fontSize: 11,
        color: "#1a1a1a",
        minWidth: 500,
      }}
    >
      <div
        style={{
          textAlign: "center",
          marginBottom: 8,
          borderBottom: "2px solid #1e3a5f",
          paddingBottom: 8,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 16,
            color: "#1e3a5f",
            letterSpacing: 1,
          }}
        >
          {schoolName.toUpperCase()}
        </div>
        <div style={{ fontSize: 10, color: "#6b7280" }}>{schoolAddress}</div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 13,
            marginTop: 6,
            color: "#374151",
          }}
        >
          FEE RECEIPT
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
          fontSize: 10,
        }}
      >
        <span>
          <b>Receipt No.:</b> {receiptNo}
        </span>
        <span>
          <b>Date:</b> {date}
        </span>
      </div>
      {student && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2px 16px",
            marginBottom: 10,
            fontSize: 10,
          }}
        >
          <span>
            <b>Adm. No.:</b> {student.admNo}
          </span>
          <span>
            <b>Class:</b> {student.className}
          </span>
          <span>
            <b>Name:</b> {student.name}
          </span>
          <span>
            <b>Roll No.:</b> {student.rollNo}
          </span>
          <span>
            <b>Father:</b> {student.fatherName || "-"}
          </span>
          <span>
            <b>Months:</b> {monthsLabel || "-"}
          </span>
        </div>
      )}
      <table style={{ marginBottom: 8 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Fee Head</th>
            <th style={{ textAlign: "right" }}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {rowsForPrint.map((r) => {
            const total = selectedMonths.reduce(
              (s, m) => s + (r.months[m] || 0),
              0,
            );
            return (
              <tr key={r.feeHead}>
                <td>{r.feeHead}</td>
                <td style={{ textAlign: "right" }}>
                  ₹{total.toLocaleString("en-IN")}
                </td>
              </tr>
            );
          })}
          {otherTotal > 0 && (
            <tr>
              <td>{otherChargeType || "Other Charges"}</td>
              <td style={{ textAlign: "right" }}>
                ₹{otherTotal.toLocaleString("en-IN")}
              </td>
            </tr>
          )}
          {concessionAmt > 0 && (
            <tr>
              <td style={{ color: "#16a34a" }}>Concession</td>
              <td style={{ textAlign: "right", color: "#16a34a" }}>
                - ₹{concessionAmt.toLocaleString("en-IN")}
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr style={{ background: "#e8f0fe" }}>
            <td>
              <b>Net Fees</b>
            </td>
            <td style={{ textAlign: "right" }}>
              <b>₹{netFees.toLocaleString("en-IN")}</b>
            </td>
          </tr>
          <tr style={{ background: "#d1fae5" }}>
            <td>
              <b>Amount Received</b>
            </td>
            <td style={{ textAlign: "right" }}>
              <b>₹{receiptAmt.toLocaleString("en-IN")}</b>
            </td>
          </tr>
        </tfoot>
      </table>
      {sessionDues !== undefined && sessionDues > 0 && (
        <div
          style={{
            fontSize: 10,
            marginTop: 8,
            padding: "4px 8px",
            background: "#fff3cd",
            border: "1px solid #f59e0b",
            borderRadius: 4,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontWeight: 700 }}>Session Total Dues:</span>
          <span style={{ fontWeight: 700, color: "#dc2626" }}>
            ₹{sessionDues.toLocaleString("en-IN")}
          </span>
        </div>
      )}
      <div
        style={{
          fontSize: 10,
          marginTop: 16,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>Date: _____________</span>
        <span>Received by: _____________</span>
      </div>
    </div>
  );

  const renderTemplate2 = () => {
    const copyBlock = (label: string) => (
      <div
        style={{
          background: "#fff",
          padding: 12,
          fontFamily: "Arial, sans-serif",
          fontSize: 10,
          color: "#1a1a1a",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: 6,
            borderBottom: "1px solid #ccc",
            paddingBottom: 4,
          }}
        >
          <b style={{ fontSize: 13, color: "#1e3a5f" }}>{schoolName}</b>
          <div style={{ color: "#6b7280", fontSize: 9 }}>{schoolAddress}</div>
          <b style={{ fontSize: 11 }}>FEE RECEIPT</b>
          <span
            style={{
              float: "right",
              background: "#e0f0ff",
              padding: "1px 6px",
              borderRadius: 2,
              fontSize: 9,
            }}
          >
            {label}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <span>
            <b>Receipt:</b> {receiptNo}
          </span>
          <span>
            <b>Date:</b> {date}
          </span>
        </div>
        {student && (
          <div style={{ marginBottom: 4 }}>
            <b>Student:</b> {student.name} | <b>Adm No:</b> {student.admNo} |{" "}
            <b>Class:</b> {student.className}
          </div>
        )}
        <div style={{ marginBottom: 4 }}>
          <b>Months:</b> {monthsLabel || "-"}
        </div>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 9,
            marginBottom: 6,
          }}
        >
          <tbody>
            {rowsForPrint.map((r) => {
              const total = selectedMonths.reduce(
                (s, m) => s + (r.months[m] || 0),
                0,
              );
              return (
                <tr key={r.feeHead}>
                  <td
                    style={{ borderBottom: "1px solid #eee", padding: "1px 0" }}
                  >
                    {r.feeHead}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    ₹{total.toLocaleString("en-IN")}
                  </td>
                </tr>
              );
            })}
            {otherTotal > 0 && (
              <tr key="other-charges">
                <td
                  style={{ borderBottom: "1px solid #eee", padding: "1px 0" }}
                >
                  {otherChargeType || "Other Charges"}
                </td>
                <td
                  style={{ textAlign: "right", borderBottom: "1px solid #eee" }}
                >
                  ₹{otherTotal.toLocaleString("en-IN")}
                </td>
              </tr>
            )}
            <tr style={{ fontWeight: 700, borderTop: "2px solid #1e3a5f" }}>
              <td>Amount Paid</td>
              <td style={{ textAlign: "right" }}>
                ₹{receiptAmt.toLocaleString("en-IN")}
              </td>
            </tr>
          </tbody>
        </table>
        <div
          style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}
        >
          <span style={{ fontSize: 9 }}>Cashier Signature: ___________</span>
        </div>
      </div>
    );
    return (
      <div>
        {copyBlock("SCHOOL COPY")}
        <div
          style={{
            borderTop: "2px dashed #999",
            margin: "8px 0",
            textAlign: "center",
            fontSize: 9,
            color: "#999",
          }}
        >
          ✂ cut here
        </div>
        {copyBlock("STUDENT COPY")}
      </div>
    );
  };

  const renderTemplate3 = () => (
    <div
      style={{
        background: "#fff",
        fontFamily: "Arial, sans-serif",
        fontSize: 11,
        color: "#1a1a1a",
        minWidth: 500,
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg,#1e3a5f,#1565c0)",
          padding: "16px 20px",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              background: "rgba(255,255,255,0.2)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
          >
            🏫
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: 0.5 }}>
              {schoolName.toUpperCase()}
            </div>
            <div style={{ fontSize: 9, opacity: 0.8 }}>{schoolAddress}</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: 2 }}>
              FEE RECEIPT
            </div>
            <div style={{ fontSize: 10, opacity: 0.85 }}>{receiptNo}</div>
          </div>
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginBottom: 12,
            background: "#f8faff",
            padding: 10,
            borderRadius: 6,
            fontSize: 10,
          }}
        >
          {student && (
            <>
              <div>
                <span style={{ color: "#6b7280" }}>Student Name</span>
                <br />
                <b>{student.name}</b>
              </div>
              <div>
                <span style={{ color: "#6b7280" }}>Adm. No.</span>
                <br />
                <b>{student.admNo}</b>
              </div>
              <div>
                <span style={{ color: "#6b7280" }}>Class</span>
                <br />
                <b>{student.className}</b>
              </div>
              <div>
                <span style={{ color: "#6b7280" }}>Date</span>
                <br />
                <b>{date}</b>
              </div>
              <div>
                <span style={{ color: "#6b7280" }}>Father Name</span>
                <br />
                <b>{student.fatherName || "-"}</b>
              </div>
              <div>
                <span style={{ color: "#6b7280" }}>Months</span>
                <br />
                <b>{monthsLabel || "-"}</b>
              </div>
            </>
          )}
        </div>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: 8,
            fontSize: 11,
          }}
        >
          <thead>
            <tr style={{ background: "#e8f0fe" }}>
              <th
                style={{
                  textAlign: "left",
                  padding: "6px 8px",
                  border: "1px solid #dde6f4",
                }}
              >
                Fee Head
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "6px 8px",
                  border: "1px solid #dde6f4",
                }}
              >
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {rowsForPrint.map((r, i) => {
              const total = selectedMonths.reduce(
                (s, m) => s + (r.months[m] || 0),
                0,
              );
              return (
                <tr
                  key={r.feeHead}
                  style={{ background: i % 2 === 0 ? "#fff" : "#f8faff" }}
                >
                  <td style={{ padding: "5px 8px", border: "1px solid #eee" }}>
                    {r.feeHead}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "5px 8px",
                      border: "1px solid #eee",
                    }}
                  >
                    ₹{total.toLocaleString("en-IN")}
                  </td>
                </tr>
              );
            })}
            {otherTotal > 0 && (
              <tr>
                <td style={{ padding: "5px 8px", border: "1px solid #eee" }}>
                  {otherChargeType || "Other Charges"}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "5px 8px",
                    border: "1px solid #eee",
                  }}
                >
                  ₹{otherTotal.toLocaleString("en-IN")}
                </td>
              </tr>
            )}
            {concessionAmt > 0 && (
              <tr>
                <td
                  style={{
                    padding: "5px 8px",
                    border: "1px solid #eee",
                    color: "#16a34a",
                  }}
                >
                  Concession
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "5px 8px",
                    border: "1px solid #eee",
                    color: "#16a34a",
                  }}
                >
                  - ₹{concessionAmt.toLocaleString("en-IN")}
                </td>
              </tr>
            )}
            <tr style={{ background: "#1e3a5f", color: "#fff" }}>
              <td style={{ padding: "7px 8px", fontWeight: 700 }}>
                Amount Received
              </td>
              <td
                style={{
                  textAlign: "right",
                  padding: "7px 8px",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                ₹{receiptAmt.toLocaleString("en-IN")}
              </td>
            </tr>
          </tbody>
        </table>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 12,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              border: "1.5px dashed #94a3b8",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              color: "#94a3b8",
              textAlign: "center",
            }}
          >
            OFFICIAL
            <br />
            SEAL
          </div>
          <div style={{ textAlign: "right", fontSize: 10 }}>
            <div style={{ marginBottom: 20 }}>Authorized Signature</div>
            <div
              style={{ borderTop: "1px solid #333", paddingTop: 4, width: 140 }}
            >
              Cashier / Accountant
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTemplate4 = () => {
    const schoolProfile = (() => {
      try {
        return JSON.parse(localStorage.getItem("erp_school_profile") || "{}");
      } catch {
        return {};
      }
    })();
    const t4SchoolName = schoolProfile.name || "School Name";
    const t4Address = schoolProfile.address || "";
    const t4Website = schoolProfile.website || "www.DigitalSchoolERP.com";
    const t4SchoolCode = schoolProfile.schoolCode || schoolProfile.code || "";
    const t4Mobile = schoolProfile.mobile || schoolProfile.phone || "";
    const t4AffiliationNo =
      schoolProfile.affiliationNo || schoolProfile.affiliation || "";
    const t4SchoolNo = schoolProfile.schoolNo || "";

    const checkedRowsT4 = feeRows.filter(
      (r) =>
        r.checked &&
        selectedMonths.reduce((s, m) => s + (r.months[m] || 0), 0) > 0,
    );
    const monthsCount = selectedMonths.length;
    const monthsLabelT4 = selectedMonths.join(" ");
    const balance = netFees - receiptAmt;
    const amountInWords = numberToWords(receiptAmt);

    // Inline SVG logo - floral/lotus motif
    const logoSvg = (
      <svg
        width="40"
        height="40"
        viewBox="0 0 50 50"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="25" cy="25" r="5" fill="#c00" />
        <ellipse cx="25" cy="12" rx="4" ry="8" fill="#c00" opacity="0.8" />
        <ellipse cx="25" cy="38" rx="4" ry="8" fill="#c00" opacity="0.8" />
        <ellipse cx="12" cy="25" rx="8" ry="4" fill="#2d7a2d" opacity="0.8" />
        <ellipse cx="38" cy="25" rx="8" ry="4" fill="#2d7a2d" opacity="0.8" />
        <ellipse
          cx="15"
          cy="15"
          rx="4"
          ry="8"
          fill="#c00"
          opacity="0.6"
          transform="rotate(-45 15 15)"
        />
        <ellipse
          cx="35"
          cy="35"
          rx="4"
          ry="8"
          fill="#c00"
          opacity="0.6"
          transform="rotate(-45 35 35)"
        />
        <ellipse
          cx="35"
          cy="15"
          rx="4"
          ry="8"
          fill="#2d7a2d"
          opacity="0.6"
          transform="rotate(45 35 15)"
        />
        <ellipse
          cx="15"
          cy="35"
          rx="4"
          ry="8"
          fill="#2d7a2d"
          opacity="0.6"
          transform="rotate(45 15 35)"
        />
        <circle cx="25" cy="25" r="4" fill="#fff" />
        <circle cx="25" cy="25" r="2" fill="#c00" />
      </svg>
    );

    // Scannable QR code with receipt data
    const qrData = `Receipt:${receiptNo}|Student:${student?.name || ""}|Adm:${student?.admNo || ""}|Class:${student?.className || ""}|Months:${selectedMonths.join(",")}|Amount:${receiptAmt}|Date:${date}|Mode:${receiptPaymentMode || "Cash"}`;
    const qrSvg = (
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(qrData)}`}
        width={55}
        height={55}
        alt="QR Code"
        style={{ border: "1px solid #888" }}
        crossOrigin="anonymous"
      />
    );

    // Student photo placeholder SVG
    const photoSvg = (
      <svg
        width="50"
        height="65"
        viewBox="0 0 60 75"
        xmlns="http://www.w3.org/2000/svg"
        style={{ border: "1px solid #aaa" }}
        aria-hidden="true"
      >
        <rect width="60" height="75" fill="#f0f4ff" />
        <circle cx="30" cy="25" r="12" fill="#9ca3af" />
        <ellipse cx="30" cy="60" rx="18" ry="14" fill="#9ca3af" />
      </svg>
    );

    return (
      <div
        style={{
          background: "#fff",
          fontFamily: "Arial, sans-serif",
          fontSize: 10,
          color: "#1a1a1a",
          border: "1px solid #888",
          width: "397px",
          height: "549px",
          minWidth: "397px",
          maxWidth: "397px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            padding: "8px 10px 6px 10px",
            borderBottom: "1px solid #bbb",
            gap: 10,
          }}
        >
          <div style={{ flexShrink: 0 }}>{logoSvg}</div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: "#c00",
                letterSpacing: 0.5,
                lineHeight: 1.2,
              }}
            >
              {t4SchoolName}
            </div>
            <div style={{ fontSize: 11, color: "#1a1a1a", marginTop: 2 }}>
              {t4Address}
            </div>
            <div style={{ fontSize: 10, color: "#2d7a2d", marginTop: 1 }}>
              {t4Website}
            </div>
            <div style={{ fontSize: 9, color: "#555", marginTop: 2 }}>
              {t4SchoolCode ? `Sch. Code: ${t4SchoolCode}` : ""}
              {t4SchoolCode && t4Mobile ? " | " : ""}
              {t4Mobile ? `Mob: ${t4Mobile}` : ""}
            </div>
            <div style={{ fontSize: 9, color: "#555", marginTop: 1 }}>
              {t4AffiliationNo ? `Affiliation No: ${t4AffiliationNo}` : ""}
              {t4AffiliationNo && t4SchoolNo ? " | " : ""}
              {t4SchoolNo ? `School No: ${t4SchoolNo}` : ""}
            </div>
          </div>
          <div style={{ flexShrink: 0, textAlign: "right" }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 11,
                color: "#1a1a1a",
                border: "1px solid #888",
                padding: "2px 6px",
                borderRadius: 2,
              }}
            >
              FEES RECEIPT
            </div>
            <div style={{ fontSize: 9, color: "#555", marginTop: 3 }}>
              Receipt No: {receiptNo}
            </div>
          </div>
        </div>

        {/* Student Info Block */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            padding: "6px 10px",
            borderBottom: "1px solid #bbb",
            gap: 8,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "2px 10px",
                marginBottom: 4,
                fontSize: 10,
              }}
            >
              <span>
                <b>R.No:</b> {student?.rollNo || "-"}
              </span>
              <span>
                <b>Date:</b> {date}
              </span>
              <span>
                <b>Class:</b> {student?.className || "-"}
              </span>
              <span>
                <b>Sec.:</b> {section || "A"}
              </span>
              <span>
                <b>SID:</b> {sid || student?.admNo || "-"}
              </span>
              <span>
                <b>Reg.:</b> {regNo || "-"}
              </span>
              <span>
                <b>Sess.:</b> {sess || "2025-26"}
              </span>
            </div>
            <div style={{ marginBottom: 2, fontSize: 10 }}>
              <span
                style={{ display: "inline-block", width: 60, color: "#555" }}
              >
                Student:
              </span>
              <b style={{ color: "#1a3a8f" }}>{student?.name || "-"}</b>
            </div>
            <div style={{ marginBottom: 2, fontSize: 10 }}>
              <span
                style={{ display: "inline-block", width: 60, color: "#555" }}
              >
                Father:
              </span>
              <b style={{ color: "#1a3a8f" }}>{student?.fatherName || "-"}</b>
            </div>
            <div style={{ marginBottom: 2, fontSize: 10 }}>
              <span
                style={{ display: "inline-block", width: 60, color: "#555" }}
              >
                Mother:
              </span>
              <b style={{ color: "#1a3a8f" }}>{motherName || "-"}</b>
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>{photoSvg}</div>
        </div>

        {/* Months Highlight */}
        <div
          style={{
            padding: "5px 10px",
            borderBottom: "1px solid #bbb",
            textAlign: "center",
          }}
        >
          <span style={{ color: "#c00", fontWeight: 700, fontSize: 12 }}>
            ▶ {monthsLabelT4} ({monthsCount} month{monthsCount !== 1 ? "s" : ""}
            ) ◀
          </span>
        </div>

        {/* Fee Table + QR */}
        <div style={{ display: "flex", borderBottom: "1px solid #bbb" }}>
          <div style={{ flex: 1 }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 10,
              }}
            >
              <thead>
                <tr style={{ background: "#f0f2f5" }}>
                  <th
                    style={{
                      border: "1px solid #bbb",
                      padding: "4px 6px",
                      textAlign: "center",
                      width: 28,
                    }}
                  >
                    Sr.
                  </th>
                  <th
                    style={{
                      border: "1px solid #bbb",
                      padding: "4px 6px",
                      textAlign: "left",
                    }}
                  >
                    PARTICULARS
                  </th>
                  <th
                    style={{
                      border: "1px solid #bbb",
                      padding: "4px 6px",
                      textAlign: "right",
                      width: 70,
                    }}
                  >
                    AMOUNT
                  </th>
                </tr>
              </thead>
              <tbody>
                {checkedRowsT4.map((r, i) => {
                  const total = selectedMonths.reduce(
                    (s, m) => s + (r.months[m] || 0),
                    0,
                  );
                  return (
                    <tr key={r.feeHead}>
                      <td
                        style={{
                          border: "1px solid #ddd",
                          padding: "3px 6px",
                          textAlign: "center",
                        }}
                      >
                        {i + 1}
                      </td>
                      <td
                        style={{ border: "1px solid #ddd", padding: "3px 6px" }}
                      >
                        {r.feeHead}
                      </td>
                      <td
                        style={{
                          border: "1px solid #ddd",
                          padding: "3px 6px",
                          textAlign: "right",
                        }}
                      >
                        {total.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  );
                })}
                {otherTotal > 0 && (
                  <tr>
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: "3px 6px",
                        textAlign: "center",
                      }}
                    >
                      {checkedRowsT4.length + 1}
                    </td>
                    <td
                      style={{ border: "1px solid #ddd", padding: "3px 6px" }}
                    >
                      {otherChargeType || "Other Charges"}
                    </td>
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: "3px 6px",
                        textAlign: "right",
                      }}
                    >
                      {otherTotal.toLocaleString("en-IN")}
                    </td>
                  </tr>
                )}
                {concessionAmt > 0 && (
                  <tr>
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: "3px 6px",
                        textAlign: "center",
                      }}
                    >
                      -
                    </td>
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: "3px 6px",
                        color: "#16a34a",
                      }}
                    >
                      Concession
                    </td>
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: "3px 6px",
                        textAlign: "right",
                        color: "#16a34a",
                      }}
                    >
                      -{concessionAmt.toLocaleString("en-IN")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div
            style={{
              flexShrink: 0,
              padding: "8px 8px",
              borderLeft: "1px solid #bbb",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            {qrSvg}
            <div style={{ fontSize: 8, color: "#888", textAlign: "center" }}>
              Scan QR
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={{ padding: "6px 10px", borderBottom: "1px solid #bbb" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}
          >
            <tbody>
              <tr>
                <td style={{ padding: "2px 6px", color: "#555" }}>Total Fee</td>
                <td
                  style={{
                    padding: "2px 6px",
                    textAlign: "right",
                    fontWeight: 600,
                  }}
                >
                  {netFees.toLocaleString("en-IN")}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "2px 6px", color: "#555" }}>Net Fee</td>
                <td
                  style={{
                    padding: "2px 6px",
                    textAlign: "right",
                    fontWeight: 700,
                    color: "#1a3a8f",
                  }}
                >
                  {netFees.toLocaleString("en-IN")}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "2px 6px", color: "#555" }}>
                  Amount Received
                </td>
                <td
                  style={{
                    padding: "2px 6px",
                    textAlign: "right",
                    fontWeight: 700,
                    color: "#16a34a",
                  }}
                >
                  {receiptAmt.toLocaleString("en-IN")}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "2px 6px", color: "#555" }}>Balance</td>
                <td
                  style={{
                    padding: "2px 6px",
                    textAlign: "right",
                    fontWeight: 700,
                    color: "#c00",
                  }}
                >
                  {balance.toLocaleString("en-IN")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "6px 10px",
            fontSize: 10,
          }}
        >
          <div>
            <div>
              <b>Received In:</b> {receiptPaymentMode || "Cash"}
            </div>
            <div style={{ marginTop: 2 }}>
              <b>Paid Amount:</b> ₹ {receiptAmt.toLocaleString("en-IN")}
            </div>
            <div style={{ marginTop: 2, color: "#555" }}>
              (₹ {amountInWords} only)
            </div>
          </div>
          <div style={{ textAlign: "right", paddingTop: 4 }}>
            <div>Received By: ................</div>
          </div>
        </div>
      </div>
    );
  };

  const templates = [
    {
      id: 1 as const,
      label: "Simple / Plain",
      desc: "Clean letterhead with fee table",
    },
    {
      id: 2 as const,
      label: "Duplicate Copy",
      desc: "School copy + Student copy with cut line",
    },
    {
      id: 3 as const,
      label: "Modern Branded",
      desc: "Colored header, two-column layout",
    },
    {
      id: 4 as const,
      label: "Bharati Format",
      desc: "Professional format with logo, QR & detailed fields",
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        data-ocid="collect.print.modal"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 flex-shrink-0">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Printer size={15} /> Print Fee Receipt — Select Template
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            data-ocid="collect.print.close_button"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex gap-2 px-5 py-3 border-b border-gray-700 flex-shrink-0">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTemplate(t.id)}
              className={`flex-1 p-2 rounded border text-xs text-left transition ${selectedTemplate === t.id ? "border-blue-500 bg-blue-900/30 text-white" : "border-gray-600 text-gray-400 hover:border-gray-400"}`}
              data-ocid={`collect.template.${t.id}.toggle`}
            >
              <div className="font-semibold mb-0.5">{t.label}</div>
              <div className="text-[10px] opacity-70">{t.desc}</div>
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-5">
          <div
            id="fee-receipt-print-area"
            className="bg-white rounded shadow-lg mx-auto"
            style={{ maxWidth: 560 }}
          >
            {selectedTemplate === 1 && renderTemplate1()}
            {selectedTemplate === 2 && renderTemplate2()}
            {selectedTemplate === 3 && renderTemplate3()}
            {selectedTemplate === 4 && renderTemplate4()}
          </div>
        </div>
        <div className="flex gap-2 px-5 py-3 border-t border-gray-700 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded border border-gray-600 text-gray-400 text-sm hover:text-white transition"
            data-ocid="collect.print.cancel_button"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={printReceipt}
            className="flex-1 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition"
            data-ocid="collect.print.primary_button"
          >
            <Printer size={14} /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

interface FeeRecord {
  id: number;
  receiptNo: string;
  studentName: string;
  className: string;
  feeType: string;
  amount: number;
  paymentMode: string;
  date: string;
  status: "Paid" | "Pending" | "Due";
}

const initialFees: FeeRecord[] = [];

const _feeTypes = [
  "Tuition Fee",
  "Exam Fee",
  "Transport Fee",
  "Library Fee",
  "Sports Fee",
  "Laboratory Fee",
  "Annual Fee",
];
const _paymentModes = ["Cash", "Online", "Cheque", "DD"];
const _students = [
  "Aarav Sharma",
  "Priya Patel",
  "Rohit Kumar",
  "Ananya Singh",
  "Vikram Joshi",
  "Neha Gupta",
  "Arjun Verma",
  "Kavya Nair",
  "Ravi Mehta",
  "Shreya Agarwal",
];

const ALL_MONTHS = [
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
const SCHOOL_MONTHS = [
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

const RECEIPT_STUDENTS = [
  {
    admNo: "ADM-001",
    name: "Aarav Sharma",
    fatherName: "Ramesh Sharma",
    motherName: "Sunita Sharma",
    className: "Class 10-A",
    rollNo: "05",
    contact: "9876543210",
    city: "Delhi",
    category: "General",
    route: "Route 1",
    oldBalance: 0,
  },
  {
    admNo: "ADM-002",
    name: "Priya Patel",
    fatherName: "Suresh Patel",
    motherName: "Kavita Patel",
    className: "Class 7-B",
    rollNo: "12",
    contact: "9812345678",
    city: "Mumbai",
    category: "OBC",
    route: "Route 2",
    oldBalance: 500,
  },
  {
    admNo: "ADM-003",
    name: "Rohit Kumar",
    fatherName: "Mohan Kumar",
    motherName: "Geeta Kumar",
    className: "Class 5-C",
    rollNo: "03",
    contact: "9887654321",
    city: "Jaipur",
    category: "SC",
    route: "Route 3",
    oldBalance: 0,
  },
];

const SAMPLE_FEE_TYPES = [
  { type: "Tuition Fee", amount: 1500 },
  { type: "Exam Fee", amount: 200 },
  { type: "Library Fee", amount: 100 },
  { type: "Sports Fee", amount: 150 },
  { type: "Laboratory Fee", amount: 300 },
];

interface FeeHeading {
  id: number;
  heading: string;
  group: string;
  account: string;
  frequency: string;
  months: string[];
}

const initialHeadings: FeeHeading[] = [
  {
    id: 1,
    heading: "Admission Fee",
    group: "General",
    account: "Admission Fees",
    frequency: "Annual",
    months: [],
  },
  {
    id: 2,
    heading: "Computer Fee/P.C.",
    group: "General",
    account: "Computer",
    frequency: "Annual",
    months: [],
  },
  {
    id: 3,
    heading: "Development Charge",
    group: "General",
    account: "Vikas Shulk",
    frequency: "Annual",
    months: ["Aug", "Sep"],
  },
  {
    id: 4,
    heading: "Exam Fee",
    group: "General",
    account: "Examination",
    frequency: "Four Monthly",
    months: ["Mar", "Jul", "Oct"],
  },
  {
    id: 5,
    heading: "Mar",
    group: "General",
    account: "old year",
    frequency: "Annual",
    months: [],
  },
  {
    id: 6,
    heading: "Monthly Fee",
    group: "General",
    account: "Tuition Fees",
    frequency: "Monthly",
    months: [...ALL_MONTHS],
  },
  {
    id: 7,
    heading: "Progress card",
    group: "General",
    account: "TDS",
    frequency: "Annual",
    months: ["Apr"],
  },
];

interface FeePlan {
  id: number;
  className: string;
  category: string;
  feesHead: string;
  value: number;
}

const initialPlans: FeePlan[] = [
  {
    id: 1,
    className: "10th",
    category: "English New Student",
    feesHead: "Admission Fee",
    value: 600,
  },
  {
    id: 2,
    className: "10th",
    category: "English New Student",
    feesHead: "Computer Fee/P.C.",
    value: 600,
  },
  {
    id: 3,
    className: "10th",
    category: "English New Student",
    feesHead: "Development Charge",
    value: 300,
  },
  {
    id: 4,
    className: "10th",
    category: "English New Student",
    feesHead: "Exam Fee",
    value: 200,
  },
  {
    id: 5,
    className: "10th",
    category: "English Old Student",
    feesHead: "Development Charge",
    value: 300,
  },
  {
    id: 6,
    className: "10th",
    category: "English Old Student",
    feesHead: "Exam Fee",
    value: 200,
  },
  {
    id: 7,
    className: "10th",
    category: "New Student",
    feesHead: "Admission Fee",
    value: 200,
  },
  {
    id: 8,
    className: "10th",
    category: "New Student",
    feesHead: "Development Charge",
    value: 300,
  },
  {
    id: 9,
    className: "10th",
    category: "New Student",
    feesHead: "Exam Fee",
    value: 200,
  },
  {
    id: 10,
    className: "10th",
    category: "New Student",
    feesHead: "Monthly Fee",
    value: 400,
  },
  {
    id: 11,
    className: "10th",
    category: "Old Student",
    feesHead: "Development Charge",
    value: 300,
  },
  {
    id: 12,
    className: "10th",
    category: "Old Student",
    feesHead: "Exam Fee",
    value: 200,
  },
  {
    id: 13,
    className: "9th",
    category: "New Student",
    feesHead: "Admission Fee",
    value: 200,
  },
  {
    id: 14,
    className: "9th",
    category: "New Student",
    feesHead: "Monthly Fee",
    value: 380,
  },
  {
    id: 15,
    className: "9th",
    category: "Old Student",
    feesHead: "Monthly Fee",
    value: 350,
  },
];

const CLASS_LIST = [
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
  "11th",
  "12th",
];
// CATEGORIES removed - not used in fee plan anymore
// ─── Dynamic Groups/Accounts (from localStorage) ─────────────────────────────
const DEFAULT_GROUPS = ["General", "Transport", "Sports", "Lab"];
const DEFAULT_ACCOUNTS = [
  "Admission Fees",
  "Tuition Fees",
  "Computer",
  "Vikas Shulk",
  "Examination",
  "TDS",
  "old year",
];

// Initialize localStorage defaults on first load
(() => {
  if (!localStorage.getItem("erp_fee_groups")) {
    localStorage.setItem("erp_fee_groups", JSON.stringify(DEFAULT_GROUPS));
  }
  if (!localStorage.getItem("erp_fee_accounts")) {
    localStorage.setItem("erp_fee_accounts", JSON.stringify(DEFAULT_ACCOUNTS));
  }
})();

function getGroups(): string[] {
  try {
    const val = localStorage.getItem("erp_fee_groups");
    if (val) {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [...DEFAULT_GROUPS];
}

function getAccounts(): string[] {
  try {
    const val = localStorage.getItem("erp_fee_accounts");
    if (val) {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [...DEFAULT_ACCOUNTS];
}
const FREQUENCIES = [
  "Annual",
  "Monthly",
  "Quarterly",
  "Four Monthly",
  "Half Yearly",
];

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function today() {
  return new Date().toISOString().split("T")[0];
}

// ─── CollectFeesTab ───────────────────────────────────────────────────────────
interface FeeRow {
  id: number;
  feeHead: string;
  months: Record<string, number>;
  checked: boolean;
}

interface StudentRecord {
  admNo: string;
  name: string;
  fatherName: string;
  motherName: string;
  className: string;
  rollNo: string;
  contact: string;
  city: string;
  category: string;
  route: string;
  oldBalance: number;
  session?: string;
  prevSessionDues?: Array<{
    month: string;
    sessionLabel: string;
    amount: number;
  }>;
}

interface PaymentRecord {
  id: string;
  receiptNo: string;
  date: string;
  admNo: string;
  studentName: string;
  className: string;
  months: string[];
  feeRows: FeeRow[];
  otherCharges: OtherChargeItem[];
  concessionPct: number;
  concessionAmt: number;
  netFees: number;
  receiptAmt: number;
  balance: number;
  paymentMode: string;
  remarks: string;
  session?: string;
  receivedBy?: string;
}

function getCurrentUserInfo(): { name: string; role: string; display: string } {
  try {
    const user = JSON.parse(localStorage.getItem("erp_auth_user") || "{}");
    const name = user.name || "Admin";
    const roleMap: Record<string, string> = {
      super_admin: "Super Admin",
      admin: "Admin",
      accountant: "Accountant",
      teacher: "Teacher",
      librarian: "Librarian",
      parent: "Parent",
      student: "Student",
    };
    const roleLabel = roleMap[user.role] || user.role || "Admin";
    return {
      name,
      role: user.role || "admin",
      display: `${name} (${roleLabel})`,
    };
  } catch {
    return { name: "Admin", role: "admin", display: "Admin (Admin)" };
  }
}

function getCurrentUserRole(): string {
  try {
    const user = JSON.parse(localStorage.getItem("erp_auth_user") || "{}");
    return user.role || "viewer";
  } catch {
    return "viewer";
  }
}

interface OtherChargeItem {
  id: string;
  type: string;
  paid: number;
  due: number;
}

function getNextReceiptNo(): string {
  const year = new Date().getFullYear() % 100;
  const payments: PaymentRecord[] = (() => {
    try {
      return JSON.parse(localStorage.getItem("erp_fee_payments") || "[]");
    } catch {
      return [];
    }
  })();
  const seq = payments.length + 1;
  return `R${String(year).padStart(2, "0")}-${String(seq).padStart(4, "0")}`;
}

function loadFeeHeadsForStudent(student: StudentRecord): FeeRow[] {
  try {
    const plans = JSON.parse(
      localStorage.getItem("erp_fee_plans") || "[]",
    ) as Array<{ className: string; feesHead: string; value: number }>;
    const heads = plans.filter((p) => p.className === student.className);
    if (heads.length > 0) {
      return heads.map((h, i) => ({
        id: i + 1,
        feeHead: h.feesHead,
        months: {},
        checked: true,
      }));
    }
  } catch {
    /* ignore */
  }
  // fallback to sample fee types
  return SAMPLE_FEE_TYPES.map((ft, i) => ({
    id: i + 1,
    feeHead: ft.type,
    months: {},
    checked: true,
  }));
}

function CollectFeesTab() {
  const [date, setDate] = useState(today());
  const [receiptNo] = useState(getNextReceiptNo);
  const [admNo, setAdmNo] = useState("");
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [feeRows, setFeeRows] = useState<FeeRow[]>([]);
  const [concessionPct, setConcessionPct] = useState(0);
  const [concessionAmt, setConcessionAmt] = useState(0);
  const [receiptAmt, setReceiptAmt] = useState("");
  const [remarks, setRemarks] = useState("");
  const [otherCharges, setOtherCharges] = useState<OtherChargeItem[]>([
    { id: "oc-1", type: "Other Charge", paid: 0, due: 0 },
  ]);
  const [showOtherCharges, setShowOtherCharges] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StudentRecord[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Derived totals
  const totalFees = feeRows
    .filter((r) => r.checked)
    .reduce(
      (sum, row) =>
        sum + selectedMonths.reduce((s, m) => s + (row.months[m] || 0), 0),
      0,
    );
  const otherTotal = otherCharges.reduce((s, r) => s + r.paid, 0);
  const netFees = totalFees + otherTotal - concessionAmt;
  const rcptAmt = Number(receiptAmt) || 0;
  const balanceAmt = netFees - rcptAmt;

  const toggleMonth = (m: string) => {
    setSelectedMonths((prev) => {
      const next = prev.includes(m)
        ? prev.filter((x) => x !== m)
        : [...prev, m];
      setSelectAll(next.length === SCHOOL_MONTHS.length);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedMonths([]);
      setSelectAll(false);
    } else {
      setSelectedMonths([...SCHOOL_MONTHS]);
      setSelectAll(true);
    }
  };

  const handleOK = () => {
    if (!student) {
      toast.error("Enter a valid Admission No. first");
      return;
    }
    if (selectedMonths.length === 0) {
      toast.error("Select at least one month");
      return;
    }
    const rows = loadFeeHeadsForStudent(student);
    // Assign per-month amounts
    const populated = rows.map((row) => {
      const months: Record<string, number> = {};
      for (const m of selectedMonths) {
        const val =
          SAMPLE_FEE_TYPES.find((ft) => ft.type === row.feeHead)?.amount || 0;
        months[m] = val;
      }
      return { ...row, months };
    });
    setFeeRows(populated);
  };

  const loadAllStudents = (): StudentRecord[] => {
    try {
      const ls = JSON.parse(
        localStorage.getItem("erp_students") || "[]",
      ) as StudentRecord[];
      return ls.length > 0 ? ls : RECEIPT_STUDENTS;
    } catch {
      return RECEIPT_STUDENTS;
    }
  };

  const handleDynamicSearch = (q: string) => {
    setSearchQuery(q);
    setAdmNo(q);
    if (!q.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const all = loadAllStudents();
    const ql = q.toLowerCase();
    const results = all
      .filter(
        (s) =>
          s.admNo.toLowerCase().includes(ql) ||
          s.name.toLowerCase().includes(ql),
      )
      .slice(0, 8);
    setSearchResults(results);
    setShowDropdown(results.length > 0);
  };

  const selectStudentFromDropdown = (s: StudentRecord) => {
    setStudent(s);
    setAdmNo(s.admNo);
    setSearchQuery(`${s.admNo} - ${s.name}`);
    setShowDropdown(false);
    setSearchResults([]);
    setFeeRows([]);
    setSelectedMonths([]);
    setSelectAll(false);
    toast.success(`Student loaded: ${s.name}`);
  };

  const handleAdmNoSearch = () => {
    if (!admNo.trim()) return;
    const all = loadAllStudents();
    const found = all.find(
      (s) =>
        s.admNo === admNo.trim() ||
        s.name.toLowerCase() === admNo.trim().toLowerCase(),
    );
    if (found) {
      setStudent(found);
      setSearchQuery(`${found.admNo} - ${found.name}`);
      setShowDropdown(false);
      toast.success(`Student loaded: ${found.name}`);
    } else {
      toast.error("Student not found. Try typing name or admission no.");
      setStudent(null);
    }
    setFeeRows([]);
    setSelectedMonths([]);
    setSelectAll(false);
  };

  const handleNew = () => {
    setAdmNo("");
    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
    setStudent(null);
    setFeeRows([]);
    setSelectedMonths([]);
    setSelectAll(false);
    setConcessionPct(0);
    setConcessionAmt(0);
    setReceiptAmt("");
    setRemarks("");
    setPaymentMode("Cash");
  };

  const handleSave = () => {
    if (!student || feeRows.length === 0) {
      toast.error("Load a student and select months first");
      return;
    }
    const currentSession = (() => {
      try {
        const settings = JSON.parse(
          localStorage.getItem("erp_settings") || "{}",
        );
        return settings.session || "2025-26";
      } catch {
        return "2025-26";
      }
    })();
    const record: PaymentRecord = {
      id: Date.now().toString(),
      receiptNo,
      date,
      admNo: student.admNo,
      studentName: student.name,
      className: student.className,
      months: selectedMonths,
      feeRows,
      otherCharges,
      concessionPct,
      concessionAmt,
      netFees,
      receiptAmt: rcptAmt,
      balance: balanceAmt,
      paymentMode,
      remarks,
      session: currentSession,
      receivedBy: getCurrentUserInfo().display,
    };
    const existing: PaymentRecord[] = (() => {
      try {
        return JSON.parse(localStorage.getItem("erp_fee_payments") || "[]");
      } catch {
        return [];
      }
    })();
    localStorage.setItem(
      "erp_fee_payments",
      JSON.stringify([...existing, record]),
    );
    addERPNotification({
      type: "fee",
      icon: "💰",
      title: "Fee Receipt Saved",
      message: `₹${rcptAmt.toLocaleString("en-IN")} received from ${student.name} • Receipt #${receiptNo}`,
    });
    setShowSaveDialog(true);
  };

  const handleWhatsAppDue = () => {
    if (!student) return;
    const msg = encodeURIComponent(
      `Dear ${student.fatherName || "Parent"}, fees of ₹${netFees.toLocaleString("en-IN")} are due for ${student.name} (Adm. No. ${student.admNo}). Please pay at the earliest. - SHUBH SCHOOL ERP`,
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const handleWhatsAppReceipt = () => {
    if (!student) return;
    const msg = encodeURIComponent(
      `Dear ${student.fatherName || "Parent"}, fees receipt of ₹${rcptAmt.toLocaleString("en-IN")} has been generated for ${student.name} (Adm. No. ${student.admNo}). Receipt No: ${receiptNo}. Thank you. - SHUBH SCHOOL ERP`,
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const handleDelete = () => {
    try {
      const existing: PaymentRecord[] = JSON.parse(
        localStorage.getItem("erp_fee_payments") || "[]",
      );
      const updated = existing.filter((p) => p.receiptNo !== receiptNo);
      localStorage.setItem("erp_fee_payments", JSON.stringify(updated));
      toast.success("Receipt deleted");
      handleNew();
    } catch {
      toast.error("Error deleting receipt");
    }
  };

  const updateOtherCharge = (
    i: number,
    field: keyof OtherChargeItem,
    val: string | number,
  ) => {
    setOtherCharges((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)),
    );
  };

  const toggleFeeRow = (id: number) => {
    setFeeRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, checked: !r.checked } : r)),
    );
  };

  const ic =
    "bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-xs outline-none focus:border-blue-400 w-full";
  const lbl = "text-gray-400 text-[10px] block mb-0.5";

  return (
    <div
      style={{
        background: "#0d111c",
        border: "1px solid #2d3748",
        borderRadius: 8,
      }}
    >
      {/* ── HEADER BAR ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f4c81 0%, #1565c0 100%)",
          borderRadius: "8px 8px 0 0",
        }}
        className="px-4 py-2.5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-white font-bold text-sm tracking-wider">
              FEES RECEIPT
            </span>
            <span className="text-blue-200 text-xs">
              Ledger Bal. ={" "}
              <span className="font-semibold text-yellow-300">
                {(() => {
                  if (!student) return "₹0.00";
                  try {
                    const payments = JSON.parse(
                      localStorage.getItem("erp_fee_payments") || "[]",
                    ) as PaymentRecord[];
                    const sessionDues = payments
                      .filter((p) => p.admNo === student.admNo && p.balance > 0)
                      .reduce((s, p) => s + p.balance, 0);
                    const total = sessionDues + (student.oldBalance || 0);
                    return fmt(total);
                  } catch {
                    return fmt(student.oldBalance || 0);
                  }
                })()}
              </span>{" "}
              Dr.
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSave}
              data-ocid="collect.save.primary_button"
              className="bg-white text-blue-900 hover:bg-blue-50 text-xs px-3 py-1 rounded font-semibold flex items-center gap-1 transition"
            >
              <Printer size={11} />
              Save
            </button>
            <button
              type="button"
              onClick={handleWhatsAppDue}
              data-ocid="collect.whatsappduebutton"
              className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1 rounded font-medium flex items-center gap-1 transition"
            >
              <MessageSquare size={11} />
              WA Due
            </button>
            <button
              type="button"
              onClick={() => {
                if (!student || feeRows.length === 0) {
                  toast.error("Load student and fees first");
                  return;
                }
                setShowPrintModal(true);
              }}
              data-ocid="collect.print.button"
              className="bg-white text-blue-900 hover:bg-blue-50 text-xs px-3 py-1 rounded font-medium flex items-center gap-1 transition"
            >
              <Printer size={11} />
              Print
            </button>
            <button
              type="button"
              onClick={handleWhatsAppReceipt}
              data-ocid="collect.whatsappreceiptbutton"
              className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1 rounded font-medium flex items-center gap-1 transition"
            >
              <MessageSquare size={11} />
              WA Receipt
            </button>
            <button
              type="button"
              onClick={handleDelete}
              data-ocid="collect.delete.delete_button"
              className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1 rounded font-medium flex items-center gap-1 transition"
            >
              <Trash2 size={11} />
              Delete
            </button>
            <button
              type="button"
              onClick={handleNew}
              data-ocid="collect.close.button"
              className="bg-white text-blue-900 hover:bg-blue-50 text-xs px-3 py-1 rounded font-medium flex items-center gap-1 transition"
            >
              <X size={11} />
              Close
            </button>
          </div>
        </div>
      </div>

      {/* ── ROW 1: Date / Receipt No / Adm No ── */}
      <div
        className="flex items-center gap-3 px-4 py-2.5"
        style={{ background: "#111827", borderBottom: "1px solid #2d3748" }}
      >
        <div style={{ width: 130 }}>
          <span className={lbl}>Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={ic}
            data-ocid="collect.date.input"
          />
        </div>
        <div style={{ width: 130 }}>
          <span className={lbl}>Receipt No.</span>
          <input
            type="text"
            value={receiptNo}
            readOnly
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-400 text-xs w-full"
          />
        </div>
        <div className="flex-1 max-w-sm" style={{ position: "relative" }}>
          <span className={lbl}>Search by Admission No. or Student Name</span>
          <div className="flex gap-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleDynamicSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setShowDropdown(false);
                  handleAdmNoSearch();
                }
                if (e.key === "Escape") setShowDropdown(false);
              }}
              onFocus={() =>
                searchQuery && setShowDropdown(searchResults.length > 0)
              }
              placeholder="Type name or admission no..."
              className={ic}
              data-ocid="collect.admno.input"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => {
                setShowDropdown(false);
                handleAdmNoSearch();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded transition flex-shrink-0"
              data-ocid="collect.search.button"
            >
              <Search size={13} />
            </button>
          </div>
          {showDropdown && searchResults.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 32,
                zIndex: 100,
                background: "#1a1f2e",
                border: "1px solid #3b82f6",
                borderRadius: 6,
                marginTop: 2,
                maxHeight: 220,
                overflowY: "auto",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              }}
            >
              {searchResults.map((s) => (
                <button
                  key={s.admNo}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-blue-900/40 flex items-center gap-2 transition"
                  onClick={() => selectStudentFromDropdown(s)}
                >
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-white text-xs font-medium">
                      {s.name}
                    </div>
                    <div className="text-gray-400 text-[10px]">
                      {s.admNo} &bull; {s.className}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── STUDENT INFO + MONTH SELECTOR ── */}
      <div className="flex" style={{ borderBottom: "1px solid #2d3748" }}>
        {/* Left: photo + links */}
        <div
          className="p-3 flex-shrink-0"
          style={{ width: 110, borderRight: "1px solid #2d3748" }}
        >
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded bg-gray-700 border border-gray-600 flex items-center justify-center mb-2 overflow-hidden">
              {student ? (
                (student as any).photo ? (
                  <img
                    src={(student as any).photo}
                    alt={student.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-xl font-bold">
                    {student.name.charAt(0)}
                  </span>
                )
              ) : (
                <User size={28} className="text-gray-500" />
              )}
            </div>
            <div className="flex gap-2 mb-2">
              <Printer
                size={12}
                className="text-gray-400 cursor-pointer hover:text-white"
              />
              <Search
                size={12}
                className="text-gray-400 cursor-pointer hover:text-white"
              />
            </div>
            <button
              type="button"
              className="text-blue-400 text-[10px] hover:underline block mb-0.5"
              data-ocid="collect.feescard.button"
            >
              Fees Card
            </button>
            <button
              type="button"
              className="text-blue-400 text-[10px] hover:underline block"
              data-ocid="collect.ledger.button"
            >
              Ledger
            </button>
          </div>
        </div>

        {/* Center: student fields */}
        <div className="flex-1 p-3 grid grid-cols-2 gap-x-6 gap-y-1.5 content-start">
          <div>
            <span className={lbl}>Student Name</span>
            <input
              type="text"
              readOnly
              value={student?.name || ""}
              className={ic}
            />
          </div>
          <div>
            <span className={lbl}>Class Name</span>
            <input
              type="text"
              readOnly
              value={student?.className || ""}
              className={ic}
            />
          </div>
          <div>
            <span className={lbl}>Father's Name</span>
            <input
              type="text"
              readOnly
              value={student?.fatherName || ""}
              className={ic}
            />
          </div>
          <div>
            <span className={lbl}>Roll No.</span>
            <input
              type="text"
              readOnly
              value={student?.rollNo || ""}
              className={ic}
            />
          </div>
          <div>
            <span className={lbl}>Mother's Name</span>
            <input
              type="text"
              readOnly
              value={student?.motherName || ""}
              className={ic}
            />
          </div>
          <div>
            <span className={lbl}>Contact No.</span>
            <input
              type="text"
              readOnly
              value={student?.contact || ""}
              className={ic}
            />
          </div>
          <div>
            <span className={lbl}>Category</span>
            <input
              type="text"
              readOnly
              value={student?.category || ""}
              className={ic}
            />
          </div>
          <div>
            <span className={lbl}>Village / City</span>
            <input
              type="text"
              readOnly
              value={student?.city || ""}
              className={ic}
            />
          </div>
          <div>
            <span className={lbl}>Route</span>
            <input
              type="text"
              readOnly
              value={student?.route || ""}
              className={ic}
            />
          </div>
          <div>
            <span className={lbl}>Old Balance</span>
            <input
              type="text"
              readOnly
              value={student ? fmt(student.oldBalance) : ""}
              className={`${ic} ${student && student.oldBalance > 0 ? "text-red-400" : ""}`}
            />
          </div>
        </div>

        {/* Right: Month selector */}
        <div
          className="p-3 flex-shrink-0"
          style={{ width: 150, borderLeft: "1px solid #2d3748" }}
        >
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="accent-blue-500 w-3 h-3"
              />
              <span className="text-gray-300 text-[11px]">Select All</span>
            </label>
            <span className="text-blue-400 text-[11px] font-semibold">
              {selectedMonths.length}
            </span>
          </div>
          <div
            style={{ background: "#1a1f2e", borderRadius: 4 }}
            className="px-2 py-1 mb-1"
          >
            <span className="text-gray-400 text-[10px] font-semibold tracking-wider">
              MONTH
            </span>
          </div>
          <div
            className="space-y-0.5 mb-2"
            style={{ maxHeight: 180, overflowY: "auto" }}
          >
            {SCHOOL_MONTHS.map((m) => (
              <label
                key={m}
                className="flex items-center gap-1.5 px-1 py-0.5 cursor-pointer hover:bg-gray-800 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedMonths.includes(m)}
                  onChange={() => toggleMonth(m)}
                  className="accent-blue-500 w-3 h-3"
                />
                <span className="text-gray-300 text-[11px]">{m}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={handleOK}
            data-ocid="collect.months.primary_button"
            className="w-full text-white text-xs py-1.5 rounded font-bold tracking-wider transition"
            style={{ background: "linear-gradient(135deg, #0f4c81, #1565c0)" }}
          >
            OK
          </button>
        </div>
      </div>

      {/* ── FEE GRID ── */}
      <div style={{ borderBottom: "1px solid #2d3748" }}>
        <div style={{ overflowX: "auto", maxHeight: 200, overflowY: "auto" }}>
          <table className="w-full text-xs" style={{ minWidth: 400 }}>
            <thead
              style={{
                background: "#1a1f2e",
                position: "sticky",
                top: 0,
                zIndex: 1,
              }}
            >
              <tr>
                <th
                  style={{ width: 28 }}
                  className="px-2 py-1.5 text-gray-400 text-left"
                >
                  <input
                    type="checkbox"
                    className="accent-blue-500 w-3 h-3"
                    onChange={() =>
                      setFeeRows((p) =>
                        p.map((r) => ({
                          ...r,
                          checked: !p.every((x) => x.checked),
                        })),
                      )
                    }
                    checked={
                      feeRows.length > 0 && feeRows.every((r) => r.checked)
                    }
                    readOnly
                  />
                </th>
                <th className="px-3 py-1.5 text-gray-400 font-medium text-left">
                  Fees Head
                </th>
                {selectedMonths.map((m) => (
                  <th
                    key={m}
                    className="px-2 py-1.5 text-gray-400 font-medium text-right"
                  >
                    {m}
                  </th>
                ))}
                {selectedMonths.length > 0 && (
                  <th className="px-3 py-1.5 text-gray-400 font-medium text-right">
                    Total
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {feeRows.length === 0
                ? Array.from({ length: 5 }, (_, i) => (
                    <tr
                      key={`skeleton-row-${i + 1}`}
                      style={{
                        background: i % 2 === 0 ? "#111827" : "#0d111c",
                      }}
                    >
                      <td className="px-2 py-1.5 text-gray-700">
                        <div className="w-3 h-3 bg-gray-800 rounded" />
                      </td>
                      <td className="px-3 py-1.5 text-gray-700">—</td>
                    </tr>
                  ))
                : feeRows.map((row, i) => {
                    const rowTotal = selectedMonths.reduce(
                      (s, m) => s + (row.months[m] || 0),
                      0,
                    );
                    return (
                      <tr
                        key={row.id}
                        style={{
                          background: i % 2 === 0 ? "#111827" : "#0d111c",
                        }}
                        data-ocid={`collect.fee.item.${i + 1}`}
                      >
                        <td className="px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={row.checked}
                            onChange={() => toggleFeeRow(row.id)}
                            className="accent-blue-500 w-3 h-3"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-white">
                          {row.feeHead}
                        </td>
                        {selectedMonths.map((m) => (
                          <td
                            key={m}
                            className="px-2 py-1.5 text-gray-300 text-right"
                          >
                            {row.months[m] ? fmt(row.months[m]) : "—"}
                          </td>
                        ))}
                        <td className="px-3 py-1.5 text-green-400 text-right font-medium">
                          {fmt(rowTotal)}
                        </td>
                      </tr>
                    );
                  })}
              {feeRows.length > 0 && (
                <tr
                  style={{
                    background: "#1a1f2e",
                    borderTop: "2px solid #2d3748",
                  }}
                >
                  <td />
                  <td className="px-3 py-1.5 text-gray-400 font-semibold text-xs">
                    TOTAL
                  </td>
                  {selectedMonths.map((m) => (
                    <td
                      key={m}
                      className="px-2 py-1.5 text-right text-gray-300 font-semibold"
                    >
                      {fmt(
                        feeRows
                          .filter((r) => r.checked)
                          .reduce((s, r) => s + (r.months[m] || 0), 0),
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-right text-red-400 font-bold">
                    {fmt(totalFees)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── OTHER CHARGES COLLAPSIBLE ── */}
      <div style={{ borderBottom: "1px solid #2d3748" }}>
        <button
          type="button"
          onClick={() => setShowOtherCharges((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-yellow-400 hover:bg-gray-800/30 transition"
          data-ocid="collect.othercharges.toggle"
        >
          <span>Other Charges {showOtherCharges ? "▲" : "▼"}</span>
          <span className="text-gray-500 text-[10px]">
            Paid: ₹
            {otherCharges
              .reduce((s, r) => s + r.paid, 0)
              .toLocaleString("en-IN")}{" "}
            | Due: ₹
            {otherCharges
              .reduce((s, r) => s + r.due, 0)
              .toLocaleString("en-IN")}
          </span>
        </button>
        {showOtherCharges && (
          <div className="px-4 pb-3">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#1a1f2e" }}>
                  {["Type", "Paid Amount (₹)", "Due Amount (₹)"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-1.5 text-gray-400 font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {otherCharges.map((row, rowIdx) => (
                  <tr
                    key={row.id}
                    style={{
                      background: rowIdx % 2 === 0 ? "#111827" : "#0d111c",
                      borderBottom: "1px solid #2d3748",
                    }}
                    data-ocid={`collect.othercharges.item.${rowIdx + 1}`}
                  >
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        value={row.type}
                        onChange={(e) =>
                          updateOtherCharge(rowIdx, "type", e.target.value)
                        }
                        placeholder="Type anything..."
                        className="bg-gray-900 border border-gray-600 rounded px-1.5 py-0.5 text-white text-xs w-full outline-none focus:border-blue-400"
                        data-ocid="collect.othercharges.input"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={row.paid === 0 ? "0" : String(row.paid)}
                        onFocus={(e) => {
                          if (e.target.value === "0") e.target.select();
                        }}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, "");
                          const stripped = raw.replace(/^0+(\d)/, "$1") || "0";
                          updateOtherCharge(rowIdx, "paid", Number(stripped));
                        }}
                        className="bg-gray-900 border border-gray-600 rounded px-1.5 py-0.5 text-white text-xs w-24"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={row.due === 0 ? "0" : String(row.due)}
                        onFocus={(e) => {
                          if (e.target.value === "0") e.target.select();
                        }}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, "");
                          const stripped = raw.replace(/^0+(\d)/, "$1") || "0";
                          updateOtherCharge(rowIdx, "due", Number(stripped));
                        }}
                        className="bg-gray-900 border border-gray-600 rounded px-1.5 py-0.5 text-white text-xs w-24"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── SUMMARY BAR ── */}
      <div
        style={{ background: "#111827", borderBottom: "1px solid #2d3748" }}
        className="px-3 py-2.5"
      >
        <div className="flex items-center gap-2 flex-wrap">
          {[
            {
              label: "TOTAL FEES",
              value: fmt(totalFees),
              edit: false,
              red: false,
            },
            {
              label: "OTHER CHARGES",
              value: fmt(otherTotal),
              edit: false,
              red: false,
            },
            { label: "LATE FEES", value: "₹0", edit: false, red: false },
          ].map(({ label, value, red }) => (
            <div key={label} className="flex flex-col items-center">
              <span className="text-gray-500 text-[9px] font-semibold tracking-wider mb-0.5">
                {label}
              </span>
              <div
                className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs font-semibold"
                style={{
                  minWidth: 80,
                  textAlign: "center",
                  color: red ? "#f87171" : "#e5e7eb",
                }}
              >
                {value}
              </div>
            </div>
          ))}
          <div className="flex flex-col items-center">
            <span className="text-gray-500 text-[9px] font-semibold tracking-wider mb-0.5">
              CONCESSION [%]
            </span>
            <input
              type="number"
              min={0}
              max={100}
              value={concessionPct}
              onChange={(e) => {
                const p = Number(e.target.value);
                setConcessionPct(p);
                setConcessionAmt(Math.round((totalFees * p) / 100));
              }}
              className="bg-gray-900 border border-blue-500 rounded px-2 py-1 text-blue-300 text-xs font-semibold outline-none"
              style={{ width: 70, textAlign: "center" }}
              data-ocid="collect.concession.input"
            />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-gray-500 text-[9px] font-semibold tracking-wider mb-0.5">
              CONCESSION AMT
            </span>
            <div
              className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs font-semibold text-gray-200"
              style={{ minWidth: 80, textAlign: "center" }}
            >
              {fmt(concessionAmt)}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-gray-500 text-[9px] font-semibold tracking-wider mb-0.5">
              NET FEES
            </span>
            <div
              className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs font-bold text-red-400"
              style={{ minWidth: 90, textAlign: "center" }}
            >
              {fmt(netFees)}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-gray-500 text-[9px] font-semibold tracking-wider mb-0.5">
              RECEIPT AMT
            </span>
            <input
              type="number"
              min={0}
              value={receiptAmt}
              onChange={(e) => setReceiptAmt(e.target.value)}
              placeholder="0"
              className="bg-gray-900 border border-green-500 rounded px-2 py-1 text-green-300 text-xs font-semibold outline-none"
              style={{ width: 90, textAlign: "center" }}
              data-ocid="collect.receiptamt.input"
            />
          </div>
        </div>
      </div>

      {/* ── PAYMENT HISTORY ── */}
      {student && (
        <PaymentHistorySection
          admNo={student.admNo}
          studentName={student.name}
        />
      )}

      {/* ── BOTTOM ROW ── */}
      <div
        className="flex items-center gap-3 px-4 py-2.5"
        style={{ background: "#0d111c" }}
      >
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-gray-400 text-[10px] font-semibold">
            BALANCE AMT
          </span>
          <div
            className="bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm font-bold"
            style={{
              minWidth: 90,
              textAlign: "center",
              color: balanceAmt > 0 ? "#f87171" : "#4ade80",
            }}
          >
            {fmt(balanceAmt)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[
            { icon: <ChevronFirst size={13} />, ocid: "collect.nav.first" },
            { icon: <ChevronLeft size={13} />, ocid: "collect.nav.prev" },
            { icon: <ChevronRight size={13} />, ocid: "collect.nav.next" },
            { icon: <ChevronLast size={13} />, ocid: "collect.nav.last" },
          ].map(({ icon, ocid }) => (
            <button
              key={ocid}
              type="button"
              data-ocid={ocid}
              className="border border-gray-600 rounded p-1 text-gray-400 hover:text-white hover:border-gray-400 transition"
            >
              {icon}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-gray-400 text-xs flex-shrink-0">
            Payment Mode
          </span>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className="bg-gray-900 border border-purple-500 rounded px-2 py-1.5 text-purple-300 text-xs font-semibold outline-none"
            data-ocid="collect.paymentmode.select"
          >
            {["Cash", "Online/UPI", "Cheque", "DD", "Card", "NEFT/RTGS"].map(
              (m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ),
            )}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-gray-400 text-xs flex-shrink-0">Remarks</span>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Reason for concession"
            className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-blue-500"
            data-ocid="collect.remarks.input"
          />
        </div>
        <button
          type="button"
          onClick={handleNew}
          className="border border-gray-600 text-gray-400 text-xs px-3 py-1.5 rounded hover:text-white transition"
          data-ocid="collect.new.button"
        >
          New
        </button>
      </div>
      {showSaveDialog && (
        <SaveReceiptDialog
          receiptNo={receiptNo}
          onPrint={() => setShowPrintModal(true)}
          onWhatsApp={handleWhatsAppReceipt}
          onDone={() => {
            setShowSaveDialog(false);
            handleNew();
          }}
          onClose={() => setShowSaveDialog(false)}
        />
      )}
      {showPrintModal && (
        <ReceiptPrintModal
          open={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          receiptNo={receiptNo}
          date={date}
          student={student}
          selectedMonths={selectedMonths}
          feeRows={feeRows}
          totalFees={totalFees}
          otherTotal={otherTotal}
          concessionAmt={concessionAmt}
          netFees={netFees}
          receiptAmt={rcptAmt}
          section={"A"}
          sid={student?.admNo || ""}
          regNo={student?.rollNo || ""}
          sess={"2025-26"}
          motherName={student?.motherName || ""}
          paymentMode={paymentMode}
          otherChargeType={otherCharges[0]?.type || "Other Charges"}
          sessionDues={(() => {
            if (!student) return 0;
            try {
              const payments = JSON.parse(
                localStorage.getItem("erp_fee_payments") || "[]",
              ) as PaymentRecord[];
              const dues = payments
                .filter((p) => p.admNo === student.admNo && p.balance > 0)
                .reduce((s, p) => s + p.balance, 0);
              return dues + (student.oldBalance || 0);
            } catch {
              return student.oldBalance || 0;
            }
          })()}
        />
      )}
    </div>
  );
}

// ─── Fees Register Tab ────────────────────────────────────────────────────────
// ─── SaveReceiptDialog ────────────────────────────────────────────────────────
function SaveReceiptDialog({
  receiptNo,
  onPrint,
  onWhatsApp,
  onDone,
  onClose,
}: {
  receiptNo: string;
  onPrint: () => void;
  onWhatsApp: () => void;
  onDone: () => void;
  onClose: () => void;
}) {
  const [printClicked, setPrintClicked] = useState(false);
  const [waClicked, setWaClicked] = useState(false);

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      data-ocid="collect.save.dialog"
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm shadow-2xl"
        style={{ borderTop: "3px solid #22c55e" }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-green-400 text-2xl mb-1">✓</div>
            <h3 className="text-white font-bold text-base">
              Receipt Saved Successfully
            </h3>
            <p className="text-gray-400 text-xs mt-1">
              Receipt No:{" "}
              <span className="text-blue-400 font-semibold">{receiptNo}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            data-ocid="collect.save.close_button"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-gray-400 text-xs mb-4">
          Choose your next action (both options available independently):
        </p>
        <div className="flex flex-col gap-3 mb-4">
          <button
            type="button"
            onClick={() => {
              setPrintClicked(true);
              onPrint();
            }}
            className={`flex items-center justify-center gap-2 text-white text-sm font-semibold py-2.5 rounded-lg transition ${
              printClicked
                ? "bg-blue-800 hover:bg-blue-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
            data-ocid="collect.save.print_button"
          >
            🖨️ Print Receipt
            {printClicked && (
              <span className="text-green-300 text-xs ml-1">✓ Opened</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setWaClicked(true);
              onWhatsApp();
            }}
            className={`flex items-center justify-center gap-2 text-white text-sm font-semibold py-2.5 rounded-lg transition ${
              waClicked
                ? "bg-green-800 hover:bg-green-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
            data-ocid="collect.save.whatsapp_button"
          >
            📱 Send WhatsApp
            {waClicked && (
              <span className="text-green-300 text-xs ml-1">✓ Sent</span>
            )}
          </button>
        </div>
        <button
          type="button"
          onClick={onDone}
          className="w-full py-2 rounded-lg border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 text-sm font-medium transition"
          data-ocid="collect.save.confirm_button"
        >
          ✓ Done — New Entry
        </button>
        <p className="text-gray-600 text-[10px] text-center mt-3">
          You can access this receipt anytime from Fee Register
        </p>
      </div>
    </div>
  );
}

// ─── PaymentHistorySection ────────────────────────────────────────────────────
function PaymentHistorySection({
  admNo,
  studentName,
}: { admNo: string; studentName: string }) {
  const [open, setOpen] = useState(true);

  const payments: PaymentRecord[] = (() => {
    try {
      const all = JSON.parse(
        localStorage.getItem("erp_fee_payments") || "[]",
      ) as PaymentRecord[];
      return all
        .filter((p) => p.admNo === admNo)
        .sort((a, b) => (b.date > a.date ? 1 : -1));
    } catch {
      return [];
    }
  })();

  return (
    <div style={{ borderTop: "1px solid #2d3748" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-blue-400 hover:bg-gray-800/30 transition"
        data-ocid="collect.payhistory.toggle"
      >
        <span>
          📋 Payment History — {studentName} {open ? "▲" : "▼"}
        </span>
        <span className="text-gray-500 text-[10px]">
          {payments.length} record{payments.length !== 1 ? "s" : ""}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3">
          {payments.length === 0 ? (
            <div
              className="text-center text-gray-500 text-xs py-4"
              data-ocid="collect.payhistory.empty_state"
            >
              No payment history yet.
            </div>
          ) : (
            <div
              className="overflow-x-auto"
              data-ocid="collect.payhistory.table"
            >
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "#1a1f2e" }}>
                    {[
                      "Date",
                      "Receipt No.",
                      "Months",
                      "Amount Paid (₹)",
                      "Mode",
                      "Received By",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-3 py-1.5 text-gray-400 font-medium whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr
                      key={p.id}
                      style={{
                        background: i % 2 === 0 ? "#111827" : "#0d111c",
                        borderBottom: "1px solid #2d3748",
                      }}
                      data-ocid={`collect.payhistory.item.${i + 1}`}
                    >
                      <td className="px-3 py-1.5 text-gray-300 whitespace-nowrap">
                        {p.date}
                      </td>
                      <td className="px-3 py-1.5 text-blue-400 font-medium">
                        {p.receiptNo}
                      </td>
                      <td className="px-3 py-1.5 text-gray-400 text-[10px] max-w-32 truncate">
                        {p.months.join(", ")}
                      </td>
                      <td className="px-3 py-1.5 text-green-400 font-semibold text-right">
                        ₹{p.receiptAmt.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-1.5 text-purple-300">
                        {p.paymentMode || "Cash"}
                      </td>
                      <td className="px-3 py-1.5 text-gray-400 whitespace-nowrap">
                        {p.receivedBy || "Admin (Admin)"}
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
  );
}

// ─── FeeRegisterDetailModal ───────────────────────────────────────────────────
function FeeRegisterDetailModal({
  admNo,
  studentName,
  className,
  onClose,
  onUpdate,
}: {
  admNo: string;
  studentName: string;
  className: string;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const role = getCurrentUserRole();
  const canEdit = role === "super_admin" || role === "admin";
  const canDelete = role === "super_admin";

  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    try {
      const all = JSON.parse(
        localStorage.getItem("erp_fee_payments") || "[]",
      ) as PaymentRecord[];
      return all
        .filter((p) => p.admNo === admNo)
        .sort((a, b) => (b.date > a.date ? 1 : -1));
    } catch {
      return [];
    }
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PaymentRecord>>({});

  const refreshPayments = () => {
    try {
      const all = JSON.parse(
        localStorage.getItem("erp_fee_payments") || "[]",
      ) as PaymentRecord[];
      setPayments(
        all
          .filter((p) => p.admNo === admNo)
          .sort((a, b) => (b.date > a.date ? 1 : -1)),
      );
    } catch {
      /* ignore */
    }
  };

  const startEdit = (p: PaymentRecord) => {
    setEditingId(p.id);
    setEditForm({
      paymentMode: p.paymentMode,
      remarks: p.remarks,
      receiptAmt: p.receiptAmt,
      date: p.date,
    });
  };

  const saveEdit = (p: PaymentRecord) => {
    try {
      const all = JSON.parse(
        localStorage.getItem("erp_fee_payments") || "[]",
      ) as PaymentRecord[];
      const updated = all.map((r) =>
        r.id === p.id
          ? {
              ...r,
              paymentMode: editForm.paymentMode ?? r.paymentMode,
              remarks: editForm.remarks ?? r.remarks,
              receiptAmt: Number(editForm.receiptAmt) ?? r.receiptAmt,
              date: editForm.date ?? r.date,
              balance:
                r.netFees - (Number(editForm.receiptAmt) ?? r.receiptAmt),
            }
          : r,
      );
      localStorage.setItem("erp_fee_payments", JSON.stringify(updated));
      setEditingId(null);
      refreshPayments();
      onUpdate();
      toast.success("Payment record updated.");
    } catch {
      toast.error("Failed to update record.");
    }
  };

  const deletePayment = (id: string) => {
    if (!window.confirm("Delete this payment record? This cannot be undone."))
      return;
    try {
      const all = JSON.parse(
        localStorage.getItem("erp_fee_payments") || "[]",
      ) as PaymentRecord[];
      localStorage.setItem(
        "erp_fee_payments",
        JSON.stringify(all.filter((r) => r.id !== id)),
      );
      refreshPayments();
      onUpdate();
      toast.success("Payment record deleted.");
    } catch {
      toast.error("Failed to delete record.");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      data-ocid="register.detail.modal"
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        style={{ borderTop: "3px solid #3b82f6" }}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <div>
            <h3 className="text-white font-bold text-sm">{studentName}</h3>
            <p className="text-gray-400 text-xs">
              Adm. No: <span className="text-yellow-400">{admNo}</span> · Class:{" "}
              <span className="text-blue-400">{className}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1"
            data-ocid="register.detail.close_button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-5 py-2 border-b border-gray-700/50 flex items-center gap-2">
          <span className="text-gray-500 text-xs">Your access:</span>
          {canDelete ? (
            <span className="text-[10px] bg-red-900/50 text-red-300 px-2 py-0.5 rounded-full">
              Super Admin — Edit + Delete
            </span>
          ) : canEdit ? (
            <span className="text-[10px] bg-orange-900/50 text-orange-300 px-2 py-0.5 rounded-full">
              Admin — Edit Only
            </span>
          ) : (
            <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
              View Only
            </span>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {payments.length === 0 ? (
            <div
              className="text-center text-gray-500 text-sm py-12"
              data-ocid="register.detail.empty_state"
            >
              No payment records found for this student.
            </div>
          ) : (
            <table className="w-full text-xs" data-ocid="register.detail.table">
              <thead className="sticky top-0">
                <tr style={{ background: "#1a1f2e" }}>
                  {[
                    "Date",
                    "Receipt No.",
                    "Months",
                    "Amount (₹)",
                    "Net (₹)",
                    "Bal (₹)",
                    "Mode",
                    "Received By",
                    ...(canEdit ? ["Actions"] : []),
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2 text-gray-400 font-medium whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr
                    key={p.id}
                    style={{
                      background: i % 2 === 0 ? "#111827" : "#0d111c",
                      borderBottom: "1px solid #1f2937",
                    }}
                    data-ocid={`register.detail.item.${i + 1}`}
                  >
                    {editingId === p.id ? (
                      <>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={editForm.date || p.date}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                date: e.target.value,
                              }))
                            }
                            className="bg-gray-800 border border-blue-500 rounded px-1.5 py-0.5 text-white text-xs w-28"
                            data-ocid="register.edit.input"
                          />
                        </td>
                        <td className="px-3 py-2 text-blue-400">
                          {p.receiptNo}
                        </td>
                        <td className="px-3 py-2 text-gray-400 text-[10px]">
                          {p.months.join(", ")}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={editForm.receiptAmt ?? p.receiptAmt}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                receiptAmt: Number(e.target.value),
                              }))
                            }
                            className="bg-gray-800 border border-green-500 rounded px-1.5 py-0.5 text-white text-xs w-20"
                            data-ocid="register.edit.input"
                          />
                        </td>
                        <td className="px-3 py-2 text-gray-300">
                          ₹{p.netFees.toLocaleString("en-IN")}
                        </td>
                        <td className="px-3 py-2 text-red-400">
                          ₹
                          {(
                            p.netFees -
                            (Number(editForm.receiptAmt) ?? p.receiptAmt)
                          ).toLocaleString("en-IN")}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={editForm.paymentMode || p.paymentMode}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                paymentMode: e.target.value,
                              }))
                            }
                            className="bg-gray-800 border border-purple-500 rounded px-1.5 py-0.5 text-white text-xs"
                            data-ocid="register.edit.select"
                          >
                            {[
                              "Cash",
                              "Online/UPI",
                              "Cheque",
                              "DD",
                              "Card",
                              "NEFT/RTGS",
                            ].map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-gray-400">
                          {p.receivedBy || "Admin (Admin)"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => saveEdit(p)}
                              className="text-[10px] bg-green-700 hover:bg-green-600 text-white px-2 py-0.5 rounded transition"
                              data-ocid="register.edit.save_button"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="text-[10px] bg-gray-700 hover:bg-gray-600 text-white px-2 py-0.5 rounded transition"
                              data-ocid="register.edit.cancel_button"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-gray-300 whitespace-nowrap">
                          {p.date}
                        </td>
                        <td className="px-3 py-2 text-blue-400 font-medium">
                          {p.receiptNo}
                        </td>
                        <td className="px-3 py-2 text-gray-400 text-[10px] max-w-32 truncate">
                          {p.months.join(", ")}
                        </td>
                        <td className="px-3 py-2 text-green-400 font-semibold text-right">
                          ₹{p.receiptAmt.toLocaleString("en-IN")}
                        </td>
                        <td className="px-3 py-2 text-gray-300 text-right">
                          ₹{p.netFees.toLocaleString("en-IN")}
                        </td>
                        <td
                          className="px-3 py-2 text-right"
                          style={{
                            color: p.balance > 0 ? "#f87171" : "#4ade80",
                          }}
                        >
                          ₹{p.balance.toLocaleString("en-IN")}
                        </td>
                        <td className="px-3 py-2 text-purple-300">
                          {p.paymentMode || "Cash"}
                        </td>
                        <td className="px-3 py-2 text-gray-400 whitespace-nowrap text-[10px]">
                          {p.receivedBy || "Admin (Admin)"}
                        </td>
                        {canEdit && (
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => startEdit(p)}
                                className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded transition"
                                title="Edit"
                                data-ocid="register.detail.edit_button"
                              >
                                ✏️
                              </button>
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => deletePayment(p.id)}
                                  className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition"
                                  title="Delete"
                                  data-ocid="register.detail.delete_button"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function FeesRegisterTab() {
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterMode, setFilterMode] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [detailStudent, setDetailStudent] = useState<{
    admNo: string;
    studentName: string;
    className: string;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const viewingSession = localStorage.getItem("erp_viewing_session") || "";

  const payments: PaymentRecord[] = (() => {
    // refreshKey dependency forces re-read when records are edited/deleted
    void refreshKey;
    try {
      if (viewingSession) {
        // Load from archived session
        const archiveKey = `erp_session_archive_${viewingSession.replace(/[^a-zA-Z0-9]/g, "_")}`;
        const archive = JSON.parse(localStorage.getItem(archiveKey) || "{}");
        return (archive.payments || []) as PaymentRecord[];
      }
      return JSON.parse(localStorage.getItem("erp_fee_payments") || "[]");
    } catch {
      return [];
    }
  })();

  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.studentName.toLowerCase().includes(q) ||
      p.admNo.toLowerCase().includes(q) ||
      p.receiptNo.toLowerCase().includes(q);
    const matchClass = !filterClass || p.className === filterClass;
    const matchMode = !filterMode || (p.paymentMode || "Cash") === filterMode;
    const matchFrom = !filterFrom || p.date >= filterFrom;
    const matchTo = !filterTo || p.date <= filterTo;
    return matchSearch && matchClass && matchMode && matchFrom && matchTo;
  });

  const totalCollected = filtered.reduce((s, p) => s + p.receiptAmt, 0);
  const totalNet = filtered.reduce((s, p) => s + p.netFees, 0);
  const totalBalance = filtered.reduce((s, p) => s + p.balance, 0);

  const classes = [...new Set(payments.map((p) => p.className))].sort();
  const modes = ["Cash", "Online/UPI", "Cheque", "DD", "Card", "NEFT/RTGS"];

  const printRegister = () => {
    const el = document.getElementById("fee-register-print");
    if (!el) return;
    const win = window.open("", "_blank", "width=1100,height=700");
    if (!win) return;
    win.document.write(
      `<html><head><title>Fees Register</title><style>@page{margin:10mm}body{margin:0;font-family:Arial,sans-serif;font-size:10px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 6px}th{background:#e8f0fe;font-weight:600}.summary{background:#f0fdf4;font-weight:bold}</style></head><body>${el.innerHTML}</body></html>`,
    );
    win.document.close();
    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-blue-400" />
          <h3 className="text-white font-bold text-sm tracking-wide">
            FEES RECEIPT REGISTER
          </h3>
          <span className="bg-blue-900/50 text-blue-300 text-[10px] px-2 py-0.5 rounded-full">
            {filtered.length} records
          </span>
        </div>
        <button
          type="button"
          onClick={printRegister}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded font-medium transition"
          data-ocid="register.print.button"
        >
          <Printer size={13} /> Print Register
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          {
            label: "Total Collected",
            value: `₹${totalCollected.toLocaleString("en-IN")}`,
            color: "text-green-400",
            bg: "bg-green-900/20 border-green-800",
          },
          {
            label: "Total Net Fees",
            value: `₹${totalNet.toLocaleString("en-IN")}`,
            color: "text-blue-400",
            bg: "bg-blue-900/20 border-blue-800",
          },
          {
            label: "Total Balance Due",
            value: `₹${totalBalance.toLocaleString("en-IN")}`,
            color: totalBalance > 0 ? "text-red-400" : "text-green-400",
            bg: "bg-red-900/20 border-red-800",
          },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-lg p-3 border ${bg}`}>
            <div className="text-gray-400 text-[10px] font-semibold tracking-wider mb-1">
              {label}
            </div>
            <div className={`text-lg font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        className="flex flex-wrap items-center gap-2 mb-3 p-3 rounded-lg"
        style={{ background: "#1a1f2e", border: "1px solid #374151" }}
      >
        <div className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 flex-1 min-w-48">
          <Search size={13} className="text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, adm no, receipt..."
            className="bg-transparent text-gray-300 text-xs outline-none w-full"
            data-ocid="register.search.input"
          />
        </div>
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-gray-300 text-xs outline-none"
          data-ocid="register.class.filter"
        >
          <option value="">All Classes</option>
          {classes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-gray-300 text-xs outline-none"
          data-ocid="register.mode.filter"
        >
          <option value="">All Modes</option>
          {modes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500 text-xs">From:</span>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-gray-300 text-xs outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500 text-xs">To:</span>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-gray-300 text-xs outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setSearch("");
            setFilterClass("");
            setFilterMode("");
            setFilterFrom("");
            setFilterTo("");
          }}
          className="text-gray-500 hover:text-white text-xs px-2 py-1.5 rounded border border-gray-700 hover:border-gray-500 transition"
        >
          Clear
        </button>
      </div>

      {/* Register Table */}
      <div
        id="fee-register-print"
        className="rounded-lg overflow-hidden border border-gray-700"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 900 }}>
            <thead>
              <tr style={{ background: "#1a1f2e" }}>
                {[
                  "#",
                  "Receipt No.",
                  "Date",
                  "Adm. No.",
                  "Student Name",
                  "Class",
                  "Months",
                  "Other Charges (₹)",
                  "Net Fees (₹)",
                  "Paid (₹)",
                  "Balance (₹)",
                  "Mode",
                  "Concession",
                  "Remarks",
                  "Status",
                  "Details",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2 text-gray-400 font-medium whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={16}
                    className="px-3 py-8 text-center text-gray-500"
                  >
                    No payment records found. Collect fees first to see them
                    here.
                  </td>
                </tr>
              ) : (
                filtered.map((p, i) => {
                  const paid = p.receiptAmt;
                  const bal = p.balance;
                  const status =
                    bal <= 0 ? "Paid" : paid > 0 ? "Partial" : "Due";
                  return (
                    <tr
                      key={p.id}
                      style={{
                        background: i % 2 === 0 ? "#111827" : "#0f1117",
                        borderBottom: "1px solid #1f2937",
                      }}
                    >
                      <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2 text-blue-400 font-medium">
                        {p.receiptNo}
                      </td>
                      <td className="px-3 py-2 text-gray-300 whitespace-nowrap">
                        {p.date}
                      </td>
                      <td className="px-3 py-2 text-yellow-400">{p.admNo}</td>
                      <td className="px-3 py-2 text-white font-medium">
                        {p.studentName}
                      </td>
                      <td className="px-3 py-2 text-gray-300">{p.className}</td>
                      <td className="px-3 py-2 text-gray-400 text-[10px]">
                        {p.months.join(", ")}
                      </td>
                      <td
                        className="px-3 py-2 text-right font-medium"
                        style={{
                          color:
                            p.otherCharges?.reduce(
                              (s: number, r: OtherChargeItem) => s + r.paid,
                              0,
                            ) > 0
                              ? "#4ade80"
                              : "#6b7280",
                        }}
                      >
                        ₹
                        {(
                          p.otherCharges?.reduce(
                            (s: number, r: OtherChargeItem) => s + r.paid,
                            0,
                          ) || 0
                        ).toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-200 font-medium">
                        ₹{p.netFees.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 text-right text-green-400 font-medium">
                        ₹{paid.toLocaleString("en-IN")}
                      </td>
                      <td
                        className="px-3 py-2 text-right font-medium"
                        style={{ color: bal > 0 ? "#f87171" : "#4ade80" }}
                      >
                        ₹{bal.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-1">
                          <CreditCard size={10} className="text-purple-400" />
                          <span className="text-purple-300">
                            {p.paymentMode || "Cash"}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-400">
                        {p.concessionAmt > 0
                          ? `₹${p.concessionAmt.toLocaleString("en-IN")} (${p.concessionPct}%)`
                          : "—"}
                      </td>
                      <td
                        className="px-3 py-2 text-gray-500 max-w-24 truncate"
                        title={p.remarks}
                      >
                        {p.remarks || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${status === "Paid" ? "bg-green-900/50 text-green-400" : status === "Partial" ? "bg-yellow-900/50 text-yellow-400" : "bg-red-900/50 text-red-400"}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() =>
                            setDetailStudent({
                              admNo: p.admNo,
                              studentName: p.studentName,
                              className: p.className,
                            })
                          }
                          className="text-blue-400 hover:text-blue-300 text-xs px-2 py-0.5 rounded border border-blue-500/40 hover:border-blue-400 transition"
                          title="View all payments for this student"
                          data-ocid="register.detail.open_modal_button"
                        >
                          👁 View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr
                  style={{
                    background: "#1a1f2e",
                    borderTop: "2px solid #374151",
                  }}
                >
                  <td
                    colSpan={7}
                    className="px-3 py-2 text-gray-400 font-semibold text-right"
                  >
                    TOTALS:
                  </td>
                  <td className="px-3 py-2 text-right text-gray-200 font-bold">
                    ₹{totalNet.toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-2 text-right text-green-400 font-bold">
                    ₹{totalCollected.toLocaleString("en-IN")}
                  </td>
                  <td
                    className="px-3 py-2 text-right font-bold"
                    style={{ color: totalBalance > 0 ? "#f87171" : "#4ade80" }}
                  >
                    ₹{totalBalance.toLocaleString("en-IN")}
                  </td>
                  <td colSpan={5} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      {detailStudent && (
        <FeeRegisterDetailModal
          admNo={detailStudent.admNo}
          studentName={detailStudent.studentName}
          className={detailStudent.className}
          onClose={() => setDetailStudent(null)}
          onUpdate={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}

// ─── DuesFeesTab (Wizard) ─────────────────────────────────────────────────────

const WIZARD_CLASS_LIST = [
  "Nursery",
  "LKG",
  "UKG",
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
  "11th",
  "12th",
];

function DuesFeesTab({ onCollect }: { onCollect: () => void }) {
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [showReport, setShowReport] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [allMonths, setAllMonths] = useState(false);
  const [allClasses, setAllClasses] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [waSending, setWaSending] = useState(false);
  const [waSent, setWaSent] = useState(false);

  const toggleMonth = (m: string) => {
    setSelectedMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  };

  const toggleAllMonths = () => {
    if (allMonths) {
      setSelectedMonths([]);
      setAllMonths(false);
    } else {
      setSelectedMonths([...SCHOOL_MONTHS]);
      setAllMonths(true);
    }
  };

  const toggleClass = (c: string) => {
    setSelectedClasses((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  };

  const toggleAllClasses = () => {
    if (allClasses) {
      setSelectedClasses([]);
      setAllClasses(false);
    } else {
      setSelectedClasses([...WIZARD_CLASS_LIST]);
      setAllClasses(true);
    }
  };

  // Build report data
  const reportData = (() => {
    if (!showReport) return [];
    const allStudents: StudentRecord[] = (() => {
      try {
        const ls = JSON.parse(
          localStorage.getItem("erp_students") || "[]",
        ) as StudentRecord[];
        return ls.length > 0 ? ls : RECEIPT_STUDENTS;
      } catch {
        return RECEIPT_STUDENTS;
      }
    })();
    const payments: PaymentRecord[] = (() => {
      try {
        return JSON.parse(localStorage.getItem("erp_fee_payments") || "[]");
      } catch {
        return [];
      }
    })();
    const plans = (() => {
      try {
        return JSON.parse(
          localStorage.getItem("erp_fee_plans") || "[]",
        ) as Array<{ className: string; feesHead: string; value: number }>;
      } catch {
        return [];
      }
    })();

    const filteredStudents = allStudents.filter((s) => {
      const cls = s.className?.replace(/Class\s*/i, "").trim() || s.className;
      return selectedClasses.some(
        (sc) =>
          s.className?.toLowerCase().includes(sc.toLowerCase()) ||
          cls?.toLowerCase() === sc.toLowerCase(),
      );
    });

    return filteredStudents
      .map((s) => {
        const studentPayments = payments.filter((p) => p.admNo === s.admNo);
        const monthAmounts: Record<string, number> = {};
        let totalDue = 0;
        for (const month of selectedMonths) {
          const wasPaid = studentPayments.some(
            (p) => p.months.includes(month) && p.receiptAmt > 0,
          );
          if (!wasPaid) {
            const classPlans = plans.filter((p) => p.className === s.className);
            let monthAmt = classPlans.reduce((sum, p) => sum + p.value, 0);
            if (monthAmt === 0) {
              monthAmt = SAMPLE_FEE_TYPES.reduce(
                (sum, ft) => sum + ft.amount,
                0,
              );
            }
            monthAmounts[month] = monthAmt;
            totalDue += monthAmt;
          } else {
            monthAmounts[month] = 0;
          }
        }
        // Add old balance dues from session archive
        const oldDues =
          s.prevSessionDues?.reduce(
            (sum, d) =>
              selectedMonths.includes(d.month) ? sum + d.amount : sum,
            0,
          ) || 0;
        totalDue += oldDues;
        return { student: s, monthAmounts, totalDue, oldDues };
      })
      .filter((row) => row.totalDue > 0);
  })();

  const schoolName = (() => {
    try {
      return (
        JSON.parse(localStorage.getItem("erp_school_profile") || "{}").name ||
        "SHUBH SCHOOL ERP"
      );
    } catch {
      return "SHUBH SCHOOL ERP";
    }
  })();

  const printDuesReport = () => {
    const win = window.open("", "_blank", "width=1100,height=700");
    if (!win) return;
    const monthCols = selectedMonths
      .map(
        (m) =>
          `<th style="border:1px solid #ccc;padding:4px 6px;background:#e8f0fe">${m}</th>`,
      )
      .join("");
    const rows = reportData
      .map((row, i) => {
        const monthCells = selectedMonths
          .map((m) => {
            const amt = row.monthAmounts[m] || 0;
            return `<td style="border:1px solid #ddd;padding:3px 6px;text-align:right;color:${amt > 0 ? "#dc2626" : "#16a34a"}">${amt > 0 ? `₹${amt.toLocaleString("en-IN")}` : "—"}</td>`;
          })
          .join("");
        return `<tr style="background:${i % 2 === 0 ? "#fff" : "#f8f9fa"}">
        <td style="border:1px solid #ddd;padding:3px 6px">${i + 1}</td>
        <td style="border:1px solid #ddd;padding:3px 6px">${row.student.admNo}</td>
        <td style="border:1px solid #ddd;padding:3px 6px;font-weight:600">${row.student.name}</td>
        <td style="border:1px solid #ddd;padding:3px 6px">${row.student.className}</td>
        ${monthCells}
        <td style="border:1px solid #ddd;padding:3px 6px;text-align:right;font-weight:700;color:#dc2626">₹${row.totalDue.toLocaleString("en-IN")}</td>
      </tr>`;
      })
      .join("");
    const totalRow = `<tr style="background:#fff3cd;font-weight:700">
      <td colspan="4" style="border:1px solid #ccc;padding:4px 6px;text-align:right">TOTAL DUE →</td>
      ${selectedMonths.map((m) => `<td style="border:1px solid #ccc;padding:4px 6px;text-align:right;color:#dc2626">₹${reportData.reduce((s, r) => s + (r.monthAmounts[m] || 0), 0).toLocaleString("en-IN")}</td>`).join("")}
      <td style="border:1px solid #ccc;padding:4px 6px;text-align:right;color:#dc2626">₹${reportData.reduce((s, r) => s + r.totalDue, 0).toLocaleString("en-IN")}</td>
    </tr>`;
    win.document.write(`<html><head><title>Dues Report</title><style>@page{margin:10mm}body{font-family:Arial;font-size:10px}table{border-collapse:collapse;width:100%}</style></head><body>
      <div style="text-align:center;font-weight:700;font-size:14px;margin-bottom:4px">${schoolName}</div>
      <div style="text-align:center;font-weight:700;font-size:11px;margin-bottom:8px;text-decoration:underline">DUES FEES REPORT — ${selectedMonths.join(", ")}</div>
      <table><thead><tr>
        <th style="border:1px solid #ccc;padding:4px 6px;background:#e8f0fe">#</th>
        <th style="border:1px solid #ccc;padding:4px 6px;background:#e8f0fe">Adm No</th>
        <th style="border:1px solid #ccc;padding:4px 6px;background:#e8f0fe">Student Name</th>
        <th style="border:1px solid #ccc;padding:4px 6px;background:#e8f0fe">Class</th>
        ${monthCols}
        <th style="border:1px solid #ccc;padding:4px 6px;background:#e8f0fe">Total Due</th>
      </tr></thead><tbody>${rows}${totalRow}</tbody></table>
    </body></html>`);
    win.document.close();
    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  };

  const exportCSV = () => {
    const headers = [
      "#",
      "Adm No",
      "Student Name",
      "Class",
      "Father",
      ...selectedMonths,
      "Total Due",
    ];
    const rows = reportData.map((row, i) => [
      i + 1,
      row.student.admNo,
      row.student.name,
      row.student.className,
      row.student.fatherName,
      ...selectedMonths.map((m) => row.monthAmounts[m] || 0),
      row.totalDue,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dues_report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReminderLetters = () => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    const pages = reportData
      .map((row) => {
        const monthLines = selectedMonths
          .filter((m) => (row.monthAmounts[m] || 0) > 0)
          .map(
            (m) =>
              `<tr><td>${m}</td><td style="text-align:right;color:#dc2626">₹${(row.monthAmounts[m] || 0).toLocaleString("en-IN")}</td></tr>`,
          )
          .join("");
        return `<div style="page-break-after:always;padding:20mm;font-family:Arial;font-size:11px">
        <div style="text-align:center;font-weight:700;font-size:16px;margin-bottom:4px">${schoolName}</div>
        <div style="text-align:center;font-size:11px;color:#555;margin-bottom:16px">FEES REMINDER LETTER</div>
        <div style="margin-bottom:12px">Date: ${new Date().toLocaleDateString("en-IN")}</div>
        <div style="margin-bottom:12px">Dear <b>${row.student.fatherName || "Parent"}</b>,</div>
        <p>This is a reminder that the following fees are pending for your ward:</p>
        <div style="margin:12px 0;padding:8px;border:1px solid #ccc">
          <b>${row.student.name}</b> | Adm No: ${row.student.admNo} | Class: ${row.student.className}
        </div>
        <table style="border-collapse:collapse;width:60%;margin:12px 0">
          <thead><tr style="background:#e8f0fe">
            <th style="border:1px solid #ccc;padding:4px 8px;text-align:left">Month</th>
            <th style="border:1px solid #ccc;padding:4px 8px;text-align:right">Amount Due</th>
          </tr></thead>
          <tbody>${monthLines}</tbody>
          <tfoot><tr style="font-weight:700;background:#fff3cd">
            <td style="border:1px solid #ccc;padding:4px 8px">TOTAL</td>
            <td style="border:1px solid #ccc;padding:4px 8px;text-align:right;color:#dc2626">₹${row.totalDue.toLocaleString("en-IN")}</td>
          </tr></tfoot>
        </table>
        <p>Please pay the above dues at the earliest to avoid any inconvenience.</p>
        <div style="margin-top:40px">
          <div>Yours sincerely,</div>
          <div style="margin-top:24px">__________________</div>
          <div>Principal / Accounts Office</div>
          <div>${schoolName}</div>
        </div>
      </div>`;
      })
      .join("");
    win.document.write(
      `<html><head><title>Reminder Letters</title><style>@page{margin:0}body{margin:0}</style></head><body>${pages}</body></html>`,
    );
    win.document.close();
    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  };

  const handleSendWhatsApp = () => {
    setWaSending(true);
    setTimeout(() => {
      setWaSending(false);
      setWaSent(true);
    }, 2000);
  };

  return (
    <div
      style={{
        background: "#0d111c",
        border: "1px solid #2d3748",
        borderRadius: 8,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
          borderRadius: "8px 8px 0 0",
        }}
        className="px-4 py-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm tracking-wider">
              💸 DUES FEES — Class-wise Wizard
            </span>
          </div>
          {showReport && (
            <button
              type="button"
              onClick={() => {
                setShowReport(false);
                setWizardStep(1);
              }}
              className="text-purple-200 hover:text-white text-xs border border-purple-400/40 rounded px-2 py-1 transition"
            >
              ← Back to Wizard
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {!showReport ? (
          <>
            {/* Wizard Steps Indicator */}
            <div className="flex items-center gap-3 mb-5">
              {[1, 2].map((step) => (
                <div key={step} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${wizardStep >= step ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-400"}`}
                  >
                    {step}
                  </div>
                  <span
                    className={`text-xs ${wizardStep >= step ? "text-white" : "text-gray-500"}`}
                  >
                    {step === 1 ? "Select Months" : "Select Classes"}
                  </span>
                  {step < 2 && (
                    <ChevronRight size={14} className="text-gray-600" />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Month Selection */}
            {wizardStep === 1 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold text-sm">
                    Step 1: Select Months
                  </h3>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allMonths}
                      onChange={toggleAllMonths}
                      className="accent-purple-500 w-3 h-3"
                      data-ocid="duesfees.allmonths.checkbox"
                    />
                    <span className="text-gray-300 text-xs">Select All</span>
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {SCHOOL_MONTHS.map((m) => (
                    <label
                      key={m}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer border transition ${selectedMonths.includes(m) ? "border-purple-500 bg-purple-900/30 text-white" : "border-gray-700 bg-gray-800/40 text-gray-400 hover:border-gray-500"}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMonths.includes(m)}
                        onChange={() => toggleMonth(m)}
                        className="accent-purple-500 w-3 h-3"
                        data-ocid="duesfees.month.checkbox"
                      />
                      <span className="text-sm font-medium">{m}</span>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedMonths.length === 0) {
                        toast.error("Select at least one month");
                        return;
                      }
                      setWizardStep(2);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded text-sm font-medium transition"
                    data-ocid="duesfees.next.primary_button"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Class Selection */}
            {wizardStep === 2 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold text-sm">
                    Step 2: Select Classes
                  </h3>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allClasses}
                      onChange={toggleAllClasses}
                      className="accent-purple-500 w-3 h-3"
                      data-ocid="duesfees.allclasses.checkbox"
                    />
                    <span className="text-gray-300 text-xs">Select All</span>
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {WIZARD_CLASS_LIST.map((c) => (
                    <label
                      key={c}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer border transition ${selectedClasses.includes(c) ? "border-blue-500 bg-blue-900/30 text-white" : "border-gray-700 bg-gray-800/40 text-gray-400 hover:border-gray-500"}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedClasses.includes(c)}
                        onChange={() => toggleClass(c)}
                        className="accent-blue-500 w-3 h-3"
                        data-ocid="duesfees.class.checkbox"
                      />
                      <span className="text-sm font-medium">{c}</span>
                    </label>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="border border-gray-600 text-gray-400 hover:text-white px-4 py-2 rounded text-sm transition"
                    data-ocid="duesfees.back.button"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedClasses.length === 0) {
                        toast.error("Select at least one class");
                        return;
                      }
                      setShowReport(true);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded text-sm font-medium transition"
                    data-ocid="duesfees.generate.primary_button"
                  >
                    Generate Report
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          // Report View
          <div>
            {/* Actions Toolbar */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-gray-400 text-xs">
                Months:{" "}
                <span className="text-purple-300 font-medium">
                  {selectedMonths.join(", ")}
                </span>
              </span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-400 text-xs">
                Classes:{" "}
                <span className="text-blue-300 font-medium">
                  {selectedClasses.join(", ")}
                </span>
              </span>
              <span className="text-gray-600">|</span>
              <span className="text-red-400 text-xs font-semibold">
                {reportData.length} students with dues
              </span>
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={printDuesReport}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded font-medium transition"
                  data-ocid="duesfees.print.button"
                >
                  <Printer size={13} /> Print
                </button>
                <button
                  type="button"
                  onClick={exportCSV}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded font-medium transition"
                  data-ocid="duesfees.excel.button"
                >
                  📊 Excel Export
                </button>
                <button
                  type="button"
                  onClick={printReminderLetters}
                  className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1.5 rounded font-medium transition"
                  data-ocid="duesfees.reminder.button"
                >
                  <ScrollText size={13} /> Reminder Letter
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowWhatsAppModal(true);
                    setWaSent(false);
                  }}
                  className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs px-3 py-1.5 rounded font-medium transition"
                  data-ocid="duesfees.whatsapp.button"
                >
                  <MessageSquare size={13} /> WhatsApp Reminder
                </button>
                <button
                  type="button"
                  onClick={onCollect}
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 rounded font-medium transition"
                  data-ocid="duesfees.collect.button"
                >
                  Collect Fees
                </button>
              </div>
            </div>

            {/* Report Table */}
            {reportData.length === 0 ? (
              <div
                className="text-center py-12 text-gray-500 rounded-lg"
                style={{ background: "#111827", border: "1px dashed #374151" }}
                data-ocid="duesfees.empty_state"
              >
                <div className="text-3xl mb-2">✅</div>
                <div>No dues found for selected months and classes</div>
              </div>
            ) : (
              <div
                className="rounded-lg overflow-x-auto"
                style={{ border: "1px solid #374151" }}
              >
                <table
                  className="w-full text-xs"
                  style={{ borderCollapse: "collapse", minWidth: 700 }}
                >
                  <thead>
                    <tr style={{ background: "#1a1f2e" }}>
                      <th className="text-left px-3 py-2 text-gray-400 font-medium">
                        #
                      </th>
                      <th className="text-left px-3 py-2 text-gray-400 font-medium">
                        Adm No
                      </th>
                      <th className="text-left px-3 py-2 text-gray-400 font-medium">
                        Student Name
                      </th>
                      <th className="text-left px-3 py-2 text-gray-400 font-medium">
                        Class
                      </th>
                      <th className="text-left px-3 py-2 text-gray-400 font-medium">
                        Section
                      </th>
                      {selectedMonths.map((m) => (
                        <th
                          key={m}
                          className="px-3 py-2 text-gray-400 font-medium text-right"
                        >
                          {m}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-gray-400 font-medium text-right">
                        Total Due
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row, i) => (
                      <tr
                        key={row.student.admNo}
                        style={{
                          background: i % 2 === 0 ? "#111827" : "#0d111c",
                          borderBottom: "1px solid #1f2937",
                        }}
                        data-ocid={`duesfees.item.${i + 1}`}
                      >
                        <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-3 py-2 text-yellow-400">
                          {row.student.admNo}
                        </td>
                        <td className="px-3 py-2 text-white font-medium flex items-center gap-2">
                          {(row.student as any).photo ? (
                            <img
                              src={(row.student as any).photo}
                              alt=""
                              className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-purple-700 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                              {row.student.name.charAt(0)}
                            </div>
                          )}
                          {row.student.name}
                        </td>
                        <td className="px-3 py-2 text-gray-300">
                          {row.student.className}
                        </td>
                        <td className="px-3 py-2 text-gray-400">
                          {(row.student as any).section || "—"}
                        </td>
                        {selectedMonths.map((m) => {
                          const amt = row.monthAmounts[m] || 0;
                          return (
                            <td
                              key={m}
                              className="px-3 py-2 text-right font-medium"
                              style={{ color: amt > 0 ? "#f87171" : "#4b5563" }}
                            >
                              {amt > 0
                                ? `₹${amt.toLocaleString("en-IN")}`
                                : "—"}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-right font-bold text-red-400">
                          ₹{row.totalDue.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                    {/* Footer totals row */}
                    <tr
                      style={{
                        background: "#1a1f2e",
                        borderTop: "2px solid #374151",
                      }}
                    >
                      <td
                        colSpan={5}
                        className="px-3 py-2 text-gray-400 font-semibold text-right"
                      >
                        TOTAL DUE →
                      </td>
                      {selectedMonths.map((m) => {
                        const colTotal = reportData.reduce(
                          (s, r) => s + (r.monthAmounts[m] || 0),
                          0,
                        );
                        return (
                          <td
                            key={m}
                            className="px-3 py-2 text-right font-bold"
                            style={{
                              color: colTotal > 0 ? "#fbbf24" : "#4b5563",
                            }}
                          >
                            {colTotal > 0
                              ? `₹${colTotal.toLocaleString("en-IN")}`
                              : "—"}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right font-bold text-red-400">
                        ₹
                        {reportData
                          .reduce((s, r) => s + r.totalDue, 0)
                          .toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* WhatsApp Reminder Modal */}
      {showWhatsAppModal && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          data-ocid="duesfees.whatsapp.modal"
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-xl shadow-2xl"
            style={{ borderTop: "3px solid #22c55e" }}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <MessageSquare size={15} className="text-green-400" />
                <h3 className="text-white font-semibold">WhatsApp Reminder</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(false)}
                className="text-gray-400 hover:text-white"
                data-ocid="duesfees.whatsapp.close_button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <div className="mb-3 text-gray-300 text-sm">
                Sending reminders to{" "}
                <span className="text-green-400 font-bold">
                  {reportData.length} parents
                </span>{" "}
                for months:{" "}
                <span className="text-purple-300">
                  {selectedMonths.join(", ")}
                </span>
              </div>
              {/* Message Preview */}
              <div
                className="rounded-lg p-3 mb-4"
                style={{ background: "#1a1f2e", border: "1px solid #374151" }}
              >
                <div className="text-gray-400 text-[10px] mb-1 font-semibold uppercase">
                  Message Preview
                </div>
                <div className="text-gray-200 text-xs italic">
                  "Dear [Parent], fees due for [Student Name]:{" "}
                  {selectedMonths.join(", ")} = ₹[Amount]. Please pay at
                  earliest. — {schoolName}"
                </div>
              </div>
              {/* Student list */}
              <div className="max-h-52 overflow-y-auto space-y-1 mb-4">
                {reportData.map((row, i) => (
                  <div
                    key={row.student.admNo}
                    className="flex items-center justify-between px-3 py-2 rounded text-xs"
                    style={{ background: i % 2 === 0 ? "#111827" : "#0d111c" }}
                    data-ocid={`duesfees.wa.item.${i + 1}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-green-800 flex items-center justify-center text-white text-[9px]">
                        {row.student.name.charAt(0)}
                      </div>
                      <span className="text-white">{row.student.name}</span>
                      <span className="text-gray-500">
                        {row.student.contact || "—"}
                      </span>
                    </div>
                    <span className="text-red-400 font-semibold">
                      ₹{row.totalDue.toLocaleString("en-IN")}
                    </span>
                    {waSent && (
                      <span className="text-green-400 text-[10px]">✓ Sent</span>
                    )}
                  </div>
                ))}
              </div>
              {!waSent ? (
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  disabled={waSending}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2.5 rounded font-semibold transition flex items-center justify-center gap-2"
                  data-ocid="duesfees.wa.send.primary_button"
                >
                  {waSending ? (
                    <>
                      <span className="animate-spin">⟳</span> Sending...
                    </>
                  ) : (
                    <>
                      <MessageSquare size={15} /> Send All WhatsApp Reminders
                    </>
                  )}
                </button>
              ) : (
                <div
                  className="text-center text-green-400 font-semibold py-2"
                  data-ocid="duesfees.wa.success_state"
                >
                  ✓ All {reportData.length} reminders sent successfully!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Fees() {
  const [tab, setTab] = useState<
    | "collect"
    | "search"
    | "due"
    | "duesfees"
    | "master"
    | "plan"
    | "othercharges"
    | "register"
    | "groups"
    | "accounts"
  >("collect");
  const [fees, _setFees] = useState<FeeRecord[]>(initialFees);
  const [search, setSearch] = useState("");

  // Migration: stamp session field on existing payments
  useEffect(() => {
    try {
      const payments: PaymentRecord[] = JSON.parse(
        localStorage.getItem("erp_fee_payments") || "[]",
      );
      const needsMigration = payments.some((p) => !p.session);
      if (needsMigration) {
        const migrated = payments.map((p) =>
          p.session ? p : { ...p, session: "2025-26" },
        );
        localStorage.setItem("erp_fee_payments", JSON.stringify(migrated));
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Other Charges state (for the OtherCharges tab)
  const [otherCharges, setOtherCharges] = useState([
    { id: "oc-1", type: "Other Charge", paid: 0, due: 0 },
  ]);
  // Master tab state
  const [headings, setHeadings] = useState<FeeHeading[]>(initialHeadings);
  const [selectedHeading, setSelectedHeading] = useState<FeeHeading | null>(
    null,
  );
  const [masterForm, setMasterForm] = useState({
    heading: "",
    group: "General",
    account: "Admission Fees",
    frequency: "Annual",
    months: [] as string[],
  });

  // Plan tab state
  const [plans, setPlans] = useState<FeePlan[]>(initialPlans);
  const [selectedPlan, setSelectedPlan] = useState<FeePlan | null>(null);

  const [planForm, setPlanForm] = useState({
    feesHead: "Admission Fee",
    value: "",
    classes: [] as string[],
    selectAll: false,
  });

  const filtered = fees.filter(
    (f) =>
      f.studentName.toLowerCase().includes(search.toLowerCase()) ||
      f.receiptNo.toLowerCase().includes(search.toLowerCase()),
  );
  const due = fees.filter((f) => f.status !== "Paid");

  const toggleMonth = (month: string) => {
    setMasterForm((p) => ({
      ...p,
      months: p.months.includes(month)
        ? p.months.filter((m) => m !== month)
        : [...p.months, month],
    }));
  };

  const addHeading = () => {
    if (!masterForm.heading.trim()) return;
    const newHeading: FeeHeading = {
      id: headings.length + 1,
      heading: masterForm.heading,
      group: masterForm.group,
      account: masterForm.account,
      frequency: masterForm.frequency,
      months: masterForm.months,
    };
    const updated = [...headings, newHeading];
    setHeadings(updated);
    try {
      localStorage.setItem("erp_fee_master_headings", JSON.stringify(updated));
    } catch {
      /* ignore */
    }
    setMasterForm({
      heading: "",
      group: "General",
      account: "Admission Fees",
      frequency: "Annual",
      months: [],
    });
  };

  const deleteHeading = () => {
    if (!selectedHeading) return;
    const updated = headings.filter((h) => h.id !== selectedHeading.id);
    setHeadings(updated);
    try {
      localStorage.setItem("erp_fee_master_headings", JSON.stringify(updated));
    } catch {
      /* ignore */
    }
    setSelectedHeading(null);
  };

  const savePlan = () => {
    if (!planForm.feesHead || !planForm.value || planForm.classes.length === 0)
      return;
    let nextId = plans.length + 1;
    const newRows: FeePlan[] = [];
    for (const cls of planForm.classes) {
      newRows.push({
        id: nextId++,
        className: cls,
        category: "General",
        feesHead: planForm.feesHead,
        value: Number(planForm.value),
      });
    }
    setPlans((p) => [...p, ...newRows]);
    setPlanForm((p) => ({
      ...p,
      value: "",
      classes: [],
      selectAll: false,
    }));
  };

  const deletePlan = () => {
    if (!selectedPlan) return;
    setPlans((p) => p.filter((r) => r.id !== selectedPlan.id));
    setSelectedPlan(null);
  };

  const toggleClass = (cls: string) => {
    setPlanForm((p) => {
      const next = p.classes.includes(cls)
        ? p.classes.filter((c) => c !== cls)
        : [...p.classes, cls];
      return {
        ...p,
        classes: next,
        selectAll: next.length === CLASS_LIST.length,
      };
    });
  };

  const toggleSelectAll = () => {
    setPlanForm((p) => ({
      ...p,
      selectAll: !p.selectAll,
      classes: !p.selectAll ? [...CLASS_LIST] : [],
    }));
  };

  const tabLabel = (t: string) => {
    if (t === "collect") return "Collect Fees";
    if (t === "search") return "Search Fees";
    if (t === "due") return "Due Fees";
    if (t === "duesfees") return "💸 Dues Fees";
    if (t === "master") return "Fees Master";
    if (t === "plan") return "Fees Plan";
    if (t === "othercharges") return "Other Charges";
    if (t === "register") return "📋 Fee Register";
    if (t === "groups") return "👥 Groups";
    if (t === "accounts") return "🏦 Accounts";
    return t;
  };

  const _inputCls =
    "bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-xs outline-none focus:border-blue-500 w-full";
  const _labelCls = "text-gray-400 text-[10px] block mb-0.5";

  return (
    <div>
      <h2 className="text-white text-lg font-semibold mb-4">Fees Collection</h2>
      <div className="flex flex-wrap gap-1 mb-4">
        {(
          [
            "collect",
            "register",
            "search",
            "due",
            "duesfees",
            "master",
            "plan",
            "othercharges",
            "groups",
            "accounts",
          ] as const
        ).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setTab(t)}
            data-ocid={`fees.${t}.tab`}
            className={`px-4 py-1.5 rounded text-xs font-medium capitalize transition ${
              tab === t
                ? "bg-green-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {tabLabel(t)}
          </button>
        ))}
      </div>

      {/* ── COLLECT TAB (Fees Receipt) ── */}
      {tab === "collect" && <CollectFeesTab />}

      {/* ── FEE REGISTER TAB ── */}
      {tab === "register" && <FeesRegisterTab />}

      {/* ── SEARCH TAB ── */}
      {tab === "search" && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center bg-gray-800 border border-gray-700 rounded px-2 py-1.5 flex-1 max-w-xs">
              <Search size={14} className="text-gray-400 mr-1" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or receipt..."
                className="bg-transparent text-gray-300 text-xs outline-none w-full"
              />
            </div>
          </div>
          <div className="rounded-lg overflow-hidden border border-gray-700">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#1a1f2e" }}>
                  {[
                    "Receipt No",
                    "Student",
                    "Class",
                    "Fee Type",
                    "Amount",
                    "Mode",
                    "Date",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2 text-gray-400 font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((f, i) => (
                  <tr
                    key={f.id}
                    style={{ background: i % 2 === 0 ? "#111827" : "#0f1117" }}
                  >
                    <td className="px-3 py-2 text-blue-400">{f.receiptNo}</td>
                    <td className="px-3 py-2 text-white">{f.studentName}</td>
                    <td className="px-3 py-2 text-gray-300">{f.className}</td>
                    <td className="px-3 py-2 text-gray-300">{f.feeType}</td>
                    <td className="px-3 py-2 text-green-400">
                      ₹{f.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-2 text-gray-400">
                      {f.paymentMode || "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-400">{f.date || "-"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${f.status === "Paid" ? "bg-green-900/50 text-green-400" : f.status === "Pending" ? "bg-yellow-900/50 text-yellow-400" : "bg-red-900/50 text-red-400"}`}
                      >
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DUE TAB (simple summary) ── */}
      {tab === "due" && (
        <div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div
              className="rounded-lg p-3"
              style={{ background: "#1a1f2e", border: "1px solid #374151" }}
            >
              <p className="text-gray-400 text-xs">Due/Pending Students</p>
              <p className="text-red-400 text-2xl font-bold">{due.length}</p>
            </div>
            <div
              className="rounded-lg p-3"
              style={{ background: "#1a1f2e", border: "1px solid #374151" }}
            >
              <p className="text-gray-400 text-xs">Due Amount</p>
              <p className="text-yellow-400 text-2xl font-bold">
                ₹{due.reduce((s, f) => s + f.amount, 0).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
          <div className="rounded-lg overflow-hidden border border-gray-700">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#1a1f2e" }}>
                  {[
                    "Student",
                    "Class",
                    "Fee Type",
                    "Amount",
                    "Status",
                    "Action",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2 text-gray-400 font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {due.map((f, i) => (
                  <tr
                    key={f.id}
                    style={{ background: i % 2 === 0 ? "#111827" : "#0f1117" }}
                  >
                    <td className="px-3 py-2 text-white">{f.studentName}</td>
                    <td className="px-3 py-2 text-gray-300">{f.className}</td>
                    <td className="px-3 py-2 text-gray-300">{f.feeType}</td>
                    <td className="px-3 py-2 text-red-400">
                      ₹{f.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${f.status === "Pending" ? "bg-yellow-900/50 text-yellow-400" : "bg-red-900/50 text-red-400"}`}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setTab("collect")}
                        className="bg-green-700 hover:bg-green-600 text-white px-2 py-0.5 rounded text-[10px]"
                      >
                        Collect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DUES FEES TAB (month-wise dues) ── */}
      {tab === "duesfees" && (
        <DuesFeesTab onCollect={() => setTab("collect")} />
      )}

      {/* ── FEES MASTER TAB ── */}
      {tab === "master" && (
        <div>
          <div
            className="rounded-lg p-4 mb-4"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={15} className="text-blue-400" />
              <h3 className="text-white text-xs font-bold tracking-widest uppercase">
                Create Fees Heading
              </h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="master-heading"
                  className="text-gray-400 text-xs w-28 shrink-0"
                >
                  Fees Heading
                </label>
                <input
                  id="master-heading"
                  type="text"
                  value={masterForm.heading}
                  onChange={(e) =>
                    setMasterForm((p) => ({ ...p, heading: e.target.value }))
                  }
                  placeholder="Enter fees heading"
                  data-ocid="master.heading.input"
                  className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="master-group"
                  className="text-gray-400 text-xs w-28 shrink-0"
                >
                  Group Name
                </label>
                <select
                  id="master-group"
                  value={masterForm.group}
                  onChange={(e) =>
                    setMasterForm((p) => ({ ...p, group: e.target.value }))
                  }
                  data-ocid="master.group.select"
                  className="w-36 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                >
                  {getGroups().map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
                <label
                  htmlFor="master-account"
                  className="text-gray-400 text-xs ml-2 shrink-0"
                >
                  Account Name
                </label>
                <select
                  id="master-account"
                  value={masterForm.account}
                  onChange={(e) =>
                    setMasterForm((p) => ({ ...p, account: e.target.value }))
                  }
                  data-ocid="master.account.select"
                  className="w-36 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                >
                  {getAccounts().map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="master-frequency"
                  className="text-gray-400 text-xs w-28 shrink-0"
                >
                  Frequency
                </label>
                <select
                  id="master-frequency"
                  value={masterForm.frequency}
                  onChange={(e) =>
                    setMasterForm((p) => ({ ...p, frequency: e.target.value }))
                  }
                  data-ocid="master.frequency.select"
                  className="w-44 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div className="mt-2">
                <p className="text-orange-400 text-[11px] italic mb-2">
                  Select Months in which this fees becomes due towards student
                </p>
                <div className="grid grid-cols-4 gap-0 rounded overflow-hidden border border-gray-700">
                  {ALL_MONTHS.map((month, idx) => (
                    <label
                      key={month}
                      className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-xs ${Math.floor(idx / 4) % 2 === 0 ? "bg-gray-800/60" : "bg-gray-700/30"}`}
                    >
                      <input
                        type="checkbox"
                        checked={masterForm.months.includes(month)}
                        onChange={() => toggleMonth(month)}
                        className="accent-blue-500 w-3 h-3"
                      />
                      <span className="text-gray-300">{month}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={addHeading}
                  data-ocid="master.heading.primary_button"
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-1.5 rounded font-medium"
                >
                  <Plus size={13} /> New
                </button>
              </div>
            </div>
          </div>
          <div className="rounded-lg overflow-hidden border border-gray-700 mb-1">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-max">
                <thead>
                  <tr style={{ background: "#1a1f2e" }}>
                    <th className="text-left px-2 py-2 text-gray-400 font-medium w-8">
                      #
                    </th>
                    <th className="text-left px-2 py-2 text-gray-400 font-medium">
                      Fees Heading
                    </th>
                    <th className="text-left px-2 py-2 text-gray-400 font-medium">
                      Group
                    </th>
                    <th className="text-left px-2 py-2 text-gray-400 font-medium">
                      Account
                    </th>
                    <th className="text-left px-2 py-2 text-gray-400 font-medium">
                      Frequency
                    </th>
                    {ALL_MONTHS.map((m) => (
                      <th
                        key={m}
                        className="text-center px-1 py-2 text-gray-400 font-medium w-8"
                      >
                        {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {headings.map((h, i) => (
                    <tr
                      key={h.id}
                      onClick={() =>
                        setSelectedHeading(
                          selectedHeading?.id === h.id ? null : h,
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          setSelectedHeading(
                            selectedHeading?.id === h.id ? null : h,
                          );
                      }}
                      tabIndex={0}
                      className="cursor-pointer"
                      style={{
                        background:
                          selectedHeading?.id === h.id
                            ? "#1e3a5f"
                            : i % 2 === 0
                              ? "#111827"
                              : "#0f1117",
                      }}
                    >
                      <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                      <td className="px-2 py-1.5 text-white">{h.heading}</td>
                      <td className="px-2 py-1.5 text-gray-300">{h.group}</td>
                      <td className="px-2 py-1.5 text-gray-300">{h.account}</td>
                      <td className="px-2 py-1.5 text-gray-300">
                        {h.frequency}
                      </td>
                      {ALL_MONTHS.map((m) => (
                        <td key={m} className="text-center px-1 py-1.5">
                          {h.months.includes(m) ? (
                            <span className="text-green-400 font-bold">✓</span>
                          ) : (
                            <span className="text-gray-700">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div
            className="flex items-center gap-3 mt-2 p-2 rounded"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <button
              type="button"
              onClick={deleteHeading}
              disabled={!selectedHeading}
              data-ocid="master.heading.delete_button"
              className="flex items-center gap-1 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs px-3 py-1.5 rounded"
            >
              <Trash2 size={12} /> Delete
            </button>
            <div className="flex items-center gap-4 text-xs flex-1">
              <span className="text-gray-500">
                Fees Name:{" "}
                <span className="text-gray-200">
                  {selectedHeading?.heading || "—"}
                </span>
              </span>
              <span className="text-gray-500">
                Group:{" "}
                <span className="text-gray-200">
                  {selectedHeading?.group || "—"}
                </span>
              </span>
              <span className="text-gray-500">
                Account Name:{" "}
                <span className="text-gray-200">
                  {selectedHeading?.account || "—"}
                </span>
              </span>
              <span className="text-gray-500">
                Frequency:{" "}
                <span className="text-gray-200">
                  {selectedHeading?.frequency || "—"}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── FEES PLAN TAB ── */}
      {tab === "plan" && (
        <div>
          <div
            className="rounded-lg p-4 mb-4"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <ScrollText size={15} className="text-blue-400" />
              <h3 className="text-white text-xs font-bold tracking-widest uppercase">
                Configure Fees Plan
              </h3>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div>
                <label
                  htmlFor="plan-feeshead"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Select Fees Heading
                </label>
                <select
                  id="plan-feeshead"
                  value={planForm.feesHead}
                  onChange={(e) =>
                    setPlanForm((p) => ({ ...p, feesHead: e.target.value }))
                  }
                  data-ocid="plan.feeshead.select"
                  className="w-48 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                >
                  {headings.map((h) => (
                    <option key={h.id}>{h.heading}</option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="plan-value"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Fees Value
                </label>
                <input
                  id="plan-value"
                  type="number"
                  value={planForm.value}
                  onChange={(e) =>
                    setPlanForm((p) => ({ ...p, value: e.target.value }))
                  }
                  placeholder="0"
                  data-ocid="plan.value.input"
                  className="w-28 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <p className="text-red-400 text-[11px] italic mb-3">
              Enter Value for selected fees heading and select classes and
              categories to which this fees value is applicable
            </p>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="selectAllClasses"
                checked={planForm.selectAll}
                onChange={toggleSelectAll}
                className="accent-blue-500 w-3 h-3"
              />
              <label
                htmlFor="selectAllClasses"
                className="text-gray-300 text-xs cursor-pointer"
              >
                Select All
              </label>
              <span className="text-gray-400 text-xs ml-2">Choose Classes</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="border border-gray-700 rounded overflow-hidden">
                <div className="bg-gray-700/40 px-3 py-1.5">
                  <span className="text-gray-300 text-xs font-medium">
                    Classes
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto grid grid-cols-4">
                  {CLASS_LIST.map((cls, idx) => (
                    <label
                      key={cls}
                      className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-xs ${idx % 2 === 0 ? "bg-gray-800/60" : "bg-gray-700/20"}`}
                    >
                      <input
                        type="checkbox"
                        checked={planForm.classes.includes(cls)}
                        onChange={() => toggleClass(cls)}
                        className="accent-blue-500 w-3 h-3"
                      />
                      <span className="text-gray-300">{cls}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <button
                type="button"
                onClick={savePlan}
                data-ocid="plan.save.primary_button"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-5 py-1.5 rounded font-medium"
              >
                Save
              </button>
            </div>
          </div>
          <div className="rounded-lg overflow-hidden border border-gray-700 mb-1">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#1a1f2e" }}>
                  {["Class", "Fees Head", "Value"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2 text-gray-400 font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plans.map((row, i) => (
                  <tr
                    key={row.id}
                    onClick={() =>
                      setSelectedPlan(selectedPlan?.id === row.id ? null : row)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        setSelectedPlan(
                          selectedPlan?.id === row.id ? null : row,
                        );
                    }}
                    tabIndex={0}
                    className="cursor-pointer"
                    style={{
                      background:
                        selectedPlan?.id === row.id
                          ? "#1e3a5f"
                          : i % 2 === 0
                            ? "#111827"
                            : "#0f1117",
                    }}
                  >
                    <td className="px-3 py-1.5 text-white">{row.className}</td>
                    <td className="px-3 py-1.5 text-gray-300">
                      {row.feesHead}
                    </td>
                    <td className="px-3 py-1.5 text-green-400">
                      ₹{row.value.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            className="flex items-center gap-3 mt-2 p-2 rounded"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <button
              type="button"
              onClick={deletePlan}
              disabled={!selectedPlan}
              data-ocid="plan.row.delete_button"
              className="flex items-center gap-1 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs px-3 py-1.5 rounded"
            >
              <Trash2 size={12} /> Delete
            </button>
            <div className="flex items-center gap-4 text-xs flex-1">
              <span className="text-gray-500">
                Fees Head:{" "}
                <span className="text-gray-200">
                  {selectedPlan?.feesHead || "—"}
                </span>
              </span>
              <span className="text-gray-500">
                Class:{" "}
                <span className="text-gray-200">
                  {selectedPlan?.className || "—"}
                </span>
              </span>
              <span className="text-gray-500">
                Fees Value:{" "}
                <span className="text-green-300">
                  {selectedPlan
                    ? `₹${selectedPlan.value.toLocaleString("en-IN")}`
                    : "—"}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}
      {tab === "othercharges" && (
        <div
          style={{
            background: "#0f1117",
            border: "1px solid #374151",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              background: "#1a1f2e",
              borderBottom: "1px solid #374151",
              borderRadius: "8px 8px 0 0",
            }}
            className="flex items-center justify-between px-4 py-2"
          >
            <span className="text-white font-bold text-sm">OTHER CHARGES</span>
            <button
              type="button"
              onClick={() => {
                toast.success("Other charges saved");
              }}
              data-ocid="othercharges.save.primary_button"
              className="bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-1.5 rounded font-medium transition"
            >
              Save
            </button>
          </div>
          <div className="p-4">
            <OtherChargesTable rows={otherCharges} onChange={setOtherCharges} />
            <div className="mt-3 flex items-center gap-4 text-xs">
              <span className="text-gray-400">
                Total Paid:{" "}
                <strong className="text-green-400">
                  ₹
                  {otherCharges
                    .reduce((s, r) => s + r.paid, 0)
                    .toLocaleString("en-IN")}
                </strong>
              </span>
              <span className="text-gray-400">
                Total Due:{" "}
                <strong className="text-red-400">
                  ₹
                  {otherCharges
                    .reduce((s, r) => s + r.due, 0)
                    .toLocaleString("en-IN")}
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}
      {/* ── GROUPS TAB ── */}
      {tab === "groups" && <GroupsSubModule />}

      {/* ── ACCOUNTS TAB ── */}
      {tab === "accounts" && <AccountsSubModule />}
    </div>
  );
}

// ─── GroupsSubModule ─────────────────────────────────────────────────────────
function GroupsSubModule() {
  const [groups, setGroups] = useState<string[]>(() => getGroups());
  const [newGroup, setNewGroup] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");

  const saveGroups = (updated: string[]) => {
    setGroups(updated);
    localStorage.setItem("erp_fee_groups", JSON.stringify(updated));
  };

  const addGroup = () => {
    if (!newGroup.trim()) return;
    if (groups.includes(newGroup.trim())) {
      toast.error("Group already exists");
      return;
    }
    saveGroups([...groups, newGroup.trim()]);
    setNewGroup("");
    toast.success("Group added");
  };

  const startEdit = (i: number) => {
    setEditIdx(i);
    setEditVal(groups[i]);
  };
  const saveEdit = (i: number) => {
    if (!editVal.trim()) return;
    const updated = [...groups];
    updated[i] = editVal.trim();
    saveGroups(updated);
    setEditIdx(null);
    toast.success("Group updated");
  };

  const deleteGroup = (i: number) => {
    saveGroups(groups.filter((_, idx) => idx !== i));
    toast.success("Group deleted");
  };

  return (
    <div
      style={{
        background: "#0d111c",
        border: "1px solid #2d3748",
        borderRadius: 8,
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg,#1e3a5f,#1565c0)",
          borderRadius: "8px 8px 0 0",
        }}
        className="px-4 py-3"
      >
        <h3 className="text-white font-bold text-sm">Fee Groups Management</h3>
        <p className="text-blue-200 text-xs mt-0.5">
          Groups are used to categorize fee headings
        </p>
      </div>
      <div className="p-4">
        {/* Add form */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addGroup()}
            placeholder="Enter new group name..."
            className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-white text-xs outline-none focus:border-blue-400"
            data-ocid="groups.name.input"
          />
          <button
            type="button"
            onClick={addGroup}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-1.5 rounded font-medium transition"
            data-ocid="groups.add.primary_button"
          >
            <Plus size={13} /> Add Group
          </button>
        </div>

        {/* Groups list */}
        <div className="rounded-lg overflow-hidden border border-gray-700">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "#1a1f2e" }}>
                <th className="text-left px-3 py-2 text-gray-400">#</th>
                <th className="text-left px-3 py-2 text-gray-400">
                  Group Name
                </th>
                <th className="text-left px-3 py-2 text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-6 text-center text-gray-500"
                    data-ocid="groups.empty_state"
                  >
                    No groups added yet
                  </td>
                </tr>
              ) : (
                groups.map((g, i) => (
                  <tr
                    key={`grp-${g}`}
                    style={{ background: i % 2 === 0 ? "#111827" : "#0d111c" }}
                    data-ocid={`groups.item.${i + 1}`}
                  >
                    <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2">
                      {editIdx === i ? (
                        <input
                          type="text"
                          value={editVal}
                          onChange={(e) => setEditVal(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveEdit(i)}
                          className="bg-gray-800 border border-blue-500 rounded px-2 py-0.5 text-white text-xs outline-none w-48"
                          data-ocid="groups.edit.input"
                        />
                      ) : (
                        <span className="text-white font-medium">{g}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {editIdx === i ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveEdit(i)}
                              className="text-[10px] bg-green-700 hover:bg-green-600 text-white px-2 py-0.5 rounded transition"
                              data-ocid="groups.save.button"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditIdx(null)}
                              className="text-[10px] bg-gray-700 hover:bg-gray-600 text-white px-2 py-0.5 rounded transition"
                              data-ocid="groups.cancel.button"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(i)}
                              className="text-blue-400 hover:text-blue-300 text-xs px-2 py-0.5 rounded border border-blue-500/30 hover:border-blue-400 transition"
                              data-ocid="groups.edit_button"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteGroup(i)}
                              className="text-red-400 hover:text-red-300 text-xs px-2 py-0.5 rounded border border-red-500/30 hover:border-red-400 transition"
                              data-ocid="groups.delete_button"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── AccountsSubModule ────────────────────────────────────────────────────────
function AccountsSubModule() {
  const [accounts, setAccounts] = useState<string[]>(() => getAccounts());
  const [newAccount, setNewAccount] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");

  const saveAccounts = (updated: string[]) => {
    setAccounts(updated);
    localStorage.setItem("erp_fee_accounts", JSON.stringify(updated));
  };

  const addAccount = () => {
    if (!newAccount.trim()) return;
    if (accounts.includes(newAccount.trim())) {
      toast.error("Account already exists");
      return;
    }
    saveAccounts([...accounts, newAccount.trim()]);
    setNewAccount("");
    toast.success("Account added");
  };

  const startEdit = (i: number) => {
    setEditIdx(i);
    setEditVal(accounts[i]);
  };
  const saveEdit = (i: number) => {
    if (!editVal.trim()) return;
    const updated = [...accounts];
    updated[i] = editVal.trim();
    saveAccounts(updated);
    setEditIdx(null);
    toast.success("Account updated");
  };

  const deleteAccount = (i: number) => {
    saveAccounts(accounts.filter((_, idx) => idx !== i));
    toast.success("Account deleted");
  };

  // Compute account-wise fees summary
  const accountSummary = (() => {
    try {
      const payments: PaymentRecord[] = JSON.parse(
        localStorage.getItem("erp_fee_payments") || "[]",
      );
      const headings: FeeHeading[] = JSON.parse(
        localStorage.getItem("erp_fee_master_headings") || "[]",
      );
      const result: Record<string, number> = {};
      for (const acc of accounts) result[acc] = 0;
      for (const payment of payments) {
        for (const feeRow of payment.feeRows) {
          if (!feeRow.checked) continue;
          const heading = headings.find((h) => h.heading === feeRow.feeHead);
          if (heading && accounts.includes(heading.account)) {
            const rowTotal = payment.months.reduce(
              (s, m) => s + (feeRow.months[m] || 0),
              0,
            );
            result[heading.account] = (result[heading.account] || 0) + rowTotal;
          }
        }
      }
      return result;
    } catch {
      return {};
    }
  })();

  return (
    <div
      style={{
        background: "#0d111c",
        border: "1px solid #2d3748",
        borderRadius: 8,
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg,#065f46,#047857)",
          borderRadius: "8px 8px 0 0",
        }}
        className="px-4 py-3"
      >
        <h3 className="text-white font-bold text-sm">Accounts Management</h3>
        <p className="text-green-200 text-xs mt-0.5">
          Account name-wise fee collection summary
        </p>
      </div>
      <div className="p-4">
        {/* Add form */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newAccount}
            onChange={(e) => setNewAccount(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addAccount()}
            placeholder="Enter new account name..."
            className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-white text-xs outline-none focus:border-green-400"
            data-ocid="accounts.name.input"
          />
          <button
            type="button"
            onClick={addAccount}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-1.5 rounded font-medium transition"
            data-ocid="accounts.add.primary_button"
          >
            <Plus size={13} /> Add Account
          </button>
        </div>

        {/* Accounts list */}
        <div className="rounded-lg overflow-hidden border border-gray-700 mb-5">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "#1a1f2e" }}>
                <th className="text-left px-3 py-2 text-gray-400">#</th>
                <th className="text-left px-3 py-2 text-gray-400">
                  Account Name
                </th>
                <th className="text-left px-3 py-2 text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-6 text-center text-gray-500"
                    data-ocid="accounts.empty_state"
                  >
                    No accounts added yet
                  </td>
                </tr>
              ) : (
                accounts.map((a, i) => (
                  <tr
                    key={`acc-${a}`}
                    style={{ background: i % 2 === 0 ? "#111827" : "#0d111c" }}
                    data-ocid={`accounts.item.${i + 1}`}
                  >
                    <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2">
                      {editIdx === i ? (
                        <input
                          type="text"
                          value={editVal}
                          onChange={(e) => setEditVal(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveEdit(i)}
                          className="bg-gray-800 border border-green-500 rounded px-2 py-0.5 text-white text-xs outline-none w-48"
                          data-ocid="accounts.edit.input"
                        />
                      ) : (
                        <span className="text-white font-medium">{a}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {editIdx === i ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveEdit(i)}
                              className="text-[10px] bg-green-700 hover:bg-green-600 text-white px-2 py-0.5 rounded transition"
                              data-ocid="accounts.save.button"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditIdx(null)}
                              className="text-[10px] bg-gray-700 hover:bg-gray-600 text-white px-2 py-0.5 rounded transition"
                              data-ocid="accounts.cancel.button"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(i)}
                              className="text-blue-400 hover:text-blue-300 text-xs px-2 py-0.5 rounded border border-blue-500/30 transition"
                              data-ocid="accounts.edit_button"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteAccount(i)}
                              className="text-red-400 hover:text-red-300 text-xs px-2 py-0.5 rounded border border-red-500/30 transition"
                              data-ocid="accounts.delete_button"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Account-wise Summary */}
        <div>
          <h4 className="text-white text-xs font-bold mb-2">
            Account-wise Fees Received Summary
          </h4>
          <div className="rounded-lg overflow-hidden border border-gray-700">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#1a1f2e" }}>
                  <th className="text-left px-3 py-2 text-gray-400">
                    Account Name
                  </th>
                  <th className="text-right px-3 py-2 text-gray-400">
                    Total Received (₹)
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a, i) => (
                  <tr
                    key={`acc-${a}`}
                    style={{ background: i % 2 === 0 ? "#111827" : "#0d111c" }}
                  >
                    <td className="px-3 py-2 text-white">{a}</td>
                    <td
                      className="px-3 py-2 text-right font-semibold"
                      style={{
                        color:
                          (accountSummary[a] || 0) > 0 ? "#4ade80" : "#6b7280",
                      }}
                    >
                      ₹{(accountSummary[a] || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
                <tr
                  style={{
                    background: "#1a1f2e",
                    borderTop: "2px solid #374151",
                  }}
                >
                  <td className="px-3 py-2 text-gray-400 font-semibold">
                    TOTAL
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-green-400">
                    ₹
                    {accounts
                      .reduce((s, a) => s + (accountSummary[a] || 0), 0)
                      .toLocaleString("en-IN")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── OtherChargesTable component ───
interface OtherChargeRow {
  id: string;
  type: string;
  paid: number;
  due: number;
}

function OtherChargesTable({
  rows,
  onChange,
}: {
  rows: OtherChargeRow[];
  typeLabel?: string;
  onTypeLabelChange?: (v: string) => void;
  onChange: (rows: OtherChargeRow[]) => void;
}) {
  const update = (
    i: number,
    field: keyof OtherChargeRow,
    val: string | number,
  ) => {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
  };

  const addRow = () => {
    onChange([
      ...rows,
      { id: `oc-${Date.now()}`, type: "Other Charge", paid: 0, due: 0 },
    ]);
  };

  return (
    <div>
      <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#1a1f2e" }}>
            <th className="text-left px-3 py-1.5 text-gray-400 font-medium">
              Type (Description)
            </th>
            <th className="text-left px-3 py-1.5 text-gray-400 font-medium">
              Paid Amount (₹)
            </th>
            <th className="text-left px-3 py-1.5 text-gray-400 font-medium">
              Due Amount (₹)
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr
              key={row.id}
              style={{
                background: rowIdx % 2 === 0 ? "#111827" : "#0f1117",
                borderBottom: "1px solid #374151",
              }}
              data-ocid={`othercharges.item.${rowIdx + 1}`}
            >
              <td className="px-3 py-1.5">
                <input
                  type="text"
                  value={row.type}
                  onChange={(e) => update(rowIdx, "type", e.target.value)}
                  placeholder="Type anything..."
                  className="bg-gray-900 border border-gray-600 rounded px-1.5 py-0.5 text-white text-xs outline-none focus:border-blue-400 w-full"
                  data-ocid="othercharges.input"
                />
              </td>
              <td className="px-3 py-1.5">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={row.paid === 0 ? "0" : String(row.paid)}
                  onFocus={(e) => {
                    if (e.target.value === "0") e.target.select();
                  }}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    const stripped = raw.replace(/^0+(\d)/, "$1") || "0";
                    update(rowIdx, "paid", Number(stripped));
                  }}
                  className="bg-gray-900 border border-gray-600 rounded px-1.5 py-0.5 text-white text-xs outline-none focus:border-blue-400 w-full"
                  data-ocid={`othercharges.paid.${rowIdx + 1}`}
                />
              </td>
              <td className="px-3 py-1.5">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={row.due === 0 ? "0" : String(row.due)}
                  onFocus={(e) => {
                    if (e.target.value === "0") e.target.select();
                  }}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    const stripped = raw.replace(/^0+(\d)/, "$1") || "0";
                    update(rowIdx, "due", Number(stripped));
                  }}
                  className="bg-gray-900 border border-gray-600 rounded px-1.5 py-0.5 text-white text-xs outline-none focus:border-blue-400 w-full"
                  data-ocid={`othercharges.due.${rowIdx + 1}`}
                />
              </td>
            </tr>
          ))}
          <tr style={{ background: "#1a1f2e", borderTop: "2px solid #374151" }}>
            <td className="px-3 py-1.5 text-gray-400 font-semibold">Total</td>
            <td className="px-3 py-1.5 text-green-400 font-semibold">
              ₹{rows.reduce((s, r) => s + r.paid, 0).toLocaleString("en-IN")}
            </td>
            <td className="px-3 py-1.5 text-red-400 font-semibold">
              ₹{rows.reduce((s, r) => s + r.due, 0).toLocaleString("en-IN")}
            </td>
          </tr>
        </tbody>
      </table>
      <button
        type="button"
        onClick={addRow}
        className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition"
        data-ocid="othercharges.add_button"
      >
        + Add Another Row
      </button>
    </div>
  );
}
