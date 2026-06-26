"use client";

import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  supporting?: React.ReactNode;
  accent?: string;
}

export function StatCard({ label, value, icon: Icon, supporting, accent }: StatCardProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] text-ink-3 font-semibold tracking-widest uppercase font-sans">
          {label}
        </span>
        {Icon && (
          <span className="w-8 h-8 rounded-lg bg-p-blue-softer flex items-center justify-center flex-shrink-0">
            <Icon size={16} className="text-p-blue" strokeWidth={2} />
          </span>
        )}
      </div>
      <p
        className={`font-serif text-4xl font-semibold leading-none ${accent ?? "text-ink"}`}
      >
        {value}
      </p>
      {supporting && (
        <div className="flex flex-wrap items-center gap-2 mt-auto pt-1">
          {supporting}
        </div>
      )}
    </div>
  );
}
