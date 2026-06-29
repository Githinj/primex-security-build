"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface DataTablePagination {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps {
  columns: string[];
  rows: ReactNode[][];
  pagination?: DataTablePagination;
}

export function DataTable({ columns, rows, pagination }: DataTableProps) {
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.pageSize)
    : 1;

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-sm font-sans">
          <thead>
            <tr className="bg-bg">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`px-5 py-3 text-[10.5px] text-ink-3 font-semibold tracking-wider uppercase whitespace-nowrap ${
                    i === columns.length - 1 ? "text-right" : "text-left"
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-10 text-center text-ink-3 text-sm"
                >
                  No results found.
                </td>
              </tr>
            ) : (
              rows.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-b border-border hover:bg-surface-subtle transition-colors duration-100"
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`px-5 py-3.5 text-ink-2 ${
                        ci === row.length - 1 ? "text-right" : "text-left"
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <span className="text-xs text-ink-3 font-sans tabular-nums">
            {pagination.total === 0
              ? "0 results"
              : `${(pagination.page - 1) * pagination.pageSize + 1}\u2013${Math.min(
                  pagination.page * pagination.pageSize,
                  pagination.total
                )} of ${pagination.total}`}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} strokeWidth={2} />
              </button>
              <span className="text-xs font-sans text-ink-2 px-2 tabular-nums">
                Page {pagination.page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={pagination.page >= totalPages}
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <ChevronRight size={16} strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
