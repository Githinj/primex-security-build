"use client";

import { useState } from "react";
import { Mail, CheckCircle2 } from "lucide-react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  TextInput,
  Field,
  InfoBox,
} from "@/components/ui";
interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export function ForgotPasswordModal({ open, onClose, initialEmail = "" }: ForgotPasswordModalProps) {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setSent(false);
    setEmail(initialEmail);
    setError(null);
    setLoading(false);
    onClose();
  }

  async function handleSend() {
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const result = await res.json();

      if (!result.success) {
        setError(result.error ?? "Unable to send reset link.");
        setLoading(false);
        return;
      }

      setSent(true);
    } catch {
      setError("Unable to connect. Please try again.");
    }
    setLoading(false);
  }

  return (
    <Modal open={open} onClose={handleClose} width="max-w-md">
      {sent ? (
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center font-sans">
          <span className="w-14 h-14 rounded-full bg-p-green-soft flex items-center justify-center">
            <CheckCircle2 size={32} className="text-p-green" strokeWidth={2} />
          </span>
          <div className="flex flex-col gap-1.5">
            <h3 className="font-serif text-2xl font-semibold text-ink">Check your email</h3>
            <p className="text-sm text-ink-3">
              We&apos;ve sent a password reset link to <span className="font-medium text-ink">{email}</span>. Click the link in the email to set a new password.
            </p>
          </div>
          <p className="text-xs text-ink-4">
            Didn&apos;t receive it? Check your spam folder or{" "}
            <button
              type="button"
              onClick={() => { setSent(false); setError(null); }}
              className="text-p-blue hover:underline"
            >
              try again
            </button>
          </p>
          <Button variant="secondary" onClick={handleClose}>
            Back to sign in
          </Button>
        </div>
      ) : (
        <>
          <ModalHeader
            title="Reset your password"
            sub="Enter your email address and we'll send you a link to reset your password."
            onClose={handleClose}
          />

          <ModalBody>
            <div className="flex flex-col gap-4">
              <Field label="Email address" required>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" strokeWidth={2} />
                  <TextInput
                    type="email"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-9"
                  />
                </div>
              </Field>

              {error && <InfoBox tone="amber">{error}</InfoBox>}
            </div>
          </ModalBody>

          <ModalFooter>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSend}
              disabled={loading}
            >
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
