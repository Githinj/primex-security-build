"use client";

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}

export function Field({ label, required = false, children, hint }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5 font-sans">
      <label className="text-sm font-medium text-ink-2">
        {label}
        {required && (
          <span className="text-p-red ml-0.5" aria-hidden="true">*</span>
        )}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-4">{hint}</p>}
    </div>
  );
}
