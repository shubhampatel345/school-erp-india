import { useCallback, useState } from "react";
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
import type { Staff, Student } from "../types";
import { CLASSES, SECTIONS, generateId, ls } from "../utils/localStorage";

// ── Types ──────────────────────────────────────────────────
interface RouteRecord {
  id: string;
  busNo: string;
  routeName: string;
  driverStaffId: string;
  driverName: string;
  driverMobile: string;
  monthlyFare: number;
  pickupPoints: PickupPoint[];
}

interface PickupPoint {
  id: string;
  stopName: string;
  order: number;
  distance: string;
  fare: number; // monthly fare for this pickup point (₹)
}

interface StudentTransport {
  studentId: string;
  studentName: string;
  admNo: string;
  class: string;
  section: string;
  routeId: string;
  busNo: string;
  routeName: string;
  pickupPointId: string;
  pickupPointName: string;
}

type TransportTab = "routes" | "pickup" | "students" | "dashboard";

const TABS: { id: TransportTab; label: string; icon: string }[] = [
  { id: "routes", label: "Routes & Buses", icon: "🚌" },
  { id: "pickup", label: "Pickup Points", icon: "📍" },
  { id: "students", label: "Student Assignments", icon: "👥" },
  { id: "dashboard", label: "Dashboard", icon: "📊" },
];

const EMPTY_ROUTE: Omit<RouteRecord, "id" | "pickupPoints"> = {
  busNo: "",
  routeName: "",
  driverStaffId: "",
  driverName: "",
  driverMobile: "",
  monthlyFare: 0,
};

