"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Filter, Eye, X } from "lucide-react";
import {
  PageTitle,
  Card,
  DataTable,
  Button,
  Pill,
  ActionMenu,
} from "@/components/ui";
import { usePagination } from "@/lib/hooks/use-pagination";
import { severityTone, incidentTone } from "@/lib/utils";
import { updateIncidentStatus } from "@/lib/data/actions/incidents";
import type { Incident, Site, Profile } from "@/lib/types";

interface IncidentsClientProps {
  incidents: Incident[];
  total: number;
  page: number;
  pageSize: number;
  sites: Site[];
  guards: Profile[];
}

export function IncidentsClient({ incidents, total, page, pageSize, sites, guards }: IncidentsClientProps) {
  const router = useRouter();
  const { setPage } = usePagination({ defaultPageSize: pageSize });
  const [isPending, startTransition] = useTransition();

  const rows = incidents.map((incident) => {
    const site = sites.find((s) => s.id === incident.site_id);
    const guard = incident.guard_id
      ? guards.find((g) => g.id === incident.guard_id)
      : null;

    return [
      <span key="title" className="font-medium text-ink font-sans">
        {incident.title}
      </span>,
      <span key="site" className="text-ink-2 font-sans">
        {site?.name ?? "—"}
      </span>,
      <Pill key="severity" tone={severityTone(incident.severity)} dot>
        {incident.severity}
      </Pill>,
      <Pill key="status" tone={incidentTone(incident.status)}>
        {incident.status}
      </Pill>,
      guard ? (
        <span key="guard" className="text-ink-2 font-sans">
          {guard.full_name}
        </span>
      ) : (
        <span key="guard" className="text-ink-4 font-sans">
          Unassigned
        </span>
      ),
      <span key="started" className="text-ink-3 tabular-nums font-sans text-sm">
        {new Date(incident.started_at).toLocaleString("en-AU", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}
      </span>,
      <ActionMenu
        key="actions"
        actions={[
          { label: "View", icon: Eye, onClick: () => router.push(`/incidents/${incident.id}`) },
          { divider: true, label: "" },
          {
            label: "Close",
            icon: X,
            tone: "danger",
            onClick: () => startTransition(async () => {
              try {
                await updateIncidentStatus(incident.id, 'Closed');
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
    <div className="px-4 sm:px-9 py-6 sm:py-8 flex flex-col gap-6">
      <PageTitle
        title="Incidents"
        sub="Open → Dispatched → In Progress → Resolved → Closed. Full audit trail per incident."
        actions={
          <Button variant="secondary" size="sm" icon={Filter}>
            Status
          </Button>
        }
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
