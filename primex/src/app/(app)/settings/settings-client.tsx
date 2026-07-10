"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
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
  Camera,
  Check,
  ArrowLeft,
} from "lucide-react";
import { getRoleHomePath } from "@/lib/auth/role-redirect";
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
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  InfoBox,
} from "@/components/ui";
import type { Profile, Subscription, PlanTier, SubscriptionStatus } from "@/lib/types";
import {
  updateNotificationPreference,
  type NotificationPrefs,
} from "@/lib/data/actions/notification-preferences";
import {
  updateMyProfile,
  updateMyEmail,
  changeMyPassword,
  uploadMyAvatar,
} from "@/lib/data/actions/account";
import { createCheckoutSession, createPortalSession } from "@/lib/data/actions/billing";
import { PLAN_TIERS, planTier } from "@/lib/billing/plans";

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

const TIMEZONE_OPTIONS = [
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST)" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne (AEST)" },
  { value: "Australia/Brisbane", label: "Australia/Brisbane (AEST)" },
  { value: "Australia/Perth", label: "Australia/Perth (AWST)" },
  { value: "UTC", label: "UTC" },
];

function ProfileTab({ profile }: { profile: Profile }) {
  const profileInitials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const [baseline, setBaseline] = useState({
    name: profile.full_name,
    email: profile.email,
    phone: profile.phone ?? "",
    timezone: profile.timezone ?? "Australia/Sydney",
  });
  const [form, setForm] = useState(baseline);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [feedback, setFeedback] = useState<{ tone: "green" | "amber"; msg: string } | null>(null);
  const [saving, startSave] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty =
    form.name !== baseline.name ||
    form.email.trim().toLowerCase() !== baseline.email.toLowerCase() ||
    form.phone !== baseline.phone ||
    form.timezone !== baseline.timezone;

  function handleCancel() {
    setForm(baseline);
    setFeedback(null);
  }

  function handleSave() {
    setFeedback(null);
    const emailChanged =
      form.email.trim().toLowerCase() !== baseline.email.toLowerCase();

    startSave(async () => {
      const res = await updateMyProfile({
        full_name: form.name,
        phone: form.phone,
        timezone: form.timezone,
      });
      if (!res.success) {
        setFeedback({ tone: "amber", msg: res.error ?? "Couldn't save changes." });
        return;
      }

      let msg = "Profile updated.";
      if (emailChanged) {
        const er = await updateMyEmail(form.email);
        if (!er.success) {
          setFeedback({
            tone: "amber",
            msg: er.error ?? "Profile saved, but the email change failed.",
          });
          // Keep the confirmed fields as the new baseline even if email failed.
          setBaseline((b) => ({ ...b, name: form.name, phone: form.phone, timezone: form.timezone }));
          return;
        }
        msg = `Profile updated. Check ${form.email.trim()} for a link to confirm your new email address.`;
      }

      setBaseline({ ...form, email: form.email.trim() });
      setFeedback({ tone: "green", msg });
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeedback(null);
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    uploadMyAvatar(fd)
      .then((res) => {
        if (res.success && res.url) {
          setAvatarUrl(res.url);
          setFeedback({ tone: "green", msg: "Profile photo updated." });
        } else {
          setFeedback({ tone: "amber", msg: res.error ?? "Couldn't upload photo." });
        }
      })
      .finally(() => {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      });
  }

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

          {feedback && <InfoBox tone={feedback.tone}>{feedback.msg}</InfoBox>}

          {/* Avatar row */}
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={profile.full_name}
                className="w-14 h-14 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <span className="w-14 h-14 rounded-full bg-navy flex items-center justify-center text-white text-lg font-semibold font-sans flex-shrink-0">
                {profileInitials}
              </span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="secondary"
              size="sm"
              icon={Camera}
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "Upload photo"}
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
            <Field
              label="Email address"
              hint="Changing this sends a confirmation link to the new address."
            >
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
                options={TIMEZONE_OPTIONS}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleCancel} disabled={!dirty || saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
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
                <Button variant="secondary" size="sm" onClick={() => setPwOpen(true)}>
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

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Change password modal
// ---------------------------------------------------------------------------

function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, startSave] = useTransition();

  function handleClose() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
    setDone(false);
    onClose();
  }

  function handleSubmit() {
    setError(null);
    if (!current) {
      setError("Enter your current password.");
      return;
    }
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords don't match.");
      return;
    }
    startSave(async () => {
      const res = await changeMyPassword(current, next);
      if (!res.success) {
        setError(res.error ?? "Couldn't change password.");
        return;
      }
      setDone(true);
    });
  }

  return (
    <Modal open={open} onClose={handleClose} width="max-w-md">
      {done ? (
        <>
          <ModalHeader title="Password changed" onClose={handleClose} />
          <ModalBody>
            <InfoBox tone="green">
              Your password has been updated. Use it the next time you sign in.
            </InfoBox>
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" onClick={handleClose}>
              Done
            </Button>
          </ModalFooter>
        </>
      ) : (
        <>
          <ModalHeader
            title="Change password"
            sub="Enter your current password, then choose a new one."
            onClose={handleClose}
          />
          <ModalBody>
            <div className="flex flex-col gap-4">
              <Field label="Current password" required>
                <TextInput
                  type="password"
                  value={current}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrent(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
              <Field label="New password" required hint="At least 8 characters.">
                <TextInput
                  type="password"
                  value={next}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNext(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
              <Field label="Confirm new password" required>
                <TextInput
                  type="password"
                  value={confirm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
              {error && <InfoBox tone="amber">{error}</InfoBox>}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving…" : "Change password"}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
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
  key: string;
  event: string;
  channels: string[];
  on: boolean;
  phase?: string;
}

const NOTIF_ROWS: NotifRow[] = [
  { key: "critical_alert", event: "New critical alert", channels: ["Email", "Push"], on: true },
  { key: "incident_assigned", event: "Incident assigned", channels: ["Email", "Push"], on: true },
  { key: "incident_resolved", event: "Incident resolved", channels: ["Email"], on: true },
  { key: "camera_offline", event: "Camera offline", channels: ["Email"], on: true },
  { key: "weekly_summary", event: "Weekly summary", channels: ["Email"], on: true },
  {
    key: "sms",
    event: "SMS notifications",
    channels: ["SMS"],
    on: false,
    phase: "Phase 2",
  },
];

function NotificationsTab({ prefs }: { prefs: NotificationPrefs }) {
  const [states, setStates] = useState<boolean[]>(
    NOTIF_ROWS.map((r) => prefs[r.key]?.email ?? r.on)
  );
  const [, startTransition] = useTransition();

  function handleToggle(i: number, val: boolean) {
    const previous = states[i];
    setStates((s) => {
      const next = [...s];
      next[i] = val;
      return next;
    });
    startTransition(async () => {
      const res = await updateNotificationPreference(NOTIF_ROWS[i].key, val);
      if (!res.success) {
        // Revert on failure
        setStates((s) => {
          const next = [...s];
          next[i] = previous;
          return next;
        });
      }
    });
  }

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
                onChange={(val) => handleToggle(i, val)}
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

function IntegrationsTab({ billingConfigured }: { billingConfigured: boolean }) {
  // Stripe reflects real config: connected once STRIPE_* env is set.
  const integrations = INTEGRATIONS.map((intg) =>
    intg.name === "Stripe"
      ? { ...intg, connected: billingConfigured, phase: billingConfigured ? undefined : intg.phase }
      : intg
  );

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
          {integrations.map((intg) => {
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

function statusTone(
  status: SubscriptionStatus | null
): "green" | "amber" | "red" | "blue" | "gray" {
  switch (status) {
    case "active":
      return "green";
    case "trialing":
      return "blue";
    case "past_due":
    case "unpaid":
      return "amber";
    case "canceled":
    case "incomplete_expired":
      return "red";
    default:
      return "gray";
  }
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function CurrentPlan({
  subscription,
  busy,
  onManage,
}: {
  subscription: Subscription;
  busy: string | null;
  onManage: () => void;
}) {
  const cfg = subscription.plan_tier ? planTier(subscription.plan_tier) : undefined;
  const isTrial = subscription.status === "trialing";

  return (
    <>
      <div className="p-[18px] bg-bg rounded-lg flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <p className="font-serif text-[22px] font-bold text-ink">
              {cfg?.name ?? subscription.plan_tier ?? "Subscription"}
            </p>
            <Pill tone={statusTone(subscription.status)} dot>
              {subscription.status ?? "unknown"}
            </Pill>
          </div>
          <p className="text-[12.5px] text-ink-3">
            {isTrial
              ? `Trial ends ${fmtDate(subscription.trial_end)}`
              : `Renews ${fmtDate(subscription.current_period_end)}`}
            {subscription.cancel_at_period_end && " · cancels at period end"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {cfg?.amount != null && (
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-[26px] font-bold text-ink">
                ${cfg.amount.toLocaleString()}
              </span>
              <span className="text-[13px] text-ink-3">/mo</span>
            </div>
          )}
          <Button variant="secondary" size="sm" onClick={onManage} disabled={busy !== null}>
            {busy === "portal" ? "Opening…" : "Manage billing"}
          </Button>
        </div>
      </div>

      {cfg?.features?.length ? (
        <div className="flex flex-col gap-2.5">
          <p className="text-[11.5px] font-semibold text-ink-3 uppercase tracking-wide">
            What&apos;s included in {cfg.name}
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {cfg.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-[12.5px] text-ink-2">
                <Check size={13} strokeWidth={2.5} className="text-p-green flex-shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        <hr className="border-border" />
        <KV
          k={isTrial ? "Trial ends" : "Next invoice"}
          v={fmtDate(isTrial ? subscription.trial_end : subscription.current_period_end)}
        />
        <hr className="border-border" />
        <KV
          k="Payment method"
          v={
            <Button variant="link" size="sm" onClick={onManage} disabled={busy !== null}>
              Update in portal
            </Button>
          }
        />
      </div>
    </>
  );
}

function PlanPicker({
  busy,
  onChoose,
}: {
  busy: string | null;
  onChoose: (tier: PlanTier) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-ink-2">
        Choose a plan to start your 14-day trial. Change or cancel anytime.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PLAN_TIERS.map((p) => (
          <div key={p.tier} className="p-4 border border-border rounded-lg flex flex-col gap-3">
            <div>
              <p className="font-serif text-[17px] font-bold text-ink">{p.name}</p>
              <p className="text-[11.5px] text-ink-3 mt-0.5">{p.tagline}</p>
            </div>
            <div className="flex items-baseline gap-1">
              {p.amount != null ? (
                <>
                  <span className="font-serif text-[24px] font-bold text-ink">
                    ${p.amount.toLocaleString()}
                  </span>
                  <span className="text-[12px] text-ink-3">/mo</span>
                </>
              ) : (
                <span className="font-serif text-[20px] font-bold text-ink">Custom</span>
              )}
            </div>
            <ul className="flex flex-col gap-1.5 flex-1">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[12px] text-ink-2">
                  <Check size={13} strokeWidth={2.5} className="text-p-green flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            {p.contactSales ? (
              <Button
                variant="secondary"
                size="sm"
                full
                onClick={() => {
                  window.location.href =
                    "mailto:sales@primexsecurity.com.au?subject=Enterprise%20plan%20enquiry";
                }}
              >
                Talk to sales
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                full
                onClick={() => onChoose(p.tier)}
                disabled={busy !== null}
              >
                {busy === p.tier ? "Redirecting…" : "Start 14-day trial"}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BillingTab({
  subscription,
  billingConfigured,
}: {
  subscription: Subscription | null;
  billingConfigured: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "green" | "amber"; msg: string } | null>(null);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("billing");
    if (param === "success") {
      setNotice({ tone: "green", msg: "Subscription started — your 14-day trial is active." });
    } else if (param === "cancelled") {
      setNotice({ tone: "amber", msg: "Checkout cancelled. No changes were made." });
    }
    // Strip the query param so a refresh doesn't re-show the banner.
    if (param) window.history.replaceState({}, "", "/settings");
  }, []);

  async function startCheckout(tier: PlanTier) {
    setError(null);
    setBusy(tier);
    const res = await createCheckoutSession(tier);
    if (res.success && res.url) {
      window.location.href = res.url;
      return;
    }
    setError(res.error ?? "Could not start checkout.");
    setBusy(null);
  }

  async function openPortal() {
    setError(null);
    setBusy("portal");
    const res = await createPortalSession();
    if (res.success && res.url) {
      window.location.href = res.url;
      return;
    }
    setError(res.error ?? "Could not open the billing portal.");
    setBusy(null);
  }

  const hasActiveSub =
    subscription?.status != null &&
    !["canceled", "incomplete_expired"].includes(subscription.status);

  return (
    <Card>
      <div className="flex flex-col gap-[18px]">
        <div>
          <p className="font-serif text-[19px] font-bold text-ink">Billing &amp; plans</p>
          <p className="text-[13px] text-ink-3 mt-0.5">
            Manage your subscription, payment method, and invoices.
          </p>
        </div>

        {notice && <InfoBox tone={notice.tone}>{notice.msg}</InfoBox>}
        {error && <InfoBox tone="amber">{error}</InfoBox>}

        {!billingConfigured ? (
          <InfoBox tone="amber">
            Billing isn&apos;t configured on this environment yet. Once Stripe keys are set,
            you&apos;ll be able to subscribe and manage your plan here.
          </InfoBox>
        ) : hasActiveSub && subscription ? (
          <CurrentPlan subscription={subscription} busy={busy} onManage={openPortal} />
        ) : (
          <PlanPicker busy={busy} onChoose={startCheckout} />
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// SettingsClient
// ---------------------------------------------------------------------------

interface SettingsClientProps {
  profile: Profile;
  notificationPrefs: NotificationPrefs;
  subscription: Subscription | null;
  billingConfigured: boolean;
}

export function SettingsClient({
  profile,
  notificationPrefs,
  subscription,
  billingConfigured,
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const tabContent: Record<Tab, React.ReactNode> = {
    profile: <ProfileTab profile={profile} />,
    roles: <RolesTab />,
    notifications: <NotificationsTab prefs={notificationPrefs} />,
    integrations: <IntegrationsTab billingConfigured={billingConfigured} />,
    billing: <BillingTab subscription={subscription} billingConfigured={billingConfigured} />,
  };

  return (
    <div className="flex flex-col gap-6 font-sans px-4 sm:px-9 py-6 sm:py-8">
      {/* Self-nav roles (e.g. company_manager) reach Settings as a standalone
          route with no global sidebar, so give them a way back to their app.
          super_admin keeps the sidebar and doesn't need it. */}
      {profile.role !== "super_admin" && (
        <Link
          href={getRoleHomePath(profile.role)}
          className="inline-flex items-center gap-1.5 w-fit text-[13px] font-medium text-ink-3 hover:text-ink transition-colors"
        >
          <ArrowLeft size={15} strokeWidth={2} />
          Back to dashboard
        </Link>
      )}

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
