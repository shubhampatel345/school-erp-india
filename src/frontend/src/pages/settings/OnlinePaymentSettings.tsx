import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CreditCard, IndianRupee, Save } from "lucide-react";
import { useState } from "react";
import { ls } from "../../utils/localStorage";

interface GatewayConfig {
  enabled: boolean;
  upiId: string;
  apiKey: string;
}

interface PaymentGateways {
  gpay: GatewayConfig;
  razorpay: GatewayConfig;
  payu: GatewayConfig;
}

const DEFAULT_GATEWAYS: PaymentGateways = {
  gpay: { enabled: false, upiId: "", apiKey: "" },
  razorpay: { enabled: false, upiId: "", apiKey: "" },
  payu: { enabled: false, upiId: "", apiKey: "" },
};

const GATEWAY_INFO: {
  id: keyof PaymentGateways;
  label: string;
  description: string;
  icon: string;
  upiLabel?: string;
  apiLabel?: string;
  upiPlaceholder?: string;
  apiPlaceholder?: string;
}[] = [
  {
    id: "gpay",
    label: "Google Pay (GPay / UPI)",
    description: "Accept UPI payments via Google Pay, PhonePe, BHIM and more",
    icon: "🟢",
    upiLabel: "UPI ID",
    upiPlaceholder: "yourschool@okicici",
    apiLabel: "Merchant ID (optional)",
    apiPlaceholder: "GPay merchant ID",
  },
  {
    id: "razorpay",
    label: "Razorpay",
    description: "Cards, UPI, Net Banking, Wallets, EMI",
    icon: "🔵",
    upiLabel: "Key ID",
    upiPlaceholder: "rzp_live_xxxxxxxxxxxxxxxx",
    apiLabel: "Key Secret",
    apiPlaceholder: "Razorpay key secret",
  },
  {
    id: "payu",
    label: "PayU",
    description: "Multi-method payment gateway — popular in India",
    icon: "🟠",
    upiLabel: "Merchant Key",
    upiPlaceholder: "PayU merchant key",
    apiLabel: "Merchant Salt",
    apiPlaceholder: "PayU merchant salt",
  },
];

export default function OnlinePaymentSettings() {
  const [gateways, setGateways] = useState<PaymentGateways>(() => {
    const saved = ls.get<Partial<PaymentGateways>>("online_payment_v2", {});
    return {
      gpay: { ...DEFAULT_GATEWAYS.gpay, ...(saved.gpay ?? {}) },
      razorpay: { ...DEFAULT_GATEWAYS.razorpay, ...(saved.razorpay ?? {}) },
      payu: { ...DEFAULT_GATEWAYS.payu, ...(saved.payu ?? {}) },
    };
  });
  const [saved, setSaved] = useState(false);

  function update(
    id: keyof PaymentGateways,
    field: keyof GatewayConfig,
    value: boolean | string,
  ) {
    setGateways((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
    setSaved(false);
  }

  function handleSave() {
    ls.set("online_payment_v2", gateways);
    // Also update legacy key for compatibility
    ls.set("online_payment", {
      gpay: gateways.gpay.enabled,
      razorpay: gateways.razorpay.enabled,
      payu: gateways.payu.enabled,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const enabledCount = Object.values(gateways).filter((g) => g.enabled).length;

  return (
    <div className="p-4 lg:p-6 max-w-2xl space-y-6">
      {/* Header Info */}
      <Card className="p-5 flex items-start gap-4 bg-primary/5 border-primary/20">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <IndianRupee className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="font-display font-semibold text-foreground">
            Online Fee Payment
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Enable payment gateways so parents and students can pay fees online.
            {enabledCount > 0
              ? ` ${enabledCount} gateway${enabledCount > 1 ? "s" : ""} active — "Pay Online" will appear in the fee portal.`
              : " All gateways currently disabled."}
          </p>
        </div>
      </Card>

      {/* Gateway Cards */}
      <div className="space-y-4">
        {GATEWAY_INFO.map((gw) => {
          const config = gateways[gw.id];
          return (
            <Card
              key={gw.id}
              className={`p-5 transition-all ${config.enabled ? "border-primary/30" : ""}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{gw.icon}</span>
                  <div>
                    <p className="font-semibold text-foreground">{gw.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {gw.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {config.enabled && (
                    <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
                      Active
                    </span>
                  )}
                  <Switch
                    data-ocid={`payment-toggle-${gw.id}`}
                    checked={config.enabled}
                    onCheckedChange={(v) => update(gw.id, "enabled", v)}
                  />
                </div>
              </div>

              {config.enabled && (
                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {gw.upiLabel && (
                      <div className="space-y-1.5">
                        <Label htmlFor={`${gw.id}-upi`} className="text-xs">
                          {gw.upiLabel}
                        </Label>
                        <Input
                          id={`${gw.id}-upi`}
                          data-ocid={`payment-${gw.id}-upi`}
                          value={config.upiId}
                          onChange={(e) =>
                            update(gw.id, "upiId", e.target.value)
                          }
                          placeholder={gw.upiPlaceholder}
                          className="text-sm"
                        />
                      </div>
                    )}
                    {gw.apiLabel && (
                      <div className="space-y-1.5">
                        <Label htmlFor={`${gw.id}-api`} className="text-xs">
                          {gw.apiLabel}
                        </Label>
                        <Input
                          id={`${gw.id}-api`}
                          data-ocid={`payment-${gw.id}-api`}
                          type="password"
                          value={config.apiKey}
                          onChange={(e) =>
                            update(gw.id, "apiKey", e.target.value)
                          }
                          placeholder={gw.apiPlaceholder}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded">
                    ℹ️ Demo integration — configure real API credentials with
                    your payment provider before going live.
                  </p>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {enabledCount > 0 && (
        <Card className="p-4 bg-accent/5 border-accent/20">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-accent" />
            <p className="text-sm text-foreground font-medium">
              Online Payment Active
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Students and parents will see "Pay Online" on their fee screen.
            Payments will auto-update the Fee Register and generate a receipt.
          </p>
        </Card>
      )}

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          data-ocid="payment-save"
          className={saved ? "bg-accent text-accent-foreground" : ""}
          size="lg"
        >
          <Save className="w-4 h-4 mr-2" />
          {saved ? "✓ Settings Saved!" : "Save Payment Settings"}
        </Button>
      </div>
    </div>
  );
}