// ── Component ──────────────────────────────────────────────
export default function Transport() {
  const { addNotification, isReadOnly } = useApp();
  const [activeTab, setActiveTab] = useState<TransportTab>("routes");

  const [routes, setRoutes] = useState<RouteRecord[]>(() =>
    ls.get<RouteRecord[]>("transport_routes_v2", []),
  );
  const [studentTransports, setStudentTransports] = useState<
    StudentTransport[]
  >(() => ls.get<StudentTransport[]>("student_transport_v2", []));

  // ── Modals / forms ────────────────────────────────────────
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeForm, setRouteForm] =
    useState<Omit<RouteRecord, "id" | "pickupPoints">>(EMPTY_ROUTE);
  const [editRouteId, setEditRouteId] = useState<string | null>(null);

  const [showPickupModal, setShowPickupModal] = useState(false);
  const [pickupRouteId, setPickupRouteId] = useState("");
  const [pickupForm, setPickupForm] = useState({
    stopName: "",
    order: 1,
    distance: "",
    fare: 0,
  });
  const [editPickupId, setEditPickupId] = useState<string | null>(null);

  const [studentSearch, setStudentSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [assignForm, setAssignForm] = useState({
    studentId: "",
    routeId: "",
    pickupPointId: "",
  });

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // ── Data ──────────────────────────────────────────────────
  const allStaff = ls.get<Staff[]>("staff", []);
  const drivers = allStaff.filter(
    (s) => s.designation?.toLowerCase() === "driver",
  );

  const allStudents = ls.get<Student[]>("students", []);
  const activeStudents = allStudents.filter((s) => s.status !== "discontinued");
  const filteredStudents = activeStudents.filter((s) => {
    const q = studentSearch.toLowerCase();
    const matchSearch =
      !q ||
      s.fullName.toLowerCase().includes(q) ||
      s.admNo.toLowerCase().includes(q);
    const matchClass = !filterClass || s.class === filterClass;
    const matchSection = !filterSection || s.section === filterSection;
    return matchSearch && matchClass && matchSection;
  });

  // ── Persist helpers ───────────────────────────────────────
  const saveRoutes = useCallback((data: RouteRecord[]) => {
    setRoutes(data);
    ls.set("transport_routes_v2", data);
  }, []);

  const saveStudentTransports = useCallback(
    (data: StudentTransport[]) => {
      setStudentTransports(data);
      ls.set("student_transport_v2", data);
      // Also sync to student records so StudentDetail auto-populates
      const students = ls.get<Student[]>("students", []);
      const updated = students.map((st) => {
        const found = data.find((d) => d.studentId === st.id);
        if (found) {
          return {
            ...st,
            transportBusNo: found.busNo,
            transportRoute: found.routeName,
            transportPickup: found.pickupPointName,
            transportId: found.routeId,
          };
        }
        // Remove if unassigned
        const wasAssigned = studentTransports.some(
          (d) => d.studentId === st.id,
        );
        if (wasAssigned && !found) {
          return {
            ...st,
            transportBusNo: undefined,
            transportRoute: undefined,
            transportPickup: undefined,
            transportId: undefined,
          };
        }
        return st;
      });
      ls.set("students", updated);
    },
    [studentTransports],
  );

  // ── Route CRUD ────────────────────────────────────────────
  const handleSaveRoute = useCallback(() => {
    if (!routeForm.busNo.trim() || !routeForm.routeName.trim()) return;
    const driverStaff = drivers.find((d) => d.id === routeForm.driverStaffId);
    const entry = {
      ...routeForm,
      driverName: driverStaff?.name || routeForm.driverName,
      driverMobile: driverStaff?.mobile || routeForm.driverMobile,
    };
    if (editRouteId) {
      saveRoutes(
        routes.map((r) =>
          r.id === editRouteId
            ? { ...entry, id: editRouteId, pickupPoints: r.pickupPoints }
            : r,
        ),
      );
    } else {
      saveRoutes([...routes, { ...entry, id: generateId(), pickupPoints: [] }]);
      addNotification(`Route "${routeForm.routeName}" added`, "success", "🚌");
    }
    setRouteForm(EMPTY_ROUTE);
    setEditRouteId(null);
    setShowRouteModal(false);
  }, [routeForm, editRouteId, routes, saveRoutes, drivers, addNotification]);

  const handleDeleteRoute = useCallback(
    (id: string) => {
      const assignedCount = studentTransports.filter(
        (s) => s.routeId === id,
      ).length;
      if (assignedCount > 0) {
        setConfirmDelete(id);
      } else {
        saveRoutes(routes.filter((r) => r.id !== id));
      }
    },
    [routes, saveRoutes, studentTransports],
  );

  const handleConfirmDelete = useCallback(() => {
    if (!confirmDelete) return;
    saveRoutes(routes.filter((r) => r.id !== confirmDelete));
    saveStudentTransports(
      studentTransports.filter((s) => s.routeId !== confirmDelete),
    );
    setConfirmDelete(null);
  }, [
    confirmDelete,
    routes,
    saveRoutes,
    studentTransports,
    saveStudentTransports,
  ]);

  // ── Pickup Point CRUD ─────────────────────────────────────
  const handleSavePickup = useCallback(() => {
    if (!pickupRouteId || !pickupForm.stopName.trim()) return;
    const updatedRoutes = routes.map((r) => {
      if (r.id !== pickupRouteId) return r;
      if (editPickupId) {
        return {
          ...r,
          pickupPoints: r.pickupPoints.map((p) =>
            p.id === editPickupId ? { ...pickupForm, id: editPickupId } : p,
          ),
        };
      }
      const newPp: PickupPoint = { ...pickupForm, id: generateId() };
      return { ...r, pickupPoints: [...r.pickupPoints, newPp] };
    });
    saveRoutes(updatedRoutes);
    setPickupForm({ stopName: "", order: 1, distance: "", fare: 0 });
    setEditPickupId(null);
    setShowPickupModal(false);
  }, [pickupRouteId, pickupForm, editPickupId, routes, saveRoutes]);

  const handleDeletePickup = useCallback(
    (routeId: string, ppId: string) => {
      saveRoutes(
        routes.map((r) =>
          r.id === routeId
            ? {
                ...r,
                pickupPoints: r.pickupPoints.filter((p) => p.id !== ppId),
              }
            : r,
        ),
      );
    },
    [routes, saveRoutes],
  );

  // Move pickup point up/down
  const movePickup = useCallback(
    (routeId: string, ppId: string, dir: "up" | "down") => {
      saveRoutes(
        routes.map((r) => {
          if (r.id !== routeId) return r;
          const pts = [...r.pickupPoints];
          const idx = pts.findIndex((p) => p.id === ppId);
          if (dir === "up" && idx > 0)
            [pts[idx - 1], pts[idx]] = [pts[idx], pts[idx - 1]];
          if (dir === "down" && idx < pts.length - 1)
            [pts[idx], pts[idx + 1]] = [pts[idx + 1], pts[idx]];
          return {
            ...r,
            pickupPoints: pts.map((p, i) => ({ ...p, order: i + 1 })),
          };
        }),
      );
    },
    [routes, saveRoutes],
  );

  // ── Student Assignment ────────────────────────────────────
  const selectedRoute = routes.find((r) => r.id === assignForm.routeId);

  const handleAssignStudent = useCallback(() => {
    if (!assignForm.studentId || !assignForm.routeId) return;
    const student = activeStudents.find((s) => s.id === assignForm.studentId);
    const route = routes.find((r) => r.id === assignForm.routeId);
    const pp = route?.pickupPoints.find(
      (p) => p.id === assignForm.pickupPointId,
    );
    if (!student || !route) return;
    const entry: StudentTransport = {
      studentId: student.id,
      studentName: student.fullName,
      admNo: student.admNo,
      class: student.class,
      section: student.section,
      routeId: route.id,
      busNo: route.busNo,
      routeName: route.routeName,
      pickupPointId: pp?.id || "",
      pickupPointName: pp?.stopName || "",
    };
    const rest = studentTransports.filter((s) => s.studentId !== student.id);
    saveStudentTransports([...rest, entry]);
    addNotification(
      `${student.fullName} assigned to Bus ${route.busNo}`,
      "success",
      "🚌",
    );
    setAssignForm({ studentId: "", routeId: "", pickupPointId: "" });
    setStudentSearch("");
  }, [
    assignForm,
    activeStudents,
    routes,
    studentTransports,
    saveStudentTransports,
    addNotification,
  ]);

  const handleRemoveAssignment = useCallback(
    (studentId: string) => {
      saveStudentTransports(
        studentTransports.filter((s) => s.studentId !== studentId),
      );
      addNotification("Transport assignment removed", "info", "🚌");
    },
    [studentTransports, saveStudentTransports, addNotification],
  );

  // ── Dashboard stats ───────────────────────────────────────
  const totalAssigned = studentTransports.length;
  const routeStats = routes.map((r) => ({
    ...r,
    count: studentTransports.filter((s) => s.routeId === r.id).length,
  }));

  // ── Tab content renderers ─────────────────────────────────
  const renderRoutesTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Routes & Buses
          </h2>
          <p className="text-sm text-muted-foreground">
            {routes.length} routes configured
          </p>
        </div>
        {!isReadOnly && (
          <Button
            onClick={() => {
              setRouteForm(EMPTY_ROUTE);
              setEditRouteId(null);
              setShowRouteModal(true);
            }}
            data-ocid="add-route-btn"
          >
            + Add Route
          </Button>
        )}
      </div>

      {routes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-4xl mb-3">🚌</div>
            <p className="font-semibold text-foreground">No routes yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add a bus route to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {[
                  "Bus No.",
                  "Route Name",
                  "Driver",
                  "Monthly Fare",
                  "Students",
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
              {routes.map((route) => {
                const count = studentTransports.filter(
                  (s) => s.routeId === route.id,
                ).length;
                // Compute fare range for display
                const fares = route.pickupPoints
                  .map((p) => p.fare ?? 0)
                  .filter((f) => f > 0);
                const fareDisplay =
                  fares.length === 0
                    ? "—"
                    : fares.length === 1
                      ? `₹${fares[0].toLocaleString("en-IN")}`
                      : `₹${Math.min(...fares).toLocaleString("en-IN")}–₹${Math.max(...fares).toLocaleString("en-IN")}`;
                return (
                  <tr
                    key={route.id}
                    className="border-t border-border hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono">
                        {route.busNo}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {route.routeName}
                    </td>
                    <td className="px-4 py-3">
                      <div>{route.driverName || "—"}</div>
                      {route.driverMobile && (
                        <div className="text-xs text-muted-foreground">
                          {route.driverMobile}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      <div className="text-sm">{fareDisplay}</div>
                      {fares.length > 1 && (
                        <div className="text-[10px] text-muted-foreground">
                          {route.pickupPoints.length} stops
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={count > 0 ? "secondary" : "outline"}>
                        {count} students
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRouteForm({
                              busNo: route.busNo,
                              routeName: route.routeName,
                              driverStaffId: route.driverStaffId,
                              driverName: route.driverName,
                              driverMobile: route.driverMobile,
                              monthlyFare: route.monthlyFare,
                            });
                            setEditRouteId(route.id);
                            setShowRouteModal(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteRoute(route.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderPickupTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Pickup Points
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage stops for each route
          </p>
        </div>
        {!isReadOnly && (
          <Button
            onClick={() => {
              setPickupForm({ stopName: "", order: 1, distance: "", fare: 0 });
              setEditPickupId(null);
              setPickupRouteId(routes[0]?.id || "");
              setShowPickupModal(true);
            }}
            data-ocid="add-pickup-btn"
          >
            + Add Stop
          </Button>
        )}
      </div>

      {routes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Add routes first before managing pickup points.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {routes.map((route) => (
            <Card key={route.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {route.busNo}
                    </Badge>
                    {route.routeName}
                    <Badge variant="secondary">
                      {route.pickupPoints.length} stops
                    </Badge>
                  </CardTitle>
                  {!isReadOnly && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPickupRouteId(route.id);
                        setPickupForm({
                          stopName: "",
                          order: route.pickupPoints.length + 1,
                          distance: "",
                          fare: 0,
                        });
                        setEditPickupId(null);
                        setShowPickupModal(true);
                      }}
                    >
                      + Add Stop
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {route.pickupPoints.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No stops added yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {[...route.pickupPoints]
                      .sort((a, b) => a.order - b.order)
                      .map((pp, idx) => (
                        <div
                          key={pp.id}
                          className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2"
                        >
                          <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="flex-1 font-medium text-foreground">
                            {pp.stopName}
                          </span>
                          {pp.distance && (
                            <span className="text-xs text-muted-foreground">
                              {pp.distance} km
                            </span>
                          )}
                          {pp.fare > 0 && (
                            <span className="text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                              ₹{pp.fare.toLocaleString("en-IN")}/mo
                            </span>
                          )}
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => movePickup(route.id, pp.id, "up")}
                              disabled={idx === 0}
                              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                              aria-label="Move up"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                movePickup(route.id, pp.id, "down")
                              }
                              disabled={idx === route.pickupPoints.length - 1}
                              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                              aria-label="Move down"
                            >
                              ▼
                            </button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPickupRouteId(route.id);
                                setPickupForm({
                                  stopName: pp.stopName,
                                  order: pp.order,
                                  distance: pp.distance,
                                  fare: pp.fare ?? 0,
                                });
                                setEditPickupId(pp.id);
                                setShowPickupModal(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleDeletePickup(route.id, pp.id)
                              }
                            >
                              ✕
                            </Button>
                          </div>
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

  const renderStudentsTab = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        Student Transport Assignment
      </h2>

      {!isReadOnly && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Assign Student to Route</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Filter Class</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                >
                  <option value="">All Classes</option>
                  {CLASSES.map((c) => (
                    <option key={c} value={c}>
                      Class {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Filter Section</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                >
                  <option value="">All Sections</option>
                  {SECTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Search Student</Label>
                <Input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Name or Adm. No."
                  data-ocid="student-transport-search"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Select Student *</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                  value={assignForm.studentId}
                  onChange={(e) =>
                    setAssignForm((p) => ({ ...p, studentId: e.target.value }))
                  }
                  data-ocid="student-transport-select"
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
                <Label>Route / Bus *</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                  value={assignForm.routeId}
                  onChange={(e) =>
                    setAssignForm((p) => ({
                      ...p,
                      routeId: e.target.value,
                      pickupPointId: "",
                    }))
                  }
                  data-ocid="assign-route-select"
                >
                  <option value="">— Select Route —</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      Bus {r.busNo} — {r.routeName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Pickup Point</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                  value={assignForm.pickupPointId}
                  onChange={(e) =>
                    setAssignForm((p) => ({
                      ...p,
                      pickupPointId: e.target.value,
                    }))
                  }
                  data-ocid="assign-pickup-select"
                >
                  <option value="">— Select Stop —</option>
                  {(selectedRoute?.pickupPoints || []).map((pp) => (
                    <option key={pp.id} value={pp.id}>
                      {pp.stopName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              onClick={handleAssignStudent}
              data-ocid="assign-student-btn"
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
                "Student Name",
                "Adm. No.",
                "Class",
                "Bus No.",
                "Route",
                "Pickup Point",
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
            {studentTransports.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No students assigned to transport yet.
                </td>
              </tr>
            ) : (
              studentTransports.map((st) => (
                <tr
                  key={st.studentId}
                  className="border-t border-border hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {st.studentName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {st.admNo}
                  </td>
                  <td className="px-4 py-3">
                    {st.class} {st.section}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="font-mono">
                      {st.busNo}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{st.routeName}</td>
                  <td className="px-4 py-3">{st.pickupPointName || "—"}</td>
                  <td className="px-4 py-3">
                    {!isReadOnly && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveAssignment(st.studentId)}
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

  const renderDashboardTab = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">
        Transport Dashboard
      </h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-3xl font-bold text-primary">
              {routes.length}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Total Routes
            </div>
          </CardContent>
        </Card>
        <Card className="bg-accent/10 border-accent/20">
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-3xl font-bold text-accent">
              {totalAssigned}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Students on Transport
            </div>
          </CardContent>
        </Card>
        <Card className="bg-secondary border-border">
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-3xl font-bold text-foreground">
              {drivers.length}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Drivers</div>
          </CardContent>
        </Card>
        <Card className="bg-secondary border-border">
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-3xl font-bold text-foreground">
              {routes.reduce((s, r) => s + r.pickupPoints.length, 0)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Pickup Stops
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Route-wise student count */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">Route-wise Count</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {routeStats.length === 0 ? (
            <p className="text-sm text-muted-foreground col-span-2">
              No routes configured.
            </p>
          ) : (
            routeStats.map((r) => (
              <Card key={r.id}>
                <CardContent className="py-3 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    🚌
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground truncate">
                      {r.routeName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Bus {r.busNo} • Driver: {r.driverName || "Not assigned"}
                    </div>
                  </div>
                  <Badge
                    variant={r.count > 0 ? "default" : "outline"}
                    className="shrink-0"
                  >
                    {r.count} students
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Driver list */}
      {drivers.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-3">Drivers</h3>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "Driver Name",
                    "Mobile",
                    "Assigned Bus",
                    "Route",
                    "Students",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-semibold text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver) => {
                  const assignedRoute = routes.find(
                    (r) =>
                      r.driverStaffId === driver.id ||
                      r.driverName === driver.name,
                  );
                  const count = assignedRoute
                    ? studentTransports.filter(
                        (s) => s.routeId === assignedRoute.id,
                      ).length
                    : 0;
                  return (
                    <tr
                      key={driver.id}
                      className="border-t border-border hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-medium">{driver.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {driver.mobile}
                      </td>
                      <td className="px-4 py-3">
                        {assignedRoute ? (
                          <Badge variant="outline" className="font-mono">
                            {assignedRoute.busNo}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {assignedRoute?.routeName || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{count}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Tab Nav */}
      <div className="bg-card border border-border rounded-xl p-1 flex gap-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            data-ocid={`transport-tab-${tab.id}`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "routes" && renderRoutesTab()}
      {activeTab === "pickup" && renderPickupTab()}
      {activeTab === "students" && renderStudentsTab()}
      {activeTab === "dashboard" && renderDashboardTab()}

      {/* Route Modal */}
      {showRouteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-elevated">
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
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Bus No. *</Label>
                  <Input
                    value={routeForm.busNo}
                    onChange={(e) =>
                      setRouteForm((p) => ({ ...p, busNo: e.target.value }))
                    }
                    placeholder="e.g. MP-09-AB-1234"
                    data-ocid="route-busno-input"
                  />
                </div>
                <div>
                  <Label>Route Name *</Label>
                  <Input
                    value={routeForm.routeName}
                    onChange={(e) =>
                      setRouteForm((p) => ({ ...p, routeName: e.target.value }))
                    }
                    placeholder="e.g. North Route"
                    data-ocid="route-name-input"
                  />
                </div>
              </div>
              <div>
                <Label>Driver (from Staff)</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                  value={routeForm.driverStaffId}
                  onChange={(e) => {
                    const driver = drivers.find((d) => d.id === e.target.value);
                    setRouteForm((p) => ({
                      ...p,
                      driverStaffId: e.target.value,
                      driverName: driver?.name || p.driverName,
                      driverMobile: driver?.mobile || p.driverMobile,
                    }));
                  }}
                  data-ocid="route-driver-select"
                >
                  <option value="">— Select Driver —</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.mobile})
                    </option>
                  ))}
                </select>
              </div>
              {!routeForm.driverStaffId && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Driver Name (Manual)</Label>
                    <Input
                      value={routeForm.driverName}
                      onChange={(e) =>
                        setRouteForm((p) => ({
                          ...p,
                          driverName: e.target.value,
                        }))
                      }
                      placeholder="Driver name"
                    />
                  </div>
                  <div>
                    <Label>Driver Mobile</Label>
                    <Input
                      value={routeForm.driverMobile}
                      onChange={(e) =>
                        setRouteForm((p) => ({
                          ...p,
                          driverMobile: e.target.value,
                        }))
                      }
                      placeholder="Mobile number"
                    />
                  </div>
                </div>
              )}
              <div>
                <Label>Monthly Fare (₹)</Label>
                <Input
                  type="number"
                  value={routeForm.monthlyFare}
                  onChange={(e) =>
                    setRouteForm((p) => ({
                      ...p,
                      monthlyFare: Number(e.target.value),
                    }))
                  }
                  placeholder="0"
                  data-ocid="route-fare-input"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleSaveRoute} data-ocid="save-route-btn">
                  Save Route
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRouteModal(false);
                    setEditRouteId(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pickup Modal */}
      {showPickupModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-elevated">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">
                {editPickupId ? "Edit Stop" : "Add Pickup Stop"}
              </CardTitle>
              <button
                type="button"
                onClick={() => {
                  setShowPickupModal(false);
                  setEditPickupId(null);
                }}
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Route</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                  value={pickupRouteId}
                  onChange={(e) => setPickupRouteId(e.target.value)}
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      Bus {r.busNo} — {r.routeName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Stop Name *</Label>
                <Input
                  value={pickupForm.stopName}
                  onChange={(e) =>
                    setPickupForm((p) => ({ ...p, stopName: e.target.value }))
                  }
                  placeholder="e.g. Main Gate, Railway Station"
                  data-ocid="pickup-name-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Order</Label>
                  <Input
                    type="number"
                    min={1}
                    value={pickupForm.order}
                    onChange={(e) =>
                      setPickupForm((p) => ({
                        ...p,
                        order: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Distance (km)</Label>
                  <Input
                    value={pickupForm.distance}
                    onChange={(e) =>
                      setPickupForm((p) => ({ ...p, distance: e.target.value }))
                    }
                    placeholder="e.g. 5.2"
                  />
                </div>
              </div>
              <div>
                <Label>Monthly Fare (₹) *</Label>
                <Input
                  type="number"
                  min={0}
                  value={pickupForm.fare || ""}
                  onChange={(e) =>
                    setPickupForm((p) => ({
                      ...p,
                      fare: Math.max(0, Number(e.target.value)),
                    }))
                  }
                  placeholder="e.g. 500"
                  data-ocid="pickup-fare-input"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Students at this stop will be charged this amount each month
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleSavePickup} data-ocid="save-pickup-btn">
                  Save Stop
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPickupModal(false);
                    setEditPickupId(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm shadow-elevated">
            <CardHeader>
              <CardTitle className="text-base text-destructive">
                ⚠️ Delete Route?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This route has students assigned. Deleting it will remove all
                student transport assignments for this route.
              </p>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleConfirmDelete}>
                  Yes, Delete
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirmDelete(null)}
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
