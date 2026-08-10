"use client";

import { ChevronRight } from "lucide-react";

type BreadcrumbItem = string | { label: string; onClick?: () => void };

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 font-sans text-xs sm:text-sm">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const label = typeof item === "string" ? item : item.label;
        const onClick = typeof item === "string" ? undefined : item.onClick;

        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight size={13} className="text-ink-4 flex-shrink-0" strokeWidth={2} />
            )}
            {!isLast && onClick ? (
              <button
                type="button"
                onClick={onClick}
                className="text-ink-3 hover:text-ink-2 cursor-pointer transition-colors duration-100"
              >
                {label}
              </button>
            ) : (
              <span
                className={
                  isLast
                    ? "text-ink font-semibold"
                    : "text-ink-3 hover:text-ink-2 cursor-pointer transition-colors duration-100"
                }
              >
                {label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
