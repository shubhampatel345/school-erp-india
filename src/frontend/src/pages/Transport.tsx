import { useCallback, useEffect, useMemo, useState } from "react";
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
import { DEFAULT_TRANSPORT_MONTHS, MONTHS } from "../types";
import { formatCurrency, generateId } from "../utils/localStorage";
import LiveTracking from "./transport/LiveTracking";

// ── Local types ────────────────────────────────────────────
interface PickupPoint {
  id: string;
  name: string;
  routeId: string;
  routeName: string;
  monthlyFare: number;
  displayOrder: number;
}

interface TransportRoute {
  id: string;
  name: string;
  vehicleNo: string;
  capacity: number;
  driverName: string;
  driverMobile: string;
}

type Tab = "routes" | "pickup" | "students" | "report" | "livetracking";
const TABS: { id: Tab; label: string }[] = [
  { id: "routes", label: "Routes" },
  { id: "pickup", label: "Pickup Points" },
  { id: "students", label: "Student Transport" },
  { id: "report", label: "Transport Report" },
  { id: "livetracking", label: "🗺️ Live Tracking" },
];

const EMPTY_ROUTE: Omit<TransportRoute, "id"> = {
  name: "",
  vehicleNo: "",
  capacity: 0,
  driverName: "",
  driverMobile: "",
};
const EMPTY_POINT: Omit<PickupPoint, "id"> = {
  name: "",
  routeId: "",
  routeName: "",
  monthlyFare: 0,
  displayOrder: 0,
};

