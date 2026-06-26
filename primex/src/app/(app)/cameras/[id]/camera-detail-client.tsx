"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  Trash2,
} from "lucide-react";
import { Card, KV, Button, Label, Pill } from "@/components/ui";
import { CameraTile } from "@/components/sites/camera-tile";
import { cameraTone } from "@/lib/utils";
import { deleteCamera } from "@/lib/data/actions/cameras";
import { toggleCameraAi } from "@/lib/data/actions/camera-ai-config";
import type { Camera, Site, CameraAiConfig } from "@/lib/types";

interface CameraDetailClientProps {
  camera: Camera;
  site: Site;
  aiConfig: CameraAiConfig | null;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function CameraDetailClient({ camera, site, aiConfig }: CameraDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const tone = cameraTone(camera.status);

  return (
    <div className="px-4 sm:px-9 py-6 sm:py-8 flex flex-col gap-6 max-w-4xl">
      {/* Back nav */}
      <button
        type="button"
        onClick={() => router.push("/cameras")}
        className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink transition-colors duration-100 font-sans cursor-pointer w-fit"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Back to Cameras
      </button>

      {/* Camera tile preview - large */}
      <div className="w-full max-w-md">
        <CameraTile camera={camera} site={site} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4 md:gap-5 items-start">
        {/* Left: Camera info */}
        <Card className="flex flex-col gap-5">
          <Label>Camera info</Label>
          <div className="flex flex-col gap-3">
            <KV k="Name" v={camera.name} />
            <KV k="Location" v={camera.location} />
            <KV k="Site" v={site.name} />
            <KV
              k="Status"
              v={
                <Pill tone={tone} dot size="sm">
                  {camera.status}
                </Pill>
              }
            />
            <KV k="Last checked" v={formatTime(camera.last_checked)} />
            <KV
              k="Warning"
              v={
                camera.warning ? (
                  <span className="text-p-amber font-medium">{camera.warning}</span>
                ) : (
                  <span className="text-ink-4">None</span>
                )
              }
            />
          </div>
        </Card>

        {/* AI Detection config */}
        <Card className="flex flex-col gap-5">
          <Label>AI Detection</Label>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink font-sans">Status</span>
              <button
                type="button"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 cursor-pointer ${
                  aiConfig?.enabled ? 'bg-p-blue' : 'bg-p-gray/30'
                }`}
                onClick={() => startTransition(async () => {
                  try {
                    await toggleCameraAi(camera.id, !(aiConfig?.enabled ?? false));
                    router.refresh();
                  } catch (err) {
                    console.error(err);
                  }
                })}
                disabled={isPending}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    aiConfig?.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <KV k="Zones configured" v={String(aiConfig?.zones?.length ?? 0)} />
            {aiConfig?.zones && aiConfig.zones.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {aiConfig.zones.map((z) => (
                  <Pill key={z.name} tone="blue" size="sm">
                    {z.name} ({z.type})
                  </Pill>
                ))}
              </div>
            )}
            {!aiConfig && (
              <p className="text-xs text-ink-4 font-sans">
                No AI config. Detection will be enabled when the camera is assigned a stream.
              </p>
            )}
          </div>
        </Card>

        {/* Right: Actions */}
        <Card className="flex flex-col gap-3">
          <Label>Actions</Label>
          <div className="flex flex-col gap-2 mt-1">
            {/* View live - Phase 2 disabled */}
            <Button
              variant="primary"
              icon={Eye}
              full
              disabled
            >
              View live (Phase 2)
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              full
              disabled={isPending}
              onClick={() => startTransition(async () => {
                try {
                  await deleteCamera(camera.id);
                  router.push('/cameras');
                } catch (err) {
                  console.error(err);
                }
              })}
            >
              {isPending ? 'Removing…' : 'Remove camera'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
