import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileJson,
  HardDriveDownload,
  RefreshCcw,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { useApp } from "../../context/AppContext";
import { generateId } from "../../utils/localStorage";

const PREFIX = "shubh_erp_";

interface BackupMeta {
  version: string;
  appName: string;
  createdAt: string;
  createdBy: string;
  totalKeys: number;
  data: Record<string, unknown>;
}

interface BackupHistoryEntry {
  id: string;
  filename: string;
  createdAt: string;
  createdBy: string;
  size: number;
  keyCount: number;
  data: Record<string, unknown>;
}

type RestoreMode = "merge" | "replace";
type ResetStep = 0 | 1 | 2 | 3;

const DATA_CATEGORY_LABELS: { key: string; label: string }[] = [
  { key: "students", label: "Students" },
  { key: "staff", label: "Staff & HR" },
  { key: "fee_receipts", label: "Fee Receipts" },
  { key: "fees_plan", label: "Fee Plans" },
  { key: "fee_headings", label: "Fee Headings" },
  { key: "attendance", label: "Attendance Records" },
  { key: "exam_timetables", label: "Exam Timetables" },
  { key: "teacher_timetables", label: "Teacher Timetables" },
  { key: "transport", label: "Transport Routes" },
  { key: "inventory_items", label: "Inventory" },
  { key: "expenses", label: "Expenses" },
  { key: "homework", label: "Homework" },
  { key: "alumni", label: "Alumni" },
  { key: "sessions", label: "Sessions" },
  { key: "class_sections", label: "Classes & Sections" },
  { key: "subjects", label: "Subjects" },
  { key: "school_profile", label: "School Profile & Settings" },
];

function getAllErpData(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith(PREFIX)) {
      try {
        data[k] = JSON.parse(localStorage.getItem(k) ?? "null");
      } catch {
        data[k] = localStorage.getItem(k);
      }
    }
  }
  return data;
}

function getBackupHistory(): BackupHistoryEntry[] {
  try {
    const raw = localStorage.getItem(`${PREFIX}backup_history`);
    if (!raw) return [];
    return JSON.parse(raw) as BackupHistoryEntry[];
  } catch {
    return [];
  }
}

function saveBackupHistory(history: BackupHistoryEntry[]) {
  localStorage.setItem(
    `${PREFIX}backup_history`,
    JSON.stringify(history.slice(0, 10)),
  );
}

function triggerDownload(json: string, filename: string) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function daysSinceLastBackup(history: BackupHistoryEntry[]): number {
  if (history.length === 0) return 999;
  const last = new Date(history[0].createdAt).getTime();
  return Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24));
}

