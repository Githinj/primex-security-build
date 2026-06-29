"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageTitle } from "@/components/ui";
import { CameraTile } from "@/components/sites/camera-tile";
import type { Camera, Site } from "@/lib/types";

interface CompanyCamerasProps {
  cameras: Camera[];
  sites: Site[];
}

const PAGE_SIZE = 24;

export function CompanyCameras({ cameras, sites }: CompanyCamerasProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(cameras.length / PAGE_SIZE);
  const paginatedCameras = cameras.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6 font-sans">
      <PageTitle
        title="Cameras"
        phaseTag="Live streaming · Phase 2"
        sub={`${cameras.length} cameras across ${sites.length} sites`}
      />

      {cameras.length > 0 ? (
        <div className="grid grid-cols-3 gap-4">
          {paginatedCameras.map((camera) => {
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-3 font-sans tabular-nums">
            {(page - 1) * PAGE_SIZE + 1}&ndash;{Math.min(page * PAGE_SIZE, cameras.length)} of {cameras.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <span className="text-xs font-sans text-ink-2 px-2 tabular-nums">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
