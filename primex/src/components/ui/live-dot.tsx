"use client";

type DotColor = "red" | "green" | "amber" | "blue";

const colorMap: Record<DotColor, string> = {
  red:   "bg-p-red",
  green: "bg-p-green",
  amber: "bg-p-amber",
  blue:  "bg-p-blue",
};

interface LiveDotProps {
  color?: DotColor;
}

export function LiveDot({ color = "red" }: LiveDotProps) {
  const bg = colorMap[color];
  return (
    <span className="relative inline-flex w-2 h-2 flex-shrink-0">
      <span
        className={`absolute inset-0 rounded-full ${bg} animate-[ping-slow_1.4s_cubic-bezier(0,0,0.2,1)_infinite] opacity-75`}
      />
      <span className={`relative inline-flex rounded-full w-2 h-2 ${bg}`} />
    </span>
  );
}
