"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Radio } from "lucide-react";
import { updateCamera } from "@/lib/data/actions/cameras";
import { createBroadcast } from "@/lib/data/actions/streaming";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  SuccessState,
  Field,
  TextInput,
  Select,
  InfoBox,
  Button,
} from "@/components/ui";
import type { Camera } from "@/lib/types";

interface EditCameraModalProps {
  open: boolean;
  onClose: () => void;
  camera: Camera | null;
}

interface FormState {
  name: string;
  location: string;
  status: string;
  stream_id: string;
}

export function EditCameraModal({ open, onClose, camera }: EditCameraModalProps) {
  const [form, setForm] = useState<FormState>({
    name: camera?.name ?? "",
    location: camera?.location ?? "",
    status: camera?.status ?? "",
    stream_id: camera?.stream_id ?? "",
  });
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [ingestUrl, setIngestUrl] = useState<string | null>(camera?.stream_url ?? null);
  const [copied, setCopied] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  // Reset form when camera changes
  if (camera && form.name === "" && camera.name !== "") {
    setForm({
      name: camera.name,
      location: camera.location,
      status: camera.status,
      stream_id: camera.stream_id ?? "",
    });
    setIngestUrl(camera.stream_url ?? null);
  }

  function handleChange(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!camera) return;
    startTransition(async () => {
      try {
        await updateCamera(camera.id, {
          name: form.name,
          location: form.location,
          status: form.status,
          stream_id: form.stream_id || null,
        });
        setSuccess(true);
      } catch (err) {
        console.error("Failed to update camera:", err);
      }
    });
  }

  function handleCreateBroadcast() {
    if (!camera || !form.stream_id.trim()) return;
    setBroadcastError(null);
    startTransition(async () => {
      try {
        const result = await createBroadcast(camera.id, form.name, form.stream_id.trim());
        if (result.success && result.ingestUrl) {
          setIngestUrl(result.ingestUrl);
        } else {
          setBroadcastError("Failed to create broadcast in Ant Media.");
        }
      } catch (err) {
        setBroadcastError("Failed to create broadcast.");
        console.error(err);
      }
    });
  }

  function handleCopy() {
    if (!ingestUrl) return;
    navigator.clipboard.writeText(ingestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    setForm({ name: "", location: "", status: "", stream_id: "" });
    setSuccess(false);
    setIngestUrl(null);
    setCopied(false);
    setBroadcastError(null);
    onClose();
  }

  if (!camera) return null;

  const statusOptions = [
    { value: "Online", label: "Online" },
    { value: "Maintenance", label: "Maintenance" },
    { value: "Unknown", label: "Unknown" },
  ];

  const canSubmit = form.name.trim() && form.location.trim() && form.status;

  return (
    <Modal open={open} onClose={handleClose}>
      {success ? (
        <SuccessState
          title="Camera updated."
          sub={`${form.name} has been updated successfully.`}
          onDone={handleClose}
        />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <ModalHeader
            title={`Edit ${camera.name}`}
            sub="Update camera details and streaming configuration."
            onClose={handleClose}
          />

          <ModalBody>
            <div className="flex flex-col gap-5">
              {/* Camera name */}
              <Field label="Camera name" required>
                <TextInput
                  value={form.name}
                  onChange={handleChange("name")}
                  placeholder="e.g. CAM-09"
                />
              </Field>

              {/* Location */}
              <Field label="Location" required hint="Physical position of the camera.">
                <TextInput
                  value={form.location}
                  onChange={handleChange("location")}
                  placeholder="e.g. Loading Dock North"
                />
              </Field>

              {/* Status */}
              <Field label="Status" required>
                <Select
                  value={form.status}
                  onChange={handleChange("status")}
                  options={statusOptions}
                  placeholder="Select status"
                />
              </Field>

              {/* Streaming section */}
              <div className="border-t border-border pt-4 flex flex-col gap-4">
                <p className="text-xs text-ink-3 font-semibold uppercase tracking-wider font-sans">
                  Streaming
                </p>

                {/* Stream ID */}
                <Field label="Stream ID" hint="Ant Media broadcast identifier. Enter manually or auto-create below.">
                  <TextInput
                    value={form.stream_id}
                    onChange={handleChange("stream_id")}
                    placeholder="e.g. cam-01-westfield"
                  />
                </Field>

                {/* Auto-create broadcast button */}
                {form.stream_id.trim() && !ingestUrl && (
                  <Button
                    type="button"
                    variant="secondary"
                    icon={Radio}
                    onClick={handleCreateBroadcast}
                    disabled={isPending}
                  >
                    {isPending ? "Creating…" : "Create broadcast in Ant Media"}
                  </Button>
                )}

                {broadcastError && (
                  <InfoBox tone="amber">{broadcastError}</InfoBox>
                )}

                {/* Ingest URL display */}
                {ingestUrl && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-ink-3 font-sans font-medium">Ingest URL</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-surface-subtle border border-border rounded-lg px-3 py-2 font-mono text-ink-2 truncate">
                        {ingestUrl}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="flex-shrink-0 p-2 rounded-lg border border-border hover:bg-surface-subtle transition-colors cursor-pointer"
                      >
                        {copied ? (
                          <Check size={14} className="text-p-green" />
                        ) : (
                          <Copy size={14} className="text-ink-3" />
                        )}
                      </button>
                    </div>
                    <InfoBox tone="blue">
                      Point your camera&apos;s RTSP/RTMP output to this URL. The stream will appear in the live player once connected.
                    </InfoBox>
                  </div>
                )}

                {!form.stream_id.trim() && (
                  <InfoBox tone="amber">
                    No stream ID assigned. This camera will show status indicators only — no live feed.
                  </InfoBox>
                )}
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button variant="secondary" onClick={handleClose} type="button">
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={!canSubmit || isPending}
            >
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
