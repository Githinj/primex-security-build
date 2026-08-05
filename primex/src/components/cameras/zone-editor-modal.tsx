"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ImageOff } from "lucide-react";
import { updateCameraZones } from "@/lib/data/actions/camera-ai-config";
import { getCameraSnapshot } from "@/lib/data/actions/streaming";
import {
  MIN_ZONE_SIZE,
  ZONE_TYPES,
  ZONE_TYPE_HELP,
  ZONE_TYPE_LABELS,
  normalizeZones,
  type AiZoneInput,
  type ZoneType,
} from "@/lib/ai-zones";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Field,
  TextInput,
  Select,
  InfoBox,
  Button,
  Pill,
} from "@/components/ui";
import type { AiZone } from "@/lib/types";

const ZONE_TONES: Record<ZoneType, { stroke: string; fill: string; pill: "blue" | "amber" | "red" }> = {
  entry: { stroke: "#2563eb", fill: "rgba(37, 99, 235, 0.18)", pill: "blue" },
  door: { stroke: "#d97706", fill: "rgba(217, 119, 6, 0.18)", pill: "amber" },
  restricted: { stroke: "#dc2626", fill: "rgba(220, 38, 38, 0.18)", pill: "red" },
};

const typeOptions = ZONE_TYPES.map((t) => ({ value: t, label: ZONE_TYPE_LABELS[t] }));

