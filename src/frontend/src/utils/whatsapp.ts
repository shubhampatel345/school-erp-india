import type { WhatsAppSettings } from "../types";
import { generateId, ls } from "./localStorage";

const DEFAULT_SETTINGS: WhatsAppSettings = {
  appKey: "8d786da0-d381-4604-80e6-7b5f449ed801",
  authKey: "XFnyEeW9v8xBCLVHEbVLUxPjvuT7wFfzfu27X5qz2scMuAoXom",
  enabled: true,
};

export const WA_ENDPOINT = "https://wacoder.in/api/whatsapp-web/send-message";

export interface WhatsAppSendLog {
  id: string;
  to: string;
  message: string;
  status: "sent" | "failed";
  timestamp: number;
  error?: string;
}

export function getWhatsAppSettings(): WhatsAppSettings {
  return ls.get<WhatsAppSettings>("whatsapp_settings", DEFAULT_SETTINGS);
}

export function saveWhatsAppSettings(settings: WhatsAppSettings): void {
  ls.set("whatsapp_settings", settings);
}

export async function sendWhatsApp(
  to: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  const settings = getWhatsAppSettings();
  if (!settings.enabled)
    return { success: false, error: "WhatsApp not enabled in settings" };
  if (!to || !message)
    return { success: false, error: "Missing phone number or message" };

  const phone = to.replace(/\D/g, "");
  const e164 = phone.startsWith("91") ? phone : `91${phone}`;

  const formData = new FormData();
  formData.append("app_key", settings.appKey);
  formData.append("auth_key", settings.authKey);
  formData.append("to", e164);
  formData.append("type", "text");
  formData.append("message", message);

  try {
    const res = await fetch(WA_ENDPOINT, {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    const success =
      res.ok ||
      (data as { status?: string })?.status === "success" ||
      (data as { success?: boolean })?.success === true;
    logSend(
      e164,
      message,
      success ? "sent" : "failed",
      !success ? JSON.stringify(data) : undefined,
    );
    return success
      ? { success: true }
      : { success: false, error: JSON.stringify(data) };
  } catch (err) {
    const isCors =
      err instanceof TypeError &&
      (err.message.includes("CORS") || err.message.includes("Failed to fetch"));
    const msg = isCors
      ? "CORS error: WhatsApp API blocked by browser. Messages will work in production."
      : err instanceof Error
        ? err.message
        : "Network error";
    logSend(e164, message, "failed", msg);
    return { success: false, error: msg };
  }
}

function logSend(
  to: string,
  message: string,
  status: "sent" | "failed",
  error?: string,
) {
  const logs = ls.get<WhatsAppSendLog[]>("whatsapp_logs", []);
  logs.unshift({
    id: generateId(),
    to: `***${to.slice(-4)}`,
    message: message.slice(0, 100),
    status,
    timestamp: Date.now(),
    error,
  });
  ls.set("whatsapp_logs", logs.slice(0, 100));
}

export function getWhatsAppLogs(): WhatsAppSendLog[] {
  return ls.get<WhatsAppSendLog[]>("whatsapp_logs", []);
}

// ──────────────────────────────────────────────────────────
// Message Templates
// ──────────────────────────────────────────────────────────
export function buildFeeReceiptMessage(
  studentName: string,
  receiptNo: string,
  amount: number,
  months: string[],
  schoolName: string,
): string {
  return `Dear Parent,\n\nFee receipt #${receiptNo} has been generated for *${studentName}*.\n\n*Amount:* ₹${amount.toLocaleString("en-IN")}\n*Months:* ${months.join(", ")}\n\n${schoolName}\nThank you.`;
}

export function buildFeesDueMessage(
  studentName: string,
  months: string[],
  amount: number,
  schoolName: string,
): string {
  return `Dear Parent,\n\nFee reminder for *${studentName}*.\n\n*Due Months:* ${months.join(", ")}\n*Outstanding:* ₹${amount.toLocaleString("en-IN")}\n\nPlease pay by the 15th.\n\n${schoolName}`;
}

export function buildAbsentMessage(
  studentName: string,
  date: string,
  schoolName: string,
): string {
  return `Dear Parent,\n\n*${studentName}* was marked absent on *${date}*.\n\nPlease contact the school if needed.\n\n${schoolName}`;
}

export function buildBirthdayMessage(
  studentName: string,
  schoolName: string,
): string {
  return `🎂 Dear Parent,\n\nWishing *${studentName}* a very Happy Birthday! 🎉\n\nWarm regards,\n${schoolName}`;
}
