"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, ChevronRight } from "lucide-react";
import { Button, TextInput, LiveDot, Label } from "@/components/ui";
import { ForgotPasswordModal } from "./forgot-password-modal";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error")
  );
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Try JS fetch first
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await res.json();

      if (!result.success) {
        setError(result.error ?? "Invalid email or password");
        setLoading(false);
        return;
      }

      router.push(result.redirectTo ?? "/dashboard");
      router.refresh();
      return;
    } catch {
      // JS fetch failed — submit as native HTML form (no JS needed)
      if (formRef.current) {
        formRef.current.submit();
        return;
      }
    }

    setError("Unable to connect. Please try again.");
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[1000px] grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden shadow-xl border border-border">
        {/* Left — form panel */}
        <div className="bg-surface flex flex-col justify-center px-6 py-10 sm:px-12 sm:py-14">
          {/* Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3 mb-8 sm:mb-10">
            <div className="w-9 h-9 bg-navy rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield size={18} className="text-white" strokeWidth={2} />
            </div>
            <span className="font-serif text-lg font-semibold text-ink leading-tight">
              Primex Security System
            </span>
          </div>

          {/* Heading */}
          <Label className="mb-3">Sign in</Label>
          <h1 className="font-serif text-2xl sm:text-4xl font-semibold text-ink leading-tight mb-2">
            Welcome back.
          </h1>
          <p className="text-ink-3 text-xs sm:text-sm font-sans mb-6 sm:mb-8">
            Your dashboard adapts to your role — from live dispatch to executive
            reporting.
          </p>

          {/*
            Form has action="/api/auth/login" method="POST" as native fallback.
            JS handler calls e.preventDefault() and uses fetch. If fetch fails,
            it calls form.submit() which does a native POST (no JS needed).
          */}
          <form
            ref={formRef}
            action="/api/auth/login"
            method="POST"
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink-2 font-sans">
                Email address
              </label>
              <TextInput
                type="email"
                name="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
                placeholder="you@example.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink-2 font-sans">
                Password
              </label>
              <TextInput
                type="password"
                name="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <p className="text-sm text-p-red font-sans">{error}</p>
            )}

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded border-border accent-p-blue cursor-pointer"
                />
                <span className="text-sm text-ink-2 font-sans">
                  Keep me signed in
                </span>
              </label>
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-sm text-p-blue hover:underline font-sans"
              >
                Forgot password?
              </button>
            </div>

            <Button
              variant="primary"
              size="lg"
              full
              icon={ChevronRight}
              type="submit"
              disabled={loading}
              className="mt-2"
            >
              {loading ? "Signing in..." : "Continue"}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-sm text-ink-3 font-sans mt-6 text-center">
            Don&apos;t have an account?{" "}
            <Link
              href="/request-access"
              className="text-p-blue hover:underline font-medium"
            >
              Request access
            </Link>
          </p>
        </div>

        {/* Right — navy testimonial panel (hidden on mobile) */}
        <div className="relative bg-navy hidden md:flex flex-col justify-between px-8 lg:px-12 py-14 overflow-hidden">
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ opacity: 0.06 }}
          >
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="white"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          <div className="relative z-10 flex items-center gap-2">
            <LiveDot color="green" />
            <span className="text-sm font-sans font-medium text-white/80">
              Live &middot; 32 companies
            </span>
          </div>

          <div className="relative z-10">
            <blockquote className="font-serif text-xl italic text-white/90 leading-relaxed mb-6">
              &ldquo;Primex took our dispatch from spreadsheets to real-time
              control overnight. We caught two incidents in the first week that
              we would have missed entirely.&rdquo;
            </blockquote>
            <div>
              <p className="text-white font-semibold font-sans text-sm">
                Marcus Reyes
              </p>
              <p className="text-white/50 font-sans text-xs mt-0.5">
                Director of Operations &middot; Northgate Security Co.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        initialEmail={email}
      />
    </div>
  );
}
