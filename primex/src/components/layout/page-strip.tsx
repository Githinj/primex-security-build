"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { Breadcrumb } from "@/components/ui";

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

export function PageStrip() {
  const pathname = usePathname();
  const crumbs = buildBreadcrumb(pathname ?? "");
  const today = formatDate(new Date());

  return (
    <header className="flex items-center justify-between px-9 py-3.5 border-b border-border bg-surface flex-shrink-0">
      {/* Left — breadcrumb */}
      <Breadcrumb items={crumbs} />

      {/* Right — date + notifications */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-sans text-ink-3">{today}</span>

        {/* Bell with badge */}
        <button
          type="button"
          className="relative p-1.5 rounded-lg hover:bg-surface-subtle transition-colors duration-150"
          aria-label="Notifications"
        >
          <Bell size={17} className="text-ink-2" strokeWidth={2} />
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-p-red text-white text-[10px] font-bold font-sans rounded-full px-1 leading-none">
            3
          </span>
        </button>
      </div>
    </header>
  );
}
