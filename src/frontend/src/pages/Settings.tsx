import {
  Bell,
  BellRing,
  Bot,
  Clock,
  CreditCard,
  Database,
  MessageSquare,
  Palette,
  School,
  Server,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useApp } from "../context/AppContext";
import DataManagement from "./settings/DataManagement";
import NotificationScheduler from "./settings/NotificationScheduler";
import OnlinePaymentSettings from "./settings/OnlinePaymentSettings";
import PermissionManagement from "./settings/PermissionManagement";
import PushNotifications from "./settings/PushNotifications";
import SchoolProfile from "./settings/SchoolProfile";
import ServerOnlineSync from "./settings/ServerOnlineSync";
import SessionManagement from "./settings/SessionManagement";
import SystemUpdate from "./settings/SystemUpdate";
import ThemeSettings from "./settings/ThemeSettings";
import UserManagement from "./settings/UserManagement";
import WhatsAppAutoReply from "./settings/WhatsAppAutoReply";
import WhatsAppSettings from "./settings/WhatsAppSettings";

const TABS = [
  { id: "profile", label: "School Profile", icon: School },
  { id: "themes", label: "Themes", icon: Palette },
  { id: "users", label: "User Management", icon: Users, superAdminOnly: true },
  { id: "sessions", label: "Sessions", icon: Clock },
  {
    id: "permissions",
    label: "Permissions",
    icon: ShieldCheck,
    superAdminOnly: true,
  },
  {
    id: "whatsapp",
    label: "WhatsApp API",
    icon: MessageSquare,
    superAdminOnly: true,
  },
  {
    id: "whatsapp-bot",
    label: "WhatsApp Bot",
    icon: Bot,
    superAdminOnly: true,
  },
  { id: "payment", label: "Online Payment", icon: CreditCard },
  {
    id: "server",
    label: "Server & Sync",
    icon: Server,
    superAdminOnly: true,
  },
  { id: "notifications", label: "Notification Scheduler", icon: Bell },
  { id: "push", label: "Push Notifications", icon: BellRing },
  {
    id: "data",
    label: "Backup & Restore",
    icon: Database,
    superAdminOnly: true,
  },
  {
    id: "update",
    label: "System Update",
    icon: Sparkles,
    superAdminOnly: true,
  },
];

interface SettingsProps {
  onNavigate?: (page: string) => void;
  initialTab?: string;
}

const SETTINGS_TAB_MAP: Record<string, string> = {
  profile: "profile",
  themes: "themes",
  sessions: "sessions",
  whatsapp: "whatsapp",
  "online-payment": "payment",
  notifications: "notifications",
  push: "push",
  users: "users",
  permissions: "permissions",
  data: "data",
  update: "update",
  server: "server",
};

export default function Settings({
  onNavigate: _onNavigate,
  initialTab,
}: SettingsProps) {
  const { currentUser } = useApp();
  const resolvedTab = initialTab
    ? (SETTINGS_TAB_MAP[initialTab] ?? initialTab)
    : "profile";
  const [activeTab, setActiveTab] = useState(resolvedTab);
  const isSuperAdmin = currentUser?.role === "superadmin";

  const visibleTabs = TABS.filter((t) => {
    if (t.superAdminOnly) return isSuperAdmin;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="bg-card border-b px-4 lg:px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-display font-semibold text-foreground">
            Settings
          </h1>
          <p className="text-xs text-muted-foreground">
            Configure your school ERP
          </p>
        </div>
      </div>

      <div className="bg-card border-b px-4 lg:px-6 flex gap-1 overflow-x-auto scrollbar-thin">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              data-ocid={`settings.tab.${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto bg-background">
        {activeTab === "profile" && <SchoolProfile />}
        {activeTab === "themes" && <ThemeSettings />}
        {activeTab === "users" && isSuperAdmin && <UserManagement />}
        {activeTab === "sessions" && <SessionManagement />}
        {activeTab === "permissions" && isSuperAdmin && (
          <PermissionManagement />
        )}
        {activeTab === "whatsapp" && isSuperAdmin && <WhatsAppSettings />}
        {activeTab === "whatsapp-bot" && isSuperAdmin && <WhatsAppAutoReply />}
        {activeTab === "payment" && <OnlinePaymentSettings />}
        {activeTab === "server" && isSuperAdmin && <ServerOnlineSync />}
        {activeTab === "notifications" && <NotificationScheduler />}
        {activeTab === "push" && <PushNotifications />}
        {activeTab === "data" && isSuperAdmin && <DataManagement />}
        {activeTab === "update" && isSuperAdmin && <SystemUpdate />}
      </div>
    </div>
  );
}
