"use client";

import { useState } from "react";
import { Mail, KeyRound, Lock, ArrowLeft, CheckCircle2 } from "lucide-react";
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
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Step = "email" | "code" | "password" | "success";

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export function ForgotPasswordModal({ open, onClose, initialEmail = "" }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setStep("email");
    setEmail(initialEmail);
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setLoading(false);
    onClose();
  }

  async function handleSendCode() {
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setStep("code");
    } catch {
      setError("Unable to send reset code. Please try again.");
    }
    setLoading(false);
  }

  async function handleVerifyCode() {
    if (code.trim().length < 6) {
      setError("Please enter the 6-digit code from your email");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: "recovery",
      });

      if (verifyError) {
        setError(verifyError.message === "Token has expired or is invalid"
          ? "Invalid or expired code. Please try again."
          : verifyError.message);
        setLoading(false);
        return;
      }

      setStep("password");
    } catch {
      setError("Verification failed. Please try again.");
    }
    setLoading(false);
  }

  async function handleResetPassword() {
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      // Sign out so user logs in fresh with new password
      await supabase.auth.signOut();
      setStep("success");
    } catch {
      setError("Failed to reset password. Please try again.");
    }
    setLoading(false);
  }

  return (
    <Modal open={open} onClose={handleClose} width="max-w-md">
      {step === "success" ? (
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center font-sans">
          <span className="w-14 h-14 rounded-full bg-p-green-soft flex items-center justify-center">
            <CheckCircle2 size={32} className="text-p-green" strokeWidth={2} />
          </span>
          <div className="flex flex-col gap-1.5">
            <h3 className="font-serif text-2xl font-semibold text-ink">Password reset</h3>
            <p className="text-sm text-ink-3">
              Your password has been updated. You can now sign in with your new password.
            </p>
          </div>
          <Button variant="primary" onClick={handleClose}>
            Back to sign in
          </Button>
        </div>
      ) : (
        <>
          <ModalHeader
            title={
              step === "email" ? "Reset your password" :
              step === "code" ? "Enter reset code" :
              "Set new password"
            }
            sub={
              step === "email" ? "We'll send a 6-digit code to your email address." :
              step === "code" ? `Enter the code we sent to ${email}` :
              "Choose a new password for your account."
            }
            onClose={handleClose}
          />

          <ModalBody>
            <div className="flex flex-col gap-4">
              {step === "email" && (
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
              )}

              {step === "code" && (
                <Field label="6-digit code" required>
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" strokeWidth={2} />
                    <TextInput
                      value={code}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="pl-9 text-center tracking-[0.3em] font-mono text-lg"
                      maxLength={6}
                      inputMode="numeric"
                    />
                  </div>
                  <p className="text-xs text-ink-4 font-sans mt-2">
                    Didn&apos;t receive the code?{" "}
                    <button
                      type="button"
                      onClick={() => { setStep("email"); setCode(""); setError(null); }}
                      className="text-p-blue hover:underline"
                    >
                      Try again
                    </button>
                  </p>
                </Field>
              )}

              {step === "password" && (
                <>
                  <Field label="New password" required>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" strokeWidth={2} />
                      <TextInput
                        type="password"
                        value={newPassword}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="pl-9"
                      />
                    </div>
                  </Field>
                  <Field label="Confirm password" required>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" strokeWidth={2} />
                      <TextInput
                        type="password"
                        value={confirmPassword}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        className="pl-9"
                      />
                    </div>
                  </Field>
                </>
              )}

              {error && <InfoBox tone="amber">{error}</InfoBox>}
            </div>
          </ModalBody>

          <ModalFooter>
            {step !== "email" && (
              <Button
                variant="secondary"
                icon={ArrowLeft}
                onClick={() => {
                  setError(null);
                  if (step === "code") setStep("email");
                  if (step === "password") setStep("code");
                }}
              >
                Back
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={
                step === "email" ? handleSendCode :
                step === "code" ? handleVerifyCode :
                handleResetPassword
              }
              disabled={loading}
            >
              {loading ? "Please wait…" :
               step === "email" ? "Send code" :
               step === "code" ? "Verify code" :
               "Reset password"}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
