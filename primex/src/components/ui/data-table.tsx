"use client";

import type { ReactNode } from "react";
import { Pagination } from "./pagination";

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
        <div className="px-5 py-3 border-t border-border">
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={pagination.onPageChange}
          />
        </div>
      )}
    </div>
  );
}
