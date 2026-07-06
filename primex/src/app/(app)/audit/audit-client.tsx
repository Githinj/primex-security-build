"use client";

import { useState, useTransition } from "react";
import {
  Activity,
  Users,
  AlertTriangle,
  Cpu,
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  PageTitle,
  Button,
  Card,
  StatCard,
  SearchInput,
} from "@/components/ui";
import { usePagination } from "@/lib/hooks/use-pagination";
import { exportAuditLog } from "@/lib/data/actions/audit";
import type { ActivityItem } from "@/lib/types";

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

function matchesFilters(item: ActivityItem, cutoff: Date | null, search: string): boolean {
  if (cutoff && new Date(item.created_at) < cutoff) return false;
  if (!search) return true;
  const q = search.toLowerCase();
  return (
    item.who.toLowerCase().includes(q) ||
    item.action.toLowerCase().includes(q) ||
    item.target.toLowerCase().includes(q)
  );
}

function toCsv(rows: ActivityItem[]): string {
  const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = ["When", "Actor", "Action", "Target", "Severity"];
  const lines = rows.map((r) =>
    [new Date(r.created_at).toISOString(), r.who, r.action, r.target, r.tone]
      .map((v) => esc(String(v)))
      .join(",")
  );
  return [header.map(esc).join(","), ...lines].join("\n");
}

function getTimeFilterDate(filter: TimeFilter): Date | null {
  if (filter === "All") return null;
  const now = new Date();
  if (filter === "Today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (filter === "This week") {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }
  // This month
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  return d;
}

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

export interface AuditStats {
  eventsToday: number;
  uniqueActors: number;
  criticalActions: number;
  systemEvents: number;
}

interface AuditClientProps {
  activity: ActivityItem[];
  total: number;
  page: number;
  pageSize: number;
  auditStats: AuditStats;
}

export function AuditClient({ activity, total, page, pageSize, auditStats }: AuditClientProps) {
  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("All");
  const [exporting, startExport] = useTransition();
  const { setPage } = usePagination({ defaultPageSize: pageSize });

  const totalPages = Math.ceil(total / pageSize);

  // Apply client-side filters (search + time) on the current page of data
  const cutoff = getTimeFilterDate(timeFilter);
  const filtered = activity.filter((item) => matchesFilters(item, cutoff, search));

  function handleExport() {
    startExport(async () => {
      try {
        // Export the whole log (not just the current page), honoring the active
        // search + time filters so the CSV matches what the user is looking at.
        const all = await exportAuditLog();
        const rows = all.filter((item) => matchesFilters(item, cutoff, search));
        const csv = toCsv(rows);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Audit export failed:", err);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 font-sans px-4 sm:px-9 py-6 sm:py-8">
      <PageTitle
        title="Audit log"
        sub="Every action across the platform - who did what, when. Tamper-evident, retained for 12 months."
        actions={
          <Button
            variant="secondary"
            icon={Download}
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard label="Events today" value={auditStats.eventsToday} icon={Activity} />
        <StatCard label="Unique actors" value={auditStats.uniqueActors} icon={Users} />
        <StatCard label="Critical actions" value={auditStats.criticalActions} icon={AlertTriangle} accent="text-p-amber" />
        <StatCard label="System events" value={auditStats.systemEvents} icon={Cpu} />
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

        {/* Pagination footer */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <span className="text-xs text-ink-3 font-sans tabular-nums">
              {total === 0
                ? "0 results"
                : `${(page - 1) * pageSize + 1}\u2013${Math.min(page * pageSize, total)} of ${total}`}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} strokeWidth={2} />
                </button>
                <span className="text-xs font-sans text-ink-2 px-2 tabular-nums">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
