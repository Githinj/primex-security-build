"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  MapPin,
  Camera,
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  ArrowUpRight,
  ArrowRight,
} from "lucide-react";

import {
  PageTitle,
  StatCard,
  Card,
  Pill,
  DataTable,
  Button,
  LiveDot,
  FilterPills,
  SectionHeader,
} from "@/components/ui";

import { useScope } from "@/components/providers/scope-provider";
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
  const router = useRouter();
  const { scopeCompanyId } = useScope();
  const [timeWindow, setTimeWindow] = useState<string>("Last 24h");

  const timeWindowMs: Record<string, number> = {
    "Last 24h": 24 * 60 * 60 * 1000,
    "Last 7d": 7 * 24 * 60 * 60 * 1000,
    "Last 30d": 30 * 24 * 60 * 60 * 1000,
    "All time": Infinity,
  };
  const cutoff = timeWindowMs[timeWindow] === Infinity
    ? 0
    : Date.now() - timeWindowMs[timeWindow];

  // Filter data by selected company scope
  const scopedSites = scopeCompanyId
    ? sites.filter((s) => s.company_id === scopeCompanyId)
    : sites;
  const scopedSiteIds = new Set(scopedSites.map((s) => s.id));
  const scopedIncidents = scopeCompanyId
    ? incidents.filter((i) => scopedSiteIds.has(i.site_id))
    : incidents;
  const scopedCompanies = scopeCompanyId
    ? companies.filter((c) => c.id === scopeCompanyId)
    : companies;
  const scopedCamerasByCompany = scopeCompanyId
    ? stats.camerasByCompany.filter((c) => c.company.id === scopeCompanyId)
    : stats.camerasByCompany;

  // Recompute stats for scoped view
  const scopedStats = scopeCompanyId
    ? {
        ...stats,
        totalCompanies: scopedCompanies.length,
        totalSites: scopedSites.length,
        camerasOnline: scopedCamerasByCompany.reduce((sum, c) => sum + c.online, 0),
        camerasOffline: scopedCamerasByCompany.reduce((sum, c) => sum + c.offline, 0),
        openAlerts: scopedIncidents.length, // approximate
        activeIncidents: scopedIncidents.filter((i) => i.status !== 'Resolved' && i.status !== 'Closed').length,
        criticalAlerts: stats.criticalAlerts.filter((a) => scopedSiteIds.has(a.site_id)),
        camerasByCompany: scopedCamerasByCompany,
      }
    : stats;

  // Apply time window filter to incidents and critical alerts
  const timeFilteredIncidents = scopedIncidents.filter(
    (i) => new Date(i.started_at).getTime() >= cutoff
  );
  const timeFilteredCriticalAlerts = scopedStats.criticalAlerts.filter(
    (a) => new Date(a.created_at).getTime() >= cutoff
  );

  // Incident table rows (first 4 incidents)
  const incidentRows = timeFilteredIncidents.slice(0, 4).map((incident) => {
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

  const totalCameras = scopedStats.camerasOnline + scopedStats.camerasOffline;

  return (
    <div className="px-4 sm:px-9 py-6 sm:py-8 flex flex-col gap-6">

      {/* Page header */}
      <PageTitle
        title="Operational overview"
        sub={scopeCompanyId ? `Filtered view for selected company.` : "A live view across every company, site, and camera on Primex."}
        actions={
          <FilterPills
            options={["Last 24h", "Last 7d", "Last 30d", "All time"]}
            value={timeWindow}
            onChange={setTimeWindow}
          />
        }
      />

      {/* ── Stat cards row 1 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Companies"
          value={String(scopedStats.totalCompanies)}
          icon={Briefcase}
          supporting={
            <>
              <Pill tone="green" dot size="sm">{scopedStats.totalCompanies} total</Pill>
            </>
          }
        />
        <StatCard
          label="Active sites"
          value={String(scopedStats.totalSites)}
          icon={MapPin}
          supporting={
            <>
              <Pill tone="green" dot size="sm">{scopedStats.totalSites} total</Pill>
            </>
          }
        />
        <StatCard
          label="Cameras online"
          value={`${scopedStats.camerasOnline}/${totalCameras}`}
          icon={Camera}
          supporting={
            <>
              <Pill tone="green" dot size="sm">{scopedStats.camerasOnline} online</Pill>
              <Pill tone="red" dot size="sm">{scopedStats.camerasOffline} offline</Pill>
            </>
          }
        />
        <StatCard
          label="Open alerts"
          value={String(scopedStats.openAlerts)}
          icon={Bell}
          accent="text-p-red"
          supporting={
            <>
              <Pill tone="red" dot size="sm">{scopedStats.openAlerts} open</Pill>
            </>
          }
        />
      </div>

      {/* ── Stat cards row 2 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4 sm:mb-8">
        <StatCard
          label="Active incidents"
          value={String(scopedStats.activeIncidents)}
          icon={AlertTriangle}
          supporting={
            <>
              <Pill tone="amber" dot size="sm">{scopedStats.activeIncidents} active</Pill>
            </>
          }
        />
        <StatCard
          label="Avg response"
          value={scopedStats.avgResponseMinutes > 0 ? `${scopedStats.avgResponseMinutes}m` : '—'}
          icon={Clock}
          supporting={
            <Pill tone="blue" dot size="sm">from {scopedStats.resolvedIncidentCount} incidents</Pill>
          }
        />
        <StatCard
          label="Resolved today"
          value={String(scopedStats.resolvedToday)}
          icon={CheckCircle2}
          supporting={
            <Pill tone="green" dot size="sm">{scopedStats.resolvedToday} closed</Pill>
          }
        />
        <StatCard
          label="Guards on duty"
          value={String(scopedStats.guardsOnDuty)}
          icon={Users}
          supporting={
            <>
              <Pill tone="green" dot size="sm">{scopedStats.guardsOnDuty} on duty</Pill>
            </>
          }
        />
      </div>

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">

        {/* Left: Recent active incidents */}
        <Card padding="p-0">
          {/* Card header */}
          <div className="px-5 py-4 border-b border-border">
            <SectionHeader
              title="Recent active incidents"
              sub="Live · all companies"
              actions={
                <Button variant="link" size="sm" icon={ArrowRight} onClick={() => router.push("/incidents")}>
                  View all
                </Button>
              }
            />
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
          <div className="px-[22px] py-4 border-b border-border">
            <SectionHeader
              title={
                <span className="inline-flex items-center gap-2.5">
                  <LiveDot color="red" />
                  Critical alerts
                </span>
              }
              sub="Need review now"
            />
          </div>

          {/* Alert feed */}
          <div className="flex flex-col">
            {timeFilteredCriticalAlerts.length === 0 ? (
              <p className="px-[22px] py-6 text-sm text-ink-3 font-sans">No critical alerts.</p>
            ) : (
              timeFilteredCriticalAlerts.map((alert) => {
                const site = sites.find((s) => s.id === alert.site_id);
                return (
                  <div key={alert.id} className="flex gap-3 px-[16px] py-[16px] border-b border-border">
                    {/* Left red accent bar */}
                    <div className="w-[3px] self-stretch bg-p-red rounded flex-shrink-0" />
                    {/* Content */}
                    <div className="flex flex-col flex-1 min-w-0">
                      <p className="text-[13.5px] font-medium text-ink font-sans leading-snug">
                        {alert.title}
                      </p>
                      <p className="text-[12px] text-ink-3 font-sans mt-1">
                        {site?.name ?? "Unknown site"} · {formatRelative(alert.created_at)}
                      </p>
                      <div className="flex items-center gap-2 mt-2.5">
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
          <div className="px-[22px] py-[14px]">
            <Button variant="link" size="sm" icon={ArrowRight} onClick={() => router.push("/dispatcher")}>
              Open dispatcher console
            </Button>
          </div>
        </Card>
      </div>

      {/* ── Camera status by company ── */}
      <Card padding="p-0">
        {/* Card header */}
        <div className="px-[22px] py-4 border-b border-border">
          <SectionHeader
            title="Camera status by company"
            sub="Online · Offline · Maintenance · Unknown"
          />
        </div>

        {/* Company columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {scopedStats.camerasByCompany.map(({ company, online, offline, maintenance }, idx) => {
            const statusTone =
              company.status === "Active"
                ? "green"
                : company.status === "Pending"
                ? "amber"
                : "red";

            return (
              <div
                key={company.id}
                className={`flex flex-col px-[22px] py-[22px] border-b sm:border-b lg:border-b-0 border-border ${
                  idx < scopedStats.camerasByCompany.length - 1 ? "lg:border-r" : ""
                }`}
              >
                {/* Company name + status pill */}
                <div className="flex items-center gap-2">
                  <p className="text-[13.5px] font-semibold text-ink font-sans leading-snug">
                    {company.name}
                  </p>
                  <Pill tone={statusTone as "green" | "amber" | "red"} dot size="sm">
                    {company.status}
                  </Pill>
                </div>
                <p className="text-[11.5px] text-ink-3 font-sans mt-1">{company.type}</p>

                {/* Camera mini stats */}
                <div className="flex items-end gap-5 mt-[18px]">
                  <div className="flex flex-col items-start">
                    <span className="font-serif text-[28px] font-bold text-p-green leading-none">
                      {online}
                    </span>
                    <span className="text-[11px] text-ink-3 font-sans mt-1">Online</span>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-serif text-[28px] font-bold text-p-red leading-none">
                      {offline}
                    </span>
                    <span className="text-[11px] text-ink-3 font-sans mt-1">Offline</span>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-serif text-[28px] font-bold text-p-amber leading-none">
                      {maintenance}
                    </span>
                    <span className="text-[11px] text-ink-3 font-sans mt-1">Maint.</span>
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
