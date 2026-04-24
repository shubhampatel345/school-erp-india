/**
 * SHUBH SCHOOL ERP — Server Settings
 * Online-only: configure API endpoint, test connection, manage token.
 * No offline queue, no pending sync — all data goes direct to server.
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Key,
  Loader2,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldCheck,
  ShieldX,
  Trash2,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import phpApiService from "../../utils/phpApiService";

interface SyncLog {
  id: string;
  timestamp: number;
  operation: string;
  module: string;
  status: "success" | "failed";
  durationMs?: number;
  error?: string;
}

interface HealthDot {
  id: string;
  timestamp: number;
  latencyMs: number;
  ok: boolean;
}

const LS_SERVER_URL = "erp_server_url";
const LS_SYNC_LOGS = "erp_sync_logs";
const LS_HEALTH_HISTORY = "erp_health_history";
const LS_LAST_TOKEN_REFRESH = "lastTokenRefresh";
const DEFAULT_URL = "/api";

function loadLs<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

function saveLs(key: string, val: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* noop */
  }
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function HealthDotEl({ dot }: { dot: HealthDot }) {
  const [tip, setTip] = useState(false);
  const cls = !dot.ok
    ? "bg-destructive"
    : dot.latencyMs < 200
      ? "bg-accent"
      : dot.latencyMs < 1000
        ? "bg-amber-400"
        : "bg-destructive";
  return (
    <div
      className="relative"
      onMouseEnter={() => setTip(true)}
      onMouseLeave={() => setTip(false)}
    >
      <div className={`w-4 h-4 rounded-full cursor-default ${cls}`} />
      {tip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-card border border-border rounded px-2 py-1 text-[10px] whitespace-nowrap shadow-elevated z-10">
          {formatTs(dot.timestamp)} — {dot.ok ? `${dot.latencyMs}ms` : "Failed"}
        </div>
      )}
    </div>
  );
}

