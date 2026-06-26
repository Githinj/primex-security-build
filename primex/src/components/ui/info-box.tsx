"use client";

import { AlertCircle } from "lucide-react";

type Tone = "blue" | "amber" | "green";

const toneClasses: Record<Tone, { wrapper: string; icon: string }> = {
  blue:  { wrapper: "bg-p-blue-soft text-p-blue",   icon: "text-p-blue" },
  amber: { wrapper: "bg-p-amber-soft text-p-amber", icon: "text-p-amber" },
  green: { wrapper: "bg-p-green-soft text-p-green", icon: "text-p-green" },
};

interface InfoBoxProps {
  children: React.ReactNode;
  tone?: Tone;
}

export function InfoBox({ children, tone = "blue" }: InfoBoxProps) {
  const { wrapper, icon } = toneClasses[tone];
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-sans ${wrapper}`}>
      <AlertCircle size={16} className={`flex-shrink-0 mt-0.5 ${icon}`} strokeWidth={2} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
