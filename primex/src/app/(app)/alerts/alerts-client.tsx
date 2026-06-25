"use client";

import { useState } from "react";
import { Filter, Bell, ExternalLink, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  PageTitle,
  Card,
  DataTable,
  Pill,
  PhaseTag,
  Button,
  ActionMenu,
} from "@/components/ui";
import { CreateAlertModal } from "@/components/alerts/create-alert-modal";
import { severityTone } from "@/lib/utils";
import type { Alert, Site } from "@/lib/types";

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

interface AlertsClientProps {
  alerts: Alert[];
  sites: Site[];
}

export function AlertsClient({ alerts, sites }: AlertsClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  const rows = alerts.map((alert) => {
    const site = sites.find((s) => s.id === alert.site_id);
    const isAI = alert.source.includes("AI");

    return [
      // Alert title
      <span key="title" className="font-medium text-ink">
        {alert.title}
      </span>,

      // Site
      <span key="site" className="text-ink-2">
        {site?.name ?? "—"}
      </span>,

      // Severity
      <Pill key="severity" tone={severityTone(alert.severity)}>
        {alert.severity}
      </Pill>,

      // Status
      <Pill key="status" tone="gray">
        {alert.status}
      </Pill>,

      // Source
      <span key="source" className="inline-flex items-center gap-1.5 text-ink-2">
        {alert.source}
        {isAI && <PhaseTag>AI</PhaseTag>}
      </span>,

      // Time
      <span
        key="time"
        className="text-ink-3 tabular-nums whitespace-nowrap text-xs"
      >
        {formatTime(alert.created_at)}
      </span>,

      // Actions
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
            onClick: () => {},
          },
          { divider: true, label: "" },
          {
            label: "Close alert",
            icon: XCircle,
            tone: "danger",
            onClick: () => {},
          },
        ]}
      />,
    ];
  });

  return (
    <>
      <div className="px-9 py-8 flex flex-col gap-6">
        <PageTitle
          title="Alerts"
          sub="Every signal across all companies. Manual creation only in Phase 1 — each alert automatically opens a linked incident."
          actions={
            <>
              <Button variant="secondary" icon={Filter}>
                Filter
              </Button>
              <Button variant="primary" onClick={() => setModalOpen(true)}>
                Create alert
              </Button>
            </>
          }
        />

        <Card padding="p-0">
          <DataTable
            columns={[
              "Alert",
              "Site",
              "Severity",
              "Status",
              "Source",
              "Time",
              "",
            ]}
            rows={rows}
          />
        </Card>
      </div>

      <CreateAlertModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mode="admin"
      />
    </>
  );
}
