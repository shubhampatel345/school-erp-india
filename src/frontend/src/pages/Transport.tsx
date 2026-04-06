import {
  Bus,
  ChevronDown,
  Edit,
  MapPin,
  Plus,
  Route,
  Search,
  Trash2,
  Truck,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type TransportTab =
  | "routes"
  | "vehicles"
  | "pickuppoints"
  | "routepickups"
  | "assignvehicle"
  | "feesmaster"
  | "studentfees"
  | "report";

interface TRoute {
  id: number;
  name: string;
  from: string;
  to: string;
  distance: number;
  status: "Active" | "Inactive";
}

interface TVehicle {
  id: number;
  vehicleNo: string;
  model: string;
  driverName: string;
  driverLicense: string;
  driverContact: string;
  capacity: number;
  routeAssigned: string;
}

interface TPickupPoint {
  id: number;
  name: string;
  route: string;
  pickupTime: string;
  dropTime: string;
  distanceFromSchool: number;
}

interface TRoutePickup {
  id: number;
  routeId: number;
  pickupPointId: number;
  sequence: number;
}

interface TVehicleAssign {
  id: number;
  routeId: number;
  vehicleId: number;
}

interface TFeesMaster {
  id: number;
  route: string;
  pickupPoint: string;
  monthlyFee: number;
  annualFee: number;
}

interface TStudentTransport {
  id: number;
  admNo: string;
  studentName: string;
  className: string;
  route: string;
  pickupPoint: string;
  monthlyFee: number;
}

function useLS<T>(key: string, def: T): [T, (v: T) => void] {
  const [val, setVal] = useState<T>(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? (JSON.parse(s) as T) : def;
    } catch {
      return def;
    }
  });
  const set = (v: T) => {
    setVal(v);
    localStorage.setItem(key, JSON.stringify(v));
  };
  return [val, set];
}

const inputCls =
  "bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-blue-500 w-full";
const labelCls = "text-gray-400 text-[11px] block mb-0.5";
const thCls = "text-left px-3 py-2 text-gray-400 font-medium text-xs";

