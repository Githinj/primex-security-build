"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
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
import { deleteProfile } from "@/lib/data/actions/profiles";

interface DeleteMemberModalProps {
  open: boolean;
  onClose: () => void;
  member: Profile | null;
}

export function DeleteMemberModal({ open, onClose, member }: DeleteMemberModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!member) return null;

  const name = member.full_name;

  async function handleConfirm() {
    if (!member) return;
    setSaving(true);
    try {
      await deleteProfile(member.id);
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
          title="Member removed."
          sub={`${name} has been removed from the team.`}
          onDone={handleDone}
        />
      ) : (
        <>
          <ModalHeader
            eyebrow="Remove member"
            title={`Remove ${name}?`}
            onClose={handleClose}
          />
          <ModalBody>
            <InfoBox tone="amber">
              Soft delete — the user is hidden from your team list and can&apos;t
              sign in. Their actions stay in the audit log. Admins can restore
              within 30 days.
            </InfoBox>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              onClick={handleConfirm}
              disabled={saving}
            >
              Remove from team
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
