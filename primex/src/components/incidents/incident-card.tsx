"use client";

import { MapPin } from "lucide-react";
import { Pill, Button } from "@/components/ui";
import { severityTone, incidentTone } from "@/lib/utils";
import type { Incident, Site, Profile } from "@/lib/types";

type IncidentCardVariant = "default" | "compact";

interface IncidentCardProps {
  incident: Incident;
  site: Site | undefined;
  guard: Profile | undefined;
  variant?: IncidentCardVariant;
  onOpen?: () => void;
}

export function IncidentCard({ incident, site, guard, variant = "default", onOpen }: IncidentCardProps) {
  const isCompact = variant === "compact";

  return (
    <div className="bg-surface border border-border rounded-xl flex flex-col overflow-hidden">
      {/* Header: severity + status pills */}
      <div className={`flex items-center justify-between gap-2 ${isCompact ? "p-3.5 pb-2.5" : "p-4 pb-3"}`}>
        <Pill tone={severityTone(incident.severity)} dot size={isCompact ? "sm" : "md"}>
          {incident.severity}
        </Pill>
        {!isCompact && (
          <Pill tone={incidentTone(incident.status)}>
            {incident.status}
          </Pill>
        )}
      </div>

      {/* Body */}
      <div className={`${isCompact ? "px-3.5 pb-2.5" : "px-4 pb-3"} flex flex-col gap-2 flex-1`}>
        <h3 className={`font-serif font-bold text-ink leading-snug ${isCompact ? "text-[13px]" : "text-base"}`}>
          {incident.title}
        </h3>

        {site && (
          <div className={`flex items-center gap-1.5 text-ink-3 ${isCompact ? "text-[11px]" : "text-xs"}`}>
            <MapPin size={11} strokeWidth={2} className="flex-shrink-0" />
            <span>{site.name}</span>
          </div>
        )}

        {!isCompact && incident.notes && (
          <p className="text-xs text-ink-3 line-clamp-2 leading-relaxed">
            {incident.notes}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className={`border-t border-border flex items-center justify-between gap-3 ${isCompact ? "px-3.5 py-2.5" : "px-4 py-3"}`}>
        <div className={`flex ${isCompact ? "items-center gap-2" : "flex-col gap-0.5"} min-w-0`}>
          <span className={`font-medium truncate ${isCompact ? "text-[11px] text-ink-4" : "text-xs text-ink"}`}>
            {guard ? guard.full_name : "Unassigned"}
          </span>
          <span className={`text-ink-3 tabular-nums ${isCompact ? "text-[11px]" : "text-[11px]"}`}>
            {new Date(incident.started_at).toLocaleString("en-AU", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </span>
        </div>
        {!isCompact && (
          <Button variant="link" size="sm" onClick={onOpen}>
            Open →
          </Button>
        )}
      </div>
    </div>
  );
}
