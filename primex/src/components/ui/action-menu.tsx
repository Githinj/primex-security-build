"use client";

import { useState, useRef, useEffect } from "react";
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

export function ActionMenu({ actions }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block font-sans">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-surface-subtle transition-colors duration-100 cursor-pointer"
        aria-label="Open actions menu"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <MoreHorizontal size={17} strokeWidth={2} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[160px] bg-surface border border-border rounded-xl shadow-lg py-1.5 overflow-hidden">
          {actions.map((action, i) => {
            if (action.divider) {
              return <hr key={i} className="my-1 border-border" />;
            }
            const Icon = action.icon;
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  action.onClick?.();
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors duration-100 cursor-pointer text-left ${
                  action.tone === "danger"
                    ? "text-p-red hover:bg-p-red-soft"
                    : "text-ink-2 hover:bg-surface-subtle hover:text-ink"
                }`}
              >
                {Icon && <Icon size={14} strokeWidth={2} className="flex-shrink-0" />}
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
