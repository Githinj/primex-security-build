"use client";

import { Sparkles } from "lucide-react";

interface PhaseTagProps {
  children: React.ReactNode;
}

export function PhaseTag({ children }: PhaseTagProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-p-blue-soft text-p-blue text-[10px] font-semibold tracking-wider uppercase font-sans">
      <Sparkles size={10} strokeWidth={2.5} />
      {children}
    </span>
  );
}
