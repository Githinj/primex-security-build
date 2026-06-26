"use client";

import { useState } from "react";
import {
  Activity,
  Users,
  AlertTriangle,
  Cpu,
  Filter,
  Download,
  Eye,
  Settings,
  CheckCircle2,
  WifiOff,
  Radio,
  Navigation,
  FileText,
  Clock,
  UserPlus,
  Bell,
  Zap,
  X,
} from "lucide-react";
import {
  PageTitle,
  Button,
  Card,
  StatCard,
  SearchInput,
} from "@/components/ui";
import type { ActivityItem } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TimeFilter = "All" | "Today" | "This week" | "This month";

const TIME_FILTERS: TimeFilter[] = ["All", "Today", "This week", "This month"];

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Map icon string names to Lucide components
const ICON_MAP: Record<string, React.ElementType> = {
  Bell,
  Radio,
  WifiOff,
  ClipboardList: FileText,
  CheckCircle: CheckCircle2,
  Building2: Settings,
  FileDown: Download,
  UserPlus,
  MapPin: Navigation,
  Activity,
  Eye,
  Zap,
  Clock,
  X,
};

function ActivityIcon({ iconName, tone }: { iconName: string; tone: ActivityItem["tone"] }) {
  const Icon = ICON_MAP[iconName] ?? Activity;

  const bgMap: Record<ActivityItem["tone"], string> = {
    red: "bg-p-red-soft",
    amber: "bg-p-amber-soft",
    green: "bg-p-green-soft",
    blue: "bg-p-blue-soft",
    gray: "bg-p-gray-soft",
  };

  const fgMap: Record<ActivityItem["tone"], string> = {
    red: "text-p-red",
    amber: "text-p-amber",
    green: "text-p-green",
    blue: "text-p-blue",
    gray: "text-p-gray",
  };

  return (
    <span
      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${bgMap[tone]}`}
    >
      <Icon size={16} strokeWidth={2} className={fgMap[tone]} />
    </span>
  );
}

// ---------------------------------------------------------------------------
// AuditClient
// ---------------------------------------------------------------------------

export interface AuditStats {
  eventsToday: number;
  uniqueActors: number;
  criticalActions: number;
  systemEvents: number;
}

interface AuditClientProps {
  activity: ActivityItem[];
  auditStats: AuditStats;
}

export function AuditClient({ activity, auditStats }: AuditClientProps) {
  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("Today");

  const filtered = activity.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.who.toLowerCase().includes(q) ||
      item.action.toLowerCase().includes(q) ||
      item.target.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6 font-sans px-4 sm:px-9 py-6 sm:py-8">
      <PageTitle
        title="Audit log"
        sub="Every action across the platform - who did what, when. Tamper-evident, retained for 12 months."
        actions={
          <>
            <Button variant="secondary" icon={Filter}>
              Filter
            </Button>
            <Button variant="secondary" icon={Download}>
              Export CSV
            </Button>
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Events today"
          value={auditStats.eventsToday}
          icon={Activity}
        />
        <StatCard
          label="Unique actors"
          value={auditStats.uniqueActors}
          icon={Users}
        />
        <StatCard
          label="Critical actions"
          value={auditStats.criticalActions}
          icon={AlertTriangle}
          accent="text-p-amber"
        />
        <StatCard
          label="System events"
          value={auditStats.systemEvents}
          icon={Cpu}
        />
      </div>

      {/* Activity log card */}
      <Card padding="p-0">
        {/* Card header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 border-b border-border">
          <div className="w-full sm:w-72">
            <SearchInput
              placeholder="Search by actor, action, or target…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {TIME_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setTimeFilter(f)}
                className={`px-2.5 py-1 rounded-full text-[11.5px] font-medium cursor-pointer transition-colors duration-100 ${
                  timeFilter === f
                    ? "bg-navy text-white border border-navy"
                    : "bg-surface text-ink-2 border border-border"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Activity list */}
        <div className="divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-ink-3">
              No events match your search.
            </div>
          ) : (
            filtered.map((item, i) => (
              <div
                key={item.id ?? i}
                className="flex items-start gap-4 px-5 py-4 hover:bg-surface-subtle transition-colors duration-100"
              >
                <ActivityIcon iconName={item.icon} tone={item.tone} />
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <p className="text-sm text-ink">
                    <span className="font-semibold">{item.who}</span>
                    <span className="text-ink-3"> - </span>
                    <span>{item.action}</span>
                    <span className="text-ink-3"> - </span>
                    <span className="text-ink-2">{item.target}</span>
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-ink-4">
                    <Clock size={11} strokeWidth={2} />
                    <span>{formatWhen(item.created_at)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
