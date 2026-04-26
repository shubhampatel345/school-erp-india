import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CreditCard, IndianRupee, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import phpApiService from "../../utils/phpApiService";

interface GatewayConfig {
  enabled: boolean;
  upiId: string;
  apiKey: string;
  secretKey: string;
  merchantId: string;
}

interface PaymentGateways {
  gpay: GatewayConfig;
  razorpay: GatewayConfig;
  payu: GatewayConfig;
}

const DEFAULT: PaymentGateways = {
  gpay: {
    enabled: false,
    upiId: "",
    apiKey: "",
    secretKey: "",
    merchantId: "",
  },
  razorpay: {
    enabled: false,
    upiId: "",
    apiKey: "",
    secretKey: "",
    merchantId: "",
  },
  payu: {
    enabled: false,
    upiId: "",
    apiKey: "",
    secretKey: "",
    merchantId: "",
  },
};

const GATEWAY_META = {
  gpay: { label: "Google Pay / UPI", icon: "₹", color: "bg-green-500/10" },
  razorpay: { label: "Razorpay", icon: "R", color: "bg-blue-500/10" },
  payu: { label: "PayU", icon: "P", color: "bg-orange-500/10" },
};

export default function OnlinePaymentSettings() {
  const { addNotification } = useApp();
  const [gateways, setGateways] = useState<PaymentGateways>(DEFAULT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void phpApiService
      .getSettings()
      .then((s) => {
        if (s.payment_gateways) {
          try {
            const parsed =
              typeof s.payment_gateways === "string"
                ? (JSON.parse(s.payment_gateways) as PaymentGateways)
                : (s.payment_gateways as PaymentGateways);
            setGateways((prev) => ({ ...prev, ...parsed }));
          } catch {
            /* noop */
          }
        }
      })
      .catch(() => {
        /* noop */
      });
  }, []);

  const update = (
    gateway: keyof PaymentGateways,
    field: keyof GatewayConfig,
    value: string | boolean,
  ) => {
    setGateways((prev) => ({
      ...prev,
      [gateway]: { ...prev[gateway], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await phpApiService.saveSettings({
        payment_gateways: JSON.stringify(gateways),
      });
      addNotification("Payment settings saved", "success");
    } catch {
      addNotification("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-2xl space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <CreditCard className="w-5 h-5 text-primary" />
        <h2 className="font-display font-semibold text-foreground">
          Online Payment Gateways
        </h2>
      </div>

      {(Object.keys(GATEWAY_META) as (keyof PaymentGateways)[]).map((gw) => {
        const meta = GATEWAY_META[gw];
        const config = gateways[gw];
        return (
          <div
            key={gw}
            className="bg-card border border-border rounded-xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg ${meta.color} flex items-center justify-center font-bold text-foreground`}
                >
                  {meta.icon}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    {meta.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {config.enabled ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(v) => update(gw, "enabled", v)}
                data-ocid={`payment.${gw}_switch`}
              />
            </div>

            {config.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {gw === "gpay" && (
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      UPI ID
                    </Label>
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <Input
                        value={config.upiId}
                        onChange={(e) => update(gw, "upiId", e.target.value)}
                        placeholder="merchant@upi"
                        data-ocid={`payment.${gw}_upi_input`}
                      />
                    </div>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Merchant ID
                  </Label>
                  <Input
                    value={config.merchantId}
                    onChange={(e) => update(gw, "merchantId", e.target.value)}
                    placeholder="Merchant ID"
                    data-ocid={`payment.${gw}_merchant_input`}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    API Key
                  </Label>
                  <Input
                    value={config.apiKey}
                    onChange={(e) => update(gw, "apiKey", e.target.value)}
                    placeholder="API Key"
                    data-ocid={`payment.${gw}_apikey_input`}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Secret Key
                  </Label>
                  <Input
                    type="password"
                    value={config.secretKey}
                    onChange={(e) => update(gw, "secretKey", e.target.value)}
                    placeholder="Secret Key"
                    data-ocid={`payment.${gw}_secret_input`}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}

      <Button
        onClick={handleSave}
        disabled={saving}
        data-ocid="payment.submit_button"
      >
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Saving…" : "Save Payment Settings"}
      </Button>
    </div>
  );
}
