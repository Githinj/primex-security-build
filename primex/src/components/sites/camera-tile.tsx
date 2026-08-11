"use client";

import {
  Camera,
  WifiOff,
  Wrench,
  Circle,
  AlertTriangle,
  MapPin,
} from "lucide-react";
import { Pill } from "@/components/ui";
import { cameraTone, formatRelativeTime } from "@/lib/utils";
import type { Camera as CameraType, Site } from "@/lib/types";

interface CameraTileProps {
  camera: CameraType;
  site: Site;
  menu?: React.ReactNode;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function CameraTile({ camera, site, menu }: CameraTileProps) {
  const tone = cameraTone(camera.status);
  const isOnline = camera.status === "Online";
  const isOffline = camera.status === "Offline";
  const isMaintenance = camera.status === "Maintenance";

  return (
    <div className="bg-surface border border-border rounded-xl p-3.5 flex flex-col gap-3 font-sans">
      {/* 16:9 preview container */}
      <div className="relative w-full rounded-lg overflow-hidden bg-navy" style={{ aspectRatio: "16/9" }}>
        {/* SVG dot pattern overlay */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id={`dots-${camera.id}`} x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#dots-${camera.id})`} />
        </svg>

        {isOnline ? (
          <>
            {/* LIVE badge */}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-p-red/90 text-white text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse flex-shrink-0" />
              LIVE
            </div>

            {/* Timestamp */}
            <div className="absolute top-2.5 right-2.5 text-white/60 text-[10px] font-mono tabular-nums">
              {formatTimestamp(camera.last_checked)}
            </div>

            {/* Centered camera icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Camera size={36} strokeWidth={1.5} className="text-white/25" />
            </div>
          </>
        ) : (
          /* Offline / Maintenance / Unknown */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            {isOffline && (
              <>
                <WifiOff size={28} strokeWidth={1.5} className="text-white/40" />
                <span className="text-white/40 text-[10px] font-semibold tracking-widest uppercase">
                  Offline
                </span>
              </>
            )}
            {isMaintenance && (
              <>
                <Wrench size={28} strokeWidth={1.5} className="text-white/40" />
                <span className="text-white/40 text-[10px] font-semibold tracking-widest uppercase">
                  Maintenance
                </span>
              </>
            )}
            {camera.status === "Unknown" && (
              <>
                <Circle size={28} strokeWidth={1.5} className="text-white/40" />
                <span className="text-white/40 text-[10px] font-semibold tracking-widest uppercase">
                  Unknown
                </span>
              </>
            )}
          </div>
        )}

        {/* Warning banner at bottom */}
        {camera.warning && (
          <div className="absolute bottom-0 inset-x-0 bg-p-amber/90 px-3 py-1.5 flex items-center gap-1.5">
            <AlertTriangle size={11} strokeWidth={2} className="text-white flex-shrink-0" />
            <span className="text-white text-[10px] font-medium truncate leading-none">
              {camera.warning}
            </span>
          </div>
        )}

        {/* Status pill — bottom-right, above warning if present */}
        <div className={`absolute right-2 ${camera.warning ? "bottom-8" : "bottom-2"}`}>
          <Pill tone={tone} size="sm">
            {camera.status}
          </Pill>
        </div>
      </div>

      {/* Below container: name, location, last checked, menu */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-semibold text-ink truncate">{camera.name}</span>
          <span className="inline-flex items-center gap-1 text-xs text-ink-3 truncate">
            <MapPin size={10} strokeWidth={2} className="flex-shrink-0 text-ink-4" />
            {camera.location}
          </span>
          <span className="text-xs text-ink-4 truncate">{site.name}</span>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[10px] text-ink-4 tabular-nums whitespace-nowrap">
            {formatRelativeTime(camera.last_checked)}
          </span>
          {menu && <div>{menu}</div>}
        </div>
      </div>
    </div>
  );
}
