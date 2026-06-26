"use client";

import { ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  className = "",
  disabled = false,
}: SelectProps) {
  return (
    <div className="relative font-sans">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full appearance-none px-3 py-2 pr-8 text-sm bg-surface text-ink border border-border rounded-lg outline-none focus:border-p-blue transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          !value ? "text-ink-4" : ""
        } ${className}`}
      >
        {placeholder && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-4">
        <ChevronDown size={14} strokeWidth={2} />
      </span>
    </div>
  );
}
