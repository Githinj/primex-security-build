"use client";

interface BarChartProps {
  data: { label: string; value: number }[];
}

export function SimpleBarChart({ data }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value));

  return (
    <div className="flex items-end gap-3 h-[180px] pt-2.5">
      {data.map((d, i) => {
        const heightPct = Math.round((d.value / max) * 100);
        const isLast = i === data.length - 1;
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-2">
            <span className="text-xs font-semibold text-ink tabular-nums">
              {d.value}
            </span>
            <div className="w-full flex items-end flex-1">
              <div
                className={`w-full rounded-t-md transition-all duration-300 ${
                  isLast ? "bg-p-blue" : "bg-p-blue-soft"
                }`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
            <span className="text-[11px] text-ink-3 font-medium">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
