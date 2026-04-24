/**
 * Transport Routes & Buses — Direct API rebuild
 * Reads/writes via phpApiService directly. No getData().
 * prop showPickupOnly: shows inline pickup point management per route.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Bus,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import phpApiService from "../../utils/phpApiService";

// ── Types ─────────────────────────────────────────────────────

interface PickupPoint {
  id: string;
  routeId: string;
  stopName: string;
  distance?: string;
  fare: number;
  order?: number;
}

interface Route {
  id: string;
  routeName: string;
  busNo?: string;
  driverName?: string;
  driverMobile?: string;
  capacity?: string;
}

// ── RouteForm ─────────────────────────────────────────────────

interface RouteFormState {
  routeName: string;
  busNo: string;
  driverName: string;
  driverMobile: string;
  capacity: string;
}

const EMPTY_ROUTE: RouteFormState = {
  routeName: "",
  busNo: "",
  driverName: "",
  driverMobile: "",
  capacity: "",
};

// ── PickupForm ────────────────────────────────────────────────

interface PickupFormState {
  stopName: string;
  distance: string;
  fare: string;
}

const EMPTY_PICKUP: PickupFormState = {
  stopName: "",
  distance: "",
  fare: "",
};

// ── Main Component ────────────────────────────────────────────

export default function RoutesAPI({
  showPickupOnly = false,
}: {
  showPickupOnly?: boolean;
}) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [pickupMap, setPickupMap] = useState<Record<string, PickupPoint[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);

  // Route form
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [editRoute, setEditRoute] = useState<Route | null>(null);
  const [routeForm, setRouteForm] = useState<RouteFormState>({
    ...EMPTY_ROUTE,
  });
  const [savingRoute, setSavingRoute] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Route | null>(null);

  // Pickup form per route
  const [ppFormRouteId, setPpFormRouteId] = useState<string | null>(null);
  const [ppForm, setPpForm] = useState<PickupFormState>({ ...EMPTY_PICKUP });
  const [savingPP, setSavingPP] = useState(false);

  // Stable handlers to avoid remounts on keystroke
  const handleRouteNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setRouteForm((p) => ({ ...p, routeName: e.target.value })),
    [],
  );
  const handleBusNoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setRouteForm((p) => ({ ...p, busNo: e.target.value })),
    [],
  );
  const handleDriverNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setRouteForm((p) => ({ ...p, driverName: e.target.value })),
    [],
  );
  const handleDriverMobileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setRouteForm((p) => ({ ...p, driverMobile: e.target.value })),
    [],
  );
  const handleCapacityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setRouteForm((p) => ({
        ...p,
        capacity: e.target.value.replace(/[^0-9]/g, ""),
      })),
    [],
  );
  const handlePpStopChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setPpForm((p) => ({ ...p, stopName: e.target.value })),
    [],
  );
  const handlePpDistanceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setPpForm((p) => ({ ...p, distance: e.target.value })),
    [],
  );
  const handlePpFareChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setPpForm((p) => ({
        ...p,
        fare: e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"),
      })),
    [],
  );

  // Fetch routes
  const loadRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await phpApiService.getRoutes();
      setRoutes(data as unknown as Route[]);
    } catch {
      toast.error("Failed to load routes");
    } finally {
      setLoading(false);
    }
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

  useEffect(() => {
    void loadRoutes();
  }, [loadRoutes]);

  // Expand a route and load its pickup points
  const toggleExpand = useCallback(
    (routeId: string) => {
      if (expandedRoute === routeId) {
        setExpandedRoute(null);
        setPpFormRouteId(null);
      } else {
        setExpandedRoute(routeId);
        if (!pickupMap[routeId]) void loadPickups(routeId);
      }
    },
    [expandedRoute, pickupMap, loadPickups],
  );

  // Save route
  const handleSaveRoute = useCallback(async () => {
    if (!routeForm.routeName.trim()) {
      toast.error("Route name is required");
      return;
    }
    setSavingRoute(true);
    try {
      await phpApiService.addRoute({
        id: editRoute?.id,
        routeName: routeForm.routeName,
        busNo: routeForm.busNo,
        driverName: routeForm.driverName,
        driverMobile: routeForm.driverMobile,
        capacity: routeForm.capacity,
      });
      toast.success(editRoute ? "Route updated" : "Route added");
      setShowRouteForm(false);
      setEditRoute(null);
      setRouteForm({ ...EMPTY_ROUTE });
      await loadRoutes();
    } catch {
      toast.error("Failed to save route");
    } finally {
      setSavingRoute(false);
    }
  }, [routeForm, editRoute, loadRoutes]);

  // Delete route
  const handleDeleteRoute = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await phpApiService.del("transport/routes/delete", {
        id: deleteTarget.id,
      });
      toast.success("Route deleted");
      setDeleteTarget(null);
      await loadRoutes();
    } catch {
      toast.error("Failed to delete route");
    }
  }, [deleteTarget, loadRoutes]);

  // Add pickup point
  const handleAddPickup = useCallback(
    async (routeId: string) => {
      if (!ppForm.stopName.trim()) {
        toast.error("Stop name is required");
        return;
      }
      setSavingPP(true);
      try {
        await phpApiService.addPickupPoint({
          routeId,
          stopName: ppForm.stopName,
          distance: ppForm.distance,
          fare: Number(ppForm.fare) || 0,
        });
        toast.success("Pickup point added");
        setPpForm({ ...EMPTY_PICKUP });
        setPpFormRouteId(null);
        await loadPickups(routeId);
      } catch {
        toast.error("Failed to add pickup point");
      } finally {
        setSavingPP(false);
      }
    },
    [ppForm, loadPickups],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading routes…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          {routes.length} route{routes.length !== 1 ? "s" : ""} configured
        </p>
        {!showPickupOnly && (
          <Button
            size="sm"
            onClick={() => {
              setEditRoute(null);
              setRouteForm({ ...EMPTY_ROUTE });
              setShowRouteForm(true);
            }}
            data-ocid="transport.routes.add_button"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Route
          </Button>
        )}
      </div>

      {/* Empty state */}
      {routes.length === 0 && (
        <Card>
          <CardContent
            className="py-12 text-center"
            data-ocid="transport.routes.empty_state"
          >
            <Bus className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-medium text-muted-foreground">No routes yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your first bus route to get started.
            </p>
            {!showPickupOnly && (
              <Button
                size="sm"
                className="mt-4"
                onClick={() => {
                  setEditRoute(null);
                  setRouteForm({ ...EMPTY_ROUTE });
                  setShowRouteForm(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Route
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Routes list */}
      <div className="space-y-3">
        {routes.map((route, i) => {
          const pts = pickupMap[route.id] ?? [];
          const isExpanded = expandedRoute === route.id;

          return (
            <Card key={route.id} data-ocid={`transport.routes.item.${i + 1}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Bus className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        {route.routeName}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Bus: {route.busNo || "—"} · Driver:{" "}
                        {route.driverName || "—"}
                        {route.capacity ? ` · Cap: ${route.capacity}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isExpanded && pts.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {pts.length} stops
                      </Badge>
                    )}
                    {!showPickupOnly && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditRoute(route);
                            setRouteForm({
                              routeName: route.routeName,
                              busNo: route.busNo ?? "",
                              driverName: route.driverName ?? "",
                              driverMobile: route.driverMobile ?? "",
                              capacity: route.capacity ?? "",
                            });
                            setShowRouteForm(true);
                          }}
                          data-ocid={`transport.routes.edit_button.${i + 1}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30"
                          onClick={() => setDeleteTarget(route)}
                          data-ocid={`transport.routes.delete_button.${i + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleExpand(route.id)}
                      data-ocid={`transport.routes.expand_button.${i + 1}`}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      {isExpanded ? "Hide" : "Stops"}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0 space-y-3">
                  {/* Pickup points table */}
                  {pts.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-muted">
                          <tr>
                            {["Stop", "Distance", "Fare/Month (₹)"].map((h) => (
                              <th
                                key={h}
                                className="text-left px-3 py-2 font-semibold text-muted-foreground"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pts.map((pp, pi) => (
                            <tr
                              key={pp.id}
                              className="border-t"
                              data-ocid={`transport.pickup.item.${pi + 1}`}
                            >
                              <td className="px-3 py-2 flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                {pp.stopName}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {pp.distance || "—"}
                              </td>
                              <td className="px-3 py-2 font-mono font-semibold">
                                ₹{pp.fare}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground py-2">
                      No pickup points yet.
                    </p>
                  )}

                  {/* Add pickup point */}
                  {ppFormRouteId === route.id ? (
                    <div className="p-3 border rounded-lg bg-muted/20 space-y-2">
                      <p className="text-xs font-semibold text-foreground">
                        Add Pickup Point
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Stop Name *</Label>
                          <Input
                            value={ppForm.stopName}
                            onChange={handlePpStopChange}
                            className="h-8 text-xs mt-0.5"
                            placeholder="e.g. Main Gate"
                            data-ocid="transport.pickup.stopname_input"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Distance (km)</Label>
                          <Input
                            value={ppForm.distance}
                            onChange={handlePpDistanceChange}
                            className="h-8 text-xs mt-0.5"
                            placeholder="5.2"
                            data-ocid="transport.pickup.distance_input"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Fare (₹/month)</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={ppForm.fare}
                            onChange={handlePpFareChange}
                            className="h-8 text-xs mt-0.5"
                            placeholder="500"
                            data-ocid="transport.pickup.fare_input"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => void handleAddPickup(route.id)}
                          disabled={savingPP}
                          data-ocid="transport.pickup.add_button"
                        >
                          {savingPP ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 mr-1" />
                          )}
                          Add Stop
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPpFormRouteId(null);
                            setPpForm({ ...EMPTY_PICKUP });
                          }}
                          data-ocid="transport.pickup.cancel_button"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPpFormRouteId(route.id);
                        setPpForm({ ...EMPTY_PICKUP });
                      }}
                      data-ocid={`transport.pickup.open_form_button.${i + 1}`}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Pickup Point
                    </Button>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add/Edit Route Dialog */}
      <Dialog
        open={showRouteForm}
        onOpenChange={(v) => {
          if (!v) setShowRouteForm(false);
        }}
      >
        <DialogContent className="max-w-md" data-ocid="transport.routes.dialog">
          <DialogHeader>
            <DialogTitle>{editRoute ? "Edit Route" : "Add Route"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Route Name *</Label>
              <Input
                value={routeForm.routeName}
                onChange={handleRouteNameChange}
                placeholder="e.g. North Route"
                className="mt-1"
                data-ocid="transport.routes.routename_input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bus Number</Label>
                <Input
                  value={routeForm.busNo}
                  onChange={handleBusNoChange}
                  placeholder="UP32 AB 1234"
                  className="mt-1"
                  data-ocid="transport.routes.busno_input"
                />
              </div>
              <div>
                <Label>Capacity</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={routeForm.capacity}
                  onChange={handleCapacityChange}
                  placeholder="50"
                  className="mt-1"
                  data-ocid="transport.routes.capacity_input"
                />
              </div>
            </div>
            <div>
              <Label>Driver Name</Label>
              <Input
                value={routeForm.driverName}
                onChange={handleDriverNameChange}
                placeholder="Driver's full name"
                className="mt-1"
                data-ocid="transport.routes.drivername_input"
              />
            </div>
            <div>
              <Label>Driver Mobile</Label>
              <Input
                value={routeForm.driverMobile}
                onChange={handleDriverMobileChange}
                placeholder="+91 XXXXX XXXXX"
                className="mt-1"
                data-ocid="transport.routes.drivermobile_input"
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button
                variant="outline"
                onClick={() => setShowRouteForm(false)}
                data-ocid="transport.routes.cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleSaveRoute()}
                disabled={savingRoute}
                data-ocid="transport.routes.save_button"
              >
                {savingRoute ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {editRoute ? "Save Changes" : "Add Route"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
      >
        <DialogContent
          className="max-w-sm"
          data-ocid="transport.routes.delete_dialog"
        >
          <DialogHeader>
            <DialogTitle>Delete Route?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Delete <strong>{deleteTarget?.routeName}</strong>? All pickup points
            for this route will also be removed. This cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              data-ocid="transport.routes.delete.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteRoute()}
              data-ocid="transport.routes.delete.confirm_button"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
