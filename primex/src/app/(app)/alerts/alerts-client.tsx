"use client";

import { useState, useTransition } from "react";
import { Filter, Bell, ExternalLink, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateAlertStatus } from "@/lib/data/actions/alerts";
import {
  PageTitle,
  Card,
  DataTable,
  Pill,
  Button,
  ActionMenu,
} from "@/components/ui";
import { CreateAlertModal } from "@/components/alerts/create-alert-modal";
import { usePagination } from "@/lib/hooks/use-pagination";
import { severityTone } from "@/lib/utils";
import type { Alert, Site, Company, Camera } from "@/lib/types";

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
  total: number;
  page: number;
  pageSize: number;
  sites: Site[];
  companies: Company[];
  cameras: Camera[];
}

export function AlertsClient({ alerts, total, page, pageSize, sites, companies, cameras }: AlertsClientProps) {
  const router = useRouter();
  const { setPage } = usePagination({ defaultPageSize: pageSize });
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const rows = alerts.map((alert) => {
    const site = sites.find((s) => s.id === alert.site_id);
    const isAI = alert.source.includes("AI");

    return [
      <span key="title" className="font-medium text-ink">
        {alert.title}
      </span>,
      <span key="site" className="text-ink-2">
        {site?.name ?? "—"}
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
      <span key="time" className="text-ink-3 tabular-nums whitespace-nowrap text-xs">
        {formatTime(alert.created_at)}
      </span>,
      <ActionMenu
        key="actions"
        actions={[
          { label: "View alert", icon: Bell, onClick: () => router.push(`/alerts/${alert.id}`) },
          { label: "Open incident", icon: ExternalLink, onClick: () => router.push(`/incidents`) },
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
      <div className="px-4 sm:px-9 py-6 sm:py-8 flex flex-col gap-6">
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
            columns={["Alert", "Site", "Severity", "Status", "Source", "Time", ""]}
            rows={rows}
            pagination={{ page, pageSize, total, onPageChange: setPage }}
          />
        </Card>
      </div>

      <CreateAlertModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mode="admin"
        companies={companies}
        sites={sites}
        cameras={cameras}
      />
    </>
  );
}
