import { useState } from "react";
import CollectFees from "./fees/CollectFees";
import DueFees from "./fees/DueFees";
import FeeAccounts from "./fees/FeeAccounts";
import FeeHeadingPage from "./fees/FeeHeading";
import FeeRegister from "./fees/FeeRegister";
import FeesPlanPage from "./fees/FeesPlan";
import OnlineFees from "./fees/OnlineFees";

type FeeTab =
  | "collect"
  | "heading"
  | "plan"
  | "due"
  | "register"
  | "accounts"
  | "online";

const TABS: { id: FeeTab; label: string }[] = [
  { id: "collect", label: "Collect Fees" },
  { id: "heading", label: "Fee Heading" },
  { id: "plan", label: "Fees Plan" },
  { id: "due", label: "Due Fees" },
  { id: "register", label: "Fee Register" },
  { id: "accounts", label: "Accounts" },
  { id: "online", label: "Online Fees" },
];

interface FeesProps {
  initialTab?: string;
}

export default function Fees({ initialTab }: FeesProps) {
  const [activeTab, setActiveTab] = useState<FeeTab>(
    (initialTab as FeeTab) ?? "collect",
  );

  return (
    <div className="space-y-4">
      {/* Tab Nav */}
      <div className="bg-card border border-border rounded-xl p-1 flex gap-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            data-ocid={`fees-tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "collect" && <CollectFees />}
        {activeTab === "heading" && <FeeHeadingPage />}
        {activeTab === "plan" && <FeesPlanPage />}
        {activeTab === "due" && <DueFees />}
        {activeTab === "register" && <FeeRegister />}
        {activeTab === "accounts" && <FeeAccounts />}
        {activeTab === "online" && <OnlineFees />}
      </div>
    </div>
  );
}
