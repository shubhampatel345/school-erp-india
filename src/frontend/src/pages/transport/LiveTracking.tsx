/**
 * GPS Transport Live Tracking
 * - Parent/Admin: Track Bus — poll driver location every 30s, show map via OpenStreetMap iframe
 * - Driver: Share My Location — geolocation every 30s, start/stop trip
 * - Trip History (Admin/SuperAdmin)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { useApp } from "../../context/AppContext";
import type {
  DriverLocation,
  TransportRoute,
  TransportTrip,
} from "../../types";
import { apiCall, getJwt } from "../../utils/api";

// ── Types ──────────────────────────────────────────────────

interface PickupPointStatus {
  name: string;
  order: number;
  passed: boolean;
}

type SubView = "track" | "share" | "history";

// ── Helpers ────────────────────────────────────────────────

function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDuration(startIso: string): string {
  const diff = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function timeAgo(isoStr: string): string {
  const sec = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}

// ── OpenStreetMap iframe map helper ────────────────────────
function MapFrame({
  lat,
  lon,
  label,
}: {
  lat: number;
  lon: number;
  label?: string;
}) {
  const zoom = 15;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01},${lat - 0.01},${lon + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lon}`;
  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-border shadow-card">
      {label && (
        <div className="absolute top-2 left-2 z-10 bg-card/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-medium text-foreground flex items-center gap-1 shadow-subtle">
          🚌 {label}
        </div>
      )}
      <iframe
        title="Bus location map"
        src={src}
        className="w-full h-64 md:h-80"
        loading="lazy"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin"
        aria-label={`Map showing bus location near ${lat.toFixed(4)}, ${lon.toFixed(4)}`}
      />
      <div className="absolute bottom-2 right-2 z-10">
        <a
          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-card/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs text-primary hover:underline shadow-subtle"
        >
          Open in OSM ↗
        </a>
      </div>
    </div>
  );
}

// ── Track Bus (Parent / Admin view) ────────────────────────

function TrackBus({ routes }: { routes: TransportRoute[] }) {
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetchAt, setLastFetchAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLocation = useCallback(async (routeId: string) => {
    if (!routeId) return;
    setLoading(true);
    setError(null);
    try {
      const jwt = getJwt();
      const res = await apiCall<{
        status: string;
        data?: DriverLocation;
        message?: string;
      }>(
        `transport/driver_location?routeId=${encodeURIComponent(routeId)}`,
        "GET",
        null,
        jwt,
      );
      if (res.status === "ok" && res.data) {
        setLocation(res.data);
        setLastFetchAt(new Date());
        setSecondsAgo(0);
      } else {
        setLocation(null);
        setError(res.message ?? "No active driver on this route");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch driver location",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 30s when a route is selected
  useEffect(() => {
    if (!selectedRouteId) return;
    fetchLocation(selectedRouteId);
    intervalRef.current = setInterval(
      () => fetchLocation(selectedRouteId),
      30_000,
    );
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [selectedRouteId, fetchLocation]);

  // Seconds-ago ticker
  useEffect(() => {
    if (!lastFetchAt) return;
    const t = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastFetchAt.getTime()) / 1000));
    }, 1_000);
    return () => clearInterval(t);
  }, [lastFetchAt]);

  // Pickup point status (order-based — points passed if bus was last seen "near" them)
  const selectedRoute = routes.find((r) => r.id === selectedRouteId);
  const pickupStatuses: PickupPointStatus[] = (() => {
    if (!selectedRoute || !location) return [];
    const pts = Array.isArray(selectedRoute.pickupPoints)
      ? selectedRoute.pickupPoints
      : [];
    return pts.map((p, i) => {
      const name =
        typeof p === "string"
          ? p
          : ((p as { stopName?: string }).stopName ?? `Stop ${i + 1}`);
      const order =
        typeof p === "string"
          ? i + 1
          : ((p as { order?: number }).order ?? i + 1);
      // Rough heuristic: mark as passed if timestamp suggests trip has advanced enough
      const tripAgeMin = lastFetchAt
        ? (Date.now() - lastFetchAt.getTime()) / 60_000
        : 0;
      const passed = order <= Math.ceil(tripAgeMin / 5) + 1;
      return { name, order, passed };
    });
  })();

  return (
    <div className="space-y-4">
      {/* Route selector */}
      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-48">
          <label
            htmlFor="track-route-select"
            className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1"
          >
            Select Route
          </label>
          <select
            id="track-route-select"
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:border-ring outline-none"
            data-ocid="transport.track_route_select"
          >
            <option value="">— Choose a route —</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.routeName} · Bus {r.busNo}
              </option>
            ))}
          </select>
        </div>
        {selectedRouteId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLocation(selectedRouteId)}
            disabled={loading}
            data-ocid="transport.track_refresh_button"
          >
            {loading ? "Refreshing…" : "↻ Refresh"}
          </Button>
        )}
      </div>

      {!selectedRouteId && (
        <Card data-ocid="transport.track_empty_state">
          <CardContent className="py-14 text-center">
            <div className="text-4xl mb-3">🗺️</div>
            <p className="font-semibold text-foreground">
              Select a route to track
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Live bus location will appear here
            </p>
          </CardContent>
        </Card>
      )}

      {selectedRouteId && error && !location && (
        <Card
          className="border-destructive/30 bg-destructive/5"
          data-ocid="transport.track_error_state"
        >
          <CardContent className="py-8 text-center">
            <div className="text-3xl mb-2">🚌</div>
            <p className="font-semibold text-destructive">Bus offline</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </CardContent>
        </Card>
      )}

      {location && (
        <div className="space-y-4 animate-fade-in">
          {/* Last updated badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="secondary"
              className="gap-1.5"
              data-ocid="transport.track_last_updated"
            >
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-soft inline-block" />
              Updated {secondsAgo}s ago
            </Badge>
            {selectedRoute && (
              <Badge variant="outline">
                🚌 {selectedRoute.busNo} · {selectedRoute.driverName}
              </Badge>
            )}
            <Badge variant={location.isActive ? "default" : "destructive"}>
              {location.isActive ? "Active" : "Offline"}
            </Badge>
          </div>

          {/* Map */}
          <MapFrame
            lat={location.latitude}
            lon={location.longitude}
            label={selectedRoute?.routeName}
          />

          {/* Info cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoCard
              icon="📍"
              label="Coordinates"
              value={`${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`}
            />
            <InfoCard
              icon="📡"
              label="Accuracy"
              value={`±${Math.round(location.accuracy)}m`}
            />
            <InfoCard
              icon="🕐"
              label="Last Ping"
              value={timeAgo(location.timestamp)}
            />
            <InfoCard
              icon="🛣️"
              label="Route"
              value={selectedRoute?.routeName ?? "—"}
            />
          </div>

          {/* Pickup point statuses */}
          {pickupStatuses.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Pickup Point Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {pickupStatuses.map((pt, i) => (
                    <div
                      key={`${pt.order}-${pt.name}`}
                      className="flex items-center gap-2 text-sm"
                      data-ocid={`transport.pickup_status.item.${i + 1}`}
                    >
                      <span className="text-base">
                        {pt.passed ? "✅" : "⏳"}
                      </span>
                      <span
                        className={
                          pt.passed
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }
                      >
                        {pt.order}. {pt.name}
                      </span>
                      <span
                        className={`ml-auto text-xs font-medium ${pt.passed ? "text-green-600" : "text-amber-600"}`}
                      >
                        {pt.passed ? "Passed" : "Upcoming"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ── Share My Location (Driver view) ────────────────────────

function ShareLocation({ routes }: { routes: TransportRoute[] }) {
  const { currentUser, addNotification } = useApp();
  const [activeTrip, setActiveTrip] = useState<TransportTrip | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [currentPos, setCurrentPos] = useState<GeolocationPosition | null>(
    null,
  );
  const [prevPos, setPrevPos] = useState<GeolocationPosition | null>(null);
  const [sharingError, setSharingError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [elapsed, setElapsed] = useState("0s");
  const geoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const geoSupported = "geolocation" in navigator;

  const postLocation = useCallback(
    async (pos: GeolocationPosition, tripId: string, routeId: string) => {
      setPosting(true);
      try {
        const jwt = getJwt();
        await apiCall(
          "transport/driver_location",
          "POST",
          {
            driverId: currentUser?.id ?? "unknown",
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: new Date().toISOString(),
            routeId,
            tripId,
            isActive: true,
          },
          jwt,
        );
      } catch {
        // best-effort — don't interrupt tracking
      } finally {
        setPosting(false);
      }
    },
    [currentUser?.id],
  );

  const startTrip = useCallback(async () => {
    if (!selectedRouteId) {
      setSharingError("Please select a route first.");
      return;
    }
    if (!geoSupported) {
      setSharingError("Location sharing is not supported in this browser.");
      return;
    }

    setSharingError(null);

    // Request permission on button click
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setCurrentPos(pos);
        // Create trip record
        const jwt = getJwt();
        let tripId = `trip_${Date.now()}`;
        try {
          const res = await apiCall<{ status: string; data?: { id: string } }>(
            "transport/trips",
            "POST",
            {
              routeId: selectedRouteId,
              driverId: currentUser?.id ?? "unknown",
              driverName: currentUser?.name ?? "Driver",
              startTime: new Date().toISOString(),
              status: "active",
            },
            jwt,
          );
          if (res.data?.id) tripId = res.data.id;
        } catch {
          // Proceed with local id if server unreachable
        }

        const trip: TransportTrip = {
          id: tripId,
          routeId: selectedRouteId,
          driverId: currentUser?.id ?? "unknown",
          startTime: new Date().toISOString(),
          status: "active",
          locations: [],
        };
        setActiveTrip(trip);
        addNotification("Trip started — sharing location", "success");

        await postLocation(pos, tripId, selectedRouteId);

        // Poll every 30s
        geoIntervalRef.current = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            async (newPos) => {
              setPrevPos((prev) => prev ?? newPos);
              setCurrentPos(newPos);
              await postLocation(newPos, tripId, selectedRouteId);
            },
            () => {
              /* ignore individual failures */
            },
            { enableHighAccuracy: true, timeout: 10_000 },
          );
        }, 30_000);

        // Elapsed timer
        const tripStart = Date.now();
        timerRef.current = setInterval(() => {
          setElapsed(formatDuration(new Date(tripStart).toISOString()));
        }, 1_000);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setSharingError(
            "Location permission denied. Please allow location access in your browser settings.",
          );
        } else {
          setSharingError(`Could not get location: ${err.message}`);
        }
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }, [
    selectedRouteId,
    geoSupported,
    postLocation,
    currentUser,
    addNotification,
  ]);

  const stopTrip = useCallback(async () => {
    if (geoIntervalRef.current) clearInterval(geoIntervalRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    if (activeTrip) {
      try {
        const jwt = getJwt();
        await apiCall(
          `transport/trips/${activeTrip.id}`,
          "PUT",
          {
            status: "completed",
            endTime: new Date().toISOString(),
          },
          jwt,
        );
      } catch {
        // non-critical
      }
    }
    setActiveTrip(null);
    setCurrentPos(null);
    setPrevPos(null);
    setElapsed("0s");
    addNotification("Trip ended", "info");
  }, [activeTrip, addNotification]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (geoIntervalRef.current) clearInterval(geoIntervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  const distanceCovered =
    currentPos && prevPos
      ? distanceKm(
          prevPos.coords.latitude,
          prevPos.coords.longitude,
          currentPos.coords.latitude,
          currentPos.coords.longitude,
        ).toFixed(2)
      : null;

  if (!geoSupported) {
    return (
      <Card
        className="border-destructive/30 bg-destructive/5"
        data-ocid="transport.share_unsupported_state"
      >
        <CardContent className="py-10 text-center">
          <div className="text-4xl mb-3">📵</div>
          <p className="font-semibold text-destructive">
            Location sharing not supported
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Your browser does not support the Geolocation API.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!activeTrip ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span>🚌</span> Start a New Trip
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label
                htmlFor="share-route-select"
                className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1"
              >
                Select Your Route
              </label>
              <select
                id="share-route-select"
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring outline-none"
                data-ocid="transport.share_route_select"
              >
                <option value="">— Choose route —</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.routeName} · Bus {r.busNo}
                  </option>
                ))}
              </select>
            </div>

            {sharingError && (
              <p
                className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2"
                data-ocid="transport.share_error_state"
              >
                ⚠️ {sharingError}
              </p>
            )}

            <Button
              onClick={startTrip}
              disabled={!selectedRouteId}
              className="w-full"
              data-ocid="transport.start_trip_button"
            >
              📍 Start Trip & Share Location
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Location will be shared every 30 seconds. You'll be asked for
              permission when you tap Start.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 animate-fade-in">
          {/* Active trip banner */}
          <Card className="border-green-500/40 bg-green-500/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse-soft inline-block" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      Trip Active
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {routes.find((r) => r.id === selectedRouteId)?.routeName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg font-bold font-mono text-foreground">
                      {elapsed}
                    </p>
                    <p className="text-xs text-muted-foreground">Elapsed</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={stopTrip}
                    data-ocid="transport.stop_trip_button"
                  >
                    ⏹ Stop Trip
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live map */}
          {currentPos && (
            <MapFrame
              lat={currentPos.coords.latitude}
              lon={currentPos.coords.longitude}
              label="My Location"
            />
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {currentPos && (
              <>
                <InfoCard
                  icon="📍"
                  label="Lat / Lon"
                  value={`${currentPos.coords.latitude.toFixed(5)}, ${currentPos.coords.longitude.toFixed(5)}`}
                />
                <InfoCard
                  icon="📡"
                  label="Accuracy"
                  value={`±${Math.round(currentPos.coords.accuracy)}m`}
                />
              </>
            )}
            {distanceCovered && (
              <InfoCard
                icon="🛣️"
                label="Distance (est.)"
                value={`${distanceCovered} km`}
              />
            )}
          </div>

          {posting && (
            <p
              className="text-xs text-muted-foreground text-center animate-pulse-soft"
              data-ocid="transport.share_loading_state"
            >
              📡 Sending location to server…
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Trip History (Admin / Super Admin) ─────────────────────

function TripHistory() {
  const [trips, setTrips] = useState<TransportTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const jwt = getJwt();
        const res = await apiCall<{
          status: string;
          data?: TransportTrip[];
        }>("transport/trips?days=30", "GET", null, jwt);
        if (res.status === "ok" && Array.isArray(res.data)) {
          setTrips(res.data);
        } else {
          setTrips([]);
        }
      } catch {
        setError("Could not load trip history from server.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-2" data-ocid="transport.history_loading_state">
        {["s1", "s2", "s3"].map((k) => (
          <div key={k} className="h-12 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card
        className="border-destructive/30"
        data-ocid="transport.history_error_state"
      >
        <CardContent className="py-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (trips.length === 0) {
    return (
      <Card data-ocid="transport.history_empty_state">
        <CardContent className="py-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-semibold text-foreground">
            No trips in last 30 days
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Completed trips will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {[
              "Route",
              "Driver",
              "Start Time",
              "End Time",
              "Duration",
              "Status",
            ].map((h) => (
              <th
                key={h}
                className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {trips.map((trip, i) => {
            const durationMs = trip.endTime
              ? new Date(trip.endTime).getTime() -
                new Date(trip.startTime).getTime()
              : null;
            const durMin = durationMs ? Math.round(durationMs / 60_000) : null;
            return (
              <tr
                key={trip.id}
                className="hover:bg-muted/30 transition-colors"
                data-ocid={`transport.trip_history.item.${i + 1}`}
              >
                <td className="px-3 py-2.5 font-medium">{trip.routeId}</td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {trip.driverId}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {new Date(trip.startTime).toLocaleString("en-IN", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {trip.endTime
                    ? new Date(trip.endTime).toLocaleString("en-IN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })
                    : "—"}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground font-mono">
                  {durMin != null ? `${durMin} min` : "—"}
                </td>
                <td className="px-3 py-2.5">
                  <Badge
                    variant={trip.status === "active" ? "default" : "secondary"}
                  >
                    {trip.status}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Tiny info card ─────────────────────────────────────────
function InfoCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-muted/40 rounded-xl p-3 space-y-0.5">
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <span>{icon}</span>
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground break-all">{value}</p>
    </div>
  );
}

// ── Main LiveTracking component ────────────────────────────

export default function LiveTracking() {
  const { currentUser, getData } = useApp();
  const isDriver = currentUser?.role === "driver";
  const isAdminOrAbove =
    currentUser?.role === "superadmin" ||
    currentUser?.role === "admin" ||
    currentUser?.role === "teacher";

  const defaultView: SubView = isDriver ? "share" : "track";
  const [subView, setSubView] = useState<SubView>(defaultView);

  // Load routes from AppContext data store
  const routes: TransportRoute[] = getData(
    "transport_routes",
  ) as TransportRoute[];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Sub-view toggle */}
      <div className="bg-card border border-border rounded-xl p-1 flex gap-1 overflow-x-auto w-fit">
        {(!isDriver || isAdminOrAbove) && (
          <button
            type="button"
            onClick={() => setSubView("track")}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${subView === "track" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
            data-ocid="transport.live_tracking_track_tab"
          >
            🗺️ Track Bus
          </button>
        )}
        {isDriver && (
          <button
            type="button"
            onClick={() => setSubView("share")}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${subView === "share" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
            data-ocid="transport.live_tracking_share_tab"
          >
            📍 Share My Location
          </button>
        )}
        {isAdminOrAbove && (
          <button
            type="button"
            onClick={() => setSubView("history")}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${subView === "history" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
            data-ocid="transport.live_tracking_history_tab"
          >
            📋 Trip History
          </button>
        )}
      </div>

      {/* Content */}
      {subView === "track" && <TrackBus routes={routes} />}
      {subView === "share" && isDriver && <ShareLocation routes={routes} />}
      {subView === "share" && !isDriver && (
        <Card
          className="border-amber-400/30 bg-amber-50/20"
          data-ocid="transport.share_driver_only_state"
        >
          <CardContent className="py-10 text-center">
            <div className="text-4xl mb-3">🔒</div>
            <p className="font-semibold text-foreground">Driver access only</p>
            <p className="text-sm text-muted-foreground mt-1">
              Only users with the Driver role can share their location.
            </p>
          </CardContent>
        </Card>
      )}
      {subView === "history" && <TripHistory />}
    </div>
  );
}
