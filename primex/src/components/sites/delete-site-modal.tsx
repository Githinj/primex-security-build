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
import { deleteSite } from "@/lib/data/actions/sites";
import type { Site } from "@/lib/types";

interface DeleteSiteModalProps {
  open: boolean;
  onClose: () => void;
  site: Site | null;
}

export function DeleteSiteModal({ open, onClose, site }: DeleteSiteModalProps) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!site) return null;

  async function handleSubmit() {
    if (!site) return;
    setLoading(true);
    try {
      await deleteSite(site.id);
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setDone(false);
    setError(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose}>
      {done ? (
        <SuccessState
          title="Site deleted."
          sub={`${site.name} and all its cameras have been removed.`}
          onDone={handleClose}
        />
      ) : (
        <>
          <ModalHeader
            eyebrow="Super Admin · Permanent action"
            title={`Delete ${site.name}?`}
            onClose={handleClose}
          />

          <ModalBody>
            {error && (
              <InfoBox tone="amber">{error}</InfoBox>
            )}
            <InfoBox tone="amber">
              This will remove the site, all of its cameras, and disable Business Client access. Past alerts and incidents stay in your records for audit.
            </InfoBox>
          </ModalBody>

          <ModalFooter>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              onClick={handleSubmit}
              disabled={loading}
            >
              Delete site
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
