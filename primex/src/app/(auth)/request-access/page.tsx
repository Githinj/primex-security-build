import type { Metadata } from "next";
import { RequestAccessClient } from "./request-access-client";

export const metadata: Metadata = {
  title: "Request Access",
  description:
    "Tell us about your organization and we'll set up your Primex Security account — AI camera monitoring, instant alerts, and rapid guard dispatch.",
  alternates: { canonical: "/request-access" },
};

export default function RequestAccessPage() {
  return <RequestAccessClient />;
}
