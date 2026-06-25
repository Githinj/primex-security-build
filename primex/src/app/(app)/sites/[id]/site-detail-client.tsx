"use client";

import { useRouter } from "next/navigation";
import { MapPin, Settings, ArrowLeft, Camera } from "lucide-react";
import { Card, Pill, Button, Label } from "@/components/ui";
import { CameraGrid } from "@/components/sites/camera-grid";
import type { Site, Company, Camera as CameraType, Alert, Incident, SiteRisk } from "@/lib/types";

function riskTone(risk: SiteRisk): "red" | "amber" | "green" {
  switch (risk) {
    case "High":
      return "red";
    case "Medium":
      return "amber";
    case "Low":
      return "green";
  }
}

interface SiteDetailClientProps {
  site: Site;
  company: Company;
  cameras: CameraType[];
  alerts: Alert[];
  incidents: Incident[];
}

export function SiteDetailClient({
  site,
  company,
  cameras,
  alerts,
  incidents,
}: SiteDetailClientProps) {
  const router = useRouter();

  const openAlerts = alerts.filter(
    (a) => a.status !== "Closed"
  ).length;
  const openIncidents = incidents.filter(
    (i) => i.status !== "Resolved" && i.status !== "Closed"
  ).length;

  const camerasOnline = cameras.filter((c) => c.status === "Online").length;
  const camerasTotal = cameras.length;

  return (
    <div className="px-9 py-8 flex flex-col gap-6 max-w-5xl">
      {/* Back nav */}
      <button
        type="button"
        onClick={() => router.push("/sites")}
        className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink transition-colors duration-100 font-sans cursor-pointer w-fit"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Back to Sites
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Label>{site.type}</Label>
          <h2 className="font-serif text-3xl font-semibold text-ink leading-snug">
            {site.name}
          </h2>
          <div className="flex items-center gap-1.5 font-sans">
            <MapPin size={14} strokeWidth={2} className="text-ink-4 flex-shrink-0" />
            <span className="text-sm text-ink-3">{site.address}</span>
          </div>
          <span className="text-xs text-ink-4 font-sans">{company.name}</span>
        </div>
        <Button variant="secondary" icon={Settings} className="flex-shrink-0 mt-1">
          Manage site
        </Button>
      </div>

      {/* Mini stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Risk */}
        <Card className="flex flex-col gap-2">
          <span className="text-[11px] text-ink-3 font-semibold tracking-widest uppercase font-sans">
            Risk
          </span>
          <Pill tone={riskTone(site.risk)} dot>
            {site.risk}
          </Pill>
        </Card>

        {/* Cameras online */}
        <Card className="flex flex-col gap-2">
          <span className="text-[11px] text-ink-3 font-semibold tracking-widest uppercase font-sans">
            Cameras online
          </span>
          <p className="font-serif text-3xl font-semibold text-ink leading-none">
            {camerasOnline}
            <span className="font-sans text-base font-normal text-ink-3">
              /{camerasTotal}
            </span>
          </p>
        </Card>

        {/* Open alerts */}
        <Card className="flex flex-col gap-2">
          <span className="text-[11px] text-ink-3 font-semibold tracking-widest uppercase font-sans">
            Open alerts
          </span>
          <p
            className={`font-serif text-3xl font-semibold leading-none ${
              openAlerts > 0 ? "text-p-red" : "text-ink"
            }`}
          >
            {openAlerts}
          </p>
        </Card>

        {/* Open incidents */}
        <Card className="flex flex-col gap-2">
          <span className="text-[11px] text-ink-3 font-semibold tracking-widest uppercase font-sans">
            Open incidents
          </span>
          <p
            className={`font-serif text-3xl font-semibold leading-none ${
              openIncidents > 0 ? "text-p-amber" : "text-ink"
            }`}
          >
            {openIncidents}
          </p>
        </Card>
      </div>

      {/* Cameras section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Camera size={15} strokeWidth={2} className="text-ink-3" />
          <Label>Cameras at this site</Label>
        </div>
        <CameraGrid cameras={cameras} site={site} />
      </div>
    </div>
  );
}
