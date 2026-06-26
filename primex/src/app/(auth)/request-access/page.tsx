"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Shield, Send, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button, Field, TextInput, TextArea, Select } from "@/components/ui";
import { registerCompany } from "@/lib/data/actions/register";

const industryOptions = [
  { value: "retail", label: "Retail" },
  { value: "security_firm", label: "Security Firm" },
  { value: "logistics", label: "Logistics/Warehouse" },
  { value: "healthcare", label: "Healthcare" },
  { value: "multi_site", label: "Multi-site Operations" },
  { value: "other", label: "Other" },
];

const siteCountOptions = [
  { value: "1-3", label: "1-3" },
  { value: "4-10", label: "4-10" },
  { value: "11-25", label: "11-25" },
  { value: "25+", label: "25+" },
];

export default function RequestAccessPage() {
  const [submitted, setSubmitted] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [siteCount, setSiteCount] = useState("");
  const [message, setMessage] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [resultEmail, setResultEmail] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const industryToCompanyType: Record<string, string> = {
    retail: "Retail",
    security_firm: "Security Firm",
    logistics: "Warehouse",
    healthcare: "Other",
    multi_site: "Other",
    other: "Other",
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        const result = await registerCompany({
          fullName,
          email,
          companyName,
          companyType: industryToCompanyType[industry] || "Other",
          sites: siteCount,
          message,
        });
        setTempPassword(result.tempPassword);
        setResultEmail(result.email);
        setSubmitted(true);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
        setError(msg);
      }
    });
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl bg-surface border border-border shadow-xl px-6 py-8 sm:px-10 sm:py-12">
        {/* Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3 mb-8 sm:mb-10">
          <div className="w-9 h-9 bg-navy rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield size={18} className="text-white" strokeWidth={2} />
          </div>
          <span className="font-serif text-lg font-semibold text-ink leading-tight">
            Primex Security System
          </span>
        </div>

        {submitted ? (
          /* Success state */
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-14 h-14 rounded-full bg-p-green/10 flex items-center justify-center mb-5">
              <CheckCircle2 size={28} className="text-p-green" strokeWidth={2} />
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-ink mb-2">
              Account created.
            </h2>
            <p className="text-ink-3 text-sm font-sans mb-4 max-w-sm">
              Your company has been created and is pending admin approval.
            </p>
            <p className="text-ink-3 text-sm font-sans mb-4 max-w-sm">
              You can log in now with:
            </p>
            <div className="w-full max-w-sm bg-bg rounded-lg border border-border p-4 mb-4 text-left">
              <p className="text-xs text-ink-3 font-sans mb-1">Email</p>
              <p className="text-sm text-ink font-medium font-sans mb-3">{resultEmail}</p>
              <p className="text-xs text-ink-3 font-sans mb-1">Temporary password</p>
              <code className="block text-sm text-ink font-mono bg-surface border border-border rounded px-3 py-2 select-all">
                {tempPassword}
              </code>
            </div>
            <p className="text-ink-3 text-xs font-sans mb-8 max-w-sm">
              Your account is active but your company is in Pending status. A Primex admin will review and activate your company.
            </p>
            <Link href="/login">
              <Button variant="secondary" icon={ArrowLeft}>
                Go to login
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Heading */}
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-ink leading-tight mb-2">
              Request access
            </h1>
            <p className="text-ink-3 text-sm font-sans mb-6 sm:mb-8">
              Tell us about your organization and we&apos;ll get you set up.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Name + Email — 2-col on sm+ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full name" required>
                  <TextInput
                    value={fullName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                    placeholder="Jane Smith"
                    required
                  />
                </Field>
                <Field label="Work email" required>
                  <TextInput
                    type="email"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    placeholder="jane@company.com"
                    required
                  />
                </Field>
              </div>

              <Field label="Company name" required>
                <TextInput
                  value={companyName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompanyName(e.target.value)}
                  placeholder="Acme Security Inc."
                  required
                />
              </Field>

              {/* Industry + Sites — 2-col on sm+ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Industry">
                  <Select
                    value={industry}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setIndustry(e.target.value)}
                    options={industryOptions}
                    placeholder="Select industry"
                  />
                </Field>
                <Field label="Number of sites">
                  <Select
                    value={siteCount}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSiteCount(e.target.value)}
                    options={siteCountOptions}
                    placeholder="Select range"
                  />
                </Field>
              </div>

              <Field label="Message">
                <TextArea
                  value={message}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                  placeholder="Tell us what you're looking for..."
                />
              </Field>

              {error && (
                <p className="text-p-red text-sm font-sans">{error}</p>
              )}

              <Button
                variant="primary"
                size="lg"
                full
                icon={Send}
                type="submit"
                className="mt-2"
                disabled={isPending}
              >
                {isPending ? "Submitting..." : "Submit request"}
              </Button>
            </form>

            {/* Footer */}
            <p className="text-sm text-ink-3 font-sans mt-6 text-center">
              Already have an account?{" "}
              <Link href="/login" className="text-p-blue hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
