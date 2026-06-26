"use client";

import { useState } from "react";
import { Send } from "lucide-react";

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
} from "@/components/ui";

import { createCompany } from "@/lib/data/actions/companies";

interface InviteCompanyModalProps {
  open: boolean;
  onClose: () => void;
}

const INITIAL_FORM = {
  name: "",
  type: "Retail",
  contactName: "",
  contactEmail: "",
  plan: "Professional",
};

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

export function InviteCompanyModal({ open, onClose }: InviteCompanyModalProps) {
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  function handleClose() {
    setSuccess(false);
    setForm(INITIAL_FORM);
    onClose();
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await createCompany({ name: form.name, type: form.type });
      setSuccess(true);
    } catch {
      // silently handle for now
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} width="max-w-lg">
      {success ? (
        <SuccessState
          title="Invite sent."
          sub={
            <>
              An invitation has been sent to{" "}
              <span className="font-medium text-ink">{form.contactEmail}</span>.
            </>
          }
          onDone={handleClose}
        />
      ) : (
        <>
          <ModalHeader
            eyebrow="Super Admin \u00b7 Invite"
            title="Invite a new company"
            sub="Add a new tenant. They'll receive an email invitation to join Primex and set up their organization."
            onClose={handleClose}
          />
          <ModalBody>
            <div className="flex flex-col gap-4">
              <Field label="Company name" required>
                <TextInput
                  placeholder="e.g. Apex Retail Group"
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
              <div className="grid grid-cols-2 gap-3">
                <Field label="Primary contact name" required>
                  <TextInput
                    placeholder="Full name"
                    value={form.contactName}
                    onChange={(e) =>
                      setForm({ ...form, contactName: e.target.value })
                    }
                  />
                </Field>
                <Field
                  label="Contact email"
                  required
                  hint="Invitation will be sent here"
                >
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
              <Field label="Initial plan">
                <Select
                  value={form.plan}
                  onChange={(e) => setForm({ ...form, plan: e.target.value })}
                  options={PLAN_OPTIONS}
                />
              </Field>
              <InfoBox tone="blue">
                The contact will receive an email with a secure link to set
                their password, configure 2FA, and create their first site.
              </InfoBox>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={Send}
              onClick={handleSubmit}
              disabled={submitting}
            >
              Send invitation
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
