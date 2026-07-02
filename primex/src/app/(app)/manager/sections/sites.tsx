"use client";

import { useState } from "react";
import {
  MapPin,
  Plus,
  Camera as CameraIcon,
  Bell,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { PageTitle, Pill, Card, Button } from "@/components/ui";
import { cameraTone } from "@/lib/utils";
import { AddSiteModal } from "@/components/sites/add-site-modal";
import { CameraTile } from "@/components/sites/camera-tile";
import type {
  Company,
  Site,
  Camera,
  Alert,
  Incident,
} from "@/lib/types";

interface CompanySitesProps {
  company: Company;
  sites: Site[];
  cameras: Camera[];
  alerts: Alert[];
  incidents: Incident[];
}

function riskTone(risk: string): "green" | "amber" | "red" | "gray" {
  switch (risk) {
    case "Low":
      return "green";
    case "Medium":
      return "amber";
    case "High":
      return "red";
    default:
      return "gray";
  }
}

function statusTone(status: string): "green" | "amber" | "gray" {
  switch (status) {
    case "Active":
      return "green";
    case "Maintenance":
      return "amber";
    default:
      return "gray";
  }
}

export function CompanySites({
  company,
  sites,
  cameras,
  alerts,
  incidents,
}: CompanySitesProps) {
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(
    sites[0]?.id ?? null
  );
  const [addSiteOpen, setAddSiteOpen] = useState(false);

  const selectedSite = sites.find((s) => s.id === selectedSiteId) ?? null;

  const siteCameras = selectedSite
    ? cameras.filter((c) => c.site_id === selectedSite.id)
    : [];

  const siteOpenAlerts = selectedSite
    ? alerts.filter(
        (a) =>
          a.site_id === selectedSite.id &&
          ["New", "Reviewing", "Escalated"].includes(a.status)
      ).length
    : 0;

  const siteActiveIncidents = selectedSite
    ? incidents.filter(
        (i) =>
          i.site_id === selectedSite.id &&
          ["Open", "In Progress", "Dispatched"].includes(i.status)
      ).length
    : 0;

  const siteCamerasOnline = siteCameras.filter(
    (c) => c.status === "Online"
  ).length;

  return (
    <>
      <div className="flex flex-col gap-6 font-sans">
        <PageTitle
          title="My sites"
          sub={`${sites.length} sites managed by ${company.name}`}
          actions={
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => setAddSiteOpen(true)}
            >
              Add site
            </Button>
          }
        />

        {sites.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <MapPin size={32} className="text-ink-4" strokeWidth={1.5} />
              <div className="text-center">
                <p className="text-sm font-medium text-ink mb-1">No sites yet</p>
                <p className="text-xs text-ink-3">Add your first site to start monitoring cameras, alerts, and incidents.</p>
              </div>
              <Button variant="primary" icon={Plus} onClick={() => setAddSiteOpen(true)}>
                Add site
              </Button>
            </div>
          </Card>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 min-h-[600px]">
          {/* Left list */}
          <div className="flex flex-col gap-1.5 overflow-auto">
            {sites.map((site) => {
              const isSelected = site.id === selectedSiteId;
              const cameraCount = cameras.filter(
                (c) => c.site_id === site.id
              ).length;

              return (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => setSelectedSiteId(site.id)}
                  className={[
                    "flex flex-col gap-1.5 px-4 py-3.5 rounded-xl border text-left transition-colors duration-150",
                    isSelected
                      ? "bg-p-blue-soft border-p-blue/30"
                      : "bg-surface border-border hover:bg-surface-subtle",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={[
                        "text-sm font-semibold truncate",
                        isSelected ? "text-p-blue" : "text-ink",
                      ].join(" ")}
                    >
                      {site.name}
                    </span>
                    <Pill tone={statusTone(site.status)} size="sm" dot>
                      {site.status}
                    </Pill>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-ink-3">
                    <MapPin size={10} strokeWidth={2} className="flex-shrink-0" />
                    <span className="truncate">{site.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-ink-4">
                    <CameraIcon size={10} strokeWidth={2} />
                    <span>{cameraCount} cameras</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right detail */}
          <div className="flex-1 min-w-0">
            {selectedSite ? (
              <Card className="h-full">
                <div className="flex flex-col gap-6">
                  {/* Site header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase text-ink-4 tracking-widest">
                        {selectedSite.type}
                      </span>
                      <h2 className="font-serif text-2xl font-semibold text-ink">
                        {selectedSite.name}
                      </h2>
                      <div className="flex items-center gap-1.5 text-sm text-ink-3">
                        <MapPin size={12} strokeWidth={2} />
                        {selectedSite.address}
                      </div>
                    </div>
                    <Button variant="secondary" size="sm">
                      Manage
                    </Button>
                  </div>

                  {/* Mini stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="flex flex-col gap-1 bg-bg rounded-lg p-3">
                      <span className="text-[10px] font-semibold uppercase text-ink-4 tracking-wider">
                        Risk
                      </span>
                      <Pill tone={riskTone(selectedSite.risk)} size="sm">
                        {selectedSite.risk}
                      </Pill>
                    </div>
                    <div className="flex flex-col gap-1 bg-bg rounded-lg p-3">
                      <span className="text-[10px] font-semibold uppercase text-ink-4 tracking-wider">
                        Cameras online
                      </span>
                      <span className="text-lg font-serif font-semibold text-ink">
                        {siteCamerasOnline}/{siteCameras.length}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 bg-bg rounded-lg p-3">
                      <span className="text-[10px] font-semibold uppercase text-ink-4 tracking-wider">
                        Open alerts
                      </span>
                      <span className="text-lg font-serif font-semibold text-ink">
                        {siteOpenAlerts}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 bg-bg rounded-lg p-3">
                      <span className="text-[10px] font-semibold uppercase text-ink-4 tracking-wider">
                        Open incidents
                      </span>
                      <span className="text-lg font-serif font-semibold text-ink">
                        {siteActiveIncidents}
                      </span>
                    </div>
                  </div>

                  {/* Camera grid */}
                  {siteCameras.length > 0 ? (
                    <div>
                      <h3 className="text-sm font-semibold text-ink mb-3">
                        Cameras at {selectedSite.name}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {siteCameras.map((cam) => (
                          <CameraTile
                            key={cam.id}
                            camera={cam}
                            site={selectedSite}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-ink-4">
                      <CameraIcon size={32} strokeWidth={1.5} className="mb-2" />
                      <span className="text-sm">No cameras at this site</span>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <div className="text-center text-ink-4">
                  <Shield size={40} strokeWidth={1.5} className="mx-auto mb-3" />
                  <p className="text-sm">Select a site to view details</p>
                </div>
              </Card>
            )}
          </div>
        </div>
        )}
      </div>

      <AddSiteModal
        open={addSiteOpen}
        onClose={() => setAddSiteOpen(false)}
        lockedCompany={company}
        companies={[company]}
      />
    </>
  );
}
