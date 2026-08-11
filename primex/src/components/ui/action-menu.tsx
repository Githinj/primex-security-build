"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, type LucideIcon } from "lucide-react";

interface ActionItem {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  tone?: "danger";
  divider?: boolean;
}

interface ActionMenuProps {
  actions: ActionItem[];
}

/** Breathing room between the trigger and the menu, and from the viewport edge. */
const GAP = 6;

/**
 * Row action menu.
 *
 * The menu is rendered into `document.body` rather than next to its trigger.
 * `DataTable` wraps every table in `overflow-x-auto`, and CSS resolves the
 * other axis to `auto` as soon as one axis is not `visible` — so an absolutely
 * positioned child that extends past the table's bottom edge is swallowed by
 * that scroll container instead of overlaying the page. Rows near the end of a
 * table were the visible symptom; the containment was always there.
 *
 * A portal costs manual positioning: coordinates are measured off the trigger,
 * the menu flips above when it would fall off the bottom, and it re-measures on
 * scroll (capture phase, so inner scrollers count too) and on resize.
 */
export function ActionMenu({ actions }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 0;
    const spaceBelow = window.innerHeight - rect.bottom;

    // Flip above only when below genuinely doesn't fit *and* above fits better.
    const flip =
      menuHeight > 0 && spaceBelow < menuHeight + GAP && rect.top > spaceBelow;

    const top = flip ? rect.top - menuHeight - GAP : rect.bottom + GAP;

    setPos({
      // Right-aligned to the trigger, so it never runs off the right edge.
      right: Math.max(GAP, window.innerWidth - rect.right),
      // Clamp for the pathological case: a menu taller than the viewport.
      top: Math.min(
        Math.max(GAP, top),
        Math.max(GAP, window.innerHeight - menuHeight - GAP),
      ),
    });
  }, []);

  // Measuring happens in the ref callback rather than an effect: it runs during
  // commit, before paint, so the menu is never painted at stale coordinates —
  // and it keeps the effect below a pure subscription.
  const attachMenu = useCallback(
    (node: HTMLDivElement | null) => {
      menuRef.current = node;
      if (node) place();
    },
    [place],
  );

  const close = useCallback(() => {
    setOpen(false);
    setPos(null);
  }, []);

  // Keep the menu pinned to its trigger. Capture phase so that scrolling an
  // inner container (the table wrapper, `main`) counts, not just the window.
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
      // The menu lives outside the trigger's subtree now, so it needs its own
      // check — otherwise mousedown closes the menu and unmounts the item
      // before its click ever fires.
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
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

  return (
    <div className="relative inline-block font-sans">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-surface-subtle transition-colors duration-100 cursor-pointer"
        aria-label="Open actions menu"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal size={17} strokeWidth={2} />
      </button>

      {open &&
        createPortal(
          <div
            ref={attachMenu}
            role="menu"
            style={{
              position: "fixed",
              top: pos?.top ?? 0,
              right: pos?.right ?? 0,
            }}
            // Hidden for the single frame between mount and measurement, so the
            // menu never flashes at the wrong coordinates.
            className={`z-50 min-w-[160px] bg-surface border border-border rounded-xl shadow-lg py-1.5 overflow-hidden ${
              pos ? "" : "opacity-0 pointer-events-none"
            }`}
          >
            {actions.map((action, i) => {
              if (action.divider) {
                return <hr key={i} className="my-1 border-border" />;
              }
              const Icon = action.icon;
              return (
                <button
                  key={i}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    action.onClick?.();
                    close();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors duration-100 cursor-pointer text-left ${
                    action.tone === "danger"
                      ? "text-p-red hover:bg-p-red-soft"
                      : "text-ink-2 hover:bg-surface-subtle hover:text-ink"
                  }`}
                >
                  {Icon && (
                    <Icon size={14} strokeWidth={2} className="flex-shrink-0" />
                  )}
                  {action.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
