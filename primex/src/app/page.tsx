import type { Metadata } from "next";
import { LandingClient } from "./landing-client";

export const metadata: Metadata = {
  title: {
    absolute: "Primex Security System — AI-Powered Monitoring & Guard Dispatch",
  },
  description:
    "AI-powered camera monitoring turns threats into dispatched guards in under 60 seconds. 24/7 live monitoring, instant threat detection, and rapid guard dispatch for commercial properties.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: "Primex Security System — AI-Powered Monitoring & Guard Dispatch",
    description:
      "AI-powered camera monitoring turns threats into dispatched guards in under 60 seconds.",
  },
};

export default function HomePage() {
  return <LandingClient />;
}