export default function DataManagement() {
  const { currentUser, logout } = useApp();
  const [history, setHistory] =
    useState<BackupHistoryEntry[]>(getBackupHistory);
  const [restoreFile, setRestoreFile] = useState<BackupMeta | null>(null);
  const [_restoreRaw, setRestoreRaw] = useState<string>("");
  const [restoreError, setRestoreError] = useState("");
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<RestoreMode | null>(
    null,
  );
  const [resetStep, setResetStep] = useState<ResetStep>(0);
  const [resetText, setResetText] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const daysSince = daysSinceLastBackup(history);
  const showWarning = daysSince >= 7;

  // Sync history from localStorage on mount
  useEffect(() => {
    setHistory(getBackupHistory());
  }, []);

  // ── BACKUP ──────────────────────────────────────────────────────────────────

  function handleCreateBackup() {
    const data = getAllErpData();
    const now = new Date();
    const ts = now
      .toISOString()
      .replace(/[-:T]/g, (m) => (m === "T" ? "-" : m === ":" ? "" : m))
      .slice(0, 15);
    const filename = `shubh-erp-backup-${ts}.json`;
    const meta: BackupMeta = {
      version: "1.0",
      appName: "SHUBH SCHOOL ERP",
      createdAt: now.toISOString(),
      createdBy: currentUser?.name ?? "Unknown",
      totalKeys: Object.keys(data).length,
      data,
    };
    const json = JSON.stringify(meta, null, 2);
    triggerDownload(json, filename);

    const entry: BackupHistoryEntry = {
      id: generateId(),
      filename,
      createdAt: now.toISOString(),
      createdBy: currentUser?.name ?? "Unknown",
      size: new Blob([json]).size,
      keyCount: Object.keys(data).length,
      data,
    };
    const updated = [entry, ...history].slice(0, 10);
    saveBackupHistory(updated);
    setHistory(updated);
    toast.success("Backup created and downloaded");
  }

  function handleRedownload(entry: BackupHistoryEntry) {
    const meta: BackupMeta = {
      version: "1.0",
      appName: "SHUBH SCHOOL ERP",
      createdAt: entry.createdAt,
      createdBy: entry.createdBy,
      totalKeys: entry.keyCount,
      data: entry.data,
    };
    triggerDownload(JSON.stringify(meta, null, 2), entry.filename);
    toast.success("Backup re-downloaded");
  }

  function handleDeleteHistory(id: string) {
    const updated = history.filter((h) => h.id !== id);
    saveBackupHistory(updated);
    setHistory(updated);
  }

  // ── RESTORE ─────────────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setRestoreError("");
    setRestoreFile(null);
    setRestoreSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRestoreRaw(text);
      try {
        const parsed = JSON.parse(text) as Partial<BackupMeta>;
        if (!parsed.version || !parsed.appName || !parsed.data) {
          setRestoreError(
            "Invalid backup file: missing required fields (version, appName, data).",
          );
          return;
        }
        if (parsed.appName !== "SHUBH SCHOOL ERP") {
          setRestoreError(
            `Wrong application: this backup is for "${parsed.appName}", not SHUBH SCHOOL ERP.`,
          );
          return;
        }
        setRestoreFile(parsed as BackupMeta);
      } catch {
        setRestoreError(
          "Could not parse file. Make sure it is a valid JSON backup.",
        );
      }
    };
    reader.readAsText(file);
  }

  function doRestore(mode: RestoreMode) {
    if (!restoreFile) return;
    if (mode === "replace") {
      // Clear all ERP keys except theme
      const theme = localStorage.getItem(`${PREFIX}theme`);
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith(PREFIX)) localStorage.removeItem(k);
      }
      if (theme) localStorage.setItem(`${PREFIX}theme`, theme);
    }
    // Write data
    for (const [k, v] of Object.entries(restoreFile.data)) {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch {
        // ignore storage errors per key
      }
    }
    setConfirmRestore(null);
    setRestoreSuccess(true);
    toast.success("Restore complete! Please refresh the page.");
  }

  // ── FACTORY RESET ────────────────────────────────────────────────────────────

  function verifyPasswordForReset(pw: string): boolean {
    if (!currentUser) return false;
    if (currentUser.role === "superadmin") {
      const passwords = (() => {
        try {
          return JSON.parse(
            localStorage.getItem(`${PREFIX}user_passwords`) ?? "{}",
          ) as Record<string, string>;
        } catch {
          return {} as Record<string, string>;
        }
      })();
      return (passwords.superadmin ?? "admin123") === pw;
    }
    const passwords = (() => {
      try {
        return JSON.parse(
          localStorage.getItem(`${PREFIX}user_passwords`) ?? "{}",
        ) as Record<string, string>;
      } catch {
        return {} as Record<string, string>;
      }
    })();
    return passwords[currentUser.username] === pw;
  }

  function handleFactoryReset() {
    if (!verifyPasswordForReset(resetPassword)) {
      setResetError("Incorrect password. Factory reset aborted.");
      return;
    }
    // Keep theme preference only
    const theme = localStorage.getItem(`${PREFIX}theme`);
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(PREFIX)) localStorage.removeItem(k);
    }
    if (theme) localStorage.setItem(`${PREFIX}theme`, theme);
    toast.success("Factory reset complete.");
    logout();
  }

  return (
    <div className="p-4 lg:p-6 space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          Data Management
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Backup, restore, and manage all school ERP data stored on this device.
        </p>
      </div>

      {/* ── SECTION 1: BACKUP ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold text-foreground border-b pb-2">
          Backup
        </h3>

        {showWarning && (
          <div className="flex items-start gap-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                {daysSince >= 999
                  ? "No backup found."
                  : `No backup taken in ${daysSince} days.`}{" "}
                Create a backup to protect your data.
              </p>
            </div>
          </div>
        )}

        <Card className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-medium text-foreground">Create Backup</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Downloads all ERP data as a single JSON file to your device.
            </p>
          </div>
          <Button
            onClick={handleCreateBackup}
            data-ocid="backup-create-btn"
            className="shrink-0"
          >
            <HardDriveDownload className="w-4 h-4 mr-2" />
            Create Backup
          </Button>
        </Card>

        {/* Backup History */}
        <div>
          <p className="text-sm font-medium text-foreground mb-2">
            Backup History (last 10)
          </p>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg bg-muted/20">
              No backups yet. Create your first backup above.
            </p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                      Date / Time
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">
                      File Name
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground hidden md:table-cell">
                      Size
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden lg:table-cell">
                      Created By
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr
                      key={h.id}
                      className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
                    >
                      <td className="px-3 py-2 text-foreground">
                        {new Date(h.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground font-mono text-xs hidden sm:table-cell max-w-[200px] truncate">
                        {h.filename}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground hidden md:table-cell">
                        {formatBytes(h.size)}
                        <span className="ml-1 text-xs">
                          ({h.keyCount} keys)
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground hidden lg:table-cell">
                        {h.createdBy}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRedownload(h)}
                            data-ocid={`backup-redownload-${h.id}`}
                            title="Re-download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteHistory(h.id)}
                            data-ocid={`backup-delete-${h.id}`}
                            title="Delete from history"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── SECTION 2: RESTORE ────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold text-foreground border-b pb-2">
          Restore
        </h3>

        <Card className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-medium text-foreground">Select Backup File</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Upload a <code>.json</code> backup file to restore data.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              data-ocid="restore-file-btn"
            >
              <Upload className="w-4 h-4 mr-2" />
              Select Backup File (.json)
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Error */}
          {restoreError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
              <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{restoreError}</p>
            </div>
          )}

          {/* Success */}
          {restoreSuccess && (
            <div className="flex items-start gap-2 rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-400">
                Restore complete! Please{" "}
                <button
                  type="button"
                  className="underline font-medium"
                  onClick={() => window.location.reload()}
                >
                  refresh the page
                </button>{" "}
                to see restored data.
              </p>
            </div>
          )}

          {/* Backup Preview */}
          {restoreFile && !restoreSuccess && (
            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-primary" />
                <p className="font-medium text-foreground">Backup Preview</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">App:</span>{" "}
                  <span className="font-medium">{restoreFile.appName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Version:</span>{" "}
                  <Badge variant="secondary">{restoreFile.version}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>{" "}
                  <span>
                    {new Date(restoreFile.createdAt).toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">By:</span>{" "}
                  <span>{restoreFile.createdBy}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Keys:</span>{" "}
                  <span className="font-medium">{restoreFile.totalKeys}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Keys included (first 10):
                </p>
                <div className="flex flex-wrap gap-1">
                  {Object.keys(restoreFile.data)
                    .slice(0, 10)
                    .map((k) => (
                      <Badge
                        key={k}
                        variant="outline"
                        className="font-mono text-xs"
                      >
                        {k.replace(PREFIX, "")}
                      </Badge>
                    ))}
                  {Object.keys(restoreFile.data).length > 10 && (
                    <Badge variant="outline" className="text-xs">
                      +{Object.keys(restoreFile.data).length - 10} more
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => setConfirmRestore("merge")}
                  data-ocid="restore-merge-btn"
                >
                  Merge (keep existing)
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setConfirmRestore("replace")}
                  data-ocid="restore-replace-btn"
                >
                  Replace All (overwrite)
                </Button>
              </div>
            </div>
          )}

          {/* Confirmation Dialog */}
          {confirmRestore && (
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">
                    {confirmRestore === "replace"
                      ? "⚠️ Replace All — this will overwrite ALL current ERP data!"
                      : "Merge — adds new keys only, existing data is preserved."}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {confirmRestore === "replace"
                      ? "All students, fees, staff, attendance, and other records will be replaced with the backup data. This cannot be undone."
                      : "Only keys that do not exist in the current data will be added."}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirmRestore(null)}
                  data-ocid="restore-cancel-btn"
                >
                  Cancel
                </Button>
                <Button
                  variant={
                    confirmRestore === "replace" ? "destructive" : "default"
                  }
                  onClick={() => doRestore(confirmRestore)}
                  data-ocid="restore-confirm-btn"
                >
                  Confirm{" "}
                  {confirmRestore === "replace" ? "Replace All" : "Merge"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* ── SECTION 3: FACTORY RESET ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold text-foreground border-b pb-2">
          Factory Reset
        </h3>

        <Card className="p-5 border-destructive/30 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-destructive">Factory Reset</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Permanently deletes <strong>all</strong> ERP data on this
                device. Theme preferences are kept.
              </p>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-1">
                {DATA_CATEGORY_LABELS.map((cat) => (
                  <div
                    key={cat.key}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive/60 shrink-0" />
                    {cat.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {resetStep === 0 && (
            <Button
              variant="destructive"
              onClick={() => {
                setResetStep(1);
                setResetText("");
                setResetPassword("");
                setResetError("");
              }}
              data-ocid="factory-reset-start-btn"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Factory Reset
            </Button>
          )}

          {/* Step 1: Confirm */}
          {resetStep === 1 && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
              <p className="font-medium text-destructive">
                Step 1 of 3 — Are you sure?
              </p>
              <p className="text-sm text-muted-foreground">
                This will delete <strong>ALL</strong> data permanently. This
                cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setResetStep(0)}
                  data-ocid="factory-reset-cancel-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setResetStep(2)}
                  data-ocid="factory-reset-continue-1"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Type RESET */}
          {resetStep === 2 && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
              <p className="font-medium text-destructive">
                Step 2 of 3 — Type RESET to confirm
              </p>
              <Input
                placeholder="Type RESET here"
                value={resetText}
                onChange={(e) => setResetText(e.target.value)}
                className="font-mono max-w-xs"
                data-ocid="factory-reset-text-input"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setResetStep(0)}
                  data-ocid="factory-reset-cancel-2"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={resetText !== "RESET"}
                  onClick={() => setResetStep(3)}
                  data-ocid="factory-reset-continue-2"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Password */}
          {resetStep === 3 && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
              <p className="font-medium text-destructive">
                Step 3 of 3 — Enter your password to authorize
              </p>
              <Input
                type="password"
                placeholder="Your current password"
                value={resetPassword}
                onChange={(e) => {
                  setResetPassword(e.target.value);
                  setResetError("");
                }}
                className="max-w-xs"
                data-ocid="factory-reset-password-input"
              />
              {resetError && (
                <p className="text-sm text-destructive">{resetError}</p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setResetStep(0)}
                  data-ocid="factory-reset-cancel-3"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleFactoryReset}
                  data-ocid="factory-reset-confirm-btn"
                >
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Confirm Factory Reset
                </Button>
              </div>
            </div>
          )}
        </Card>

        <p className="text-xs text-muted-foreground">
          Note: Factory Reset removes all student, staff, fee, attendance, and
          other ERP data. Your theme preference is retained. The app will return
          to the login screen with only the default Super Admin account
          (superadmin / admin123).
        </p>
      </section>
    </div>
  );
}
