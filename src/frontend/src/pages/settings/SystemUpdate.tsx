import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  Download,
  ExternalLink,
  HardDrive,
  RefreshCcw,
  Server,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useSync } from "../../hooks/useSync";
import { getApiUrl } from "../../utils/api";

// ── Constants ──────────────────────────────────────────────

export const CURRENT_VERSION = "2.0.0";
const MANIFEST_URL =
  "https://raw.githubusercontent.com/shubhampatel345/school-erp-india/main/version.json";
const GITHUB_RELEASES =
  "https://github.com/shubhampatel345/school-erp-india/releases";
const LS_KEY = "shubh_erp_update_history";
const MAX_HISTORY = 5;

// ── Types ──────────────────────────────────────────────────

interface VersionManifest {
  version: string;
  releaseDate: string;
  changelog: string[];
}

interface CheckResult {
  checkedAt: string;
  fetchedVersion: string | null;
  releaseDate: string | null;
  changelog: string[];
  isUpToDate: boolean | null;
  error: string | null;
}

// ── Helpers ────────────────────────────────────────────────

function semverGt(a: string, b: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/[^0-9.]/g, "")
      .split(".")
      .map(Number);
  const [aMaj = 0, aMin = 0, aPat = 0] = parse(a);
  const [bMaj = 0, bMin = 0, bPat = 0] = parse(b);
  if (aMaj !== bMaj) return aMaj > bMaj;
  if (aMin !== bMin) return aMin > bMin;
  return aPat > bPat;
}

