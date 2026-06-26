"use client";

import { type LucideIcon } from "lucide-react";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "dark"
  | "danger"
  | "link"
  | "outlineWhite";

type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-p-blue text-white hover:bg-p-blue-hover active:bg-p-blue-hover",
  secondary:
    "bg-surface text-ink border border-border hover:bg-surface-subtle active:bg-surface-subtle",
  ghost:
    "bg-transparent text-ink-2 hover:bg-surface-subtle active:bg-surface-subtle",
  dark: "bg-navy text-white hover:bg-navy-darker active:bg-navy-darker",
  danger:
    "bg-p-red text-white hover:opacity-90 active:opacity-90",
  link: "bg-transparent text-p-blue hover:underline p-0",
  outlineWhite:
    "bg-transparent text-white border border-white hover:bg-white/10 active:bg-white/10",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-sm",
};

interface ButtonProps {
  children?: React.ReactNode;
  variant?: Variant;
  icon?: LucideIcon;
  onClick?: () => void;
  full?: boolean;
  size?: Size;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export function Button({
  children,
  variant = "primary",
  icon: Icon,
  onClick,
  full = false,
  size = "md",
  className = "",
  type = "button",
  disabled = false,
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium font-sans transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  const isLink = variant === "link";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        base,
        variantClasses[variant],
        isLink ? "" : sizeClasses[size],
        full ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {Icon && <Icon size={size === "sm" ? 13 : size === "lg" ? 17 : 15} strokeWidth={2} />}
      {children}
    </button>
  );
}
