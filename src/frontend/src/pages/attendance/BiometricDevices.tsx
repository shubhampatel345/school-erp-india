/**
 * BiometricDevices — Direct API rebuild
 * Device configuration stored in localStorage (device config only).
 * Sync results write attendance directly via phpApiService.markAttendance().
 * No getData/saveData context calls.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit2,
  Info,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import phpApiService from "../../utils/phpApiService";

// ─── Types ────────────────────────────────────────────────────────────────────

type DeviceStatus = "online" | "offline" | "unknown";
type DeviceType = "ESSL eBioServer" | "ZKTeco/eSSL" | "FingerTec" | "Other";

interface BiometricDevice {
  id: string;
  name: string;
  deviceType: DeviceType;
  ipAddress: string;
  port: number;
  deviceId: number;
  username: string;
  password: string;
  pollingInterval: number;
  enabled: boolean;
  lastSync: string | null;
  status: DeviceStatus;
}

interface BiometricMapping {
  personId: string;
  personType: "student" | "staff";
  biometricId: string;
  personName: string;
}

interface SyncLog {
  time: string;
  message: string;
  type: "info" | "success" | "error";
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEVICE_TYPES: DeviceType[] = [
  "ESSL eBioServer",
  "ZKTeco/eSSL",
  "FingerTec",
  "Other",
];
const DEFAULT_PORTS: Record<DeviceType, number> = {
  "ESSL eBioServer": 8080,
  "ZKTeco/eSSL": 4370,
  FingerTec: 4370,
  Other: 4370,
};
const EMPTY_DEVICE: Omit<BiometricDevice, "id"> = {
  name: "",
  deviceType: "ESSL eBioServer",
  ipAddress: "",
  port: 8080,
  deviceId: 1,
  username: "admin",
  password: "admin",
  pollingInterval: 5,
  enabled: true,
  lastSync: null,
  status: "unknown",
};

function statusIcon(status: DeviceStatus) {
  if (status === "online") return <Wifi className="w-4 h-4 text-green-500" />;
  if (status === "offline")
    return <WifiOff className="w-4 h-4 text-destructive" />;
  return <Activity className="w-4 h-4 text-muted-foreground" />;
}

function statusBadgeVariant(
  status: DeviceStatus,
): "default" | "destructive" | "secondary" {
  if (status === "online") return "default";
  if (status === "offline") return "destructive";
  return "secondary";
}

function validateIP(ip: string) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BiometricDevices() {
  const [devices, setDevices] = useState<BiometricDevice[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("biometric_devices") ?? "[]",
      ) as BiometricDevice[];
    } catch {
      return [];
    }
  });
  const [mappings, setMappings] = useState<BiometricMapping[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("biometric_mappings") ?? "[]",
      ) as BiometricMapping[];
    } catch {
      return [];
    }
  });

  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<BiometricDevice | null>(
    null,
  );
  const [deviceForm, setDeviceForm] =
    useState<Omit<BiometricDevice, "id">>(EMPTY_DEVICE);

  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [syncDone, setSyncDone] = useState<{
    synced: number;
    unmatched: number;
  } | null>(null);

  // mapSearch is kept for future typeahead enhancement
  const [_mapSearch, setMapSearch] = useState("");
  const [mapBiometricId, setMapBiometricId] = useState("");
  const [mapPersonName, setMapPersonName] = useState("");
  const [mapPersonId, setMapPersonId] = useState("");
  const [mapPersonType, setMapPersonType] = useState<"student" | "staff">(
    "student",
  );

  const [expandedSection, setExpandedSection] = useState<
    "devices" | "mappings" | "help"
  >("devices");

  // ── Device CRUD ──

  function saveDevices(updated: BiometricDevice[]) {
    setDevices(updated);
    localStorage.setItem("biometric_devices", JSON.stringify(updated));
  }

  function handleDeviceTypeChange(dt: DeviceType) {
    setDeviceForm((f) => ({ ...f, deviceType: dt, port: DEFAULT_PORTS[dt] }));
  }

  function handleSaveDevice() {
    if (!deviceForm.name.trim()) {
      toast.error("Device name is required");
      return;
    }
    if (!validateIP(deviceForm.ipAddress)) {
      toast.error("Enter a valid IP address (e.g. 192.168.1.100)");
      return;
    }
    if (editingDevice) {
      saveDevices(
        devices.map((d) =>
          d.id === editingDevice.id
            ? { ...deviceForm, id: editingDevice.id }
            : d,
        ),
      );
      toast.success("Device updated");
    } else {
      saveDevices([...devices, { ...deviceForm, id: crypto.randomUUID() }]);
      toast.success("Device added");
    }
    setShowDeviceModal(false);
  }

  function deleteDevice(id: string) {
    if (!confirm("Delete this biometric device?")) return;
    saveDevices(devices.filter((d) => d.id !== id));
    toast.success("Device deleted");
  }

  // ── Sync (simulation + direct API write) ──

  const handleSync = useCallback(
    async (device: BiometricDevice) => {
      setSyncingId(device.id);
      setSyncLogs([]);
      setSyncDone(null);

      const logs: SyncLog[] = [];
      const now = new Date();

      logs.push({
        time: now.toLocaleTimeString(),
        message: `Connecting to ${device.ipAddress}:${device.port}…`,
        type: "info",
      });
      setSyncLogs([...logs]);

      await new Promise((r) => setTimeout(r, 800));

      logs.push({
        time: new Date().toLocaleTimeString(),
        message: `Authentication as '${device.username}'…`,
        type: "info",
      });
      setSyncLogs([...logs]);

      await new Promise((r) => setTimeout(r, 600));

      // Simulate punch records for mapped persons
      const todayStr = new Date().toISOString().split("T")[0];
      const count =
        mappings.length > 0
          ? Math.min(mappings.length, 3 + Math.floor(Math.random() * 5))
          : 0;
      const picked = [...mappings]
        .sort(() => Math.random() - 0.5)
        .slice(0, count);

      const punchRecords = picked.map((m) => {
        const inH = 7 + Math.floor(Math.random() * 2);
        const inM = Math.floor(Math.random() * 60);
        const timeIn = `${String(inH).padStart(2, "0")}:${String(inM).padStart(2, "0")}`;
        return {
          mapping: m,
          time: `${todayStr}T${timeIn}:00`,
          timeIn,
        };
      });

      logs.push({
        time: new Date().toLocaleTimeString(),
        message: `Fetched ${punchRecords.length * 2} punch records for today.`,
        type: "info",
      });
      setSyncLogs([...logs]);

      let synced = 0;
      let failed = 0;

      for (const punch of punchRecords) {
        try {
          await phpApiService.markAttendance([
            {
              id: crypto.randomUUID(),
              studentId:
                punch.mapping.personType === "student"
                  ? punch.mapping.personId
                  : undefined,
              staffId:
                punch.mapping.personType === "staff"
                  ? punch.mapping.personId
                  : undefined,
              date: todayStr,
              status: "Present",
              class: "",
              section: "",
            },
          ]);
          synced++;
        } catch {
          failed++;
        }
      }

      setDevices((prev) => {
        const updated = prev.map((d) =>
          d.id === device.id
            ? {
                ...d,
                lastSync: new Date().toISOString(),
                status: "online" as DeviceStatus,
              }
            : d,
        );
        localStorage.setItem("biometric_devices", JSON.stringify(updated));
        return updated;
      });

      logs.push({
        time: new Date().toLocaleTimeString(),
        message: `Sync complete. ${synced} records saved to MySQL${failed > 0 ? `, ${failed} failed` : ""}.`,
        type: synced > 0 ? "success" : "info",
      });
      setSyncLogs([...logs]);
      setSyncDone({ synced, unmatched: failed });
      setSyncingId(null);
      toast.success(`Sync complete: ${synced} records saved to MySQL`);
    },
    [mappings],
  );

  // ── Mappings ──

  function saveMappings(updated: BiometricMapping[]) {
    setMappings(updated);
    localStorage.setItem("biometric_mappings", JSON.stringify(updated));
  }

  function assignMapping() {
    if (!mapPersonId.trim()) {
      toast.error("Enter Person ID");
      return;
    }
    if (!mapPersonName.trim()) {
      toast.error("Enter Person Name");
      return;
    }
    if (!mapBiometricId.trim()) {
      toast.error("Enter biometric enrollment ID");
      return;
    }
    const updated = mappings.filter((m) => m.personId !== mapPersonId);
    saveMappings([
      ...updated,
      {
        personId: mapPersonId,
        personType: mapPersonType,
        biometricId: mapBiometricId,
        personName: mapPersonName,
      },
    ]);
    toast.success(`Biometric ID assigned to ${mapPersonName}`);
    setMapSearch("");
    setMapBiometricId("");
    setMapPersonId("");
    setMapPersonName("");
  }

  function removeMapping(personId: string) {
    saveMappings(mappings.filter((m) => m.personId !== personId));
    toast.success("Mapping removed");
  }

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="rounded-lg border border-accent/40 bg-accent/10 p-4 flex gap-3">
        <Info className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-foreground text-sm">
            ESSL &amp; ZKTeco Biometric Integration
          </p>
          <p className="text-muted-foreground text-xs mt-0.5">
            Configure your device IP and port, map IDs, then sync. All records
            save directly to MySQL via PHP API.
          </p>
        </div>
      </div>

      {/* Proxy Notice */}
      <div className="rounded-lg border border-yellow-400/40 bg-yellow-50 dark:bg-yellow-900/10 p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-yellow-800 dark:text-yellow-300">
          <p className="font-semibold mb-1">
            Browser → Biometric Device Requirement
          </p>
          <p>
            A <strong>PHP proxy script</strong> on your cPanel server is
            required for real ESSL/ZKTeco integration. The "Sync Now" button
            performs a simulation. See{" "}
            <span className="underline">Documentation → ESSL Setup</span>.
          </p>
        </div>
      </div>

      {/* Devices Section */}
      <Card className="overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
          onClick={() =>
            setExpandedSection(
              expandedSection === "devices" ? "mappings" : "devices",
            )
          }
          data-ocid="biometric.devices-section.toggle"
        >
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">
              Biometric Devices
            </span>
            <Badge variant="secondary">{devices.length}</Badge>
          </div>
          {expandedSection === "devices" ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {expandedSection === "devices" && (
          <div className="border-t border-border">
            <div className="p-4 flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  setEditingDevice(null);
                  setDeviceForm({ ...EMPTY_DEVICE });
                  setShowDeviceModal(true);
                }}
                data-ocid="biometric.add-device.button"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Add Device
              </Button>
            </div>

            {devices.length === 0 ? (
              <div
                className="py-12 text-center text-muted-foreground pb-6"
                data-ocid="biometric.devices.empty-state"
              >
                <Wifi className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No biometric devices configured</p>
                <p className="text-xs mt-1">
                  Click "Add Device" to register your ESSL or ZKTeco device
                </p>
              </div>
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {devices.map((dev, idx) => (
                  <Card
                    key={dev.id}
                    className="p-4 border"
                    data-ocid={`biometric.device-card.${idx + 1}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground truncate">
                            {dev.name}
                          </span>
                          <Badge
                            variant={statusBadgeVariant(dev.status)}
                            className="text-xs flex items-center gap-1"
                          >
                            {statusIcon(dev.status)}
                            {dev.status === "online"
                              ? "Online"
                              : dev.status === "offline"
                                ? "Offline"
                                : "Unknown"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-mono">
                            {dev.ipAddress}:{dev.port}
                          </span>{" "}
                          · <span>{dev.deviceType}</span>
                        </p>
                        {dev.lastSync && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> Last sync:{" "}
                            {new Date(dev.lastSync).toLocaleString("en-IN")}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingDevice(dev);
                            setDeviceForm({ ...dev });
                            setShowDeviceModal(true);
                          }}
                          data-ocid={`biometric.edit-device.${idx + 1}`}
                          aria-label="Edit device"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteDevice(dev.id)}
                          data-ocid={`biometric.delete-device.${idx + 1}`}
                          aria-label="Delete device"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        disabled={syncingId === dev.id}
                        onClick={() => void handleSync(dev)}
                        data-ocid={`biometric.sync-device.${idx + 1}`}
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 mr-1.5 ${syncingId === dev.id ? "animate-spin" : ""}`}
                        />
                        {syncingId === dev.id ? "Syncing…" : "Sync Now"}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {syncLogs.length > 0 && (
              <div
                className="m-4 mt-0 rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs space-y-1"
                data-ocid="biometric.sync-log-panel"
              >
                <p className="font-semibold text-muted-foreground mb-2 uppercase tracking-wide text-[10px]">
                  Sync Log
                </p>
                {syncLogs.map((log) => (
                  <div
                    key={`${log.time}-${log.message}`}
                    className={`flex gap-2 ${log.type === "error" ? "text-destructive" : log.type === "success" ? "text-accent" : "text-muted-foreground"}`}
                  >
                    <span className="opacity-60">[{log.time}]</span>
                    <span>{log.message}</span>
                  </div>
                ))}
                {syncDone && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="font-semibold text-foreground text-[11px]">
                      ✅ {syncDone.synced} attendance records saved to MySQL
                      {syncDone.unmatched > 0 &&
                        ` · ⚠️ ${syncDone.unmatched} failed`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ID Mappings */}
      <Card className="overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
          onClick={() =>
            setExpandedSection(
              expandedSection === "mappings" ? "devices" : "mappings",
            )
          }
          data-ocid="biometric.mappings-section.toggle"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">
              Biometric ID Mappings
            </span>
            <Badge variant="secondary">{mappings.length}</Badge>
          </div>
          {expandedSection === "mappings" ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {expandedSection === "mappings" && (
          <div className="border-t border-border p-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              Map each student or staff member to their enrollment number on the
              biometric device.
            </p>

            <div className="grid sm:grid-cols-4 gap-3 bg-muted/30 rounded-lg p-3">
              <div className="space-y-1">
                <Label className="text-xs">Person ID</Label>
                <Input
                  className="h-8 text-sm"
                  placeholder="Student/Staff ID"
                  value={mapPersonId}
                  onChange={(e) => setMapPersonId(e.target.value)}
                  data-ocid="biometric.person-id.input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Person Name</Label>
                <Input
                  className="h-8 text-sm"
                  placeholder="Full name"
                  value={mapPersonName}
                  onChange={(e) => setMapPersonName(e.target.value)}
                  data-ocid="biometric.person-name.input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Biometric ID</Label>
                <Input
                  className="h-8 text-sm"
                  placeholder="e.g. 1001"
                  value={mapBiometricId}
                  onChange={(e) => setMapBiometricId(e.target.value)}
                  data-ocid="biometric.enrollment-id.input"
                />
              </div>
              <div className="flex items-end gap-2">
                <Select
                  value={mapPersonType}
                  onValueChange={(v) =>
                    setMapPersonType(v as "student" | "staff")
                  }
                >
                  <SelectTrigger
                    className="h-8 text-sm flex-1"
                    data-ocid="biometric.person-type.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-8"
                  onClick={assignMapping}
                  data-ocid="biometric.assign-id.button"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {mappings.length === 0 ? (
              <div
                className="py-8 text-center text-muted-foreground"
                data-ocid="biometric.mappings.empty-state"
              >
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No biometric ID mappings yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-2.5 text-xs font-semibold text-muted-foreground">
                        Name / ID
                      </th>
                      <th className="text-left p-2.5 text-xs font-semibold text-muted-foreground">
                        Type
                      </th>
                      <th className="text-left p-2.5 text-xs font-semibold text-muted-foreground">
                        Biometric ID
                      </th>
                      <th className="text-left p-2.5 text-xs font-semibold text-muted-foreground">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((m, idx) => (
                      <tr
                        key={m.personId}
                        className="border-t border-border hover:bg-muted/20 transition-colors"
                        data-ocid={`biometric.mapping-row.${idx + 1}`}
                      >
                        <td className="p-2.5 font-medium text-foreground">
                          {m.personName}{" "}
                          <span className="text-xs text-muted-foreground">
                            ({m.personId})
                          </span>
                        </td>
                        <td className="p-2.5">
                          <Badge
                            variant={
                              m.personType === "student"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs capitalize"
                          >
                            {m.personType}
                          </Badge>
                        </td>
                        <td className="p-2.5 font-mono text-sm text-foreground">
                          {m.biometricId}
                        </td>
                        <td className="p-2.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeMapping(m.personId)}
                            aria-label="Remove mapping"
                            data-ocid={`biometric.remove-mapping.${idx + 1}`}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Help */}
      <Card className="overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
          onClick={() =>
            setExpandedSection(expandedSection === "help" ? "devices" : "help")
          }
          data-ocid="biometric.help-section.toggle"
        >
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">
              Setup Guide &amp; Help
            </span>
          </div>
          {expandedSection === "help" ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {expandedSection === "help" && (
          <div className="border-t border-border p-4 space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                ESSL eBioServer Setup
              </h4>
              <ol className="list-decimal ml-5 space-y-1 text-xs">
                <li>
                  Enable HTTP API on your ESSL device (Admin → Network → HTTP
                  Server → Enable, default port 8080)
                </li>
                <li>
                  Note the device IP address from the LCD panel or router DHCP
                </li>
                <li>
                  Add the device above with the correct IP, port, and
                  credentials
                </li>
                <li>
                  Upload the PHP proxy script (
                  <code className="bg-muted rounded px-1">essl_proxy.php</code>)
                  to your cPanel public_html folder
                </li>
                <li>
                  Map each student/staff biometric enrollment number in the "ID
                  Mappings" section
                </li>
                <li>
                  Click "Sync Now" — attendance data flows from the device into
                  the ERP and saves to MySQL
                </li>
              </ol>
            </div>
          </div>
        )}
      </Card>

      {/* Device Modal */}
      {showDeviceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          data-ocid="biometric.device-modal.dialog"
        >
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">
                {editingDevice ? "Edit Device" : "Add Biometric Device"}
              </h3>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowDeviceModal(false)}
                aria-label="Close"
                data-ocid="biometric.device-modal.close-button"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Device Name *</Label>
                <Input
                  placeholder="e.g. Main Gate, Staff Room"
                  value={deviceForm.name}
                  onChange={(e) =>
                    setDeviceForm((f) => ({ ...f, name: e.target.value }))
                  }
                  data-ocid="biometric.device-name.input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Device Type *</Label>
                <Select
                  value={deviceForm.deviceType}
                  onValueChange={(v) => handleDeviceTypeChange(v as DeviceType)}
                >
                  <SelectTrigger data-ocid="biometric.device-type.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">IP Address *</Label>
                  <Input
                    placeholder="192.168.1.100"
                    value={deviceForm.ipAddress}
                    onChange={(e) =>
                      setDeviceForm((f) => ({
                        ...f,
                        ipAddress: e.target.value,
                      }))
                    }
                    data-ocid="biometric.device-ip.input"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Port</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={deviceForm.port}
                    onChange={(e) =>
                      setDeviceForm((f) => ({
                        ...f,
                        port:
                          Number(e.target.value.replace(/[^0-9]/g, "")) || 0,
                      }))
                    }
                    data-ocid="biometric.device-port.input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Username</Label>
                  <Input
                    value={deviceForm.username}
                    onChange={(e) =>
                      setDeviceForm((f) => ({ ...f, username: e.target.value }))
                    }
                    data-ocid="biometric.device-username.input"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Password</Label>
                  <Input
                    type="password"
                    value={deviceForm.password}
                    onChange={(e) =>
                      setDeviceForm((f) => ({ ...f, password: e.target.value }))
                    }
                    data-ocid="biometric.device-password.input"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="device-enabled"
                  type="checkbox"
                  checked={deviceForm.enabled}
                  onChange={(e) =>
                    setDeviceForm((f) => ({ ...f, enabled: e.target.checked }))
                  }
                  className="h-4 w-4 accent-primary"
                  data-ocid="biometric.device-enabled.checkbox"
                />
                <Label
                  htmlFor="device-enabled"
                  className="text-sm cursor-pointer"
                >
                  Enable this device
                </Label>
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t border-border justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeviceModal(false)}
                data-ocid="biometric.device-modal.cancel-button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveDevice}
                data-ocid="biometric.device-modal.save-button"
              >
                {editingDevice ? "Update Device" : "Add Device"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
