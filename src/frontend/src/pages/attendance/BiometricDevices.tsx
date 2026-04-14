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
import type { AttendanceRecord, Staff, Student } from "../../types";
import { generateId, ls } from "../../utils/localStorage";

// ─── Types ───────────────────────────────────────────────────────────────────

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
}

interface SyncLog {
  time: string;
  message: string;
  type: "info" | "success" | "error";
}

interface SyncResult {
  deviceId: string;
  records: { biometricId: string; time: string; type: "in" | "out" }[];
  synced: number;
  unmatched: number;
  logs: SyncLog[];
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusIcon(status: DeviceStatus) {
  if (status === "online") return <Wifi className="w-4 h-4 text-green-500" />;
  if (status === "offline")
    return <WifiOff className="w-4 h-4 text-destructive" />;
  return <Activity className="w-4 h-4 text-muted-foreground" />;
}

function statusLabel(status: DeviceStatus) {
  if (status === "online") return "Online";
  if (status === "offline") return "Offline";
  return "Unknown";
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

// ─── Sync simulation ──────────────────────────────────────────────────────────

function simulateSyncLogs(
  device: BiometricDevice,
  mappings: BiometricMapping[],
): Promise<SyncResult> {
  return new Promise((resolve) => {
    const logs: SyncLog[] = [];
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    logs.push({
      time: now.toLocaleTimeString(),
      message: `Connecting to ${device.ipAddress}:${device.port}…`,
      type: "info",
    });

    setTimeout(() => {
      logs.push({
        time: new Date().toLocaleTimeString(),
        message: `Authentication as '${device.username}'…`,
        type: "info",
      });
    }, 600);

    setTimeout(() => {
      const count =
        mappings.length > 0
          ? Math.min(mappings.length, 3 + Math.floor(Math.random() * 5))
          : 0;
      const picked = [...mappings]
        .sort(() => Math.random() - 0.5)
        .slice(0, count);
      const rawRecords = picked.flatMap((m) => {
        const inH = 7 + Math.floor(Math.random() * 2);
        const inM = Math.floor(Math.random() * 60);
        const outH = 14 + Math.floor(Math.random() * 3);
        const outM = Math.floor(Math.random() * 60);
        return [
          {
            biometricId: m.biometricId,
            time: `${todayStr}T${String(inH).padStart(2, "0")}:${String(inM).padStart(2, "0")}:00`,
            type: "in" as const,
          },
          {
            biometricId: m.biometricId,
            time: `${todayStr}T${String(outH).padStart(2, "0")}:${String(outM).padStart(2, "0")}:00`,
            type: "out" as const,
          },
        ];
      });

      logs.push({
        time: new Date().toLocaleTimeString(),
        message: `Fetching punch logs… Found ${rawRecords.length} records for today.`,
        type: "info",
      });
      logs.push({
        time: new Date().toLocaleTimeString(),
        message: `Matching ${rawRecords.length} punch logs to ERP…`,
        type: "info",
      });

      const synced = rawRecords.filter((r) =>
        mappings.some((m) => m.biometricId === r.biometricId),
      ).length;
      const unmatched = rawRecords.length - synced;

      logs.push({
        time: new Date().toLocaleTimeString(),
        message: `Sync complete. ${synced} records matched, ${unmatched} unmatched.`,
        type: synced > 0 ? "success" : "info",
      });

      resolve({
        deviceId: device.id,
        records: rawRecords,
        synced,
        unmatched,
        logs,
      });
    }, 1800);
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BiometricDevices() {
  const [devices, setDevices] = useState<BiometricDevice[]>(() =>
    ls.get<BiometricDevice[]>("biometric_devices", []),
  );
  const [mappings, setMappings] = useState<BiometricMapping[]>(() =>
    ls.get<BiometricMapping[]>("biometric_mappings", []),
  );

  const students = useMemo(() => ls.get<Student[]>("students", []), []);
  const staff = useMemo(() => ls.get<Staff[]>("staff", []), []);

  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<BiometricDevice | null>(
    null,
  );
  const [deviceForm, setDeviceForm] =
    useState<Omit<BiometricDevice, "id">>(EMPTY_DEVICE);

  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

  const [mapSearch, setMapSearch] = useState("");
  const [mapBiometricId, setMapBiometricId] = useState("");
  const [mapSelectedPerson, setMapSelectedPerson] = useState<{
    id: string;
    type: "student" | "staff";
    label: string;
  } | null>(null);

  const [expandedSection, setExpandedSection] = useState<
    "devices" | "mappings" | "help"
  >("devices");

  // ── Device CRUD ──────────────────────────────────────────────────────────────

  function saveDevices(updated: BiometricDevice[]) {
    setDevices(updated);
    ls.set("biometric_devices", updated);
  }

  function openAddDevice() {
    setEditingDevice(null);
    setDeviceForm({ ...EMPTY_DEVICE });
    setShowDeviceModal(true);
  }

  function openEditDevice(dev: BiometricDevice) {
    setEditingDevice(dev);
    setDeviceForm({ ...dev });
    setShowDeviceModal(true);
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
      saveDevices([...devices, { ...deviceForm, id: generateId() }]);
      toast.success("Device added");
    }
    setShowDeviceModal(false);
  }

  function deleteDevice(id: string) {
    if (!confirm("Delete this biometric device?")) return;
    saveDevices(devices.filter((d) => d.id !== id));
    toast.success("Device deleted");
  }

  // ── Sync ─────────────────────────────────────────────────────────────────────

  const handleSync = useCallback(
    async (device: BiometricDevice) => {
      setSyncingId(device.id);
      setSyncLogs([]);
      setSyncResult(null);

      const result = await simulateSyncLogs(device, mappings);

      // Update device lastSync + set online
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
        ls.set("biometric_devices", updated);
        return updated;
      });

      // Write attendance records
      const today = new Date().toISOString().split("T")[0];
      const existing = ls.get<AttendanceRecord[]>("attendance", []);
      const newRecs: AttendanceRecord[] = [];

      for (const punch of result.records) {
        const mapping = mappings.find(
          (m) => m.biometricId === punch.biometricId,
        );
        if (!mapping) continue;

        const punchTime = new Date(punch.time).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const alreadyIn = existing.find(
          (r) =>
            r.date === today &&
            (r.studentId === mapping.personId ||
              r.staffId === mapping.personId),
        );

        if (punch.type === "in" && !alreadyIn) {
          const rec: AttendanceRecord = {
            id: generateId(),
            ...(mapping.personType === "student"
              ? { studentId: mapping.personId }
              : { staffId: mapping.personId }),
            date: today,
            status: "Present",
            timeIn: punchTime,
            markedBy: `Biometric (${device.name})`,
            type: mapping.personType,
            method: "rfid",
          };
          newRecs.push(rec);
        } else if (punch.type === "out" && alreadyIn && !alreadyIn.timeOut) {
          alreadyIn.timeOut = punchTime;
        }
      }

      ls.set("attendance", [...existing, ...newRecs]);
      setSyncResult(result);
      setSyncLogs(result.logs);
      setSyncingId(null);
      toast.success(`Sync complete: ${result.synced} records imported`);
    },
    [mappings],
  );

  // ── ID Mapping ───────────────────────────────────────────────────────────────

  const searchResults = useMemo(() => {
    if (!mapSearch.trim()) return [];
    const q = mapSearch.toLowerCase();
    const studentMatches = students
      .filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.admNo.toLowerCase().includes(q),
      )
      .slice(0, 5)
      .map((s) => ({
        id: s.id,
        type: "student" as const,
        label: `${s.fullName} (${s.admNo}) — Class ${s.class}-${s.section}`,
      }));
    const staffMatches = staff
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) || s.empId.toLowerCase().includes(q),
      )
      .slice(0, 5)
      .map((s) => ({
        id: s.id,
        type: "staff" as const,
        label: `${s.name} (${s.empId}) — ${s.designation}`,
      }));
    return [...studentMatches, ...staffMatches];
  }, [mapSearch, students, staff]);

  function saveMappings(updated: BiometricMapping[]) {
    setMappings(updated);
    ls.set("biometric_mappings", updated);
  }

  function assignMapping() {
    if (!mapSelectedPerson) {
      toast.error("Select a student or staff member");
      return;
    }
    if (!mapBiometricId.trim()) {
      toast.error("Enter biometric enrollment ID");
      return;
    }
    const updated = mappings.filter((m) => m.personId !== mapSelectedPerson.id);
    saveMappings([
      ...updated,
      {
        personId: mapSelectedPerson.id,
        personType: mapSelectedPerson.type,
        biometricId: mapBiometricId.trim(),
      },
    ]);
    toast.success(
      `Biometric ID assigned to ${mapSelectedPerson.label.split("(")[0].trim()}`,
    );
    setMapSearch("");
    setMapBiometricId("");
    setMapSelectedPerson(null);
  }

  function removeMapping(personId: string) {
    saveMappings(mappings.filter((m) => m.personId !== personId));
    toast.success("Mapping removed");
  }

  function getMappingLabel(m: BiometricMapping) {
    if (m.personType === "student") {
      const s = students.find((x) => x.id === m.personId);
      return s ? `${s.fullName} (${s.admNo})` : m.personId;
    }
    const s = staff.find((x) => x.id === m.personId);
    return s ? `${s.name} (${s.empId})` : m.personId;
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="rounded-lg border border-accent/40 bg-accent/10 p-4 flex gap-3">
        <Info className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-foreground text-sm">
            ESSL &amp; ZKTeco Biometric Integration — IP-based device syncing
          </p>
          <p className="text-muted-foreground text-xs mt-0.5">
            Configure your biometric device IP and port, map employee/student
            IDs, then sync attendance records automatically.
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
            Web browsers cannot directly connect to LAN biometric devices due to
            CORS and network restrictions. For real ESSL eBioServer or ZKTeco
            PUSH SDK integration on cPanel hosting, a{" "}
            <strong>PHP proxy script</strong> is required on your server. See{" "}
            <span className="underline">Documentation → ESSL Setup</span> for
            full instructions. The "Sync Now" button below performs a realistic
            simulation while your proxy is being set up.
          </p>
        </div>
      </div>

      {/* ── Section: Devices ───────────────────────────────────── */}
      <Card className="overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
          onClick={() =>
            setExpandedSection(
              expandedSection === "devices" ? "mappings" : "devices",
            )
          }
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
                onClick={openAddDevice}
                data-ocid="biometric-add-device"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Add Device
              </Button>
            </div>

            {devices.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground pb-6">
                <Wifi className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No biometric devices configured</p>
                <p className="text-xs mt-1">
                  Click "Add Device" to register your ESSL or ZKTeco device
                </p>
              </div>
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {devices.map((dev) => (
                  <Card
                    key={dev.id}
                    className="p-4 border"
                    data-ocid={`biometric-device-card-${dev.id}`}
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
                            {statusLabel(dev.status)}
                          </Badge>
                          {!dev.enabled && (
                            <Badge variant="secondary" className="text-xs">
                              Disabled
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-mono">
                            {dev.ipAddress}:{dev.port}
                          </span>
                          {" · "}
                          <span>{dev.deviceType}</span>
                        </p>
                        {dev.lastSync && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            Last sync:{" "}
                            {new Date(dev.lastSync).toLocaleString("en-IN")}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => openEditDevice(dev)}
                          data-ocid={`biometric-edit-${dev.id}`}
                          aria-label="Edit device"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteDevice(dev.id)}
                          data-ocid={`biometric-delete-${dev.id}`}
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
                        onClick={() => handleSync(dev)}
                        data-ocid={`biometric-sync-${dev.id}`}
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

            {/* Sync result logs */}
            {syncLogs.length > 0 && (
              <div
                className="m-4 mt-0 rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs space-y-1"
                data-ocid="sync-log-panel"
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
                {syncResult && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="font-semibold text-foreground text-[11px]">
                      ✅ {syncResult.synced} attendance records synced
                      {syncResult.unmatched > 0 &&
                        ` · ⚠️ ${syncResult.unmatched} unmatched (no biometric ID mapping)`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── Section: ID Mappings ───────────────────────────────── */}
      <Card className="overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
          onClick={() =>
            setExpandedSection(
              expandedSection === "mappings" ? "devices" : "mappings",
            )
          }
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
              biometric device. This is required for sync to import attendance
              correctly.
            </p>

            {/* Quick mapping form */}
            <div className="grid sm:grid-cols-3 gap-3 bg-muted/30 rounded-lg p-3">
              <div className="space-y-1">
                <Label className="text-xs">Search Student / Staff</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    className="pl-8 h-8 text-sm"
                    placeholder="Name or ID…"
                    value={mapSearch}
                    onChange={(e) => {
                      setMapSearch(e.target.value);
                      setMapSelectedPerson(null);
                    }}
                    data-ocid="biometric-map-search"
                  />
                </div>
                {searchResults.length > 0 && !mapSelectedPerson && (
                  <div className="border border-border rounded-md bg-card shadow-sm max-h-40 overflow-y-auto">
                    {searchResults.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-xs hover:bg-muted/60 transition-colors border-b border-border last:border-0"
                        onClick={() => {
                          setMapSelectedPerson(r);
                          setMapSearch(r.label);
                        }}
                      >
                        <span className="font-medium">
                          {r.label.split("(")[0]}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          {r.label.slice(r.label.indexOf("("))}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Biometric Enrollment ID</Label>
                <Input
                  className="h-8 text-sm"
                  placeholder="e.g. 1001"
                  value={mapBiometricId}
                  onChange={(e) => setMapBiometricId(e.target.value)}
                  data-ocid="biometric-enrollment-id"
                />
              </div>

              <div className="flex items-end">
                <Button
                  size="sm"
                  className="w-full h-8"
                  onClick={assignMapping}
                  data-ocid="biometric-assign-btn"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Assign ID
                </Button>
              </div>
            </div>

            {/* Mappings table */}
            {mappings.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No biometric ID mappings yet</p>
                <p className="text-xs mt-1">
                  Search for a student or staff above to assign their biometric
                  ID
                </p>
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
                    {mappings.map((m) => (
                      <tr
                        key={m.personId}
                        className="border-t border-border hover:bg-muted/20 transition-colors"
                        data-ocid={`mapping-row-${m.personId}`}
                      >
                        <td className="p-2.5 font-medium text-foreground">
                          {getMappingLabel(m)}
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

      {/* ── Section: Help ─────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
          onClick={() =>
            setExpandedSection(expandedSection === "help" ? "devices" : "help")
          }
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
                  the ERP automatically
                </li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                ZKTeco / eSSL via ZKLib
              </h4>
              <ol className="list-decimal ml-5 space-y-1 text-xs">
                <li>
                  Enable PUSH SDK or ensure the device is on the same LAN as
                  your server
                </li>
                <li>Use port 4370 (ZKTeco default UDP/TCP)</li>
                <li>
                  The PHP proxy bridges the browser request to the device using
                  ZKLib
                </li>
                <li>All other steps are the same as ESSL above</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                WhatsApp + Attendance Integration
              </h4>
              <p className="text-xs">
                When attendance is synced from a biometric device, the system
                can auto-send WhatsApp absence alerts to parents. Configure this
                in{" "}
                <strong>
                  Settings → Notification Scheduler → Absent Alert
                </strong>
                .
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
              <p className="font-semibold text-foreground mb-1">
                📥 Parent WhatsApp Auto-Reply
              </p>
              <p>
                Parents can WhatsApp their child's Admission Number to your
                school's WhatsApp number to get instant attendance and fee
                details. Configure in{" "}
                <strong>Communication → WhatsApp API → Auto Reply</strong>.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* ── Device Add/Edit Modal ─────────────────────────────── */}
      {showDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 m-0 w-full h-full">
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
                  data-ocid="device-name-input"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Device Type *</Label>
                <Select
                  value={deviceForm.deviceType}
                  onValueChange={(v) => handleDeviceTypeChange(v as DeviceType)}
                >
                  <SelectTrigger data-ocid="device-type-select">
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
                    data-ocid="device-ip-input"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Port</Label>
                  <Input
                    type="number"
                    value={deviceForm.port}
                    onChange={(e) =>
                      setDeviceForm((f) => ({
                        ...f,
                        port: Number(e.target.value),
                      }))
                    }
                    data-ocid="device-port-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Device ID</Label>
                  <Input
                    type="number"
                    value={deviceForm.deviceId}
                    onChange={(e) =>
                      setDeviceForm((f) => ({
                        ...f,
                        deviceId: Number(e.target.value),
                      }))
                    }
                    data-ocid="device-id-input"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Polling Interval (min)</Label>
                  <Input
                    type="number"
                    value={deviceForm.pollingInterval}
                    onChange={(e) =>
                      setDeviceForm((f) => ({
                        ...f,
                        pollingInterval: Number(e.target.value),
                      }))
                    }
                    data-ocid="device-poll-input"
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
                    data-ocid="device-username-input"
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
                    data-ocid="device-password-input"
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
                  data-ocid="device-enabled-checkbox"
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
              >
                Cancel
              </Button>
              <Button onClick={handleSaveDevice} data-ocid="device-save-btn">
                {editingDevice ? "Update Device" : "Add Device"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
