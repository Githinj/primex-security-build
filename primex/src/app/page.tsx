"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Shield,
  Video,
  Cpu,
  Check,
  Play,
  Store,
  Building,
  ClipboardList,
  MapPin,
  Home,
  Briefcase,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Phone,
  BookOpen,
  ExternalLink,
  Mail,
  ArrowRight,
} from "lucide-react";
import { Button, Card, Pill, Label, LiveDot, PhaseTag } from "@/components/ui";

// ─── SVG Grid Pattern ────────────────────────────────────────────────────────
function GridPattern({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`absolute inset-0 w-full h-full ${className}`}
      xmlns="http://www.w3.org/2000/svg"
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
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}

// ─── Navigation ──────────────────────────────────────────────────────────────
function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-navy rounded-md flex items-center justify-center flex-shrink-0">
            <Shield size={16} strokeWidth={2} className="text-white" />
          </div>
          <span className="font-serif text-base font-semibold text-ink leading-tight">
            Primex Security System
          </span>
        </div>

        {/* Center Links */}
        <div className="hidden md:flex items-center gap-7">
          {["Product", "Solutions", "Customers", "Pricing", "Resources"].map(
            (item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm text-ink-2 hover:text-ink transition-colors"
              >
                {item}
              </a>
            )
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-ink-2 hover:text-ink transition-colors"
          >
            Log in
          </Link>
          <Link href="/login">
            <Button variant="primary" size="md">
              Sign Up
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section className="px-6 pt-12 pb-20 max-w-7xl mx-auto" id="product">
      <div className="relative bg-navy rounded-2xl overflow-hidden px-8 py-20 text-center">
        {/* Grid overlay */}
        <GridPattern className="opacity-5" />

        <div className="relative z-10 flex flex-col items-center gap-6">
          <Pill tone="blue" size="sm" dot>
            Now live — AI-powered dispatch
          </Pill>

          <h1 className="font-serif text-5xl md:text-6xl font-bold text-white leading-tight max-w-3xl">
            When Seconds Matter,{" "}
            <span className="text-p-blue">Primex Responds</span>
          </h1>

          <p className="text-base md:text-lg text-white/70 max-w-xl leading-relaxed">
            Turn AI alerts into structured incidents and dispatch the right team
            in under 60 seconds.
          </p>

          <div className="flex flex-wrap gap-3 justify-center mt-2">
            <Link href="/login">
              <Button variant="primary" size="lg" icon={ArrowRight}>
                Get Started Free
              </Button>
            </Link>
            <Button variant="outlineWhite" size="lg" icon={Play}>
              Watch Demo
            </Button>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-3 gap-4 mt-10 w-full max-w-xl">
            {[
              { value: "4 min", label: "Average dispatch time" },
              { value: "1,248", label: "Incidents resolved last month" },
              { value: "32+", label: "Live sites monitored" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-navy-darker rounded-xl px-4 py-5 text-center"
              >
                <div className="font-serif text-3xl font-bold text-white leading-none mb-1.5">
                  {stat.value}
                </div>
                <div className="text-xs text-white/50 leading-snug">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Feature Cards ────────────────────────────────────────────────────────────
function FeaturesSection() {
  const features = [
    {
      icon: Video,
      title: "Smart Cameras",
      body: "Connect your existing CCTV or IP cameras with secure, encrypted streaming.",
      phase: "Phase 2",
    },
    {
      icon: Cpu,
      title: "Real-Time AI Detection",
      body: "Connect your existing CCTV or IP cameras with secure, encrypted streaming.",
      phase: "Phase 2",
    },
    {
      icon: Shield,
      title: "Rapid Guard Dispatch",
      body: "Connect your existing CCTV or IP cameras with secure, encrypted streaming.",
      phase: null,
    },
  ];

  return (
    <section className="px-6 pb-20 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {features.map((f) => (
          <Card key={f.title} className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-full bg-p-blue-soft flex items-center justify-center">
                <f.icon size={18} strokeWidth={2} className="text-p-blue" />
              </div>
              {f.phase && <PhaseTag>{f.phase}</PhaseTag>}
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-ink mb-1.5">
                {f.title}
              </h3>
              <p className="text-sm text-ink-3 leading-relaxed">{f.body}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

// ─── Solutions Section ─────────────────────────────────────────────────────────
const SOLUTIONS_TABS = [
  {
    id: "retail",
    label: "Retail & Convenience",
    icon: Store,
    tagline: "Security that pays for itself at the register.",
    blurb:
      "Primex monitors your store floor, parking lot, and entry points — so you can focus on serving customers, not managing risk.",
    bullets: [
      "Instant alerts for loitering and after-hours entry",
      "Guard dispatch in under 4 minutes",
      "Incident reports generated automatically",
      "Integrates with existing CCTV systems",
    ],
    stat: { value: "68%", label: "Reduction in theft incidents" },
    mini: [
      { value: "99.9%", label: "Uptime" },
      { value: "4 min", label: "SLA" },
      { value: "14", label: "Today" },
    ],
  },
  {
    id: "security",
    label: "Security Firms",
    icon: Briefcase,
    tagline: "Dispatch smarter. Bill more. Scale faster.",
    blurb:
      "Primex gives your control room the tools to handle more sites with fewer operators — without sacrificing response quality.",
    bullets: [
      "Multi-site dashboard for your whole portfolio",
      "AI triage reduces false alarm fatigue",
      "Guard tracking and dispatch timeline",
      "White-label reporting for your clients",
    ],
    stat: { value: "3×", label: "More sites per operator" },
    mini: [
      { value: "99.9%", label: "Uptime" },
      { value: "4 min", label: "SLA" },
      { value: "31", label: "Today" },
    ],
  },
  {
    id: "multisite",
    label: "Multi-site Operators",
    icon: MapPin,
    tagline: "One view across every location.",
    blurb:
      "Whether you manage 5 sites or 500, Primex gives you a single pane of glass for real-time security awareness across your entire portfolio.",
    bullets: [
      "Consolidated incident feed across all sites",
      "Per-site SLA tracking and reporting",
      "Role-based access for site managers",
      "Automated escalation rules per location",
    ],
    stat: { value: "32+", label: "Sites on Primex today" },
    mini: [
      { value: "99.9%", label: "Uptime" },
      { value: "4 min", label: "SLA" },
      { value: "22", label: "Today" },
    ],
  },
  {
    id: "warehouses",
    label: "Warehouses & Logistics",
    icon: Building,
    tagline: "Protect the perimeter. Protect the payload.",
    blurb:
      "Large footprints, high-value cargo, and complex access points. Primex AI watches the zones humans can't — around the clock.",
    bullets: [
      "Perimeter breach detection with AI camera zones",
      "Vehicle and personnel access logging",
      "Immediate guard dispatch to flagged zones",
      "Compliance-ready incident documentation",
    ],
    stat: { value: "60s", label: "Average AI-to-dispatch time" },
    mini: [
      { value: "99.9%", label: "Uptime" },
      { value: "4 min", label: "SLA" },
      { value: "8", label: "Today" },
    ],
  },
];

function SolutionsSection() {
  const [activeTab, setActiveTab] = useState(0);
  const tab = SOLUTIONS_TABS[activeTab];

  return (
    <section className="px-6 pb-24 max-w-7xl mx-auto" id="solutions">
      <div className="text-center mb-10">
        <Label className="mb-3 block">Solutions</Label>
        <h2 className="font-serif text-4xl font-bold text-ink">
          Built for every security use case
        </h2>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 justify-center mb-10">
        {SOLUTIONS_TABS.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(i)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium font-sans transition-colors cursor-pointer ${
              activeTab === i
                ? "bg-navy text-white"
                : "bg-surface border border-border text-ink-2 hover:bg-surface-subtle"
            }`}
          >
            <t.icon size={14} strokeWidth={2} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: text */}
        <div className="flex flex-col gap-5">
          <p className="font-serif text-xl italic text-ink-2">{tab.tagline}</p>
          <p className="text-sm text-ink-3 leading-relaxed">{tab.blurb}</p>
          <ul className="flex flex-col gap-3">
            {tab.bullets.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-p-green-soft flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check size={11} strokeWidth={3} className="text-p-green" />
                </div>
                <span className="text-sm text-ink-2">{b}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2">
            <Link href="/login">
              <Button variant="dark" size="md" icon={ChevronRight}>
                Get started for {tab.label}
              </Button>
            </Link>
          </div>
        </div>

        {/* Right: stat card */}
        <div className="bg-navy rounded-2xl p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <div className="font-serif text-5xl font-bold text-white">
              {tab.stat.value}
            </div>
            <div className="text-sm text-white/60">{tab.stat.label}</div>
          </div>

          <div className="flex items-center gap-2">
            <LiveDot color="green" />
            <span className="text-xs text-white/50">Live — updated now</span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/10">
            {tab.mini.map((m) => (
              <div key={m.label} className="flex flex-col gap-1">
                <div className="font-serif text-xl font-semibold text-white">
                  {m.value}
                </div>
                <div className="text-[11px] text-white/40 uppercase tracking-wider font-sans">
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Customers Section ─────────────────────────────────────────────────────────
const LOGOS = [
  { icon: Store, name: "Meridian Retail" },
  { icon: Building, name: "Vault Security" },
  { icon: MapPin, name: "CityWatch Co." },
  { icon: Briefcase, name: "Apex Guard" },
  { icon: Home, name: "NestSafe" },
  { icon: ClipboardList, name: "Logistics One" },
];

const TESTIMONIALS = [
  {
    quote:
      "Primex cut our average response time from 18 minutes down to under 4. Our insurance premiums followed.",
    name: "James Okafor",
    title: "Director of Security",
    company: "Meridian Retail Group",
  },
  {
    quote:
      "We manage 14 sites with a team of 3 operators. Before Primex, that was impossible.",
    name: "Sarah Chen",
    title: "Operations Manager",
    company: "Vault Security Services",
  },
  {
    quote:
      "The AI triage alone eliminated 80% of the false alarms our guards were chasing every night.",
    name: "Marcus DuPont",
    title: "Head of Loss Prevention",
    company: "CityWatch Co.",
  },
];

function CustomersSection() {
  return (
    <section className="px-6 pb-24 max-w-7xl mx-auto" id="customers">
      <div className="text-center mb-12">
        <Label className="mb-3 block">Customers</Label>
        <h2 className="font-serif text-4xl font-bold text-ink">
          Operators trust Primex to be there at 2 AM.
        </h2>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-border rounded-xl overflow-hidden mb-12">
        {[
          { value: "32+", label: "Active sites" },
          { value: "240+", label: "Guards dispatched this month" },
          { value: "1.2k+", label: "Incidents resolved" },
          { value: "99.4%", label: "Platform uptime" },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`px-6 py-8 text-center bg-surface ${
              i < 3 ? "border-r border-border" : ""
            }`}
          >
            <div className="font-serif text-3xl font-bold text-ink mb-1">
              {s.value}
            </div>
            <div className="text-xs text-ink-3">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Logo strip */}
      <div className="flex flex-wrap justify-center gap-8 mb-14 opacity-40">
        {LOGOS.map((l) => (
          <div key={l.name} className="flex items-center gap-2">
            <l.icon size={18} strokeWidth={1.5} className="text-ink-2" />
            <span className="font-serif text-base font-semibold text-ink-2">
              {l.name}
            </span>
          </div>
        ))}
      </div>

      {/* Testimonials */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {TESTIMONIALS.map((t) => (
          <Card key={t.name} className="flex flex-col justify-between gap-6">
            <p className="text-sm text-ink-2 leading-relaxed italic">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div>
              <div className="text-sm font-semibold text-ink font-sans">
                {t.name}
              </div>
              <div className="text-xs text-ink-3 mt-0.5">
                {t.title} &mdash; {t.company}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

// ─── Pricing Section ──────────────────────────────────────────────────────────
const PLANS = [
  {
    name: "Starter",
    tagline: "For single-site operators getting started.",
    price: "$399",
    period: "/mo",
    featured: false,
    cta: "Start free trial",
    features: [
      "Up to 2 active sites",
      "10 camera streams",
      "AI motion detection",
      "Guard dispatch (manual)",
      "Basic incident reports",
      "Email support",
    ],
  },
  {
    name: "Professional",
    tagline: "For growing operations that need full automation.",
    price: "$1,499",
    period: "/mo",
    featured: true,
    badge: "Most popular",
    cta: "Get Professional",
    features: [
      "Up to 15 active sites",
      "Unlimited camera streams",
      "Real-time AI detection",
      "Automated guard dispatch",
      "Advanced incident reports",
      "SLA-backed response times",
      "Priority support",
      "API access",
    ],
  },
  {
    name: "Enterprise",
    tagline: "Custom deployments for large-scale operators.",
    price: "Custom",
    period: "",
    featured: false,
    cta: "Contact sales",
    features: [
      "Unlimited sites",
      "Dedicated account manager",
      "Custom SLA agreements",
      "White-label options",
      "SSO & advanced security",
      "On-premise deployment",
      "24/7 phone support",
    ],
  },
];

function PricingSection() {
  return (
    <section className="px-6 pb-24 max-w-7xl mx-auto" id="pricing">
      <div className="text-center mb-12">
        <Label className="mb-3 block">Pricing</Label>
        <h2 className="font-serif text-4xl font-bold text-ink">
          Simple, transparent pricing
        </h2>
        <p className="text-sm text-ink-3 mt-3 max-w-md mx-auto">
          No hidden fees. Cancel anytime. All plans include a 14-day free trial.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl p-7 flex flex-col gap-6 ${
              plan.featured
                ? "bg-navy text-white shadow-2xl shadow-navy/30 scale-105 origin-top"
                : "bg-surface border border-border"
            }`}
          >
            {/* Header */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span
                  className={`font-serif text-xl font-semibold ${
                    plan.featured ? "text-white" : "text-ink"
                  }`}
                >
                  {plan.name}
                </span>
                {plan.badge && (
                  <Pill tone="blue" size="sm">
                    {plan.badge}
                  </Pill>
                )}
              </div>
              <p
                className={`text-xs leading-relaxed ${
                  plan.featured ? "text-white/60" : "text-ink-3"
                }`}
              >
                {plan.tagline}
              </p>
            </div>

            {/* Price */}
            <div className="flex items-end gap-1">
              <span
                className={`font-serif text-4xl font-bold ${
                  plan.featured ? "text-white" : "text-ink"
                }`}
              >
                {plan.price}
              </span>
              {plan.period && (
                <span
                  className={`text-sm mb-1 ${
                    plan.featured ? "text-white/50" : "text-ink-3"
                  }`}
                >
                  {plan.period}
                </span>
              )}
            </div>

            {/* CTA */}
            <Link href="/login" className="block">
              <Button
                variant={plan.featured ? "primary" : "secondary"}
                size="md"
                full
              >
                {plan.cta}
              </Button>
            </Link>

            {/* Features */}
            <ul className="flex flex-col gap-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <CheckCircle2
                    size={14}
                    strokeWidth={2}
                    className={
                      plan.featured ? "text-p-blue flex-shrink-0" : "text-p-green flex-shrink-0"
                    }
                  />
                  <span
                    className={`text-sm ${
                      plan.featured ? "text-white/80" : "text-ink-2"
                    }`}
                  >
                    {f}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Bottom CTA ───────────────────────────────────────────────────────────────
function BottomCTA() {
  return (
    <section className="px-6 pb-20 max-w-7xl mx-auto">
      <div className="relative bg-navy rounded-2xl overflow-hidden px-8 py-20 text-center">
        <GridPattern className="opacity-5" />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-white max-w-2xl leading-tight">
            Your sites never sleep. Neither does Primex.
          </h2>
          <p className="text-base text-white/60 max-w-md">
            Join operators across the country who rely on Primex for 24/7
            AI-powered security and rapid guard dispatch.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            <Link href="/login">
              <Button variant="primary" size="lg" icon={ArrowRight}>
                Get Started
              </Button>
            </Link>
            <Button variant="outlineWhite" size="lg" icon={Play}>
              Watch Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={14} strokeWidth={2} className="text-navy" />
          <span className="text-xs text-ink-3">
            &copy; 2026 Primex Security Systems
          </span>
        </div>
        <div className="flex items-center gap-5">
          {["Status", "Docs", "Privacy", "Terms", "Contact"].map((item) => (
            <a
              key={item}
              href="#"
              className="text-xs text-ink-3 hover:text-ink transition-colors"
            >
              {item}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <LandingNav />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <SolutionsSection />
        <CustomersSection />
        <PricingSection />
        <BottomCTA />
      </main>
      <Footer />
    </div>
  );
}
