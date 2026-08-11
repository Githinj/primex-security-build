"use client";

import { useRouter } from "next/navigation";

import {
  MapPin,
  Users,
  Briefcase,
  Camera,
  Building,
} from "lucide-react";

import {
  Card,
  Pill,
  DataTable,
  StatCard,
  KV,
  SectionHeader,
  Breadcrumb,
} from "@/components/ui";

import type { Company, CompanyStatus, Site, Camera as CameraType, Profile } from "@/lib/types";

// --- helpers ----------------------------------------------------------------

function statusTone(status: CompanyStatus): "green" | "red" | "amber" {
  switch (status) {
    case "Active":
      return "green";
    case "Suspended":
      return "red";
    case "Pending":
      return "amber";
  }
}

function siteRiskTone(risk: string): "red" | "amber" | "green" {
  switch (risk) {
    case "High":
      return "red";
    case "Medium":
      return "amber";
    default:
      return "green";
  }
}

function siteStatusTone(status: string): "green" | "amber" | "gray" {
  switch (status) {
    case "Active":
      return "green";
    case "Maintenance":
      return "amber";
    default:
      return "gray";
  }
}

function roleTone(role: string): "blue" | "green" | "amber" | "gray" {
  switch (role) {
    case "super_admin":
      return "blue";
    case "company_manager":
      return "green";
    case "dispatcher":
      return "amber";
    default:
      return "gray";
  }
}

function roleLabel(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// --- component --------------------------------------------------------------

interface CompanyDetailClientProps {
  company: Company;
  sites: Site[];
  cameras: CameraType[];
  team: Profile[];
}

export function CompanyDetailClient({ company, sites, cameras, team }: CompanyDetailClientProps) {
  const router = useRouter();

  // Derived data
  const companySites = sites;
  const siteIds = companySites.map((s) => s.id);
  const companyCameras = cameras.filter((c) => siteIds.includes(c.site_id));
  const activeCameras = companyCameras.filter((c) => c.status === "Online").length;

  // Site table rows
  const siteRows = companySites.map((site) => [
    <span key="name" className="flex items-center gap-2.5">
      <span className="w-7 h-7 rounded-lg bg-surface-subtle border border-border flex items-center justify-center flex-shrink-0">
        <MapPin size={12} className="text-ink-3" strokeWidth={2} />
      </span>
      <span className="font-medium text-ink text-[13px] leading-snug">{site.name}</span>
    </span>,
    <span key="type" className="text-ink-3 text-[13px]">{site.type}</span>,
    <span key="addr" className="text-ink-4 text-[12px] max-w-[200px] block">{site.address}</span>,
    <span key="cams" className="text-ink-2 text-[13px] font-medium flex items-center gap-1.5">
      <Camera size={12} className="text-ink-4" strokeWidth={2} />
      {site.cameras}
    </span>,
    <Pill key="risk" tone={siteRiskTone(site.risk)} size="sm">
      {site.risk}
    </Pill>,
    <Pill key="status" tone={siteStatusTone(site.status)} dot size="sm">
      {site.status}
    </Pill>,
  ]);

  // Team rows
  const teamRows = team.map((member) => [
    <span key="name" className="flex items-center gap-2.5">
      <span className="w-7 h-7 rounded-full bg-p-blue-soft flex items-center justify-center flex-shrink-0 text-[11px] font-semibold text-p-blue font-sans">
        {member.full_name.split(" ").map((n) => n[0]).join("")}
      </span>
      <span className="font-medium text-ink text-[13px]">{member.full_name}</span>
    </span>,
    <span key="email" className="text-ink-3 text-[13px]">{member.email}</span>,
    <Pill key="role" tone={roleTone(member.role)} size="sm">
      {roleLabel(member.role)}
    </Pill>,
    <Pill
      key="status"
      tone={member.status === "Active" ? "green" : "gray"}
      dot
      size="sm"
    >
      {member.status}
    </Pill>,
  ]);

  const plan = company.plan || "—";

  return (
    <div className="px-4 sm:px-9 py-6 sm:py-8 flex flex-col gap-6">

      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: "Companies", onClick: () => router.push("/companies") }, company.name]} />

      {/* Company header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-surface-subtle border border-border flex items-center justify-center flex-shrink-0">
            <Building size={22} className="text-ink-3" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="font-serif text-3xl font-semibold text-ink leading-tight">
              {company.name}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-ink-3 font-sans">{company.type}</span>
              <Pill tone={statusTone(company.status)} dot size="sm">
                {company.status}
              </Pill>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Sites"
          value={company.sites ?? 0}
          icon={MapPin}
          supporting={
            <span className="text-xs text-ink-3 font-sans">
              {companySites.filter((s) => s.status === "Active").length} active
            </span>
          }
        />
        <StatCard
          label="Users"
          value={company.users ?? 0}
          icon={Users}
        />
        <StatCard
          label="Active cameras"
          value={activeCameras}
          icon={Camera}
          supporting={
            <span className="text-xs text-ink-3 font-sans">
              of {companyCameras.length} total
            </span>
          }
        />
        <StatCard
          label="Plan"
          value={plan}
          icon={Briefcase}
        />
      </div>

      {/* Two-column: KV details + sites */}
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5 items-start">

        {/* Left: Company details card */}
        <Card>
          <div className="mb-4">
            <SectionHeader title="Company details" />
          </div>
          <div className="flex flex-col gap-3">
            <KV k="Name" v={company.name} />
            <KV k="Type" v={company.type} />
            <KV
              k="Status"
              v={
                <Pill tone={statusTone(company.status)} dot size="sm">
                  {company.status}
                </Pill>
              }
            />
            <KV k="Sites" v={company.sites ?? 0} />
            <KV k="Users" v={company.users ?? 0} />
            <KV k="Plan" v={plan} />
            <KV k="Primary contact" v={company.primary_contact || "—"} />
            <KV k="Contact email" v={company.contact_email || "—"} />
            <KV
              k="Company ID"
              v={
                <span className="text-ink-4 font-mono text-xs">{company.id}</span>
              }
            />
          </div>
        </Card>

        {/* Right: Sites table */}
        <Card padding="p-0">
          <div className="px-5 py-4 border-b border-border">
            <SectionHeader
              title="Sites"
              sub={`${companySites.length} site${companySites.length !== 1 ? "s" : ""} under this company`}
            />
          </div>

          {companySites.length === 0 ? (
            <p className="px-5 py-8 text-sm text-ink-3 font-sans text-center">
              No sites found for this company.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <DataTable
                columns={["Site", "Type", "Address", "Cameras", "Risk", "Status"]}
                rows={siteRows}
              />
            </div>
          )}
        </Card>
      </div>

      {/* Team members */}
      <Card padding="p-0">
        <div className="px-5 py-4 border-b border-border">
          <SectionHeader
            title="Team members"
            sub="Primex staff and client users with access to this company"
          />
        </div>

        {teamRows.length === 0 ? (
          <p className="px-5 py-8 text-sm text-ink-3 font-sans text-center">
            No team members found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <DataTable
              columns={["Member", "Email", "Role", "Status"]}
              rows={teamRows}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
