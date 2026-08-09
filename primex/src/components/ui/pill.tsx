"use client";

export type Tone = "red" | "amber" | "green" | "blue" | "gray" | "navy";
type Size = "sm" | "md";

const toneClasses: Record<Tone, { fg: string; bg: string }> = {
  red:   { fg: "text-p-red",   bg: "bg-p-red-soft" },
  amber: { fg: "text-p-amber", bg: "bg-p-amber-soft" },
  green: { fg: "text-p-green", bg: "bg-p-green-soft" },
  blue:  { fg: "text-p-blue",  bg: "bg-p-blue-soft" },
  gray:  { fg: "text-p-gray",  bg: "bg-p-gray-soft" },
  navy:  { fg: "text-white",   bg: "bg-navy" },
};

export function getToneClasses(tone: Tone): { fg: string; bg: string } {
  return toneClasses[tone];
}

const sizeClasses: Record<Size, string> = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
};

const dotSizeClasses: Record<Size, string> = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
};

interface PillProps {
  tone?: Tone;
  children: React.ReactNode;
  dot?: boolean;
  size?: Size;
}

export function Pill({ tone = "gray", children, dot = false, size = "md" }: PillProps) {
  const { fg, bg } = toneClasses[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold font-sans ${fg} ${bg} ${sizeClasses[size]}`}
    >
      {dot && (
        <span
          className={`rounded-full flex-shrink-0 ${dotSizeClasses[size]} ${fg.replace("text-", "bg-")}`}
        />
      )}
      {children}
    </span>
  );
}
