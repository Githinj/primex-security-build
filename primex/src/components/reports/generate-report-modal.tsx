"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { createReport } from "@/lib/data/actions/reports";
import type { Company } from "@/lib/types";

interface GenerateReportModalProps {
  open: boolean;
  onClose: () => void;
  // Super-admin picks any company; manager passes a single locked company.
  companies?: Company[];
  lockedCompany?: Company;
}

const typeOptions = [
  { value: "Monthly", label: "Monthly" },
  { value: "Quarterly", label: "Quarterly" },
  { value: "Incident", label: "Incident" },
  { value: "Custom", label: "Custom" },
];

// Default range: the previous full calendar month.
function defaultRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

export function GenerateReportModal({ open, onClose, companies, lockedCompany }: GenerateReportModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialRange = defaultRange();
  const [form, setForm] = useState({
    companyId: lockedCompany?.id ?? "",
    type: "Monthly",
    periodStart: initialRange.start,
    periodEnd: initialRange.end,
  });

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleClose() {
    setSubmitted(false);
    setError(null);
    setForm({
      companyId: lockedCompany?.id ?? "",
      type: "Monthly",
      periodStart: initialRange.start,
      periodEnd: initialRange.end,
    });
    onClose();
  }

  function handleSubmit() {
    if (!lockedCompany && !form.companyId) {
      setError("Select a company for this report.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createReport({
        companyId: form.companyId,
        type: form.type,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
      });
      if (!res.success) {
        setError(res.error ?? "Couldn't generate the report.");
        return;
      }
      router.refresh();
      setSubmitted(true);
    });
  }

  const companyOptions = (companies ?? []).map((c) => ({ value: c.id, label: c.name }));

  return (
    <Modal open={open} onClose={handleClose} width="max-w-lg">
      {submitted ? (
        <SuccessState
          title="Report generated."
          sub="It's now available in the reports list, ready to download as PDF."
          onDone={handleClose}
        />
      ) : (
        <>
          <ModalHeader
            eyebrow="Reports"
            title="Generate a new report"
            sub="Aggregate incidents and alerts for a company over a date range."
            onClose={handleClose}
          />

          <ModalBody>
            <div className="flex flex-col gap-5">
              {lockedCompany ? (
                <div className="flex flex-col gap-1.5">
                  <Label>Company</Label>
                  <div className="flex items-center px-3 py-2 rounded-lg border border-border bg-surface-subtle">
                    <span className="text-sm font-medium text-ink font-sans">
                      {lockedCompany.name}
                    </span>
                  </div>
                </div>
              ) : (
                <Field label="Company" required>
                  <Select
                    value={form.companyId}
                    onChange={(e) => handleChange("companyId", e.target.value)}
                    options={companyOptions}
                    placeholder="Select a company"
                  />
                </Field>
              )}

              <Field label="Report type" required>
                <Select
                  value={form.type}
                  onChange={(e) => handleChange("type", e.target.value)}
                  options={typeOptions}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="From" required>
                  <TextInput
                    type="date"
                    value={form.periodStart}
                    max={form.periodEnd}
                    onChange={(e) => handleChange("periodStart", e.target.value)}
                  />
                </Field>
                <Field label="To" required>
                  <TextInput
                    type="date"
                    value={form.periodEnd}
                    min={form.periodStart}
                    onChange={(e) => handleChange("periodEnd", e.target.value)}
                  />
                </Field>
              </div>

              {error && <InfoBox tone="amber">{error}</InfoBox>}
            </div>
          </ModalBody>

          <ModalFooter>
            <Button variant="secondary" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Generating…" : "Generate report"}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
