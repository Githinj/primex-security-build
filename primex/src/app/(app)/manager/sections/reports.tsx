"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  Download,
  Plus,
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
import { generateReportPdf } from "@/lib/data/actions/generate-report-pdf";
import { GenerateReportModal } from "@/components/reports/generate-report-modal";
import type { Report, Incident, Company } from "@/lib/types";

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

interface CompanyReportsProps {
  company: Company;
  reports: Report[];
  incidents: Incident[];
}

const PAGE_SIZE = 25;

export function CompanyReports({ company, reports, incidents }: CompanyReportsProps) {
  const [isPending, startTransition] = useTransition();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [generateOpen, setGenerateOpen] = useState(false);

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

  // Compute real stats
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const incidentsThisMonth = incidents.filter(
    (i) => new Date(i.started_at) >= startOfMonth
  ).length;

  const resolvedIncidents = incidents.filter((i) =>
    ["Resolved", "Closed"].includes(i.status)
  );

  let avgResponseMin = 0;
  if (resolvedIncidents.length > 0) {
    const totalMin = resolvedIncidents.reduce((sum, i) => {
      const start = new Date(i.started_at).getTime();
      const end = new Date((i as unknown as Record<string, string>).updated_at ?? i.started_at).getTime();
      return sum + Math.max(0, (end - start) / 60_000);
    }, 0);
    avgResponseMin = Math.round(totalMin / resolvedIncidents.length);
  }

  const resolutionRate = incidents.length > 0
    ? Math.round((resolvedIncidents.length / incidents.length) * 100)
    : 0;

  const paginatedReports = reports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const reportRows = paginatedReports.map((report) => [
    <span key="name" className="flex items-center gap-2.5">
      <span className="w-7 h-7 rounded-lg bg-p-blue-soft flex items-center justify-center flex-shrink-0">
        <FileText size={13} className="text-p-blue" strokeWidth={2} />
      </span>
      <span className="font-medium text-ink text-[13px] leading-snug max-w-[220px] block">
        {report.name}
      </span>
    </span>,
    <Pill key="type" tone={reportTypeTone(report.type)} size="sm">
      {report.type}
    </Pill>,
    <span key="incidents" className="text-ink-2 text-[13px] font-medium">
      {report.incident_count}
    </span>,
    <span key="date" className="text-ink-3 text-[13px] whitespace-nowrap">
      {formatDate(report.date)}
    </span>,
    <span key="size" className="text-ink-4 text-[13px]">
      {report.size}
    </span>,
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
    <div className="flex flex-col gap-6 font-sans">
      <PageTitle
        title="Reports"
        sub="Monthly summaries, response-time analytics, and site-level reports."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setGenerateOpen(true)}>
            Generate report
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <StatCard
          label="Incidents this month"
          value={incidentsThisMonth}
          icon={AlertTriangle}
        />
        <StatCard
          label="Avg response"
          value={avgResponseMin > 0 ? `${avgResponseMin}m` : "\u2014"}
          icon={Clock}
          supporting={
            resolvedIncidents.length > 0 ? (
              <Pill tone="blue" size="sm">
                from {resolvedIncidents.length} resolved
              </Pill>
            ) : null
          }
        />
        <StatCard
          label="Resolution rate"
          value={incidents.length > 0 ? `${resolutionRate}%` : "\u2014"}
          icon={CheckCircle2}
          supporting={
            resolutionRate >= 80 ? (
              <Pill tone="green" size="sm">On track</Pill>
            ) : resolutionRate > 0 ? (
              <Pill tone="amber" size="sm">Needs improvement</Pill>
            ) : null
          }
        />
      </div>

      {/* Reports table */}
      <Card padding="p-0">
        <div className="px-5 py-4 border-b border-border">
          <SectionHeader title="Recent reports" sub="Sorted by date" />
        </div>
        <DataTable
          columns={["Report", "Type", "Incidents", "Date", "Size", ""]}
          rows={reportRows}
          pagination={{ page, pageSize: PAGE_SIZE, total: reports.length, onPageChange: setPage }}
        />
      </Card>

      <GenerateReportModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        lockedCompany={company}
      />
    </div>
  );
}
