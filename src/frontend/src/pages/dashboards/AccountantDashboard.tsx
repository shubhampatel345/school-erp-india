import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUpRight,
  BarChart2,
  ClipboardList,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "../../context/AppContext";
import { formatCurrency } from "../../types";
import phpApiService from "../../utils/phpApiService";

interface AccountantStats {
  collectedToday: number;
  collectedThisMonth: number;
  pendingDues: number;
}

interface RecentReceipt {
  id: string;
  receiptNo: string;
  studentName: string;
  totalAmount: number;
  date: string;
  paymentMode: string;
}

interface ChartPoint {
  month: string;
  amount: number;
}

interface Props {
  onNavigate: (page: string) => void;
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

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  onClick,
  ocid,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  onClick?: () => void;
  ocid?: string;
}) {
  return (
    <Card
      data-ocid={ocid}
      onClick={onClick}
      className={`p-5 flex items-start gap-4 transition-shadow ${onClick ? "cursor-pointer hover:shadow-elevated" : ""}`}
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className="text-2xl font-bold text-foreground font-display mt-0.5 truncate">
          {value}
        </p>
        {sub && <p className="text-muted-foreground text-xs mt-0.5">{sub}</p>}
      </div>
      {onClick && (
        <ArrowUpRight className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
      )}
    </Card>
  );
}

export default function AccountantDashboard({ onNavigate }: Props) {
  const { currentUser, currentSession } = useApp();
  const [stats, setStats] = useState<AccountantStats | null>(null);
  const [recentReceipts, setRecentReceipts] = useState<RecentReceipt[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [rawStats, receiptsRes] = await Promise.allSettled([
          phpApiService.getStats(),
          phpApiService.getReceipts(""),
        ]);
        if (cancelled) return;
        const s = rawStats.status === "fulfilled" ? rawStats.value : null;
        if (s) {
          setStats({
            collectedToday: s.fees_today ?? 0,
            collectedThisMonth: s.fees_today ?? 0,
            pendingDues: 0,
          });
        }

        if (
          receiptsRes.status === "fulfilled" &&
          Array.isArray(receiptsRes.value)
        ) {
          const mapped: RecentReceipt[] = receiptsRes.value
            .slice(0, 10)
            .map((r) => ({
              id: r.id,
              receiptNo: r.receiptNo,
              studentName: r.studentName,
              totalAmount: r.totalAmount,
              date: r.date,
              paymentMode: r.paymentMode,
            }));
          setRecentReceipts(mapped);
        }
        setChartData(MONTHS_SHORT.map((m) => ({ month: m, amount: 0 })));
      } catch {
        setChartData(MONTHS_SHORT.map((m) => ({ month: m, amount: 0 })));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="flex flex-col gap-0">
      <div className="relative w-full min-h-[110px] flex items-center px-6 py-5 bg-gradient-to-r from-primary/90 via-primary/70 to-accent/60">
        <div className="relative z-10 flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold font-display text-white drop-shadow">
            {greeting()},{" "}
            {
              (
                currentUser?.fullName ??
                currentUser?.name ??
                "Accountant"
              ).split(" ")[0]
            }{" "}
            👋
          </h1>
          <p className="text-white/80 text-sm mt-0.5">
            Accountant Dashboard · Session:{" "}
            <strong className="text-white">{currentSession?.label}</strong>
          </p>
        </div>
      </div>

      <div className="p-4 lg:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Today's Collection"
            value={loading ? "—" : formatCurrency(stats?.collectedToday ?? 0)}
            sub="Collected today"
            icon={IndianRupee}
            color="bg-emerald-600"
            onClick={() => onNavigate("fees")}
            ocid="accountant.today_fees.card"
          />
          <StatCard
            label="This Month Total"
            value={
              loading ? "—" : formatCurrency(stats?.collectedThisMonth ?? 0)
            }
            sub="Month to date"
            icon={TrendingUp}
            color="bg-primary"
            onClick={() => onNavigate("fees")}
            ocid="accountant.month_fees.card"
          />
          <StatCard
            label="Pending Dues"
            value={loading ? "—" : formatCurrency(stats?.pendingDues ?? 0)}
            sub="Outstanding balance"
            icon={ClipboardList}
            color="bg-orange-500"
            onClick={() => onNavigate("fees")}
            ocid="accountant.dues.card"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Chart */}
          <Card
            className="p-5 lg:col-span-2"
            data-ocid="accountant.fee_chart.card"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <BarChart2 className="w-4 h-4 text-emerald-700" />
                </div>
                <h2 className="font-display font-semibold text-foreground text-sm">
                  Monthly Collection Chart
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("reports")}
                className="text-xs text-primary hover:underline"
              >
                Reports →
              </button>
            </div>
            {loading ? (
              <Skeleton className="h-48 w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={chartData}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={55}
                    tickFormatter={(v: number) =>
                      v >= 100000
                        ? `₹${(v / 100000).toFixed(1)}L`
                        : v >= 1000
                          ? `₹${(v / 1000).toFixed(0)}K`
                          : `₹${v}`
                    }
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted)/0.3)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload as {
                        month: string;
                        amount: number;
                      };
                      return (
                        <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-elevated text-xs">
                          <p className="font-semibold text-foreground mb-0.5">
                            {d.month}
                          </p>
                          <p className="text-emerald-700 font-bold">
                            {formatCurrency(d.amount)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="amount"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Recent Receipts */}
          <Card className="p-5" data-ocid="accountant.receipts.card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-foreground text-sm">
                Recent Receipts
              </h2>
              <button
                type="button"
                onClick={() => onNavigate("fees")}
                className="text-xs text-primary hover:underline"
              >
                View all →
              </button>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : recentReceipts.length === 0 ? (
              <div
                className="py-6 text-center text-muted-foreground"
                data-ocid="accountant.receipts.empty_state"
              >
                <IndianRupee className="w-7 h-7 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No receipts yet</p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[240px]">
                {recentReceipts.map((r, i) => (
                  <div
                    key={r.id}
                    data-ocid={`accountant.receipt.item.${i + 1}`}
                    className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0"
                  >
                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <IndianRupee className="w-3.5 h-3.5 text-emerald-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {r.studentName}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {r.date} · #{r.receiptNo}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 flex-shrink-0">
                      ₹{r.totalAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="p-5">
          <h2 className="font-display font-semibold text-foreground mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            {[
              {
                label: "Collect Fees",
                page: "fees",
                color: "bg-primary/10 text-primary hover:bg-primary/20",
              },
              {
                label: "View Receipts",
                page: "fees/receipts",
                color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
              },
              {
                label: "Due Fees Report",
                page: "reports",
                color: "bg-orange-100 text-orange-700 hover:bg-orange-200",
              },
            ].map((a) => (
              <Button
                key={a.page}
                variant="ghost"
                size="sm"
                data-ocid={`accountant.quick_action.${a.page.replace("/", "-")}`}
                onClick={() => onNavigate(a.page)}
                className={`rounded-xl ${a.color}`}
              >
                {a.label}
                <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
