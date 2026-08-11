"use client";

import { usePathname } from "next/navigation";
import { Breadcrumb } from "@/components/ui";
import { NotificationMenu } from "./notification-menu";
import type { NotificationAlert } from "@/lib/data/alerts";

function buildBreadcrumb(pathname: string): string[] {
  const segmentLabels: Record<string, string> = {
    dashboard:  "Dashboard",
    companies:  "Companies",
    sites:      "Sites",
    cameras:    "Cameras",
    alerts:     "Alerts",
    incidents:  "Incidents",
    guards:     "Guards",
    reports:    "Reports",
    audit:      "Audit log",
    team:       "Team",
    settings:   "Settings",
  };

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: string[] = ["Primex"];
  for (const seg of segments) {
    const label = segmentLabels[seg];
    if (label) crumbs.push(label);
  }
  return crumbs;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface PageStripProps {
  menuButton?: React.ReactNode;
  alerts?: NotificationAlert[];
  openAlertCount?: number;
}

export function PageStrip({ menuButton, alerts = [], openAlertCount = 0 }: PageStripProps) {
  const pathname = usePathname();
  const crumbs = buildBreadcrumb(pathname ?? "");
  const today = formatDate(new Date());

  return (
    <header className="flex items-center justify-between px-4 sm:px-9 py-3.5 border-b border-border bg-surface flex-shrink-0">
      {/* Left — hamburger (mobile) + breadcrumb */}
      <div className="flex items-center gap-2">
        {menuButton}
        <Breadcrumb items={crumbs} />
      </div>

      {/* Right — date + notifications */}
      <div className="flex items-center gap-4">
        {/* The date is decoration; the bell is not, so only the date hides on
            small screens. Both used to be behind `hidden sm:flex`, which put
            the alert count out of reach on a phone. */}
        <span className="hidden sm:inline text-sm font-sans text-ink-3">{today}</span>
        <NotificationMenu alerts={alerts} openCount={openAlertCount} />
      </div>
    </header>
  );
}
