"use client";

import { MapPin } from "lucide-react";
import { Pill, Button } from "@/components/ui";
import { severityTone, incidentTone } from "@/lib/utils";
import type { Incident, Site, Profile } from "@/lib/types";

interface IncidentCardProps {
  incident: Incident;
  site: Site | undefined;
  guard: Profile | undefined;
}

export function IncidentCard({ incident, site, guard }: IncidentCardProps) {
  return (
    <div className="bg-surface border border-border rounded-xl flex flex-col overflow-hidden">
      {/* Header: severity + status pills */}
      <div className="flex items-center justify-between gap-2 p-4 pb-3">
        <Pill tone={severityTone(incident.severity)} dot>
          {incident.severity}
        </Pill>
        <Pill tone={incidentTone(incident.status)}>
          {incident.status}
        </Pill>
      </div>

      {/* Body */}
      <div className="px-4 pb-3 flex flex-col gap-2 flex-1">
        <h3 className="font-serif font-bold text-ink text-base leading-snug">
          {incident.title}
        </h3>

        {site && (
          <div className="flex items-center gap-1.5 text-xs text-ink-3">
            <MapPin size={11} strokeWidth={2} className="flex-shrink-0" />
            <span>{site.name}</span>
          </div>
        )}

        {incident.notes && (
          <p className="text-xs text-ink-3 line-clamp-2 leading-relaxed">
            {incident.notes}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs text-ink font-medium truncate">
            {guard ? guard.full_name : (
              <span className="text-ink-4">Unassigned</span>
            )}
          </span>
          <span className="text-[11px] text-ink-3 tabular-nums">
            {new Date(incident.started_at).toLocaleString("en-AU", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </span>
        </div>
        <Button variant="link" size="sm">
          Open →
        </Button>
      </div>
    </div>
  );
}