// ── Component ──────────────────────────────────────────────
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

  // ── Data ──────────────────────────────────────────────────
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [pickups, setPickups] = useState<PickupPoint[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    setRoutes(getData("transport_routes") as TransportRoute[]);
    setPickups(getData("transport_points") as PickupPoint[]);
    setStudents(getData("students") as Student[]);
  }, [getData]);

  // ── Route CRUD ────────────────────────────────────────────
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [editRouteId, setEditRouteId] = useState<string | null>(null);
  const [routeForm, setRouteForm] = useState(EMPTY_ROUTE);

  const openAddRoute = () => {
    setRouteForm(EMPTY_ROUTE);
    setEditRouteId(null);
    setShowRouteModal(true);
  };
  const openEditRoute = (r: TransportRoute) => {
    setRouteForm({
      name: r.name,
      vehicleNo: r.vehicleNo,
      capacity: r.capacity,
      driverName: r.driverName,
      driverMobile: r.driverMobile,
    });
    setEditRouteId(r.id);
    setShowRouteModal(true);
  };

  const handleSaveRoute = useCallback(async () => {
    if (!routeForm.name.trim()) return;
    if (editRouteId) {
      const updated = { ...routeForm, id: editRouteId };
      await updateData(
        "transport_routes",
        editRouteId,
        updated as Record<string, unknown>,
      );
      setRoutes((prev) =>
        prev.map((r) =>
          r.id === editRouteId ? { ...updated, id: editRouteId } : r,
        ),
      );
      addNotification(`Route "${routeForm.name}" updated`, "success", "🚌");
    } else {
      const newRoute = { id: generateId(), ...routeForm };
      await saveData(
        "transport_routes",
        newRoute as unknown as Record<string, unknown>,
      );
      setRoutes((prev) => [...prev, newRoute]);
      addNotification(`Route "${routeForm.name}" added`, "success", "🚌");
    }
    setShowRouteModal(false);
    setEditRouteId(null);
  }, [routeForm, editRouteId, saveData, updateData, addNotification]);

  const handleDeleteRoute = useCallback(
    async (id: string) => {
      await deleteData("transport_routes", id);
      setRoutes((prev) => prev.filter((r) => r.id !== id));
      addNotification("Route deleted", "info");
    },
    [deleteData, addNotification],
  );

  // ── Pickup Point CRUD ─────────────────────────────────────
  const [showPointModal, setShowPointModal] = useState(false);
  const [editPointId, setEditPointId] = useState<string | null>(null);
  const [pointForm, setPointForm] = useState(EMPTY_POINT);

  const openAddPoint = () => {
    setPointForm(EMPTY_POINT);
    setEditPointId(null);
    setShowPointModal(true);
  };
  const openEditPoint = (p: PickupPoint) => {
    setPointForm({
      name: p.name,
      routeId: p.routeId,
      routeName: p.routeName,
      monthlyFare: p.monthlyFare,
      displayOrder: p.displayOrder,
    });
    setEditPointId(p.id);
    setShowPointModal(true);
  };

  const handleSavePoint = useCallback(async () => {
    if (!pointForm.name.trim() || !pointForm.routeId) return;
    const route = routes.find((r) => r.id === pointForm.routeId);
    const data = {
      ...pointForm,
      routeName: route?.name ?? pointForm.routeName,
    };
    if (editPointId) {
      const updated = { ...data, id: editPointId };
      await updateData(
        "transport_points",
        editPointId,
        updated as Record<string, unknown>,
      );
      setPickups((prev) =>
        prev.map((p) =>
          p.id === editPointId ? { ...updated, id: editPointId } : p,
        ),
      );
      addNotification(`Pickup point "${pointForm.name}" updated`, "success");
    } else {
      const newPoint = { id: generateId(), ...data };
      await saveData(
        "transport_points",
        newPoint as unknown as Record<string, unknown>,
      );
      setPickups((prev) => [...prev, newPoint]);
      addNotification(`Pickup point "${pointForm.name}" added`, "success");
    }
    setShowPointModal(false);
    setEditPointId(null);
  }, [pointForm, editPointId, routes, saveData, updateData, addNotification]);

  const handleDeletePoint = useCallback(
    async (id: string) => {
      await deleteData("transport_points", id);
      setPickups((prev) => prev.filter((p) => p.id !== id));
    },
    [deleteData],
  );

  // ── Student Transport ─────────────────────────────────────
  const [assignStudentId, setAssignStudentId] = useState("");
  const [assignRouteId, setAssignRouteId] = useState("");
  const [assignPointId, setAssignPointId] = useState("");
  const [assignMonths, setAssignMonths] = useState<string[]>(
    DEFAULT_TRANSPORT_MONTHS,
  );
  const [filterClass, setFilterClass] = useState("");

  const activeStudents = useMemo(
    () => students.filter((s) => s.status !== "discontinued"),
    [students],
  );
  const classOptions = useMemo(
    () => [...new Set(activeStudents.map((s) => s.class))].sort(),
    [activeStudents],
  );

  const filteredForAssign = useMemo(
    () => activeStudents.filter((s) => !filterClass || s.class === filterClass),
    [activeStudents, filterClass],
  );

  const pointsForRoute = useMemo(
    () =>
      pickups
        .filter((p) => p.routeId === assignRouteId)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [pickups, assignRouteId],
  );

  const selectedPoint = useMemo(
    () => pickups.find((p) => p.id === assignPointId),
    [pickups, assignPointId],
  );

  const toggleMonth = (m: string) =>
    setAssignMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );

  const handleAssign = useCallback(async () => {
    if (!assignStudentId || !assignRouteId) return;
    const student = activeStudents.find((s) => s.id === assignStudentId);
    const route = routes.find((r) => r.id === assignRouteId);
    if (!student || !route) return;
    const updates = {
      transportId: route.id,
      transportRoute: route.name,
      transportBusNo: route.vehicleNo,
      transportPickup: selectedPoint?.name ?? "",
      transportPickupId: assignPointId,
      transportMonths: assignMonths,
    };
    await updateData("students", student.id, updates);
    setStudents((prev) =>
      prev.map((s) => (s.id === student.id ? { ...s, ...updates } : s)),
    );
    addNotification(
      `${student.fullName} assigned to ${route.name}`,
      "success",
      "🚌",
    );
    setAssignStudentId("");
    setAssignRouteId("");
    setAssignPointId("");
    setAssignMonths(DEFAULT_TRANSPORT_MONTHS);
  }, [
    assignStudentId,
    assignRouteId,
    assignPointId,
    assignMonths,
    activeStudents,
    routes,
    selectedPoint,
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
      addNotification("Transport assignment removed", "info");
    },
    [updateData, addNotification],
  );

  const assignedStudents = useMemo(
    () => activeStudents.filter((s) => s.transportId),
    [activeStudents],
  );

  // ── Report ────────────────────────────────────────────────
  const reportByRoute = useMemo(() => {
    return routes.map((route) => {
      const routeStudents = assignedStudents.filter(
        (s) => s.transportId === route.id,
      );
      const totalRevenue = routeStudents.reduce((sum, s) => {
        const point = pickups.find(
          (p) =>
            p.id ===
              (s as Student & { transportPickupId?: string })
                .transportPickupId || p.name === s.transportPickup,
        );
        const fare = point?.monthlyFare ?? 0;
        const months = s.transportMonths?.length ?? 0;
        return sum + fare * months;
      }, 0);
      return { route, students: routeStudents, totalRevenue };
    });
  }, [routes, assignedStudents, pickups]);

  // ── Render helpers ────────────────────────────────────────
  const Modal = ({
    title,
    onClose,
    children,
  }: { title: string; onClose: () => void; children: React.ReactNode }) => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-elevated animate-slide-up">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted"
            aria-label="Close"
          >
            ×
          </button>
        </CardHeader>
        <CardContent className="space-y-3">{children}</CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="bg-card border border-border rounded-xl p-1 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
            data-ocid={`transport.${t.id}_tab`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ROUTES TAB ── */}
      {tab === "routes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Routes</h2>
              <p className="text-sm text-muted-foreground">
                {routes.length} routes · fares set per pickup point
              </p>
            </div>
            {!isReadOnly && (
              <Button
                onClick={openAddRoute}
                data-ocid="transport.add_route_button"
              >
                + Add Route
              </Button>
            )}
          </div>
          {routes.length === 0 ? (
            <Card data-ocid="transport.routes_empty_state">
              <CardContent className="py-14 text-center">
                <div className="text-4xl mb-3">🚌</div>
                <p className="font-semibold text-foreground">No routes yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add a route to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {[
                      "Route Name",
                      "Vehicle No.",
                      "Capacity",
                      "Driver Name",
                      "Driver Mobile",
                      "Actions",
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
                  {routes.map((r, idx) => (
                    <tr
                      key={r.id}
                      className="border-t border-border hover:bg-muted/30"
                      data-ocid={`transport.route.${idx + 1}`}
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {r.name}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{r.vehicleNo || "—"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.capacity || "—"}
                      </td>
                      <td className="px-4 py-3">{r.driverName || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.driverMobile || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {!isReadOnly && (
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditRoute(r)}
                              data-ocid={`transport.edit_route_button.${idx + 1}`}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteRoute(r.id)}
                              data-ocid={`transport.delete_route_button.${idx + 1}`}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PICKUP POINTS TAB ── */}
      {tab === "pickup" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Pickup Points
              </h2>
              <p className="text-sm text-muted-foreground">
                {pickups.length} pickup points · monthly fare per point
              </p>
            </div>
            {!isReadOnly && (
              <Button
                onClick={openAddPoint}
                data-ocid="transport.add_point_button"
              >
                + Add Pickup Point
              </Button>
            )}
          </div>
          {pickups.length === 0 ? (
            <Card data-ocid="transport.pickup_empty_state">
              <CardContent className="py-14 text-center">
                <div className="text-4xl mb-3">📍</div>
                <p className="font-semibold text-foreground">
                  No pickup points yet
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add routes first, then add pickup points with fares
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {[
                      "Point Name",
                      "Route",
                      "Monthly Fare (₹)",
                      "Order",
                      "Actions",
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
                  {[...pickups]
                    .sort(
                      (a, b) =>
                        (a.routeName || "").localeCompare(b.routeName || "") ||
                        a.displayOrder - b.displayOrder,
                    )
                    .map((p, idx) => (
                      <tr
                        key={p.id}
                        className="border-t border-border hover:bg-muted/30"
                        data-ocid={`transport.pickup.${idx + 1}`}
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {p.name}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">
                            {p.routeName || "—"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-semibold text-primary">
                          {p.monthlyFare > 0
                            ? formatCurrency(p.monthlyFare)
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {p.displayOrder || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {!isReadOnly && (
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditPoint(p)}
                                data-ocid={`transport.edit_point_button.${idx + 1}`}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeletePoint(p.id)}
                                data-ocid={`transport.delete_point_button.${idx + 1}`}
                              >
                                Delete
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── STUDENT TRANSPORT TAB ── */}
      {tab === "students" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Student Transport
          </h2>

          {!isReadOnly && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Assign Transport</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <Label>Filter by Class</Label>
                    <select
                      className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                      value={filterClass}
                      onChange={(e) => setFilterClass(e.target.value)}
                      data-ocid="transport.filter_class_select"
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
                    <Label>Student *</Label>
                    <select
                      className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                      value={assignStudentId}
                      onChange={(e) => setAssignStudentId(e.target.value)}
                      data-ocid="transport.assign_student_select"
                    >
                      <option value="">— Select Student —</option>
                      {filteredForAssign.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName} ({s.admNo}) {s.class}-{s.section}
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
                        setAssignPointId("");
                      }}
                      data-ocid="transport.assign_route_select"
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
                    <Label>Pickup Point</Label>
                    <select
                      className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                      value={assignPointId}
                      onChange={(e) => setAssignPointId(e.target.value)}
                      data-ocid="transport.assign_point_select"
                    >
                      <option value="">— Select Point —</option>
                      {pointsForRoute.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — ₹{p.monthlyFare}/mo
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {assignPointId && selectedPoint && (
                  <div className="bg-muted/40 px-3 py-2 rounded-lg text-sm">
                    Monthly Fare:{" "}
                    <strong className="text-primary">
                      {formatCurrency(selectedPoint.monthlyFare)}
                    </strong>
                  </div>
                )}
                <div>
                  <Label className="mb-2 block">
                    Transport Months (June auto-deselected)
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {MONTHS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleMonth(m)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${assignMonths.includes(m) ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/50"}`}
                        data-ocid={`transport.month_${m}_toggle`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={handleAssign}
                  data-ocid="transport.assign_button"
                >
                  Assign to Transport
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "Student",
                    "Class",
                    "Route",
                    "Pickup Point",
                    "Monthly Fare",
                    "Active Months",
                    "Actions",
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
                      className="px-4 py-12 text-center text-muted-foreground"
                      data-ocid="transport.students_empty_state"
                    >
                      <div className="text-3xl mb-2">👥</div>No students
                      assigned to transport
                    </td>
                  </tr>
                ) : (
                  assignedStudents.map((s, idx) => {
                    const point = pickups.find(
                      (p) =>
                        p.name === s.transportPickup &&
                        p.routeId === s.transportId,
                    );
                    return (
                      <tr
                        key={s.id}
                        className="border-t border-border hover:bg-muted/30"
                        data-ocid={`transport.student.${idx + 1}`}
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {s.fullName}
                        </td>
                        <td className="px-4 py-3">
                          {s.class} {s.section}
                        </td>
                        <td className="px-4 py-3">{s.transportRoute || "—"}</td>
                        <td className="px-4 py-3">
                          {s.transportPickup || "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-primary">
                          {point ? formatCurrency(point.monthlyFare) : "—"}
                        </td>
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
                              data-ocid={`transport.remove_button.${idx + 1}`}
                            >
                              Remove
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── REPORT TAB ── */}
      {tab === "report" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Transport Report
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-3 text-center">
                <div className="text-2xl font-bold text-primary">
                  {assignedStudents.length}
                </div>
                <div className="text-xs text-muted-foreground">
                  Students on Transport
                </div>
              </CardContent>
            </Card>
            <Card className="bg-accent/10 border-accent/20">
              <CardContent className="py-3 text-center">
                <div className="text-lg font-bold text-accent">
                  {formatCurrency(
                    reportByRoute.reduce((s, r) => s + r.totalRevenue, 0),
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Revenue
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 text-center">
                <div className="text-2xl font-bold text-foreground">
                  {routes.length}
                </div>
                <div className="text-xs text-muted-foreground">
                  Active Routes
                </div>
              </CardContent>
            </Card>
          </div>

          {reportByRoute.map(({ route, students: rs, totalRevenue }) => (
            <Card key={route.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    🚌 {route.name}
                    {route.vehicleNo && (
                      <Badge variant="outline">{route.vehicleNo}</Badge>
                    )}
                    <Badge variant="secondary">{rs.length} students</Badge>
                  </CardTitle>
                  <span className="text-sm font-semibold text-primary">
                    {formatCurrency(totalRevenue)}/session
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {rs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No students on this route
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          {[
                            "Student",
                            "Class",
                            "Pickup",
                            "Fare/mo",
                            "Months",
                            "Total",
                          ].map((h) => (
                            <th
                              key={h}
                              className="px-2 py-2 text-left text-muted-foreground font-medium"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rs.map((s, i) => {
                          const point = pickups.find(
                            (p) =>
                              p.name === s.transportPickup &&
                              p.routeId === s.transportId,
                          );
                          const fare = point?.monthlyFare ?? 0;
                          const months = s.transportMonths?.length ?? 0;
                          return (
                            <tr
                              key={s.id}
                              className="border-t border-border/50"
                              data-ocid={`transport.report_item.${i + 1}`}
                            >
                              <td className="px-2 py-2 font-medium">
                                {s.fullName}
                              </td>
                              <td className="px-2 py-2">
                                {s.class}-{s.section}
                              </td>
                              <td className="px-2 py-2">
                                {s.transportPickup || "—"}
                              </td>
                              <td className="px-2 py-2 text-right">
                                {fare > 0 ? `₹${fare}` : "—"}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {months}
                              </td>
                              <td className="px-2 py-2 text-right font-semibold text-primary">
                                {fare > 0 ? `₹${fare * months}` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── LIVE TRACKING TAB ── */}
      {tab === "livetracking" && <LiveTracking />}

      {/* Route Modal */}
      {showRouteModal && (
        <Modal
          title={editRouteId ? "Edit Route" : "Add Route"}
          onClose={() => {
            setShowRouteModal(false);
            setEditRouteId(null);
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Route Name *</Label>
              <Input
                value={routeForm.name}
                onChange={(e) =>
                  setRouteForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g. North Route"
                data-ocid="transport.route_name_input"
              />
            </div>
            <div>
              <Label>Vehicle No.</Label>
              <Input
                value={routeForm.vehicleNo}
                onChange={(e) =>
                  setRouteForm((p) => ({ ...p, vehicleNo: e.target.value }))
                }
                placeholder="e.g. UP32 AB 1234"
                data-ocid="transport.route_vehicle_input"
              />
            </div>
            <div>
              <Label>Capacity</Label>
              <Input
                type="number"
                min={0}
                value={routeForm.capacity || ""}
                onChange={(e) =>
                  setRouteForm((p) => ({
                    ...p,
                    capacity: Number(e.target.value),
                  }))
                }
                placeholder="e.g. 40"
              />
            </div>
            <div>
              <Label>Driver Name</Label>
              <Input
                value={routeForm.driverName}
                onChange={(e) =>
                  setRouteForm((p) => ({ ...p, driverName: e.target.value }))
                }
                placeholder="Driver's full name"
                data-ocid="transport.route_driver_input"
              />
            </div>
            <div>
              <Label>Driver Mobile</Label>
              <Input
                value={routeForm.driverMobile}
                onChange={(e) =>
                  setRouteForm((p) => ({ ...p, driverMobile: e.target.value }))
                }
                placeholder="10-digit mobile"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg">
            💡 Monthly fares are set per pickup point, not per route.
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
        </Modal>
      )}

      {/* Pickup Point Modal */}
      {showPointModal && (
        <Modal
          title={editPointId ? "Edit Pickup Point" : "Add Pickup Point"}
          onClose={() => {
            setShowPointModal(false);
            setEditPointId(null);
          }}
        >
          <div>
            <Label>Route *</Label>
            <select
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
              value={pointForm.routeId}
              onChange={(e) =>
                setPointForm((p) => ({ ...p, routeId: e.target.value }))
              }
              data-ocid="transport.point_route_select"
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
            <Label>Pickup Point Name *</Label>
            <Input
              value={pointForm.name}
              onChange={(e) =>
                setPointForm((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="e.g. Main Gate, Bus Stand"
              data-ocid="transport.point_name_input"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Monthly Fare (₹) *</Label>
              <Input
                type="number"
                min={0}
                value={pointForm.monthlyFare || ""}
                onChange={(e) =>
                  setPointForm((p) => ({
                    ...p,
                    monthlyFare: Number(e.target.value),
                  }))
                }
                placeholder="e.g. 500"
                data-ocid="transport.point_fare_input"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Students at this point pay this per active month
              </p>
            </div>
            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                min={1}
                value={pointForm.displayOrder || ""}
                onChange={(e) =>
                  setPointForm((p) => ({
                    ...p,
                    displayOrder: Number(e.target.value),
                  }))
                }
                placeholder="e.g. 1"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleSavePoint}
              data-ocid="transport.point_save_button"
            >
              Save Point
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowPointModal(false);
                setEditPointId(null);
              }}
              data-ocid="transport.point_cancel_button"
            >
              Cancel
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
