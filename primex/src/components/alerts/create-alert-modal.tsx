"use client";

import { useState, useTransition } from "react";
import { createAlert } from "@/lib/data/actions/alerts";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  SuccessState,
  Field,
  TextInput,
  TextArea,
  Select,
  InfoBox,
  Button,
} from "@/components/ui";
import type { Company, Site, Camera } from "@/lib/types";

interface CreateAlertModalProps {
  open: boolean;
  onClose: () => void;
  mode?: "admin" | "company" | "dispatcher";
  lockedCompany?: Company;
  companies: Company[];
  sites: Site[];
  cameras: Camera[];
}

export function CreateAlertModal({
  open,
  onClose,
  mode = "admin",
  lockedCompany,
  companies,
  sites: allSites,
  cameras: allCameras,
}: CreateAlertModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [companyId, setCompanyId] = useState(lockedCompany?.id ?? "");
  const [siteId, setSiteId] = useState("");
  const [cameraId, setCameraId] = useState("");
  const [severity, setSeverity] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const isLocked = mode === "company" || mode === "dispatcher";

  const filteredSites = allSites.filter((s) =>
    companyId ? s.company_id === companyId : true
  );

  const filteredCameras = allCameras.filter((c) =>
    siteId ? c.site_id === siteId : false
  );

  function handleSubmit() {
    if (!siteId || !severity || !title) return;
    startTransition(async () => {
      try {
        await createAlert({
          site_id: siteId,
          camera_id: cameraId || null,
          title,
          severity,
          description,
          source: "Manual",
        });
        setSubmitted(true);
      } catch (err) {
        console.error("Failed to create alert:", err);
      }
    });
  }

  function handleDone() {
    setSubmitted(false);
    setCompanyId(lockedCompany?.id ?? "");
    setSiteId("");
    setCameraId("");
    setSeverity("");
    setTitle("");
    setDescription("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} width="max-w-lg">
      {submitted ? (
        <SuccessState
          title="Alert created & incident opened."
          sub="The alert has been logged and a linked incident is now active."
          onDone={handleDone}
        />
      ) : (
        <>
          <ModalHeader
            title="Create alert"
            sub="Manual alerts automatically open a linked incident."
            onClose={onClose}
          />
          <ModalBody>
            <div className="flex flex-col gap-4">
              {/* Company */}
              {isLocked ? (
                <Field label="Company">
                  <div className="px-3 py-2 text-sm font-sans bg-surface-subtle text-ink-2 border border-border rounded-lg">
                    {lockedCompany?.name ?? "—"}
                  </div>
                </Field>
              ) : (
                <Field label="Company" required>
                  <Select
                    value={companyId}
                    onChange={(e) => {
                      setCompanyId(e.target.value);
                      setSiteId("");
                      setCameraId("");
                    }}
                    placeholder="Select company…"
                    options={companies.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                  />
                </Field>
              )}

              {/* Site */}
              <Field label="Site" required>
                <Select
                  value={siteId}
                  onChange={(e) => {
                    setSiteId(e.target.value);
                    setCameraId("");
                  }}
                  placeholder="Select site…"
                  disabled={!companyId && !isLocked}
                  options={filteredSites.map((s) => ({
                    value: s.id,
                    label: s.name,
                  }))}
                />
              </Field>

              {/* Camera (optional) */}
              <Field label="Camera" hint="Optional — link to a specific camera feed.">
                <Select
                  value={cameraId}
                  onChange={(e) => setCameraId(e.target.value)}
                  placeholder="Select camera…"
                  disabled={!siteId}
                  options={filteredCameras.map((c) => ({
                    value: c.id,
                    label: `${c.name} — ${c.location}`,
                  }))}
                />
              </Field>

              {/* Severity */}
              <Field label="Severity" required>
                <Select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  placeholder="Select severity…"
                  options={[
                    { value: "Critical", label: "Critical" },
                    { value: "Warning", label: "Warning" },
                    { value: "Info", label: "Info" },
                  ]}
                />
              </Field>

              {/* Title */}
              <Field label="Title" required>
                <TextInput
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief description of the alert…"
                />
              </Field>

              {/* Description */}
              <Field label="Description">
                <TextArea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional context, observations, or notes…"
                  rows={3}
                />
              </Field>

              <InfoBox tone="amber">
                Creating this alert will automatically open a linked incident for
                dispatcher review and guard dispatch.
              </InfoBox>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!siteId || !severity || !title || isPending}
            >
              {isPending ? "Creating…" : "Create alert"}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
