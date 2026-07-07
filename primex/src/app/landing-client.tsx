"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Shield,
  Check,
  Play,
  Store,
  Building,
  ClipboardList,
  MapPin,
  Home,
  Briefcase,
  ArrowRight,
  Eye,
  Zap,
  Lock,
  Menu,
  X,
} from "lucide-react";

// ─── Professional Images (Unsplash) ──────────────────────────────────────────
const IMAGES = {
  hero: "https://images.unsplash.com/photo-1558002038-1055907df827?w=1920&q=80&auto=format&fit=crop",
  monitoring: "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800&q=80&auto=format&fit=crop",
  dispatch: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80&auto=format&fit=crop",
  guards: "https://images.unsplash.com/photo-1521791055366-0d553872125f?w=800&q=80&auto=format&fit=crop",
  retail: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80&auto=format&fit=crop",
  warehouse: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80&auto=format&fit=crop",
  multisite: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80&auto=format&fit=crop",
  securityFirm: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80&auto=format&fit=crop",
  cctv: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&q=80&auto=format&fit=crop",
  dashboard: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80&auto=format&fit=crop",
  controlRoom: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80&auto=format&fit=crop",
};

// ─── Animated Counter ────────────────────────────────────────────────────────
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1600;
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * value));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// ─── Reveal on Scroll ────────────────────────────────────────────────────────
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Grid Pattern ────────────────────────────────────────────────────────────
function GridPattern({ id = "grid", className = "" }: { id?: string; className?: string }) {
  return (
    <svg className={`absolute inset-0 w-full h-full ${className}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id={id} width="44" height="44" patternUnits="userSpaceOnUse">
          <path d="M 44 0 L 0 0 0 44" fill="none" stroke="white" strokeWidth="0.4" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

// ─── Navigation ──────────────────────────────────────────────────────────────
function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "border-border bg-white/92 backdrop-blur-xl shadow-sm"
          : "border-transparent bg-white/80 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16">
        <a href="#top" className="flex items-center gap-2 group">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-navy rounded-lg flex items-center justify-center flex-shrink-0 group-hover:shadow-lg group-hover:shadow-navy/20 transition-shadow">
            <Shield size={14} strokeWidth={2.5} className="text-white" />
          </div>
          <span className="font-serif text-base sm:text-lg font-bold text-ink tracking-tight">
            Primex
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {["Product", "Solutions", "Customers", "Pricing"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-[13px] font-medium text-ink-3 hover:text-ink transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-px after:bg-p-blue hover:after:w-full after:transition-all"
            >
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden sm:inline text-[13px] font-medium text-ink-2 hover:text-ink transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-navy text-white text-xs sm:text-[13px] font-medium rounded-lg hover:bg-ink transition-colors"
          >
            Get Started
            <ArrowRight size={12} strokeWidth={2.5} />
          </Link>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-8 h-8 flex items-center justify-center text-ink-2 cursor-pointer"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-white px-4 py-4 flex flex-col gap-3">
          {["Product", "Solutions", "Customers", "Pricing"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              onClick={() => setMobileOpen(false)}
              className="text-sm font-medium text-ink-2 py-2"
            >
              {item}
            </a>
          ))}
          <Link href="/login" className="text-sm font-medium text-p-blue py-2">
            Log in
          </Link>
        </div>
      )}
    </nav>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section className="relative px-4 sm:px-6 pt-4 sm:pt-8 pb-12 sm:pb-24 max-w-7xl mx-auto" id="top">
      <div className="relative bg-navy rounded-2xl sm:rounded-3xl overflow-hidden">
        {/* Background image — operations center */}
        <Image
          src={IMAGES.hero}
          alt="Security monitoring center"
          fill
          className="object-cover opacity-[0.15] scale-105"
          priority
          sizes="100vw"
        />
        {/* Multi-layer atmospheric gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-navy/40 via-navy/70 to-navy pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-p-blue/[0.06] via-transparent to-p-blue/[0.04] pointer-events-none" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-p-blue/[0.07] rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-p-blue/[0.05] rounded-full blur-[120px] pointer-events-none" />
        <GridPattern id="hero-grid" className="opacity-[0.03]" />

        {/* Animated scan lines */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-p-blue/40 to-transparent"
            style={{ animation: "scanDown 4s ease-in-out infinite" }}
          />
          <div
            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
            style={{ animation: "scanDown 6s ease-in-out 2s infinite" }}
          />
        </div>

        {/* Edge accent lines */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-p-blue/60 to-transparent" />
        <div className="absolute left-0 top-1/4 w-px h-32 bg-gradient-to-b from-transparent via-p-blue/20 to-transparent hidden md:block" />
        <div className="absolute right-0 top-1/3 w-px h-32 bg-gradient-to-b from-transparent via-p-blue/20 to-transparent hidden md:block" />

        <div className="relative z-10 px-5 sm:px-8 py-16 sm:py-20 md:py-24">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            {/* Live badge */}
            <Reveal>
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] mb-6 sm:mb-8 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-p-green animate-ping opacity-75" />
                  <span className="relative rounded-full h-2 w-2 bg-p-green" />
                </span>
                <span className="text-[11px] sm:text-xs font-medium text-white/70 tracking-wide">
                  Live — monitoring 240+ sites right now
                </span>
                <span className="w-px h-3 bg-white/10" />
                <span className="text-[11px] sm:text-xs font-medium text-p-blue">
                  See how it works
                </span>
              </div>
            </Reveal>

            {/* Headline */}
            <Reveal delay={80}>
              <h1 className="font-serif text-[2rem] sm:text-5xl md:text-[4.5rem] lg:text-[5rem] font-bold text-white leading-[1.1] sm:leading-[1.05] tracking-tight">
                When seconds matter,
                <br />
                <span className="relative inline-block mt-1 sm:mt-2">
                  <span className="relative z-10 bg-gradient-to-r from-white via-p-blue-soft to-white bg-clip-text text-transparent">
                    Primex responds.
                  </span>
                  {/* Glow underneath the text */}
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-4 bg-p-blue/20 blur-xl rounded-full" />
                </span>
              </h1>
            </Reveal>

            {/* Subheading */}
            <Reveal delay={160}>
              <p className="text-sm sm:text-lg md:text-xl text-white/50 max-w-xl mt-5 sm:mt-7 leading-relaxed font-light px-2">
                AI-powered camera monitoring turns threats into dispatched guards
                in under 60 seconds. No spreadsheets. No phone trees.
              </p>
            </Reveal>

            {/* CTA buttons */}
            <Reveal delay={240}>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 sm:mt-10 w-full sm:w-auto px-4 sm:px-0">
                <Link
                  href="/login"
                  className="group relative inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3 sm:py-3.5 bg-p-blue text-white text-sm font-semibold rounded-xl hover:bg-p-blue-hover transition-all hover:shadow-xl hover:shadow-p-blue/30 overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative flex items-center gap-2">
                    Start free trial
                    <ArrowRight size={15} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Link>
                <button className="inline-flex items-center justify-center gap-2.5 px-5 sm:px-6 py-3 sm:py-3.5 text-white/80 text-sm font-medium rounded-xl border border-white/15 hover:bg-white/[0.06] hover:border-white/25 transition-all cursor-pointer">
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                    <Play size={10} strokeWidth={3} className="text-white ml-0.5" />
                  </div>
                  Watch demo
                </button>
              </div>
            </Reveal>

            {/* Trust badges */}
            <Reveal delay={300}>
              <div className="flex flex-wrap items-center justify-center gap-x-5 sm:gap-x-8 gap-y-2 mt-8 sm:mt-10">
                {[
                  { icon: Shield, text: "SOC 2 Compliant" },
                  { icon: Lock, text: "256-bit Encryption" },
                  { icon: Eye, text: "99.4% Uptime SLA" },
                ].map((badge) => (
                  <div key={badge.text} className="flex items-center gap-1.5 sm:gap-2">
                    <badge.icon size={11} strokeWidth={2} className="text-white/30" />
                    <span className="text-[10px] sm:text-[11px] text-white/35 font-medium tracking-wide">
                      {badge.text}
                    </span>
                  </div>
                ))}
              </div>
            </Reveal>

            {/* Floating dashboard preview */}
            <Reveal delay={400}>
              <div className="relative mt-10 sm:mt-14 w-full max-w-3xl mx-auto">
                {/* Glow behind the dashboard */}
                <div className="absolute -inset-4 bg-p-blue/[0.08] rounded-3xl blur-2xl" />

                {/* Dashboard frame */}
                <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border border-white/[0.1] shadow-2xl shadow-black/40">
                  {/* Browser chrome */}
                  <div className="bg-navy-tile/80 backdrop-blur-sm px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 border-b border-white/[0.06]">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-p-red/60" />
                      <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-p-amber/60" />
                      <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-p-green/60" />
                    </div>
                    <div className="flex-1 mx-4 sm:mx-8">
                      <div className="bg-white/[0.06] rounded-md py-1 px-3 text-[9px] sm:text-[10px] text-white/30 text-center font-mono">
                        app.primex.security/dashboard
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inset-0 rounded-full bg-p-green animate-ping opacity-60" />
                        <span className="relative rounded-full h-1.5 w-1.5 bg-p-green" />
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-white/40 font-medium">Live</span>
                    </div>
                  </div>

                  {/* Dashboard screenshot */}
                  <div className="relative aspect-[16/9] sm:aspect-[2/1]">
                    <Image
                      src={IMAGES.dashboard}
                      alt="Primex Security Dashboard — real-time monitoring interface"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 768px"
                    />
                    {/* Overlay gradient for depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-navy/60 via-transparent to-transparent" />

                    {/* Floating HUD elements */}
                    <div className="absolute top-3 sm:top-4 left-3 sm:left-4 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-navy/70 backdrop-blur-sm border border-white/[0.08]">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inset-0 rounded-full bg-p-red animate-ping opacity-75" />
                        <span className="relative rounded-full h-1.5 w-1.5 bg-p-red" />
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-semibold text-white/80 uppercase tracking-wider">3 Active Alerts</span>
                    </div>

                    <div className="absolute top-3 sm:top-4 right-3 sm:right-4 px-2.5 py-1 rounded-lg bg-navy/70 backdrop-blur-sm border border-white/[0.08]">
                      <span className="text-[9px] sm:text-[10px] font-medium text-white/60 tabular-nums">09:53:42 AM</span>
                    </div>

                    <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4">
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: "Cameras Online", value: "78/86", color: "text-p-green" },
                          { label: "Guards On Duty", value: "3/4", color: "text-p-blue" },
                          { label: "Avg Response", value: "4m 12s", color: "text-white" },
                        ].map((hud) => (
                          <div key={hud.label} className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-navy/70 backdrop-blur-sm border border-white/[0.08]">
                            <div className={`text-[10px] sm:text-xs font-bold tabular-nums ${hud.color}`}>{hud.value}</div>
                            <div className="text-[8px] sm:text-[9px] text-white/40 uppercase tracking-wider mt-0.5">{hud.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reflection fade */}
                <div className="absolute -bottom-8 left-4 right-4 h-8 bg-gradient-to-b from-white/[0.02] to-transparent rounded-b-2xl blur-sm" />
              </div>
            </Reveal>

            {/* Stat tiles */}
            <Reveal delay={500}>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-10 sm:mt-14 w-full max-w-xl px-2 sm:px-0">
                {[
                  { value: 4, suffix: " min", label: "Avg dispatch" },
                  { value: 1248, suffix: "", label: "Incidents resolved" },
                  { value: 32, suffix: "+", label: "Live sites" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="group bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-4 sm:py-6 text-center hover:bg-white/[0.06] hover:border-white/[0.1] transition-all"
                  >
                    <div className="font-serif text-xl sm:text-3xl md:text-4xl font-bold text-white leading-none tracking-tight">
                      <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                    </div>
                    <div className="text-[9px] sm:text-[11px] text-white/40 mt-1.5 sm:mt-2.5 uppercase tracking-widest font-medium">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    </section>
  );
}

// ─── Operational Showcase ─────────────────────────────────────────────────────
function OperationalShowcase() {
  return (
    <section className="px-4 sm:px-6 pb-16 sm:pb-28 max-w-7xl mx-auto">
      <Reveal>
        <div className="text-center mb-10 sm:mb-14">
          <span className="text-[11px] font-semibold text-p-blue uppercase tracking-[0.2em]">
            The Platform
          </span>
          <h2 className="font-serif text-2xl sm:text-4xl md:text-5xl font-bold text-ink mt-3 sm:mt-4 tracking-tight px-2">
            Built for real security operations
          </h2>
          <p className="text-xs sm:text-sm text-ink-3 mt-3 max-w-lg mx-auto leading-relaxed px-4">
            From AI camera feeds to guard dispatch — every layer designed for operators who can&apos;t afford downtime.
          </p>
        </div>
      </Reveal>

      {/* Image grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <Reveal delay={0} className="col-span-2 row-span-2">
          <div className="relative rounded-xl sm:rounded-2xl overflow-hidden aspect-square group">
            <Image
              src={IMAGES.controlRoom}
              alt="Security control room with multiple monitoring screens"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/20 to-transparent" />
            <div className="absolute bottom-3 sm:bottom-5 left-3 sm:left-5 right-3 sm:right-5">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-p-green/20 border border-p-green/30 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-p-green" />
                <span className="text-[10px] font-semibold text-p-green">Live</span>
              </span>
              <h3 className="font-serif text-base sm:text-xl font-bold text-white">24/7 Operations Center</h3>
              <p className="text-[11px] sm:text-xs text-white/60 mt-1">Multi-screen surveillance with AI-powered threat detection</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="relative rounded-xl sm:rounded-2xl overflow-hidden aspect-square group">
            <Image
              src={IMAGES.dashboard}
              alt="AI analytics dashboard"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/70 to-transparent" />
            <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3">
              <p className="text-[10px] sm:text-xs font-semibold text-white">AI Analytics</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={150}>
          <div className="relative rounded-xl sm:rounded-2xl overflow-hidden aspect-square group">
            <Image
              src={IMAGES.cctv}
              alt="CCTV camera monitoring"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/70 to-transparent" />
            <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3">
              <p className="text-[10px] sm:text-xs font-semibold text-white">Smart Cameras</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={200}>
          <div className="relative rounded-xl sm:rounded-2xl overflow-hidden aspect-square group">
            <Image
              src={IMAGES.dispatch}
              alt="Dispatch operators at work"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/70 to-transparent" />
            <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3">
              <p className="text-[10px] sm:text-xs font-semibold text-white">Rapid Dispatch</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={250}>
          <div className="relative rounded-xl sm:rounded-2xl overflow-hidden aspect-square group">
            <Image
              src={IMAGES.guards}
              alt="Security guards responding"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/70 to-transparent" />
            <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3">
              <p className="text-[10px] sm:text-xs font-semibold text-white">Field Response</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Feature Cards ────────────────────────────────────────────────────────────
function FeaturesSection() {
  const features = [
    {
      icon: Eye,
      title: "Smart Monitoring",
      body: "AI-powered cameras detect motion, people, vehicles, and anomalies — distinguishing real threats from noise in real time.",
      image: IMAGES.monitoring,
      phase: "Phase 2",
    },
    {
      icon: Zap,
      title: "Instant Dispatch",
      body: "Convert any alert into a dispatched guard in two clicks. GPS routing, tap-to-call, and live status tracking included.",
      image: IMAGES.dispatch,
      phase: null,
    },
    {
      icon: Lock,
      title: "Total Isolation",
      body: "Every company is a hard data boundary. Your clients see only their sites. Your dispatchers see only their scope.",
      image: IMAGES.dashboard,
      phase: null,
    },
  ];

  return (
    <section className="px-4 sm:px-6 pb-16 sm:pb-28 max-w-7xl mx-auto" id="product">
      <Reveal>
        <div className="text-center mb-10 sm:mb-14">
          <span className="text-[11px] font-semibold text-p-blue uppercase tracking-[0.2em]">
            How it works
          </span>
          <h2 className="font-serif text-2xl sm:text-4xl md:text-5xl font-bold text-ink mt-3 sm:mt-4 tracking-tight px-2">
            Three layers of protection
          </h2>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
        {features.map((f, i) => (
          <Reveal key={f.title} delay={i * 100}>
            <div className="group relative bg-surface border border-border rounded-xl sm:rounded-2xl overflow-hidden hover:border-border-strong hover:shadow-xl hover:shadow-ink/[0.03] transition-all duration-300 h-full flex flex-col">
              {/* Image */}
              <div className="relative h-36 sm:h-44 overflow-hidden">
                <Image
                  src={f.image}
                  alt={f.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />

                {f.phase && (
                  <span className="absolute top-3 right-3 text-[10px] font-semibold text-p-blue bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {f.phase}
                  </span>
                )}

                <div className="absolute bottom-3 left-4">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-navy/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <f.icon size={18} strokeWidth={1.8} className="text-white" />
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6 flex flex-col flex-1">
                <h3 className="font-serif text-lg sm:text-xl font-bold text-ink mb-2 tracking-tight">
                  {f.title}
                </h3>
                <p className="text-xs sm:text-sm text-ink-3 leading-relaxed flex-1">{f.body}</p>
                <div className="mt-4 sm:mt-5 pt-4 border-t border-border">
                  <span className="text-xs font-medium text-p-blue inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all cursor-pointer">
                    Learn more <ArrowRight size={12} strokeWidth={2.5} />
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ─── Solutions Section ─────────────────────────────────────────────────────────
const SOLUTIONS = [
  {
    id: "retail",
    label: "Retail",
    icon: Store,
    tagline: "When every minute the door is closed costs money.",
    blurb: "Liquor stores, mini-markets, and 24-hour convenience operators handle high-value goods and frequent theft attempts. Primex turns alerts into dispatched response in under 60 seconds.",
    bullets: [
      "Manual + AI-flagged alerts routed to one dispatcher",
      "Tap-to-call guards in the right zone",
      "Business owners see only their store",
      "Audit-grade logs for insurance claims",
    ],
    image: IMAGES.retail,
    stat: { value: "9 min", label: "Average dispatch in retail" },
    live: "Operating",
  },
  {
    id: "security",
    label: "Security Firms",
    icon: Shield,
    tagline: "Manage every client from one console.",
    blurb: "Your firm protects many businesses. Primex's strict per-tenant isolation lets your dispatchers handle multiple companies without ever leaking data.",
    bullets: [
      "Strict company-level isolation built in",
      "One dispatch board across all your clients",
      "Per-client reports your customers love",
      "Scale without adding headcount",
    ],
    image: IMAGES.securityFirm,
    stat: { value: "3\u00d7", label: "More sites per operator" },
    live: "Active dispatch",
  },
  {
    id: "multisite",
    label: "Multi-site",
    icon: Building,
    tagline: "Your district manager finally has one view.",
    blurb: "Restaurant groups, retail chains, and franchise operators get a single dashboard that surfaces what needs attention — and lets each store owner see only theirs.",
    bullets: [
      "Roll up alerts across every site",
      "Filter by region, risk, or hours",
      "Per-site business client portals",
      "Company-scoped team management",
    ],
    image: IMAGES.multisite,
    stat: { value: "240+", label: "Sites monitored today" },
    live: "Rolling up",
  },
  {
    id: "warehouse",
    label: "Warehouses",
    icon: ClipboardList,
    tagline: "After-hours patrols without a phone tree.",
    blurb: "Loading bays, cold storage, and yard perimeters generate alerts at 2 AM. Primex hands them off to the right guard with location, notes, and a clean status flow.",
    bullets: [
      "Geo-tagged dispatch with directions",
      "Guard mobile app with status flow",
      "Photo + note attachments on resolution",
      "Full audit trail per incident",
    ],
    image: IMAGES.warehouse,
    stat: { value: "98%", label: "Resolution rate" },
    live: "Night shift",
  },
];

function SolutionsSection() {
  const [active, setActive] = useState(0);
  const tab = SOLUTIONS[active];

  return (
    <section className="relative py-16 sm:py-28 scroll-mt-24 overflow-hidden" id="solutions">
      <div className="absolute inset-0 bg-gradient-to-b from-bg via-surface to-bg pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <Reveal>
          <div className="mb-10 sm:mb-14">
            <span className="text-[11px] font-semibold text-p-blue uppercase tracking-[0.2em]">
              Solutions
            </span>
            <h2 className="font-serif text-2xl sm:text-4xl md:text-5xl font-bold text-ink mt-3 sm:mt-4 tracking-tight max-w-lg">
              Built for the way you <em className="not-italic font-normal text-ink-3">actually</em> operate.
            </h2>
          </div>
        </Reveal>

        {/* Tab bar */}
        <Reveal delay={80}>
          <div className="flex overflow-x-auto gap-1 mb-8 sm:mb-14 border-b border-border -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
            {SOLUTIONS.map((t, i) => (
              <button
                key={t.id}
                onClick={() => setActive(i)}
                className={`relative inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 text-xs sm:text-[13px] font-sans transition-all cursor-pointer -mb-px whitespace-nowrap flex-shrink-0 ${
                  active === i
                    ? "text-ink font-semibold"
                    : "text-ink-3 hover:text-ink-2"
                }`}
              >
                <t.icon size={14} strokeWidth={2} />
                {t.label}
                {active === i && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-p-blue rounded-full" />
                )}
              </button>
            ))}
          </div>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-start">
          {/* Left */}
          <Reveal delay={120}>
            <div className="flex flex-col gap-4 sm:gap-6">
              <div className="inline-flex items-center gap-2 self-start px-3 py-1 bg-p-blue-soft rounded-full">
                <tab.icon size={13} strokeWidth={2} className="text-p-blue" />
                <span className="text-[11px] font-semibold text-p-blue tracking-wide">{tab.label}</span>
              </div>

              <h3 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-ink italic tracking-tight leading-snug">
                {tab.tagline}
              </h3>

              <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">{tab.blurb}</p>

              <div className="flex flex-col gap-2.5 sm:gap-3 mt-1 sm:mt-2">
                {tab.bullets.map((b) => (
                  <div key={b} className="flex items-start gap-2.5 sm:gap-3">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-p-blue/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={10} strokeWidth={3} className="text-p-blue" />
                    </div>
                    <span className="text-xs sm:text-sm text-ink-2">{b}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-p-blue hover:text-p-blue-hover transition-colors mt-2 group"
              >
                Get started
                <ArrowRight size={14} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </Reveal>

          {/* Right: image + stat card */}
          <Reveal delay={200}>
            <div className="relative rounded-xl sm:rounded-2xl overflow-hidden">
              {/* Industry image */}
              <div className="relative h-48 sm:h-56">
                <Image
                  src={tab.image}
                  alt={tab.label}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-navy/40 to-navy" />
              </div>

              {/* Stats overlay */}
              <div className="bg-navy p-5 sm:p-8">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <span className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-semibold">
                    Operator view
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inset-0 rounded-full bg-white animate-ping opacity-50" />
                      <span className="relative rounded-full h-1.5 w-1.5 bg-white" />
                    </span>
                    <span className="text-[11px] text-white/50 font-medium">{tab.live}</span>
                  </div>
                </div>

                <div className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-none">
                  {tab.stat.value}
                </div>
                <div className="text-xs sm:text-sm text-white/50 mt-2 sm:mt-3">{tab.stat.label}</div>

                <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-white/[0.08] grid grid-cols-3 gap-3 sm:gap-4">
                  {[
                    { l: "Uptime", v: "99.4%" },
                    { l: "SLA", v: "< 10 min" },
                    { l: "Today", v: "9 ops" },
                  ].map((m) => (
                    <div key={m.l}>
                      <div className="text-[9px] sm:text-[10px] text-white/35 uppercase tracking-[0.15em] font-semibold">{m.l}</div>
                      <div className="text-xs sm:text-sm text-white font-medium mt-1 sm:mt-1.5 tabular-nums">{m.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ─── Customers Section ─────────────────────────────────────────────────────────
const LOGOS = [
  { icon: Store, name: "Sunset Liquor" },
  { icon: Shield, name: "Northgate" },
  { icon: Briefcase, name: "Verde Markets" },
  { icon: ClipboardList, name: "Atlas Logistics" },
  { icon: Home, name: "Riverline" },
  { icon: MapPin, name: "Hudson Mini" },
];

const TESTIMONIALS = [
  {
    quote: "Primex took our dispatch from spreadsheets and group texts to a single console our guards actually want to use.",
    name: "Marcus Reyes",
    title: "Director of Operations",
    company: "Northgate Security Co.",
  },
  {
    quote: "Three liquor stores, one screen. We catch issues before the next shift comes on. The portal my store managers see — that alone justified switching.",
    name: "Amar Zindani",
    title: "Owner",
    company: "Sunset Liquor Group",
  },
  {
    quote: "I'm not a security person. I just want to know my store is safe. Primex tells me in plain English. When something's wrong, a guard shows up.",
    name: "Maria Chen",
    title: "Owner",
    company: "Sunset Liquor — Bay Ridge",
  },
];

function CustomersSection() {
  return (
    <section className="px-4 sm:px-6 py-16 sm:py-28 max-w-7xl mx-auto scroll-mt-24" id="customers">
      <Reveal>
        <div className="mb-10 sm:mb-16">
          <span className="text-[11px] font-semibold text-p-blue uppercase tracking-[0.2em]">
            Customers
          </span>
          <h2 className="font-serif text-2xl sm:text-4xl md:text-5xl font-bold text-ink mt-3 sm:mt-4 tracking-tight max-w-2xl">
            Operators trust Primex to be there <em className="not-italic font-normal text-ink-3">at 2&nbsp;AM.</em>
          </h2>
        </div>
      </Reveal>

      {/* Stats strip */}
      <Reveal delay={80}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden mb-10 sm:mb-16">
          {[
            { value: 32, suffix: "+", label: "Companies" },
            { value: 240, suffix: "+", label: "Sites monitored" },
            { value: 1200, suffix: "+", label: "Incidents resolved" },
            { value: 99, suffix: ".4%", label: "System uptime" },
          ].map((s) => (
            <div key={s.label} className="bg-surface py-6 sm:py-8 px-4 sm:px-6 text-center">
              <div className="font-serif text-2xl sm:text-4xl md:text-5xl font-bold text-ink tracking-tight leading-none">
                <AnimatedNumber value={s.value} suffix={s.suffix} />
              </div>
              <div className="text-[10px] sm:text-xs text-ink-3 mt-2 uppercase tracking-wider font-medium">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Logo strip */}
      <Reveal delay={140}>
        <div className="flex flex-wrap justify-center gap-x-6 sm:gap-x-10 gap-y-3 mb-10 sm:mb-16 opacity-50">
          {LOGOS.map((l) => (
            <div key={l.name} className="flex items-center gap-2 hover:opacity-100 transition-opacity">
              <l.icon size={14} strokeWidth={1.5} className="text-ink-3" />
              <span className="font-serif text-xs sm:text-[15px] font-bold text-ink-2 tracking-tight">{l.name}</span>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Testimonials */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={t.name} delay={180 + i * 80}>
            <div className="group bg-surface border border-border rounded-xl sm:rounded-2xl p-5 sm:p-7 hover:border-border-strong hover:shadow-xl hover:shadow-ink/[0.03] transition-all duration-300 flex flex-col h-full">
              <span className="font-serif text-4xl sm:text-5xl leading-none text-p-blue/30 select-none h-6 sm:h-8">
                &ldquo;
              </span>
              <p className="font-serif text-sm sm:text-[15px] text-ink leading-relaxed italic mt-2 sm:mt-3 flex-1">
                {t.quote}
              </p>
              <div className="flex items-center gap-3 mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-border">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] sm:text-xs font-bold text-white tracking-tight">
                    {t.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-semibold text-ink truncate">{t.name}</div>
                  <div className="text-[10px] sm:text-[11px] text-ink-3 mt-0.5 truncate">
                    {t.title} · {t.company}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ─── Pricing Section ──────────────────────────────────────────────────────────
const PLANS = [
  {
    name: "Starter",
    tagline: "For single-location operators.",
    price: "$399",
    period: "/ month",
    featured: false,
    cta: "Start free trial",
    features: [
      "Up to 3 sites",
      "Up to 24 cameras",
      "5 team members",
      "Email & web support",
      "Monthly PDF reports",
      "Email + push notifications",
    ],
  },
  {
    name: "Professional",
    tagline: "Growing multi-site operators.",
    price: "$1,499",
    period: "/ month",
    featured: true,
    badge: "Most popular",
    cta: "Start free trial",
    features: [
      "Up to 25 sites",
      "Unlimited cameras",
      "Unlimited team members",
      "Priority chat support",
      "Real-time dispatch board",
      "SLA: under 10 min response",
      "API access",
      "Custom roles",
    ],
  },
  {
    name: "Enterprise",
    tagline: "Security firms & large estates.",
    price: "Custom",
    period: "",
    featured: false,
    cta: "Talk to sales",
    features: [
      "Unlimited sites & cameras",
      "Dedicated success manager",
      "SSO + advanced auth",
      "Custom integrations",
      "24/7 on-call support",
      "Custom SLA",
      "White-label reports",
    ],
  },
];

function PricingSection() {
  return (
    <section className="relative py-16 sm:py-28 scroll-mt-24 overflow-hidden" id="pricing">
      <div className="absolute inset-0 bg-gradient-to-b from-bg via-surface-subtle/30 to-bg pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <Reveal>
          <div className="text-center mb-10 sm:mb-16">
            <span className="text-[11px] font-semibold text-p-blue uppercase tracking-[0.2em]">
              Pricing
            </span>
            <h2 className="font-serif text-2xl sm:text-4xl md:text-5xl font-bold text-ink mt-3 sm:mt-4 tracking-tight px-2">
              Simple pricing. <em className="not-italic font-normal text-ink-3">No surprises.</em>
            </h2>
            <p className="text-xs sm:text-sm text-ink-3 mt-3 sm:mt-4 max-w-md mx-auto leading-relaxed px-4">
              One flat monthly fee per company. Pause anytime. No setup costs, no per-camera charges.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 items-start max-w-4xl mx-auto md:max-w-none">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 100}>
              <div
                className={`relative rounded-xl sm:rounded-2xl p-5 sm:p-7 flex flex-col transition-all duration-300 ${
                  plan.featured
                    ? "bg-navy text-white shadow-2xl shadow-navy/30 md:-translate-y-4 ring-1 ring-white/[0.06]"
                    : "bg-surface border border-border hover:border-border-strong hover:shadow-lg hover:shadow-ink/[0.03]"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-p-blue text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg shadow-p-blue/30 whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-4 sm:mb-6">
                  <h3 className={`font-serif text-xl sm:text-2xl font-bold tracking-tight ${plan.featured ? "text-white" : "text-ink"}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-[11px] sm:text-xs mt-1 ${plan.featured ? "text-white/50" : "text-ink-3"}`}>
                    {plan.tagline}
                  </p>
                </div>

                <div className={`flex items-baseline gap-1 pb-4 sm:pb-6 mb-4 sm:mb-6 border-b ${plan.featured ? "border-white/[0.08]" : "border-border"}`}>
                  <span className={`font-serif text-3xl sm:text-5xl font-bold tracking-tight ${plan.featured ? "text-white" : "text-ink"}`}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className={`text-xs sm:text-sm ${plan.featured ? "text-white/40" : "text-ink-3"}`}>
                      {plan.period}
                    </span>
                  )}
                </div>

                <ul className="flex flex-col gap-2 sm:gap-3 mb-6 sm:mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check
                        size={13}
                        strokeWidth={2.5}
                        className={`flex-shrink-0 ${plan.featured ? "text-p-blue" : "text-p-green"}`}
                      />
                      <span className={`text-xs sm:text-[13px] ${plan.featured ? "text-white/75" : "text-ink-2"}`}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.cta === "Talk to sales" ? "#" : "/login"}
                  className={`block text-center py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    plan.featured
                      ? "bg-p-blue text-white hover:bg-p-blue-hover shadow-lg shadow-p-blue/20"
                      : "bg-navy text-white hover:bg-ink"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={350}>
          <p className="text-center text-[10px] sm:text-xs text-ink-4 mt-8 sm:mt-10 tracking-wide px-4">
            All plans include a 14-day free trial · Cancel anytime · No setup fees
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Bottom CTA ───────────────────────────────────────────────────────────────
function BottomCTA() {
  return (
    <section className="px-4 sm:px-6 pb-12 sm:pb-20 max-w-7xl mx-auto">
      <Reveal>
        <div className="relative bg-navy rounded-2xl sm:rounded-3xl overflow-hidden">
          {/* Background image */}
          <Image
            src={IMAGES.controlRoom}
            alt="Security operations center"
            fill
            className="object-cover opacity-15"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-navy/70 via-navy/85 to-navy pointer-events-none" />
          <GridPattern id="cta-grid" className="opacity-[0.03]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-p-blue/40 to-transparent" />

          <div className="relative z-10 px-5 sm:px-8 py-16 sm:py-24 text-center flex flex-col items-center gap-5 sm:gap-8">
            <div className="flex flex-col sm:flex-row gap-3 justify-center w-full sm:w-auto px-4 sm:px-0">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 bg-p-blue text-white text-sm font-semibold rounded-xl hover:bg-p-blue-hover transition-all hover:shadow-lg hover:shadow-p-blue/25"
              >
                Get Started
                <ArrowRight size={15} strokeWidth={2.5} />
              </Link>
              <button className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 text-white/80 text-sm font-medium rounded-xl border border-white/15 hover:bg-white/[0.06] transition-all cursor-pointer">
                <Play size={13} strokeWidth={2.5} />
                Watch Demo
              </button>
            </div>

            <h2 className="font-serif text-2xl sm:text-4xl md:text-[3.3rem] font-bold text-white tracking-tight leading-[1.1] max-w-2xl px-2">
              Primex Security System
            </h2>
            <p className="font-serif text-sm sm:text-lg text-white/40 -mt-2">
              AI-Powered Monitoring & Dispatch
            </p>
            <p className="text-xs sm:text-sm text-white/30 max-w-md leading-relaxed px-4">
              24/7 live camera monitoring, instant threat detection, and rapid guard dispatch for commercial properties.
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield size={13} strokeWidth={2} className="text-ink-4" />
          <span className="text-[11px] sm:text-xs text-ink-4">
            &copy; 2026 Primex Security Systems
          </span>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          {["Status", "Docs", "Privacy", "Terms", "Contact"].map((item) => (
            <a
              key={item}
              href="#"
              className="text-[11px] sm:text-xs text-ink-4 hover:text-ink-2 transition-colors"
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
export function LandingClient() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <style>{`
        @keyframes scanDown {
          0% { top: -2%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 102%; opacity: 0; }
        }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <LandingNav />
      <main className="flex-1">
        <HeroSection />
        <OperationalShowcase />
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
