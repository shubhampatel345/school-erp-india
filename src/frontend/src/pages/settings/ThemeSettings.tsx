import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Palette } from "lucide-react";
import { useEffect, useState } from "react";

interface Theme {
  id: string;
  name: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  swatches: string[];
  dataTheme?: string; // if uses data-theme attribute
}

// Themes matching the CSS variables defined in index.css
const THEMES: Theme[] = [
  {
    id: "default",
    name: "Default (Navy + Cyan)",
    description:
      "Deep navy primary with cyan accent — professional and trustworthy",
    primaryColor: "Navy Blue",
    accentColor: "Cyan",
    swatches: ["#f5f5fa", "#ffffff", "#1e2a5c", "#0bbfdc", "#e8eaf6"],
    dataTheme: undefined,
  },
  {
    id: "ocean",
    name: "Ocean (Deep Blue + Teal)",
    description: "Deep blue with vibrant teal — calm, focused, modern",
    primaryColor: "Deep Blue",
    accentColor: "Teal",
    swatches: ["#f0f4ff", "#ffffff", "#2c4aab", "#0fa89a", "#dce8ff"],
    dataTheme: "ocean",
  },
  {
    id: "forest",
    name: "Forest (Dark Green + Lime)",
    description: "Rich forest green with lime accent — natural and energetic",
    primaryColor: "Forest Green",
    accentColor: "Lime",
    swatches: ["#f2f9f3", "#ffffff", "#1a5c32", "#72c828", "#dcf0e0"],
    dataTheme: "forest",
  },
  {
    id: "rose",
    name: "Rose (Burgundy + Pink)",
    description: "Warm burgundy with coral/pink accent — elegant and vibrant",
    primaryColor: "Burgundy",
    accentColor: "Coral",
    swatches: ["#fff5f5", "#ffffff", "#8c1a3a", "#e85d30", "#fde8e8"],
    dataTheme: "rose",
  },
];

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  // Remove all theme data attributes
  root.removeAttribute("data-theme");
  root.classList.remove("dark");

  if (theme.dataTheme) {
    root.setAttribute("data-theme", theme.dataTheme);
  }
  // Default theme uses the base :root CSS variables — no attribute needed
}

export default function ThemeSettings() {
  const [activeTheme, setActiveTheme] = useState<string>(
    () => localStorage.getItem("shubh_erp_theme_v2") ?? "default",
  );

  // Apply saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem("shubh_erp_theme_v2") ?? "default";
    const theme = THEMES.find((t) => t.id === saved);
    if (theme) applyTheme(theme);
  }, []);

  function handleSelect(theme: Theme) {
    localStorage.setItem("shubh_erp_theme_v2", theme.id);
    setActiveTheme(theme.id);
    applyTheme(theme);
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl space-y-6">
      {/* Header */}
      <Card className="p-5 flex items-start gap-4 bg-primary/5 border-primary/20">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Palette className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-foreground">
            Theme Customization
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Choose a color theme for your ERP interface. Changes apply instantly
            and are saved per browser/device.
          </p>
        </div>
      </Card>

      {/* Theme Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {THEMES.map((theme) => {
          const isActive = activeTheme === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              data-ocid={`theme-select-${theme.id}`}
              onClick={() => handleSelect(theme)}
              className={`relative rounded-xl border-2 p-5 text-left transition-all hover:shadow-card cursor-pointer ${
                isActive
                  ? "border-primary shadow-card"
                  : "border-border hover:border-primary/40"
              }`}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-primary-foreground" />
                </div>
              )}

              {/* Color swatches */}
              <div className="flex gap-1.5 mb-4">
                {theme.swatches.map((color) => (
                  <div
                    key={color}
                    className="w-9 h-9 rounded-lg border border-border/40 shadow-sm flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {/* Mini UI Preview */}
              <div
                className="w-full h-12 rounded-lg mb-3 overflow-hidden flex"
                style={{ backgroundColor: theme.swatches[0] }}
              >
                <div
                  className="w-10 h-full flex-shrink-0"
                  style={{ backgroundColor: theme.swatches[2] }}
                />
                <div className="flex-1 p-2 space-y-1">
                  <div
                    className="h-2 rounded-full w-3/4"
                    style={{ backgroundColor: theme.swatches[2], opacity: 0.3 }}
                  />
                  <div
                    className="h-2 rounded-full w-1/2"
                    style={{ backgroundColor: theme.swatches[3], opacity: 0.5 }}
                  />
                </div>
                <div
                  className="w-7 h-4 rounded m-2 flex-shrink-0 self-start"
                  style={{ backgroundColor: theme.swatches[3] }}
                />
              </div>

              {/* Info */}
              <p className="font-semibold text-sm text-foreground">
                {theme.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {theme.description}
              </p>

              <div className="flex gap-2 mt-3">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: `${theme.swatches[2]}20`,
                    color: theme.swatches[2],
                  }}
                >
                  {theme.primaryColor}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: `${theme.swatches[3]}25`,
                    color: theme.swatches[3],
                  }}
                >
                  {theme.accentColor}
                </span>
              </div>

              {isActive ? (
                <div className="mt-3">
                  <span className="inline-block text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                    ✓ Active Theme
                  </span>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(theme);
                  }}
                >
                  Apply Theme
                </Button>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        💡 Theme preference is saved in this browser only. Each device can have
        its own theme. Super Admin can set a school-wide default by applying
        their preferred theme.
      </p>
    </div>
  );
}
