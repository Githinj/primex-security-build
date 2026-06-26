"use client";

import { Camera, Wifi, WifiOff, Wrench, Circle } from "lucide-react";
import { Pill } from "@/components/ui";
import { cameraTone } from "@/lib/utils";
import type { Camera as CameraType, Site } from "@/lib/types";

interface CameraGridProps {
  cameras: CameraType[];
  site: Site;
}

function CameraStatusIcon({ status }: { status: CameraType["status"] }) {
  switch (status) {
    case "Online":
      return <Wifi size={13} strokeWidth={2} className="text-p-green flex-shrink-0" />;
    case "Offline":
      return <WifiOff size={13} strokeWidth={2} className="text-p-red flex-shrink-0" />;
    case "Maintenance":
      return <Wrench size={13} strokeWidth={2} className="text-p-amber flex-shrink-0" />;
    default:
      return <Circle size={13} strokeWidth={2} className="text-p-gray flex-shrink-0" />;
  }
}

export function CameraGrid({ cameras, site }: CameraGridProps) {
  if (cameras.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center font-sans">
        <Camera size={28} strokeWidth={1.5} className="text-ink-4" />
        <p className="text-sm text-ink-3">No cameras found for {site.name}.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {cameras.map((cam) => (
        <div
          key={cam.id}
          className="bg-surface border border-border rounded-xl overflow-hidden"
        >
          {/* Camera preview area */}
          <div className="bg-navy h-32 flex flex-col items-center justify-center gap-2">
            <Camera size={24} strokeWidth={1.5} className="text-white/25" />
            <span className="text-white/35 text-xs font-sans tracking-wide">
              {cam.name}
            </span>
          </div>

          {/* Camera meta */}
          <div className="px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-sm text-ink font-sans">
                {cam.name}
              </span>
              <Pill tone={cameraTone(cam.status)} size="sm" dot>
                {cam.status}
              </Pill>
            </div>

            <div className="flex items-center gap-1.5">
              <CameraStatusIcon status={cam.status} />
              <span className="text-xs text-ink-3 font-sans">{cam.location}</span>
            </div>

            {cam.warning && (
              <p className="text-xs text-p-amber font-sans mt-0.5">{cam.warning}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
