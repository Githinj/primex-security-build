"use client";

import { useState } from "react";
import { Wifi, WifiOff, Wrench, Circle, Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageTitle, StatCard, ActionMenu } from "@/components/ui";
import { CameraTile } from "@/components/sites/camera-tile";
import { AddCameraModal } from "@/components/sites/add-camera-modal";
import { RemoveCameraModal } from "@/components/cameras/remove-camera-modal";
import { EditCameraModal } from "@/components/cameras/edit-camera-modal";
import type { Camera, Site, Company } from "@/lib/types";

interface CamerasClientProps {
  cameras: Camera[];
  sites: Site[];
  companies: Company[];
}

export function CamerasClient({ cameras, sites, companies }: CamerasClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [removeModal, setRemoveModal] = useState<{ open: boolean; camera: Camera | null }>({ open: false, camera: null });
  const [editModal, setEditModal] = useState<{ open: boolean; camera: Camera | null }>({ open: false, camera: null });

  const online = cameras.filter((c) => c.status === "Online").length;
  const offline = cameras.filter((c) => c.status === "Offline").length;
  const maintenance = cameras.filter((c) => c.status === "Maintenance").length;
  const unknown = cameras.filter((c) => c.status === "Unknown").length;

  return (
    <>
      <div className="px-4 sm:px-9 py-6 sm:py-8 flex flex-col gap-6">
        <PageTitle
          title="Cameras & devices"
          sub="Manage cameras across all company sites. Click a camera to view live stream."
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
          <StatCard
            label="Online"
            value={String(online)}
            icon={Wifi}
            accent="text-p-green"
          />
          <StatCard
            label="Offline"
            value={String(offline)}
            icon={WifiOff}
            accent="text-p-red"
          />
          <StatCard
            label="Maintenance"
            value={String(maintenance)}
            icon={Wrench}
            accent="text-p-amber"
          />
          <StatCard
            label="Unknown"
            value={String(unknown)}
            icon={Circle}
          />
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
                      {
                        label: "View details",
                        icon: Eye,
                        onClick: () => router.push(`/cameras/${camera.id}`),
                      },
                      {
                        label: "Edit camera",
                        icon: Pencil,
                        onClick: () => setEditModal({ open: true, camera }),
                      },
                      { divider: true, label: "" },
                      {
                        label: "Remove camera",
                        icon: Trash2,
                        tone: "danger",
                        onClick: () => setRemoveModal({ open: true, camera }),
                      },
                    ]}
                  />
                }
              />
            );
          })}
        </div>
      </div>

      <AddCameraModal open={modalOpen} onClose={() => setModalOpen(false)} companies={companies} sites={sites} />
      <EditCameraModal
        open={editModal.open}
        onClose={() => setEditModal({ open: false, camera: null })}
        camera={editModal.camera}
      />
      <RemoveCameraModal
        open={removeModal.open}
        onClose={() => setRemoveModal({ open: false, camera: null })}
        camera={removeModal.camera}
      />
    </>
  );
}
