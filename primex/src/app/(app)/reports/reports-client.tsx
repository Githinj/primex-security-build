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
import { SimpleBarChart } from "@/components/charts/bar-chart";
import { HorizontalBarList } from "@/components/charts/horizontal-bars";

import type { Report } from "@/lib/types";

// --- chart data (hardcoded) --------------------------------------------------

const monthlyData = [
  { label: "Dec", value: 8 },
  { label: "Jan", value: 11 },
  { label: "Feb", value: 13 },
  { label: "Mar", value: 9 },
  { label: "Apr", value: 12 },
  { label: "May", value: 9 },
];

const incidentTypes = [
  { name: "Suspicious activity", count: 14, pct: 78 },
  { name: "Door / access", count: 9, pct: 50 },
  { name: "Camera offline", count: 8, pct: 44 },
  { name: "After-hours motion", count: 6, pct: 33 },
  { name: "Other", count: 3, pct: 17 },
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
      <div className="grid grid-cols-[1.4fr_1fr] gap-5">

        {/* Left: Incidents over time */}
        <Card padding="p-0">
          <div className="flex flex-col gap-0.5 px-6 pt-5 pb-0">
            <h2 className="font-serif text-[20px] font-bold text-ink">
              Incidents over time
            </h2>
            <p className="text-[12.5px] text-ink-3">
              Last 6 months &middot; all companies
            </p>
          </div>
          <div className="px-6 py-6">
            <SimpleBarChart data={monthlyData} />
          </div>
        </Card>

        {/* Right: Top incident types */}
        <Card padding="p-0">
          <div className="flex flex-col gap-0.5 px-6 pt-5 pb-0">
            <h2 className="font-serif text-[20px] font-bold text-ink">
              Top incident types
            </h2>
            <p className="text-[12.5px] text-ink-3">Apr 2026</p>
          </div>
          <div className="px-[22px] py-[22px]">
            <HorizontalBarList data={incidentTypes} />
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
