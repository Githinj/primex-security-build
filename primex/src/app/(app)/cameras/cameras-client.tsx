"use client";

import { useState } from "react";
import { Wifi, WifiOff, Wrench, Circle, Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageTitle, StatCard, ActionMenu, Pagination, Button } from "@/components/ui";
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
            <Button variant="primary" icon={Plus} onClick={() => setModalOpen(true)}>
              Add camera
            </Button>
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
        {total > 0 && (
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="cameras" />
        )}
      </div>

      <AddCameraModal open={modalOpen} onClose={() => setModalOpen(false)} companies={companies} sites={sites} />
      <EditCameraModal open={editModal.open} onClose={() => setEditModal({ open: false, camera: null })} camera={editModal.camera} />
      <RemoveCameraModal open={removeModal.open} onClose={() => setRemoveModal({ open: false, camera: null })} camera={removeModal.camera} />
    </>
  );
}
