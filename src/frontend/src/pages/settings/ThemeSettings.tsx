import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Loader2, Palette, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import { getApiIndexUrl, getJwt, isApiConfigured } from "../../utils/api";
import { ls } from "../../utils/localStorage";

interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  dataTheme?: string;
  /** CSS oklch sidebar bg color for preview swatch */
  sidebarColor: string;
  /** CSS oklch accent color for preview highlights */
  accentColor: string;
  /** Hex colors for content area preview */
  contentBg: string;
  primary: string;
  accent: string;
}

const THEMES: ThemeDefinition[] = [
  {
    id: "default",
    name: "Navy Blue",
    description: "Deep navy sidebar, cyan accent — professional, trusted",
    sidebarColor: "oklch(0.15 0.05 265)",
    accentColor: "oklch(0.65 0.15 200)",
    contentBg: "#f8f9fc",
    primary: "#1e3a5f",
    accent: "#0bbfdc",
  },
  {
    id: "ocean",
    name: "Deep Ocean",
    description: "Dark blue sidebar, vibrant teal — calm and focused",
    dataTheme: "ocean",
    sidebarColor: "oklch(0.12 0.06 230)",
    accentColor: "oklch(0.58 0.18 175)",
    contentBg: "#f0f4ff",
    primary: "#2c4aab",
    accent: "#0fa89a",
  },
  {
    id: "forest",
    name: "Forest Green",
    description: "Rich dark green sidebar, lime accent — natural, energetic",
    dataTheme: "forest",
    sidebarColor: "oklch(0.13 0.05 145)",
    accentColor: "oklch(0.62 0.18 100)",
    contentBg: "#f2f9f3",
    primary: "#1a5c32",
    accent: "#72c828",
  },
  {
    id: "rose",
    name: "Sunset Rose",
    description: "Deep burgundy sidebar, coral accent — elegant, vibrant",
    dataTheme: "rose",
    sidebarColor: "oklch(0.14 0.06 350)",
    accentColor: "oklch(0.6 0.22 25)",
    contentBg: "#fff5f8",
    primary: "#7a1040",
    accent: "#e84a2f",
  },
  {
    id: "dark-navy",
    name: "Dark Night",
    description: "Near-black sidebar, purple accent — modern, refined",
    dataTheme: "dark",
    sidebarColor: "oklch(0.07 0.012 265)",
    accentColor: "oklch(0.55 0.2 285)",
    contentBg: "#0f172a",
    primary: "#7c3aed",
    accent: "#10b981",
  },
  {
    id: "slate",
    name: "Slate Gray",
    description: "Dark slate sidebar, cool blue accent — clean, minimal",
    dataTheme: "slate",
    sidebarColor: "oklch(0.16 0.03 240)",
    accentColor: "oklch(0.55 0.12 220)",
    contentBg: "#f4f6f9",
    primary: "#3b5bdb",
    accent: "#4dabf7",
  },
  {
    id: "purple",
    name: "Royal Purple",
    description: "Deep purple sidebar, violet accent — regal, premium",
    dataTheme: "purple",
    sidebarColor: "oklch(0.14 0.08 295)",
    accentColor: "oklch(0.65 0.22 295)",
    contentBg: "#faf5ff",
    primary: "#7c3aed",
    accent: "#a855f7",
  },
  {
    id: "copper",
    name: "Copper Bronze",
    description: "Dark brown sidebar, amber accent — warm, distinctive",
    dataTheme: "copper",
    sidebarColor: "oklch(0.16 0.05 40)",
    accentColor: "oklch(0.62 0.18 60)",
    contentBg: "#fdf8f0",
    primary: "#92400e",
    accent: "#f59e0b",
  },
  {
    id: "cherry",
    name: "Cherry Red",
    description: "Dark crimson sidebar, orange-red accent — bold, passionate",
    dataTheme: "cherry",
    sidebarColor: "oklch(0.15 0.07 15)",
    accentColor: "oklch(0.6 0.22 30)",
    contentBg: "#fff5f0",
    primary: "#b91c1c",
    accent: "#f97316",
  },
  {
    id: "midnight",
    name: "Midnight Teal",
    description: "Very dark teal sidebar, light teal accent — deep, cool",
    dataTheme: "midnight",
    sidebarColor: "oklch(0.1 0.05 200)",
    accentColor: "oklch(0.65 0.18 185)",
    contentBg: "#f0fdfa",
    primary: "#0d9488",
    accent: "#2dd4bf",
  },
];

const LS_KEY = "shubh_erp_theme";

export function applyTheme(theme: ThemeDefinition) {
  const root = document.documentElement;
  root.removeAttribute("data-theme");
  root.classList.remove("dark");
  if (theme.dataTheme === "dark") {
    root.classList.add("dark");
  } else if (theme.dataTheme) {
    root.setAttribute("data-theme", theme.dataTheme);
  }
}

