"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Radio, Video } from "lucide-react";
import { createCamera } from "@/lib/data/actions/cameras";
import { createBroadcast, createStreamSource } from "@/lib/data/actions/streaming";
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
import type { Company, Site } from "@/lib/types";

interface AddCameraModalProps {
  open: boolean;
  onClose: () => void;
  companies: Company[];
  sites: Site[];
}

interface FormState {
  company_id: string;
  site_id: string;
  name: string;
  location: string;
  status: string;
  stream_id: string;
  source_url: string;
}

const INITIAL_FORM: FormState = {
  company_id: "",
  site_id: "",
  name: "",
  location: "",
  status: "",
  stream_id: "",
  source_url: "",
};

export function AddCameraModal({ open, onClose, companies, sites: allSites }: AddCameraModalProps) {
  const profile = useProfile();
  // Only super_admin may assign a stream ID or provision ingest — enforced in
  // createCamera and by migration 018's unique index (SEC-176). Hiding the
  // section keeps managers from filling in a field that would throw on submit.
  const canManageStreaming = profile?.role === "super_admin";

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [createdCameraId, setCreatedCameraId] = useState<string | null>(null);
  const [ingestUrl, setIngestUrl] = useState<string | null>(null);
  const [ingestSecured, setIngestSecured] = useState(true);
  const [copied, setCopied] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [sourceConnected, setSourceConnected] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);

  const companyOptions = companies.map((c) => ({ value: c.id, label: c.name }));

  const siteOptions = allSites.filter((s) =>
    form.company_id ? s.company_id === form.company_id : true
  ).map((s) => ({ value: s.id, label: s.name }));

  const statusOptions = [
    { value: "Online", label: "Online" },
    { value: "Maintenance", label: "Maintenance" },
    { value: "Unknown", label: "Unknown" },
  ];

  function handleCompanyChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setForm((f) => ({ ...f, company_id: e.target.value, site_id: "" }));
  }

  function handleChange(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const cameraId = await createCamera({
          site_id: form.site_id,
          name: form.name,
          location: form.location,
          status: form.status || undefined,
          // Omit the key entirely for non-super_admins — the server rejects the
          // field rather than ignoring it (SEC-176).
          ...(canManageStreaming ? { stream_id: form.stream_id.trim() || null } : {}),
        });
        setCreatedCameraId(cameraId);
        setSuccess(true);
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  function handleCreateBroadcast() {
    if (!createdCameraId || !form.stream_id.trim()) return;
    setBroadcastError(null);
    startTransition(async () => {
      try {
        const result = await createBroadcast(createdCameraId, form.name, form.stream_id.trim());
        if (result.success && result.ingestUrl) {
          setIngestUrl(result.ingestUrl);
          setIngestSecured(result.secured ?? false);
        } else {
          setBroadcastError(result.error ?? "Failed to create broadcast in Ant Media.");
        }
      } catch {
        setBroadcastError("Failed to create broadcast.");
      }
    });
  }

  function handleConnectSource() {
    if (!createdCameraId || !form.stream_id.trim() || !form.source_url.trim()) return;
    setSourceError(null);
    startTransition(async () => {
      try {
        const result = await createStreamSource(
          createdCameraId,
          form.name,
          form.stream_id.trim(),
          form.source_url.trim(),
        );
        if (result.success) {
          setSourceConnected(true);
        } else {
          setSourceError(result.error ?? "Failed to connect the RTSP source.");
        }
      } catch {
        setSourceError("Failed to connect the RTSP source.");
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
    setForm(INITIAL_FORM);
    setSuccess(false);
    setError(null);
    setCreatedCameraId(null);
    setIngestUrl(null);
    setIngestSecured(true);
    setCopied(false);
    setBroadcastError(null);
    setSourceConnected(false);
    setSourceError(null);
    onClose();
  }

  const canSubmit =
    form.company_id && form.site_id && form.name.trim() && form.location.trim() && form.status;

  return (
    <Modal open={open} onClose={handleClose} width="max-w-xl">
      {success ? (
        <div>
          <SuccessState
            title="Camera added."
            sub="The new camera has been registered to the selected site."
            onDone={handleClose}
          />

          {/* Offer broadcast creation if stream_id was provided */}
          {form.stream_id.trim() && createdCameraId && !ingestUrl && (
            <div className="px-6 pb-6 -mt-2 flex flex-col gap-3">
              <Button
                type="button"
                variant="secondary"
                icon={Radio}
                onClick={handleCreateBroadcast}
                disabled={isPending}
              >
                {isPending ? "Creating…" : "Create broadcast in Ant Media"}
              </Button>
              {broadcastError && (
                <InfoBox tone="amber">{broadcastError}</InfoBox>
              )}
            </div>
          )}

          {/* Offer RTSP pull connect if a source URL + stream_id were provided */}
          {form.source_url.trim() && form.stream_id.trim() && createdCameraId && (
            <div className="px-6 pb-6 -mt-2 flex flex-col gap-3">
              {sourceConnected ? (
                <InfoBox tone="green">
                  RTSP source connected. Ant Media is pulling the feed — it will appear in the
                  live player once frames arrive.
                </InfoBox>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  icon={Video}
                  onClick={handleConnectSource}
                  disabled={isPending}
                >
                  {isPending ? "Connecting…" : "Connect RTSP source"}
                </Button>
              )}
              {sourceError && <InfoBox tone="amber">{sourceError}</InfoBox>}
            </div>
          )}

          {/* Ingest URL display after broadcast creation */}
          {ingestUrl && (
            <div className="px-6 pb-6 -mt-2 flex flex-col gap-3">
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
                  Point your camera&apos;s RTMP output to this URL. It contains a publish
                  token and is shown once — copy it now. Re-create the broadcast to
                  issue a new one.
                </InfoBox>
              ) : (
                <InfoBox tone="amber">
                  This ingest URL has no publish token, so anyone who learns the stream
                  ID can publish into this camera. Token control needs Ant Media
                  Enterprise with <code>ANTMEDIA_API_KEY</code> set.
                </InfoBox>
              )}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <ModalHeader
            eyebrow="Cameras"
            title="Add a new camera"
            sub="Register a new camera to a company site. You can configure streaming after creation."
            onClose={handleClose}
          />

          <ModalBody>
            <div className="flex flex-col gap-5">
              {/* Company + Site */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Company" required>
                  <Select
                    value={form.company_id}
                    onChange={handleCompanyChange}
                    options={companyOptions}
                    placeholder="Select company"
                  />
                </Field>

                <Field label="Site" required>
                  <Select
                    value={form.site_id}
                    onChange={handleChange("site_id")}
                    options={siteOptions}
                    placeholder="Select site"
                    disabled={!form.company_id}
                  />
                </Field>
              </div>

              {/* Camera name */}
              <Field label="Camera name" required>
                <TextInput
                  value={form.name}
                  onChange={handleChange("name")}
                  placeholder="e.g. CAM-09"
                />
              </Field>

              {/* Location */}
              <Field label="Location" required hint="Describe the physical position of the camera (e.g. Main Entrance, Car Park Level 2).">
                <TextInput
                  value={form.location}
                  onChange={handleChange("location")}
                  placeholder="e.g. Loading Dock North"
                />
              </Field>

              {/* Initial status */}
              <Field label="Initial status" required>
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

                <Field label="Stream ID" hint="Ant Media broadcast identifier. Must be unique across all cameras. You can set this up after adding the camera too.">
                  <TextInput
                    value={form.stream_id}
                    onChange={handleChange("stream_id")}
                    placeholder="e.g. cam-01-westfield"
                  />
                </Field>

                <Field
                  label="RTSP source URL"
                  hint="Optional. Ant Media pulls this camera and republishes it under the Stream ID. Connect it on the next step."
                >
                  <TextInput
                    value={form.source_url}
                    onChange={handleChange("source_url")}
                    placeholder="rtsp://user:pass@192.168.1.20:554/Streaming/channels/101"
                  />
                </Field>

                {!form.stream_id.trim() && (
                  <InfoBox tone="amber">
                    No stream ID assigned. This camera will show status indicators only — no live feed. You can add one later via Edit.
                  </InfoBox>
                )}
              </div>
              )}

              {/* Error display */}
              {error && (
                <InfoBox tone="amber">{error}</InfoBox>
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
              {isPending ? "Adding…" : "Add camera"}
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
