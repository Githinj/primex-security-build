"use client";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}

export function Card({ children, className = "", padding = "p-5" }: CardProps) {
  return (
    <div
      className={`bg-surface border border-border rounded-xl ${padding} ${className}`}
    >
      {children}
    </div>
  );
}
