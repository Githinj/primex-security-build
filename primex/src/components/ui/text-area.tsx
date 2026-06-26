"use client";

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextArea({ className = "", ...props }: TextAreaProps) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2 text-sm font-sans bg-surface text-ink border border-border rounded-lg placeholder:text-ink-4 outline-none focus:border-p-blue transition-colors duration-150 min-h-[70px] resize-y disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    />
  );
}
