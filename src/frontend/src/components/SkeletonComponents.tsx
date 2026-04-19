/**
 * SHUBH SCHOOL ERP — Skeleton Loading Components
 *
 * Reusable animated placeholder skeletons for:
 * - SkeletonRow: table/list row placeholder
 * - SkeletonCard: dashboard stat card placeholder
 */

// Fixed width percentages — deterministic, not derived from index
const CELL_WIDTHS = ["60%", "80%", "55%", "75%", "65%", "90%", "70%", "85%"];
const CELL_KEYS = ["c0", "c1", "c2", "c3", "c4", "c5", "c6", "c7"];
const CARD_KEYS = ["k0", "k1", "k2", "k3", "k4", "k5", "k6", "k7"];
const ROW_KEYS = [
  "r0",
  "r1",
  "r2",
  "r3",
  "r4",
  "r5",
  "r6",
  "r7",
  "r8",
  "r9",
  "r10",
  "r11",
  "r12",
  "r13",
  "r14",
];

interface SkeletonRowProps {
  cols?: number;
}

export function SkeletonRow({ cols = 7 }: SkeletonRowProps) {
  const safeCols = Math.min(cols, CELL_KEYS.length);
  return (
    <tr className="border-b border-border/60" style={{ height: "36px" }}>
      <td className="w-8 px-2 border-r border-border/40">
        <div className="w-3.5 h-3.5 rounded bg-muted animate-pulse" />
      </td>
      {CELL_KEYS.slice(0, safeCols).map((key, pos) => (
        <td
          key={key}
          className="px-2 py-1 border-r border-border/40 last:border-r-0"
        >
          <div
            className="h-3 rounded bg-muted animate-pulse"
            style={{
              width: CELL_WIDTHS[pos % CELL_WIDTHS.length],
              animationDelay: `${pos * 50}ms`,
            }}
          />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="p-5 flex items-start gap-4 rounded-xl border border-border bg-card">
      <div className="w-11 h-11 rounded-xl bg-muted animate-pulse flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2 pt-1">
        <div className="h-2.5 w-24 rounded bg-muted animate-pulse" />
        <div
          className="h-7 w-20 rounded bg-muted animate-pulse"
          style={{ animationDelay: "60ms" }}
        />
        <div
          className="h-2 w-32 rounded bg-muted animate-pulse"
          style={{ animationDelay: "120ms" }}
        />
      </div>
    </div>
  );
}

/** Grid of skeleton cards — for dashboard stat grid */
export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  const safeCount = Math.min(count, CARD_KEYS.length);
  return (
    <>
      {CARD_KEYS.slice(0, safeCount).map((key) => (
        <SkeletonCard key={key} />
      ))}
    </>
  );
}

/** N skeleton rows for table views */
export function SkeletonTableRows({
  rows = 10,
  cols = 7,
}: {
  rows?: number;
  cols?: number;
}) {
  const safeRows = Math.min(rows, ROW_KEYS.length);
  return (
    <>
      {ROW_KEYS.slice(0, safeRows).map((key) => (
        <SkeletonRow key={key} cols={cols} />
      ))}
    </>
  );
}
