"use client";

import { useTransition, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Eye, X } from "lucide-react";
import {
  PageTitle,
  Card,
  DataTable,
  Pill,
  ActionMenu,
  FilterPills,
} from "@/components/ui";
import { severityTone, incidentTone } from "@/lib/utils";
import { updateIncidentStatus } from "@/lib/data/actions/incidents";
import type { Incident, Site, Profile } from "@/lib/types";

const STATUS_OPTIONS = ["All", "Open", "Dispatched", "In Progress", "Resolved", "Closed"] as const;

interface IncidentsClientProps {
  incidents: Incident[];
  total: number;
  page: number;
  pageSize: number;
  status: string;
  sites: Site[];
  guards: Profile[];
}

export function IncidentsClient({ incidents, total, page, pageSize, status, sites, guards }: IncidentsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "All") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete("page");
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

  const rows = incidents.map((incident) => {
    const site = sites.find((s) => s.id === incident.site_id);
    const guard = incident.guard_id ? guards.find((g) => g.id === incident.guard_id) : null;

    return [
      <span key="title" className="font-medium text-ink font-sans">{incident.title}</span>,
      <span key="site" className="text-ink-2 font-sans">{site?.name ?? "—"}</span>,
      <Pill key="severity" tone={severityTone(incident.severity)} dot>{incident.severity}</Pill>,
      <Pill key="status" tone={incidentTone(incident.status)}>{incident.status}</Pill>,
      guard
        ? <span key="guard" className="text-ink-2 font-sans">{guard.full_name}</span>
        : <span key="guard" className="text-ink-4 font-sans">Unassigned</span>,
      <span key="started" className="text-ink-3 tabular-nums font-sans text-sm">
        {new Date(incident.started_at).toLocaleString("en-AU", {
          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
        })}
      </span>,
      <ActionMenu
        key="actions"
        actions={[
          { label: "View", icon: Eye, onClick: () => router.push(`/incidents/${incident.id}`) },
          { divider: true, label: "" },
          {
            label: "Close", icon: X, tone: "danger",
            onClick: () => startTransition(async () => {
              try {
                await updateIncidentStatus(incident.id, "Closed");
                router.refresh();
              } catch (err) { console.error(err); }
            }),
          },
        ]}
      />,
    ];
  });

  return (
    <div className="px-4 sm:px-9 py-6 sm:py-8 flex flex-col gap-6">
      <PageTitle
        title="Incidents"
        sub="Open → Dispatched → In Progress → Resolved → Closed. Full audit trail per incident."
      />

      <FilterPills
        label="Status"
        options={[...STATUS_OPTIONS]}
        value={status as typeof STATUS_OPTIONS[number]}
        onChange={(v) => updateFilter("status", v)}
      />

      <Card padding="p-0">
        <DataTable
          columns={["Incident", "Site", "Severity", "Status", "Guard", "Started", ""]}
          rows={rows}
          pagination={{ page, pageSize, total, onPageChange: setPage }}
        />
      </Card>
    </div>
  );
}
