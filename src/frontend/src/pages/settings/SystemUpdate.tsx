import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  ExternalLink,
  Loader2,
  RefreshCcw,
  Server,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { useState } from "react";
import { useApp } from "../../context/AppContext";

export const CURRENT_VERSION = "2.1.0";
const MANIFEST_URL =
  "https://raw.githubusercontent.com/shubhampatel345/school-erp-india/main/version.json";
const GITHUB_RELEASES =
  "https://github.com/shubhampatel345/school-erp-india/releases";

interface VersionManifest {
  version: string;
  releaseDate: string;
  changelog: string[];
  phpApiUrl?: string;
  notes?: string;
}

interface CheckResult {
  checkedAt: string;
  fetchedVersion: string | null;
  releaseDate: string | null;
  changelog: string[];
  isUpToDate: boolean | null;
  error: string | null;
  phpApiUrl?: string;
}

const CURRENT_FEATURES = [
  "Complete school ERP powered by Internet Computer canister storage",
  "Student management with CBSE/ICSE class names (Nursery–Class 12)",
  "Fees collection, receipts & headings with auto month selection",
  "Attendance — camera QR + USB/Bluetooth scanner",
  "HR & Payroll — net salary with attendance-based calculation",
  "Transport — route-wise pickup points with monthly fares",
  "Session management with infinite archive",
  "Chat — class/section/route-wise groups + file sharing",
  "WhatsApp auto-reply bot for parent fee/attendance queries",
  "ESSL/ZKTeco biometric device integration",
  "Backup & Restore with factory reset",
  "Role-based permissions — 9 roles controlled by Super Admin",
  "Theme settings — 10+ color themes",
  "Data stored natively on the Internet Computer — no server setup needed",
];

export default function SystemUpdate() {
  const { currentUser } = useApp();
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);

  const isSuperAdmin = currentUser?.role === "superadmin";

  async function handleCheck() {
    setChecking(true);
    try {
      const res = await fetch(MANIFEST_URL, {
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as VersionManifest;
      const isUpToDate = data.version === CURRENT_VERSION;
      setCheckResult({
        checkedAt: new Date().toISOString(),
        fetchedVersion: data.version,
        releaseDate: data.releaseDate ?? null,
        changelog: data.changelog ?? [],
        isUpToDate,
        error: null,
        phpApiUrl: data.phpApiUrl,
      });
      setShowChangelog(!isUpToDate);
    } catch (err) {
      setCheckResult({
        checkedAt: new Date().toISOString(),
        fetchedVersion: null,
        releaseDate: null,
        changelog: [],
        isUpToDate: null,
        error:
          err instanceof Error ? err.message : "Could not reach update server",
      });
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-display font-semibold text-foreground">
            System Update
          </h2>
          <p className="text-sm text-muted-foreground">
            Check for new features and apply updates manually
          </p>
        </div>
      </div>

      {/* Version Card */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-label text-muted-foreground mb-1">
              Current Version
            </p>
            <p className="text-3xl font-display font-bold text-foreground">
              v{CURRENT_VERSION}
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Server className="w-3 h-3" /> SHUBH SCHOOL ERP — Internet
              Computer Edition
            </p>
          </div>
          {checkResult?.isUpToDate === true && (
            <Badge className="text-sm bg-emerald-500/10 text-emerald-700 border-emerald-500/30 px-3 py-1.5">
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Up to Date
            </Badge>
          )}
          {checkResult?.isUpToDate === false && (
            <Badge className="text-sm bg-amber-500/10 text-amber-700 border-amber-500/30 px-3 py-1.5">
              <Download className="w-4 h-4 mr-1.5" /> Update Available: v
              {checkResult.fetchedVersion}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={() => void handleCheck()}
            disabled={checking || !isSuperAdmin}
            data-ocid="update.check_button"
          >
            {checking ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking…
              </>
            ) : (
              <>
                <RefreshCcw className="w-4 h-4 mr-2" />
                Check for Updates
              </>
            )}
          </Button>
          <Button variant="outline" asChild data-ocid="update.releases_link">
            <a href={GITHUB_RELEASES} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-1.5" /> View All Releases
            </a>
          </Button>
        </div>

        {checkResult?.checkedAt && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last checked:{" "}
            {new Date(checkResult.checkedAt).toLocaleString("en-IN")}
          </p>
        )}

        {/* Error State */}
        {checkResult?.error && (
          <div
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2"
            data-ocid="update.error_state"
          >
            <WifiOff className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">
              Could not reach update server: {checkResult.error}
            </p>
          </div>
        )}

        {/* Changelog */}
        {checkResult?.changelog && checkResult.changelog.length > 0 && (
          <div className="border-t pt-4">
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
              onClick={() => setShowChangelog((v) => !v)}
              data-ocid="update.changelog.toggle"
            >
              {showChangelog ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              What&apos;s New in v{checkResult.fetchedVersion}
            </button>
            {showChangelog && (
              <ul className="mt-3 space-y-1.5 animate-slide-up">
                {checkResult.changelog.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="text-emerald-600 mt-0.5 shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      {/* How to Update */}
      {checkResult?.isUpToDate === false && (
        <Card className="p-5 space-y-4 border-amber-500/30 bg-amber-500/5 animate-slide-up">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Download className="w-4 h-4 text-amber-600" /> How to Apply the
            Update
          </h3>
          <p className="text-xs text-muted-foreground">
            School Ledger ERP uses an automatic update system via Caffeine.
            Follow these steps:
          </p>
          <ol className="space-y-2">
            {[
              "Check for updates using the button above",
              "If an update is available, open your Caffeine project dashboard",
              "The new version will be deployed automatically to the Internet Computer",
              "Hard-refresh the browser (Ctrl+Shift+R) to load the new version",
            ].map((step, i) => (
              <li
                key={step}
                className="flex items-start gap-2 text-xs text-muted-foreground"
              >
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <Button variant="outline" asChild size="sm" className="w-fit">
            <a href={GITHUB_RELEASES} target="_blank" rel="noopener noreferrer">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download Latest Release
            </a>
          </Button>
        </Card>
      )}

      {/* Current Features */}
      <Card className="p-5 space-y-3">
        <button
          type="button"
          className="flex items-center justify-between w-full text-left"
          onClick={() => setShowFeatures((v) => !v)}
          data-ocid="update.features.toggle"
        >
          <h3 className="font-semibold text-foreground">
            What&apos;s Included in v{CURRENT_VERSION}
          </h3>
          {showFeatures ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        {showFeatures && (
          <ul className="space-y-1.5 animate-slide-up">
            {CURRENT_FEATURES.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Data storage info */}
      <Card className="p-4 bg-muted/30">
        <p className="text-xs text-muted-foreground">
          <Server className="w-3.5 h-3.5 inline mr-1.5" />
          <strong>Data Storage:</strong> All school data is stored natively in
          the Internet Computer canister. Data syncs automatically across all
          devices — no server setup or uploads required.
        </p>
      </Card>
    </div>
  );
}
