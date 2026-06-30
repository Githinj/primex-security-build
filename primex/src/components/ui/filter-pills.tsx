"use client";

import { cn } from "@/lib/utils";

interface FilterPillsProps<T extends string> {
  options: T[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}

export function FilterPills<T extends string>({ options, value, onChange, label }: FilterPillsProps<T>) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {label && (
        <span className="text-[11px] font-semibold text-ink-4 font-sans mr-1">{label}</span>
      )}
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "px-2.5 py-1 rounded-full text-[11px] font-semibold font-sans transition-colors duration-100 cursor-pointer",
            value === option
              ? "bg-navy text-white"
              : "bg-surface text-ink-3 hover:bg-surface-subtle"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
