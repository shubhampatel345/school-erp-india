import { useCallback, useEffect, useState } from "react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useApp } from "../context/AppContext";
import type { Student } from "../types";
import { generateId } from "../utils/localStorage";

// ── Types ───────────────────────────────────────────────────
interface Stop {
  id: string;
  name: string;
  fare: number;
}

interface RouteRecord {
  id: string;
  name: string;
  driver: string;
  stops: Stop[];
}

type Tab = "routes" | "assign" | "fees";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "routes", label: "Routes & Stops", icon: "🚌" },
  { id: "assign", label: "Student Assignment", icon: "👥" },
  { id: "fees", label: "Transport Fees", icon: "₹" },
];

// 11 months (June auto-deselected)
const ALL_MONTHS = [
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
const DEFAULT_MONTHS = ALL_MONTHS.filter((m) => m !== "Jun");

const EMPTY_ROUTE_FORM = { name: "", driver: "" };
const EMPTY_STOP_FORM = { name: "", fare: 0 };

// ── Component ───────────────────────────────────────────────
export default function Transport() {
  const {
    getData,
    saveData,
    updateData,
    deleteData,
    addNotification,
    isReadOnly,
  } = useApp();

  const [tab, setTab] = useState<Tab>("routes");

  // ── Routes state ──────────────────────────────────────────
  const [routes, setRoutes] = useState<RouteRecord[]>([]);

  useEffect(() => {
    const raw = getData("routes") as RouteRecord[];
    setRoutes(raw);
  }, [getData]);

  // ── Students state ────────────────────────────────────────
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    const raw = getData("students") as Student[];
    setStudents(raw);
  }, [getData]);

  // ── Route form ────────────────────────────────────────────
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [editRouteId, setEditRouteId] = useState<string | null>(null);
  const [routeForm, setRouteForm] = useState(EMPTY_ROUTE_FORM);

  const openAddRoute = () => {
    setRouteForm(EMPTY_ROUTE_FORM);
    setEditRouteId(null);
    setShowRouteModal(true);
  };

  const openEditRoute = (r: RouteRecord) => {
    setRouteForm({ name: r.name, driver: r.driver });
    setEditRouteId(r.id);
    setShowRouteModal(true);
  };

  const handleSaveRoute = useCallback(async () => {
    if (!routeForm.name.trim()) return;
    if (editRouteId) {
      const existing = routes.find((r) => r.id === editRouteId);
      const updated: RouteRecord = {
        id: editRouteId,
        name: routeForm.name,
        driver: routeForm.driver,
        stops: existing?.stops ?? [],
      };
      await updateData(
        "routes",
        editRouteId,
        updated as unknown as Record<string, unknown>,
      );
      setRoutes((prev) =>
        prev.map((r) => (r.id === editRouteId ? updated : r)),
      );
      addNotification(`Route "${routeForm.name}" updated`, "success", "🚌");
    } else {
      const newRoute: RouteRecord = {
        id: generateId(),
        name: routeForm.name,
        driver: routeForm.driver,
        stops: [],
      };
      await saveData("routes", newRoute as unknown as Record<string, unknown>);
      setRoutes((prev) => [...prev, newRoute]);
      addNotification(`Route "${routeForm.name}" added`, "success", "🚌");
    }
    setShowRouteModal(false);
    setEditRouteId(null);
    setRouteForm(EMPTY_ROUTE_FORM);
  }, [routeForm, editRouteId, routes, saveData, updateData, addNotification]);

  const handleDeleteRoute = useCallback(
    async (id: string) => {
      await deleteData("routes", id);
      setRoutes((prev) => prev.filter((r) => r.id !== id));
      addNotification("Route deleted", "info", "🚌");
    },
    [deleteData, addNotification],
  );

  // ── Stop form ─────────────────────────────────────────────
  const [stopRouteId, setStopRouteId] = useState<string | null>(null);
  const [showStopModal, setShowStopModal] = useState(false);
  const [editStopId, setEditStopId] = useState<string | null>(null);
  const [stopForm, setStopForm] = useState(EMPTY_STOP_FORM);

  const openAddStop = (routeId: string) => {
    setStopRouteId(routeId);
    setStopForm(EMPTY_STOP_FORM);
    setEditStopId(null);
    setShowStopModal(true);
  };

  const openEditStop = (routeId: string, stop: Stop) => {
    setStopRouteId(routeId);
    setStopForm({ name: stop.name, fare: stop.fare });
    setEditStopId(stop.id);
    setShowStopModal(true);
  };

  const handleSaveStop = useCallback(async () => {
    if (!stopRouteId || !stopForm.name.trim()) return;
    const route = routes.find((r) => r.id === stopRouteId);
    if (!route) return;

    let updatedStops: Stop[];
    if (editStopId) {
      updatedStops = route.stops.map((s) =>
        s.id === editStopId
          ? { id: editStopId, name: stopForm.name, fare: stopForm.fare }
          : s,
      );
    } else {
      updatedStops = [
        ...route.stops,
        { id: generateId(), name: stopForm.name, fare: stopForm.fare },
      ];
    }

    const updatedRoute: RouteRecord = { ...route, stops: updatedStops };
    await updateData(
      "routes",
      stopRouteId,
      updatedRoute as unknown as Record<string, unknown>,
    );
    setRoutes((prev) =>
      prev.map((r) => (r.id === stopRouteId ? updatedRoute : r)),
    );
    setShowStopModal(false);
    setEditStopId(null);
    setStopForm(EMPTY_STOP_FORM);
  }, [stopRouteId, stopForm, editStopId, routes, updateData]);

  const handleDeleteStop = useCallback(
    async (routeId: string, stopId: string) => {
      const route = routes.find((r) => r.id === routeId);
      if (!route) return;
      const updatedRoute: RouteRecord = {
        ...route,
        stops: route.stops.filter((s) => s.id !== stopId),
      };
      await updateData(
        "routes",
        routeId,
        updatedRoute as unknown as Record<string, unknown>,
      );
      setRoutes((prev) =>
        prev.map((r) => (r.id === routeId ? updatedRoute : r)),
      );
    },
    [routes, updateData],
  );

  // ── Student Assignment ────────────────────────────────────
  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [assignRouteId, setAssignRouteId] = useState("");
  const [assignStopId, setAssignStopId] = useState("");
  const [assignMonths, setAssignMonths] = useState<string[]>(DEFAULT_MONTHS);
  const [assignStudentId, setAssignStudentId] = useState("");

  const activeStudents = students.filter((s) => s.status !== "discontinued");
  const classOptions = [...new Set(activeStudents.map((s) => s.class))].sort();
  const sectionOptions = filterClass
    ? [
        ...new Set(
          activeStudents
            .filter((s) => s.class === filterClass)
            .map((s) => s.section),
        ),
      ].sort()
    : [...new Set(activeStudents.map((s) => s.section))].sort();

  const filteredStudents = activeStudents.filter(
    (s) =>
      (!filterClass || s.class === filterClass) &&
      (!filterSection || s.section === filterSection),
  );

  const selectedAssignRoute = routes.find((r) => r.id === assignRouteId);

  const toggleMonth = (m: string) =>
    setAssignMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );

  const handleAssign = useCallback(async () => {
    if (!assignStudentId || !assignRouteId) return;
    const student = activeStudents.find((s) => s.id === assignStudentId);
    const route = routes.find((r) => r.id === assignRouteId);
    const stop = route?.stops.find((s) => s.id === assignStopId);
    if (!student || !route) return;

    const updates = {
      transportId: route.id,
      transportRoute: route.name,
      transportBusNo: route.driver,
      transportPickup: stop?.name ?? "",
      transportMonths: assignMonths,
    };
    await updateData("students", student.id, updates);
    setStudents((prev) =>
      prev.map((s) => (s.id === student.id ? { ...s, ...updates } : s)),
    );
    addNotification(
      `${student.fullName} assigned to route "${route.name}"`,
      "success",
      "🚌",
    );
    setAssignStudentId("");
    setAssignRouteId("");
    setAssignStopId("");
    setAssignMonths(DEFAULT_MONTHS);
  }, [
    assignStudentId,
    assignRouteId,
    assignStopId,
    assignMonths,
    activeStudents,
    routes,
    updateData,
    addNotification,
  ]);

  const handleRemoveAssignment = useCallback(
    async (studentId: string) => {
      await updateData("students", studentId, {
        transportId: "",
        transportRoute: "",
        transportBusNo: "",
        transportPickup: "",
        transportMonths: [],
      });
      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentId
            ? {
                ...s,
                transportId: "",
                transportRoute: "",
                transportBusNo: "",
                transportPickup: "",
                transportMonths: [],
              }
            : s,
        ),
      );
      addNotification("Transport assignment removed", "info", "🚌");
    },
    [updateData, addNotification],
  );

  const assignedStudents = activeStudents.filter((s) => s.transportId);

  // ── Transport Fees ────────────────────────────────────────
  const feesStudents = activeStudents.filter(
    (s) => s.transportId && (s.transportMonths?.length ?? 0) > 0,
  );

  const getMonthlyFare = (student: Student): number => {
    if (!student.transportId) return 0;
    const route = routes.find((r) => r.id === student.transportId);
    if (!route) return 0;
    const stop = route.stops.find((s) => s.name === student.transportPickup);
    return stop?.fare ?? 0;
  };

  // ── Renders ───────────────────────────────────────────────
  const renderRoutesTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Routes & Stops
          </h2>
          <p className="text-sm text-muted-foreground">
            {routes.length} routes configured
          </p>
        </div>
        {!isReadOnly && (
          <Button onClick={openAddRoute} data-ocid="transport.add-route_button">
            + Add Route
          </Button>
        )}
      </div>

      {routes.length === 0 ? (
        <Card data-ocid="transport.routes_empty_state">
          <CardContent className="py-16 text-center">
            <div className="text-4xl mb-3">🚌</div>
            <p className="font-semibold text-foreground">No routes yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add a route to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {routes.map((route, idx) => (
            <Card key={route.id} data-ocid={`transport.route_card.${idx + 1}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    🚌 {route.name}
                    {route.driver && (
                      <span className="text-sm font-normal text-muted-foreground">
                        — Driver: {route.driver}
                      </span>
                    )}
                    <Badge variant="secondary">
                      {route.stops.length} stops
                    </Badge>
                  </CardTitle>
                  {!isReadOnly && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAddStop(route.id)}
                        data-ocid={`transport.add-stop_button.${idx + 1}`}
                      >
                        + Add Stop
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditRoute(route)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteRoute(route.id)}
                        data-ocid={`transport.delete-route_button.${idx + 1}`}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {route.stops.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No stops added yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {route.stops.map((stop, si) => (
                      <div
                        key={stop.id}
                        className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2"
                        data-ocid={`transport.stop_item.${si + 1}`}
                      >
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                          {si + 1}
                        </span>
                        <span className="flex-1 font-medium text-foreground">
                          {stop.name}
                        </span>
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          ₹{stop.fare.toLocaleString("en-IN")}/mo
                        </span>
                        {!isReadOnly && (
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditStop(route.id, stop)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleDeleteStop(route.id, stop.id)
                              }
                            >
                              ✕
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderAssignTab = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        Student Assignment
      </h2>

      {!isReadOnly && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Assign Student to Route</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Filter by Class</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                  value={filterClass}
                  onChange={(e) => {
                    setFilterClass(e.target.value);
                    setFilterSection("");
                  }}
                  data-ocid="transport.filter-class_select"
                >
                  <option value="">All Classes</option>
                  {classOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Filter by Section</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                  data-ocid="transport.filter-section_select"
                >
                  <option value="">All Sections</option>
                  {sectionOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Assignment form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Select Student *</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                  value={assignStudentId}
                  onChange={(e) => setAssignStudentId(e.target.value)}
                  data-ocid="transport.assign-student_select"
                >
                  <option value="">— Select Student —</option>
                  {filteredStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.admNo}) — {s.class} {s.section}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Route *</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                  value={assignRouteId}
                  onChange={(e) => {
                    setAssignRouteId(e.target.value);
                    setAssignStopId("");
                  }}
                  data-ocid="transport.assign-route_select"
                >
                  <option value="">— Select Route —</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Pickup Stop</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                  value={assignStopId}
                  onChange={(e) => setAssignStopId(e.target.value)}
                  data-ocid="transport.assign-stop_select"
                >
                  <option value="">— Select Stop —</option>
                  {(selectedAssignRoute?.stops ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — ₹{s.fare.toLocaleString("en-IN")}/mo
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Month selection */}
            <div>
              <Label className="mb-2 block">
                Transport Months (Jun auto-deselected)
              </Label>
              <div className="flex flex-wrap gap-2">
                {ALL_MONTHS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMonth(m)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      assignMonths.includes(m)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                    }`}
                    data-ocid={`transport.month-toggle.${m}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={handleAssign} data-ocid="transport.assign_button">
              Assign to Transport
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Assigned students table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {[
                "Student",
                "Adm. No.",
                "Class",
                "Route",
                "Stop",
                "Months",
                "Action",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assignedStudents.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-muted-foreground"
                  data-ocid="transport.assign_empty_state"
                >
                  <div className="text-3xl mb-1">👥</div>
                  No students assigned to transport yet.
                </td>
              </tr>
            ) : (
              assignedStudents.map((s, idx) => (
                <tr
                  key={s.id}
                  className="border-t border-border hover:bg-muted/30"
                  data-ocid={`transport.assign_item.${idx + 1}`}
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {s.fullName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.admNo}</td>
                  <td className="px-4 py-3">
                    {s.class} {s.section}
                  </td>
                  <td className="px-4 py-3">{s.transportRoute || "—"}</td>
                  <td className="px-4 py-3">{s.transportPickup || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(s.transportMonths ?? []).map((m) => (
                        <Badge
                          key={m}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {m}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {!isReadOnly && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveAssignment(s.id)}
                        data-ocid={`transport.remove-assign_button.${idx + 1}`}
                      >
                        Remove
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderFeesTab = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Transport Fees</h2>

      {feesStudents.length === 0 ? (
        <Card data-ocid="transport.fees_empty_state">
          <CardContent className="py-16 text-center">
            <div className="text-4xl mb-3">₹</div>
            <p className="font-semibold text-foreground">
              No transport fees to show
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Assign students to routes with stops that have monthly fares.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {[
                  "Student",
                  "Class",
                  "Route",
                  "Stop",
                  "Monthly Fare",
                  "Active Months",
                  "Total Fee",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {feesStudents.map((s, idx) => {
                const fare = getMonthlyFare(s);
                const months = s.transportMonths?.length ?? 0;
                const total = fare * months;
                return (
                  <tr
                    key={s.id}
                    className="border-t border-border hover:bg-muted/30"
                    data-ocid={`transport.fees_item.${idx + 1}`}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {s.fullName}
                    </td>
                    <td className="px-4 py-3">
                      {s.class} {s.section}
                    </td>
                    <td className="px-4 py-3">{s.transportRoute || "—"}</td>
                    <td className="px-4 py-3">{s.transportPickup || "—"}</td>
                    <td className="px-4 py-3 font-medium">
                      {fare > 0 ? `₹${fare.toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{months}</Badge>
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary">
                      {total > 0 ? `₹${total.toLocaleString("en-IN")}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/40">
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-3 text-right font-semibold text-foreground"
                >
                  Total Transport Revenue:
                </td>
                <td className="px-4 py-3 font-bold text-primary">
                  ₹
                  {feesStudents
                    .reduce(
                      (sum, s) =>
                        sum +
                        getMonthlyFare(s) * (s.transportMonths?.length ?? 0),
                      0,
                    )
                    .toLocaleString("en-IN")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Tab Nav */}
      <div className="bg-card border border-border rounded-xl p-1 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              tab === t.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            data-ocid={`transport.tab-${t.id}_tab`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "routes" && renderRoutesTab()}
      {tab === "assign" && renderAssignTab()}
      {tab === "fees" && renderFeesTab()}

      {/* Route Modal */}
      {showRouteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card
            className="w-full max-w-md shadow-elevated"
            data-ocid="transport.route_dialog"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">
                {editRouteId ? "Edit Route" : "Add Route"}
              </CardTitle>
              <button
                type="button"
                onClick={() => {
                  setShowRouteModal(false);
                  setEditRouteId(null);
                }}
                className="text-muted-foreground hover:text-foreground text-xl"
                aria-label="Close"
                data-ocid="transport.route_close_button"
              >
                ×
              </button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Route Name *</Label>
                <Input
                  value={routeForm.name}
                  onChange={(e) =>
                    setRouteForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. North Route"
                  data-ocid="transport.route-name_input"
                />
              </div>
              <div>
                <Label>Driver Name</Label>
                <Input
                  value={routeForm.driver}
                  onChange={(e) =>
                    setRouteForm((p) => ({ ...p, driver: e.target.value }))
                  }
                  placeholder="Driver's full name"
                  data-ocid="transport.route-driver_input"
                />
              </div>
              <p className="text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg">
                💡 Monthly fares are set per stop after creating the route.
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleSaveRoute}
                  data-ocid="transport.route_save_button"
                >
                  Save Route
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRouteModal(false);
                    setEditRouteId(null);
                  }}
                  data-ocid="transport.route_cancel_button"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stop Modal */}
      {showStopModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card
            className="w-full max-w-sm shadow-elevated"
            data-ocid="transport.stop_dialog"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">
                {editStopId ? "Edit Stop" : "Add Stop"}
              </CardTitle>
              <button
                type="button"
                onClick={() => {
                  setShowStopModal(false);
                  setEditStopId(null);
                }}
                className="text-muted-foreground hover:text-foreground text-xl"
                aria-label="Close"
                data-ocid="transport.stop_close_button"
              >
                ×
              </button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Stop Name *</Label>
                <Input
                  value={stopForm.name}
                  onChange={(e) =>
                    setStopForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Main Gate"
                  data-ocid="transport.stop-name_input"
                />
              </div>
              <div>
                <Label>Monthly Fare (₹) *</Label>
                <Input
                  type="number"
                  min={0}
                  value={stopForm.fare || ""}
                  onChange={(e) =>
                    setStopForm((p) => ({
                      ...p,
                      fare: Math.max(0, Number(e.target.value)),
                    }))
                  }
                  placeholder="e.g. 500"
                  data-ocid="transport.stop-fare_input"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Students at this stop pay this per active month
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleSaveStop}
                  data-ocid="transport.stop_save_button"
                >
                  Save Stop
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowStopModal(false);
                    setEditStopId(null);
                  }}
                  data-ocid="transport.stop_cancel_button"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
