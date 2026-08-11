"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Bell, BellOff } from "lucide-react";
import { formatRelativeTime, severityTone } from "@/lib/utils";
import { Pill } from "@/components/ui";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { NotificationAlert } from "@/lib/data/alerts";

interface NotificationMenuProps {
  alerts: NotificationAlert[];
  /**
   * Count of *all* open alerts, not `alerts.length` — the list is capped at a
   * handful, so a badge derived from it would silently read "6" during a storm.
   */
  openCount: number;
}

/** Breathing room between the trigger and the panel, and from the viewport edge. */
const GAP = 8;
const PANEL_WIDTH = 320;

/**
 * The notification bell and its panel.
 *
 * Portalled into `document.body` for the same reason `ActionMenu` is: the panel
 * is wider than its trigger and hangs below a header that sits in a flex column
 * with an `overflow-auto` sibling. Positioning it absolutely inside the header
 * risks the same clipping that hid the row action menus, and costs nothing to
 * avoid.
 *
 * The badge shows real open-alert count and disappears at zero. It used to be a
 * hardcoded `3`.
 */
export function NotificationMenu({ alerts, openCount }: NotificationMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  // These props come from the `(app)` layout, and a shared layout does not
  // re-run on client-side navigation — so without this the badge freezes at
  // whatever it was on first page load. A stale "0" on a security console is
  // worse than no badge at all.
  //
  // Refresh-only on purpose: `useRealtimeAlerts` also raises a desktop
  // Notification, and that belongs to the dispatcher queue that opted into it,
  // not to every page that happens to render a header.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Coalesce bursts: a single AI event can write several alerts in a row, and
    // each one would otherwise re-render the whole server tree.
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 500);
    };

    const channel = supabase
      .channel("shell-alerts")
      // UPDATE matters as much as INSERT: acknowledging an alert changes its
      // status out of the open set, which changes the count.
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts" },
        refresh,
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const panelHeight = panelRef.current?.offsetHeight ?? 0;

    setPos({
      right: Math.max(GAP, window.innerWidth - rect.right),
      // The bell lives in a top strip, so below always fits in practice; the
      // clamp is for the pathological case of a panel taller than the viewport.
      top: Math.min(
        rect.bottom + GAP,
        Math.max(GAP, window.innerHeight - panelHeight - GAP),
      ),
    });
  }, []);

  // Measure during commit, before paint, so the panel never paints at stale
  // coordinates — same reason ActionMenu does it here rather than in an effect.
  const attachPanel = useCallback(
    (node: HTMLDivElement | null) => {
      panelRef.current = node;
      if (node) place();
    },
    [place],
  );

  const close = useCallback(() => {
    setOpen(false);
    setPos(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      // The panel is outside the trigger's subtree, so it needs its own check —
      // otherwise mousedown closes and unmounts the row before its click fires.
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      close();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, close]);

  function go(href: string) {
    close();
    router.push(href);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        className="relative p-1.5 rounded-lg hover:bg-surface-subtle transition-colors duration-150 cursor-pointer"
        aria-label={
          openCount > 0 ? `Notifications (${openCount} open)` : "Notifications"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Bell size={17} className="text-ink-2" strokeWidth={2} />
        {openCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-p-red text-white text-[10px] font-bold font-sans rounded-full px-1 leading-none">
            {/* Two digits is all the badge can hold without distorting. */}
            {openCount > 99 ? "99+" : openCount}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={attachPanel}
            role="dialog"
            aria-label="Notifications"
            style={{
              position: "fixed",
              top: pos?.top ?? 0,
              right: pos?.right ?? 0,
              width: PANEL_WIDTH,
              maxWidth: "calc(100vw - 16px)",
            }}
            className={`z-50 font-sans bg-surface border border-border rounded-xl shadow-lg overflow-hidden ${
              pos ? "" : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-ink">Notifications</span>
              {openCount > 0 && (
                <span className="text-xs text-ink-3">{openCount} open</span>
              )}
            </div>

            {alerts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <BellOff size={20} className="text-ink-4" strokeWidth={2} />
                <p className="text-sm text-ink-3">No open alerts</p>
              </div>
            ) : (
              // Caps at ~4 rows and scrolls, so the panel can't run off a laptop
              // screen when the list is full.
              <div className="max-h-[320px] overflow-y-auto">
                {alerts.map((alert) => (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => go(`/alerts/${alert.id}`)}
                    className="w-full text-left px-4 py-3 border-b border-border last:border-b-0 hover:bg-surface-subtle transition-colors duration-100 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Pill tone={severityTone(alert.severity)} size="sm" dot>
                        {alert.severity}
                      </Pill>
                      <span className="text-xs text-ink-3 ml-auto flex-shrink-0">
                        {formatRelativeTime(alert.created_at)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-ink line-clamp-2">
                      {alert.title}
                    </p>
                    {alert.site_name && (
                      <p className="mt-0.5 text-xs text-ink-3 truncate">
                        {alert.site_name}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => go("/alerts")}
              className="w-full px-4 py-2.5 text-sm font-medium text-p-blue hover:bg-surface-subtle transition-colors duration-100 border-t border-border cursor-pointer text-left"
            >
              View all alerts →
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
