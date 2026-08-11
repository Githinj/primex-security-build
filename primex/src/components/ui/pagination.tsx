"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  itemLabel = "results",
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-ink-3 font-sans tabular-nums">
        {total === 0
          ? `0 ${itemLabel}`
          : `${(page - 1) * pageSize + 1}–${Math.min(
              page * pageSize,
              total
            )} of ${total}`}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <span className="text-xs font-sans text-ink-2 px-2 tabular-nums">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}
