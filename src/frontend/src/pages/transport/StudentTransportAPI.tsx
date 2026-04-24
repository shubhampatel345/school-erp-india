/**
 * Student Transport Assignment — Direct API rebuild
 * Reads students + routes from phpApiService.
 * Saves transport assignment back to server before showing success.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Bus,
  ChevronDown,
  ChevronUp,
  Loader2,
  Save,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import phpApiService from "../../utils/phpApiService";
import type { StudentRecord } from "../../utils/phpApiService";

// ── Types ─────────────────────────────────────────────────────

interface PickupPoint {
  id: string;
  routeId: string;
  stopName: string;
  distance?: string;
  fare: number;
}

interface Route {
  id: string;
  routeName: string;
  busNo?: string;
  driverName?: string;
}

const MONTHS_SHORT = [
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
];
const DEFAULT_MONTHS = [
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
];

// ── Month Checkboxes ──────────────────────────────────────────

function MonthCheckboxes({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (months: string[]) => void;
}) {
  function toggle(m: string) {
    onChange(
      selected.includes(m) ? selected.filter((x) => x !== m) : [...selected, m],
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      <button
        type="button"
        className="text-xs text-primary underline mr-1"
        onClick={() => onChange([...MONTHS_SHORT])}
      >
        All
      </button>
      <button
        type="button"
        className="text-xs text-muted-foreground underline mr-2"
        onClick={() => onChange([])}
      >
        None
      </button>
      {MONTHS_SHORT.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => toggle(m)}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors border ${
            selected.includes(m)
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted text-muted-foreground border-border hover:border-primary/40"
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

// ── Student Row ───────────────────────────────────────────────

function StudentRow({
  student,
  routes,
  pickupMap,
  index,
  onLoadPickups,
  onAssign,
}: {
  student: StudentRecord;
  routes: Route[];
  pickupMap: Record<string, PickupPoint[]>;
  index: number;
  onLoadPickups: (routeId: string) => Promise<void>;
  onAssign: (
    studentId: string,
    routeId: string,
    pickupId: string,
    months: string[],
  ) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(
    ((student as Record<string, unknown>).transportId as string) ?? "",
  );
  const [selectedPickup, setSelectedPickup] = useState(
    ((student as Record<string, unknown>).transportPickup as string) ?? "",
  );
  const [months, setMonths] = useState<string[]>(
    ((student as Record<string, unknown>).transportMonths as string[]) ??
      DEFAULT_MONTHS,
  );
  const [saving, setSaving] = useState(false);

  const pts = pickupMap[selectedRoute] ?? [];
  const selectedPP = pts.find(
    (p) => p.id === selectedPickup || p.stopName === selectedPickup,
  );
  const monthlyFare = selectedPP?.fare ?? 0;

  const handleRouteChange = useCallback(
    async (routeId: string) => {
      setSelectedRoute(routeId);
      setSelectedPickup("");
      if (routeId && !pickupMap[routeId]) {
        await onLoadPickups(routeId);
      }
    },
    [pickupMap, onLoadPickups],
  );

  async function handleAssign() {
    if (!selectedRoute) {
      toast.error("Select a route");
      return;
    }
    setSaving(true);
    try {
      await onAssign(student.id, selectedRoute, selectedPickup, months);
      setExpanded(false);
    } finally {
      setSaving(false);
    }
  }

  const transportRoute = (student as Record<string, unknown>).transportRoute as
    | string
    | undefined;
  const transportPickup = (student as Record<string, unknown>)
    .transportPickup as string | undefined;

  return (
    <Card
      className="transition-smooth"
      data-ocid={`transport.students.item.${index + 1}`}
    >
      <button
        type="button"
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/20 rounded-xl w-full text-left"
        onClick={async () => {
          if (!expanded && selectedRoute && !pickupMap[selectedRoute]) {
            await onLoadPickups(selectedRoute);
          }
          setExpanded((e) => !e);
        }}
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">
            {student.fullName}
          </p>
          <p className="text-xs text-muted-foreground">
            {student.admNo} · Class {student.class}-{student.section}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {transportRoute ? (
            <Badge variant="secondary" className="text-xs">
              <Bus className="w-3 h-3 mr-1" />
              {transportRoute}
              {transportPickup ? ` — ${transportPickup}` : ""}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-xs text-muted-foreground border-dashed"
            >
              No transport
            </Badge>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <CardContent className="pt-0 pb-4 border-t border-border animate-fade-in">
          <div className="space-y-3 pt-3">
            {routes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No routes configured. Add routes in the Routes & Buses tab
                first.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Route
                    </Label>
                    <Select
                      value={selectedRoute}
                      onValueChange={(v) => void handleRouteChange(v)}
                    >
                      <SelectTrigger
                        className="h-8 text-xs mt-1"
                        data-ocid={`transport.students.route_select.${index + 1}`}
                      >
                        <SelectValue placeholder="Select route" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {routes.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.routeName} {r.busNo ? `(${r.busNo})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedRoute && pts.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Pickup Point
                      </Label>
                      <Select
                        value={selectedPickup}
                        onValueChange={setSelectedPickup}
                      >
                        <SelectTrigger
                          className="h-8 text-xs mt-1"
                          data-ocid={`transport.students.pickup_select.${index + 1}`}
                        >
                          <SelectValue placeholder="Select stop" />
                        </SelectTrigger>
                        <SelectContent>
                          {pts.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.stopName} (₹{p.fare}/mo)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">
                    Transport Months ({months.length} selected)
                  </Label>
                  <MonthCheckboxes selected={months} onChange={setMonths} />
                </div>

                {monthlyFare > 0 && (
                  <div className="bg-muted/40 rounded-lg px-3 py-2 text-xs flex justify-between">
                    <span className="text-muted-foreground">
                      Monthly Fare × {months.length} months
                    </span>
                    <span className="font-semibold text-foreground">
                      ₹{monthlyFare} × {months.length} = ₹
                      {monthlyFare * months.length}
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={!selectedRoute || saving}
                    onClick={() => void handleAssign()}
                    data-ocid={`transport.students.assign_button.${index + 1}`}
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <Save className="w-3.5 h-3.5 mr-1" />
                    )}
                    {saving ? "Saving…" : "Save Assignment"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setExpanded(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────

export default function StudentTransportAPI() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [pickupMap, setPickupMap] = useState<Record<string, PickupPoint[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRoute, setFilterRoute] = useState("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [studRes, routeData] = await Promise.all([
          phpApiService.getStudents({ limit: "500", status: "active" }),
          phpApiService.getRoutes(),
        ]);
        setStudents(studRes.data);
        setRoutes(routeData as unknown as Route[]);
      } catch {
        toast.error("Failed to load transport data");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const loadPickups = useCallback(async (routeId: string) => {
    try {
      const data = await phpApiService.get<PickupPoint[]>(
        `transport/pickup/list&routeId=${routeId}`,
      );
      setPickupMap((prev) => ({ ...prev, [routeId]: data ?? [] }));
    } catch {
      setPickupMap((prev) => ({ ...prev, [routeId]: [] }));
    }
  }, []);

  const handleAssign = useCallback(
    async (
      studentId: string,
      routeId: string,
      pickupId: string,
      months: string[],
    ) => {
      const route = routes.find((r) => r.id === routeId);
      const pts = pickupMap[routeId] ?? [];
      const pp = pts.find((p) => p.id === pickupId);

      await phpApiService.updateStudent({
        id: studentId,
        transportId: routeId || null,
        transportBusNo: route?.busNo ?? "",
        transportRoute: route?.routeName ?? "",
        transportPickup: pp?.stopName ?? pickupId ?? "",
        transportMonths: months,
      } as StudentRecord & {
        transportId: string | null;
        transportBusNo: string;
        transportRoute: string;
        transportPickup: string;
        transportMonths: string[];
      });

      // Update local state immediately
      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentId
            ? {
                ...s,
                transportId: routeId,
                transportBusNo: route?.busNo ?? "",
                transportRoute: route?.routeName ?? "",
                transportPickup: pp?.stopName ?? "",
                transportMonths: months,
              }
            : s,
        ),
      );

      const student = students.find((s) => s.id === studentId);
      toast.success(`Transport saved for ${student?.fullName ?? "student"}`);
    },
    [routes, pickupMap, students],
  );

  const filtered = useMemo(() => {
    let list = students;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.fullName?.toLowerCase().includes(q) ||
          s.admNo?.toLowerCase().includes(q) ||
          s.class?.toLowerCase().includes(q),
      );
    }
    if (filterRoute !== "all") {
      const r = routes.find((r) => r.id === filterRoute);
      list = list.filter(
        (s) =>
          (s as Record<string, unknown>).transportId === filterRoute ||
          (s as Record<string, unknown>).transportRoute === r?.routeName,
      );
    }
    return list.slice(0, 100);
  }, [students, search, filterRoute, routes]);

  const withTransport = students.filter(
    (s) => (s as Record<string, unknown>).transportRoute,
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        {[
          {
            label: "With Transport",
            value: withTransport,
            color: "text-primary",
          },
          {
            label: "Without",
            value: students.length - withTransport,
            color: "text-foreground",
          },
          { label: "Routes", value: routes.length, color: "text-foreground" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-card border border-border rounded-lg px-4 py-2 text-center min-w-[90px]"
          >
            <p className={`text-xl font-bold font-display ${s.color}`}>
              {s.value}
            </p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search student by name, adm. no or class…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-ocid="transport.students.search_input"
          />
        </div>
        <Select value={filterRoute} onValueChange={setFilterRoute}>
          <SelectTrigger
            className="w-44"
            data-ocid="transport.students.route_filter"
          >
            <SelectValue placeholder="Filter by route" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Routes</SelectItem>
            {routes.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.routeName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {routes.length === 0 && (
        <div
          className="py-8 text-center text-muted-foreground bg-muted/30 rounded-xl"
          data-ocid="transport.students.no_routes"
        >
          <Bus className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">
            No routes configured yet. Add routes in "Routes & Buses" first.
          </p>
        </div>
      )}

      {filtered.length === 0 && (search || filterRoute !== "all") ? (
        <div
          className="text-center py-10 text-muted-foreground"
          data-ocid="transport.students.empty_state"
        >
          <p className="text-sm">No students match the current filters.</p>
        </div>
      ) : null}

      <div className="space-y-2">
        {filtered.map((student, i) => (
          <StudentRow
            key={student.id}
            student={student}
            routes={routes}
            pickupMap={pickupMap}
            index={i}
            onLoadPickups={loadPickups}
            onAssign={handleAssign}
          />
        ))}
      </div>

      {!search && filterRoute === "all" && students.length > 100 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing first 100 students — use search or filters to narrow down.
        </p>
      )}
    </div>
  );
}
