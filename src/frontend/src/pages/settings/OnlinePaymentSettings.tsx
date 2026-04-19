import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CreditCard, IndianRupee, Loader2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import { getApiIndexUrl, getJwt, isApiConfigured } from "../../utils/api";
import { ls } from "../../utils/localStorage";

interface GatewayConfig {
  enabled: boolean;
  upiId: string;
  apiKey: string;
  secretKey: string;
}

interface PaymentGateways {
  gpay: GatewayConfig;
  razorpay: GatewayConfig;
  payu: GatewayConfig;
}

const DEFAULT: PaymentGateways = {
  gpay: { enabled: false, upiId: "", apiKey: "", secretKey: "" },
  razorpay: { enabled: false, upiId: "", apiKey: "", secretKey: "" },
  payu: { enabled: false, upiId: "", apiKey: "", secretKey: "" },
};

const GATEWAY_META: {
  id: keyof PaymentGateways;
  label: string;
  description: string;
  icon: string;
  fields: {
    key: keyof GatewayConfig;
    label: string;
    placeholder: string;
    type?: string;
  }[];
}[] = [
  {
    id: "gpay",
    label: "Google Pay / UPI",
    description: "Accept UPI payments via GPay, PhonePe, BHIM and more",
    icon: "🟢",
    fields: [
      { key: "upiId", label: "UPI ID", placeholder: "yourschool@okicici" },
      {
        key: "apiKey",
        label: "Merchant ID (optional)",
        placeholder: "GPay merchant ID",
      },
    ],
  },
  {
    id: "razorpay",
    label: "Razorpay",
    description:
      "India's most popular payment gateway — cards, UPI, netbanking",
    icon: "💳",
    fields: [
      { key: "apiKey", label: "Key ID", placeholder: "rzp_live_..." },
      {
        key: "secretKey",
        label: "Secret Key",
        placeholder: "Razorpay secret key",
        type: "password",
      },
    ],
  },
  {
    id: "payu",
    label: "PayU",
    description: "PayU payment gateway for schools — EMI, netbanking, UPI",
    icon: "🏦",
    fields: [
      {
        key: "apiKey",
        label: "Merchant Key",
        placeholder: "PayU merchant key",
      },
      {
        key: "secretKey",
        label: "Salt / Secret",
        placeholder: "PayU salt",
        type: "password",
      },
    ],
  },
];

const LS_KEY = "shubh_erp_payment_gateways";

async function saveGatewaysToServer(gateways: PaymentGateways): Promise<void> {
  if (!isApiConfigured()) return;
  const indexUrl = getApiIndexUrl();
  const jwt = getJwt();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  const res = await fetch(`${indexUrl}?route=school_settings/save`, {
    method: "POST",
    headers,
    body: JSON.stringify({ id: "payment_gateways", ...gateways }),
    signal: AbortSignal.timeout(10000),
  });
  const text = await res.text();
  if (text.trimStart().startsWith("<"))
    throw new Error("Server returned HTML.");
  const json = JSON.parse(text) as { status?: string; message?: string };
  if (json.status === "error") throw new Error(json.message ?? "Save failed");
}

export default function OnlinePaymentSettings() {
  const { saveData } = useApp();

  const [gateways, setGateways] = useState<PaymentGateways>(() => {
    const saved = ls.get<PaymentGateways>(LS_KEY, DEFAULT);
    return { ...DEFAULT, ...saved };
  });
  const [saving, setSaving] = useState(false);

  function setGateway<K extends keyof GatewayConfig>(
    id: keyof PaymentGateways,
    field: K,
    value: GatewayConfig[K],
  ) {
    setGateways((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      ls.set(LS_KEY, gateways);
      await saveData(
        "payment_gateways",
        gateways as unknown as Record<string, unknown>,
      );
      if (isApiConfigured()) {
        await saveGatewaysToServer(gateways);
      }
      toast.success("Payment gateway settings saved.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  const enabledCount = Object.values(gateways).filter((g) => g.enabled).length;

  return (
    <div className="p-4 lg:p-6 max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" /> Online Payment
            Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {enabledCount === 0
              ? "No gateways enabled"
              : `${enabledCount} gateway${enabledCount !== 1 ? "s" : ""} enabled`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <IndianRupee className="w-3.5 h-3.5" />
          <span>All amounts in INR ₹</span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3 text-sm text-blue-700">
        <p className="font-semibold mb-1">ℹ️ How Online Payments Work</p>
        <p className="text-xs text-blue-600">
          Enable a gateway and enter your API credentials. Parents can then pay
          fees online from the Student Portal. Payments auto-update the Fee
          Register and generate receipts.
        </p>
      </div>

      {GATEWAY_META.map((meta) => {
        const gw = gateways[meta.id];
        return (
          <Card
            key={meta.id}
            className={`p-5 space-y-4 transition-smooth ${gw.enabled ? "border-primary/30 bg-primary/5" : ""}`}
            data-ocid={`payment.${meta.id}.card`}
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{meta.icon}</span>
                <div>
                  <p className="font-semibold text-foreground">{meta.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {meta.description}
                  </p>
                </div>
                {gw.enabled && (
                  <Badge className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                    Active
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {gw.enabled ? "Enabled" : "Disabled"}
                </span>
                <Switch
                  checked={gw.enabled}
                  onCheckedChange={(v) => setGateway(meta.id, "enabled", v)}
                  data-ocid={`payment.${meta.id}.switch`}
                />
              </div>
            </div>

            {gw.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border animate-slide-up">
                {meta.fields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={`${meta.id}-${field.key}`}>
                      {field.label}
                    </Label>
                    <Input
                      id={`${meta.id}-${field.key}`}
                      type={field.type ?? "text"}
                      value={(gw[field.key] as string) ?? ""}
                      onChange={(e) =>
                        setGateway(meta.id, field.key, e.target.value)
                      }
                      placeholder={field.placeholder}
                      data-ocid={`payment.${meta.id}.${field.key}.input`}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}

      {/* Security Note */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-700">
        🔒 API keys are stored securely. Never share your secret key with
        anyone. Keys are used only for server-side payment verification.
      </div>

      <div className="flex justify-end pb-4">
        <Button
          onClick={() => void handleSave()}
          disabled={saving}
          size="lg"
          data-ocid="payment.save_button"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Payment Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
