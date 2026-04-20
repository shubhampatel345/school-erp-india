/**
 * SHUBH SCHOOL ERP — Browser Push Notification Utilities
 *
 * sendLocalNotification: fire a browser notification (if permission granted)
 * savePushHistory / getPushHistory: persist notification history in localStorage
 */

const HISTORY_KEY = "shubh_push_history";
const MAX_HISTORY = 50;

// ── Types ───────────────────────────────────────────────────

export interface PushHistoryEntry {
  id: string;
  title: string;
  body: string;
  type: string;
  url: string;
  receivedAt: string;
  read: boolean;
}

// ── History helpers ─────────────────────────────────────────

export function getPushHistory(): PushHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PushHistoryEntry[];
  } catch {
    return [];
  }
}

export function savePushHistory(entry: PushHistoryEntry): void {
  try {
    const existing = getPushHistory();
    // prepend newest first, cap at MAX_HISTORY
    const updated = [entry, ...existing].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // localStorage quota — ignore
  }
}

export function markAllPushRead(): void {
  try {
    const updated = getPushHistory().map((e) => ({ ...e, read: true }));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function clearPushHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}

// ── Preferences ─────────────────────────────────────────────

const PREFS_KEY = "shubh_push_prefs";

export interface PushPreferences {
  attendancePresent: boolean;
  attendanceAbsent: boolean;
  feeDue: boolean;
  examResult: boolean;
  homeworkAssigned: boolean;
  homeworkOverdue: boolean;
  broadcastMessage: boolean;
}

const DEFAULT_PREFS: PushPreferences = {
  attendancePresent: true,
  attendanceAbsent: true,
  feeDue: true,
  examResult: true,
  homeworkAssigned: true,
  homeworkOverdue: true,
  broadcastMessage: true,
};

export function getPushPreferences(): PushPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return {
      ...DEFAULT_PREFS,
      ...(JSON.parse(raw) as Partial<PushPreferences>),
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePushPreferences(prefs: PushPreferences): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

// ── Core send function ──────────────────────────────────────

/**
 * Fire a browser notification if permission is granted.
 * Saves the notification to localStorage history regardless.
 * Silently no-ops if permission is denied or Notifications API unavailable.
 */
export function sendLocalNotification(
  title: string,
  body: string,
  type = "general",
  url = "/",
): void {
  const entry: PushHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,
    body,
    type,
    url,
    receivedAt: new Date().toISOString(),
    read: false,
  };

  // Always save to history
  savePushHistory(entry);

  // Show browser notification only if granted
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    // Prefer service worker showNotification for mobile compatibility
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          reg
            .showNotification(title, {
              body,
              icon: "/icon-192.png",
              badge: "/icon-192.png",
              tag: type,
              data: { url },
            })
            .catch(() => {
              // Fallback to basic Notification
              new Notification(title, { body, icon: "/icon-192.png" });
            });
        })
        .catch(() => {
          new Notification(title, { body, icon: "/icon-192.png" });
        });
    } else {
      new Notification(title, { body, icon: "/icon-192.png" });
    }
  } catch {
    // Notifications unavailable (private browsing, etc.) — ignore
  }
}
