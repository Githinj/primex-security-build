"use client";

import {
  MapPin,
  Camera,
  Bell,
  AlertTriangle,
  ArrowDown,
} from "lucide-react";
import { PageTitle, StatCard, Card, Pill, DataTable } from "@/components/ui";
import { severityTone, incidentTone } from "@/lib/utils";
import type { Company, Site, Camera as CameraType, Alert, Incident } from "@/lib/types";

interface CompanyDashboardProps {
  company: Company;
  sites: Site[];
  cameras: CameraType[];
  alerts: Alert[];
  incidents: Incident[];
}

export function CompanyDashboard({
  company,
  sites,
  cameras,
  alerts,
  incidents,
}: CompanyDashboardProps) {
  const activeSites = sites.filter((s) => s.status === "Active").length;
  const camerasOnline = cameras.filter((c) => c.status === "Online").length;
  const openAlerts = alerts.filter((a) =>
    ["New", "Reviewing", "Escalated"].includes(a.status)
  ).length;
  const activeIncidents = incidents.filter((i) =>
    ["Open", "In Progress", "Dispatched"].includes(i.status)
  ).length;

  // Recent incidents — last 5
  const recentIncidents = incidents.slice(0, 5);

  const incidentRows = recentIncidents.map((incident) => {
    const site = sites.find((s) => s.id === incident.site_id);
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
    ];
  });

  return (
    <div className="flex flex-col gap-6 font-sans">
      <PageTitle
        title={`${company.name} \u2014 at a glance`}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Active sites"
          value={activeSites}
          icon={MapPin}
          supporting={
            <span className="text-xs text-ink-3">
              {sites.length} total
            </span>
          }
        />
        <StatCard
          label="Cameras online"
          value={`${camerasOnline}/${cameras.length}`}
          icon={Camera}
          supporting={
            cameras.length > 0 ? (
              <Pill tone="green" size="sm">
                {Math.round((camerasOnline / cameras.length) * 100)}% uptime
              </Pill>
            ) : null
          }
        />
        <StatCard
          label="Open alerts"
          value={openAlerts}
          icon={Bell}
          supporting={
            openAlerts > 0 ? (
              <Pill tone="amber" size="sm">Needs attention</Pill>
            ) : (
              <Pill tone="green" size="sm">All clear</Pill>
            )
          }
        />
        <StatCard
          label="Active incidents"
          value={activeIncidents}
          icon={AlertTriangle}
          supporting={
            activeIncidents > 0 ? (
              <Pill tone="red" size="sm">{activeIncidents} in progress</Pill>
            ) : (
              <Pill tone="green" size="sm">None active</Pill>
            )
          }
        />
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5">
        {/* Recent incidents */}
        <Card padding="p-0">
          <div className="flex flex-col gap-0.5 px-6 pt-5 pb-0">
            <h2 className="font-serif text-[20px] font-bold text-ink">
              Recent incidents
            </h2>
            <p className="text-[12.5px] text-ink-3">
              Last {recentIncidents.length} incidents for {company.name}
            </p>
          </div>
          <div className="pt-2">
            <DataTable
              columns={["Incident", "Site", "Severity", "Status", "Started"]}
              rows={incidentRows}
            />
          </div>
        </Card>

        {/* Response time card */}
        <Card>
          <div className="flex flex-col gap-1 mb-6">
            <h2 className="font-serif text-[20px] font-bold text-ink">
              Avg response time
            </h2>
            <p className="text-[12.5px] text-ink-3">This month</p>
          </div>

          <div className="flex items-baseline gap-3 mb-6">
            <span className="font-serif text-[48px] font-semibold text-ink leading-none">
              8m
            </span>
            <span className="inline-flex items-center gap-1 text-p-green font-semibold text-sm">
              <ArrowDown size={14} strokeWidth={2.5} />
              3m
            </span>
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-3">Fastest</span>
              <span className="text-sm font-semibold text-ink">2m</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-3">Slowest</span>
              <span className="text-sm font-semibold text-ink">18m</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-3">Target SLA</span>
              <span className="text-sm font-semibold text-ink">10m</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-3">SLA compliance</span>
              <span className="text-sm font-semibold text-p-green">94%</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
