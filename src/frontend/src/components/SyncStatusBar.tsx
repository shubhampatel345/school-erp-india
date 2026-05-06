/**
 * SyncStatusBar — sticky bar shown when sync is pending or errored.
 * Hidden when fully synced (pendingCount === 0 and no error).
 * Green dot + hidden when all synced.
 * Yellow spinner when syncing.
 * Red dot + retry when errors.
 */
import { useApp, useSyncStatus } from "@/context/AppContext";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

export default function SyncStatusBar() {
  const { retrySync } = useApp();
  const syncStatus = useSyncStatus();
  const { state, pendingCount, lastError } = syncStatus;

  // Fully synced — hide the bar
  if (state === "synced" && pendingCount === 0 && !lastError) return null;
  if (state === "idle" && pendingCount === 0) return null;

  const hasError = state === "error" || !!lastError;
  const isSyncing = state === "syncing";
  const isOffline = state === "offline";

  if (isOffline) {
    return (
      <output
        aria-live="polite"
        data-ocid="sync.offline_bar"
        className="w-full py-1.5 px-4 flex items-center justify-center gap-2 text-xs font-medium z-50 print:hidden bg-muted/60 border-b border-border text-muted-foreground"
      >
        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>
          You are offline — changes will sync when connection is restored
        </span>
      </output>
    );
  }

  return (
    <output
      aria-live="polite"
      data-ocid="sync.status_bar"
      className={[
        "w-full py-1.5 px-4 flex items-center justify-center gap-2 text-xs font-medium z-50",
        "print:hidden",
        hasError
          ? "bg-destructive/10 text-destructive border-b border-destructive/20"
          : "bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200/40 text-amber-800 dark:text-amber-300",
      ].join(" ")}
    >
      {hasError ? (
        <>
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>
            {pendingCount > 0
              ? `${pendingCount} change${pendingCount !== 1 ? "s" : ""} failed to sync`
              : "Sync error"}
            {" — "}
            <button
              type="button"
              data-ocid="sync.retry_button"
              className="underline underline-offset-2 hover:no-underline font-semibold transition-colors"
              onClick={retrySync}
            >
              Retry
            </button>
          </span>
        </>
      ) : (
        <>
          {isSyncing ? (
            <Loader2
              className="w-3.5 h-3.5 shrink-0 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          )}
          <span>
            {isSyncing
              ? `Syncing ${pendingCount > 0 ? `${pendingCount} change${pendingCount !== 1 ? "s" : ""}…` : "…"}`
              : `${pendingCount} pending change${pendingCount !== 1 ? "s" : ""}`}
          </span>
        </>
      )}

      {hasError && (
        <button
          type="button"
          data-ocid="sync.dismiss_button"
          aria-label="Retry sync"
          className="ml-auto text-destructive/60 hover:text-destructive transition-colors"
          onClick={retrySync}
        >
          <RefreshCw className="w-3 h-3" aria-hidden="true" />
        </button>
      )}
    </output>
  );
}
