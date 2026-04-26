import { Check, Palette } from "lucide-react";
import { useEffect, useState } from "react";
import { THEMES, type ThemeId } from "../../types";

const THEME_COLORS: Record<
  string,
  { bg: string; accent: string; sidebar: string }
> = {
  default: { bg: "#e8eaf6", accent: "#3949ab", sidebar: "#1a237e" },
  ocean: { bg: "#e3f2fd", accent: "#0288d1", sidebar: "#01579b" },
  forest: { bg: "#e8f5e9", accent: "#388e3c", sidebar: "#1b5e20" },
  rose: { bg: "#fce4ec", accent: "#c2185b", sidebar: "#880e4f" },
  "dark-navy": { bg: "#1a1a2e", accent: "#7c4dff", sidebar: "#0d0d1a" },
  slate: { bg: "#e8eaf0", accent: "#455a64", sidebar: "#263238" },
  purple: { bg: "#f3e5f5", accent: "#7b1fa2", sidebar: "#4a148c" },
  copper: { bg: "#fff8e1", accent: "#e65100", sidebar: "#3e2723" },
  cherry: { bg: "#fbe9e7", accent: "#bf360c", sidebar: "#3e1a12" },
  midnight: { bg: "#e0f7fa", accent: "#00695c", sidebar: "#002a23" },
};

function applyTheme(themeId: string) {
  const html = document.documentElement;
  html.removeAttribute("data-theme");
  html.classList.remove("dark");
  if (themeId === "dark-navy") {
    html.classList.add("dark");
    html.setAttribute("data-theme", "dark");
  } else if (themeId !== "default") {
    html.setAttribute("data-theme", themeId);
  }
}

export default function ThemeSettings() {
  const [current, setCurrent] = useState<ThemeId>(() => {
    try {
      return (localStorage.getItem("shubh_erp_theme") as ThemeId) ?? "default";
    } catch {
      return "default";
    }
  });

  useEffect(() => {
    applyTheme(current);
  }, [current]);

  const handleSelect = (id: ThemeId) => {
    setCurrent(id);
    applyTheme(id);
    try {
      localStorage.setItem("shubh_erp_theme", id);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-3xl space-y-6">
      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <Palette className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-display font-semibold text-foreground">
              Color Themes
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select a theme — applies immediately and persists across sessions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {THEMES.map((theme) => {
            const colors = THEME_COLORS[theme.id] ?? THEME_COLORS.default;
            const isSelected = current === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                data-ocid={`theme.${theme.id}_button`}
                onClick={() => handleSelect(theme.id as ThemeId)}
                className={`relative rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02] ${
                  isSelected
                    ? "border-primary shadow-elevated"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {/* Preview */}
                <div
                  className="h-20 w-full flex"
                  style={{ background: colors.bg }}
                >
                  <div
                    className="w-8 h-full flex flex-col gap-1 p-1"
                    style={{ background: colors.sidebar }}
                  >
                    {["s1", "s2", "s3", "s4", "s5"].map((sk, i) => (
                      <div
                        key={sk}
                        className="h-1.5 rounded-sm opacity-70"
                        style={{
                          background: colors.accent,
                          width: i === 0 ? "100%" : "70%",
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex-1 p-2 flex flex-col gap-1">
                    <div
                      className="h-3 w-3/4 rounded-sm"
                      style={{ background: colors.accent, opacity: 0.8 }}
                    />
                    <div className="h-2 w-1/2 rounded-sm bg-current opacity-20" />
                    <div className="mt-auto flex gap-1">
                      {["b1", "b2", "b3"].map((bk, i) => (
                        <div
                          key={bk}
                          className="h-4 flex-1 rounded-sm"
                          style={{
                            background: colors.accent,
                            opacity: 0.3 + i * 0.15,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-card px-2 py-1.5 text-left">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {theme.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {theme.description}
                  </p>
                </div>

                {isSelected && (
                  <div
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: colors.accent }}
                  >
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <strong>Current:</strong>{" "}
          {THEMES.find((t) => t.id === current)?.label ?? "Navy Blue"} — theme
          is saved in your browser and applies automatically on next visit.
        </p>
      </div>
    </div>
  );
}
