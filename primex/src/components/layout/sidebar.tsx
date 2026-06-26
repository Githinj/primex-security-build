"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  Shield,
  LayoutDashboard,
  Building2,
  MapPin,
  Camera,
  Bell,
  UserCheck,
  ScrollText,
  Settings,
  ChevronDown,
  Settings2,
  Users,
  AlertTriangle,
  BarChart3,
  Building,
} from "lucide-react";
import { LiveDot } from "@/components/ui";
import { useProfile } from "@/components/providers/profile-provider";
import { useScope } from "@/components/providers/scope-provider";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  count?: number;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",   href: "/dashboard",  icon: LayoutDashboard },
  { label: "Companies",   href: "/companies",  icon: Building2,   count: 4 },
  { label: "Sites",       href: "/sites",      icon: MapPin,      count: 6 },
  { label: "Cameras",     href: "/cameras",    icon: Camera,      count: 86 },
  { label: "Alerts",      href: "/alerts",     icon: Bell,        count: 4 },
  { label: "Incidents",   href: "/incidents",  icon: AlertTriangle, count: 3 },
  { label: "Guards",      href: "/guards",     icon: Users,       count: 4 },
  { label: "Reports",     href: "/reports",    icon: BarChart3 },
  { label: "Team",        href: "/team",       icon: UserCheck },
  { label: "Audit log",   href: "/audit",      icon: ScrollText },
  { label: "Settings",    href: "/settings",   icon: Settings },
];

function roleLabel(role: string) {
  const map: Record<string, string> = {
    super_admin:     "Super Admin",
    company_manager: "Company Manager",
    dispatcher:      "Dispatcher",
    guard:           "Guard",
    client:          "Client",
  };
  return map[role] ?? role;
}

export function Sidebar() {
  const pathname = usePathname();
  const profile = useProfile();
  const { scope, scopeCompanyId, setScope, companies } = useScope();
  const userRole = profile?.role ?? "client";
  const userName = profile?.full_name ?? "User";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const isSuperAdmin = userRole === "super_admin";

  const [scopeOpen, setScopeOpen] = useState(false);
  const scopeRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (scopeRef.current && !scopeRef.current.contains(e.target as Node)) {
        setScopeOpen(false);
      }
    }
    if (scopeOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [scopeOpen]);

  // Resolve company name for non-super-admin users
  const orgName = profile?.company_id
    ? companies.find((c) => c.id === profile.company_id)?.name ?? "My Organization"
    : "My Organization";

  return (
    <aside className="w-60 flex-shrink-0 bg-surface border-r border-border flex flex-col justify-between h-full">
      {/* ── Top section ─────────────────────────────── */}
      <div className="flex flex-col gap-6 p-5">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-navy rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield size={16} className="text-white" strokeWidth={2} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-serif text-base font-semibold text-ink">
              Primex
            </span>
            <span className="text-[10px] font-sans font-semibold tracking-widest uppercase text-ink-4 mt-0.5">
              Security System
            </span>
          </div>
        </div>

        {/* Scope selector */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase text-ink-4 font-sans" style={{ letterSpacing: "1.3px" }}>
            {isSuperAdmin ? "CLIENT SCOPE" : "ORGANIZATION"}
          </span>
          {isSuperAdmin ? (
            <div className="relative" ref={scopeRef}>
              <button
                type="button"
                onClick={() => setScopeOpen((prev) => !prev)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border bg-bg text-xs font-medium text-left w-full"
              >
                <Building size={14} className="text-ink-3 flex-shrink-0" strokeWidth={2} />
                <span className="flex-1 font-sans text-ink truncate">
                  {scope}
                </span>
                <ChevronDown
                  size={13}
                  className="text-ink-4 flex-shrink-0 transition-transform duration-150"
                  strokeWidth={2}
                  style={{ transform: scopeOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </button>
              {scopeOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 py-1 max-h-60 overflow-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setScope(null, "All Companies");
                      setScopeOpen(false);
                    }}
                    className={[
                      "flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-sans w-full text-left",
                      scopeCompanyId === null
                        ? "bg-p-blue-soft text-p-blue font-semibold"
                        : "text-ink hover:bg-bg font-medium",
                    ].join(" ")}
                  >
                    <Building size={11} className="flex-shrink-0" strokeWidth={2} />
                    All Companies
                  </button>
                  {companies.map((company) => (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => {
                        setScope(company.id, company.name);
                        setScopeOpen(false);
                      }}
                      className={[
                        "flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-sans w-full text-left",
                        scopeCompanyId === company.id
                          ? "bg-p-blue-soft text-p-blue font-semibold"
                          : "text-ink hover:bg-bg font-medium",
                      ].join(" ")}
                    >
                      <Building size={11} className="flex-shrink-0" strokeWidth={2} />
                      {company.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-surface-subtle text-xs font-semibold">
              <Building size={14} className="text-ink-3 flex-shrink-0" strokeWidth={2} />
              <span className="font-sans text-ink truncate">
                {orgName}
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-sans transition-colors duration-150",
                  isActive
                    ? "bg-p-blue-soft text-p-blue font-semibold"
                    : "text-ink-2 hover:bg-surface-subtle hover:text-ink font-medium",
                ].join(" ")}
              >
                <Icon
                  size={15}
                  strokeWidth={2}
                  className={isActive ? "text-p-blue" : "text-ink-3"}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {item.count !== undefined && (
                  <span
                    className={[
                      "text-[11px] font-semibold px-1.5 py-0.5 rounded-full leading-none",
                      isActive
                        ? "bg-p-blue text-white"
                        : "bg-surface-subtle text-ink-3",
                    ].join(" ")}
                  >
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── Bottom section ───────────────────────────── */}
      <div className="p-5 flex flex-col gap-3">
        {/* System status */}
        <div className="flex items-center gap-2 px-3 py-2 bg-p-green-soft rounded-lg">
          <LiveDot color="green" />
          <span className="text-xs font-sans font-medium text-p-green">
            All systems operational
          </span>
        </div>

        {/* User row */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-sans font-bold text-white">
              {userInitials}
            </span>
          </div>
          <div className="flex flex-col flex-1 min-w-0 leading-none">
            <span className="text-sm font-sans font-semibold text-ink truncate">
              {userName}
            </span>
            <span className="text-[11px] font-sans text-ink-3 mt-0.5 truncate">
              {roleLabel(userRole)}
            </span>
          </div>
          <Link href="/settings">
            <Settings2
              size={15}
              className="text-ink-4 hover:text-ink-2 transition-colors duration-150 flex-shrink-0"
              strokeWidth={2}
            />
          </Link>
        </div>
      </div>
    </aside>
  );
}
