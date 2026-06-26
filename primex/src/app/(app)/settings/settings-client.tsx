"use client";

import { useState } from "react";
import {
  UserIcon,
  Lock,
  Bell,
  Zap,
  CreditCard,
  Mail,
  MessageSquare,
  Phone,
  Cctv,
  Pencil,
} from "lucide-react";
import {
  PageTitle,
  Button,
  Card,
  DataTable,
  Pill,
  PhaseTag,
  KV,
  Field,
  TextInput,
  Select,
  Toggle,
} from "@/components/ui";
import type { Profile } from "@/lib/types";

// ---------------------------------------------------------------------------
// ROLES_PERMS (inline constant, previously from mock-data)
// ---------------------------------------------------------------------------

const ROLES_PERMS = [
  {
    role: "Super Admin",
    count: 2,
    perms: "Full platform access, company management, billing",
  },
  {
    role: "Company Manager",
    count: 4,
    perms: "Manage own company sites, users, alerts, incidents",
  },
  {
    role: "Dispatcher",
    count: 6,
    perms: "View alerts, create/manage incidents, dispatch guards",
  },
  {
    role: "Guard",
    count: 12,
    perms: "View assigned incidents, update status, upload evidence",
  },
  {
    role: "Client",
    count: 8,
    perms: "View own company dashboard, alerts, reports (read-only)",
  },
];

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type Tab = "profile" | "roles" | "notifications" | "integrations" | "billing";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "roles", label: "Roles & permissions", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "integrations", label: "Integrations", icon: Zap },
  { id: "billing", label: "Billing & plans", icon: CreditCard },
];

// ---------------------------------------------------------------------------
// Profile tab
// ---------------------------------------------------------------------------

