"use client";

import { useState } from "react";
import { Wifi, WifiOff, Wrench, Circle, Plus, Eye, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageTitle, StatCard, ActionMenu } from "@/components/ui";
import { CameraTile } from "@/components/sites/camera-tile";
import { AddCameraModal } from "@/components/sites/add-camera-modal";
import { RemoveCameraModal } from "@/components/cameras/remove-camera-modal";
import { EditCameraModal } from "@/components/cameras/edit-camera-modal";
import { usePagination } from "@/lib/hooks/use-pagination";
import type { Camera, Site, Company } from "@/lib/types";

interface CamerasClientProps {
  cameras: Camera[];
  total: number;
  page: number;
  pageSize: number;
  sites: Site[];
  companies: Company[];
}

export function CamerasClient({ cameras, total, page, pageSize, sites, companies }: CamerasClientProps) {
  const router = useRouter();
  const { setPage } = usePagination({ defaultPageSize: pageSize });
  const [modalOpen, setModalOpen] = useState(false);
  const [removeModal, setRemoveModal] = useState<{ open: boolean; camera: Camera | null }>({ open: false, camera: null });
  const [editModal, setEditModal] = useState<{ open: boolean; camera: Camera | null }>({ open: false, camera: null });

  const totalPages = Math.ceil(total / pageSize);

  // Stats are approximate for the current page — total counts come from the full dataset count
  const online = cameras.filter((c) => c.status === "Online").length;
  const offline = cameras.filter((c) => c.status === "Offline").length;
  const maintenance = cameras.filter((c) => c.status === "Maintenance").length;
  const unknown = cameras.filter((c) => c.status === "Unknown").length;

  return (
    <>
      <div className="px-4 sm:px-9 py-6 sm:py-8 flex flex-col gap-6">
        <PageTitle
          title="Cameras & devices"
          sub={`${total} cameras across all company sites. Click a camera to view live stream.`}
          actions={
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg font-medium font-sans transition-colors duration-150 cursor-pointer bg-p-blue text-white hover:bg-p-blue-hover active:bg-p-blue-hover px-4 py-2 text-sm"
            >
              <Plus size={15} strokeWidth={2} />
              Add camera
            </button>
          }
        />

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Online" value={String(online)} icon={Wifi} accent="text-p-green" />
          <StatCard label="Offline" value={String(offline)} icon={WifiOff} accent="text-p-red" />
          <StatCard label="Maintenance" value={String(maintenance)} icon={Wrench} accent="text-p-amber" />
          <StatCard label="Unknown" value={String(unknown)} icon={Circle} />
        </div>

        {/* Camera grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cameras.map((camera) => {
            const site = sites.find((s) => s.id === camera.site_id)!;
            return (
              <CameraTile
                key={camera.id}
                camera={camera}
                site={site}
                menu={
                  <ActionMenu
                    actions={[
                      { label: "View details", icon: Eye, onClick: () => router.push(`/cameras/${camera.id}`) },
                      { label: "Edit camera", icon: Pencil, onClick: () => setEditModal({ open: true, camera }) },
                      { divider: true, label: "" },
                      { label: "Remove camera", icon: Trash2, tone: "danger", onClick: () => setRemoveModal({ open: true, camera }) },
                    ]}
                  />
                }
              />
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-3 font-sans tabular-nums">
              {total === 0
                ? "0 cameras"
                : `${(page - 1) * pageSize + 1}\u2013${Math.min(page * pageSize, total)} of ${total}`}
            </span>
            {totalPages > 1 && (
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
            )}
          </div>
        )}
      </div>

      <AddCameraModal open={modalOpen} onClose={() => setModalOpen(false)} companies={companies} sites={sites} />
      <EditCameraModal open={editModal.open} onClose={() => setEditModal({ open: false, camera: null })} camera={editModal.camera} />
      <RemoveCameraModal open={removeModal.open} onClose={() => setRemoveModal({ open: false, camera: null })} camera={removeModal.camera} />
    </>
  );
}
