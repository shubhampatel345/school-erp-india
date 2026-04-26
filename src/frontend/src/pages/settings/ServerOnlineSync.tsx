/**
 * SHUBH SCHOOL ERP — Server & Sync Settings
 * Configure API endpoint, test connection, view last sync time.
 * No offline queue — all data goes direct to server.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Server,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import phpApiService from "../../utils/phpApiService";

const DEFAULT_URL = "https://shubh.psmkgs.com/api";

export default function ServerOnlineSync() {
  const { addNotification, serverConnected } = useApp();
  const [serverUrl, setServerUrl] = useState(() => {
    try {
      return localStorage.getItem("erp_server_url") ?? DEFAULT_URL;
    } catch {
      return DEFAULT_URL;
    }
  });
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(() => {
    try {
      return localStorage.getItem("erp_last_sync");
    } catch {
      return null;
    }
  });
  const [syncing, setSyncing] = useState(false);
  const [dbInfo] = useState({
    host: "localhost",
    port: "3306",
    database: "psmkgsco_shubherp_db",
    user: "psmkgsco_shubherp_user",
  });

  useEffect(() => {
    // Show current connection state
    setStatus(serverConnected ? "ok" : "idle");
    if (serverConnected) setStatusMsg("Connected to server");
  }, [serverConnected]);

  const handleTest = async () => {
    setTesting(true);
    setStatus("idle");
    setStatusMsg("");
    try {
      const url = serverUrl.replace(/\/$/, "");
      localStorage.setItem("erp_server_url", url);
      const resp = await fetch(`${url}/index.php?route=ping`, {
        signal: AbortSignal.timeout(8000),
      });
      if (resp.ok) {
        const json = (await resp.json()) as { success?: boolean };
        if (json.success) {
          setStatus("ok");
          setStatusMsg("Server is online and responding ✓");
          addNotification("Server connection successful", "success");
        } else {
          setStatus("error");
          setStatusMsg("Server responded but returned an error");
        }
      } else {
        setStatus("error");
        setStatusMsg(`Server returned HTTP ${resp.status}`);
      }
    } catch (e) {
      setStatus("error");
      setStatusMsg(e instanceof Error ? e.message : "Could not reach server");
    } finally {
      setTesting(false);
    }
  };

  const handleSaveUrl = () => {
    try {
      const cleaned = serverUrl.replace(/\/$/, "");
      localStorage.setItem("erp_server_url", cleaned);
      setServerUrl(cleaned);
      addNotification("Server URL saved", "success");
    } catch {
      addNotification("Failed to save URL", "error");
    }
  };

  const handleReset = () => {
    setServerUrl(DEFAULT_URL);
    try {
      localStorage.removeItem("erp_server_url");
    } catch {
      /* noop */
    }
    addNotification("Reset to default URL", "info");
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const ok = await phpApiService.checkHealth();
      if (ok) {
        const now = new Date().toLocaleString("en-IN");
        setLastSync(now);
        try {
          localStorage.setItem("erp_last_sync", now);
        } catch {
          /* noop */
        }
        addNotification("Sync completed successfully", "success");
      } else {
        addNotification("Sync failed — server unreachable", "error");
      }
    } catch {
      addNotification("Sync failed", "error");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-2xl space-y-5">
      {/* Connection Status */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-foreground">
              Server Settings
            </h2>
          </div>
          <Badge
            className={
              serverConnected
                ? "bg-green-500/10 text-green-600 border-green-500/30"
                : "bg-destructive/10 text-destructive border-destructive/30"
            }
            data-ocid="server-sync.connection_state"
          >
            {serverConnected ? (
              <Wifi className="w-3 h-3 mr-1" />
            ) : (
              <WifiOff className="w-3 h-3 mr-1" />
            )}
            {serverConnected ? "Connected" : "Offline"}
          </Badge>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">
            API Server URL
          </Label>
          <div className="flex gap-2">
            <Input
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder={DEFAULT_URL}
              className="flex-1 font-mono text-sm"
              data-ocid="server-sync.url_input"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveUrl}
              data-ocid="server-sync.save_url_button"
            >
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              data-ocid="server-sync.reset_button"
            >
              Reset
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Default: <span className="font-mono">{DEFAULT_URL}</span>
          </p>
        </div>

        {/* Test Connection */}
        <div className="space-y-2">
          <Button
            onClick={handleTest}
            disabled={testing}
            variant="outline"
            className="w-full sm:w-auto"
            data-ocid="server-sync.test_button"
          >
            {testing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Wifi className="w-4 h-4 mr-2" />
            )}
            {testing ? "Testing…" : "Test Connection"}
          </Button>

          {status === "ok" && (
            <div
              className="flex items-center gap-2 text-sm text-green-600 bg-green-500/10 rounded-lg px-3 py-2"
              data-ocid="server-sync.success_state"
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {statusMsg}
            </div>
          )}
          {status === "error" && (
            <div
              className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2"
              data-ocid="server-sync.error_state"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {statusMsg}
            </div>
          )}
        </div>
      </div>

      {/* Database Info */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-display font-semibold text-foreground text-sm">
          Database Credentials (read-only)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(dbInfo).map(([k, v]) => (
            <div key={k}>
              <Label className="text-xs text-muted-foreground mb-1 block capitalize">
                {k}
              </Label>
              <div className="bg-muted rounded-md px-3 py-2 text-sm font-mono text-foreground">
                {v}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          Database credentials are hardcoded in <code>api/config.php</code> on
          your cPanel server. Change them there, not here.
        </p>
      </div>

      {/* Manual Sync */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="font-display font-semibold text-foreground text-sm">
          Connection Health
        </h3>
        {lastSync && (
          <p className="text-xs text-muted-foreground">
            Last checked:{" "}
            <span className="font-medium text-foreground">{lastSync}</span>
          </p>
        )}
        <Button
          onClick={handleSync}
          disabled={syncing}
          variant="outline"
          className="w-full sm:w-auto"
          data-ocid="server-sync.sync_button"
        >
          {syncing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          {syncing ? "Checking…" : "Check Connection Now"}
        </Button>
      </div>

      {/* Quick Help */}
      <div className="bg-muted/40 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-foreground">Quick Setup:</p>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>
            Upload <code>api/index.php</code> and <code>api/config.php</code> to{" "}
            <code>public_html/api/</code> in cPanel
          </li>
          <li>
            Visit <code>{serverUrl}/index.php?route=migrate/run</code> once to
            create tables
          </li>
          <li>
            Login with <strong>admin / admin123</strong> (change after first
            login)
          </li>
        </ol>
      </div>
    </div>
  );
}
