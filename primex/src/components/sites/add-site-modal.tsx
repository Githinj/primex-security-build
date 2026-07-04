"use client";

import { useState, useTransition } from "react";
import { createSite } from "@/lib/data/actions/sites";
import { Building } from "lucide-react";
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
  Label,
} from "@/components/ui";
import type { Company } from "@/lib/types";

interface AddSiteModalProps {
  open: boolean;
  onClose: () => void;
  lockedCompany?: Company;
  companies: Company[];
}

export function AddSiteModal({ open, onClose, lockedCompany, companies }: AddSiteModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [inviteWarning, setInviteWarning] = useState<string | null>(null);

  const [form, setForm] = useState({
    company_id: lockedCompany?.id ?? "",
    name: "",
    type: "",
    address: "",
    risk: "",
    client_name: "",
    client_email: "",
  });

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit() {
    startTransition(async () => {
      try {
        const result = await createSite({
          company_id: form.company_id,
          name: form.name,
          type: form.type,
          address: form.address,
          risk: form.risk || undefined,
          client_name: form.client_name || undefined,
          client_email: form.client_email || undefined,
        });
        setInviteWarning(result?.inviteError ?? null);
        setSubmitted(true);
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  function handleDone() {
    setSubmitted(false);
    setError(null);
    setInviteWarning(null);
    setForm({
      company_id: lockedCompany?.id ?? "",
      name: "",
      type: "",
      address: "",
      risk: "",
      client_name: "",
      client_email: "",
    });
    onClose();
  }

  const clientProvided = Boolean(form.client_name && form.client_email);
  const successSub = inviteWarning
    ? `Site created, but the client invite couldn't be sent: ${inviteWarning} You can invite them later from the Team page.`
    : clientProvided
      ? "Site created and a portal invite has been emailed to the business client."
      : "The site has been added.";

  const companyOptions = companies.map((c) => ({ value: c.id, label: c.name }));

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

  return (
    <Modal open={open} onClose={onClose} width="max-w-xl">
      {submitted ? (
        <SuccessState
          title="Site created."
          sub={successSub}
          onDone={handleDone}
        />
      ) : (
        <>
          <ModalHeader
            eyebrow="Sites"
            title="Add a new site"
            sub="Create a site and optionally invite the business client to their portal."
            onClose={onClose}
          />

          <ModalBody>
            <div className="flex flex-col gap-5">
              {/* Company — admin sees dropdown, manager sees static display */}
              {lockedCompany ? (
                <div className="flex flex-col gap-1.5">
                  <Label>Company</Label>
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-surface-subtle">
                    <Building size={15} strokeWidth={2} className="text-ink-3 flex-shrink-0" />
                    <span className="text-sm font-medium text-ink font-sans">
                      {lockedCompany.name}
                    </span>
                  </div>
                </div>
              ) : (
                <Field label="Company" required>
                  <Select
                    value={form.company_id}
                    onChange={(e) => handleChange("company_id", e.target.value)}
                    options={companyOptions}
                    placeholder="Select a company"
                  />
                </Field>
              )}

              {/* Site name + Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Site name" required>
                  <TextInput
                    placeholder="e.g. Apex Westfield"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
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

              {/* Street address */}
              <Field label="Street address" required>
                <TextInput
                  placeholder="e.g. 123 Main St, Sydney NSW"
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                />
              </Field>

              {/* Risk level */}
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

              {/* Separator */}
              <hr className="border-border" />

              {/* Business client section */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-0.5">
                  <Label>Business Client</Label>
                  <p className="text-sm text-ink-3 font-sans mt-1">
                    Optionally invite the client who manages this site. They will
                    receive read-only access to cameras, alerts, and reports for
                    this site only.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Full name">
                    <TextInput
                      placeholder="e.g. Brett Collins"
                      value={form.client_name}
                      onChange={(e) => handleChange("client_name", e.target.value)}
                    />
                  </Field>
                  <Field label="Email">
                    <TextInput
                      type="email"
                      placeholder="brett@company.com"
                      value={form.client_email}
                      onChange={(e) => handleChange("client_email", e.target.value)}
                    />
                  </Field>
                </div>

                {error && (
                  <InfoBox tone="amber">{error}</InfoBox>
                )}
                <InfoBox tone="blue">
                  A portal invite link will be emailed to the client when the site
                  is created. They can activate their account at any time.
                </InfoBox>
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Creating…" : "Create site & invite client"}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
