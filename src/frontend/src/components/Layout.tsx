import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { ls } from "../utils/localStorage";
import Header from "./Header";
import MobileNav from "./MobileNav";
import Sidebar from "./Sidebar";

interface LayoutProps {
  activePage: string;
  onNavigate: (page: string) => void;
  children: React.ReactNode;
}

export default function Layout({
  activePage,
  onNavigate,
  children,
}: LayoutProps) {
  const { currentSession } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initialize theme on app boot from localStorage
  useEffect(() => {
    const themeId = ls.get<string>("shubh_erp_theme", "default");
    const themeMap: Record<string, string> = {
      ocean: "ocean",
      forest: "forest",
      rose: "rose",
      "dark-navy": "dark",
      slate: "slate",
      purple: "purple",
      copper: "copper",
      cherry: "cherry",
      midnight: "midnight",
    };
    const root = document.documentElement;
    root.removeAttribute("data-theme");
    root.classList.remove("dark");
    if (themeId !== "default") {
      const dt = themeMap[themeId];
      if (dt === "dark") root.classList.add("dark");
      else if (dt) root.setAttribute("data-theme", dt);
    }
  }, []);

  const handleMenuToggle = () => setMobileMenuOpen((v) => !v);

  const handleNavigate = (page: string) => {
    if (page === "__menu__") {
      setMobileMenuOpen(true);
      return;
    }
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  const isArchived = currentSession?.isArchived;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header — elevated bg-card with border-b */}
      <Header onMenuToggle={handleMenuToggle} onNavigate={handleNavigate} />

      {/* Archived session banner */}
      {isArchived && (
        <div
          className="px-4 py-2 flex items-center justify-center gap-2 flex-shrink-0 z-30 text-sm font-medium"
          style={{
            background: "oklch(0.97 0.03 85)",
            borderBottom: "1px solid oklch(0.85 0.06 85)",
            color: "oklch(0.4 0.1 85)",
          }}
        >
          📁 Viewing archived session: <strong>{currentSession?.label}</strong>{" "}
          — Read Only
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar — dark navy, visible on md+ */}
        <div className="hidden md:block flex-shrink-0">
          <Sidebar activePage={activePage} onNavigate={handleNavigate} />
        </div>

        {/* Main Content Area — bg-background to contrast with card header */}
        <main
          className="flex-1 overflow-y-auto bg-background"
          id="main-content"
          data-ocid="main-content"
        >
          {/* Extra bottom padding on mobile for MobileNav */}
          <div className="min-h-full pb-20 md:pb-0">{children}</div>
        </main>
      </div>

      {/* Mobile Navigation — bottom fixed, hidden on md+ */}
      <MobileNav
        activePage={activePage}
        onNavigate={handleNavigate}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </div>
  );
}
