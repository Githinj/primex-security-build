"use client";

import { useState } from "react";
import { Plus, Camera as CameraIcon, Pencil, Trash2 } from "lucide-react";
import { PageTitle, Button, Card, ActionMenu, Pagination } from "@/components/ui";
import { CameraTile } from "@/components/sites/camera-tile";
import { AddCameraModal } from "@/components/sites/add-camera-modal";
import { EditCameraModal } from "@/components/cameras/edit-camera-modal";
import { RemoveCameraModal } from "@/components/cameras/remove-camera-modal";
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
  const [editModal, setEditModal] = useState<{ open: boolean; camera: Camera | null }>({ open: false, camera: null });
  const [removeModal, setRemoveModal] = useState<{ open: boolean; camera: Camera | null }>({ open: false, camera: null });
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedCameras.map((camera) => {
              const site = sites.find((s) => s.id === camera.site_id);
              if (!site) return null;
              return (
                <CameraTile
                  key={camera.id}
                  camera={camera}
                  site={site}
                  menu={
                    <ActionMenu
                      actions={[
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
        ) : (
          <Card>
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-14 h-14 rounded-full bg-surface-subtle flex items-center justify-center">
                <CameraIcon size={24} className="text-ink-4" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-ink mb-1">No cameras yet</p>
                <p className="text-xs text-ink-3 max-w-[300px]">
                  Add cameras to your sites to start monitoring live feeds, recording events, and receiving AI-powered alerts.
                </p>
              </div>
              <Button variant="primary" icon={Plus} onClick={() => setAddOpen(true)}>
                Add your first camera
              </Button>
            </div>
          </Card>
        )}

        {cameras.length > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={cameras.length} onPageChange={setPage} itemLabel="cameras" />
        )}
      </div>

      <AddCameraModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        companies={[company]}
        sites={sites}
      />
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
