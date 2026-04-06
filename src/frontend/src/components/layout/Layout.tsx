import {
  ClipboardCheck,
  CreditCard,
  LayoutDashboard,
  Menu,
  Smartphone,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
  currentPath: string;
  navigate: (path: string) => void;
  isOnline: boolean;
  isSyncing: boolean;
  children: React.ReactNode;
}

// ─── PWA Install Banner ───────────────────────────────────────────────────────
function InstallBanner() {
  const [prompt, setPrompt] = useState<Event | null>(null);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem("erp_pwa_banner_dismissed") === "1",
  );

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!prompt || dismissed) return null;

  const handleInstall = async () => {
    const promptEvent = prompt as BeforeInstallPromptEvent;
    promptEvent.prompt();
    const result = await promptEvent.userChoice;
    if (result.outcome === "accepted") {
      setDismissed(true);
      localStorage.setItem("erp_pwa_banner_dismissed", "1");
    }
    setPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("erp_pwa_banner_dismissed", "1");
  };

  return (
    <div
      className="flex md:hidden items-center gap-2 px-3 py-2 text-xs"
      style={{
        background: "linear-gradient(90deg, #1e3a5f 0%, #1a2d4a 100%)",
        borderBottom: "1px solid #2563eb40",
      }}
      data-ocid="install.panel"
    >
      <Smartphone size={14} className="text-blue-400 flex-shrink-0" />
      <span className="text-blue-200 flex-1">
        📱 Install <strong>SHUBH SCHOOL ERP</strong> on your home screen
      </span>
      <button
        type="button"
        onClick={handleInstall}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded px-2.5 py-1 text-xs font-medium flex-shrink-0 transition"
        data-ocid="install.primary_button"
      >
        Install
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-gray-400 hover:text-white flex-shrink-0 p-0.5"
        data-ocid="install.close_button"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Bottom Navigation Bar (mobile only) ─────────────────────────────────────
interface BottomNavProps {
  currentPath: string;
  navigate: (path: string) => void;
  onMenuOpen: () => void;
}

function BottomNav({ currentPath, navigate, onMenuOpen }: BottomNavProps) {
  const tabs = [
    { icon: <LayoutDashboard size={20} />, label: "Home", path: "/" },
    { icon: <Users size={20} />, label: "Students", path: "/students" },
    { icon: <CreditCard size={20} />, label: "Fees", path: "/fees" },
    {
      icon: <ClipboardCheck size={20} />,
      label: "Attendance",
      path: "/attendance",
    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch"
      style={{
        background: "#1a1f2e",
        borderTop: "1px solid #374151",
        paddingBottom: "env(safe-area-inset-bottom)",
        height: "calc(60px + env(safe-area-inset-bottom))",
      }}
      data-ocid="bottom_nav.panel"
    >
      {tabs.map((tab) => {
        const isActive =
          currentPath === tab.path ||
          (tab.path !== "/" && currentPath.startsWith(tab.path));
        return (
          <button
            key={tab.path}
            type="button"
            onClick={() => navigate(tab.path)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors"
            style={{ color: isActive ? "#4ade80" : "#9ca3af" }}
            data-ocid={`bottom_nav.${tab.label.toLowerCase()}.tab`}
          >
            {tab.icon}
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        );
      })}
      {/* Menu button */}
      <button
        type="button"
        onClick={onMenuOpen}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors"
        style={{ color: "#9ca3af" }}
        data-ocid="bottom_nav.menu.button"
      >
        <Menu size={20} />
        <span className="text-[10px] font-medium">Menu</span>
      </button>
    </nav>
  );
}

// ─── BeforeInstallPromptEvent type ───────────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export function Layout({
  collapsed,
  onToggleSidebar,
  currentPath,
  navigate,
  isOnline,
  isSyncing,
  children,
}: LayoutProps) {
  const [viewingSession, setViewingSession] = useState<string>(
    () => localStorage.getItem("erp_viewing_session") || "",
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Track currentPath to close mobile sidebar on navigation
  const prevPathRef = useRef(currentPath);

  useEffect(() => {
    function handleSessionChange(e: CustomEvent) {
      setViewingSession(e.detail.session || "");
    }
    window.addEventListener(
      "erp_session_changed",
      handleSessionChange as EventListener,
    );
    return () =>
      window.removeEventListener(
        "erp_session_changed",
        handleSessionChange as EventListener,
      );
  }, []);

  // Close mobile sidebar when path changes
  if (prevPathRef.current !== currentPath) {
    prevPathRef.current = currentPath;
    setMobileSidebarOpen(false);
  }

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileSidebarOpen]);

  const handleMobileMenuOpen = () => {
    setMobileSidebarOpen(true);
  };

  const handleMobileClose = () => {
    setMobileSidebarOpen(false);
  };

  const handleToggleSidebar = () => {
    if (window.innerWidth < 768) {
      setMobileSidebarOpen((v) => !v);
    } else {
      onToggleSidebar();
    }
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#0f1117" }}
    >
      {/* Desktop sidebar (hidden on mobile) */}
      <div className="hidden md:flex">
        <Sidebar
          collapsed={collapsed}
          currentPath={currentPath}
          navigate={navigate}
          isMobileOpen={false}
          onMobileClose={() => {}}
        />
      </div>

      {/* Mobile sidebar drawer overlay */}
      {mobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-50"
          style={{ background: "rgba(0,0,0,0.6)" }}
          ref={backdropRef}
        >
          {/* Sidebar panel */}
          <div
            className="flex h-full absolute left-0 top-0"
            style={{ width: "220px" }}
          >
            <Sidebar
              collapsed={false}
              currentPath={currentPath}
              navigate={(path) => {
                navigate(path);
                handleMobileClose();
              }}
              isMobileOpen={mobileSidebarOpen}
              onMobileClose={handleMobileClose}
            />
          </div>
          {/* Full-screen backdrop button to close */}
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 w-full h-full cursor-default"
            style={{ background: "transparent" }}
            onClick={handleMobileClose}
          />
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header
          onToggleSidebar={handleToggleSidebar}
          isOnline={isOnline}
          isSyncing={isSyncing}
        />
        <InstallBanner />
        {viewingSession && (
          <div
            className="flex items-center justify-between px-4 py-1.5 text-xs font-medium"
            style={{
              background: "#78350f",
              color: "#fef3c7",
              borderBottom: "1px solid #92400e",
            }}
          >
            <span>
              📂 Viewing archived session: <strong>{viewingSession}</strong> —
              Read Only
            </span>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem("erp_viewing_session", "");
                setViewingSession("");
                window.dispatchEvent(
                  new CustomEvent("erp_session_changed", {
                    detail: { session: "" },
                  }),
                );
              }}
              className="underline hover:no-underline text-amber-200 hover:text-white transition"
            >
              Return to current session →
            </button>
          </div>
        )}
        <main
          className="flex-1 overflow-y-auto p-4"
          style={{
            background: "#0f1117",
            paddingBottom: "calc(1rem + 60px + env(safe-area-inset-bottom))",
          }}
        >
          {children}
        </main>
      </div>

      {/* Bottom navigation bar (mobile only) */}
      <BottomNav
        currentPath={currentPath}
        navigate={navigate}
        onMenuOpen={handleMobileMenuOpen}
      />
    </div>
  );
}