function ProfileTab({ profile }: { profile: Profile }) {
  const profileInitials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const [form, setForm] = useState({
    name: profile.full_name,
    email: profile.email,
    phone: profile.phone ?? "",
    timezone: "Australia/Sydney",
  });

  const timezoneOptions = [
    { value: "Australia/Sydney", label: "Australia/Sydney (AEST)" },
    { value: "Australia/Melbourne", label: "Australia/Melbourne (AEST)" },
    { value: "Australia/Brisbane", label: "Australia/Brisbane (AEST)" },
    { value: "Australia/Perth", label: "Australia/Perth (AWST)" },
    { value: "UTC", label: "UTC" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Personal info */}
      <Card>
        <div className="flex flex-col gap-6">
          <div>
            <p className="font-serif text-lg font-semibold text-ink">Profile</p>
            <p className="text-sm text-ink-3 mt-0.5">
              Your personal information and account preferences.
            </p>
          </div>

          {/* Avatar row */}
          <div className="flex items-center gap-4">
            <span className="w-14 h-14 rounded-full bg-navy flex items-center justify-center text-white text-lg font-semibold font-sans flex-shrink-0">
              {profileInitials}
            </span>
            <Button variant="secondary" size="sm">
              Upload photo
            </Button>
          </div>

          {/* Form grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full name">
              <TextInput
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Email address">
              <TextInput
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <TextInput
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Time zone">
              <Select
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                options={timezoneOptions}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary">Cancel</Button>
            <Button variant="primary">Save changes</Button>
          </div>
        </div>
      </Card>

      {/* Password & security */}
      <Card>
        <div className="flex flex-col gap-5">
          <p className="font-serif text-lg font-semibold text-ink">
            Password &amp; security
          </p>
          <div className="flex flex-col gap-4">
            <KV
              k="Password"
              v={
                <Button variant="secondary" size="sm">
                  Change password
                </Button>
              }
            />
            <hr className="border-border" />
            <KV
              k="Two-factor authentication"
              v={<Pill tone="green" dot>Enabled</Pill>}
            />
            <hr className="border-border" />
            <KV k="Active sessions" v="3 devices" />
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Roles & permissions tab
// ---------------------------------------------------------------------------

function RolesTab() {
  const rows = ROLES_PERMS.map((rp) => [
    <span key="role" className="font-semibold text-ink">
      {rp.role}
    </span>,
    <span key="users" className="text-ink-2">
      {rp.count} users
    </span>,
    <span key="perms" className="text-ink-3 text-xs">
      {rp.perms}
    </span>,
    <Button key="edit" variant="secondary" size="sm" icon={Pencil}>
      Edit
    </Button>,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Card padding="p-0">
        <DataTable
          columns={["Role", "Users", "Permissions", ""]}
          rows={rows}
        />
      </Card>
      <div className="flex items-center gap-3">
        <Button variant="secondary">Create custom role</Button>
        <PhaseTag>Custom roles - Phase 2</PhaseTag>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notifications tab
// ---------------------------------------------------------------------------

interface NotifRow {
  event: string;
  channels: string[];
  on: boolean;
  phase?: string;
}

const NOTIF_ROWS: NotifRow[] = [
  { event: "New critical alert", channels: ["Email", "Push"], on: true },
  { event: "Incident assigned", channels: ["Email", "Push"], on: true },
  { event: "Incident resolved", channels: ["Email"], on: true },
  { event: "Camera offline", channels: ["Email"], on: true },
  { event: "Weekly summary", channels: ["Email"], on: true },
  {
    event: "SMS notifications",
    channels: ["SMS"],
    on: false,
    phase: "Phase 2",
  },
];

function NotificationsTab() {
  const [states, setStates] = useState<boolean[]>(
    NOTIF_ROWS.map((r) => r.on)
  );

  return (
    <Card>
      <div className="flex flex-col gap-[18px]">
        <div>
          <p className="font-serif text-[19px] font-bold text-ink">Notifications</p>
          <p className="text-[13px] text-ink-3 mt-0.5">
            Choose which events trigger notifications and how you receive them.
          </p>
        </div>

        <div className="flex flex-col">
          {NOTIF_ROWS.map((row, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 border-b border-border last:border-b-0"
              style={{ padding: "14px 0" }}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13.5px] font-medium text-ink">{row.event}</span>
                  {row.phase && <PhaseTag>{row.phase}</PhaseTag>}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {row.channels.map((ch) => (
                    <Pill key={ch} tone="gray" size="sm">
                      {ch}
                    </Pill>
                  ))}
                </div>
              </div>
              <Toggle
                on={states[i]}
                onChange={(val) => {
                  const next = [...states];
                  next[i] = val;
                  setStates(next);
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Integrations tab
// ---------------------------------------------------------------------------

interface Integration {
  icon: React.ElementType;
  name: string;
  description: string;
  connected: boolean;
  phase?: string;
}

const INTEGRATIONS: Integration[] = [
  {
    icon: Mail,
    name: "SendGrid",
    description: "Transactional emails for alerts and reports",
    connected: true,
  },
  {
    icon: MessageSquare,
    name: "Slack",
    description: "Real-time alerts to your team channels",
    connected: true,
  },
  {
    icon: Phone,
    name: "Twilio",
    description: "SMS notifications and voice calls",
    connected: false,
    phase: "Phase 2",
  },
  {
    icon: CreditCard,
    name: "Stripe",
    description: "Subscription billing and invoicing",
    connected: false,
    phase: "Phase 2",
  },
  {
    icon: Zap,
    name: "Webhooks",
    description: "Push events to your own systems",
    connected: false,
  },
  {
    icon: Cctv,
    name: "AWS Kinesis",
    description: "Stream camera feeds for AI processing",
    connected: false,
    phase: "Phase 2",
  },
];

function IntegrationsTab() {
  return (
    <Card>
      <div className="flex flex-col gap-[18px]">
        <div>
          <p className="font-serif text-[19px] font-bold text-ink">Integrations</p>
          <p className="text-[13px] text-ink-3 mt-0.5">
            Connect third-party services to extend platform capabilities.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {INTEGRATIONS.map((intg) => {
            const Icon = intg.icon;
            return (
              <div
                key={intg.name}
                className="p-4 border border-border rounded-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg bg-p-blue-soft flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-p-blue" strokeWidth={2} />
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13.5px] font-semibold text-ink">
                          {intg.name}
                        </span>
                        {intg.phase && <PhaseTag>{intg.phase}</PhaseTag>}
                      </div>
                      <p className="text-[11.5px] text-ink-3">{intg.description}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  {intg.connected ? (
                    <Pill tone="green" dot>
                      Connected
                    </Pill>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!!intg.phase}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Billing tab
// ---------------------------------------------------------------------------

function BillingTab() {
  return (
    <Card>
      <div className="flex flex-col gap-[18px]">
        <div>
          <p className="font-serif text-[19px] font-bold text-ink">Billing &amp; plans</p>
          <p className="text-[13px] text-ink-3 mt-0.5">
            Manage your subscription, payment method, and invoices.
          </p>
        </div>

        {/* Plan banner */}
        <div className="p-[18px] bg-bg rounded-lg flex items-start justify-between gap-4 mb-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <p className="font-serif text-[22px] font-bold text-ink">
                Professional
              </p>
              <PhaseTag>Stripe billing &middot; Phase 2</PhaseTag>
            </div>
            <p className="text-[12.5px] text-ink-3">
              23 active sites &middot; 86 cameras &middot; unlimited users
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-[26px] font-bold text-ink">
                $1,840
              </span>
              <span className="text-[13px] text-ink-3">/mo</span>
            </div>
            <Button variant="secondary" size="sm">
              Upgrade plan
            </Button>
          </div>
        </div>

        {/* KV rows */}
        <div className="flex flex-col gap-4">
          <hr className="border-border" />
          <KV k="Next invoice" v="June 1, 2026" />
          <hr className="border-border" />
          <KV
            k="Payment method"
            v={
              <span className="flex items-center gap-2">
                <span>Visa &bull;&bull;&bull;&bull; 4242</span>
                <Button variant="link" size="sm">
                  Update
                </Button>
              </span>
            }
          />
          <hr className="border-border" />
          <KV k="Billing email" v="billing@primexsecurity.com.au" />
          <hr className="border-border" />
          <KV k="Tax ID" v="—" />
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// SettingsClient
// ---------------------------------------------------------------------------

interface SettingsClientProps {
  profile: Profile;
}

export function SettingsClient({ profile }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const tabContent: Record<Tab, React.ReactNode> = {
    profile: <ProfileTab profile={profile} />,
    roles: <RolesTab />,
    notifications: <NotificationsTab />,
    integrations: <IntegrationsTab />,
    billing: <BillingTab />,
  };

  return (
    <div className="flex flex-col gap-6 font-sans px-4 sm:px-9 py-6 sm:py-8">
      <PageTitle
        title="Settings"
        sub="Manage your platform configuration."
      />

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 items-start">
        {/* Sidebar tabs */}
        <nav className="flex md:flex-col gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors duration-100 text-left cursor-pointer whitespace-nowrap ${
                  active
                    ? "bg-surface border border-border text-ink font-semibold"
                    : "bg-transparent text-ink-2 hover:bg-surface-subtle"
                }`}
              >
                <Icon
                  size={15}
                  strokeWidth={2}
                  className={active ? "text-p-blue" : "text-ink-3"}
                />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">{tabContent[activeTab]}</div>
      </div>
    </div>
  );
}
