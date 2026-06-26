"use client";

interface LabelProps {
  children: React.ReactNode;
  className?: string;
}

export function Label({ children, className = "" }: LabelProps) {
  return (
    <span
      className={`text-[11px] text-ink-3 font-semibold tracking-widest uppercase font-sans ${className}`}
    >
      {children}
    </span>
  );
}
