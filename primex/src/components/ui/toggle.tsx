"use client";

interface ToggleProps {
  on: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ on, onChange, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      disabled={disabled}
      className={`relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-p-blue ${
        on ? "bg-p-blue" : "bg-surface border border-border-strong"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
          on ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}
