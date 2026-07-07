"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Shield, ChevronRight } from "lucide-react";
import { Button, TextInput } from "@/components/ui";
import { resetPasswordAction } from "@/lib/data/actions/auth";

export function ResetPasswordClient() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const result = await resetPasswordAction(newPassword);

      if (!result.success) {
        setError(result.error ?? "Password reset failed");
        return;
      }

      setSuccess(true);
    });
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-surface border border-border shadow-xl px-6 py-8 sm:px-10 sm:py-12">
        {/* Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3 mb-8 sm:mb-10">
          <div className="w-9 h-9 bg-navy rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield size={18} className="text-white" strokeWidth={2} />
          </div>
          <span className="font-serif text-lg font-semibold text-ink leading-tight">
            Primex Security System
          </span>
        </div>

        {/* Heading */}
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-ink leading-tight mb-2">
          Set new password
        </h1>
        <p className="text-ink-3 text-sm font-sans mb-6 sm:mb-8">
          Enter your new password below.
        </p>

        {success ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-p-green font-sans font-medium">
              Password updated successfully!
            </p>
            <Link
              href="/login"
              className="text-sm text-p-blue hover:underline font-sans font-medium"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink-2 font-sans">
                New password
              </label>
              <TextInput
                type="password"
                value={newPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewPassword(e.target.value)
                }
                placeholder="Min. 8 characters"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink-2 font-sans">
                Confirm password
              </label>
              <TextInput
                type="password"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setConfirmPassword(e.target.value)
                }
                placeholder="Re-enter your new password"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-p-red font-sans">{error}</p>
            )}

            <Button
              variant="primary"
              size="lg"
              full
              icon={ChevronRight}
              type="submit"
              disabled={isPending}
              className="mt-2"
            >
              {isPending ? "Updating..." : "Update password"}
            </Button>
          </form>
        )}

        {/* Footer */}
        <p className="text-sm text-ink-3 font-sans mt-6 text-center">
          <Link
            href="/login"
            className="text-p-blue hover:underline font-medium"
          >
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
