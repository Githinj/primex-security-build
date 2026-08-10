"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Settings, Camera, Clock } from "lucide-react";
import { Card, Pill, Button, Label, InfoBox, Breadcrumb } from "@/components/ui";
import { CameraGrid } from "@/components/sites/camera-grid";
import { EditSiteModal } from "@/components/sites/edit-site-modal";
import { BusinessHoursModal } from "@/components/sites/business-hours-modal";
import { BUSINESS_DAYS, DAY_SHORT } from "@/lib/business-hours";
import type {
  Site,
  Company,
  Camera as CameraType,
  Alert,
  Incident,
  SiteRisk,
  SiteBusinessHours,
} from "@/lib/types";

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
  businessHours: SiteBusinessHours | null;
}

export function SiteDetailClient({
  site,
  company,
  cameras,
  alerts,
  incidents,
  businessHours,
}: SiteDetailClientProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);

  const openAlerts = alerts.filter(
    (a) => a.status !== "Closed"
  ).length;
  const openIncidents = incidents.filter(
    (i) => i.status !== "Resolved" && i.status !== "Closed"
  ).length;

  const camerasOnline = cameras.filter((c) => c.status === "Online").length;
  const camerasTotal = cameras.length;

  return (
    <div className="px-4 sm:px-9 py-6 sm:py-8 flex flex-col gap-6 max-w-5xl">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: "Sites", onClick: () => router.push("/sites") }, site.name]} />

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
        <Button
          variant="secondary"
          icon={Settings}
          className="flex-shrink-0 mt-1"
          onClick={() => setEditOpen(true)}
        >
          Manage site
        </Button>
      </div>

      <EditSiteModal open={editOpen} onClose={() => setEditOpen(false)} site={site} />
      <BusinessHoursModal
        open={hoursOpen}
        onClose={() => setHoursOpen(false)}
        siteId={site.id}
        businessHours={businessHours}
      />

      {/* Mini stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Business hours — drives AI after-hours detection */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock size={15} strokeWidth={2} className="text-ink-3" />
            <Label>Business hours</Label>
          </div>
          <Button variant="secondary" onClick={() => setHoursOpen(true)}>
            {businessHours ? "Edit hours" : "Set hours"}
          </Button>
        </div>

        {businessHours ? (
          <Card className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-x-7 gap-y-2">
              {BUSINESS_DAYS.map((day) => {
                const entry = businessHours.hours?.[day];
                return (
                  <div key={day} className="flex items-baseline gap-2 font-sans">
                    <span className="text-[11px] text-ink-3 font-semibold uppercase tracking-wider w-7">
                      {DAY_SHORT[day]}
                    </span>
                    <span className={`text-sm ${entry ? "text-ink" : "text-ink-4"}`}>
                      {entry ? `${entry.open}–${entry.close}` : "Closed"}
                    </span>
                  </div>
                );
              })}
            </div>
            <span className="text-xs text-ink-4 font-sans">
              {businessHours.timezone} — anything detected outside these hours raises an
              after-hours alert.
            </span>
          </Card>
        ) : (
          <InfoBox tone="amber">
            No business hours set. After-hours alerts can&apos;t fire for this site until
            they are — AI detection has no way to tell when the site should be empty.
          </InfoBox>
        )}
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
