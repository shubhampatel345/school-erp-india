import { useState } from "react";
import { useApp } from "../context/AppContext";
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMenuToggle = () => {
    if (window.innerWidth < 1024) {
      setMobileMenuOpen((v) => !v);
    } else {
      setSidebarCollapsed((v) => !v);
    }
  };

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
      {/* Header — visually elevated with bg-card */}
      <Header onMenuToggle={handleMenuToggle} />

      {/* Archived session read-only banner */}
      {isArchived && (
        <div className="session-banner px-4 py-2 flex items-center justify-center gap-2 flex-shrink-0 z-30">
          <span className="text-sm font-medium">
            📁 Viewing archived session:{" "}
            <strong>{currentSession?.label}</strong> — Read Only
          </span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar — dark navy */}
        <div className="hidden lg:block flex-shrink-0">
          <Sidebar
            activePage={activePage}
            onNavigate={handleNavigate}
            collapsed={sidebarCollapsed}
          />
        </div>

        {/* Main Content Area */}
        <main
          className="flex-1 overflow-y-auto bg-background"
          id="main-content"
        >
          <div className="min-h-full pb-20 lg:pb-0">{children}</div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        activePage={activePage}
        onNavigate={handleNavigate}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </div>
  );
}