function loadHistory(): CheckResult[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as CheckResult[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: CheckResult[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

// ── Storage mode section ───────────────────────────────────

function DataStorageInfo() {
  const { mode, lastSyncTime, serverInfo } = useSync();
  const apiUrl = getApiUrl();

  const lastBackupRaw = localStorage.getItem("shubh_erp_backup_history");
  let lastBackupDate = "Never";
  try {
    const hist = lastBackupRaw
      ? (JSON.parse(lastBackupRaw) as Array<{ createdAt: string }>)
      : [];
    if (hist.length > 0) {
      lastBackupDate = new Date(hist[0].createdAt).toLocaleDateString("en-IN");
    }
  } catch {
    /* ignore */
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Database className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground">Data Storage Mode</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Storage mode */}
        <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Mode
            </span>
            {mode === "connected" ? (
              <Badge className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                MySQL Server
              </Badge>
            ) : mode === "offline" ? (
              <Badge variant="destructive" className="text-[10px]">
                Offline
              </Badge>
            ) : mode === "syncing" ? (
              <Badge className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30">
                Syncing
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                Local Browser
              </Badge>
            )}
          </div>
          <div className="flex items-start gap-2">
            {apiUrl ? (
              <Server className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            ) : (
              <HardDrive className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">
                {apiUrl ? "cPanel MySQL Server" : "Browser localStorage"}
              </p>
              {apiUrl ? (
                <p className="text-xs text-muted-foreground font-mono break-all mt-0.5">
                  {apiUrl}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Data stored in this browser only — not shared across devices.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Database details */}
        <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Details
          </span>
          <div className="space-y-1.5 text-sm">
            {serverInfo?.db_version && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">MySQL Version</span>
                <span className="font-medium text-foreground">
                  {serverInfo.db_version}
                </span>
              </div>
            )}
            {serverInfo?.version && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">API Version</span>
                <span className="font-medium text-foreground">
                  v{serverInfo.version}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Sync</span>
              <span className="font-medium text-foreground">
                {lastSyncTime
                  ? lastSyncTime.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Backup</span>
              <span className="font-medium text-foreground">
                {lastBackupDate}
              </span>
            </div>
          </div>
        </div>
      </div>

      {!apiUrl && (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Running in <strong>Local Mode</strong>. Data is stored only on this
            device. To enable multi-device sync, configure a cPanel MySQL server
            in <strong>Settings → Data Management → Database Server</strong>.
          </p>
        </div>
      )}
    </Card>
  );
}

// ── Component ──────────────────────────────────────────────

export default function SystemUpdate() {
  const [history, setHistory] = useState<CheckResult[]>(loadHistory);
  const [checking, setChecking] = useState(false);
  const [latest, setLatest] = useState<CheckResult | null>(history[0] ?? null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  async function handleCheckUpdates() {
    setChecking(true);
    const checkedAt = new Date().toISOString();
    let result: CheckResult;
    try {
      const resp = await fetch(MANIFEST_URL, { cache: "no-store" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const manifest: VersionManifest = await resp.json();
      const isUpToDate = !semverGt(manifest.version, CURRENT_VERSION);
      result = {
        checkedAt,
        fetchedVersion: manifest.version,
        releaseDate: manifest.releaseDate ?? null,
        changelog: Array.isArray(manifest.changelog) ? manifest.changelog : [],
        isUpToDate,
        error: null,
      };
    } catch (err) {
      void err;
      result = {
        checkedAt,
        fetchedVersion: null,
        releaseDate: null,
        changelog: [],
        isUpToDate: null,
        error:
          "Could not connect to update server. Check your internet connection.",
      };
    }
    const updated = [result, ...history].slice(0, MAX_HISTORY);
    saveHistory(updated);
    setHistory(updated);
    setLatest(result);
    setChecking(false);
  }

  const hasUpdate =
    latest && !latest.isUpToDate && latest.fetchedVersion !== null;

  return (
    <div className="p-4 lg:p-6 space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          System Update
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Check for new features and improvements for SHUBH SCHOOL ERP.
        </p>
      </div>

      {/* ── DATA STORAGE INFO ──────────────────────────────── */}
      <section className="space-y-2">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          Data Storage
        </h3>
        <DataStorageInfo />
      </section>

      {/* ── VERSION CHECK ──────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          App Version
        </h3>

        <Card className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                Installed Version
              </p>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold font-display text-foreground">
                  v{CURRENT_VERSION}
                </span>
                <Badge variant="secondary" className="text-xs">
                  SHUBH SCHOOL ERP
                </Badge>
              </div>
              {latest?.checkedAt && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last checked:{" "}
                  {new Date(latest.checkedAt).toLocaleString("en-IN")} (
                  {formatRelativeTime(latest.checkedAt)})
                </p>
              )}
            </div>
            <Button
              onClick={handleCheckUpdates}
              disabled={checking}
              data-ocid="system-update-check-btn"
              className="shrink-0"
            >
              {checking ? (
                <>
                  <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                  Checking…
                </>
              ) : (
                <>
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Check for Updates
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Result banner */}
        {latest && (
          <div>
            {latest.error && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
                <WifiOff className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-destructive text-sm">
                    Update Check Failed
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {latest.error}
                  </p>
                </div>
              </div>
            )}

            {!latest.error && latest.isUpToDate && (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-medium text-emerald-700 dark:text-emerald-400 text-sm">
                    ✓ You are running the latest version (v{CURRENT_VERSION})
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Wifi className="w-3 h-3" /> Connected to update server
                  </p>
                </div>
              </div>
            )}

            {hasUpdate && (
              <div className="space-y-3">
                <div className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-primary text-sm">
                          🎉 New Update Available!
                        </p>
                        <Badge className="text-xs bg-primary/10 text-primary border-primary/30">
                          v{latest.fetchedVersion}
                        </Badge>
                        {latest.releaseDate && (
                          <span className="text-xs text-muted-foreground">
                            Released: {latest.releaseDate}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Your version: v{CURRENT_VERSION} → Latest: v
                        {latest.fetchedVersion}
                      </p>
                    </div>
                  </div>

                  {latest.changelog.length > 0 && (
                    <div className="rounded-md bg-background border border-border p-3">
                      <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
                        What's New
                      </p>
                      <ul className="space-y-1">
                        {latest.changelog.map((item, i) => (
                          <li
                            key={`cl-${i}-${item.slice(0, 20)}`}
                            className="flex items-start gap-2 text-sm text-foreground"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button
                    onClick={() => setShowInstructions((v) => !v)}
                    data-ocid="system-update-apply-btn"
                    className="w-full sm:w-auto"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Apply Update — Instructions
                    {showInstructions ? (
                      <ChevronUp className="w-4 h-4 ml-2" />
                    ) : (
                      <ChevronDown className="w-4 h-4 ml-2" />
                    )}
                  </Button>
                </div>

                {showInstructions && (
                  <Card className="p-4 border-primary/20 space-y-3">
                    <p className="font-semibold text-foreground text-sm">
                      How to Apply This Update
                    </p>
                    <p className="text-sm text-muted-foreground">
                      SHUBH SCHOOL ERP is hosted as a static web app on cPanel.
                      Updates are applied by downloading the latest build and
                      re-uploading it to your hosting.
                    </p>
                    <ol className="space-y-2 text-sm text-foreground">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">
                          1
                        </span>
                        <span>
                          Go to{" "}
                          <a
                            href={GITHUB_RELEASES}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline underline-offset-2 inline-flex items-center gap-0.5"
                          >
                            GitHub Releases <ExternalLink className="w-3 h-3" />
                          </a>{" "}
                          and download the latest build ZIP.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">
                          2
                        </span>
                        <span>
                          Extract the ZIP to get the{" "}
                          <code className="bg-muted px-1 rounded text-xs">
                            dist/
                          </code>{" "}
                          folder.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">
                          3
                        </span>
                        <span>
                          Log in to cPanel, open <strong>File Manager</strong>,
                          and navigate to{" "}
                          <code className="bg-muted px-1 rounded text-xs">
                            public_html/
                          </code>
                          .
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">
                          4
                        </span>
                        <span>
                          Delete old files (keep{" "}
                          <code className="bg-muted px-1 rounded text-xs">
                            .htaccess
                          </code>
                          ), then upload the new{" "}
                          <code className="bg-muted px-1 rounded text-xs">
                            dist/
                          </code>{" "}
                          files.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">
                          5
                        </span>
                        <span>
                          Hard-refresh your browser (Ctrl+Shift+R). All data in
                          localStorage or MySQL is preserved.
                        </span>
                      </li>
                    </ol>
                    <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-3">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">
                        Always create a <strong>Data Backup</strong> before
                        uploading a new version.
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Check History */}
      <section className="space-y-3">
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
          data-ocid="system-update-history-toggle"
        >
          <Clock className="w-4 h-4" />
          Update Check History (last {Math.min(history.length, MAX_HISTORY)})
          {showHistory ? (
            <ChevronUp className="w-4 h-4 ml-auto" />
          ) : (
            <ChevronDown className="w-4 h-4 ml-auto" />
          )}
        </button>

        {showHistory && (
          <div className="rounded-lg border overflow-hidden">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No checks performed yet. Click "Check for Updates" above.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                      Checked At
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">
                      Server Version
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr
                      key={h.checkedAt}
                      className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
                      data-ocid={`update-history-row-${i + 1}`}
                    >
                      <td className="px-3 py-2 text-foreground">
                        {new Date(h.checkedAt).toLocaleString("en-IN")}
                        <br />
                        <span className="text-[11px] text-muted-foreground">
                          {formatRelativeTime(h.checkedAt)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                        {h.fetchedVersion ? `v${h.fetchedVersion}` : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {h.error ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Error
                          </Badge>
                        ) : h.isUpToDate ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-emerald-500/50 text-emerald-600"
                          >
                            Up to date
                          </Badge>
                        ) : (
                          <Badge className="text-[10px] bg-primary/10 text-primary border-primary/30">
                            Update available
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