async function saveThemeToServer(themeId: string): Promise<void> {
  if (!isApiConfigured()) return;
  const indexUrl = getApiIndexUrl();
  const jwt = getJwt();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  const res = await fetch(`${indexUrl}?route=school_settings/save`, {
    method: "POST",
    headers,
    body: JSON.stringify({ id: "theme_settings", theme: themeId }),
    signal: AbortSignal.timeout(10000),
  });
  const text = await res.text();
  if (text.trimStart().startsWith("<")) return;
  const json = JSON.parse(text) as { status?: string };
  if (json.status === "error") return;
}

/** Sidebar mini-preview: shows a fake sidebar with colored items */
function SidebarPreview({
  theme,
  isActive,
}: {
  theme: ThemeDefinition;
  isActive: boolean;
}) {
  const fakeItems = ["Dashboard", "Students", "Fees", "Attendance", "Settings"];
  return (
    <div
      className="w-20 rounded-md overflow-hidden flex-shrink-0 shadow-sm"
      style={{
        backgroundColor: theme.sidebarColor,
        border: isActive
          ? `2px solid ${theme.accent}`
          : "2px solid transparent",
      }}
    >
      {/* Mini logo bar */}
      <div
        className="h-5 px-1.5 flex items-center gap-1"
        style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
      >
        <div
          className="w-2.5 h-2.5 rounded-sm"
          style={{ backgroundColor: theme.accentColor }}
        />
        <div className="w-8 h-1 rounded-full bg-white/40" />
      </div>
      {/* Mini nav items */}
      <div className="p-1 space-y-0.5">
        {fakeItems.map((label, i) => (
          <div
            key={label}
            className="h-3.5 rounded-sm flex items-center px-1 gap-1"
            style={{
              backgroundColor:
                i === 0
                  ? `${theme.accentColor.replace(")", " / 0.35)")}`
                  : "transparent",
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-sm flex-shrink-0"
              style={{
                backgroundColor:
                  i === 0 ? theme.accentColor : "rgba(255,255,255,0.4)",
              }}
            />
            <div
              className="flex-1 h-0.5 rounded-full"
              style={{
                backgroundColor:
                  i === 0 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ThemeSettings() {
  const { saveData } = useApp();
  const [currentTheme, setCurrentTheme] = useState<string>(() =>
    ls.get<string>(LS_KEY, "default"),
  );
  const [saving, setSaving] = useState(false);

  // Apply saved theme on mount
  useEffect(() => {
    const theme = THEMES.find((t) => t.id === currentTheme) ?? THEMES[0];
    applyTheme(theme);
  }, [currentTheme]);

  async function handleApply(theme: ThemeDefinition) {
    setCurrentTheme(theme.id);
    applyTheme(theme);
    setSaving(true);
    try {
      ls.set(LS_KEY, theme.id);
      await saveData("theme_settings", {
        id: "theme_settings",
        theme: theme.id,
      } as Record<string, unknown>);
      if (isApiConfigured()) {
        await saveThemeToServer(theme.id).catch(() => {});
      }
      toast.success(`Theme applied: ${theme.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save theme.");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    void handleApply(THEMES[0]);
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Palette className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-display font-semibold text-foreground">
              Theme Settings
            </h2>
            <p className="text-sm text-muted-foreground">
              Choose a color theme — sidebar is always dark for readability
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          data-ocid="theme.reset_button"
          className="gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {THEMES.map((theme) => {
          const active = currentTheme === theme.id;
          return (
            <Card
              key={theme.id}
              className={`p-3 cursor-pointer transition-smooth hover:shadow-card ${
                active
                  ? "border-2 border-primary shadow-card"
                  : "hover:border-primary/30"
              }`}
              onClick={() => void handleApply(theme)}
              data-ocid={`theme.${theme.id}.card`}
            >
              <div className="flex gap-3">
                {/* Sidebar mini-preview */}
                <SidebarPreview theme={theme} isActive={active} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <p className="font-semibold text-foreground text-sm leading-tight">
                      {theme.name}
                    </p>
                    {active && (
                      <Badge className="text-[9px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30 shrink-0 px-1 py-0">
                        <CheckCircle className="w-2 h-2 mr-0.5" />
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {theme.description}
                  </p>
                  {/* Color dots */}
                  <div className="flex gap-1.5 mt-2">
                    <div
                      className="w-4 h-4 rounded-full border border-border/40 shadow-sm"
                      style={{ backgroundColor: theme.primary }}
                      title="Primary"
                    />
                    <div
                      className="w-4 h-4 rounded-full border border-border/40 shadow-sm"
                      style={{ backgroundColor: theme.accent }}
                      title="Accent"
                    />
                    <div
                      className="w-4 h-4 rounded-full border border-border/40 shadow-sm"
                      style={{ backgroundColor: theme.contentBg }}
                      title="Content background"
                    />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Current theme info */}
      <Card className="p-4 bg-muted/30 border-dashed">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Active theme:{" "}
            <strong className="text-foreground">
              {THEMES.find((t) => t.id === currentTheme)?.name ?? "Default"}
            </strong>
          </p>
          {saving && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground ml-auto" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 ml-6">
          Themes are saved to localStorage and applied instantly on every device
          when server sync is active.
        </p>
      </Card>
    </div>
  );
}
