"use client";

import { PhaseTag } from "./phase-tag";

type PageTitleSize = "default" | "compact";

interface PageTitleProps {
  title: string;
  sub?: string;
  actions?: React.ReactNode;
  phaseTag?: string;
  size?: PageTitleSize;
}

const titleSizeClasses: Record<PageTitleSize, string> = {
  default: "text-2xl sm:text-4xl font-semibold",
  compact: "text-2xl font-semibold",
};

export function PageTitle({ title, sub, actions, phaseTag, size = "default" }: PageTitleProps) {
  return (
    <div className="flex flex-col gap-3 font-sans">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className={`font-serif ${titleSizeClasses[size]} text-ink leading-tight`}>
              {title}
            </h1>
            {phaseTag && <PhaseTag>{phaseTag}</PhaseTag>}
          </div>
          {sub && <p className="text-ink-3 text-xs sm:text-sm">{sub}</p>}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0 pt-1">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
