"use client";

interface DataTableProps {
  columns: string[];
  rows: React.ReactNode[][];
}

export function DataTable({ columns, rows }: DataTableProps) {
  return (
    <div className="w-full overflow-x-auto">
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
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-border hover:bg-surface-subtle transition-colors duration-100">
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
