"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
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
import { generateReportPdf } from "@/lib/data/actions/generate-report-pdf";
import type { Report, Incident } from "@/lib/types";

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
  reports: Report[];
  incidents: Incident[];
}

export function CompanyReports({ reports, incidents }: CompanyReportsProps) {
  const [isPending, startTransition] = useTransition();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

  // Compute stats
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const incidentsThisMonth = incidents.filter(
    (i) => new Date(i.started_at) >= startOfMonth
  ).length;

  const reportRows = reports.map((report) => [
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
      />

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3.5">
        <StatCard
          label="Incidents this month"
          value={incidentsThisMonth}
          icon={AlertTriangle}
        />
        <StatCard
          label="Avg response"
          value="8m"
          icon={Clock}
          supporting={
            <Pill tone="green" size="sm">
              &#8595; 2m vs avg
            </Pill>
          }
        />
        <StatCard
          label="Resolution rate"
          value="96%"
          icon={CheckCircle2}
          supporting={
            <Pill tone="green" size="sm">
              +3% vs avg
            </Pill>
          }
        />
      </div>

      {/* Reports table */}
      <Card padding="p-0">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-serif text-xl font-semibold text-ink">
              Recent reports
            </h2>
            <p className="text-ink-3 text-xs font-sans">
              Sorted by date
            </p>
          </div>
        </div>
        <DataTable
          columns={["Report", "Type", "Incidents", "Date", "Size", ""]}
          rows={reportRows}
        />
      </Card>
    </div>
  );
}
