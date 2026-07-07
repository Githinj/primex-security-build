import type { Metadata } from "next";
import { LoginClient } from "./login-client";

// Force dynamic rendering — never serve from CDN cache
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your Primex Security account to access live camera monitoring, alerts, and guard dispatch.",
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return <LoginClient />;
}
