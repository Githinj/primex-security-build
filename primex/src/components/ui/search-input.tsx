"use client";

import { Search } from "lucide-react";

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function SearchInput({
  placeholder = "Search…",
  value,
  onChange,
}: SearchInputProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-surface hover:border-border-strong focus-within:border-p-blue transition-colors duration-150 font-sans">
      <Search size={15} className="text-ink-4 flex-shrink-0" strokeWidth={2} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-4 outline-none min-w-0"
      />
    </div>
  );
}
