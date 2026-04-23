/**
 * Transport Routes — CRUD for bus routes, pickup points, fares
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
import { Bus, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { RoutePickupPoint, TransportRoute } from "../../types";
import { generateId } from "../../utils/localStorage";

interface RouteForm {
  busNo: string;
  routeName: string;
  driverName: string;
  driverMobile: string;
}

const EMPTY_FORM: RouteForm = {
  busNo: "",
  routeName: "",
  driverName: "",
  driverMobile: "",
};

export default function Routes() {
  const { getData, saveData, updateData, deleteData } = useApp();
  const routes = getData("transport_routes") as TransportRoute[];

  const [showForm, setShowForm] = useState(false);
  const [editRoute, setEditRoute] = useState<TransportRoute | null>(null);
  const [form, setForm] = useState<RouteForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TransportRoute | null>(null);
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);

  // Pickup point form
  const [ppForm, setPpForm] = useState({
    stopName: "",
    distance: "",
    fare: "",
  });
  const [addingPP, setAddingPP] = useState(false);

  function openAdd() {
    setEditRoute(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  }

  function openEdit(r: TransportRoute) {
    setEditRoute(r);
    setForm({
      busNo: r.busNo ?? "",
      routeName: r.routeName ?? "",
      driverName: r.driverName ?? "",
      driverMobile: r.driverMobile ?? "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.routeName.trim()) {
      toast.error("Route name is required.");
      return;
    }
    setSaving(true);
    try {
      if (editRoute) {
        await updateData("transport_routes", editRoute.id, {
          busNo: form.busNo,
          routeName: form.routeName,
          driverName: form.driverName,
          driverMobile: form.driverMobile,
        } as Record<string, unknown>);
        toast.success("Route updated.");
      } else {
        await saveData("transport_routes", {
          id: generateId(),
          busNo: form.busNo,
          routeName: form.routeName,
          driverName: form.driverName,
          driverMobile: form.driverMobile,
          pickupPoints: [],
        } as unknown as Record<string, unknown>);
        toast.success("Route added.");
      }
      setShowForm(false);
    } catch {
      toast.error("Failed to save route.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteData("transport_routes", deleteTarget.id).catch(() => {});
    toast.success("Route deleted.");
    setDeleteTarget(null);
  }

  async function handleAddPickupPoint(route: TransportRoute) {
    if (!ppForm.stopName.trim()) {
      toast.error("Stop name is required.");
      return;
    }
    setAddingPP(true);
    const existing = Array.isArray(route.pickupPoints)
      ? (route.pickupPoints as RoutePickupPoint[])
      : [];
    const newPP: RoutePickupPoint = {
      id: generateId(),
      stopName: ppForm.stopName,
      order: existing.length + 1,
      distance: ppForm.distance,
      fare: Number(ppForm.fare) || 0,
    };
    const updated = [...existing, newPP];
    await updateData("transport_routes", route.id, {
      pickupPoints: updated,
    } as Record<string, unknown>);
    setPpForm({ stopName: "", distance: "", fare: "" });
    setAddingPP(false);
    toast.success("Pickup point added.");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          {routes.length} route{routes.length !== 1 ? "s" : ""} configured
        </p>
        <Button
          size="sm"
          onClick={openAdd}
          data-ocid="transport.routes.add_button"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Route
        </Button>
      </div>

      {routes.length === 0 ? (
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
            <Button size="sm" className="mt-4" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-1" /> Add Route
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {routes.map((route, i) => {
            const pts = Array.isArray(route.pickupPoints)
              ? (route.pickupPoints as RoutePickupPoint[])
              : [];
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
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {pts.length} stops
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(route)}
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setExpandedRoute(isExpanded ? null : route.id)
                        }
                        data-ocid={`transport.routes.expand_button.${i + 1}`}
                      >
                        {isExpanded ? "Hide Stops" : "Stops"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="space-y-2 mt-2">
                      {pts.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-muted">
                              <tr>
                                {["Stop", "Distance", "Fare/Month"].map((h) => (
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
                              {pts
                                .sort((a, b) => a.order - b.order)
                                .map((pp) => (
                                  <tr key={pp.id} className="border-t">
                                    <td className="px-3 py-2 flex items-center gap-1.5">
                                      <MapPin className="w-3 h-3 text-muted-foreground" />
                                      {pp.stopName}
                                    </td>
                                    <td className="px-3 py-2 text-muted-foreground">
                                      {pp.distance || "—"}
                                    </td>
                                    <td className="px-3 py-2 font-mono">
                                      ₹{pp.fare}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div className="p-3 border rounded-lg bg-muted/20 space-y-2">
                        <p className="text-xs font-semibold text-foreground">
                          Add Pickup Point
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            placeholder="Stop name"
                            value={ppForm.stopName}
                            onChange={(e) =>
                              setPpForm((f) => ({
                                ...f,
                                stopName: e.target.value,
                              }))
                            }
                            className="h-8 text-xs"
                            data-ocid="transport.pickup.stopname_input"
                          />
                          <Input
                            placeholder="Distance (km)"
                            value={ppForm.distance}
                            onChange={(e) =>
                              setPpForm((f) => ({
                                ...f,
                                distance: e.target.value,
                              }))
                            }
                            className="h-8 text-xs"
                            data-ocid="transport.pickup.distance_input"
                          />
                          <Input
                            placeholder="Fare (₹/month)"
                            value={ppForm.fare}
                            onChange={(e) =>
                              setPpForm((f) => ({ ...f, fare: e.target.value }))
                            }
                            className="h-8 text-xs"
                            inputMode="decimal"
                            data-ocid="transport.pickup.fare_input"
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => void handleAddPickupPoint(route)}
                          disabled={addingPP}
                          data-ocid="transport.pickup.add_button"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add Stop
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={showForm}
        onOpenChange={(v) => {
          if (!v) setShowForm(false);
        }}
      >
        <DialogContent className="max-w-md" data-ocid="transport.routes.dialog">
          <DialogHeader>
            <DialogTitle>{editRoute ? "Edit Route" : "Add Route"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Route Name *</Label>
                <Input
                  value={form.routeName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, routeName: e.target.value }))
                  }
                  placeholder="e.g. North Route"
                  data-ocid="transport.routes.routename_input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Bus Number</Label>
                <Input
                  value={form.busNo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, busNo: e.target.value }))
                  }
                  placeholder="e.g. UP32 AB 1234"
                  data-ocid="transport.routes.busno_input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Driver Name</Label>
                <Input
                  value={form.driverName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, driverName: e.target.value }))
                  }
                  placeholder="Driver's name"
                  data-ocid="transport.routes.drivername_input"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Driver Mobile</Label>
                <Input
                  value={form.driverMobile}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, driverMobile: e.target.value }))
                  }
                  placeholder="+91 XXXXX XXXXX"
                  data-ocid="transport.routes.drivermobile_input"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                data-ocid="transport.routes.cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleSave()}
                disabled={saving}
                data-ocid="transport.routes.save_button"
              >
                {saving ? "Saving…" : editRoute ? "Save Changes" : "Add Route"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
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
            Delete <strong>{deleteTarget?.routeName}</strong>? This cannot be
            undone.
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
              onClick={() => void handleDelete()}
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
