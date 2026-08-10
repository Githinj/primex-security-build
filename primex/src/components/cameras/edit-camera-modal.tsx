"use client";

import { useEffect, useState, useTransition } from "react";
import { Copy, Check, Radio, Video, Unplug } from "lucide-react";
import { updateCamera } from "@/lib/data/actions/cameras";
import {
  createBroadcast,
  createStreamSource,
  getCameraStreamConfig,
  stopStreamSource,
} from "@/lib/data/actions/streaming";
import { useProfile } from "@/components/providers/profile-provider";
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
  source_url: string;
}

export function EditCameraModal({ open, onClose, camera }: EditCameraModalProps) {
  const profile = useProfile();
  // Only super_admin may assign a stream ID or touch ingest — enforced in
  // createCamera/updateCamera and by migration 018's unique index (SEC-176).
  // Hiding the section keeps managers from filling in a field that would throw.
  const canManageStreaming = profile?.role === "super_admin";

  const [form, setForm] = useState<FormState>({
    name: camera?.name ?? "",
    location: camera?.location ?? "",
    status: camera?.status ?? "",
    stream_id: camera?.stream_id ?? "",
    source_url: "",
  });
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [ingestUrl, setIngestUrl] = useState<string | null>(null);
  const [ingestSecured, setIngestSecured] = useState(true);
  const [copied, setCopied] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [sourceConnected, setSourceConnected] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);

  // Reset form when camera changes
  if (camera && form.name === "" && camera.name !== "") {
    setForm({
      name: camera.name,
      location: camera.location,
      status: camera.status,
      stream_id: camera.stream_id ?? "",
      source_url: "",
    });
  }

  // `source_url` (RTSP credentials) and `stream_url` are not on the Camera type —
  // they never travel in the page payload (SEC-177). Fetch them on open, through
  // the super_admin-gated action.
  const cameraId = camera?.id;
  useEffect(() => {
    if (!open || !cameraId || !canManageStreaming) return;
    let active = true;
    getCameraStreamConfig(cameraId)
      .then((cfg) => {
        if (!active || !cfg) return;
        setForm((f) => ({ ...f, source_url: cfg.source_url ?? "" }));
        setSourceConnected(Boolean(cfg.source_url));
      })
      .catch(() => {
        /* the fields simply stay blank — provisioning still works */
      });
    return () => {
      active = false;
    };
  }, [open, cameraId, canManageStreaming]);

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
          // Omit the key entirely for non-super_admins — the server rejects the
          // field rather than ignoring it (SEC-176).
          ...(canManageStreaming ? { stream_id: form.stream_id || null } : {}),
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
          setIngestSecured(result.secured ?? false);
        } else {
          setBroadcastError(result.error ?? "Failed to create broadcast in Ant Media.");
        }
      } catch (err) {
        setBroadcastError("Failed to create broadcast.");
        console.error(err);
      }
    });
  }

  function handleConnectSource() {
    if (!camera || !form.stream_id.trim() || !form.source_url.trim()) return;
    setSourceError(null);
    startTransition(async () => {
      try {
        const result = await createStreamSource(
          camera.id,
          form.name,
          form.stream_id.trim(),
          form.source_url.trim(),
        );
        if (result.success) {
          setSourceConnected(true);
        } else {
          setSourceError(result.error ?? "Failed to connect the RTSP source.");
        }
      } catch (err) {
        setSourceError("Failed to connect the RTSP source.");
        console.error(err);
      }
    });
  }

  function handleDisconnectSource() {
    if (!camera || !form.stream_id.trim()) return;
    setSourceError(null);
    startTransition(async () => {
      try {
        await stopStreamSource(camera.id, form.stream_id.trim());
        setSourceConnected(false);
      } catch (err) {
        setSourceError("Failed to disconnect the RTSP source.");
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
    setForm({ name: "", location: "", status: "", stream_id: "", source_url: "" });
    setSuccess(false);
    setIngestUrl(null);
    setIngestSecured(true);
    setCopied(false);
    setBroadcastError(null);
    setSourceConnected(false);
    setSourceError(null);
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

              {/* Streaming section — super_admin only (SEC-176) */}
              {canManageStreaming && (
              <div className="border-t border-border pt-4 flex flex-col gap-4">
                <p className="text-xs text-ink-3 font-semibold uppercase tracking-wider font-sans">
                  Streaming
                </p>

                {/* Stream ID */}
                <Field label="Stream ID" hint="Ant Media broadcast identifier. Enter manually or auto-create below. Must be unique across all cameras.">
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
                    {ingestSecured ? (
                      <InfoBox tone="blue">
                        Point your camera&apos;s RTMP output to this URL. It contains a
                        publish token and is shown once — copy it now. Re-create the
                        broadcast to issue a new one.
                      </InfoBox>
                    ) : (
                      <InfoBox tone="amber">
                        This ingest URL has no publish token, so anyone who learns the
                        stream ID can publish into this camera. Token control needs Ant
                        Media Enterprise with <code>ANTMEDIA_API_KEY</code> set.
                      </InfoBox>
                    )}
                  </div>
                )}

                {/* RTSP pull source — Ant Media connects OUT to the camera */}
                <div className="border-t border-border/60 pt-4 flex flex-col gap-3">
                  <p className="text-xs text-ink-3 font-sans font-medium">
                    Or pull from an RTSP source
                  </p>
                  <Field
                    label="RTSP source URL"
                    hint="Ant Media connects to this camera and republishes it under the Stream ID above. Requires a Stream ID."
                  >
                    <TextInput
                      value={form.source_url}
                      onChange={handleChange("source_url")}
                      placeholder="rtsp://user:pass@192.168.1.20:554/Streaming/channels/101"
                    />
                  </Field>

                  {sourceConnected ? (
                    <>
                      <InfoBox tone="green">
                        RTSP source connected. Ant Media is pulling the feed — it will appear
                        in the live player once frames arrive.
                      </InfoBox>
                      <Button
                        type="button"
                        variant="secondary"
                        icon={Unplug}
                        onClick={handleDisconnectSource}
                        disabled={isPending}
                      >
                        {isPending ? "Disconnecting…" : "Disconnect source"}
                      </Button>
                    </>
                  ) : (
                    form.source_url.trim() &&
                    form.stream_id.trim() && (
                      <Button
                        type="button"
                        variant="secondary"
                        icon={Video}
                        onClick={handleConnectSource}
                        disabled={isPending}
                      >
                        {isPending ? "Connecting…" : "Connect RTSP source"}
                      </Button>
                    )
                  )}

                  {sourceError && <InfoBox tone="amber">{sourceError}</InfoBox>}
                </div>

                {!form.stream_id.trim() && (
                  <InfoBox tone="amber">
                    No stream ID assigned. This camera will show status indicators only — no live feed.
                  </InfoBox>
                )}
              </div>
              )}
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
