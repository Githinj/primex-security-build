"use client";

import { useState } from "react";
import { Ban, Power } from "lucide-react";

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

  if (!company) return null;

  const isSuspended = company.status === "Suspended";

  function handleClose() {
    setSuccess(false);
    onClose();
  }

  async function handleConfirm() {
    if (!company) return;
    setSubmitting(true);
    try {
      await updateCompany(company.id, {
        status: isSuspended ? "Active" : "Suspended",
      });
      setSuccess(true);
    } catch {
      // silently handle for now
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} width="max-w-sm">
      {success ? (
        <SuccessState
          title={isSuspended ? "Restored." : "Suspended."}
          sub={
            isSuspended
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
              isSuspended
                ? `Restore ${company.name}?`
                : `Suspend ${company.name}?`
            }
            onClose={handleClose}
          />
          <ModalBody>
            <InfoBox tone={isSuspended ? "green" : "amber"}>
              {isSuspended
                ? "Users will regain access immediately. Cameras and alerts will resume normal operation."
                : "All users of this company will lose access. Alerts and incidents stop generating. No data is deleted \u2014 you can restore at any time."}
            </InfoBox>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant={isSuspended ? "primary" : "danger"}
              icon={isSuspended ? Power : Ban}
              onClick={handleConfirm}
              disabled={submitting}
            >
              {isSuspended ? "Restore access" : "Suspend company"}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
