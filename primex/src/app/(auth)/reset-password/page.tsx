import type { Metadata } from "next";
import { ResetPasswordClient } from "./reset-password-client";

// Transient, token-gated page — must never be indexed. Kept crawlable (not
// robots-disallowed) so crawlers can actually read this noindex directive.
export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new password for your Primex Security account.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
