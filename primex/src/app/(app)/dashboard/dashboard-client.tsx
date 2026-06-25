"use client";

import {
  Briefcase,
  MapPin,
  Camera,
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  Filter,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Wifi,
  WifiOff,
  Wrench,
} from "lucide-react";

import {
  PageTitle,
  StatCard,
  Card,
  Pill,
  DataTable,
  Button,
  LiveDot,
  PhaseTag,
} from "@/components/ui";

import type { DashboardStats } from "@/lib/data/dashboard";
import type { Incident, Site, Profile, Company } from "@/lib/types";
import { severityTone, incidentTone } from "@/lib/utils";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

// ─── props ──────────────────────────────────────────────────────────────────

interface DashboardClientProps {
  stats: DashboardStats;
  incidents: Incident[];
  sites: Site[];
  guards: Profile[];
  companies: Company[];
}

// ─── component ──────────────────────────────────────────────────────────────

export function DashboardClient({
  stats,
  incidents,
  sites,
  guards,
  companies,
}: DashboardClientProps) {
  // Camera status counts per company
  const companyCameraStats = companies.map((company) => {
    return {
      company,
      // NOTE: We don't have per-company camera counts from the server yet,
      // so we show company-level info only. Stats come from the dashboard stats.
      status: company.status,
    };
  });

  // Incident table rows (first 4 incidents)
  const incidentRows = incidents.slice(0, 4).map((incident) => {
    const site = sites.find((s) => s.id === incident.site_id);
    const guard = incident.guard_id
      ? guards.find((g) => g.id === incident.guard_id)
      : null;

    return [
      // Incident title
      <span key="title" className="font-medium text-ink text-[13px] leading-snug max-w-[200px] block">
        {incident.title}
      </span>,
      // Site
      <span key="site" className="text-ink-3 text-[13px]">
        {site?.name ?? "—"}
      </span>,
      // Severity
      <Pill key="sev" tone={severityTone(incident.severity)} dot size="sm">
        {incident.severity}
      </Pill>,
      // Status
      <Pill key="status" tone={incidentTone(incident.status)} dot size="sm">
        {incident.status}
      </Pill>,
      // Guard
      <span key="guard" className="text-ink-4 text-[13px]">
        {guard ? guard.full_name : "Unassigned"}
      </span>,
      // Started
      <span key="started" className="text-ink-3 text-[13px] whitespace-nowrap">
        {formatTime(incident.started_at)}
      </span>,
      // Actions
      <Button key="action" variant="ghost" size="sm" icon={ArrowUpRight} />,
    ];
  });

  const totalCameras = stats.camerasOnline + stats.camerasOffline;

  return (
    <div className="px-9 py-8 flex flex-col gap-6">

      {/* Page header */}
      <PageTitle
        title="Operational overview"
        sub="A live view across every company, site, and camera on Primex."
        actions={
          <>
            <Button variant="secondary" size="sm" icon={Filter}>
              Last 24 hours
            </Button>
            <Button variant="primary" size="sm" icon={Plus}>
              New company
            </Button>
          </>
        }
      />

      {/* ── Stat cards row 1 ── */}
      <div className="grid grid-cols-4 gap-3.5">
        <StatCard
          label="Companies"
          value={String(stats.totalCompanies)}
          icon={Briefcase}
          supporting={
            <>
              <Pill tone="green" dot size="sm">{stats.totalCompanies} total</Pill>
            </>
          }
        />
        <StatCard
          label="Active sites"
          value={String(stats.totalSites)}
          icon={MapPin}
          supporting={
            <>
              <Pill tone="green" dot size="sm">{stats.totalSites} total</Pill>
            </>
          }
        />
        <StatCard
          label="Cameras online"
          value={`${stats.camerasOnline}/${totalCameras}`}
          icon={Camera}
          supporting={
            <>
              <Pill tone="green" dot size="sm">{stats.camerasOnline} online</Pill>
              <Pill tone="red" dot size="sm">{stats.camerasOffline} offline</Pill>
            </>
          }
        />
        <StatCard
          label="Open alerts"
          value={String(stats.openAlerts)}
          icon={Bell}
          accent="text-p-red"
          supporting={
            <>
              <Pill tone="red" dot size="sm">{stats.openAlerts} open</Pill>
            </>
          }
        />
      </div>

      {/* ── Stat cards row 2 ── */}
      <div className="grid grid-cols-4 gap-3.5 mb-8">
        <StatCard
          label="Active incidents"
          value={String(stats.activeIncidents)}
          icon={AlertTriangle}
          supporting={
            <>
              <Pill tone="amber" dot size="sm">{stats.activeIncidents} active</Pill>
            </>
          }
        />
        <StatCard
          label="Avg response"
          value="9m"
          icon={Clock}
          supporting={
            <Pill tone="green" dot size="sm">↓ 2m vs avg</Pill>
          }
        />
        <StatCard
          label="Resolved today"
          value={String(stats.resolvedToday)}
          icon={CheckCircle2}
          supporting={
            <Pill tone="green" dot size="sm">{stats.resolvedToday} closed</Pill>
          }
        />
        <StatCard
          label="Guards on duty"
          value={String(stats.guardsOnDuty)}
          icon={Users}
          supporting={
            <>
              <Pill tone="green" dot size="sm">{stats.guardsOnDuty} on duty</Pill>
            </>
          }
        />
      </div>

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-[1fr_340px] gap-5">

        {/* Left: Recent active incidents */}
        <Card padding="p-0">
          {/* Card header */}
          <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border">
            <div className="flex flex-col gap-0.5">
              <h2 className="font-serif text-xl font-semibold text-ink">
                Recent active incidents
              </h2>
              <p className="text-ink-3 text-xs font-sans">Live · all companies</p>
            </div>
            <Button variant="link" size="sm" icon={ArrowRight}>
              View all
            </Button>
          </div>

          {/* Table */}
          <DataTable
            columns={["Incident", "Site", "Severity", "Status", "Guard", "Started", ""]}
            rows={incidentRows}
          />
        </Card>

        {/* Right: Critical alerts feed */}
        <Card padding="p-0">
          {/* Card header */}
          <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-xl font-semibold text-ink">
                  Critical alerts
                </h2>
                <LiveDot color="red" />
              </div>
              <p className="text-ink-3 text-xs font-sans">Need review now</p>
            </div>
          </div>

          {/* Alert feed */}
          <div className="flex flex-col divide-y divide-border">
            {stats.recentAlerts.length === 0 ? (
              <p className="px-5 py-6 text-sm text-ink-3 font-sans">No critical alerts.</p>
            ) : (
              stats.recentAlerts
                .filter((a) => a.severity === "Critical" && a.status !== "Closed")
                .map((alert) => {
                  const site = sites.find((s) => s.id === alert.site_id);
                  return (
                    <div key={alert.id} className="flex items-stretch gap-0">
                      {/* Left red accent bar */}
                      <div className="w-1 bg-p-red flex-shrink-0 rounded-l-sm" />
                      {/* Content */}
                      <div className="flex flex-col gap-2 px-4 py-3.5 flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-ink font-sans leading-snug">
                          {alert.title}
                        </p>
                        <p className="text-[11px] text-ink-3 font-sans">
                          {site?.name ?? "Unknown site"} · {formatRelative(alert.created_at)}
                        </p>
                        <div className="flex items-center gap-2">
                          <Pill tone={severityTone(alert.severity)} dot size="sm">
                            {alert.severity}
                          </Pill>
                          <Pill tone="gray" dot size="sm">
                            {alert.status}
                          </Pill>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* Footer link */}
          <div className="px-5 py-3.5 border-t border-border">
            <Button variant="link" size="sm" icon={ArrowUpRight}>
              Open dispatcher console
            </Button>
          </div>
        </Card>
      </div>

      {/* ── Camera status by company ── */}
      <Card padding="p-0" className="mt-5">
        {/* Card header */}
        <div className="px-5 py-4 border-b border-border flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h2 className="font-serif text-xl font-semibold text-ink">
              Camera status by company
            </h2>
            <PhaseTag>Live streaming · Phase 2</PhaseTag>
          </div>
          <p className="text-ink-3 text-xs font-sans">
            Phase 1 — status monitoring only
          </p>
        </div>

        {/* Company columns */}
        <div className="grid grid-cols-4 divide-x divide-border">
          {companyCameraStats.map(({ company, status }) => {
            const statusTone =
              status === "Active"
                ? "green"
                : status === "Pending"
                ? "amber"
                : "red";

            return (
              <div key={company.id} className="flex flex-col gap-4 px-5 py-5">
                {/* Company name + meta */}
                <div className="flex flex-col gap-1.5">
                  <p className="text-[13px] font-semibold text-ink font-sans leading-snug">
                    {company.name}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-ink-3 font-sans">{company.type}</span>
                    <Pill tone={statusTone as "green" | "amber" | "red"} dot size="sm">
                      {status}
                    </Pill>
                  </div>
                </div>

                {/* Camera counts - overall stats */}
                <div className="flex flex-col gap-2.5">
                  {/* Online */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-ink-3 font-sans">
                      <Wifi size={12} className="text-p-green" strokeWidth={2} />
                      Online
                    </div>
                    <span className="font-serif text-xl font-semibold text-p-green leading-none">
                      {stats.camerasOnline}
                    </span>
                  </div>

                  {/* Offline */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-ink-3 font-sans">
                      <WifiOff size={12} className="text-p-red" strokeWidth={2} />
                      Offline
                    </div>
                    <span className="font-serif text-xl font-semibold text-p-red leading-none">
                      {stats.camerasOffline}
                    </span>
                  </div>

                  {/* Maintenance */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-ink-3 font-sans">
                      <Wrench size={12} className="text-p-amber" strokeWidth={2} />
                      Maintenance
                    </div>
                    <span className="font-serif text-xl font-semibold text-p-amber leading-none">
                      0
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
