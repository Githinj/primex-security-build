"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, ExternalLink, XCircle } from "lucide-react";
import {
  PageTitle,
  Card,
  DataTable,
  Pill,
  Button,
  ActionMenu,
} from "@/components/ui";
import { CreateAlertModal } from "@/components/alerts/create-alert-modal";
import { updateAlertStatus, getIncidentIdForAlert } from "@/lib/data/actions/alerts";
import { severityTone } from "@/lib/utils";
import type { Company, Alert, Site, Camera } from "@/lib/types";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

interface CompanyAlertsProps {
  company: Company;
  alerts: Alert[];
  sites: Site[];
  cameras: Camera[];
}

const PAGE_SIZE = 25;

export function CompanyAlerts({ company, alerts, sites, cameras }: CompanyAlertsProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState(1);

  function openIncident(alertId: string) {
    startTransition(async () => {
      const incidentId = await getIncidentIdForAlert(alertId);
      router.push(incidentId ? `/incidents/${incidentId}` : "/incidents");
    });
  }

  const paginatedAlerts = alerts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const rows = paginatedAlerts.map((alert) => {
    const site = sites.find((s) => s.id === alert.site_id);
    const isAI = alert.source.includes("AI");

    return [
      <span key="title" className="font-medium text-ink">
        {alert.title}
      </span>,
      <span key="site" className="text-ink-2">
        {site?.name ?? "\u2014"}
      </span>,
      <Pill key="severity" tone={severityTone(alert.severity)}>
        {alert.severity}
      </Pill>,
      <Pill key="status" tone="gray">
        {alert.status}
      </Pill>,
      <span key="source" className="inline-flex items-center gap-1.5 text-ink-2">
        {alert.source}
        {isAI && <Pill tone="blue" size="sm">AI</Pill>}
      </span>,
      <span
        key="time"
        className="text-ink-3 tabular-nums whitespace-nowrap text-xs"
      >
        {formatTime(alert.created_at)}
      </span>,
      <ActionMenu
        key="actions"
        actions={[
          {
            label: "View alert",
            icon: Bell,
            onClick: () => router.push(`/alerts/${alert.id}`),
          },
          {
            label: "Open incident",
            icon: ExternalLink,
            onClick: () => openIncident(alert.id),
          },
          { divider: true, label: "" },
          {
            label: "Close alert",
            icon: XCircle,
            tone: "danger",
            onClick: () => startTransition(async () => {
              try {
                await updateAlertStatus(alert.id, 'Closed');
                router.refresh();
              } catch (err) {
                console.error(err);
              }
            }),
          },
        ]}
      />,
    ];
  });

  return (
    <>
      <div className="flex flex-col gap-6 font-sans">
        <PageTitle
          title="Alerts"
          sub={`All alerts for ${company.name}. Manual creation opens a linked incident.`}
          actions={
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              Create alert
            </Button>
          }
        />

        <Card padding="p-0">
          <DataTable
            columns={["Alert", "Site", "Severity", "Status", "Source", "Time", ""]}
            rows={rows}
            pagination={{ page, pageSize: PAGE_SIZE, total: alerts.length, onPageChange: setPage }}
          />
        </Card>
      </div>

      <CreateAlertModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mode="company"
        lockedCompany={company}
        companies={[company]}
        sites={sites}
        cameras={cameras}
      />
    </>
  );
}
