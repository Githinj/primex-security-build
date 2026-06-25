"use client";

import { useState } from "react";
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Download,
} from "lucide-react";

import {
  PageTitle,
  StatCard,
  Card,
  Pill,
  DataTable,
  Button,
} from "@/components/ui";

import type { Report } from "@/lib/types";

// --- chart data (hardcoded) --------------------------------------------------

const monthlyData = [
  { month: "Dec", value: 8 },
  { month: "Jan", value: 11 },
  { month: "Feb", value: 13 },
  { month: "Mar", value: 9 },
  { month: "Apr", value: 12 },
  { month: "May", value: 9 },
];

const maxMonthly = Math.max(...monthlyData.map((d) => d.value));

const incidentTypes = [
  { label: "Suspicious activity", count: 14, pct: 78 },
  { label: "Door / access", count: 9, pct: 50 },
  { label: "Camera offline", count: 8, pct: 44 },
  { label: "After-hours motion", count: 6, pct: 33 },
  { label: "Other", count: 3, pct: 17 },
];

// --- helpers -----------------------------------------------------------------

function reportTypeTone(type: string): "blue" | "green" | "amber" | "gray" {
  switch (type) {
    case "Monthly":
      return "blue";
    case "Quarterly":
      return "green";
    case "Incident":
      return "amber";
    default:
      return "gray";
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// --- component ---------------------------------------------------------------

interface ReportsClientProps {
  reports: Report[];
}

export function ReportsClient({ reports }: ReportsClientProps) {
  const [_dateRange, setDateRange] = useState("Last 6 months");

  const reportRows = reports.map((report) => [
    // Report name
    <span key="name" className="flex items-center gap-2.5">
      <span className="w-7 h-7 rounded-lg bg-p-blue-soft flex items-center justify-center flex-shrink-0">
        <FileText size={13} className="text-p-blue" strokeWidth={2} />
      </span>
      <span className="font-medium text-ink text-[13px] leading-snug max-w-[220px] block">
        {report.name}
      </span>
    </span>,
    // Company / Scope
    <span key="company" className="text-ink-3 text-[13px]">
      {report.company_name}
    </span>,
    // Type
    <Pill key="type" tone={reportTypeTone(report.type)} size="sm">
      {report.type}
    </Pill>,
    // Incidents
    <span key="incidents" className="text-ink-2 text-[13px] font-medium">
      {report.incident_count}
    </span>,
    // Date
    <span key="date" className="text-ink-3 text-[13px] whitespace-nowrap">
      {formatDate(report.date)}
    </span>,
    // Size
    <span key="size" className="text-ink-4 text-[13px]">
      {report.size}
    </span>,
    // Download
    <Button key="dl" variant="ghost" size="sm" icon={Download} />,
  ]);

  return (
    <div className="px-9 py-8 flex flex-col gap-6">

      {/* Header */}
      <PageTitle
        title="Reports"
        phaseTag="AI insights · Phase 3"
        sub="Monthly summaries, response-time analytics, and site-level reports. Downloadable as PDF or CSV."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={Calendar}
              onClick={() => setDateRange("Custom")}
            >
              Date range
            </Button>
            <Button variant="primary" size="sm" icon={Download}>
              Generate new report
            </Button>
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3.5">
        <StatCard
          label="Reports generated"
          value="47"
          icon={FileText}
          supporting={
            <Pill tone="blue" size="sm">12 this month</Pill>
          }
        />
        <StatCard
          label="Avg incidents / month"
          value="11.4"
          icon={AlertTriangle}
          supporting={
            <Pill tone="green" size="sm">&#8595; 8% vs Q4</Pill>
          }
        />
        <StatCard
          label="Avg response time"
          value="9m"
          icon={Clock}
          supporting={
            <Pill tone="green" size="sm">&#8595; 2m vs avg</Pill>
          }
        />
        <StatCard
          label="Resolution rate"
          value="96%"
          icon={CheckCircle2}
          supporting={
            <Pill tone="green" size="sm">+3% vs avg</Pill>
          }
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-[1fr_360px] gap-5">

        {/* Left: Incidents over time */}
        <Card>
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <h2 className="font-serif text-xl font-semibold text-ink">
                  Incidents over time
                </h2>
                <p className="text-ink-3 text-xs font-sans">Dec 2024 - May 2025 - all companies</p>
              </div>
            </div>

            {/* Bar chart */}
            <div className="flex items-end gap-3 h-36 pt-2">
              {monthlyData.map((d, i) => {
                const heightPct = Math.round((d.value / maxMonthly) * 100);
                const isLast = i === monthlyData.length - 1;
                return (
                  <div key={d.month} className="flex flex-col items-center gap-2 flex-1">
                    <span className="text-[11px] font-semibold text-ink-3 font-sans">
                      {d.value}
                    </span>
                    <div className="w-full flex items-end" style={{ height: "88px" }}>
                      <div
                        className={`w-full rounded-t-md transition-all duration-300 ${
                          isLast ? "bg-p-blue" : "bg-p-blue-soft"
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-ink-4 font-sans">{d.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Right: Top incident types */}
        <Card>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-0.5">
              <h2 className="font-serif text-xl font-semibold text-ink">
                Top incident types
              </h2>
              <p className="text-ink-3 text-xs font-sans">Last 6 months - all companies</p>
            </div>

            {/* Horizontal bars */}
            <div className="flex flex-col gap-4">
              {incidentTypes.map((item) => (
                <div key={item.label} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] text-ink font-sans font-medium leading-tight">
                      {item.label}
                    </span>
                    <span className="text-[12px] text-ink-3 font-sans flex-shrink-0">
                      {item.count} - {item.pct}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-surface-subtle rounded-full overflow-hidden">
                    <div
                      className="h-full bg-p-blue rounded-full transition-all duration-300"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent reports table */}
      <Card padding="p-0">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-serif text-xl font-semibold text-ink">Recent reports</h2>
            <p className="text-ink-3 text-xs font-sans">All companies - sorted by date</p>
          </div>
        </div>

        <DataTable
          columns={["Report", "Scope", "Type", "Incidents", "Date", "Size", ""]}
          rows={reportRows}
        />
      </Card>
    </div>
  );
}
