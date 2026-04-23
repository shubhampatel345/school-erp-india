import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  FileJson,
  HardDrive,
  HardDriveDownload,
  Info,
  Loader2,
  RefreshCcw,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { useApp } from "../../context/AppContext";
import { generateId } from "../../utils/localStorage";
import phpApiService from "../../utils/phpApiService";

const PREFIX = "shubh_erp_";

// ── Types ──────────────────────────────────────────────────

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

// ── Utilities ──────────────────────────────────────────────

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
    return raw ? (JSON.parse(raw) as BackupHistoryEntry[]) : [];
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

// ── Component ──────────────────────────────────────────────

export default function DataManagement() {
  const { currentUser, logout, syncStatus } = useApp();

  // ── Backup / Restore state ─────────────────────────────
  const [history, setHistory] =
    useState<BackupHistoryEntry[]>(getBackupHistory);
  const [restoreFile, setRestoreFile] = useState<BackupMeta | null>(null);
  const [restoreError, setRestoreError] = useState("");
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<RestoreMode | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Factory reset state ────────────────────────────────
  const [resetStep, setResetStep] = useState<0 | 1 | 2 | 3>(0);
  const [resetText, setResetText] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState("");

  // ── Sync state ─────────────────────────────────────────
  const [isSyncing, setIsSyncing] = useState(false);

  // ── Storage estimate ───────────────────────────────────
  const [storageInfo, setStorageInfo] = useState<{
    used: number;
    quota: number;
    supported: boolean;
  }>({ used: 0, quota: 0, supported: false });

  useEffect(() => {
    setHistory(getBackupHistory());
    if (navigator.storage?.estimate) {
      navigator.storage
        .estimate()
        .then((est) =>
          setStorageInfo({
            used: est.usage ?? 0,
            quota: est.quota ?? 0,
            supported: true,
          }),
        )
        .catch(() => {});
    }
  }, []);

  const erpStorageBytes = useMemo(() => {
    let total = 0;
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(PREFIX))
        total += (localStorage.getItem(k) ?? "").length * 2;
    }
    return total;
  }, []);

  const erpKeyCount = useMemo(
    () => Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).length,
    [],
  );

  const daysSince = daysSinceLastBackup(history);
  const showWarning = daysSince >= 7;

  const pendingCount = syncStatus.pendingCount;

  // ── Backup ─────────────────────────────────────────────

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
    toast.success("Backup created and downloaded.");
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
    toast.success("Backup re-downloaded.");
  }

  function handleDeleteHistory(id: string) {
    const updated = history.filter((h) => h.id !== id);
    saveBackupHistory(updated);
    setHistory(updated);
  }

  // ── Restore ────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setRestoreError("");
    setRestoreFile(null);
    setRestoreSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const parsed = JSON.parse(text) as Partial<BackupMeta>;
        if (!parsed.version || !parsed.appName || !parsed.data) {
          setRestoreError("Invalid backup file: missing required fields.");
          return;
        }
        if (parsed.appName !== "SHUBH SCHOOL ERP") {
          setRestoreError(
            `Wrong application: "${parsed.appName}" is not SHUBH SCHOOL ERP.`,
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
      const theme = localStorage.getItem(`${PREFIX}theme`);
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith(PREFIX)) localStorage.removeItem(k);
      }
      if (theme) localStorage.setItem(`${PREFIX}theme`, theme);
    }
    for (const [k, v] of Object.entries(restoreFile.data)) {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch {
        /* skip */
      }
    }
    setConfirmRestore(null);
    setRestoreSuccess(true);
    toast.success("Restore complete! Please refresh the page.");
  }

  // ── Factory reset ──────────────────────────────────────

  function verifyPasswordForReset(pw: string): boolean {
    if (!currentUser) return false;
    try {
      const passwords = JSON.parse(
        localStorage.getItem(`${PREFIX}user_passwords`) ?? "{}",
      ) as Record<string, string>;
      if (currentUser.role === "superadmin")
        return (passwords.superadmin ?? "admin123") === pw;
      return passwords[currentUser.username] === pw;
    } catch {
      return false;
    }
  }

  function handleFactoryReset() {
    if (!verifyPasswordForReset(resetPassword)) {
      setResetError("Incorrect password. Factory reset aborted.");
      return;
    }
    const theme = localStorage.getItem(`${PREFIX}theme`);
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(PREFIX)) localStorage.removeItem(k);
    }
    if (theme) localStorage.setItem(`${PREFIX}theme`, theme);
    toast.success("Factory reset complete.");
    logout();
  }

  // ── Sync Now ───────────────────────────────────────────

  async function handleSyncNow() {
    setIsSyncing(true);
    try {
      await phpApiService.checkHealth();
      toast.success("Connection to MySQL server verified.");
    } catch {
      toast.error("Server unreachable. Please check your connection.");
    } finally {
      setIsSyncing(false);
    }
  }

  // ─────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          Data Management
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Backup, restore, and manage your school ERP data stored on the
          Internet Computer.
        </p>
      </div>

      {/* ── Data Storage Info ── */}
      <Card className="p-5 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Cloud className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">
              MySQL / cPanel Storage
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              All data is stored in your MySQL database on cPanel. Data is saved
              locally first (IndexedDB) and synced to MySQL in the background.
              Upload the latest{" "}
              <code className="font-mono text-xs">api/index.php</code> to your
              cPanel <code className="font-mono text-xs">public_html/api/</code>{" "}
              folder, then visit{" "}
              <code className="font-mono text-xs">/api/?route=migrate/run</code>{" "}
              once to create all tables.
            </p>
            <div className="flex gap-4 mt-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <HardDrive className="w-3.5 h-3.5" />
                <span>
                  {erpKeyCount} local keys · {formatBytes(erpStorageBytes)}
                </span>
              </div>
              {storageInfo.supported && storageInfo.quota > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Database className="w-3.5 h-3.5" />
                  <span>
                    Browser quota: {formatBytes(storageInfo.used)} /{" "}
                    {formatBytes(storageInfo.quota)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Sync Status ── */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <RefreshCcw className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">MySQL Sync Status</h3>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
              pendingCount === 0
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
                : "bg-amber-500/10 border-amber-500/40 text-amber-700"
            }`}
            data-ocid="data-mgmt.sync.status"
          >
            {pendingCount === 0 ? (
              <>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>All data synced to MySQL</span>
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                <span>
                  {pendingCount} change{pendingCount !== 1 ? "s" : ""} pending
                  sync
                </span>
              </>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleSyncNow()}
            disabled={isSyncing}
            data-ocid="data-mgmt.sync.button"
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Syncing…
              </>
            ) : (
              <>
                <RefreshCcw className="w-3.5 h-3.5 mr-1.5" />
                Sync Now
              </>
            )}
          </Button>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-400">
            Data syncs automatically in the background. Use "Sync Now" to force
            an immediate refresh from the canister on all devices.
          </p>
        </div>
      </Card>

      <Tabs defaultValue="backup" className="w-full">
        <TabsList className="grid grid-cols-2 mb-6" data-ocid="data-mgmt.tab">
          <TabsTrigger value="backup" data-ocid="data-mgmt.tab.backup">
            <HardDriveDownload className="w-3.5 h-3.5 mr-1.5" /> Backup &amp;
            Restore
          </TabsTrigger>
          <TabsTrigger value="reset" data-ocid="data-mgmt.tab.reset">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Factory Reset
          </TabsTrigger>
        </TabsList>

        {/* ── BACKUP TAB ──────────────────────────────────────── */}
        <TabsContent value="backup" className="space-y-6">
          {showWarning && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/8 px-4 py-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {daysSince === 999
                    ? "No backups created yet"
                    : `Last backup was ${daysSince} days ago`}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  We recommend creating a backup at least once a week to protect
                  your school data.
                </p>
              </div>
            </div>
          )}

          {/* Export */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">Export All Data</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Downloads a complete JSON backup of all ERP data. Keep this file
              safe — it can restore your data if something goes wrong.
            </p>
            <Button
              onClick={handleCreateBackup}
              data-ocid="backup.export.button"
            >
              <Download className="w-4 h-4 mr-2" /> Create &amp; Download Backup
            </Button>
          </Card>

          {/* Restore */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">
                Restore from Backup
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload a previously exported backup file to restore your data.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="flex gap-3 items-start flex-wrap">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                data-ocid="backup.restore.upload_button"
              >
                <FileJson className="w-4 h-4 mr-2" /> Select Backup File
              </Button>

              {restoreFile && (
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                  <p className="font-semibold text-foreground">
                    {restoreFile.appName}
                  </p>
                  <p className="text-muted-foreground">
                    Backed up by {restoreFile.createdBy} on{" "}
                    {new Date(restoreFile.createdAt).toLocaleString("en-IN")}
                    {" · "}
                    {restoreFile.totalKeys} keys
                  </p>
                </div>
              )}
            </div>

            {restoreError && (
              <div
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2"
                data-ocid="backup.restore.error_state"
              >
                <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">{restoreError}</p>
              </div>
            )}

            {restoreSuccess && (
              <div
                className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2"
                data-ocid="backup.restore.success_state"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-sm text-emerald-700">
                  Restore complete! Refresh the page to see your restored data.
                </p>
              </div>
            )}

            {restoreFile && !restoreSuccess && (
              <div className="flex gap-2 flex-wrap">
                {confirmRestore ? (
                  <>
                    <span className="text-xs text-muted-foreground self-center">
                      This will{" "}
                      {confirmRestore === "replace"
                        ? "overwrite ALL existing data"
                        : "merge data"}
                      .
                    </span>
                    <Button
                      size="sm"
                      onClick={() => doRestore(confirmRestore)}
                      data-ocid="backup.restore.confirm_button"
                    >
                      Confirm Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmRestore(null)}
                      data-ocid="backup.restore.cancel_button"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      onClick={() => setConfirmRestore("merge")}
                      data-ocid="backup.restore.merge.button"
                    >
                      Merge (keep existing)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30"
                      onClick={() => setConfirmRestore("replace")}
                      data-ocid="backup.restore.replace.button"
                    >
                      Replace (overwrite all)
                    </Button>
                  </>
                )}
              </div>
            )}
          </Card>

          {/* Backup History */}
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Backup History</h3>
              <span className="text-xs text-muted-foreground">
                {history.length} backups
              </span>
            </div>
            {history.length === 0 ? (
              <div
                className="px-5 py-8 text-center text-sm text-muted-foreground"
                data-ocid="backup.history.empty_state"
              >
                No backups created yet. Create your first backup above.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {history.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 px-5 py-3"
                    data-ocid={`backup.history.item.${i + 1}`}
                  >
                    <FileJson className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {entry.filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString("en-IN")} ·{" "}
                        {entry.createdBy} · {entry.keyCount} keys ·{" "}
                        {formatBytes(entry.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRedownload(entry)}
                        data-ocid={`backup.history.download.${i + 1}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDeleteHistory(entry.id)}
                        data-ocid={`backup.history.delete.${i + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── FACTORY RESET TAB ─────────────────────────────── */}
        <TabsContent value="reset" className="space-y-6">
          <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-destructive">
                Danger Zone
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Factory reset permanently deletes all school data stored in this
                browser. Canister data on the Internet Computer is NOT affected.
                This action cannot be undone.
              </p>
            </div>
          </div>

          {resetStep === 0 && (
            <Card className="p-5 space-y-4">
              <h3 className="font-semibold text-foreground">Factory Reset</h3>
              <p className="text-xs text-muted-foreground">
                This will clear all ERP data from browser storage (students,
                fees, attendance, settings, etc.). You will be logged out after
                the reset.
              </p>
              <Button
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setResetStep(1)}
                data-ocid="reset.start.button"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Begin Factory Reset
              </Button>
            </Card>
          )}

          {resetStep === 1 && (
            <Card className="p-5 space-y-4 border-destructive/30">
              <h3 className="font-semibold text-destructive">
                Step 1: Confirm intent
              </h3>
              <p className="text-sm text-foreground">
                Type <strong>DELETE ALL DATA</strong> to confirm you want to
                proceed:
              </p>
              <Input
                placeholder="DELETE ALL DATA"
                value={resetText}
                onChange={(e) => setResetText(e.target.value)}
                data-ocid="reset.confirm_text.input"
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  disabled={resetText !== "DELETE ALL DATA"}
                  onClick={() => {
                    setResetStep(2);
                    setResetText("");
                  }}
                  data-ocid="reset.step1.confirm_button"
                >
                  Continue
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setResetStep(0)}
                  data-ocid="reset.step1.cancel_button"
                >
                  Cancel
                </Button>
              </div>
            </Card>
          )}

          {resetStep === 2 && (
            <Card className="p-5 space-y-4 border-destructive/30">
              <h3 className="font-semibold text-destructive">
                Step 2: Verify your password
              </h3>
              <Input
                type="password"
                placeholder="Your Super Admin password"
                value={resetPassword}
                onChange={(e) => {
                  setResetPassword(e.target.value);
                  setResetError("");
                }}
                data-ocid="reset.password.input"
              />
              {resetError && (
                <p
                  className="text-sm text-destructive"
                  data-ocid="reset.error_state"
                >
                  {resetError}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  disabled={!resetPassword}
                  onClick={() => setResetStep(3)}
                  data-ocid="reset.step2.confirm_button"
                >
                  Continue
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setResetStep(0);
                    setResetPassword("");
                    setResetError("");
                  }}
                  data-ocid="reset.step2.cancel_button"
                >
                  Cancel
                </Button>
              </div>
            </Card>
          )}

          {resetStep === 3 && (
            <Card className="p-5 space-y-4 border-destructive/30">
              <h3 className="font-semibold text-destructive">
                Step 3: Final confirmation
              </h3>
              <p className="text-sm text-foreground">
                <strong>This cannot be undone.</strong> All browser data will be
                permanently erased.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleFactoryReset}
                  data-ocid="reset.final.confirm_button"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Factory Reset Now
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setResetStep(0);
                    setResetPassword("");
                    setResetError("");
                  }}
                  data-ocid="reset.final.cancel_button"
                >
                  Cancel
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
