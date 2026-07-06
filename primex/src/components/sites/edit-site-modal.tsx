"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSite } from "@/lib/data/actions/sites";
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
} from "@/components/ui";
import type { Site } from "@/lib/types";

interface EditSiteModalProps {
  open: boolean;
  onClose: () => void;
  site: Site | null;
}

const typeOptions = [
  { value: "Store", label: "Store" },
  { value: "Office", label: "Office" },
  { value: "Warehouse", label: "Warehouse" },
  { value: "Other", label: "Other" },
];

const riskOptions = [
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
];

export function EditSiteModal({ open, onClose, site }: EditSiteModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "",
    address: "",
    risk: "",
  });

  // Re-seed the form whenever a different site is opened. Adjusting state during
  // render (guarded) is React's recommended alternative to a setState-in-effect.
  const [seededId, setSeededId] = useState<string | null>(null);
  if (site && site.id !== seededId) {
    setSeededId(site.id);
    setForm({ name: site.name, type: site.type, address: site.address, risk: site.risk });
    setError(null);
  }

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit() {
    if (!site) return;
    if (!form.name.trim() || !form.type || !form.address.trim() || !form.risk) {
      setError("Please fill in all fields.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await updateSite(site.id, {
          name: form.name.trim(),
          type: form.type,
          address: form.address.trim(),
          risk: form.risk,
        });
        router.refresh();
        onClose();
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} width="max-w-xl">
      <ModalHeader
        eyebrow="Sites"
        title="Manage site"
        sub="Update this site's details. Cameras and history are unaffected."
        onClose={onClose}
      />

      <ModalBody>
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Site name" required>
              <TextInput
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Apex Westfield"
              />
            </Field>
            <Field label="Type" required>
              <Select
                value={form.type}
                onChange={(e) => handleChange("type", e.target.value)}
                options={typeOptions}
                placeholder="Select type"
              />
            </Field>
          </div>

          <Field label="Street address" required>
            <TextInput
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="e.g. 123 Main St, Sydney NSW"
            />
          </Field>

          <Field
            label="Risk level"
            required
            hint="Risk level affects alert thresholds and dispatch priority for this site."
          >
            <Select
              value={form.risk}
              onChange={(e) => handleChange("risk", e.target.value)}
              options={riskOptions}
              placeholder="Select risk level"
            />
          </Field>

          {error && <InfoBox tone="amber">{error}</InfoBox>}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
