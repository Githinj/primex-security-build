"use client";

import { Filter, Eye, Pencil, X } from "lucide-react";

import {
  PageTitle,
  Card,
  DataTable,
  Button,
  Pill,
  ActionMenu,
} from "@/components/ui";
import { severityTone, incidentTone } from "@/lib/utils";
import type { Incident, Site, Profile } from "@/lib/types";

interface IncidentsClientProps {
  incidents: Incident[];
  sites: Site[];
  guards: Profile[];
}

export function IncidentsClient({ incidents, sites, guards }: IncidentsClientProps) {
  const rows = incidents.map((incident) => {
    const site = sites.find((s) => s.id === incident.site_id);
    const guard = incident.guard_id
      ? guards.find((g) => g.id === incident.guard_id)
      : null;

    return [
      // Incident title
      <span key="title" className="font-medium text-ink font-sans">
        {incident.title}
      </span>,

      // Site
      <span key="site" className="text-ink-2 font-sans">
        {site?.name ?? "—"}
      </span>,

      // Severity
      <Pill key="severity" tone={severityTone(incident.severity)} dot>
        {incident.severity}
      </Pill>,

      // Status
      <Pill key="status" tone={incidentTone(incident.status)}>
        {incident.status}
      </Pill>,

      // Guard
      guard ? (
        <span key="guard" className="text-ink-2 font-sans">
          {guard.full_name}
        </span>
      ) : (
        <span key="guard" className="text-ink-4 font-sans">
          Unassigned
        </span>
      ),

      // Started
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

      // Actions
      <ActionMenu
        key="actions"
        actions={[
          {
            label: "View",
            icon: Eye,
            onClick: () => {},
          },
          {
            label: "Edit",
            icon: Pencil,
            onClick: () => {},
          },
          { divider: true, label: "" },
          {
            label: "Close",
            icon: X,
            tone: "danger",
            onClick: () => {},
          },
        ]}
      />,
    ];
  });

  return (
    <div className="flex flex-col gap-6">
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
          columns={[
            "Incident",
            "Site",
            "Severity",
            "Status",
            "Guard",
            "Started",
            "",
          ]}
          rows={rows}
        />
      </Card>
    </div>
  );
}
