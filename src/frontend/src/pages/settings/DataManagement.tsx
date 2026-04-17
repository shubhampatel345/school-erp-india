import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileJson,
  Globe,
  HardDrive,
  HardDriveDownload,
  Info,
  KeyRound,
  Loader2,
  Lock,
  RefreshCcw,
  RotateCcw,
  Server,
  ShieldCheck,
  Trash2,
  Upload,
  WifiOff,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { useApp } from "../../context/AppContext";
import {
  type ConnectionTestResult,
  backendLogin,
  clearTokens,
  getApiUrl,
  getDefaultApiUrl,
  getJwt,
  getJwtRole,
  isJwtExpired,
  migrateLocalData,
  setApiUrl,
  testConnection,
} from "../../utils/api";
import { generateId } from "../../utils/localStorage";

const PREFIX = "shubh_erp_";

// ── Types ─────────────────────────────────────────────────

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

// ── Category labels ───────────────────────────────────────
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

// ── Utilities ─────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────

export default function DataManagement() {
  const { currentUser, logout } = useApp();

  // ── Backup / Restore state ────────────────────────────
  const [history, setHistory] =
    useState<BackupHistoryEntry[]>(getBackupHistory);
  const [restoreFile, setRestoreFile] = useState<BackupMeta | null>(null);
  const [_restoreRaw, setRestoreRaw] = useState<string>("");
  const [restoreError, setRestoreError] = useState("");
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<RestoreMode | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Factory reset state ───────────────────────────────
  const [resetStep, setResetStep] = useState<ResetStep>(0);
  const [resetText, setResetText] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState("");

  // ── Storage estimate ──────────────────────────────────
  const [storageInfo, setStorageInfo] = useState<{
    used: number;
    quota: number;
    supported: boolean;
  }>({ used: 0, quota: 0, supported: false });

  // ── Database Server tab state ─────────────────────────
  const [apiUrlInput, setApiUrlInput] = useState(
    () => getApiUrl() || getDefaultApiUrl(),
  );
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(
    null,
  );
  const [isTesting, setIsTesting] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [savedApiUrl, setSavedApiUrl] = useState(
    () => getApiUrl() || getDefaultApiUrl(),
  );

  // ── Auth panel state ──────────────────────────────────
  // Pre-fill with stored server password (or default admin123)
  const [authPassword, setAuthPassword] = useState(() => {
    try {
      return localStorage.getItem("shubh_server_password") ?? "admin123";
    } catch {
      return "admin123";
    }
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isRunningSetup, setIsRunningSetup] = useState(false);
  const [authStatus, setAuthStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [authError, setAuthError] = useState("");

  // Derive current auth state from JWT
  const jwtRole = getJwtRole();
  const jwtPresent = !!getJwt() && !isJwtExpired();
  const isServerAuthenticated =
    jwtPresent && (jwtRole === "superadmin" || jwtRole === "super_admin");

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

  // ── Backup ────────────────────────────────────────────

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

  // ── Restore ───────────────────────────────────────────

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

  // ── Factory reset ─────────────────────────────────────

  function verifyPasswordForReset(pw: string): boolean {
    if (!currentUser) return false;
    const passwords = (() => {
      try {
        return JSON.parse(
          localStorage.getItem(`${PREFIX}user_passwords`) ?? "{}",
        ) as Record<string, string>;
      } catch {
        return {};
      }
    })();
    if (currentUser.role === "superadmin")
      return (passwords.superadmin ?? "admin123") === pw;
    return passwords[currentUser.username] === pw;
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

  // ── Database Server handlers ──────────────────────────

  const urlLooksInvalid =
    apiUrlInput.length > 0 && !/^https?:\/\/.+/.test(apiUrlInput);

  // True when the URL contains "psmkgs.com" but is MISSING the "shubh." subdomain
  const urlMissingSubdomain =
    apiUrlInput.includes("psmkgs.com") &&
    !apiUrlInput.includes("shubh.psmkgs.com");

  async function handleTestConnection() {
    setIsTesting(true);
    setTestResult(null);
    const result = await testConnection(apiUrlInput);
    setTestResult(result);
    setIsTesting(false);
    if (result.connected) {
      toast.success(`Connected! Latency: ${result.latencyMs}ms`);
    } else {
      toast.error(`Connection failed: ${result.error}`);
    }
  }

  function handleSaveApiUrl() {
    setApiUrl(apiUrlInput);
    setSavedApiUrl(apiUrlInput);
    if (apiUrlInput) {
      toast.success("API server URL saved. App will now sync with server.");
    } else {
      toast.info("API server URL cleared. Running in local-only mode.");
    }
  }

  async function handleAuthenticate() {
    if (!authPassword) {
      setAuthError("Please enter your server Super Admin password.");
      return;
    }
    // Validate URL before attempting auth — catch the most common misconfiguration
    const currentUrl = getApiUrl();
    if (
      currentUrl.includes("psmkgs.com") &&
      !currentUrl.includes("shubh.psmkgs.com")
    ) {
      setAuthStatus("error");
      setAuthError(
        "The API URL appears to be incorrect. It should be https://shubh.psmkgs.com/api — click Reset to fix it.",
      );
      return;
    }
    if (
      !currentUrl.startsWith("https://") &&
      !currentUrl.startsWith("http://")
    ) {
      setAuthStatus("error");
      setAuthError(
        "The API URL is invalid. It must start with https://. Check the URL field above.",
      );
      return;
    }
    setIsAuthenticating(true);
    setAuthStatus("idle");
    setAuthError("");
    const result = await backendLogin("superadmin", authPassword);
    setIsAuthenticating(false);
    if (result.success) {
      setAuthStatus("success");
      toast.success("Authenticated as Super Admin on server.");
      // Dispatch storage event so useSync in other components can react
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "shubh_erp_jwt_token",
          newValue: localStorage.getItem("shubh_erp_jwt_token"),
        }),
      );
    } else {
      setAuthStatus("error");
      // Show the exact server error message (e.g. "User not found")
      const errMsg = result.error ?? "Authentication failed. Check password.";
      setAuthError(errMsg);
      toast.error(errMsg);
    }
  }

  /** Run database setup then seed, then auto-authenticate */
  async function handleRunSetup() {
    const currentUrl = getApiUrl();
    if (!currentUrl) {
      setAuthError("Save the API URL first.");
      return;
    }
    setIsRunningSetup(true);
    setAuthStatus("idle");
    setAuthError("");
    try {
      // Step 1: Run migrations
      const runRes = await fetch(`${currentUrl}/migrate/run`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
      });
      const runCt = runRes.headers.get("content-type") ?? "";
      if (runCt.includes("text/html")) {
        setAuthStatus("error");
        setAuthError(
          "Server returned HTML. Make sure the api/ folder is uploaded to cPanel public_html/ and .htaccess is in place.",
        );
        setIsRunningSetup(false);
        return;
      }
      // Step 2: Seed
      await fetch(`${currentUrl}/migrate/seed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(10_000),
      });
      // Step 3: Authenticate
      const loginResult = await backendLogin(
        "superadmin",
        authPassword || "admin123",
      );
      if (loginResult.success) {
        setAuthStatus("success");
        toast.success("Database setup complete! Authenticated as Super Admin.");
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "shubh_erp_jwt_token",
            newValue: localStorage.getItem("shubh_erp_jwt_token"),
          }),
        );
      } else {
        setAuthStatus("error");
        setAuthError(
          `Setup ran, but login failed: ${loginResult.error ?? "Check password"}`,
        );
        toast.error("Setup complete but auth failed — try Authenticate Now");
      }
    } catch (err) {
      setAuthStatus("error");
      const msg = err instanceof Error ? err.message : "Setup failed";
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setIsRunningSetup(false);
    }
  }

  function handleSignOut() {
    clearTokens();
    setAuthStatus("idle");
    setAuthError("");
    toast.info("Signed out from server. Sync will require re-authentication.");
  }

  async function handleMigrateData() {
    if (!savedApiUrl) {
      toast.error("Save the API URL first.");
      return;
    }
    setIsMigrating(true);
    try {
      const data = getAllErpData();
      const result = await migrateLocalData(data);
      if (result.success) {
        toast.success(
          `Migration complete: ${result.records_imported ?? 0} records sent to server.`,
        );
      } else {
        toast.error(`Migration failed: ${result.message}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Migration failed");
    } finally {
      setIsMigrating(false);
    }
  }

  // ─────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          Data Management
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure database server, backup, restore, and manage all school ERP
          data.
        </p>
      </div>

      <Tabs defaultValue="server" className="w-full">
        <TabsList className="grid grid-cols-3 mb-6" data-ocid="data-mgmt.tab">
          <TabsTrigger value="server" data-ocid="data-mgmt.tab.server">
            <Server className="w-3.5 h-3.5 mr-1.5" />
            Database Server
          </TabsTrigger>
          <TabsTrigger value="backup" data-ocid="data-mgmt.tab.backup">
            <HardDriveDownload className="w-3.5 h-3.5 mr-1.5" />
            Backup &amp; Restore
          </TabsTrigger>
          <TabsTrigger value="reset" data-ocid="data-mgmt.tab.reset">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Factory Reset
          </TabsTrigger>
        </TabsList>

        {/* ── DATABASE SERVER TAB ──────────────────────────────── */}
        <TabsContent value="server" className="space-y-6">
          {/* Info banner */}
          <div className="flex items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                Connect to cPanel MySQL Database
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-0.5">
                Enter your PHP API server URL below to enable real-time sync
                across all devices. Leave blank to run in local-only mode (data
                stays on this browser only).
              </p>
            </div>
          </div>

          {/* API URL configuration */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">API Server URL</h3>
              {savedApiUrl ? (
                <Badge className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                  Configured
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">
                  Not Set
                </Badge>
              )}
            </div>

            {/* Step-by-step setup guide */}
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">
                📋 Setup Steps
              </p>
              {[
                {
                  n: 1,
                  text: "Enter API URL below (default is pre-filled for your domain)",
                },
                {
                  n: 2,
                  text: "Upload the api/ folder from your build to cPanel public_html/",
                },
                {
                  n: 3,
                  text: "Open https://shubh.psmkgs.com/api/migrate/run in browser to create DB tables",
                },
                { n: 4, text: "Click Test Connection — should show green" },
                { n: 5, text: "Authenticate with Super Admin password below" },
              ].map(({ n, text }) => (
                <div
                  key={n}
                  className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-400"
                >
                  <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    {n}
                  </span>
                  <span>{text}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-url-input" className="text-sm">
                Server URL (e.g.{" "}
                <code className="bg-muted px-1 rounded text-xs">
                  https://shubh.psmkgs.com/api
                </code>
                )
              </Label>
              <div className="flex gap-2">
                <Input
                  id="api-url-input"
                  data-ocid="server.api_url.input"
                  placeholder="https://shubh.psmkgs.com/api"
                  value={apiUrlInput}
                  onChange={(e) => setApiUrlInput(e.target.value)}
                  className="font-mono text-sm flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  title="Reset to default URL"
                  onClick={() => {
                    const def = getDefaultApiUrl();
                    setApiUrlInput(def);
                    setApiUrl(def);
                    setSavedApiUrl(def);
                    toast.success(`URL reset to default: ${def}`);
                  }}
                  data-ocid="server.reset_url.button"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSaveApiUrl}
                  data-ocid="server.save_url.button"
                >
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Default:{" "}
                <code className="font-mono">https://shubh.psmkgs.com/api</code>
                {" — "}Leave blank to use local-only mode.
              </p>
              {urlLooksInvalid && (
                <div className="flex items-start gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-yellow-800 dark:text-yellow-300">
                    URL looks invalid — it must start with{" "}
                    <code className="font-mono">http://</code> or{" "}
                    <code className="font-mono">https://</code>.
                  </p>
                </div>
              )}
              {urlMissingSubdomain && !urlLooksInvalid && (
                <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-800 dark:text-red-300">
                    The API URL appears to be incorrect. It should be{" "}
                    <code className="font-mono">
                      https://shubh.psmkgs.com/api
                    </code>{" "}
                    — click the <strong>Reset</strong> button to fix it.
                  </p>
                </div>
              )}
            </div>

            {/* Test Connection */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting || !apiUrlInput}
                data-ocid="server.test_connection.button"
                className="shrink-0"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing…
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>

              {testResult && (
                <div
                  className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 border ${
                    testResult.connected
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
                      : "bg-destructive/10 border-destructive/30 text-destructive"
                  }`}
                  data-ocid={
                    testResult.connected
                      ? "server.connection.success_state"
                      : "server.connection.error_state"
                  }
                >
                  {testResult.connected ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <WifiOff className="w-4 h-4 shrink-0" />
                  )}
                  <span>
                    {testResult.connected
                      ? `Connected · ${testResult.latencyMs}ms${testResult.db_version ? ` · MySQL ${testResult.db_version}` : ""}`
                      : testResult.error?.includes("HTML") ||
                          testResult.error?.includes("api/ folder") ||
                          testResult.error?.includes("htaccess") ||
                          testResult.error?.includes(".htaccess")
                        ? "Server returned an HTML page. This means either: (1) The api/ folder is not uploaded to cPanel, or (2) The api/.htaccess file is missing. Download your build and upload the public_html/api/ folder to cPanel, then try again."
                        : testResult.error?.includes("Failed to fetch") ||
                            testResult.error?.includes("Network")
                          ? "Cannot reach server. Check the URL and ensure cPanel is reachable."
                          : testResult.error}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* ── Server Authentication Card ── */}
          {savedApiUrl && (
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">
                  Server Authentication
                </h3>
                {isServerAuthenticated ? (
                  <Badge className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                    Authenticated
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-yellow-500/50 text-yellow-700 bg-yellow-500/10"
                  >
                    Not Authenticated
                  </Badge>
                )}
              </div>

              {isServerAuthenticated ? (
                /* Authenticated state */
                <div className="space-y-3">
                  <div
                    className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/8 px-4 py-3"
                    data-ocid="server.auth.success_state"
                  >
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">
                        Authenticated as Super Admin ✓
                      </p>
                      <p className="text-xs text-emerald-600 mt-0.5">
                        All sync and configuration operations are authorised.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    data-ocid="server.auth.signout.button"
                    className="text-muted-foreground"
                  >
                    Sign out from server
                  </Button>
                </div>
              ) : (
                /* Not-authenticated state */
                <div className="space-y-3">
                  <div
                    className="flex items-start gap-3 rounded-lg border border-yellow-500/40 bg-yellow-500/8 px-4 py-3"
                    data-ocid="server.auth.warning_state"
                  >
                    <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                        Not authenticated with server
                      </p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                        Enter your server Super Admin password to fix the{" "}
                        <code className="bg-yellow-100 dark:bg-yellow-900/50 px-1 rounded">
                          Super Admin only
                        </code>{" "}
                        sync error. Default password:{" "}
                        <code className="bg-yellow-100 dark:bg-yellow-900/50 px-1 rounded">
                          admin123
                        </code>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="auth-password" className="text-xs">
                        Server Super Admin Password
                      </Label>
                      <Input
                        id="auth-password"
                        type="password"
                        placeholder="Enter server password (default: admin123)"
                        value={authPassword}
                        onChange={(e) => {
                          setAuthPassword(e.target.value);
                          setAuthError("");
                          setAuthStatus("idle");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleAuthenticate();
                        }}
                        data-ocid="server.auth.password.input"
                        className="max-w-xs"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Default password is{" "}
                        <code className="font-mono bg-muted px-1 rounded">
                          admin123
                        </code>
                        . Reset anytime at{" "}
                        <code className="font-mono text-[10px]">
                          /api/migrate/reset-superadmin
                        </code>
                      </p>
                    </div>
                    <div className="flex items-end gap-2 flex-wrap">
                      <Button
                        onClick={() => void handleAuthenticate()}
                        disabled={
                          isAuthenticating || isRunningSetup || !authPassword
                        }
                        data-ocid="server.auth.authenticate.button"
                      >
                        {isAuthenticating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Authenticating…
                          </>
                        ) : (
                          <>
                            <KeyRound className="w-4 h-4 mr-2" />
                            Authenticate Now
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => void handleRunSetup()}
                        disabled={isRunningSetup || isAuthenticating}
                        title="First time setup: runs migrations, seeds superadmin, then authenticates"
                        data-ocid="server.auth.run_setup.button"
                      >
                        {isRunningSetup ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Setting up…
                          </>
                        ) : (
                          <>
                            <Database className="w-4 h-4 mr-2" />
                            Run Setup (first time)
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {authStatus === "error" && authError && (
                    <div
                      className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2"
                      data-ocid="server.auth.error_state"
                    >
                      <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-destructive">{authError}</p>
                        {(authError.includes("HTML") ||
                          authError.includes("error page")) && (
                          <p className="text-xs text-destructive/80 mt-1">
                            The PHP API backend is not installed at this URL.
                            Upload the <code className="font-mono">api/</code>{" "}
                            folder to{" "}
                            <code className="font-mono">public_html/</code> on
                            cPanel, then visit{" "}
                            <code className="font-mono">/api/migrate/run</code>{" "}
                            to set up the database.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {authStatus === "success" && (
                    <div
                      className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2"
                      data-ocid="server.auth.success_state"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-emerald-700">
                        Authenticated as Super Admin. Sync is now active.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Current storage mode summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card
              className={`p-4 ${savedApiUrl ? "" : "border-primary/30 bg-primary/5"}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${savedApiUrl ? "bg-muted" : "bg-primary/10"}`}
                >
                  <HardDrive
                    className={`w-4 h-4 ${savedApiUrl ? "text-muted-foreground" : "text-primary"}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Local Mode
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Browser localStorage
                    <br />
                    <span className="font-mono text-[10px]">
                      shubh_erp_* keys
                    </span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0.5"
                    >
                      {erpKeyCount} keys
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0.5"
                    >
                      {formatBytes(erpStorageBytes)}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>

            <Card
              className={`p-4 ${savedApiUrl ? "border-emerald-500/30 bg-emerald-500/5" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${savedApiUrl ? "bg-emerald-500/10" : "bg-muted"}`}
                >
                  <Database
                    className={`w-4 h-4 ${savedApiUrl ? "text-emerald-600" : "text-muted-foreground"}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    MySQL Server
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {savedApiUrl ? (
                      <>
                        <span className="font-mono text-[10px] break-all">
                          {savedApiUrl}
                        </span>
                      </>
                    ) : (
                      "Not configured"
                    )}
                  </p>
                  {savedApiUrl && (
                    <Badge className="mt-2 text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                      Active
                    </Badge>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <HardDriveDownload className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Backup Files
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Downloaded to your <strong>Downloads</strong> folder. Also
                    use the Backup tab above.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Storage bar */}
          {storageInfo.supported && storageInfo.quota > 0 && (
            <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Browser Storage Used
                </span>
                <span className="font-medium text-foreground">
                  {formatBytes(storageInfo.used)} /{" "}
                  {formatBytes(storageInfo.quota)}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{
                    width: `${Math.min((storageInfo.used / storageInfo.quota) * 100, 100).toFixed(1)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Migrate to server */}
          {savedApiUrl && (
            <Card className="p-5 space-y-3 border-primary/20">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Upload className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">
                    Migrate Local Data to Server
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    One-time operation to upload all current localStorage data
                    to your MySQL server. Run this once after connecting to the
                    server.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleMigrateData}
                disabled={isMigrating}
                data-ocid="server.migrate.button"
                className="w-full sm:w-auto"
              >
                {isMigrating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Migrating…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Migrate Data to Server
                  </>
                )}
              </Button>
            </Card>
          )}
        </TabsContent>

        {/* ── BACKUP & RESTORE TAB ────────────────────────────── */}
        <TabsContent value="backup" className="space-y-6">
          {/* Backup warning */}
          {showWarning && (
            <div className="flex items-start gap-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                {daysSince >= 999
                  ? "No backup found."
                  : `No backup in ${daysSince} days.`}{" "}
                Create a backup to protect your data.
              </p>
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
              data-ocid="backup.create.button"
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
              <p
                className="text-sm text-muted-foreground py-4 text-center border rounded-lg bg-muted/20"
                data-ocid="backup.history.empty_state"
              >
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
                        className={
                          i % 2 === 0 ? "bg-background" : "bg-muted/20"
                        }
                        data-ocid={`backup.history.item.${i + 1}`}
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
                              data-ocid={`backup.redownload.${i + 1}`}
                              title="Re-download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteHistory(h.id)}
                              data-ocid={`backup.delete.${i + 1}`}
                              title="Delete"
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

          {/* Restore */}
          <div>
            <h3 className="text-base font-semibold text-foreground border-b pb-2 mb-4">
              Restore from Backup
            </h3>
            <Card className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    Select Backup File
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Upload a <code>.json</code> backup file to restore data.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  data-ocid="restore.file.button"
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

              {restoreError && (
                <div
                  className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2"
                  data-ocid="restore.error_state"
                >
                  <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm text-destructive">{restoreError}</p>
                </div>
              )}

              {restoreSuccess && (
                <div
                  className="flex items-start gap-2 rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2"
                  data-ocid="restore.success_state"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Restore complete!{" "}
                    <button
                      type="button"
                      className="underline font-medium"
                      onClick={() => window.location.reload()}
                    >
                      Refresh the page
                    </button>{" "}
                    to see restored data.
                  </p>
                </div>
              )}

              {restoreFile && !restoreSuccess && (
                <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileJson className="w-5 h-5 text-primary" />
                    <p className="font-medium text-foreground">
                      Backup Preview
                    </p>
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
                        {new Date(restoreFile.createdAt).toLocaleString(
                          "en-IN",
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">By:</span>{" "}
                      <span>{restoreFile.createdBy}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Keys:</span>{" "}
                      <span className="font-medium">
                        {restoreFile.totalKeys}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <Button
                      variant="outline"
                      onClick={() => setConfirmRestore("merge")}
                      data-ocid="restore.merge.button"
                    >
                      Merge (keep existing)
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setConfirmRestore("replace")}
                      data-ocid="restore.replace.button"
                    >
                      Replace All (overwrite)
                    </Button>
                  </div>
                </div>
              )}

              {confirmRestore && (
                <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <p className="font-medium text-foreground">
                      {confirmRestore === "replace"
                        ? "⚠️ Replace All — this will overwrite ALL current ERP data!"
                        : "Merge — adds new keys only, existing data is preserved."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setConfirmRestore(null)}
                      data-ocid="restore.cancel.button"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant={
                        confirmRestore === "replace" ? "destructive" : "default"
                      }
                      onClick={() => doRestore(confirmRestore)}
                      data-ocid="restore.confirm.button"
                    >
                      Confirm{" "}
                      {confirmRestore === "replace" ? "Replace All" : "Merge"}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* ── FACTORY RESET TAB ────────────────────────────────── */}
        <TabsContent value="reset" className="space-y-4">
          <Card className="p-5 border-destructive/30 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-destructive">Factory Reset</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Permanently deletes <strong>all</strong> ERP data on this
                  device.
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
                data-ocid="reset.start.button"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Factory Reset
              </Button>
            )}

            {resetStep === 1 && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
                <p className="font-medium text-destructive">
                  Step 1 of 3 — Are you sure?
                </p>
                <p className="text-sm text-muted-foreground">
                  This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setResetStep(0)}
                    data-ocid="reset.cancel.button"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setResetStep(2)}
                    data-ocid="reset.continue.1.button"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

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
                  data-ocid="reset.text.input"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setResetStep(0)}
                    data-ocid="reset.cancel.2.button"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={resetText !== "RESET"}
                    onClick={() => setResetStep(3)}
                    data-ocid="reset.continue.2.button"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {resetStep === 3 && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
                <p className="font-medium text-destructive">
                  Step 3 of 3 — Enter your password
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
                  data-ocid="reset.password.input"
                />
                {resetError && (
                  <p className="text-sm text-destructive">{resetError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setResetStep(0)}
                    data-ocid="reset.cancel.3.button"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleFactoryReset}
                    data-ocid="reset.confirm.button"
                  >
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Confirm Factory Reset
                  </Button>
                </div>
              </div>
            )}
          </Card>
          <p className="text-xs text-muted-foreground">
            Factory Reset removes all student, staff, fee, attendance, and other
            ERP data. Theme preference is retained. App returns to login with
            default Super Admin (superadmin / admin123).
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
