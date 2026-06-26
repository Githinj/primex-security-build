"use client";

import { PageTitle, PhaseTag } from "@/components/ui";
import { CameraTile } from "@/components/sites/camera-tile";
import type { Camera, Site } from "@/lib/types";

interface CompanyCamerasProps {
  cameras: Camera[];
  sites: Site[];
}

export function CompanyCameras({ cameras, sites }: CompanyCamerasProps) {
  return (
    <div className="flex flex-col gap-6 font-sans">
      <PageTitle
        title="Cameras"
        phaseTag="Live streaming · Phase 2"
        sub={`${cameras.length} cameras across ${sites.length} sites`}
      />

      {cameras.length > 0 ? (
        <div className="grid grid-cols-3 gap-4">
          {cameras.map((camera) => {
            const site = sites.find((s) => s.id === camera.site_id);
            if (!site) return null;
            return (
              <CameraTile key={camera.id} camera={camera} site={site} />
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-ink-4">
          <p className="text-sm">No cameras found for your company.</p>
        </div>
      )}
    </div>
  );
}
