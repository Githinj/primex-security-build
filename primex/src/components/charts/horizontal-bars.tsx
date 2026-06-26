"use client";

interface HorizontalBarListProps {
  data: { name: string; count: number; pct: number }[];
}

export function HorizontalBarList({ data }: HorizontalBarListProps) {
  return (
    <div className="flex flex-col">
      {data.map((item) => (
        <div key={item.name} className="mb-[14px] last:mb-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] text-ink-2">{item.name}</span>
            <span className="text-[12.5px] font-semibold text-ink">{item.count}</span>
          </div>
          <div className="h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-p-blue rounded-full transition-all duration-300"
              style={{ width: `${item.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
