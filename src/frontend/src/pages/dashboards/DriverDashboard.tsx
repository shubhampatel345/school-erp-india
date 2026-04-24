import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bus, MapPin, Navigation, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import phpApiService from "../../utils/phpApiService";

interface RouteInfo {
  id: string;
  busNo: string;
  routeName: string;
  driverName: string;
  driverMobile: string;
  pickupPoints: Array<{ stopName: string; order: number; fare: number }>;
}

interface AssignedStudent {
  id: string;
  fullName: string;
  admNo: string;
  pickupPoint: string;
  class: string;
  section: string;
}

interface Props {
  onNavigate: (page: string) => void;
}

export default function DriverDashboard({ onNavigate }: Props) {
  const { currentUser, currentSession } = useApp();
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [students, setStudents] = useState<AssignedStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const routes =
          (await phpApiService.getRoutes()) as unknown as RouteInfo[];
        if (!cancelled && Array.isArray(routes)) {
          const driverName = currentUser?.fullName ?? currentUser?.name ?? "";
          const driverMobile =
            (currentUser as { mobile?: string })?.mobile ?? "";
          const myRoute = routes.find(
            (r) =>
              r.driverName === driverName || r.driverMobile === driverMobile,
          );
          if (myRoute) setRoute(myRoute);
        }

        const allStudents = await phpApiService.getStudents({
          session: currentSession?.id,
        });
        if (!cancelled && allStudents?.data) {
          const routeStudents = allStudents.data.filter(
            (s) =>
              (s as unknown as { transportRoute?: string }).transportRoute ===
              route?.routeName,
          );
          setStudents(
            routeStudents.slice(0, 30).map((s) => ({
              id: s.id,
              fullName: s.fullName,
              admNo: s.admNo,
              pickupPoint: String(
                (s as Record<string, unknown>).transportPickup ?? "",
              ),
              class: s.class,
              section: s.section,
            })),
          );
        }
      } catch {
        /* offline */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentSession?.id, currentUser, route?.routeName]);

  // Group students by pickup point
  const byPickup: Record<string, AssignedStudent[]> = {};
  for (const s of students) {
    const pp =
      (s as unknown as { transportPickup?: string }).transportPickup ??
      "Unassigned";
    if (!byPickup[pp]) byPickup[pp] = [];
    byPickup[pp].push(s);
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const handleShareLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const mapsUrl = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
        window.open(mapsUrl, "_blank", "noopener,noreferrer");
      });
    }
  };

  return (
    <div className="flex flex-col gap-0">
      <div className="relative w-full min-h-[110px] flex items-center px-6 py-5 bg-gradient-to-r from-primary/90 via-primary/70 to-accent/60">
        <div className="relative z-10 flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold font-display text-white drop-shadow">
            {greeting()},{" "}
            {
              (currentUser?.fullName ?? currentUser?.name ?? "Driver").split(
                " ",
              )[0]
            }{" "}
            👋
          </h1>
          <p className="text-white/80 text-sm mt-0.5">
            Driver Dashboard ·{" "}
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleShareLocation}
          data-ocid="driver.share_location.button"
          className="relative z-10 bg-white/20 text-white hover:bg-white/30 border-white/30 border ml-4 flex-shrink-0"
        >
          <Navigation className="w-4 h-4 mr-1.5" />
          Share Location
        </Button>
      </div>

      <div className="p-4 lg:p-6 space-y-6">
        {/* Route Info */}
        <Card className="p-5" data-ocid="driver.route.card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bus className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-foreground">
                My Route
              </h2>
              <p className="text-sm text-muted-foreground">
                Assigned bus & route details
              </p>
            </div>
          </div>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-2/3 rounded-lg" />
              <Skeleton className="h-6 w-1/2 rounded-lg" />
            </div>
          ) : route ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground mb-0.5">
                  Bus Number
                </p>
                <p className="text-lg font-bold text-foreground font-display">
                  {route.busNo}
                </p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground mb-0.5">
                  Route Name
                </p>
                <p className="text-lg font-bold text-foreground font-display truncate">
                  {route.routeName}
                </p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground mb-0.5">
                  Total Students
                </p>
                <p className="text-lg font-bold text-foreground font-display">
                  {students.length}
                </p>
              </div>
            </div>
          ) : (
            <div
              className="py-6 text-center text-muted-foreground"
              data-ocid="driver.route.empty_state"
            >
              <Bus className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No route assigned</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Contact your school admin to assign a route
              </p>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Students by Pickup Point */}
          <Card className="p-5" data-ocid="driver.students.card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h2 className="font-display font-semibold text-foreground text-sm">
                  Assigned Students
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {students.length} total
              </span>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : students.length === 0 ? (
              <div
                className="py-6 text-center text-muted-foreground"
                data-ocid="driver.students.empty_state"
              >
                <Users className="w-7 h-7 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No students assigned to your route</p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[320px]">
                {students.map((s, i) => (
                  <div
                    key={s.id}
                    data-ocid={`driver.student.item.${i + 1}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {s.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.class} {s.section} · #{s.admNo}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {s.pickupPoint || "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Pickup Points Summary */}
          <Card className="p-5" data-ocid="driver.pickup_points.card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h2 className="font-display font-semibold text-foreground text-sm">
                  Assigned Students
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("attendance")}
                className="text-xs text-primary hover:underline"
              >
                Mark Attendance →
              </button>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : route?.pickupPoints && route.pickupPoints.length > 0 ? (
              <div className="space-y-2">
                {route.pickupPoints
                  .sort((a, b) => a.order - b.order)
                  .map((pp, i) => {
                    const count = byPickup[pp.stopName]?.length ?? 0;
                    return (
                      <div
                        key={pp.stopName}
                        data-ocid={`driver.pickup.item.${i + 1}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/40"
                      >
                        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-accent">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {pp.stopName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {count} student{count !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-muted-foreground flex-shrink-0">
                          ₹{pp.fare.toLocaleString("en-IN")}/mo
                        </span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div
                className="py-6 text-center text-muted-foreground"
                data-ocid="driver.pickup_points.empty_state"
              >
                <MapPin className="w-7 h-7 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No pickup points configured</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