export default function ServerOnlineSync() {
  const { currentUser } = useApp();
  const isSuperAdmin = currentUser?.role === "superadmin";

  const [serverUrl, setServerUrl] = useState(
    () => loadLs(LS_SERVER_URL, DEFAULT_URL) as string,
  );
  const [saved, setSaved] = useState(false);
  const [testState, setTestState] = useState<
    "idle" | "testing" | "ok" | "fail"
  >("idle");
  const [testMsg, setTestMsg] = useState("");
  const [testLatency, setTestLatency] = useState(0);

  const [jwtState, setJwtState] = useState<
    "idle" | "checking" | "valid" | "invalid"
  >("idle");
  const [jwtRole, setJwtRole] = useState("");
  const [tokenRefreshState, setTokenRefreshState] = useState<
    "idle" | "refreshing" | "success" | "fail" | "no-credentials"
  >("idle");
  const [lastTokenRefresh, setLastTokenRefresh] = useState<number | null>(
    () => {
      try {
        const raw = localStorage.getItem(LS_LAST_TOKEN_REFRESH);
        if (!raw) return null;
        const n = Number(raw);
        return Number.isNaN(n) ? null : n;
      } catch {
        return null;
      }
    },
  );

  const hasStoredCredentials =
    !!localStorage.getItem("erp_username") &&
    !!localStorage.getItem("erp_password");

  const [syncLogs, setSyncLogs] = useState<SyncLog[]>(
    () => loadLs(LS_SYNC_LOGS, []) as SyncLog[],
  );
  const [healthHistory, setHealthHistory] = useState<HealthDot[]>(
    () => loadLs(LS_HEALTH_HISTORY, []) as HealthDot[],
  );

  // ── Listen for sync events ────────────────────────────────────────────────

  useEffect(() => {
    const handleTokenRefreshed = () => {
      const ts = Date.now();
      setLastTokenRefresh(ts);
      saveLs(LS_LAST_TOKEN_REFRESH, ts);
      setTokenRefreshState("success");
      setTimeout(() => setTokenRefreshState("idle"), 4000);
    };
    window.addEventListener("auth:token-refreshed", handleTokenRefreshed);
    return () =>
      window.removeEventListener("auth:token-refreshed", handleTokenRefreshed);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleTestConnection = useCallback(async () => {
    setTestState("testing");
    setTestMsg("");
    const start = Date.now();
    try {
      const ok = await phpApiService.checkHealth();
      const latency = Date.now() - start;
      setTestLatency(latency);
      if (ok) {
        setTestState("ok");
        setTestMsg(`Connected in ${latency}ms`);
        const dot: HealthDot = {
          id: String(Date.now()),
          timestamp: Date.now(),
          latencyMs: latency,
          ok: true,
        };
        setHealthHistory((prev) => {
          const next = [dot, ...prev].slice(0, 10);
          saveLs(LS_HEALTH_HISTORY, next);
          return next;
        });
        setSyncLogs((prev) => {
          const entry: SyncLog = {
            id: `${Date.now()}`,
            timestamp: Date.now(),
            operation: "ping",
            module: "server",
            status: "success",
            durationMs: latency,
          };
          const next = [entry, ...prev].slice(0, 50);
          saveLs(LS_SYNC_LOGS, next);
          return next;
        });
      } else {
        setTestState("fail");
        setTestMsg("Server unreachable — check URL and server is running");
        const dot: HealthDot = {
          id: String(Date.now()),
          timestamp: Date.now(),
          latencyMs: 0,
          ok: false,
        };
        setHealthHistory((prev) => {
          const next = [dot, ...prev].slice(0, 10);
          saveLs(LS_HEALTH_HISTORY, next);
          return next;
        });
      }
    } catch (err) {
      setTestState("fail");
      setTestMsg(err instanceof Error ? err.message : "Connection failed");
      const dot: HealthDot = {
        id: String(Date.now()),
        timestamp: Date.now(),
        latencyMs: 0,
        ok: false,
      };
      setHealthHistory((prev) => {
        const next = [dot, ...prev].slice(0, 10);
        saveLs(LS_HEALTH_HISTORY, next);
        return next;
      });
    }
  }, []);

  const handleCheckJwt = useCallback(async () => {
    setJwtState("checking");
    try {
      const user = await phpApiService.verifyToken();
      if (user) {
        setJwtState("valid");
        setJwtRole(user.role ?? "unknown");
      } else {
        setJwtState("invalid");
      }
    } catch {
      setJwtState("invalid");
    }
  }, []);

  const handleRefreshToken = useCallback(async () => {
    const u = localStorage.getItem("erp_username");
    const p = localStorage.getItem("erp_password");
    if (!u || !p) {
      setTokenRefreshState("no-credentials");
      return;
    }
    setTokenRefreshState("refreshing");
    try {
      const result = await phpApiService.login(u, p);
      if (result?.token) {
        const ts = Date.now();
        setLastTokenRefresh(ts);
        saveLs(LS_LAST_TOKEN_REFRESH, ts);
        setTokenRefreshState("success");
        setJwtState("valid");
        setJwtRole(result.user.role ?? "unknown");
        window.dispatchEvent(new CustomEvent("auth:token-refreshed"));
        setTimeout(() => setTokenRefreshState("idle"), 4000);
      } else {
        setTokenRefreshState("fail");
      }
    } catch {
      setTokenRefreshState("fail");
    }
  }, []);

  const handleSaveSettings = useCallback(() => {
    saveLs(LS_SERVER_URL, serverUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [serverUrl]);

  const handleClearLogs = useCallback(() => {
    setSyncLogs([]);
    saveLs(LS_SYNC_LOGS, []);
  }, []);

  if (!isSuperAdmin) {
    return (
      <div className="p-6 flex items-center gap-3 text-muted-foreground">
        <AlertCircle className="w-5 h-5" />
        <span>Only Super Admin can access Server settings.</span>
      </div>
    );
  }

  const isOnline = navigator.onLine;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Server className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-display font-semibold text-foreground">
            Server Settings
          </h2>
          <p className="text-xs text-muted-foreground">
            Configure cPanel MySQL API endpoint and token management
          </p>
        </div>
      </div>

      {/* Online status banner */}
      <div
        className={`rounded-xl border p-4 flex items-center gap-3 ${isOnline ? "border-emerald-300/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5"}`}
        data-ocid="server-sync.status_card"
      >
        {isOnline ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        ) : (
          <WifiOff className="w-5 h-5 text-destructive" />
        )}
        <div>
          <p
            className={`text-sm font-semibold ${isOnline ? "text-emerald-700" : "text-destructive"}`}
          >
            {isOnline
              ? "Online — direct MySQL connection active"
              : "Offline — check internet connection"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            All data is saved directly to your MySQL server on cPanel
          </p>
        </div>
      </div>

      {/* Endpoint Settings */}
      <div
        className="rounded-xl border border-border bg-card p-4 shadow-subtle space-y-4"
        data-ocid="server-sync.endpoint_card"
      >
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">
            API Endpoint
          </span>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="server-url">
            API Endpoint URL
          </Label>
          <div className="flex gap-2">
            <Input
              id="server-url"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://shubh.psmkgs.com/api"
              className="flex-1 font-mono text-xs h-9"
              data-ocid="server-sync.url_input"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleTestConnection()}
              disabled={testState === "testing"}
              data-ocid="server-sync.test_connection_button"
            >
              {testState === "testing" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4" />
              )}
              {testState === "testing" ? "Testing…" : "Test"}
            </Button>
          </div>
          {testState === "ok" && (
            <div
              className="flex items-center gap-1.5 text-xs text-accent mt-1"
              data-ocid="server-sync.success_state"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Connected · {testLatency}ms latency</span>
            </div>
          )}
          {testState === "fail" && (
            <div
              className="flex items-center gap-1.5 text-xs text-destructive mt-1"
              data-ocid="server-sync.error_state"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>{testMsg || "Unreachable"}</span>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">
            The base URL of your cPanel PHP API. Example:{" "}
            <code className="bg-muted px-1 rounded">
              https://shubh.psmkgs.com/api
            </code>
          </p>
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            onClick={handleSaveSettings}
            size="sm"
            data-ocid="server-sync.save_button"
            className="flex-1"
          >
            {saved ? (
              <>
                <CheckCircle className="w-4 h-4 mr-1.5" />
                Saved!
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setServerUrl(DEFAULT_URL)}
            data-ocid="server-sync.restore_defaults_button"
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Restore Default
          </Button>
        </div>
      </div>

      {/* Token Status */}
      <div
        className="rounded-xl border border-border bg-card p-4 shadow-subtle space-y-4"
        data-ocid="server-sync.token_card"
      >
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">
            Token Status
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-foreground">Current Session Token</p>
            <p className="text-xs text-muted-foreground">
              {lastTokenRefresh
                ? `Last refreshed: ${new Date(lastTokenRefresh).toLocaleTimeString("en-IN")}`
                : "No token refresh recorded this session"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleCheckJwt()}
            disabled={jwtState === "checking"}
            data-ocid="server-sync.check_jwt_button"
          >
            {jwtState === "checking" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Verify Token"
            )}
          </Button>
        </div>
        {jwtState === "valid" && (
          <div
            className="flex items-center gap-2 text-xs text-accent"
            data-ocid="server-sync.jwt_success_state"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              Token valid · Authenticated as{" "}
              <strong className="capitalize">{jwtRole}</strong>
            </span>
          </div>
        )}
        {jwtState === "invalid" && (
          <div
            className="flex items-center gap-2 text-xs text-destructive"
            data-ocid="server-sync.jwt_error_state"
          >
            <ShieldX className="w-4 h-4" />
            <span>Token expired or invalid — use Refresh Token below</span>
          </div>
        )}
        <div className="border-t border-border pt-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Refresh Token
              </p>
              <p className="text-xs text-muted-foreground">
                {hasStoredCredentials
                  ? "Silently re-authenticate using stored login credentials"
                  : "No stored credentials — log out and sign in again"}
              </p>
            </div>
            <Button
              variant={jwtState === "invalid" ? "default" : "outline"}
              size="sm"
              onClick={() => void handleRefreshToken()}
              disabled={
                !hasStoredCredentials || tokenRefreshState === "refreshing"
              }
              data-ocid="server-sync.refresh_token_button"
            >
              {tokenRefreshState === "refreshing" ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1.5" />
              )}
              {tokenRefreshState === "refreshing"
                ? "Refreshing…"
                : "Refresh Token"}
            </Button>
          </div>
          {tokenRefreshState === "success" && (
            <div
              className="flex items-center gap-2 text-xs text-accent"
              data-ocid="server-sync.token_refresh_success_state"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Token refreshed successfully</span>
            </div>
          )}
          {tokenRefreshState === "fail" && (
            <div
              className="flex items-center gap-2 text-xs text-destructive"
              data-ocid="server-sync.token_refresh_error_state"
            >
              <XCircle className="w-4 h-4" />
              <span>Refresh failed — please log out and sign in again.</span>
            </div>
          )}
          {tokenRefreshState === "no-credentials" && (
            <div
              className="flex items-center gap-2 text-xs text-amber-600"
              data-ocid="server-sync.token_no_credentials_state"
            >
              <AlertCircle className="w-4 h-4" />
              <span>
                No stored credentials found. Please log out and sign in again.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Endpoint Health History */}
      <div
        className="rounded-xl border border-border bg-card p-4 shadow-subtle"
        data-ocid="server-sync.health_history_card"
      >
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">
            Endpoint Health History
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            Last 10 tests
          </span>
        </div>
        {healthHistory.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No health checks yet. Click "Test" above to begin.
          </p>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {[...healthHistory].reverse().map((dot) => (
              <HealthDotEl key={dot.id} dot={dot} />
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-accent inline-block" />
            Fast &lt;200ms
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            Slow 200–1000ms
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-destructive inline-block" />
            Failed
          </span>
        </div>
      </div>

      {/* API Activity Log */}
      <div
        className="rounded-xl border border-border bg-card shadow-subtle overflow-hidden"
        data-ocid="server-sync.logs_card"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm text-foreground">
              API Activity Log
            </span>
            <span className="text-xs text-muted-foreground">
              ({syncLogs.length}/50)
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearLogs}
            className="text-muted-foreground hover:text-destructive text-xs"
            data-ocid="server-sync.clear_logs_button"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Clear Logs
          </Button>
        </div>
        <div
          className="max-h-72 overflow-y-auto"
          data-ocid="server-sync.logs_panel"
        >
          {syncLogs.length === 0 ? (
            <div
              className="px-4 py-8 text-center text-xs text-muted-foreground"
              data-ocid="server-sync.logs_empty_state"
            >
              No activity yet. Add or edit records to see logs here.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-muted/30 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">
                    Time
                  </th>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">
                    Module
                  </th>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">
                    Operation
                  </th>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {syncLogs.map((log, idx) => (
                  <tr
                    key={log.id}
                    className="hover:bg-muted/20"
                    data-ocid={`server-sync.log_item.${idx + 1}`}
                  >
                    <td className="px-4 py-2 text-muted-foreground font-mono">
                      {formatTs(log.timestamp)}
                    </td>
                    <td className="px-3 py-2 font-medium text-foreground capitalize">
                      {log.module}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground capitalize">
                      {log.operation}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          log.status === "success"
                            ? "bg-accent/10 text-accent border-accent/30"
                            : "bg-destructive/10 text-destructive border-destructive/30"
                        }`}
                      >
                        {log.status === "success" ? "✓" : "✗"} {log.status}
                      </span>
                    </td>
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
