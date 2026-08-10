"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Card, KV, Button, Label, Pill, Breadcrumb } from "@/components/ui";
import { CameraPlayer } from "@/components/streaming/camera-player";
import { RecordingTimeline } from "@/components/streaming/recording-timeline";
import { RecordingPlayer } from "@/components/streaming/recording-player";
import { cameraTone } from "@/lib/utils";
import { deleteCamera } from "@/lib/data/actions/cameras";
import { toggleCameraAi } from "@/lib/data/actions/camera-ai-config";
import type { Camera, Site, CameraAiConfig, Recording } from "@/lib/types";

interface CameraDetailClientProps {
  camera: Camera;
  site: Site;
  aiConfig: CameraAiConfig | null;
  recordings: Recording[];
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

export function CameraDetailClient({ camera, site, aiConfig, recordings }: CameraDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<'live' | 'playback'>('live');
  const [activeRecording, setActiveRecording] = useState<Recording | null>(null);
  const [seekTimestamp, setSeekTimestamp] = useState<Date | null>(null);

  const tone = cameraTone(camera.status);

  const handleSeek = (timestamp: Date, recording: Recording) => {
    setMode('playback');
    setActiveRecording(recording);
    setSeekTimestamp(timestamp);
  };

  const handleLive = () => {
    setMode('live');
    setActiveRecording(null);
    setSeekTimestamp(null);
  };

  return (
    <div className="px-4 sm:px-9 py-6 sm:py-8 flex flex-col gap-6 max-w-4xl">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: "Cameras", onClick: () => router.push("/cameras") }, camera.name]} />

      {/* Live player or recording player */}
      <div className="w-full max-w-2xl">
        {mode === 'live' ? (
          <CameraPlayer
            cameraId={camera.id}
            cameraName={camera.name}
            status={camera.status}
          />
        ) : activeRecording ? (
          <RecordingPlayer
            recording={activeRecording}
            seekToTimestamp={seekTimestamp ?? undefined}
            cameraName={camera.name}
          />
        ) : null}
      </div>

      {/* Recording timeline */}
      <div className="w-full max-w-2xl">
        <RecordingTimeline
          cameraId={camera.id}
          initialRecordings={recordings}
          onSeek={handleSeek}
          onLive={handleLive}
          isLive={mode === 'live'}
        />
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
            {camera.stream_id && <KV k="Stream ID" v={camera.stream_id} />}
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

        {/* Actions */}
        <Card className="flex flex-col gap-3">
          <Label>Actions</Label>
          <div className="flex flex-col gap-2 mt-1">
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
