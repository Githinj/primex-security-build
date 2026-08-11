"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Camera, AlertTriangle, X } from "lucide-react";
import { Card, Pill, Button, KV, Breadcrumb } from "@/components/ui";
import { severityTone } from "@/lib/utils";
import { updateAlertStatus } from "@/lib/data/actions/alerts";
import type { Alert, Site, Camera as CameraType } from "@/lib/types";

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

const TIMELINE = [
  { label: "Alert raised", detail: "Signal received and logged." },
  { label: "Incident opened", detail: "Linked incident created automatically." },
  { label: "Under review", detail: "Dispatcher assigned for review." },
];

interface AlertDetailClientProps {
  alert: Alert;
  site: Site;
  camera: CameraType | null;
  /** Short-lived presigned URL for `alert.frame_url`, signed on the server. */
  frameUrl: string | null;
}

export function AlertDetailClient({ alert, site, camera, frameUrl }: AlertDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleEscalate = () =>
    startTransition(async () => {
      try {
        await updateAlertStatus(alert.id, 'Escalated');
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });

  const handleClose = () =>
    startTransition(async () => {
      try {
        await updateAlertStatus(alert.id, 'Closed');
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });

  return (
    <div className="px-4 sm:px-9 py-6 sm:py-8 flex flex-col gap-6 max-w-5xl">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: "Alerts", onClick: () => router.push("/alerts") }, alert.title]} />

      {/* Header */}
      <div className="flex flex-col gap-3">
        {/* Pills + meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Pill tone={severityTone(alert.severity)} dot>
            {alert.severity}
          </Pill>
          <Pill tone="gray">{alert.status}</Pill>
          <span className="text-ink-4 text-sm font-sans">·</span>
          <span className="text-ink-3 text-sm font-sans">{alert.source}</span>
          <span className="text-ink-4 text-sm font-sans">·</span>
          <span className="text-ink-3 text-xs tabular-nums font-sans">
            {formatTime(alert.created_at)}
          </span>
        </div>

        {/* Title */}
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-ink leading-snug">
          {alert.title}
        </h1>

        {/* Location */}
        <div className="flex items-center gap-4 font-sans flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-sm text-ink-2">
            <MapPin size={14} strokeWidth={2} className="text-ink-4 flex-shrink-0" />
            {site.name}
          </span>
          {camera && (
            <span className="inline-flex items-center gap-1.5 text-sm text-ink-2">
              <Camera size={14} strokeWidth={2} className="text-ink-4 flex-shrink-0" />
              {camera.name} — {camera.location}
            </span>
          )}
        </div>
      </div>

      {/* AI frame snapshot or camera placeholder */}
      {frameUrl ? (
        <div className="w-full max-w-lg rounded-xl overflow-hidden border border-border">
          <div className="relative" style={{ aspectRatio: "16/9" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={frameUrl}
              alt={`AI detection frame — ${alert.title}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
              {alert.event_type && (
                <Pill tone="blue" size="sm">
                  {alert.event_type.replace(/_/g, ' ')}
                </Pill>
              )}
              {alert.confidence != null && (
                <Pill tone="gray" size="sm">
                  {(alert.confidence * 100).toFixed(0)}% confidence
                </Pill>
              )}
            </div>
            <div className="absolute top-2.5 right-2.5">
              <Pill tone="blue" size="sm">AI</Pill>
            </div>
          </div>
          {camera && (
            <div className="px-3 py-2 bg-surface flex items-center justify-between font-sans">
              <span className="text-xs text-ink-3">{camera.name} — {camera.location}</span>
              <Pill tone={camera.status === "Online" ? "green" : camera.status === "Offline" ? "red" : "amber"} size="sm">
                {camera.status}
              </Pill>
            </div>
          )}
        </div>
      ) : camera ? (
        <div className="w-full max-w-sm rounded-xl overflow-hidden border border-border">
          <div className="bg-navy flex flex-col items-center justify-center gap-3 h-44">
            <Camera size={28} strokeWidth={1.5} className="text-white/30" />
            <span className="text-white/40 text-xs font-sans tracking-wide">
              {camera.name} — {camera.location}
            </span>
          </div>
          <div className="px-3 py-2 bg-surface flex items-center justify-between font-sans">
            <span className="text-xs text-ink-3">{camera.name}</span>
            <Pill tone={camera.status === "Online" ? "green" : camera.status === "Offline" ? "red" : "amber"} size="sm">
              {camera.status}
            </Pill>
          </div>
        </div>
      ) : null}

      {/* Two-column body */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-5">
        {/* Left: Description + Timeline */}
        <Card className="flex flex-col gap-6">
          {/* Description */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-ink-3 font-semibold uppercase tracking-wider font-sans">
              Description
            </p>
            <p className="text-sm text-ink-2 font-sans leading-relaxed">
              {alert.description}
            </p>
          </div>

          {/* Timeline */}
          <div className="flex flex-col gap-1">
            <p className="text-xs text-ink-3 font-semibold uppercase tracking-wider font-sans mb-3">
              Timeline
            </p>
            <ol className="flex flex-col gap-0">
              {TIMELINE.map((item, i) => (
                <li key={i} className="flex items-start gap-3 font-sans">
                  {/* Dot + line */}
                  <div className="flex flex-col items-center flex-shrink-0 mt-1">
                    <span
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        i === 0
                          ? "bg-p-blue"
                          : i === 1
                          ? "bg-p-amber"
                          : "bg-p-gray"
                      }`}
                    />
                    {i < TIMELINE.length - 1 && (
                      <span className="w-px flex-1 bg-border mt-1 min-h-[20px]" />
                    )}
                  </div>
                  {/* Text */}
                  <div className="pb-4">
                    <p className="text-sm font-medium text-ink">{item.label}</p>
                    <p className="text-xs text-ink-3">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Card>

        {/* Right: Actions + Site context */}
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <p className="text-xs text-ink-3 font-semibold uppercase tracking-wider font-sans">
              Actions
            </p>
            <Button
              variant="secondary"
              icon={AlertTriangle}
              full
              onClick={handleEscalate}
              disabled={isPending}
            >
              {isPending ? 'Updating…' : 'Escalate'}
            </Button>
            <Button
              variant="danger"
              icon={X}
              full
              onClick={handleClose}
              disabled={isPending}
            >
              Close alert
            </Button>
          </Card>

          <Card className="flex flex-col gap-3">
            <p className="text-xs text-ink-3 font-semibold uppercase tracking-wider font-sans">
              Site context
            </p>
            <div className="flex flex-col gap-2.5">
              <KV k="Site" v={site.name} />
              <KV k="Type" v={site.type} />
              <KV k="Address" v={site.address} />
              <KV k="Risk" v={<Pill tone={site.risk === "High" ? "red" : site.risk === "Medium" ? "amber" : "green"} size="sm">{site.risk}</Pill>} />
              <KV k="Status" v={site.status} />
              <KV k="Cameras" v={`${site.cameras} installed`} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
