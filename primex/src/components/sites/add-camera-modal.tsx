"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Radio } from "lucide-react";
import { createCamera } from "@/lib/data/actions/cameras";
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
}

const INITIAL_FORM: FormState = {
  company_id: "",
  site_id: "",
  name: "",
  location: "",
  status: "",
  stream_id: "",
};

export function AddCameraModal({ open, onClose, companies, sites: allSites }: AddCameraModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [createdCameraId, setCreatedCameraId] = useState<string | null>(null);
  const [ingestUrl, setIngestUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

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
          stream_id: form.stream_id.trim() || null,
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
        } else {
          setBroadcastError("Failed to create broadcast in Ant Media.");
        }
      } catch {
        setBroadcastError("Failed to create broadcast.");
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
    setCopied(false);
    setBroadcastError(null);
    onClose();
  }

  const canSubmit =
    form.company_id && form.site_id && form.name.trim() && form.location.trim() && form.status;

  return (
    <Modal open={open} onClose={handleClose}>
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
              <InfoBox tone="blue">
                Point your camera&apos;s RTSP/RTMP output to this URL. The stream will appear in the live player once connected.
              </InfoBox>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <ModalHeader
            title="Add camera"
            sub="Register a new camera to a company site."
            onClose={handleClose}
          />

          <ModalBody>
            <div className="flex flex-col gap-5">
              {/* Company + Site — 2-column grid */}
              <div className="grid grid-cols-2 gap-4">
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

              {/* Streaming section */}
              <div className="border-t border-border pt-4 flex flex-col gap-4">
                <p className="text-xs text-ink-3 font-semibold uppercase tracking-wider font-sans">
                  Streaming
                </p>

                <Field label="Stream ID" hint="Ant Media broadcast identifier. You can set this up after adding the camera too.">
                  <TextInput
                    value={form.stream_id}
                    onChange={handleChange("stream_id")}
                    placeholder="e.g. cam-01-westfield"
                  />
                </Field>

                {!form.stream_id.trim() && (
                  <InfoBox tone="amber">
                    No stream ID assigned. This camera will show status indicators only — no live feed. You can add one later via Edit.
                  </InfoBox>
                )}
              </div>

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
