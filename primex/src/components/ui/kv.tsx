"use client";

interface KVProps {
  k: string;
  v: React.ReactNode;
}

export function KV({ k, v }: KVProps) {
  return (
    <div className="flex items-center justify-between gap-4 font-sans text-sm">
      <span className="text-ink-3 flex-shrink-0">{k}</span>
      <span className="text-ink font-medium text-right">{v}</span>
    </div>
  );
}
