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
import { deleteCamera } from "@/lib/data/actions/cameras";
import type { Camera } from "@/lib/types";

interface RemoveCameraModalProps {
  open: boolean;
  onClose: () => void;
  camera: Camera | null;
}

export function RemoveCameraModal({ open, onClose, camera }: RemoveCameraModalProps) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!camera) return null;

  async function handleRemove() {
    try {
      await deleteCamera(camera!.id);
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
  }

  function handleClose() {
    setDone(false);
    setError(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} width="max-w-md">
      {done ? (
        <SuccessState
          title="Camera removed."
          sub={`${camera.name} is no longer monitored.`}
          onDone={handleClose}
        />
      ) : (
        <>
          <ModalHeader
            eyebrow="Confirm"
            title={`Remove ${camera.name}?`}
            onClose={handleClose}
          />

          <ModalBody>
            {error && (
              <InfoBox tone="amber">{error}</InfoBox>
            )}
            <InfoBox tone="amber">
              The camera is unregistered from Primex. Status checks stop and past alerts linked to it stay in records.
            </InfoBox>
          </ModalBody>

          <ModalFooter>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="danger" icon={Trash2} onClick={handleRemove}>
              Remove camera
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
