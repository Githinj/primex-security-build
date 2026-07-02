"use client";

import { useState } from "react";
import {
  Shield,
  LayoutDashboard,
  MapPin,
  Camera,
  Bell,
  AlertTriangle,
  Users,
  BarChart3,
  Settings2,
  Building,
} from "lucide-react";
import { LiveDot } from "@/components/ui";
import { useProfile } from "@/components/providers/profile-provider";
import type { Company, Site, Camera as CameraType, Alert, Incident, Profile, Report } from "@/lib/types";

import { CompanyDashboard } from "./sections/dashboard";
import { CompanySites } from "./sections/sites";
import { CompanyCameras } from "./sections/cameras";
import { CompanyAlerts } from "./sections/alerts";
import { CompanyIncidents } from "./sections/incidents";
import { CompanyTeam } from "./sections/team";
import { CompanyReports } from "./sections/reports";

type Section = "dashboard" | "sites" | "cameras" | "alerts" | "incidents" | "team" | "reports";

interface NavItem {
  id: Section;
  label: string;
  icon: React.ElementType;
  count?: number;
}

function roleLabel(role: string) {
  const map: Record<string, string> = {
    super_admin: "Super Admin",
    company_manager: "Company Manager",
    dispatcher: "Dispatcher",
    guard: "Guard",
    client: "Client",
  };
  return map[role] ?? role;
}

interface ManagerClientProps {
  company: Company;
  sites: Site[];
  cameras: CameraType[];
  alerts: Alert[];
  incidents: Incident[];
  teamMembers: Profile[];
  reports: Report[];
}

export function ManagerClient({
  company,
  sites,
  cameras,
  alerts,
  incidents,
  teamMembers,
  reports,
}: ManagerClientProps) {
  const [section, setSection] = useState<Section>("dashboard");
  const profile = useProfile();

  const userName = profile?.full_name ?? "User";
  const userRole = profile?.role ?? "company_manager";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const openAlerts = alerts.filter((a) =>
    ["New", "Reviewing", "Escalated"].includes(a.status)
  );
  const activeIncidents = incidents.filter((i) =>
    ["Open", "In Progress", "Dispatched"].includes(i.status)
  );

  const navItems: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "sites", label: "My sites", icon: MapPin, count: sites.length },
    { id: "cameras", label: "Cameras", icon: Camera, count: cameras.length },
    { id: "alerts", label: "Alerts", icon: Bell, count: openAlerts.length },
    { id: "incidents", label: "Incidents", icon: AlertTriangle, count: activeIncidents.length },
    { id: "team", label: "Team", icon: Users, count: teamMembers.length },
    { id: "reports", label: "Reports", icon: BarChart3 },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Left nav */}
      <aside className="flex lg:flex-col lg:w-60 flex-shrink-0 bg-surface border-b lg:border-b-0 lg:border-r border-border lg:justify-between lg:h-full">
        {/* Top section */}
        <div className="flex lg:flex-col gap-4 lg:gap-6 p-4 lg:p-5 w-full overflow-x-auto">
          {/* Logo */}
          <div className="hidden lg:flex items-center gap-3">
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

          {/* Organization label */}
          <div className="hidden lg:flex flex-col gap-1.5">
            <span
              className="text-[10px] font-semibold uppercase text-ink-4 font-sans"
              style={{ letterSpacing: "1.3px" }}
            >
              ORGANIZATION
            </span>
            <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-surface-subtle text-xs font-semibold">
              <Building size={14} className="text-ink-3 flex-shrink-0" strokeWidth={2} />
              <span className="font-sans text-ink truncate">{company.name}</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex lg:flex-col gap-1 lg:gap-0.5">
            {navItems.map((item) => {
              const isActive = section === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={[
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-sans transition-colors duration-150 lg:w-full text-left whitespace-nowrap",
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
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom section */}
        <div className="hidden lg:flex p-5 flex-col gap-3">
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
            <Settings2
              size={15}
              className="text-ink-4 hover:text-ink-2 transition-colors duration-150 flex-shrink-0 cursor-pointer"
              strokeWidth={2}
            />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-bg overflow-auto">
        {company.status === 'Pending' && (
          <div className="mx-4 sm:mx-9 mt-6 px-5 py-4 bg-p-amber-soft border border-p-amber/20 rounded-xl flex items-start gap-3">
            <AlertTriangle size={18} className="text-p-amber flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-ink">Your company is pending approval</h3>
              <p className="text-xs text-ink-3 mt-1 leading-relaxed">
                A Primex administrator will review and activate your company. You can explore the dashboard but cannot create sites, cameras, or alerts until approved.
              </p>
            </div>
          </div>
        )}
        {company.status === 'Suspended' && (
          <div className="mx-4 sm:mx-9 mt-6 px-5 py-4 bg-p-red-soft border border-p-red/20 rounded-xl flex items-start gap-3">
            <AlertTriangle size={18} className="text-p-red flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-ink">Your company has been suspended</h3>
              <p className="text-xs text-ink-3 mt-1 leading-relaxed">
                Contact Primex support for more information.
              </p>
            </div>
          </div>
        )}
        <div className="px-4 sm:px-9 py-6 sm:py-8">
          {section === "dashboard" && (
            <CompanyDashboard
              company={company}
              sites={sites}
              cameras={cameras}
              alerts={alerts}
              incidents={incidents}
            />
          )}
          {section === "sites" && (
            <CompanySites
              company={company}
              sites={sites}
              cameras={cameras}
              alerts={alerts}
              incidents={incidents}
            />
          )}
          {section === "cameras" && (
            <CompanyCameras
              company={company}
              cameras={cameras}
              sites={sites}
            />
          )}
          {section === "alerts" && (
            <CompanyAlerts
              company={company}
              alerts={alerts}
              sites={sites}
              cameras={cameras}
            />
          )}
          {section === "incidents" && (
            <CompanyIncidents
              incidents={incidents}
              sites={sites}
              teamMembers={teamMembers}
            />
          )}
          {section === "team" && (
            <CompanyTeam members={teamMembers} />
          )}
          {section === "reports" && (
            <CompanyReports reports={reports} incidents={incidents} />
          )}
        </div>
      </main>
    </div>
  );
}
