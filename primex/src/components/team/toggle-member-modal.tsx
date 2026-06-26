"use client";

import { useState } from "react";
import { Power } from "lucide-react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  SuccessState,
  InfoBox,
  Button,
} from "@/components/ui";
import type { Profile } from "@/lib/types";
import { toggleProfileStatus } from "@/lib/data/actions/profiles";

interface ToggleMemberModalProps {
  open: boolean;
  onClose: () => void;
  member: Profile | null;
}

export function ToggleMemberModal({ open, onClose, member }: ToggleMemberModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!member) return null;

  const isActive = member.status === "Active";
  const name = member.full_name;

  async function handleConfirm() {
    if (!member) return;
    setSaving(true);
    try {
      await toggleProfileStatus(member.id, !isActive);
      setSubmitted(true);
    } catch {
      // TODO: surface error to user
    } finally {
      setSaving(false);
    }
  }

  function handleDone() {
    setSubmitted(false);
    onClose();
  }

  function handleClose() {
    setSubmitted(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose}>
      {submitted ? (
        <SuccessState
          title={isActive ? "Deactivated." : "Reactivated."}
          sub={
            isActive
              ? `${name} has been deactivated and can no longer sign in.`
              : `${name} has been reactivated and can sign in again.`
          }
          onDone={handleDone}
        />
      ) : (
        <>
          <ModalHeader
            eyebrow="Confirm"
            title={isActive ? `Deactivate ${name}?` : `Reactivate ${name}?`}
            onClose={handleClose}
          />
          <ModalBody>
            <InfoBox tone={isActive ? "amber" : "green"}>
              {isActive
                ? "They keep their account and history, but can't sign in. Reactivate anytime."
                : "They'll regain access on their next sign-in. Notifications will resume."}
            </InfoBox>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant={isActive ? "danger" : "primary"}
              icon={Power}
              onClick={handleConfirm}
              disabled={saving}
            >
              {isActive ? "Deactivate" : "Reactivate"}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
