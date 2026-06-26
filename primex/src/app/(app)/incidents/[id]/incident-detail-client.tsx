"use client";

import { MapPin } from "lucide-react";

import {
  Breadcrumb,
  Card,
  Pill,
  Label,
  KV,
  Button,
} from "@/components/ui";
import { Timeline } from "@/components/incidents/timeline";
import { severityTone, incidentTone } from "@/lib/utils";
import type { Incident, Site, Profile, Alert } from "@/lib/types";

interface IncidentDetailClientProps {
  incident: Incident;
  site: Site;
  guard: Profile | null;
  alert: Alert;
}

export function IncidentDetailClient({
  incident,
  site,
  guard,
  alert,
}: IncidentDetailClientProps) {
  // Build timeline events from available data
  const timelineEvents = [
    {
      time: new Date(alert?.created_at ?? incident.started_at).toLocaleString(
        "en-AU",
        {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }
      ),
      label: "Alert created",
      by: alert?.source ?? "System",
    },
    {
      time: new Date(incident.started_at).toLocaleString("en-AU", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      label: "Reviewed by dispatcher",
      by: "Samira Osei",
    },
    ...(guard
      ? [
          {
            time: new Date(
              new Date(incident.started_at).getTime() + 2 * 60 * 1000
            ).toLocaleString("en-AU", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),
            label: "Guard dispatched",
            by: guard.full_name,
          },
          {
            time: new Date(
              new Date(incident.started_at).getTime() + 8 * 60 * 1000
            ).toLocaleString("en-AU", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),
            label: "En route",
            by: guard.full_name,
          },
        ]
      : []),
  ];

  const startedFormatted = new Date(incident.started_at).toLocaleString(
    "en-AU",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  );

  return (
    <div className="px-4 sm:px-9 py-6 sm:py-8 flex flex-col gap-5">
      {/* Breadcrumb */}
      <Breadcrumb items={["Incidents", incident.title]} />

      {/* Top meta row */}
      <div className="flex items-center gap-2.5 flex-wrap font-sans">
        <Pill tone={severityTone(incident.severity)} dot>
          {incident.severity}
        </Pill>
        <Pill tone={incidentTone(incident.status)}>
          {incident.status}
        </Pill>
        <span className="text-ink-3 text-sm tabular-nums">{startedFormatted}</span>
      </div>

      {/* Title */}
      <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink leading-tight">
        {incident.title}
      </h1>

      {/* Site info */}
      <div className="flex items-center gap-1.5 text-sm text-ink-3 font-sans">
        <MapPin size={13} strokeWidth={2} className="flex-shrink-0" />
        <span>{site.name}</span>
        <span className="text-ink-4">·</span>
        <span>{site.address}</span>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
        {/* Left card: description + timeline */}
        <Card className="flex flex-col gap-6">
          {/* Description */}
          <div className="flex flex-col gap-2">
            <Label>Description</Label>
            <p className="text-sm text-ink-2 font-sans leading-relaxed mt-1">
              {incident.notes}
            </p>
          </div>

          {/* Timeline */}
          <div className="flex flex-col gap-3">
            <Label>Timeline</Label>
            <div className="mt-1">
              <Timeline events={timelineEvents} />
            </div>
          </div>
        </Card>

        {/* Right card: actions + details */}
        <Card className="flex flex-col gap-5">
          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Label>Actions</Label>
            <div className="flex flex-col gap-2 mt-1">
              <Button variant="primary" full>
                Update Status
              </Button>
              <Button variant="secondary" full>
                Assign Guard
              </Button>
              <Button variant="secondary" full>
                Close Incident
              </Button>
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col gap-3 border-t border-border pt-5">
            <Label>Details</Label>
            <div className="flex flex-col gap-2.5 mt-1">
              <KV
                k="Severity"
                v={
                  <Pill tone={severityTone(incident.severity)} dot size="sm">
                    {incident.severity}
                  </Pill>
                }
              />
              <KV
                k="Status"
                v={
                  <Pill tone={incidentTone(incident.status)} size="sm">
                    {incident.status}
                  </Pill>
                }
              />
              <KV
                k="Guard"
                v={
                  guard ? (
                    guard.full_name
                  ) : (
                    <span className="text-ink-4">Unassigned</span>
                  )
                }
              />
              <KV k="Site" v={site.name} />
              <KV
                k="Alert ID"
                v={
                  alert ? (
                    <span className="font-mono text-xs text-p-blue">
                      {alert.id}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <KV k="Started" v={startedFormatted} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
