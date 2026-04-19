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
  batchPushCollection,
  clearTokens,
  getApiIndexUrl,
  getBaseUrl,
  getDefaultApiUrl,
  getJwt,
  getJwtRole,
  getStoredServerPassword,
  getStoredServerUsername,
  isJwtExpired,
  setApiUrl,
  storeServerCredentials,
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

// ── Category labels for push display ─────────────────────
const PUSH_COLLECTIONS: { lsKey: string; collection: string; label: string }[] =
  [
    { lsKey: "shubh_erp_students", collection: "students", label: "Students" },
    { lsKey: "shubh_erp_staff", collection: "staff", label: "Staff & HR" },
    {
      lsKey: "shubh_erp_fees_plan",
      collection: "fees_plan",
      label: "Fee Plans",
    },
    {
      lsKey: "shubh_erp_fee_headings",
      collection: "fee_headings",
      label: "Fee Headings",
    },
    { lsKey: "shubh_erp_sessions", collection: "sessions", label: "Sessions" },
    { lsKey: "shubh_erp_routes", collection: "routes", label: "Routes" },
    {
      lsKey: "shubh_erp_route_stops",
      collection: "route_stops",
      label: "Route Stops",
    },
    {
      lsKey: "shubh_erp_fee_receipts",
      collection: "fee_receipts",
      label: "Fee Receipts",
    },
    {
      lsKey: "shubh_erp_attendance",
      collection: "attendance_records",
      label: "Attendance",
    },
    {
      lsKey: "shubh_erp_inventory_items",
      collection: "inventory_items",
      label: "Inventory",
    },
    { lsKey: "shubh_erp_homework", collection: "homework", label: "Homework" },
    { lsKey: "shubh_erp_expenses", collection: "expenses", label: "Expenses" },
    { lsKey: "shubh_erp_income", collection: "income", label: "Income" },
    {
      lsKey: "shubh_erp_payroll",
      collection: "staff_payroll",
      label: "Payroll",
    },
    { lsKey: "shubh_erp_subjects", collection: "subjects", label: "Subjects" },
    { lsKey: "shubh_erp_classes", collection: "classes", label: "Classes" },
    { lsKey: "shubh_erp_sections", collection: "sections", label: "Sections" },
    {
      lsKey: "shubh_erp_notifications",
      collection: "notifications",
      label: "Notifications",
    },
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
  const [restoreError, setRestoreError] = useState("");
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<RestoreMode | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Factory reset state ───────────────────────────────
  const [resetStep, setResetStep] = useState<0 | 1 | 2 | 3>(0);
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
    () => getBaseUrl() || getDefaultApiUrl(),
  );
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(
    null,
  );
  const [isTesting, setIsTesting] = useState(false);
  const [savedApiUrl, setSavedApiUrl] = useState(
    () => getBaseUrl() || getDefaultApiUrl(),
  );

  // ── Auth panel state ──────────────────────────────────
  const [authPassword, setAuthPassword] = useState(() =>
    getStoredServerPassword(),
  );
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isRunningSetup, setIsRunningSetup] = useState(false);
  const [authStatus, setAuthStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [authError, setAuthError] = useState("");

  // ── Reset DB state ────────────────────────────────────
  const [isResettingDb, setIsResettingDb] = useState(false);
  const [showDbResetConfirm, setShowDbResetConfirm] = useState(false);

  // ── Push state ────────────────────────────────────────
  const [isPushing, setIsPushing] = useState(false);
  const [pushProgress, setPushProgress] = useState<string[]>([]);
  const [pushAuthFailed, setPushAuthFailed] = useState(false);

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

  // ── Database Server handlers ──────────────────────────

  const urlLooksInvalid =
    apiUrlInput.length > 0 && !/^https?:\/\/.+/.test(apiUrlInput);
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
      toast.success("API server URL saved.");
    } else {
      toast.info("API server URL cleared. Running in local-only mode.");
    }
  }

  async function handleAuthenticate() {
    if (!authPassword) {
      setAuthError("Please enter your server Super Admin password.");
      return;
    }
    const currentUrl = getBaseUrl();
    if (
      currentUrl.includes("psmkgs.com") &&
      !currentUrl.includes("shubh.psmkgs.com")
    ) {
      setAuthStatus("error");
      setAuthError(
        "The API URL appears incorrect. It should be https://shubh.psmkgs.com — click Reset to fix it.",
      );
      return;
    }
    if (
      !currentUrl.startsWith("https://") &&
      !currentUrl.startsWith("http://")
    ) {
      setAuthStatus("error");
      setAuthError("The API URL is invalid. It must start with https://.");
      return;
    }
    setIsAuthenticating(true);
    setAuthStatus("idle");
    setAuthError("");
    const result = await backendLogin("superadmin", authPassword);
    setIsAuthenticating(false);
    if (result.success) {
      storeServerCredentials("superadmin", authPassword);
      setAuthStatus("success");
      toast.success("Authenticated as Super Admin on server.");
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "shubh_erp_jwt_token",
          newValue: localStorage.getItem("shubh_erp_jwt_token"),
        }),
      );
    } else {
      setAuthStatus("error");
      const errMsg = result.error ?? "Authentication failed. Check password.";
      setAuthError(errMsg);
      toast.error(errMsg);
    }
  }

  async function handleRunSetup() {
    const currentBase = getBaseUrl();
    if (!currentBase) {
      setAuthError("Save the API URL first.");
      return;
    }
    const indexUrl = getApiIndexUrl();
    setIsRunningSetup(true);
    setAuthStatus("idle");
    setAuthError("");
    try {
      const runRes = await fetch(`${indexUrl}?route=migrate/run`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
      });
      const text = await runRes.text();
      if (text.trimStart().startsWith("<")) {
        setAuthStatus("error");
        setAuthError(
          "Server returned HTML. Make sure api/index.php is uploaded to cPanel public_html/api/.",
        );
        setIsRunningSetup(false);
        return;
      }
      await fetch(`${indexUrl}?route=migrate/seed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(10_000),
      });
      const loginResult = await backendLogin(
        "superadmin",
        authPassword || "admin123",
      );
      if (loginResult.success) {
        storeServerCredentials("superadmin", authPassword || "admin123");
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
        toast.error("Setup complete but auth failed — try Authenticate Now.");
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
    toast.info("Signed out from server.");
  }

  async function handleResetDbTables() {
    setIsResettingDb(true);
    setShowDbResetConfirm(false);
    const indexUrl = getApiIndexUrl();
    try {
      const jwt = getJwt();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (jwt) headers.Authorization = `Bearer ${jwt}`;
      const res = await fetch(`${indexUrl}?route=migrate/reset`, {
        method: "POST",
        headers,
        body: JSON.stringify({ confirmation: "RESET_DB_TABLES" }),
        signal: AbortSignal.timeout(30_000),
      });
      const text = await res.text();
      if (text.trimStart().startsWith("<")) {
        toast.error(
          "Server returned HTML — api/index.php not uploaded to cPanel yet.",
        );
        setIsResettingDb(false);
        return;
      }
      const json = JSON.parse(text) as {
        status: string;
        message?: string;
        data?: { created?: string[]; errors?: { error: string }[] };
      };
      if (json.status === "ok" || json.status === "success") {
        const created = json.data?.created?.length ?? 0;
        toast.success(
          `Database reset! ${created} tables rebuilt. Column errors are now fixed.`,
        );
      } else {
        toast.error(`Reset failed: ${json.message ?? "Unknown error"}`);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Database reset failed.",
      );
    } finally {
      setIsResettingDb(false);
    }
  }

  // ── Ensure fresh auth before push ──────────────────────

  async function ensureFreshAuth(log?: string[]): Promise<boolean> {
    const addLog = (msg: string) => {
      if (log) log.push(msg);
    };
    const jwt = getJwt();
    if (jwt && !isJwtExpired()) {
      addLog("✅ Authenticated as superadmin");
      return true;
    }
    const storedUser = getStoredServerUsername();
    const storedPw = getStoredServerPassword();
    addLog("🔑 Re-authenticating…");
    const result = await backendLogin(storedUser, storedPw);
    if (result.success) {
      addLog("✅ Re-authenticated successfully");
      return true;
    }
    if (storedPw !== "admin123") {
      addLog("🔑 Trying default credentials…");
      const def = await backendLogin("superadmin", "admin123");
      if (def.success) {
        storeServerCredentials("superadmin", "admin123");
        addLog("✅ Re-authenticated with default credentials");
        return true;
      }
    }
    addLog(
      "❌ Authentication failed. Go to Database Server tab → Authenticate Now.",
    );
    return false;
  }

  async function handlePushLocalToServer() {
    if (!savedApiUrl) {
      toast.error("Save and test the API URL first.");
      return;
    }
    setPushAuthFailed(false);
    setIsPushing(true);
    const logLines: string[] = ["🔑 Checking authentication…"];
    setPushProgress([...logLines]);

    const authed = await ensureFreshAuth(logLines);
    setPushProgress([...logLines]);

    if (!authed) {
      setPushAuthFailed(true);
      setIsPushing(false);
      toast.error(
        "Authentication required. Enter your Super Admin password in the Database Server tab.",
      );
      return;
    }

    logLines.push("🔍 Checking batch endpoint…");
    setPushProgress([...logLines]);

    // Probe with a small test
    const testCollection = PUSH_COLLECTIONS.find(
      (c) => c.collection === "sessions",
    );
    if (testCollection) {
      const raw = localStorage.getItem(testCollection.lsKey);
      const probeItems = raw
        ? (() => {
            try {
              const p = JSON.parse(raw) as unknown;
              return Array.isArray(p) ? (p as unknown[]).slice(0, 1) : [];
            } catch {
              return [];
            }
          })()
        : [{ id: "__probe__", label: "test" }];
      try {
        await batchPushCollection(testCollection.collection, probeItems);
        logLines.push("✅ Batch endpoint OK — starting full push…");
        setPushProgress([...logLines]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const status =
          typeof err === "object" && err !== null && "status" in err
            ? (err as { status: number }).status
            : 0;
        let diagnostic = `❌ Batch endpoint test failed: ${msg}`;
        if (status === 404)
          diagnostic =
            "❌ Batch endpoint not found (404) — re-upload api/ folder to cPanel.";
        else if (status === 401 || status === 403) {
          diagnostic =
            "❌ Authentication expired. Go to Database Server tab → Authenticate Now.";
          setPushAuthFailed(true);
        } else if (status >= 500)
          diagnostic = `❌ Server error (${status}) — check PHP error logs. Details: ${msg}`;
        else if (msg.includes("HTML") || msg.includes("<!DOCTYPE"))
          diagnostic =
            "❌ Server returned HTML — api/index.php not uploaded. No .htaccess needed.";
        logLines.push(diagnostic);
        setPushProgress([...logLines]);
        setIsPushing(false);
        toast.error("Push failed: batch endpoint not reachable.");
        return;
      }
    }

    let totalPushed = 0;
    let totalFailed = 0;

    for (const { lsKey, collection, label } of PUSH_COLLECTIONS) {
      const raw = localStorage.getItem(lsKey);
      if (!raw) continue;

      let items: unknown[];
      try {
        const parsed = JSON.parse(raw) as unknown;
        items = Array.isArray(parsed) ? parsed : [];
      } catch {
        logLines.push(`⚠️ ${label}: skipped (JSON parse error in localStorage)`);
        continue;
      }
      if (items.length === 0) continue;

      try {
        if (isJwtExpired()) {
          const reauthed = await ensureFreshAuth(logLines);
          setPushProgress([...logLines]);
          if (!reauthed) {
            logLines.push(
              `❌ ${label}: FAILED — token expired and re-auth failed`,
            );
            totalFailed++;
            setPushProgress([...logLines]);
            continue;
          }
        }

        const result = await batchPushCollection(collection, items);
        const rawResult = result as unknown as {
          status?: string;
          data?: {
            results?: Record<string, { pushed?: number; errors?: string[] }>;
          };
          pushed?: number;
          errors?: string[];
        };

        let pushedCount = 0;
        let errorList: string[] = [];

        if (typeof rawResult.pushed === "number") {
          pushedCount = rawResult.pushed;
          errorList = rawResult.errors ?? [];
        } else if (rawResult.data?.results) {
          const colResult = rawResult.data.results[collection];
          if (colResult) {
            pushedCount = colResult.pushed ?? 0;
            errorList = colResult.errors ?? [];
          }
        }

        totalPushed += pushedCount;
        if (pushedCount === items.length) {
          logLines.push(
            `✅ ${label}: ${pushedCount}/${items.length} records saved to MySQL`,
          );
        } else if (pushedCount > 0) {
          logLines.push(
            `⚠️ ${label}: ${pushedCount}/${items.length} saved — ${errorList.length} error(s)`,
          );
          if (errorList.length > 0)
            logLines.push(`   └ First error: ${errorList[0]}`);
        } else {
          totalFailed++;
          const errDetail =
            errorList.length > 0
              ? errorList[0]
              : "All items rejected by server";
          logLines.push(`❌ ${label}: FAILED — ${errDetail}`);
        }
      } catch (err) {
        totalFailed++;
        const msg = err instanceof Error ? err.message : String(err);
        const status =
          typeof err === "object" && err !== null && "status" in err
            ? (err as { status: number }).status
            : 0;
        if (status === 401 || status === 403) {
          logLines.push(
            `❌ ${label}: FAILED — session expired. Re-authentication required.`,
          );
          setPushAuthFailed(true);
        } else {
          logLines.push(
            `❌ ${label}: FAILED (${status || "network error"}) — ${msg}`,
          );
        }
      }

      setPushProgress([...logLines]);
    }

    logLines.push("");
    logLines.push(
      totalFailed === 0
        ? `🎉 Done! ${totalPushed} records successfully pushed to MySQL.`
        : `⚠️ Done with issues: ${totalPushed} pushed, ${totalFailed} collection(s) failed.`,
    );
    setPushProgress([...logLines]);
    setIsPushing(false);

    if (totalFailed === 0) {
      toast.success(`Push complete! ${totalPushed} records sent to MySQL.`);
    } else {
      toast.warning(
        `Push finished with ${totalFailed} failures. ${totalPushed} records saved. Check the log.`,
      );
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
          Configure database server, backup, restore, and manage all school ERP
          data.
        </p>
      </div>

      <Tabs defaultValue="server" className="w-full">
        <TabsList className="grid grid-cols-3 mb-6" data-ocid="data-mgmt.tab">
          <TabsTrigger value="server" data-ocid="data-mgmt.tab.server">
            <Server className="w-3.5 h-3.5 mr-1.5" /> Database Server
          </TabsTrigger>
          <TabsTrigger value="backup" data-ocid="data-mgmt.tab.backup">
            <HardDriveDownload className="w-3.5 h-3.5 mr-1.5" /> Backup &amp;
            Restore
          </TabsTrigger>
          <TabsTrigger value="reset" data-ocid="data-mgmt.tab.reset">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Factory Reset
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
                across all devices. Leave blank to run in local-only mode.
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

            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">
                📋 Setup Steps
              </p>
              {[
                {
                  n: 1,
                  text: "Enter base URL below (e.g. https://shubh.psmkgs.com — no /api suffix needed)",
                },
                {
                  n: 2,
                  text: "Upload the api/ folder from your build to cPanel public_html/api/",
                },
                {
                  n: 3,
                  text: "Open https://shubh.psmkgs.com/api/index.php?route=migrate/run in browser to create DB tables",
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
                Server Base URL (e.g.{" "}
                <code className="bg-muted px-1 rounded text-xs">
                  https://shubh.psmkgs.com
                </code>
                )
              </Label>
              <div className="flex gap-2">
                <Input
                  id="api-url-input"
                  data-ocid="server.api_url.input"
                  placeholder="https://shubh.psmkgs.com"
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
                Enter just the domain:{" "}
                <code className="font-mono">https://shubh.psmkgs.com</code> —
                API calls go to{" "}
                <code className="font-mono text-[10px]">
                  /api/index.php?route=...
                </code>
              </p>
              {urlLooksInvalid && (
                <div className="flex items-start gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-yellow-800 dark:text-yellow-300">
                    URL looks invalid — it must start with{" "}
                    <code className="font-mono">https://</code>.
                  </p>
                </div>
              )}
              {urlMissingSubdomain && !urlLooksInvalid && (
                <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-800 dark:text-red-300">
                    Missing subdomain. It should be{" "}
                    <code className="font-mono">https://shubh.psmkgs.com</code>{" "}
                    — click Reset to fix it.
                  </p>
                </div>
              )}
            </div>

            {/* Test Connection */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Button
                variant="outline"
                onClick={() => void handleTestConnection()}
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
                          testResult.error?.includes("index.php")
                        ? "Server returned HTML. Upload api/index.php to cPanel — no .htaccess needed."
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
                <div className="space-y-3">
                  <div
                    className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3"
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
                <div className="space-y-3">
                  <div
                    className="flex items-start gap-3 rounded-lg border border-yellow-500/40 bg-yellow-500/5 px-4 py-3"
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
                        Reset anytime at{" "}
                        <code className="font-mono text-[10px]">
                          /api/index.php?route=migrate/reset-superadmin
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
                        title="First time setup: creates all tables and seeds superadmin"
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
                      <p className="text-sm text-destructive">{authError}</p>
                    </div>
                  )}
                  {authStatus === "success" && (
                    <div className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
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

          {/* Push Local Data & Reset DB */}
          {savedApiUrl && (
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCcw className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">
                  Push Local Data to Server
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Migrate all browser-stored data to your MySQL database. Each
                collection is pushed individually with real success/failure
                counts.
              </p>

              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => void handlePushLocalToServer()}
                  disabled={isPushing || !isServerAuthenticated}
                  data-ocid="server.push.button"
                >
                  {isPushing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Pushing…
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Push Local Data to Server
                    </>
                  )}
                </Button>

                {!showDbResetConfirm ? (
                  <Button
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => setShowDbResetConfirm(true)}
                    data-ocid="server.reset_db.button"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Reset DB Tables (Fix
                    Column Errors)
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-destructive font-medium">
                      Are you sure? This drops all tables.
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void handleResetDbTables()}
                      disabled={isResettingDb}
                      data-ocid="server.reset_db.confirm_button"
                    >
                      {isResettingDb ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "Confirm Reset"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowDbResetConfirm(false)}
                      data-ocid="server.reset_db.cancel_button"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {!isServerAuthenticated && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  ⚠️ Authenticate with your server password above before pushing.
                </p>
              )}

              {pushAuthFailed && (
                <div
                  className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2"
                  data-ocid="server.push.error_state"
                >
                  <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm text-destructive">
                    Authentication failed during push. Go to Database Server tab
                    → Authenticate Now, then retry.
                  </p>
                </div>
              )}

              {/* Push progress log */}
              {pushProgress.length > 0 && (
                <div
                  className="rounded-lg border bg-muted/20 p-3 max-h-72 overflow-y-auto"
                  data-ocid="server.push.progress"
                >
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Push Log
                  </p>
                  {pushProgress.map((line, i) => (
                    <div
                      key={`push-log-${line.slice(0, 30)}-${i}`}
                      className={`text-xs font-mono py-0.5 ${
                        line.startsWith("✅")
                          ? "text-emerald-700 dark:text-emerald-400"
                          : line.startsWith("❌")
                            ? "text-destructive"
                            : line.startsWith("⚠️")
                              ? "text-amber-700 dark:text-amber-400"
                              : line.startsWith("🎉")
                                ? "text-emerald-700 dark:text-emerald-400 font-semibold"
                                : "text-muted-foreground"
                      }`}
                    >
                      {line || "\u00A0"}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Storage summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <HardDrive className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Local Storage
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {erpKeyCount} ERP keys
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(erpStorageBytes)} used
                  </p>
                </div>
              </div>
            </Card>
            <Card
              className={`p-4 ${savedApiUrl ? "border-primary/20 bg-primary/5" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${savedApiUrl ? "bg-primary/10" : "bg-muted"}`}
                >
                  <Server
                    className={`w-4 h-4 ${savedApiUrl ? "text-primary" : "text-muted-foreground"}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    MySQL Server
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {savedApiUrl ? "Connected" : "Not configured"}
                  </p>
                  {savedApiUrl && (
                    <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                      {savedApiUrl}
                    </p>
                  )}
                </div>
              </div>
            </Card>
            {storageInfo.supported && storageInfo.quota > 0 && (
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Database className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      Browser Quota
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatBytes(storageInfo.used)} /{" "}
                      {formatBytes(storageInfo.quota)}
                    </p>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                      <div
                        className="bg-primary h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(100, (storageInfo.used / storageInfo.quota) * 100).toFixed(1)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

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
              Downloads a complete JSON backup of all browser-stored ERP data.
              Keep this file safe — it can restore your data if something goes
              wrong.
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
                browser. MySQL data on the server is NOT affected. This action
                cannot be undone.
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
