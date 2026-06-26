"use client";

interface TimelineEvent {
  time: string;
  label: string;
  by?: string;
  isFirst?: boolean;
}

interface TimelineProps {
  events: TimelineEvent[];
}

export function Timeline({ events }: TimelineProps) {
  return (
    <ol className="flex flex-col gap-0">
      {events.map((event, i) => {
        const isLast = i === events.length - 1;
        return (
          <li key={i} className="flex gap-3">
            {/* Dot + line column */}
            <div className="flex flex-col items-center flex-shrink-0 w-4">
              <span
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 ${
                  event.isFirst ? "bg-p-red" : "bg-ink-4"
                }`}
              />
              {!isLast && (
                <span className="w-px flex-1 border-l border-border mt-1 mb-0" />
              )}
            </div>

            {/* Content */}
            <div className={`pb-4 ${isLast ? "pb-0" : ""}`}>
              <p className="text-sm text-ink font-medium leading-snug">
                {event.label}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-ink-3 tabular-nums">{event.time}</span>
                {event.by && (
                  <>
                    <span className="text-ink-4 text-xs">·</span>
                    <span className="text-xs text-ink-3">{event.by}</span>
                  </>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