interface Draft {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface ZoneEditorModalProps {
  open: boolean;
  onClose: () => void;
  cameraId: string;
  cameraName: string;
  zones: AiZone[];
}

export function ZoneEditorModal({
  open,
  onClose,
  cameraId,
  cameraName,
  zones,
}: ZoneEditorModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<AiZoneInput[]>(() => zones as AiZoneInput[]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<ZoneType>("entry");

  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [snapshotLoaded, setSnapshotLoaded] = useState(false);

  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const fetchedFor = useRef<string | null>(null);

  // Re-seed when a different camera is opened, matching EditSiteModal's pattern.
  const [seededId, setSeededId] = useState<string | null>(null);
  if (cameraId !== seededId) {
    setSeededId(cameraId);
    setItems(zones as AiZoneInput[]);
    setDraft(null);
    setName("");
    setType("entry");
    setError(null);
    setSnapshot(null);
    setSnapshotLoaded(false);
  }

  // Fetch once per camera, on first open. The ref guard means the effect body
  // stays free of synchronous setState — state only changes in the callbacks.
  useEffect(() => {
    if (!open || fetchedFor.current === cameraId) return;
    fetchedFor.current = cameraId;

    let cancelled = false;
    getCameraSnapshot(cameraId)
      .then((url) => {
        if (!cancelled) setSnapshot(url);
      })
      .catch(() => {
        if (!cancelled) setSnapshot(null);
      })
      .finally(() => {
        if (!cancelled) setSnapshotLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [open, cameraId]);

  function pointFromEvent(e: React.PointerEvent): { x: number; y: number } | null {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    // Fractions of the surface — the same 0–1 space the worker uses, so the
    // drawing is resolution-independent by construction.
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  }

  function handlePointerDown(e: React.PointerEvent) {
    const point = pointFromEvent(e);
    if (!point) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = point;
    setDraft({ x1: point.x, y1: point.y, x2: point.x, y2: point.y });
    setError(null);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragStart.current) return;
    const point = pointFromEvent(e);
    if (!point) return;
    setDraft({
      x1: dragStart.current.x,
      y1: dragStart.current.y,
      x2: point.x,
      y2: point.y,
    });
  }

  function handlePointerUp() {
    if (!dragStart.current || !draft) return;
    dragStart.current = null;

    const width = Math.abs(draft.x2 - draft.x1);
    const height = Math.abs(draft.y2 - draft.y1);
    if (width < MIN_ZONE_SIZE || height < MIN_ZONE_SIZE) {
      // A click rather than a drag — discard rather than creating a sliver.
      setDraft(null);
    }
  }

  function addDraft() {
    if (!draft) return;
    const zone: AiZoneInput = {
      name: name.trim(),
      type,
      coords: { x1: draft.x1, y1: draft.y1, x2: draft.x2, y2: draft.y2 },
    };
    try {
      // Validate this one against the others so duplicate names surface now,
      // not after the round trip.
      normalizeZones([...items, zone]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That zone isn't valid.");
      return;
    }
    setItems((prev) => [...prev, zone]);
    setDraft(null);
    setName("");
    setError(null);
  }

  function removeZone(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  }

  function handleSave() {
    try {
      normalizeZones(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Those zones aren't valid.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await updateCameraZones(cameraId, items);
        router.refresh();
        onClose();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong. Please try again.",
        );
      }
    });
  }

  const draftBox = draft
    ? {
        left: `${Math.min(draft.x1, draft.x2) * 100}%`,
        top: `${Math.min(draft.y1, draft.y2) * 100}%`,
        width: `${Math.abs(draft.x2 - draft.x1) * 100}%`,
        height: `${Math.abs(draft.y2 - draft.y1) * 100}%`,
      }
    : null;

  return (
    <Modal open={open} onClose={onClose} width="max-w-3xl">
      <ModalHeader
        eyebrow="Cameras"
        title="Detection zones"
        sub={`Drag on the frame to draw a zone for ${cameraName}.`}
        onClose={onClose}
      />

      <ModalBody>
        <div className="flex flex-col gap-5">
          {/* Drawing surface */}
          <div
            ref={surfaceRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative w-full overflow-hidden rounded-xl border border-border bg-surface select-none touch-none cursor-crosshair"
            style={{ aspectRatio: "16/9" }}
          >
            {snapshot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={snapshot}
                alt={`Live frame from ${cameraName}`}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                draggable={false}
              />
            ) : (
              <div
                className="absolute inset-0 pointer-events-none opacity-60"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(127,127,127,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(127,127,127,0.18) 1px, transparent 1px)",
                  backgroundSize: "10% 10%",
                }}
              />
            )}

            {items.map((zone, i) => {
              const tone = ZONE_TONES[zone.type];
              return (
                <div
                  key={`${zone.name}-${i}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${zone.coords.x1 * 100}%`,
                    top: `${zone.coords.y1 * 100}%`,
                    width: `${(zone.coords.x2 - zone.coords.x1) * 100}%`,
                    height: `${(zone.coords.y2 - zone.coords.y1) * 100}%`,
                    border: `2px solid ${tone.stroke}`,
                    background: tone.fill,
                  }}
                >
                  <span
                    className="absolute -top-0.5 left-0 px-1.5 py-0.5 text-[10px] font-sans font-semibold text-white rounded-br"
                    style={{ background: tone.stroke }}
                  >
                    {zone.name}
                  </span>
                </div>
              );
            })}

            {draftBox && (
              <div
                className="absolute pointer-events-none border-2 border-dashed"
                style={{
                  ...draftBox,
                  borderColor: ZONE_TONES[type].stroke,
                  background: ZONE_TONES[type].fill,
                }}
              />
            )}

            {!snapshotLoaded && (
              <span className="absolute inset-0 flex items-center justify-center text-xs text-ink-4 font-sans pointer-events-none">
                Loading frame…
              </span>
            )}
          </div>

          {snapshotLoaded && !snapshot && (
            <InfoBox tone="blue">
              <span className="inline-flex items-center gap-1.5">
                <ImageOff size={14} strokeWidth={2} />
                No live frame available — drawing over a plain grid instead.
              </span>{" "}
              Snapshots need Ant Media Enterprise, a publishing camera, and REST access
              from this server. Zones drawn here still apply correctly; you just
              can&apos;t see the scene.
            </InfoBox>
          )}

          {/* Draft controls */}
          {draft ? (
            <div className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-surface">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Zone name" required>
                  <TextInput
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Main Entry"
                    autoFocus
                  />
                </Field>
                <Field label="Type" required hint={ZONE_TYPE_HELP[type]}>
                  <Select
                    value={type}
                    onChange={(e) => setType(e.target.value as ZoneType)}
                    options={typeOptions}
                  />
                </Field>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="primary" onClick={addDraft}>
                  Add zone
                </Button>
                <Button variant="secondary" onClick={() => setDraft(null)}>
                  Discard
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-3 font-sans">
              Drag a rectangle on the frame above to start a new zone.
            </p>
          )}

          {/* Existing zones */}
          {items.length > 0 && (
            <div className="flex flex-col gap-2">
              {items.map((zone, i) => (
                <div
                  key={`${zone.name}-${i}`}
                  className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-b-0"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ background: ZONE_TONES[zone.type].stroke }}
                    />
                    <span className="text-sm text-ink font-sans truncate">{zone.name}</span>
                    <Pill tone={ZONE_TONES[zone.type].pill} size="sm">
                      {ZONE_TYPE_LABELS[zone.type]}
                    </Pill>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeZone(i)}
                    aria-label={`Remove ${zone.name}`}
                    className="text-ink-4 hover:text-p-red transition-colors duration-100 cursor-pointer flex-shrink-0"
                  >
                    <Trash2 size={15} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <InfoBox tone="blue">
            Zone types drive different detections. Entry zones trigger concealment
            alerts, restricted zones trigger vehicle alerts, and door zones are used for
            door-left-open alerts. A camera with no zones still detects loitering and
            after-hours motion.
          </InfoBox>

          {error && <InfoBox tone="amber">{error}</InfoBox>}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save zones"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
