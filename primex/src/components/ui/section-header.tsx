"use client";

import { Label } from "./label";

interface SectionHeaderProps {
  title: React.ReactNode;
  eyebrow?: string;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
}

export function SectionHeader({ title, eyebrow, sub, actions }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        {eyebrow && <Label>{eyebrow}</Label>}
        <h2 className="font-serif text-xl font-semibold text-ink">{title}</h2>
        {sub && <p className="text-ink-3 text-xs font-sans">{sub}</p>}
      </div>
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  );
}
