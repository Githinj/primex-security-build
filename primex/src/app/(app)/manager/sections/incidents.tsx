"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Filter, Eye, Pencil, X } from "lucide-react";
import {
  PageTitle,
  Card,
  DataTable,
  Button,
  Pill,
  ActionMenu,
} from "@/components/ui";
import { updateIncidentStatus } from "@/lib/data/actions/incidents";
import { severityTone, incidentTone } from "@/lib/utils";
import type { Incident, Site, Profile } from "@/lib/types";

interface CompanyIncidentsProps {
  incidents: Incident[];
  sites: Site[];
  teamMembers: Profile[];
}

const PAGE_SIZE = 25;

export function CompanyIncidents({
  incidents,
  sites,
  teamMembers,
}: CompanyIncidentsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState(1);
  const guards = teamMembers.filter((m) => m.role === "guard");

  const paginatedIncidents = incidents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const rows = paginatedIncidents.map((incident) => {
    const site = sites.find((s) => s.id === incident.site_id);
    const guard = incident.guard_id
      ? guards.find((g) => g.id === incident.guard_id)
      : null;

    return [
      <span key="title" className="font-medium text-ink font-sans">
        {incident.title}
      </span>,
      <span key="site" className="text-ink-2 font-sans">
        {site?.name ?? "\u2014"}
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
      <span
        key="started"
        className="text-ink-3 tabular-nums font-sans text-sm"
      >
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
          { label: "Edit", icon: Pencil, onClick: () => router.push(`/incidents/${incident.id}`) },
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
    <div className="flex flex-col gap-6 font-sans">
      <PageTitle
        title="Incidents"
        sub="Open, dispatched, in progress, resolved, and closed incidents for your company."
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
          pagination={{ page, pageSize: PAGE_SIZE, total: incidents.length, onPageChange: setPage }}
        />
      </Card>
    </div>
  );
}
