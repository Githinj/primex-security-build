"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { Card, KV, Button, Label, Pill } from "@/components/ui";
import { CameraTile } from "@/components/sites/camera-tile";
import { cameraTone } from "@/lib/utils";
import type { Camera, Site } from "@/lib/types";

interface CameraDetailClientProps {
  camera: Camera;
  site: Site;
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

export function CameraDetailClient({ camera, site }: CameraDetailClientProps) {
  const router = useRouter();

  const tone = cameraTone(camera.status);

  return (
    <div className="px-9 py-8 flex flex-col gap-6 max-w-4xl">
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
      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-5 items-start">
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
              variant="secondary"
              icon={Pencil}
              full
              onClick={() => {}}
            >
              Edit camera
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              full
              onClick={() => {}}
            >
              Remove camera
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
