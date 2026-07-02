"use client";

import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { PageTitle, Button } from "@/components/ui";
import { CameraTile } from "@/components/sites/camera-tile";
import { AddCameraModal } from "@/components/sites/add-camera-modal";
import type { Camera, Site, Company } from "@/lib/types";

interface CompanyCamerasProps {
  company: Company;
  cameras: Camera[];
  sites: Site[];
}

const PAGE_SIZE = 24;

export function CompanyCameras({ company, cameras, sites }: CompanyCamerasProps) {
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const totalPages = Math.ceil(cameras.length / PAGE_SIZE);
  const paginatedCameras = cameras.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="flex flex-col gap-6 font-sans">
        <PageTitle
          title="Cameras"
          sub={`${cameras.length} camera${cameras.length !== 1 ? "s" : ""} across ${sites.length} site${sites.length !== 1 ? "s" : ""}`}
          actions={
            <Button variant="primary" icon={Plus} onClick={() => setAddOpen(true)}>
              Add camera
            </Button>
          }
        />

        {cameras.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedCameras.map((camera) => {
              const site = sites.find((s) => s.id === camera.site_id);
              if (!site) return null;
              return (
                <CameraTile key={camera.id} camera={camera} site={site} />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-ink-4 gap-3">
            <p className="text-sm">No cameras found for your company.</p>
            <Button variant="primary" icon={Plus} onClick={() => setAddOpen(true)}>
              Add camera
            </Button>
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

      <AddCameraModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        companies={[company]}
        sites={sites}
      />
    </>
  );
}
