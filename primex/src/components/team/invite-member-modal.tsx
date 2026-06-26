"use client";

import { useState } from "react";
import { Send } from "lucide-react";
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

const ROLE_OPTIONS = [
  { value: "company_manager", label: "Company Manager" },
  { value: "dispatcher", label: "Dispatcher" },
  { value: "site_manager", label: "Site Manager" },
  { value: "guard", label: "Guard/Responder" },
];

interface InviteTeamMemberModalProps {
  open: boolean;
  onClose: () => void;
}

export function InviteTeamMemberModal({ open, onClose }: InviteTeamMemberModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "",
    phone: "",
  });

  function handleSubmit() {
    setSubmitted(true);
  }

  function handleDone() {
    setSubmitted(false);
    setForm({ name: "", email: "", role: "", phone: "" });
    onClose();
  }

  function handleClose() {
    setSubmitted(false);
    setForm({ name: "", email: "", role: "", phone: "" });
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose}>
      {submitted ? (
        <SuccessState
          title="Invite sent."
          sub={
            <>
              An invitation has been sent to <strong>{form.email}</strong>.
            </>
          }
          onDone={handleDone}
        />
      ) : (
        <>
          <ModalHeader
            eyebrow="Company Manager · Invite"
            title="Invite a team member"
            sub="Add someone to your company. They'll get an email to set their password and join your team."
            onClose={handleClose}
          />
          <ModalBody>
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Full name" required>
                  <TextInput
                    placeholder="e.g. Jordan Blake"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Field>
                <Field label="Email" required>
                  <TextInput
                    type="email"
                    placeholder="e.g. jordan@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Role" required>
                <Select
                  placeholder="Select a role"
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
              <InfoBox tone="blue">
                The invitation link expires in 7 days. You can resend or revoke
                from the team list.
              </InfoBox>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={Send}
              onClick={handleSubmit}
              disabled={!form.name || !form.email || !form.role}
            >
              Send invitation
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