function Badge({
  children,
  color,
}: { children: React.ReactNode; color: "green" | "red" | "blue" }) {
  const cls = {
    green: "bg-green-900/40 text-green-400",
    red: "bg-red-900/40 text-red-400",
    blue: "bg-blue-900/40 text-blue-400",
  }[color];
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${cls}`}>
      {children}
    </span>
  );
}

// ─────────── ROUTES ───────────
function RoutesTab() {
  const [routes, setRoutes] = useLS<TRoute[]>("erp_transport_routes", []);
  const [form, setForm] = useState({
    name: "",
    from: "",
    to: "",
    distance: "",
    status: "Active" as "Active" | "Inactive",
  });
  const [editing, setEditing] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const save = () => {
    if (!form.name.trim() || !form.from.trim() || !form.to.trim()) {
      toast.error("Fill required fields");
      return;
    }
    if (editing !== null) {
      setRoutes(
        routes.map((r) =>
          r.id === editing
            ? { ...r, ...form, distance: Number(form.distance) }
            : r,
        ),
      );
      setEditing(null);
    } else {
      setRoutes([
        ...routes,
        { id: Date.now(), ...form, distance: Number(form.distance) },
      ]);
    }
    setForm({ name: "", from: "", to: "", distance: "", status: "Active" });
    toast.success(editing !== null ? "Route updated" : "Route added");
  };

  const edit = (r: TRoute) => {
    setForm({
      name: r.name,
      from: r.from,
      to: r.to,
      distance: String(r.distance),
      status: r.status,
    });
    setEditing(r.id);
  };

  const del = (id: number) => {
    setRoutes(routes.filter((r) => r.id !== id));
    toast.success("Route deleted");
  };

  const filtered = routes.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.from.toLowerCase().includes(search.toLowerCase()) ||
      r.to.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div
        className="rounded-lg p-4"
        style={{ background: "#1a1f2e", border: "1px solid #374151" }}
      >
        <h3 className="text-white text-xs font-bold tracking-widest uppercase mb-3 flex items-center gap-2">
          <Route size={14} className="text-blue-400" />
          {editing !== null ? "Edit Route" : "Add New Route"}
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <span className={labelCls}>Route Name *</span>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className={inputCls}
              placeholder="e.g. Route A - North"
              data-ocid="transport.routes.input"
            />
          </div>
          <div>
            <span className={labelCls}>From *</span>
            <input
              value={form.from}
              onChange={(e) => setForm((p) => ({ ...p, from: e.target.value }))}
              className={inputCls}
              placeholder="Starting point"
            />
          </div>
          <div>
            <span className={labelCls}>To *</span>
            <input
              value={form.to}
              onChange={(e) => setForm((p) => ({ ...p, to: e.target.value }))}
              className={inputCls}
              placeholder="Ending point"
            />
          </div>
          <div>
            <span className={labelCls}>Distance (km)</span>
            <input
              type="number"
              min={0}
              value={form.distance}
              onChange={(e) =>
                setForm((p) => ({ ...p, distance: e.target.value }))
              }
              className={inputCls}
              placeholder="0"
            />
          </div>
          <div>
            <span className={labelCls}>Status</span>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  status: e.target.value as "Active" | "Inactive",
                }))
              }
              className={inputCls}
              data-ocid="transport.routes.select"
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          {editing !== null && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm({
                  name: "",
                  from: "",
                  to: "",
                  distance: "",
                  status: "Active",
                });
              }}
              className="border border-gray-600 text-gray-400 text-xs px-4 py-1.5 rounded hover:text-white transition"
              data-ocid="transport.routes.cancel_button"
            >
              <X size={12} className="inline mr-1" />
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={save}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-5 py-1.5 rounded font-medium flex items-center gap-1.5"
            data-ocid="transport.routes.primary_button"
          >
            <Plus size={13} />
            {editing !== null ? "Update" : "Add Route"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center bg-gray-800 border border-gray-700 rounded px-2 py-1.5 flex-1 max-w-xs">
          <Search size={13} className="text-gray-400 mr-1.5" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search routes..."
            className="bg-transparent text-gray-300 text-xs outline-none w-full"
            data-ocid="transport.routes.search_input"
          />
        </div>
        <span className="text-gray-500 text-xs">{filtered.length} routes</span>
      </div>

      <div className="rounded-lg overflow-hidden border border-gray-700">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "#1a1f2e" }}>
              {[
                "#",
                "Route Name",
                "From",
                "To",
                "Distance",
                "Status",
                "Actions",
              ].map((h) => (
                <th key={h} className={thCls}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-8 text-gray-500"
                  data-ocid="transport.routes.empty_state"
                >
                  No routes added yet
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr
                  key={r.id}
                  style={{ background: i % 2 === 0 ? "#111827" : "#0f1117" }}
                  data-ocid={`transport.routes.item.${i + 1}`}
                >
                  <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2 text-white font-medium">{r.name}</td>
                  <td className="px-3 py-2 text-gray-300">{r.from}</td>
                  <td className="px-3 py-2 text-gray-300">{r.to}</td>
                  <td className="px-3 py-2 text-gray-400">{r.distance} km</td>
                  <td className="px-3 py-2">
                    <Badge color={r.status === "Active" ? "green" : "red"}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => edit(r)}
                        className="p-1 rounded bg-gray-700 hover:bg-blue-700 text-gray-400 hover:text-white transition"
                        data-ocid={`transport.routes.edit_button.${i + 1}`}
                      >
                        <Edit size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => del(r.id)}
                        className="p-1 rounded bg-gray-700 hover:bg-red-700 text-gray-400 hover:text-white transition"
                        data-ocid={`transport.routes.delete_button.${i + 1}`}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────── VEHICLES ───────────
function VehiclesTab() {
  const [routes] = useLS<TRoute[]>("erp_transport_routes", []);
  const [vehicles, setVehicles] = useLS<TVehicle[]>(
    "erp_transport_vehicles",
    [],
  );
  const blank = {
    vehicleNo: "",
    model: "",
    driverName: "",
    driverLicense: "",
    driverContact: "",
    capacity: "",
    routeAssigned: "",
  };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<number | null>(null);

  const save = () => {
    if (!form.vehicleNo.trim() || !form.driverName.trim()) {
      toast.error("Fill required fields");
      return;
    }
    if (editing !== null) {
      setVehicles(
        vehicles.map((v) =>
          v.id === editing
            ? { ...v, ...form, capacity: Number(form.capacity) }
            : v,
        ),
      );
      setEditing(null);
    } else {
      setVehicles([
        ...vehicles,
        { id: Date.now(), ...form, capacity: Number(form.capacity) },
      ]);
    }
    setForm(blank);
    toast.success(editing !== null ? "Vehicle updated" : "Vehicle added");
  };

  const edit = (v: TVehicle) => {
    setForm({
      vehicleNo: v.vehicleNo,
      model: v.model,
      driverName: v.driverName,
      driverLicense: v.driverLicense,
      driverContact: v.driverContact,
      capacity: String(v.capacity),
      routeAssigned: v.routeAssigned,
    });
    setEditing(v.id);
  };

  const del = (id: number) => {
    setVehicles(vehicles.filter((v) => v.id !== id));
    toast.success("Vehicle deleted");
  };

  return (
    <div className="space-y-4">
      <div
        className="rounded-lg p-4"
        style={{ background: "#1a1f2e", border: "1px solid #374151" }}
      >
        <h3 className="text-white text-xs font-bold tracking-widest uppercase mb-3 flex items-center gap-2">
          <Truck size={14} className="text-blue-400" />
          {editing !== null ? "Edit Vehicle" : "Add Vehicle"}
        </h3>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <span className={labelCls}>Vehicle No. *</span>
            <input
              value={form.vehicleNo}
              onChange={(e) =>
                setForm((p) => ({ ...p, vehicleNo: e.target.value }))
              }
              className={inputCls}
              placeholder="MH01 AB1234"
              data-ocid="transport.vehicles.input"
            />
          </div>
          <div>
            <span className={labelCls}>Vehicle Model</span>
            <input
              value={form.model}
              onChange={(e) =>
                setForm((p) => ({ ...p, model: e.target.value }))
              }
              className={inputCls}
              placeholder="Tata Starbus"
            />
          </div>
          <div>
            <span className={labelCls}>Driver Name *</span>
            <input
              value={form.driverName}
              onChange={(e) =>
                setForm((p) => ({ ...p, driverName: e.target.value }))
              }
              className={inputCls}
              placeholder="Driver full name"
            />
          </div>
          <div>
            <span className={labelCls}>Driver License No.</span>
            <input
              value={form.driverLicense}
              onChange={(e) =>
                setForm((p) => ({ ...p, driverLicense: e.target.value }))
              }
              className={inputCls}
              placeholder="DL-XXXXXXXXXXXX"
            />
          </div>
          <div>
            <span className={labelCls}>Driver Contact</span>
            <input
              value={form.driverContact}
              onChange={(e) =>
                setForm((p) => ({ ...p, driverContact: e.target.value }))
              }
              className={inputCls}
              placeholder="9XXXXXXXXX"
            />
          </div>
          <div>
            <span className={labelCls}>Capacity (seats)</span>
            <input
              type="number"
              min={0}
              value={form.capacity}
              onChange={(e) =>
                setForm((p) => ({ ...p, capacity: e.target.value }))
              }
              className={inputCls}
              placeholder="40"
            />
          </div>
          <div>
            <span className={labelCls}>Route Assigned</span>
            <select
              value={form.routeAssigned}
              onChange={(e) =>
                setForm((p) => ({ ...p, routeAssigned: e.target.value }))
              }
              className={inputCls}
              data-ocid="transport.vehicles.select"
            >
              <option value="">-- Select Route --</option>
              {routes.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          {editing !== null && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(blank);
              }}
              className="border border-gray-600 text-gray-400 text-xs px-4 py-1.5 rounded hover:text-white transition"
              data-ocid="transport.vehicles.cancel_button"
            >
              <X size={12} className="inline mr-1" />
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={save}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-5 py-1.5 rounded font-medium flex items-center gap-1.5"
            data-ocid="transport.vehicles.primary_button"
          >
            <Plus size={13} />
            {editing !== null ? "Update" : "Add Vehicle"}
          </button>
        </div>
      </div>

      <div className="rounded-lg overflow-hidden border border-gray-700">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "#1a1f2e" }}>
              {[
                "#",
                "Vehicle No.",
                "Model",
                "Driver Name",
                "License",
                "Contact",
                "Capacity",
                "Route",
                "Actions",
              ].map((h) => (
                <th key={h} className={thCls}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="text-center py-8 text-gray-500"
                  data-ocid="transport.vehicles.empty_state"
                >
                  No vehicles added yet
                </td>
              </tr>
            ) : (
              vehicles.map((v, i) => (
                <tr
                  key={v.id}
                  style={{ background: i % 2 === 0 ? "#111827" : "#0f1117" }}
                  data-ocid={`transport.vehicles.item.${i + 1}`}
                >
                  <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2 text-white font-medium">
                    {v.vehicleNo}
                  </td>
                  <td className="px-3 py-2 text-gray-300">{v.model || "—"}</td>
                  <td className="px-3 py-2 text-gray-300">{v.driverName}</td>
                  <td className="px-3 py-2 text-gray-400">
                    {v.driverLicense || "—"}
                  </td>
                  <td className="px-3 py-2 text-gray-400">
                    {v.driverContact || "—"}
                  </td>
                  <td className="px-3 py-2 text-gray-400">
                    {v.capacity || "—"}
                  </td>
                  <td className="px-3 py-2">
                    {v.routeAssigned ? (
                      <Badge color="blue">{v.routeAssigned}</Badge>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => edit(v)}
                        className="p-1 rounded bg-gray-700 hover:bg-blue-700 text-gray-400 hover:text-white transition"
                        data-ocid={`transport.vehicles.edit_button.${i + 1}`}
                      >
                        <Edit size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => del(v.id)}
                        className="p-1 rounded bg-gray-700 hover:bg-red-700 text-gray-400 hover:text-white transition"
                        data-ocid={`transport.vehicles.delete_button.${i + 1}`}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────── PICKUP POINTS ───────────
function PickupPointsTab() {
  const [routes] = useLS<TRoute[]>("erp_transport_routes", []);
  const [points, setPoints] = useLS<TPickupPoint[]>(
    "erp_transport_pickup_points",
    [],
  );
  const blank = {
    name: "",
    route: "",
    pickupTime: "",
    dropTime: "",
    distanceFromSchool: "",
  };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<number | null>(null);

  const save = () => {
    if (!form.name.trim() || !form.route) {
      toast.error("Name and Route are required");
      return;
    }
    if (editing !== null) {
      setPoints(
        points.map((p) =>
          p.id === editing
            ? {
                ...p,
                ...form,
                distanceFromSchool: Number(form.distanceFromSchool),
              }
            : p,
        ),
      );
      setEditing(null);
    } else {
      setPoints([
        ...points,
        {
          id: Date.now(),
          ...form,
          distanceFromSchool: Number(form.distanceFromSchool),
        },
      ]);
    }
    setForm(blank);
    toast.success(
      editing !== null ? "Pickup point updated" : "Pickup point added",
    );
  };

  const del = (id: number) => {
    setPoints(points.filter((p) => p.id !== id));
    toast.success("Pickup point deleted");
  };

  return (
    <div className="space-y-4">
      <div
        className="rounded-lg p-4"
        style={{ background: "#1a1f2e", border: "1px solid #374151" }}
      >
        <h3 className="text-white text-xs font-bold tracking-widest uppercase mb-3 flex items-center gap-2">
          <MapPin size={14} className="text-blue-400" />
          {editing !== null ? "Edit Pickup Point" : "Add Pickup Point"}
        </h3>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <span className={labelCls}>Pickup Point Name *</span>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className={inputCls}
              placeholder="e.g. Sector 15 Stop"
              data-ocid="transport.pickuppoints.input"
            />
          </div>
          <div>
            <span className={labelCls}>Route *</span>
            <select
              value={form.route}
              onChange={(e) =>
                setForm((p) => ({ ...p, route: e.target.value }))
              }
              className={inputCls}
              data-ocid="transport.pickuppoints.select"
            >
              <option value="">-- Select Route --</option>
              {routes.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className={labelCls}>Distance from School (km)</span>
            <input
              type="number"
              min={0}
              value={form.distanceFromSchool}
              onChange={(e) =>
                setForm((p) => ({ ...p, distanceFromSchool: e.target.value }))
              }
              className={inputCls}
              placeholder="0"
            />
          </div>
          <div>
            <span className={labelCls}>Pickup Time</span>
            <input
              type="time"
              value={form.pickupTime}
              onChange={(e) =>
                setForm((p) => ({ ...p, pickupTime: e.target.value }))
              }
              className={inputCls}
            />
          </div>
          <div>
            <span className={labelCls}>Drop Time</span>
            <input
              type="time"
              value={form.dropTime}
              onChange={(e) =>
                setForm((p) => ({ ...p, dropTime: e.target.value }))
              }
              className={inputCls}
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          {editing !== null && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(blank);
              }}
              className="border border-gray-600 text-gray-400 text-xs px-4 py-1.5 rounded hover:text-white transition"
              data-ocid="transport.pickuppoints.cancel_button"
            >
              <X size={12} className="inline mr-1" />
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={save}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-5 py-1.5 rounded font-medium flex items-center gap-1.5"
            data-ocid="transport.pickuppoints.primary_button"
          >
            <Plus size={13} />
            {editing !== null ? "Update" : "Add Point"}
          </button>
        </div>
      </div>

      <div className="rounded-lg overflow-hidden border border-gray-700">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "#1a1f2e" }}>
              {[
                "#",
                "Pickup Point",
                "Route",
                "Pickup Time",
                "Drop Time",
                "Distance",
                "Actions",
              ].map((h) => (
                <th key={h} className={thCls}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {points.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-8 text-gray-500"
                  data-ocid="transport.pickuppoints.empty_state"
                >
                  No pickup points added yet
                </td>
              </tr>
            ) : (
              points.map((p, i) => (
                <tr
                  key={p.id}
                  style={{ background: i % 2 === 0 ? "#111827" : "#0f1117" }}
                  data-ocid={`transport.pickuppoints.item.${i + 1}`}
                >
                  <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2 text-white font-medium">{p.name}</td>
                  <td className="px-3 py-2">
                    <Badge color="blue">{p.route}</Badge>
                  </td>
                  <td className="px-3 py-2 text-gray-300">
                    {p.pickupTime || "—"}
                  </td>
                  <td className="px-3 py-2 text-gray-300">
                    {p.dropTime || "—"}
                  </td>
                  <td className="px-3 py-2 text-gray-400">
                    {p.distanceFromSchool ? `${p.distanceFromSchool} km` : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setForm({
                            name: p.name,
                            route: p.route,
                            pickupTime: p.pickupTime,
                            dropTime: p.dropTime,
                            distanceFromSchool: String(p.distanceFromSchool),
                          });
                          setEditing(p.id);
                        }}
                        className="p-1 rounded bg-gray-700 hover:bg-blue-700 text-gray-400 hover:text-white transition"
                        data-ocid={`transport.pickuppoints.edit_button.${i + 1}`}
                      >
                        <Edit size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => del(p.id)}
                        className="p-1 rounded bg-gray-700 hover:bg-red-700 text-gray-400 hover:text-white transition"
                        data-ocid={`transport.pickuppoints.delete_button.${i + 1}`}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────── ROUTE PICKUP POINTS ───────────
function RoutePickupsTab() {
  const [routes] = useLS<TRoute[]>("erp_transport_routes", []);
  const [points] = useLS<TPickupPoint[]>("erp_transport_pickup_points", []);
  const [assignments, setAssignments] = useLS<TRoutePickup[]>(
    "erp_transport_route_pickups",
    [],
  );
  const [selectedRoute, setSelectedRoute] = useState("");
  const [selectedPoint, setSelectedPoint] = useState("");

  const routePoints = points.filter((p) => p.route === selectedRoute);
  const assignedIds = assignments
    .filter(
      (a) => routes.find((r) => r.name === selectedRoute)?.id === a.routeId,
    )
    .map((a) => a.pickupPointId);

  const addPoint = () => {
    if (!selectedRoute || !selectedPoint) return;
    const route = routes.find((r) => r.name === selectedRoute);
    const point = points.find((p) => p.name === selectedPoint);
    if (!route || !point) return;
    if (
      assignments.some(
        (a) => a.routeId === route.id && a.pickupPointId === point.id,
      )
    ) {
      toast.error("Already assigned");
      return;
    }
    const seq = assignments.filter((a) => a.routeId === route.id).length + 1;
    setAssignments([
      ...assignments,
      {
        id: Date.now(),
        routeId: route.id,
        pickupPointId: point.id,
        sequence: seq,
      },
    ]);
    toast.success("Pickup point added to route");
  };

  const removeAssign = (id: number) => {
    setAssignments(assignments.filter((a) => a.id !== id));
  };

  const routeAssignments = selectedRoute
    ? assignments
        .filter(
          (a) => routes.find((r) => r.name === selectedRoute)?.id === a.routeId,
        )
        .map((a) => ({
          ...a,
          point: points.find((p) => p.id === a.pickupPointId),
        }))
        .sort((a, b) => a.sequence - b.sequence)
    : [];

  return (
    <div className="space-y-4">
      <div
        className="rounded-lg p-4"
        style={{ background: "#1a1f2e", border: "1px solid #374151" }}
      >
        <h3 className="text-white text-xs font-bold tracking-widest uppercase mb-3">
          Map Pickup Points to Route
        </h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <span className={labelCls}>Select Route</span>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className={inputCls}
              data-ocid="transport.routepickups.select"
            >
              <option value="">-- Select Route --</option>
              {routes.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <span className={labelCls}>Add Pickup Point</span>
            <select
              value={selectedPoint}
              onChange={(e) => setSelectedPoint(e.target.value)}
              className={inputCls}
            >
              <option value="">-- Select Pickup Point --</option>
              {routePoints
                .filter((p) => !assignedIds.includes(p.id))
                .map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
          <button
            type="button"
            onClick={addPoint}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-1.5 rounded font-medium flex items-center gap-1.5"
            data-ocid="transport.routepickups.primary_button"
          >
            <Plus size={13} />
            Add
          </button>
        </div>
      </div>

      {selectedRoute && (
        <div className="rounded-lg overflow-hidden border border-gray-700">
          <div style={{ background: "#1a1f2e" }} className="px-3 py-2">
            <span className="text-gray-300 text-xs font-medium">
              Pickup Points on:{" "}
              <span className="text-blue-400">{selectedRoute}</span>
            </span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "#111827" }}>
                {[
                  "Seq",
                  "Pickup Point",
                  "Pickup Time",
                  "Drop Time",
                  "Distance",
                  "Action",
                ].map((h) => (
                  <th key={h} className={thCls}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {routeAssignments.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-6 text-gray-500"
                    data-ocid="transport.routepickups.empty_state"
                  >
                    No pickup points on this route yet
                  </td>
                </tr>
              ) : (
                routeAssignments.map((a, i) => (
                  <tr
                    key={a.id}
                    style={{ background: i % 2 === 0 ? "#111827" : "#0f1117" }}
                    data-ocid={`transport.routepickups.item.${i + 1}`}
                  >
                    <td className="px-3 py-2 text-gray-400">{a.sequence}</td>
                    <td className="px-3 py-2 text-white">
                      {a.point?.name || "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-300">
                      {a.point?.pickupTime || "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-300">
                      {a.point?.dropTime || "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-400">
                      {a.point?.distanceFromSchool
                        ? `${a.point.distanceFromSchool} km`
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeAssign(a.id)}
                        className="p-1 rounded bg-gray-700 hover:bg-red-700 text-gray-400 hover:text-white transition"
                        data-ocid={`transport.routepickups.delete_button.${i + 1}`}
                      >
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────── ASSIGN VEHICLE ───────────
function AssignVehicleTab() {
  const [routes] = useLS<TRoute[]>("erp_transport_routes", []);
  const [vehicles] = useLS<TVehicle[]>("erp_transport_vehicles", []);
  const [assigns, setAssigns] = useLS<TVehicleAssign[]>(
    "erp_transport_vehicle_assign",
    [],
  );
  const [selRoute, setSelRoute] = useState("");
  const [selVehicle, setSelVehicle] = useState("");

  const save = () => {
    const route = routes.find((r) => r.name === selRoute);
    const vehicle = vehicles.find((v) => v.vehicleNo === selVehicle);
    if (!route || !vehicle) {
      toast.error("Select both route and vehicle");
      return;
    }
    const existing = assigns.find((a) => a.routeId === route.id);
    if (existing) {
      setAssigns(
        assigns.map((a) =>
          a.id === existing.id ? { ...a, vehicleId: vehicle.id } : a,
        ),
      );
    } else {
      setAssigns([
        ...assigns,
        { id: Date.now(), routeId: route.id, vehicleId: vehicle.id },
      ]);
    }
    setSelRoute("");
    setSelVehicle("");
    toast.success("Vehicle assigned to route");
  };

  const del = (id: number) => {
    setAssigns(assigns.filter((a) => a.id !== id));
    toast.success("Assignment removed");
  };

  return (
    <div className="space-y-4">
      <div
        className="rounded-lg p-4"
        style={{ background: "#1a1f2e", border: "1px solid #374151" }}
      >
        <h3 className="text-white text-xs font-bold tracking-widest uppercase mb-3">
          Assign Vehicle to Route
        </h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <span className={labelCls}>Route</span>
            <select
              value={selRoute}
              onChange={(e) => setSelRoute(e.target.value)}
              className={inputCls}
              data-ocid="transport.assignvehicle.select"
            >
              <option value="">-- Select Route --</option>
              {routes.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <span className={labelCls}>Vehicle</span>
            <select
              value={selVehicle}
              onChange={(e) => setSelVehicle(e.target.value)}
              className={inputCls}
            >
              <option value="">-- Select Vehicle --</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.vehicleNo}>
                  {v.vehicleNo} — {v.model}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={save}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-5 py-1.5 rounded font-medium"
            data-ocid="transport.assignvehicle.primary_button"
          >
            Assign
          </button>
        </div>
      </div>

      <div className="rounded-lg overflow-hidden border border-gray-700">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "#1a1f2e" }}>
              {["#", "Route", "Vehicle No.", "Driver", "Action"].map((h) => (
                <th key={h} className={thCls}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assigns.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-8 text-gray-500"
                  data-ocid="transport.assignvehicle.empty_state"
                >
                  No vehicle assignments yet
                </td>
              </tr>
            ) : (
              assigns.map((a, i) => {
                const route = routes.find((r) => r.id === a.routeId);
                const vehicle = vehicles.find((v) => v.id === a.vehicleId);
                return (
                  <tr
                    key={a.id}
                    style={{ background: i % 2 === 0 ? "#111827" : "#0f1117" }}
                    data-ocid={`transport.assignvehicle.item.${i + 1}`}
                  >
                    <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2 text-white">
                      {route?.name || "—"}
                    </td>
                    <td className="px-3 py-2 text-blue-400">
                      {vehicle?.vehicleNo || "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-300">
                      {vehicle?.driverName || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => del(a.id)}
                        className="p-1 rounded bg-gray-700 hover:bg-red-700 text-gray-400 hover:text-white transition"
                        data-ocid={`transport.assignvehicle.delete_button.${i + 1}`}
                      >
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────── FEES MASTER ───────────
function FeesMasterTab() {
  const [routes] = useLS<TRoute[]>("erp_transport_routes", []);
  const [points] = useLS<TPickupPoint[]>("erp_transport_pickup_points", []);
  const [feesMaster, setFeesMaster] = useLS<TFeesMaster[]>(
    "erp_transport_fees_master",
    [],
  );
  const blank = { route: "", pickupPoint: "", monthlyFee: "", annualFee: "" };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<number | null>(null);

  const routePoints = points.filter((p) => p.route === form.route);

  const save = () => {
    if (!form.route) {
      toast.error("Select a route");
      return;
    }
    if (editing !== null) {
      setFeesMaster(
        feesMaster.map((f) =>
          f.id === editing
            ? {
                ...f,
                ...form,
                monthlyFee: Number(form.monthlyFee),
                annualFee: Number(form.annualFee),
              }
            : f,
        ),
      );
      setEditing(null);
    } else {
      setFeesMaster([
        ...feesMaster,
        {
          id: Date.now(),
          ...form,
          monthlyFee: Number(form.monthlyFee),
          annualFee: Number(form.annualFee),
        },
      ]);
    }
    setForm(blank);
    toast.success(editing !== null ? "Updated" : "Fees master entry added");
  };

  const del = (id: number) => {
    setFeesMaster(feesMaster.filter((f) => f.id !== id));
    toast.success("Deleted");
  };

  return (
    <div className="space-y-4">
      <div
        className="rounded-lg p-4"
        style={{ background: "#1a1f2e", border: "1px solid #374151" }}
      >
        <h3 className="text-white text-xs font-bold tracking-widest uppercase mb-3">
          Transport Fees Master
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <span className={labelCls}>Route *</span>
            <select
              value={form.route}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  route: e.target.value,
                  pickupPoint: "",
                }))
              }
              className={inputCls}
              data-ocid="transport.feesmaster.select"
            >
              <option value="">-- Select Route --</option>
              {routes.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className={labelCls}>Pickup Point</span>
            <select
              value={form.pickupPoint}
              onChange={(e) =>
                setForm((p) => ({ ...p, pickupPoint: e.target.value }))
              }
              className={inputCls}
            >
              <option value="">-- All Pickup Points --</option>
              {routePoints.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className={labelCls}>Monthly Fee (₹)</span>
            <input
              type="number"
              min={0}
              value={form.monthlyFee}
              onChange={(e) =>
                setForm((p) => ({ ...p, monthlyFee: e.target.value }))
              }
              className={inputCls}
              placeholder="0"
              data-ocid="transport.feesmaster.input"
            />
          </div>
          <div>
            <span className={labelCls}>Annual Fee (₹)</span>
            <input
              type="number"
              min={0}
              value={form.annualFee}
              onChange={(e) =>
                setForm((p) => ({ ...p, annualFee: e.target.value }))
              }
              className={inputCls}
              placeholder="0"
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          {editing !== null && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(blank);
              }}
              className="border border-gray-600 text-gray-400 text-xs px-4 py-1.5 rounded hover:text-white transition"
              data-ocid="transport.feesmaster.cancel_button"
            >
              <X size={12} className="inline mr-1" />
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={save}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-5 py-1.5 rounded font-medium flex items-center gap-1.5"
            data-ocid="transport.feesmaster.primary_button"
          >
            <Plus size={13} />
            {editing !== null ? "Update" : "Add Entry"}
          </button>
        </div>
      </div>

      <div className="rounded-lg overflow-hidden border border-gray-700">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "#1a1f2e" }}>
              {[
                "#",
                "Route",
                "Pickup Point",
                "Monthly Fee",
                "Annual Fee",
                "Actions",
              ].map((h) => (
                <th key={h} className={thCls}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {feesMaster.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-8 text-gray-500"
                  data-ocid="transport.feesmaster.empty_state"
                >
                  No fees master entries yet
                </td>
              </tr>
            ) : (
              feesMaster.map((f, i) => (
                <tr
                  key={f.id}
                  style={{ background: i % 2 === 0 ? "#111827" : "#0f1117" }}
                  data-ocid={`transport.feesmaster.item.${i + 1}`}
                >
                  <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2 text-white">{f.route}</td>
                  <td className="px-3 py-2 text-gray-300">
                    {f.pickupPoint || "All"}
                  </td>
                  <td className="px-3 py-2 text-green-400">
                    ₹{f.monthlyFee.toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-2 text-green-400">
                    ₹{f.annualFee.toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setForm({
                            route: f.route,
                            pickupPoint: f.pickupPoint,
                            monthlyFee: String(f.monthlyFee),
                            annualFee: String(f.annualFee),
                          });
                          setEditing(f.id);
                        }}
                        className="p-1 rounded bg-gray-700 hover:bg-blue-700 text-gray-400 hover:text-white transition"
                        data-ocid={`transport.feesmaster.edit_button.${i + 1}`}
                      >
                        <Edit size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => del(f.id)}
                        className="p-1 rounded bg-gray-700 hover:bg-red-700 text-gray-400 hover:text-white transition"
                        data-ocid={`transport.feesmaster.delete_button.${i + 1}`}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────── STUDENT TRANSPORT FEES ───────────
function StudentTransportFeesTab() {
  const [routes] = useLS<TRoute[]>("erp_transport_routes", []);
  const [points] = useLS<TPickupPoint[]>("erp_transport_pickup_points", []);
  const [feesMaster] = useLS<TFeesMaster[]>("erp_transport_fees_master", []);
  const [studentTransport, setStudentTransport] = useLS<TStudentTransport[]>(
    "erp_student_transport",
    [],
  );
  const [admNo, setAdmNo] = useState("");
  const [selRoute, setSelRoute] = useState("");
  const [selPickup, setSelPickup] = useState("");
  const [search, setSearch] = useState("");

  const routePoints = points.filter((p) => p.route === selRoute);

  const calcFee = () => {
    const master = feesMaster.find(
      (f) =>
        f.route === selRoute &&
        (f.pickupPoint === selPickup || f.pickupPoint === ""),
    );
    return master?.monthlyFee || 0;
  };

  const getStudentFromLS = (no: string) => {
    try {
      const students = JSON.parse(
        localStorage.getItem("erp_students") || "[]",
      ) as Array<{ admNo: string; name: string; className: string }>;
      return students.find((s) => s.admNo === no);
    } catch {
      return null;
    }
  };

  const assign = () => {
    if (!admNo.trim() || !selRoute) {
      toast.error("Admission No and Route are required");
      return;
    }
    const student = getStudentFromLS(admNo) || {
      admNo,
      name: admNo,
      className: "—",
    };
    const fee = calcFee();
    if (studentTransport.some((s) => s.admNo === admNo)) {
      setStudentTransport(
        studentTransport.map((s) =>
          s.admNo === admNo
            ? { ...s, route: selRoute, pickupPoint: selPickup, monthlyFee: fee }
            : s,
        ),
      );
    } else {
      setStudentTransport([
        ...studentTransport,
        {
          id: Date.now(),
          admNo,
          studentName: student.name,
          className: student.className,
          route: selRoute,
          pickupPoint: selPickup,
          monthlyFee: fee,
        },
      ]);
    }
    setAdmNo("");
    setSelRoute("");
    setSelPickup("");
    toast.success("Student transport assigned");
  };

  const del = (id: number) => {
    setStudentTransport(studentTransport.filter((s) => s.id !== id));
    toast.success("Removed");
  };

  const filtered = studentTransport.filter(
    (s) =>
      s.admNo.toLowerCase().includes(search.toLowerCase()) ||
      s.studentName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div
        className="rounded-lg p-4"
        style={{ background: "#1a1f2e", border: "1px solid #374151" }}
      >
        <h3 className="text-white text-xs font-bold tracking-widest uppercase mb-3 flex items-center gap-2">
          <User size={14} className="text-blue-400" />
          Assign Student to Transport
        </h3>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <span className={labelCls}>Admission No. *</span>
            <input
              value={admNo}
              onChange={(e) => setAdmNo(e.target.value)}
              className={inputCls}
              placeholder="ADM-001"
              data-ocid="transport.studentfees.input"
            />
          </div>
          <div>
            <span className={labelCls}>Route *</span>
            <select
              value={selRoute}
              onChange={(e) => {
                setSelRoute(e.target.value);
                setSelPickup("");
              }}
              className={inputCls}
              data-ocid="transport.studentfees.select"
            >
              <option value="">-- Select Route --</option>
              {routes.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className={labelCls}>Pickup Point</span>
            <select
              value={selPickup}
              onChange={(e) => setSelPickup(e.target.value)}
              className={inputCls}
            >
              <option value="">-- Select Pickup Point --</option>
              {routePoints.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {selRoute && (
          <div className="mb-3 text-xs text-gray-300">
            Calculated Monthly Fee:{" "}
            <span className="text-green-400 font-bold">
              ₹{calcFee().toLocaleString("en-IN")}
            </span>
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={assign}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-5 py-1.5 rounded font-medium"
            data-ocid="transport.studentfees.primary_button"
          >
            Assign Transport
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center bg-gray-800 border border-gray-700 rounded px-2 py-1.5 flex-1 max-w-xs">
          <Search size={13} className="text-gray-400 mr-1.5" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Adm. No or Name..."
            className="bg-transparent text-gray-300 text-xs outline-none w-full"
            data-ocid="transport.studentfees.search_input"
          />
        </div>
      </div>

      <div className="rounded-lg overflow-hidden border border-gray-700">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "#1a1f2e" }}>
              {[
                "Adm. No.",
                "Student Name",
                "Class",
                "Route",
                "Pickup Point",
                "Monthly Fee",
                "Action",
              ].map((h) => (
                <th key={h} className={thCls}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-8 text-gray-500"
                  data-ocid="transport.studentfees.empty_state"
                >
                  No students assigned to transport
                </td>
              </tr>
            ) : (
              filtered.map((s, i) => (
                <tr
                  key={s.id}
                  style={{ background: i % 2 === 0 ? "#111827" : "#0f1117" }}
                  data-ocid={`transport.studentfees.item.${i + 1}`}
                >
                  <td className="px-3 py-2 text-blue-400 font-medium">
                    {s.admNo}
                  </td>
                  <td className="px-3 py-2 text-white">{s.studentName}</td>
                  <td className="px-3 py-2 text-gray-300">{s.className}</td>
                  <td className="px-3 py-2 text-gray-300">{s.route}</td>
                  <td className="px-3 py-2 text-gray-400">
                    {s.pickupPoint || "—"}
                  </td>
                  <td className="px-3 py-2 text-green-400">
                    ₹{s.monthlyFee.toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => del(s.id)}
                      className="p-1 rounded bg-gray-700 hover:bg-red-700 text-gray-400 hover:text-white transition"
                      data-ocid={`transport.studentfees.delete_button.${i + 1}`}
                    >
                      <Trash2 size={11} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────── TRANSPORT REPORT ───────────
function TransportReportTab() {
  const [routes] = useLS<TRoute[]>("erp_transport_routes", []);
  const [vehicles] = useLS<TVehicle[]>("erp_transport_vehicles", []);
  const [assigns] = useLS<TVehicleAssign[]>("erp_transport_vehicle_assign", []);
  const [studentTransport] = useLS<TStudentTransport[]>(
    "erp_student_transport",
    [],
  );
  const [filterRoute, setFilterRoute] = useState("");

  const getVehicleForRoute = (routeName: string) => {
    const route = routes.find((r) => r.name === routeName);
    if (!route) return "—";
    const assign = assigns.find((a) => a.routeId === route.id);
    if (!assign) return "—";
    return vehicles.find((v) => v.id === assign.vehicleId)?.vehicleNo || "—";
  };

  const filtered = studentTransport.filter(
    (s) => !filterRoute || s.route === filterRoute,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div>
          <span className={labelCls}>Filter by Route</span>
          <select
            value={filterRoute}
            onChange={(e) => setFilterRoute(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
            data-ocid="transport.report.select"
          >
            <option value="">All Routes</option>
            {routes.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="text-gray-400 text-xs mt-4">
          {filtered.length} students
        </div>
      </div>

      <div className="rounded-lg overflow-hidden border border-gray-700">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "#1a1f2e" }}>
              {[
                "Adm. No.",
                "Student Name",
                "Class",
                "Route",
                "Vehicle",
                "Pickup Point",
                "Monthly Fee",
              ].map((h) => (
                <th key={h} className={thCls}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-8 text-gray-500"
                  data-ocid="transport.report.empty_state"
                >
                  No transport data available
                </td>
              </tr>
            ) : (
              filtered.map((s, i) => (
                <tr
                  key={s.id}
                  style={{ background: i % 2 === 0 ? "#111827" : "#0f1117" }}
                  data-ocid={`transport.report.item.${i + 1}`}
                >
                  <td className="px-3 py-2 text-blue-400">{s.admNo}</td>
                  <td className="px-3 py-2 text-white">{s.studentName}</td>
                  <td className="px-3 py-2 text-gray-300">{s.className}</td>
                  <td className="px-3 py-2 text-gray-300">{s.route}</td>
                  <td className="px-3 py-2 text-gray-400">
                    {getVehicleForRoute(s.route)}
                  </td>
                  <td className="px-3 py-2 text-gray-400">
                    {s.pickupPoint || "—"}
                  </td>
                  <td className="px-3 py-2 text-green-400">
                    ₹{s.monthlyFee.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────── MAIN TRANSPORT PAGE ───────────
export function Transport() {
  const [tab, setTab] = useState<TransportTab>("routes");

  const tabs: { id: TransportTab; label: string; icon: React.ReactNode }[] = [
    { id: "routes", label: "Routes", icon: <Route size={13} /> },
    { id: "vehicles", label: "Vehicles", icon: <Truck size={13} /> },
    { id: "pickuppoints", label: "Pickup Points", icon: <MapPin size={13} /> },
    {
      id: "routepickups",
      label: "Route Pickups",
      icon: <ChevronDown size={13} />,
    },
    { id: "assignvehicle", label: "Assign Vehicle", icon: <Bus size={13} /> },
    { id: "feesmaster", label: "Fees Master", icon: <Bus size={13} /> },
    { id: "studentfees", label: "Student Fees", icon: <User size={13} /> },
    { id: "report", label: "Report", icon: <Search size={13} /> },
  ];

  return (
    <div>
      <h2 className="text-white text-lg font-semibold mb-4">
        Transport Management
      </h2>
      <div className="flex flex-wrap gap-1 mb-5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            data-ocid={`transport.${t.id}.tab`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${
              tab === t.id
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "routes" && <RoutesTab />}
      {tab === "vehicles" && <VehiclesTab />}
      {tab === "pickuppoints" && <PickupPointsTab />}
      {tab === "routepickups" && <RoutePickupsTab />}
      {tab === "assignvehicle" && <AssignVehicleTab />}
      {tab === "feesmaster" && <FeesMasterTab />}
      {tab === "studentfees" && <StudentTransportFeesTab />}
      {tab === "report" && <TransportReportTab />}
    </div>
  );
}
