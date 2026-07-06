"use client";

import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";

import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  SuccessState,
  Button,
  Field,
  TextInput,
  Select,
  InfoBox,
  KV,
  Pill,
} from "@/components/ui";

import type { Company, CompanyStatus } from "@/lib/types";
import { updateCompany } from "@/lib/data/actions/companies";

interface CompanyDetailsModalProps {
  open: boolean;
  onClose: () => void;
  company: Company | null;
  mode?: "view" | "edit";
}

function statusTone(status: CompanyStatus): "green" | "red" | "amber" {
  switch (status) {
    case "Active":
      return "green";
    case "Suspended":
      return "red";
    case "Pending":
      return "amber";
  }
}

const TYPE_OPTIONS = [
  { value: "Retail", label: "Retail" },
  { value: "Security Firm", label: "Security Firm" },
  { value: "Grocery", label: "Grocery" },
  { value: "Warehouse", label: "Warehouse" },
  { value: "Office", label: "Office" },
  { value: "Other", label: "Other" },
];

const PLAN_OPTIONS = [
  { value: "Starter", label: "Starter \u2014 up to 3 sites" },
  { value: "Professional", label: "Professional \u2014 up to 25 sites" },
  { value: "Enterprise", label: "Enterprise \u2014 unlimited" },
];

export function CompanyDetailsModal({
  open,
  onClose,
  company,
  mode = "view",
}: CompanyDetailsModalProps) {
  const [editMode, setEditMode] = useState(mode === "edit");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    type: "",
    contactName: "",
    contactEmail: "",
    plan: "Professional",
  });

  // Sync editMode from prop when modal opens
  useEffect(() => {
    setEditMode(mode === "edit");
  }, [mode, open]);

  // Sync form from company when it changes or modal opens
  useEffect(() => {
    if (company) {
      setForm({
        name: company.name,
        type: company.type,
        contactName: company.primary_contact ?? "",
        contactEmail: company.contact_email ?? "",
        plan: company.plan ?? "Professional",
      });
    }
  }, [company, open]);

  function handleClose() {
    setSuccess(false);
    setEditMode(false);
    setError(null);
    onClose();
  }

  async function handleSave() {
    if (!company) return;
    setSubmitting(true);
    try {
      await updateCompany(company.id, {
        name: form.name,
        type: form.type,
        primary_contact: form.contactName.trim() || null,
        contact_email: form.contactEmail.trim() || null,
        plan: form.plan,
      });
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!company) return null;

  return (
    <Modal open={open} onClose={handleClose} width="max-w-md">
      {success ? (
        <SuccessState
          title="Saved."
          sub="Company details updated."
          onDone={handleClose}
        />
      ) : editMode ? (
        <>
          <ModalHeader
            eyebrow="Edit company"
            title={company.name}
            sub="Update tenant information. Changes apply immediately."
            onClose={handleClose}
          />
          <ModalBody>
            <div className="flex flex-col gap-4">
              <Field label="Company name" required>
                <TextInput
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Company type" required>
                <Select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  options={TYPE_OPTIONS}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Primary contact">
                  <TextInput
                    placeholder="Contact name"
                    value={form.contactName}
                    onChange={(e) =>
                      setForm({ ...form, contactName: e.target.value })
                    }
                  />
                </Field>
                <Field label="Contact email">
                  <TextInput
                    type="email"
                    placeholder="name@company.com"
                    value={form.contactEmail}
                    onChange={(e) =>
                      setForm({ ...form, contactEmail: e.target.value })
                    }
                  />
                </Field>
              </div>
              <Field label="Plan">
                <Select
                  value={form.plan}
                  onChange={(e) => setForm({ ...form, plan: e.target.value })}
                  options={PLAN_OPTIONS}
                />
              </Field>
              {error && (
                <InfoBox tone="amber">{error}</InfoBox>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={submitting}
            >
              Save changes
            </Button>
          </ModalFooter>
        </>
      ) : (
        <>
          <ModalHeader
            eyebrow="Company details"
            title={company.name}
            onClose={handleClose}
          />
          <ModalBody>
            <div className="flex flex-col">
              <div className="py-2.5">
                <KV k="Name" v={company.name} />
              </div>
              <div className="py-2.5 border-t border-border">
                <KV k="Type" v={company.type} />
              </div>
              <div className="py-2.5 border-t border-border">
                <KV
                  k="Sites"
                  v={`${company.sites ?? 0} active`}
                />
              </div>
              <div className="py-2.5 border-t border-border">
                <KV k="Users" v={company.users ?? 0} />
              </div>
              <div className="py-2.5 border-t border-border">
                <KV
                  k="Status"
                  v={
                    <Pill tone={statusTone(company.status)} dot size="sm">
                      {company.status}
                    </Pill>
                  }
                />
              </div>
              <div className="py-2.5 border-t border-border">
                <KV k="Primary contact" v={company.primary_contact || "\u2014"} />
              </div>
              <div className="py-2.5 border-t border-border">
                <KV k="Contact email" v={company.contact_email || "\u2014"} />
              </div>
              <div className="py-2.5 border-t border-border">
                <KV k="Plan" v={company.plan || "\u2014"} />
              </div>
              <div className="py-2.5 border-t border-border">
                <KV
                  k="Joined"
                  v={
                    company.created_at
                      ? new Date(company.created_at).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "\u2014"
                  }
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
            <Button
              variant="primary"
              icon={Pencil}
              onClick={() => setEditMode(true)}
            >
              Edit
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
