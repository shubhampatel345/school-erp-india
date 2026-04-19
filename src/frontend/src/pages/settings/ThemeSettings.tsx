import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Loader2, Palette, Save } from "lucide-react";
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
  primary: string;
  accent: string;
  swatches: string[];
}

const THEMES: ThemeDefinition[] = [
  {
    id: "default",
    name: "Navy Blue (Default)",
    description: "Deep navy primary with cyan accent — professional, trusted",
    primary: "#1e2a5c",
    accent: "#0bbfdc",
    swatches: ["#f5f5fa", "#ffffff", "#1e2a5c", "#0bbfdc", "#e8eaf6"],
  },
  {
    id: "ocean",
    name: "Ocean Blue",
    description: "Deep blue with vibrant teal — calm, focused, modern",
    dataTheme: "ocean",
    primary: "#2c4aab",
    accent: "#0fa89a",
    swatches: ["#f0f4ff", "#ffffff", "#2c4aab", "#0fa89a", "#dce8ff"],
  },
  {
    id: "forest",
    name: "Forest Green",
    description: "Rich forest green with lime — natural, energetic",
    dataTheme: "forest",
    primary: "#1a5c32",
    accent: "#72c828",
    swatches: ["#f2f9f3", "#ffffff", "#1a5c32", "#72c828", "#dcf0e0"],
  },
  {
    id: "rose",
    name: "Rose Burgundy",
    description: "Warm burgundy with coral — elegant and vibrant",
    dataTheme: "rose",
    primary: "#7a1040",
    accent: "#e84a2f",
    swatches: ["#fff5f8", "#ffffff", "#7a1040", "#e84a2f", "#fce0e8"],
  },
  {
    id: "dark-navy",
    name: "Dark Navy",
    description: "Dark mode with deep navy background — modern, refined",
    dataTheme: "dark",
    primary: "#3b82f6",
    accent: "#10b981",
    swatches: ["#0f172a", "#1e293b", "#3b82f6", "#10b981", "#334155"],
  },
];

const LS_KEY = "shubh_erp_theme";

function applyTheme(theme: ThemeDefinition) {
  const root = document.documentElement;
  // Remove previous data-theme attributes
  root.removeAttribute("data-theme");
  if (theme.dataTheme && theme.dataTheme !== "dark") {
    root.setAttribute("data-theme", theme.dataTheme);
  }
  // Dark mode
  if (theme.dataTheme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
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
  if (text.trimStart().startsWith("<")) return; // silently skip
  const json = JSON.parse(text) as { status?: string };
  if (json.status === "error") return;
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

  return (
    <div className="p-4 lg:p-6 max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Palette className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-display font-semibold text-foreground">
            Theme Settings
          </h2>
          <p className="text-sm text-muted-foreground">
            Choose a color theme for your School Ledger ERP
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {THEMES.map((theme) => {
          const isActive = currentTheme === theme.id;
          return (
            <Card
              key={theme.id}
              className={`p-4 cursor-pointer transition-smooth hover:shadow-card ${
                isActive
                  ? "border-2 border-primary shadow-card"
                  : "hover:border-primary/30"
              }`}
              onClick={() => void handleApply(theme)}
              data-ocid={`theme.${theme.id}.card`}
            >
              {/* Color swatches preview */}
              <div className="flex gap-1.5 mb-3">
                {theme.swatches.map((color) => (
                  <div
                    key={color}
                    className="w-7 h-7 rounded-full border border-border/50"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>

              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    {theme.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {theme.description}
                  </p>
                </div>
                {isActive && (
                  <Badge className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30 shrink-0">
                    <CheckCircle className="w-2.5 h-2.5 mr-1" />
                    Active
                  </Badge>
                )}
              </div>

              {/* Primary / Accent pill */}
              <div className="flex gap-2 mt-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: theme.primary }}
                  />
                  Primary
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: theme.accent }}
                  />
                  Accent
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
            Current theme:{" "}
            <strong className="text-foreground">
              {THEMES.find((t) => t.id === currentTheme)?.name ?? "Default"}
            </strong>
          </p>
          {saving && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground ml-auto" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 ml-6">
          Theme is saved and applied across all devices when using server sync.
        </p>
      </Card>

      {/* Manual Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => {
            const theme =
              THEMES.find((t) => t.id === currentTheme) ?? THEMES[0];
            void handleApply(theme);
          }}
          disabled={saving}
          data-ocid="theme.save_button"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Apply &amp; Save Theme
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
