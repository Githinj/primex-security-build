"use client";

import { PhaseTag } from "./phase-tag";

interface PageTitleProps {
  title: string;
  sub?: string;
  actions?: React.ReactNode;
  phaseTag?: string;
}

export function PageTitle({ title, sub, actions, phaseTag }: PageTitleProps) {
  return (
    <div className="flex flex-col gap-3 font-sans">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="font-serif text-2xl sm:text-4xl font-semibold text-ink leading-tight">
            {title}
          </h1>
          {phaseTag && <PhaseTag>{phaseTag}</PhaseTag>}
        </div>
        {sub && <p className="text-ink-3 text-xs sm:text-sm">{sub}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
