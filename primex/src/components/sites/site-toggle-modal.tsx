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
import { toggleSiteStatus } from "@/lib/data/actions/sites";
import type { Site } from "@/lib/types";

interface SiteToggleModalProps {
  open: boolean;
  onClose: () => void;
  site: Site | null;
}

export function SiteToggleModal({ open, onClose, site }: SiteToggleModalProps) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!site) return null;

  const isActive = site.status === "Active";

  async function handleSubmit() {
    if (!site) return;
    setLoading(true);
    try {
      await toggleSiteStatus(site.id, isActive ? "Inactive" : "Active");
      setDone(true);
    } catch (err) {
      console.error("Failed to toggle site status:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setDone(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose}>
      {done ? (
        <SuccessState
          title={isActive ? "Site deactivated." : "Site activated."}
          sub={
            isActive
              ? "Cameras at this site have stopped generating alerts. You can reactivate anytime."
              : "Cameras at this site are now monitoring and alerts can be created again."
          }
          onDone={handleClose}
        />
      ) : (
        <>
          <ModalHeader
            eyebrow="Confirm"
            title={isActive ? `Deactivate ${site.name}?` : `Activate ${site.name}?`}
            onClose={handleClose}
          />

          <ModalBody>
            {isActive ? (
              <InfoBox tone="amber">
                Cameras at this site stop generating alerts. Existing incidents stay open. You can reactivate anytime.
              </InfoBox>
            ) : (
              <InfoBox tone="green">
                Cameras resume status monitoring and alerts can be created again.
              </InfoBox>
            )}
          </ModalBody>

          <ModalFooter>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant={isActive ? "danger" : "primary"}
              icon={Power}
              onClick={handleSubmit}
              disabled={loading}
            >
              {isActive ? "Deactivate site" : "Activate site"}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
