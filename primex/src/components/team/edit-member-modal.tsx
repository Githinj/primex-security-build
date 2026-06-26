"use client";

import { useState, useEffect } from "react";
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
} from "@/components/ui";
import type { Profile } from "@/lib/types";
import { updateProfile } from "@/lib/data/actions/profiles";

const ROLE_OPTIONS = [
  { value: "company_manager", label: "Company Manager" },
  { value: "dispatcher", label: "Dispatcher" },
  { value: "guard", label: "Guard/Responder" },
];

interface EditTeamMemberModalProps {
  open: boolean;
  onClose: () => void;
  member: Profile | null;
}

export function EditTeamMemberModal({ open, onClose, member }: EditTeamMemberModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "",
    phone: "",
  });

  useEffect(() => {
    if (member) {
      setForm({
        name: member.full_name,
        email: member.email,
        role: member.role,
        phone: member.phone ?? "",
      });
    }
  }, [member]);

  if (!member) return null;

  async function handleSubmit() {
    if (!member) return;
    setSaving(true);
    try {
      await updateProfile(member.id, {
        full_name: form.name,
        email: form.email,
        role: form.role,
        phone: form.phone || null,
      });
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleDone() {
    setSubmitted(false);
    setError(null);
    onClose();
  }

  function handleClose() {
    setSubmitted(false);
    setError(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose}>
      {submitted ? (
        <SuccessState
          title="Saved."
          sub="Team member details updated."
          onDone={handleDone}
        />
      ) : (
        <>
          <ModalHeader
            eyebrow="Edit member"
            title={member.full_name}
            onClose={handleClose}
          />
          <ModalBody>
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Full name" required>
                  <TextInput
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Field>
                <Field label="Email" required>
                  <TextInput
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Role" required>
                <Select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  options={ROLE_OPTIONS}
                />
              </Field>
              <Field
                label="Phone"
                hint="For guards — used for tap-to-call from dispatch"
              >
                <TextInput
                  type="tel"
                  placeholder="e.g. 0412 345 678"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
              {error && (
                <InfoBox tone="amber">{error}</InfoBox>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={saving || !form.name || !form.email || !form.role}
            >
              Save changes
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
