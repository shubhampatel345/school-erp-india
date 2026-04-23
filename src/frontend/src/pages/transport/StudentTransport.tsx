/**
 * Student Transport Assignment
 * Assign students to routes and pickup points.
 * Month checkboxes per student for which months transport fee applies.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bus, ChevronDown, ChevronUp, Save, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { RoutePickupPoint, Student, TransportRoute } from "../../types";
import { DEFAULT_TRANSPORT_MONTHS, MONTHS_SHORT } from "../../types";
import { formatCurrency } from "../../types";

// ── Month checkbox row ─────────────────────────────────────────────────────────

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

// ── Single student row ─────────────────────────────────────────────────────────

function StudentRow({
  student,
  routes,
  index,
  onAssign,
}: {
  student: Student;
  routes: TransportRoute[];
  index: number;
  onAssign: (
    studentId: string,
    routeId: string,
    pickupId: string,
    months: string[],
  ) => Promise<void>;
}) {
  const currentRoute = routes.find(
    (r) =>
      r.id === student.transportId || r.routeName === student.transportRoute,
  );
  const [expanded, setExpanded] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(currentRoute?.id ?? "");
  const [selectedPickup, setSelectedPickup] = useState(
    student.transportPickup ?? "",
  );
  const [months, setMonths] = useState<string[]>(
    student.transportMonths?.length
      ? student.transportMonths
      : [...DEFAULT_TRANSPORT_MONTHS],
  );
  const [saving, setSaving] = useState(false);

  function getPickupPoints(routeId: string): RoutePickupPoint[] {
    const route = routes.find((r) => r.id === routeId);
    if (!route) return [];
    return Array.isArray(route.pickupPoints)
      ? (route.pickupPoints as RoutePickupPoint[])
      : [];
  }

  const pts = getPickupPoints(selectedRoute);
  const selectedPP = pts.find(
    (p) => p.id === selectedPickup || p.stopName === selectedPickup,
  );
  const monthlyFare = selectedPP?.fare ?? 0;
  const totalFare = monthlyFare * months.length;

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

  return (
    <Card
      className="transition-smooth"
      data-ocid={`transport.students.item.${index + 1}`}
    >
      {/* Summary row */}
      <button
        type="button"
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/20 rounded-xl w-full text-left"
        onClick={() => setExpanded((e) => !e)}
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
          {student.transportRoute ? (
            <Badge variant="secondary" className="text-xs">
              <Bus className="w-3 h-3 mr-1" />
              {student.transportRoute}
              {student.transportPickup ? ` — ${student.transportPickup}` : ""}
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

      {/* Expanded assignment form */}
      {expanded && (
        <CardContent className="pt-0 pb-4 border-t border-border mt-0 animate-fade-in">
          <div className="space-y-3 pt-3">
            {routes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No routes configured. Add routes in the Routes tab first.
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
                      onValueChange={(v) => {
                        setSelectedRoute(v);
                        setSelectedPickup("");
                      }}
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
                            {r.routeName} (Bus: {r.busNo || "—"})
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
                      {formatCurrency(monthlyFare)} × {months.length} ={" "}
                      {formatCurrency(totalFare)}
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
                    <Save className="w-3.5 h-3.5 mr-1" />
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

// ── Main component ─────────────────────────────────────────────────────────────

export default function StudentTransport() {
  const { getData, updateData } = useApp();
  const students = getData("students") as Student[];
  const routes = getData("transport_routes") as TransportRoute[];

  const [search, setSearch] = useState("");
  const [filterRoute, setFilterRoute] = useState("all");
  const [filterPickup, setFilterPickup] = useState("all");

  // All pickup points for the selected filter route
  const filterRoutePts = useMemo(() => {
    if (filterRoute === "all") return [];
    const r = routes.find((r) => r.id === filterRoute);
    if (!r || !Array.isArray(r.pickupPoints)) return [];
    return r.pickupPoints as RoutePickupPoint[];
  }, [routes, filterRoute]);

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
          s.transportId === filterRoute || s.transportRoute === r?.routeName,
      );
    }
    if (filterPickup !== "all") {
      const r = routes.find((r) => r.id === filterRoute);
      const pts = r?.pickupPoints as RoutePickupPoint[] | undefined;
      const pp = pts?.find((p) => p.id === filterPickup);
      list = list.filter(
        (s) =>
          s.transportPickup === pp?.stopName ||
          s.transportPickup === filterPickup,
      );
    }
    return list.slice(0, 100);
  }, [students, search, filterRoute, filterPickup, routes]);

  // Stats
  const withTransport = students.filter((s) => s.transportRoute).length;

  async function handleAssign(
    studentId: string,
    routeId: string,
    pickupId: string,
    months: string[],
  ) {
    const route = routes.find((r) => r.id === routeId);
    const pts = Array.isArray(route?.pickupPoints)
      ? (route!.pickupPoints as RoutePickupPoint[])
      : [];
    const pp = pts.find((p) => p.id === pickupId || p.stopName === pickupId);
    const student = students.find((s) => s.id === studentId);
    await updateData("students", studentId, {
      transportId: routeId || null,
      transportBusNo: route?.busNo ?? "",
      transportRoute: route?.routeName ?? "",
      transportPickup: pp?.stopName ?? pickupId ?? "",
      transportMonths: months,
    } as Record<string, unknown>);
    toast.success(`Transport saved for ${student?.fullName ?? "student"}`);
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="bg-card border border-border rounded-lg px-4 py-2 text-center min-w-[90px]">
          <p className="text-xl font-bold font-display text-primary">
            {withTransport}
          </p>
          <p className="text-xs text-muted-foreground">With Transport</p>
        </div>
        <div className="bg-card border border-border rounded-lg px-4 py-2 text-center min-w-[90px]">
          <p className="text-xl font-bold font-display text-foreground">
            {students.length - withTransport}
          </p>
          <p className="text-xs text-muted-foreground">Without</p>
        </div>
        <div className="bg-card border border-border rounded-lg px-4 py-2 text-center min-w-[90px]">
          <p className="text-xl font-bold font-display text-foreground">
            {routes.length}
          </p>
          <p className="text-xs text-muted-foreground">Routes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search student by name, adm. no, or class…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-ocid="transport.students.search_input"
          />
        </div>
        <Select
          value={filterRoute}
          onValueChange={(v) => {
            setFilterRoute(v);
            setFilterPickup("all");
          }}
        >
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
        {filterRoute !== "all" && filterRoutePts.length > 0 && (
          <Select value={filterPickup} onValueChange={setFilterPickup}>
            <SelectTrigger
              className="w-44"
              data-ocid="transport.students.pickup_filter"
            >
              <SelectValue placeholder="Filter by stop" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stops</SelectItem>
              {filterRoutePts.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.stopName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {routes.length === 0 && (
        <Card>
          <CardContent
            className="py-8 text-center"
            data-ocid="transport.students.no_routes"
          >
            <Bus className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No routes configured yet. Add routes in the "Routes & Buses" tab
              first.
            </p>
          </CardContent>
        </Card>
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
            index={i}
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
