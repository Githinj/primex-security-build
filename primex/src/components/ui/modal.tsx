"use client";

import { X, CheckCircle2 } from "lucide-react";
import { Button } from "./button";
import { Label } from "./label";

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}

export function Modal({ open, onClose, children, width = "max-w-lg" }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        className={`relative z-10 w-full ${width} bg-surface rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden`}
      >
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ModalHeader
// ---------------------------------------------------------------------------

interface ModalHeaderProps {
  title: string;
  eyebrow?: string;
  sub?: string;
  onClose?: () => void;
}

export function ModalHeader({ title, eyebrow, sub, onClose }: ModalHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border flex-shrink-0">
      <div className="flex flex-col gap-1">
        {eyebrow && <Label>{eyebrow}</Label>}
        <h2 className="font-serif text-xl font-semibold text-ink">{title}</h2>
        {sub && <p className="text-sm text-ink-3 font-sans">{sub}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="mt-0.5 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-surface-subtle transition-colors duration-100 cursor-pointer"
          aria-label="Close modal"
        >
          <X size={16} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ModalBody
// ---------------------------------------------------------------------------

interface ModalBodyProps {
  children: React.ReactNode;
}

export function ModalBody({ children }: ModalBodyProps) {
  return (
    <div className="px-6 py-5 overflow-y-auto flex-1 font-sans">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ModalFooter
// ---------------------------------------------------------------------------

interface ModalFooterProps {
  children: React.ReactNode;
}

export function ModalFooter({ children }: ModalFooterProps) {
  return (
    <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-bg flex-shrink-0 font-sans">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SuccessState
// ---------------------------------------------------------------------------

interface SuccessStateProps {
  title: string;
  sub?: React.ReactNode;
  onDone?: () => void;
}

export function SuccessState({ title, sub, onDone }: SuccessStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center font-sans">
      <span className="w-14 h-14 rounded-full bg-p-green-soft flex items-center justify-center">
        <CheckCircle2 size={32} className="text-p-green" strokeWidth={2} />
      </span>
      <div className="flex flex-col gap-1.5">
        <h3 className="font-serif text-2xl font-semibold text-ink">{title}</h3>
        {sub && <p className="text-sm text-ink-3">{sub}</p>}
      </div>
      {onDone && (
        <Button variant="primary" onClick={onDone}>
          Done
        </Button>
      )}
    </div>
  );
}
