/**
 * Transport Module — Tab container
 * Tabs: Routes & Buses | Student Assignment | GPS Tracking
 */

import { Bus, Navigation, Users } from "lucide-react";
import { useState } from "react";
import GPSTracking from "./transport/GPSTracking";
import Routes from "./transport/Routes";
import StudentTransport from "./transport/StudentTransport";

const TABS = [
  { id: "routes", label: "Routes & Buses", icon: Bus },
  { id: "students", label: "Student Assignment", icon: Users },
  { id: "gps", label: "GPS Tracking", icon: Navigation },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Transport() {
  const [activeTab, setActiveTab] = useState<TabId>("routes");

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">
          Transport
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Manage bus routes, pickup points, student transport assignments and
          GPS tracking
        </p>
      </div>

      <div
        className="flex gap-1 bg-muted/50 rounded-xl p-1 flex-wrap"
        role="tablist"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-ocid={`transport.${tab.id}_tab`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div>
        {activeTab === "routes" && <Routes />}
        {activeTab === "students" && <StudentTransport />}
        {activeTab === "gps" && <GPSTracking />}
      </div>
    </div>
  );
}
