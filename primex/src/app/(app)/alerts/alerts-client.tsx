"use client";

import { useState, useTransition, useCallback } from "react";
import { Bell, ExternalLink, XCircle } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { updateAlertStatus } from "@/lib/data/actions/alerts";
import {
  PageTitle,
  Card,
  DataTable,
  Pill,
  Button,
  ActionMenu,
  FilterPills,
} from "@/components/ui";
import { CreateAlertModal } from "@/components/alerts/create-alert-modal";
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

const SEVERITY_OPTIONS = ["All", "Critical", "Warning", "Info"] as const;
const STATUS_OPTIONS = ["All", "New", "Reviewing", "Escalated", "Closed"] as const;

interface AlertsClientProps {
  alerts: Alert[];
  total: number;
  page: number;
  pageSize: number;
  severity: string;
  status: string;
  sites: Site[];
  companies: Company[];
  cameras: Camera[];
}

export function AlertsClient({
  alerts, total, page, pageSize, severity, status,
  sites, companies, cameras,
}: AlertsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "All") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete("page"); // reset to page 1 on filter change
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
    },
    [router, pathname, searchParams]
  );

  const setPage = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPage <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(newPage));
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
    },
    [router, pathname, searchParams]
  );

  const rows = alerts.map((alert) => {
    const site = sites.find((s) => s.id === alert.site_id);
    const isAI = alert.source.includes("AI");

    return [
      <span key="title" className="font-medium text-ink">{alert.title}</span>,
      <span key="site" className="text-ink-2">{site?.name ?? "—"}</span>,
      <Pill key="severity" tone={severityTone(alert.severity)}>{alert.severity}</Pill>,
      <Pill key="status" tone="gray">{alert.status}</Pill>,
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
                await updateAlertStatus(alert.id, "Closed");
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
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              Create alert
            </Button>
          }
        />

        {/* Filter pills */}
        <div className="flex flex-wrap items-center gap-4">
          <FilterPills
            label="Severity"
            options={[...SEVERITY_OPTIONS]}
            value={severity as typeof SEVERITY_OPTIONS[number]}
            onChange={(v) => updateFilter("severity", v)}
          />
          <FilterPills
            label="Status"
            options={[...STATUS_OPTIONS]}
            value={status as typeof STATUS_OPTIONS[number]}
            onChange={(v) => updateFilter("status", v)}
          />
        </div>

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
