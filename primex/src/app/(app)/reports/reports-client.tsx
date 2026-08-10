"use client";

import { useState, useTransition } from "react";
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
  SectionHeader,
} from "@/components/ui";
import { SimpleBarChart } from "@/components/charts/bar-chart";
import { HorizontalBarList } from "@/components/charts/horizontal-bars";

import { generateReportPdf } from "@/lib/data/actions/generate-report-pdf";
import { GenerateReportModal } from "@/components/reports/generate-report-modal";
import type { Report, Company } from "@/lib/types";

// --- types -------------------------------------------------------------------

export interface ReportStats {
  totalReports: number;
  avgIncidentsPerMonth: number;
  avgResponseMinutes: number;
  resolutionRate: number;
}

export interface MonthlyDataPoint {
  label: string;
  value: number;
}

export interface IncidentTypeEntry {
  name: string;
  count: number;
  pct: number;
}

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
  reportStats: ReportStats;
  monthlyData: MonthlyDataPoint[];
  incidentTypes: IncidentTypeEntry[];
  companies: Company[];
}

const PAGE_SIZE = 25;

export function ReportsClient({ reports, reportStats, monthlyData, incidentTypes, companies }: ReportsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [range, setRange] = useState<{ start: string; end: string }>({ start: "", end: "" });

  // Client-side filter of the reports list by report date.
  const filteredReports = reports.filter((r) => {
    const d = r.date.slice(0, 10);
    if (range.start && d < range.start) return false;
    if (range.end && d > range.end) return false;
    return true;
  });

  function handleDownload(report: Report) {
    setDownloadingId(report.id);
    startTransition(async () => {
      try {
        const dataUri = await generateReportPdf({ reportId: report.id });
        const link = document.createElement('a');
        link.href = dataUri;
        link.download = `${report.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
        link.click();
      } catch (err) {
        console.error('PDF generation failed:', err);
      } finally {
        setDownloadingId(null);
      }
    });
  }

  const paginatedReports = filteredReports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const reportRows = paginatedReports.map((report: Report) => [
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
    <Button
      key="dl"
      variant="ghost"
      size="sm"
      icon={Download}
      onClick={() => handleDownload(report)}
      disabled={downloadingId === report.id}
    >
      {downloadingId === report.id ? '…' : ''}
    </Button>,
  ]);

  return (
    <div className="px-4 sm:px-9 py-6 sm:py-8 flex flex-col gap-6">

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
              onClick={() => setRangeOpen((o) => !o)}
            >
              Date range
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Download}
              onClick={() => setGenerateOpen(true)}
            >
              Generate new report
            </Button>
          </>
        }
      />

      {/* Date-range filter for the reports list */}
      {rangeOpen && (
        <Card>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-2 font-sans">From</span>
              <input
                type="date"
                value={range.start}
                max={range.end || undefined}
                onChange={(e) => { setRange((r) => ({ ...r, start: e.target.value })); setPage(1); }}
                className="px-3 py-2 text-sm font-sans bg-surface text-ink border border-border rounded-lg outline-none focus:border-p-blue"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-2 font-sans">To</span>
              <input
                type="date"
                value={range.end}
                min={range.start || undefined}
                onChange={(e) => { setRange((r) => ({ ...r, end: e.target.value })); setPage(1); }}
                className="px-3 py-2 text-sm font-sans bg-surface text-ink border border-border rounded-lg outline-none focus:border-p-blue"
              />
            </div>
            {(range.start || range.end) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setRange({ start: "", end: "" }); setPage(1); }}
              >
                Clear
              </Button>
            )}
            <span className="text-xs text-ink-3 font-sans ml-auto">
              Showing {filteredReports.length} of {reports.length} reports
            </span>
          </div>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Reports generated"
          value={String(reportStats.totalReports)}
          icon={FileText}
          supporting={
            <Pill tone="blue" size="sm">{reportStats.totalReports} total</Pill>
          }
        />
        <StatCard
          label="Avg incidents / month"
          value={String(reportStats.avgIncidentsPerMonth)}
          icon={AlertTriangle}
          supporting={
            <Pill tone="blue" size="sm">across all months</Pill>
          }
        />
        <StatCard
          label="Avg response time"
          value={reportStats.avgResponseMinutes > 0 ? `${reportStats.avgResponseMinutes}m` : '—'}
          icon={Clock}
          supporting={
            <Pill tone="blue" size="sm">from resolved incidents</Pill>
          }
        />
        <StatCard
          label="Resolution rate"
          value={`${reportStats.resolutionRate}%`}
          icon={CheckCircle2}
          supporting={
            <Pill tone="green" size="sm">resolved + closed</Pill>
          }
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">

        {/* Left: Incidents over time */}
        <Card padding="p-0">
          <div className="px-6 pt-5 pb-0">
            <SectionHeader title="Incidents over time" sub="Last 6 months · all companies" />
          </div>
          <div className="px-6 py-6">
            <SimpleBarChart data={monthlyData} />
          </div>
        </Card>

        {/* Right: Top incident types */}
        <Card padding="p-0">
          <div className="px-6 pt-5 pb-0">
            <SectionHeader title="Top incident types" sub="Apr 2026" />
          </div>
          <div className="px-[22px] py-[22px]">
            <HorizontalBarList data={incidentTypes} />
          </div>
        </Card>
      </div>

      {/* Recent reports table */}
      <Card padding="p-0">
        <div className="px-5 py-4 border-b border-border">
          <SectionHeader title="Recent reports" sub="All companies - sorted by date" />
        </div>

        <DataTable
          columns={["Report", "Scope", "Type", "Incidents", "Date", "Size", ""]}
          rows={reportRows}
          pagination={{ page, pageSize: PAGE_SIZE, total: filteredReports.length, onPageChange: setPage }}
        />
      </Card>

      <GenerateReportModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        companies={companies}
      />
    </div>
  );
}
