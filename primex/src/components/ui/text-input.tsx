"use client";

type TextInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function TextInput({ className = "", ...props }: TextInputProps) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 text-sm font-sans bg-surface text-ink border border-border rounded-lg placeholder:text-ink-4 outline-none focus:border-p-blue transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    />
  );
}
