"use client";

import { useState } from "react";
import { Ban, Power, CheckCircle } from "lucide-react";

import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  SuccessState,
  Button,
  InfoBox,
} from "@/components/ui";

import type { Company } from "@/lib/types";
import { updateCompany } from "@/lib/data/actions/companies";

interface SuspendCompanyModalProps {
  open: boolean;
  onClose: () => void;
  company: Company | null;
}

export function SuspendCompanyModal({
  open,
  onClose,
  company,
}: SuspendCompanyModalProps) {
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!company) return null;

  const isSuspended = company.status === "Suspended";
  const isPending = company.status === "Pending";

  function handleClose() {
    setSuccess(false);
    setError(null);
    onClose();
  }

  async function handleConfirm() {
    if (!company) return;
    setSubmitting(true);
    try {
      await updateCompany(company.id, {
        status: (isSuspended || isPending) ? "Active" : "Suspended",
      });
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} width="max-w-sm">
      {success ? (
        <SuccessState
          title={isPending ? "Approved." : isSuspended ? "Restored." : "Suspended."}
          sub={
            isPending
              ? `${company.name} has been approved. Users can now fully access the platform.`
              : isSuspended
              ? `${company.name} has been restored. Users can access the platform again.`
              : `${company.name} has been suspended. All users have lost access.`
          }
          onDone={handleClose}
        />
      ) : (
        <>
          <ModalHeader
            eyebrow="Super Admin \u00b7 Confirm"
            title={
              isPending
                ? `Approve ${company.name}?`
                : isSuspended
                ? `Restore ${company.name}?`
                : `Suspend ${company.name}?`
            }
            onClose={handleClose}
          />
          <ModalBody>
            {error && (
              <InfoBox tone="amber">{error}</InfoBox>
            )}
            <InfoBox tone={isPending ? "blue" : isSuspended ? "green" : "amber"}>
              {isPending
                ? "This company is awaiting approval. Approving will grant full platform access to all users."
                : isSuspended
                ? "Users will regain access immediately. Cameras and alerts will resume normal operation."
                : "All users of this company will lose access. Alerts and incidents stop generating. No data is deleted \u2014 you can restore at any time."}
            </InfoBox>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant={isPending ? "primary" : isSuspended ? "primary" : "danger"}
              icon={isPending ? CheckCircle : isSuspended ? Power : Ban}
              onClick={handleConfirm}
              disabled={submitting}
            >
              {isPending ? "Approve company" : isSuspended ? "Restore access" : "Suspend company"}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
