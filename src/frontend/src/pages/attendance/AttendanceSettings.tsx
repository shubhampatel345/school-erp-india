import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Bell,
  Brain,
  Cpu,
  Fingerprint,
  QrCode,
  Save,
  Settings,
  Wifi,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface AttendanceSettingsData {
  autoMarkPresent: boolean;
  lateThreshold: string;
  halfDayThreshold: string;
  biometricDeviceIp: string;
  biometricPort: string;
  rfidEnabled: boolean;
  qrEnabled: boolean;
  faceEnabled: boolean;
  biometricEnabled: boolean;
  sendAbsentAlert: boolean;
  sendLateAlert: boolean;
  alertChannel: "whatsapp" | "sms" | "none";
  cooldownMinutes: string;
}

const DEFAULTS: AttendanceSettingsData = {
  autoMarkPresent: false,
  lateThreshold: "09:30",
  halfDayThreshold: "13:00",
  biometricDeviceIp: "192.168.1.100",
  biometricPort: "4370",
  rfidEnabled: true,
  qrEnabled: true,
  faceEnabled: true,
  biometricEnabled: false,
  sendAbsentAlert: true,
  sendLateAlert: false,
  alertChannel: "whatsapp",
  cooldownMinutes: "30",
};

function loadSettings(): AttendanceSettingsData {
  try {
    const raw = localStorage.getItem("attendance_settings");
    if (raw)
      return {
        ...DEFAULTS,
        ...(JSON.parse(raw) as Partial<AttendanceSettingsData>),
      };
  } catch {}
  return DEFAULTS;
}

export default function AttendanceSettings() {
  const [settings, setSettings] =
    useState<AttendanceSettingsData>(loadSettings);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof AttendanceSettingsData>(
    key: K,
    value: AttendanceSettingsData[K],
  ) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    setSaving(true);
    try {
      localStorage.setItem("attendance_settings", JSON.stringify(settings));
      toast.success("Attendance settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Timing */}
      <Card className="p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold text-foreground">
            Timing &amp; Thresholds
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="late-threshold">Late After (time)</Label>
            <Input
              id="late-threshold"
              type="time"
              value={settings.lateThreshold}
              onChange={(e) => update("lateThreshold", e.target.value)}
              data-ocid="attendance-settings.late-threshold.input"
            />
            <p className="text-xs text-muted-foreground">
              Students arriving after this time are marked Late
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="halfday-threshold">Half Day After (time)</Label>
            <Input
              id="halfday-threshold"
              type="time"
              value={settings.halfDayThreshold}
              onChange={(e) => update("halfDayThreshold", e.target.value)}
              data-ocid="attendance-settings.halfday-threshold.input"
            />
            <p className="text-xs text-muted-foreground">
              Students arriving after this time are Half Day
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Auto-mark Present on QR/Face scan
            </p>
            <p className="text-xs text-muted-foreground">
              Automatically marks attendance without manual confirmation
            </p>
          </div>
          <Switch
            checked={settings.autoMarkPresent}
            onCheckedChange={(v) => update("autoMarkPresent", v)}
            data-ocid="attendance-settings.auto-mark.switch"
          />
        </div>
      </Card>

      {/* Scan Methods */}
      <Card className="p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold text-foreground">
            Scan Methods
          </h3>
        </div>

        <div className="space-y-4">
          {[
            {
              key: "qrEnabled" as const,
              icon: QrCode,
              label: "QR Code Scanner",
              desc: "Camera-based QR / barcode scanning",
            },
            {
              key: "faceEnabled" as const,
              icon: Brain,
              label: "AI Face Recognition",
              desc: "Camera auto-marks students on entry",
            },
            {
              key: "rfidEnabled" as const,
              icon: Wifi,
              label: "RFID / NFC Cards",
              desc: "RFID card tap attendance",
            },
            {
              key: "biometricEnabled" as const,
              icon: Fingerprint,
              label: "Biometric Device (ESSL/ZKTeco)",
              desc: "Fingerprint or iris biometric sync",
            },
          ].map(({ key, icon: Icon, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
              <Switch
                checked={settings[key] as boolean}
                onCheckedChange={(v) => update(key, v)}
                data-ocid={`attendance-settings.${key}.switch`}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Biometric Device */}
      {settings.biometricEnabled && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold text-foreground">
              Biometric Device Connection
            </h3>
            <Badge variant="secondary">ESSL / ZKTeco</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="device-ip">Device IP Address</Label>
              <Input
                id="device-ip"
                placeholder="192.168.1.100"
                value={settings.biometricDeviceIp}
                onChange={(e) => update("biometricDeviceIp", e.target.value)}
                data-ocid="attendance-settings.device-ip.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="device-port">Port</Label>
              <Input
                id="device-port"
                placeholder="4370"
                value={settings.biometricPort}
                onChange={(e) => update("biometricPort", e.target.value)}
                data-ocid="attendance-settings.device-port.input"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            The device must be on the same local network. Port 4370 is the
            default for ESSL and ZKTeco devices.
          </p>
        </Card>
      )}

      {/* Face Recognition */}
      {settings.faceEnabled && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold text-foreground">
              Face Recognition
            </h3>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="face-cooldown">
              Cooldown between re-detection (minutes)
            </Label>
            <Input
              id="face-cooldown"
              inputMode="decimal"
              placeholder="30"
              value={settings.cooldownMinutes}
              onChange={(e) => update("cooldownMinutes", e.target.value)}
              className="w-36"
              data-ocid="attendance-settings.face-cooldown.input"
            />
            <p className="text-xs text-muted-foreground">
              A student will not be re-detected within this cooldown period
            </p>
          </div>
        </Card>
      )}

      {/* Alert notifications */}
      <Card className="p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold text-foreground">
            Parent Alerts
          </h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Notify parents when child is absent
              </p>
              <p className="text-xs text-muted-foreground">
                Send automatic alert after attendance is saved
              </p>
            </div>
            <Switch
              checked={settings.sendAbsentAlert}
              onCheckedChange={(v) => update("sendAbsentAlert", v)}
              data-ocid="attendance-settings.absent-alert.switch"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Notify parents when child is late
              </p>
              <p className="text-xs text-muted-foreground">
                Send alert when student arrives after late threshold
              </p>
            </div>
            <Switch
              checked={settings.sendLateAlert}
              onCheckedChange={(v) => update("sendLateAlert", v)}
              data-ocid="attendance-settings.late-alert.switch"
            />
          </div>
        </div>

        {(settings.sendAbsentAlert || settings.sendLateAlert) && (
          <div className="space-y-1.5">
            <Label>Alert Channel</Label>
            <div className="flex gap-2 flex-wrap">
              {(["whatsapp", "sms", "none"] as const).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => update("alertChannel", ch)}
                  data-ocid={`attendance-settings.alert-channel-${ch}.toggle`}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors capitalize ${
                    settings.alertChannel === ch
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-muted-foreground border-border hover:border-foreground/30"
                  }`}
                >
                  {ch === "whatsapp"
                    ? "WhatsApp"
                    : ch === "sms"
                      ? "SMS"
                      : "None"}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          data-ocid="attendance-settings.save.button"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
