"use client";

import { useState, useTransition } from "react";
import { createCamera } from "@/lib/data/actions/cameras";
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
}

const INITIAL_FORM: FormState = {
  company_id: "",
  site_id: "",
  name: "",
  location: "",
  status: "",
};

export function AddCameraModal({ open, onClose, companies, sites: allSites }: AddCameraModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
        await createCamera({
          site_id: form.site_id,
          name: form.name,
          location: form.location,
          status: form.status || undefined,
        });
        setSuccess(true);
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  function handleClose() {
    setForm(INITIAL_FORM);
    setSuccess(false);
    setError(null);
    onClose();
  }

  const canSubmit =
    form.company_id && form.site_id && form.name.trim() && form.location.trim() && form.status;

  return (
    <Modal open={open} onClose={handleClose}>
      {success ? (
        <SuccessState
          title="Camera added."
          sub="The new camera has been registered to the selected site."
          onDone={handleClose}
        />
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

              {/* Error display */}
              {error && (
                <InfoBox tone="amber">{error}</InfoBox>
              )}

              {/* Phase 2 info box */}
              <InfoBox tone="blue">
                <span className="font-semibold">Phase 2 — RTSP streaming.</span>{" "}
                Live video feeds and stream configuration will be available in Phase 2. Cameras added now will appear in the grid with status indicators only.
              </InfoBox>
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
