"use client";

import { useState, useEffect } from "react";
import {
  UserPlus,
  Pencil,
  Power,
  Trash2,
  Send,
} from "lucide-react";
import {
  PageTitle,
  Button,
  Card,
  DataTable,
  Pill,
  ActionMenu,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  SuccessState,
  Field,
  TextInput,
  Select,
  InfoBox,
} from "@/components/ui";
import type { Profile } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatLastActive(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

const ROLE_OPTIONS = [
  { value: "company_manager", label: "Company Manager" },
  { value: "dispatcher", label: "Dispatcher" },
  { value: "site_manager", label: "Site Manager" },
  { value: "guard", label: "Guard" },
];

// ---------------------------------------------------------------------------
// InviteTeamMemberModal
// ---------------------------------------------------------------------------

function InviteTeamMemberModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "",
    phone: "",
  });

  function handleSubmit() {
    setSubmitted(true);
  }

  function handleDone() {
    setSubmitted(false);
    setForm({ name: "", email: "", role: "", phone: "" });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose}>
      {submitted ? (
        <SuccessState
          title="Invitation sent"
          sub={`An invite link has been sent to ${form.email || "the member"}. It expires in 7 days.`}
          onDone={handleDone}
        />
      ) : (
        <>
          <ModalHeader
            title="Invite team member"
            sub="They'll receive an email with a link to set up their account."
            onClose={onClose}
          />
          <ModalBody>
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Full name" required>
                  <TextInput
                    placeholder="e.g. Jordan Blake"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Field>
                <Field label="Email address" required>
                  <TextInput
                    type="email"
                    placeholder="e.g. jordan@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Role" required>
                <Select
                  placeholder="Select a role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  options={ROLE_OPTIONS}
                />
              </Field>
              <Field label="Phone" hint="Optional - used for SMS alerts and dispatch.">
                <TextInput
                  type="tel"
                  placeholder="e.g. 0412 345 678"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
              <InfoBox tone="blue">
                The invitation link expires after <strong>7 days</strong>. You can resend
                it from the team member&apos;s profile if they miss it.
              </InfoBox>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={Send}
              onClick={handleSubmit}
              disabled={!form.name || !form.email || !form.role}
            >
              Send invite
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// EditTeamMemberModal
// ---------------------------------------------------------------------------

function EditTeamMemberModal({
  open,
  onClose,
  member,
}: {
  open: boolean;
  onClose: () => void;
  member: Profile | null;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "",
    phone: "",
  });

  useEffect(() => {
    if (member) {
      setForm({ name: member.full_name, email: member.email, role: member.role, phone: member.phone ?? "" });
    }
  }, [member]);

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader
        title="Edit team member"
        sub={member?.full_name ?? ""}
        onClose={onClose}
      />
      <ModalBody>
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Full name" required>
              <TextInput
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Email address" required>
              <TextInput
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Role" required>
            <Select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              options={ROLE_OPTIONS}
            />
          </Field>
          <Field label="Phone" hint="Optional - used for SMS alerts and dispatch.">
            <TextInput
              type="tel"
              placeholder="e.g. 0412 345 678"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onClose}>
          Save changes
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// ToggleMemberModal
// ---------------------------------------------------------------------------

function ToggleMemberModal({
  open,
  onClose,
  member,
}: {
  open: boolean;
  onClose: () => void;
  member: Profile | null;
}) {
  const isActive = member?.status === "Active";

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader
        title={isActive ? "Deactivate account" : "Reactivate account"}
        onClose={onClose}
      />
      <ModalBody>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-2">
            {isActive
              ? `Deactivating ${member?.full_name ?? "this member"}'s account will immediately revoke their access to the platform. They will not be able to log in until their account is reactivated.`
              : `Reactivating ${member?.full_name ?? "this member"}'s account will restore their access to the platform with their previous role and permissions.`}
          </p>
          <InfoBox tone={isActive ? "amber" : "blue"}>
            {isActive
              ? "This action takes effect immediately. Any active sessions will be terminated."
              : "The member will receive an email notification that their account has been reactivated."}
          </InfoBox>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={isActive ? "danger" : "primary"}
          icon={Power}
          onClick={onClose}
        >
          {isActive ? "Deactivate account" : "Reactivate account"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// DeleteMemberModal
// ---------------------------------------------------------------------------

function DeleteMemberModal({
  open,
  onClose,
  member,
}: {
  open: boolean;
  onClose: () => void;
  member: Profile | null;
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader
        title="Remove from team"
        onClose={onClose}
      />
      <ModalBody>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-2">
            Are you sure you want to remove{" "}
            <strong>{member?.full_name ?? "this member"}</strong> from your team? Their account
            will be soft-deleted and they will lose all access immediately.
          </p>
          <InfoBox tone="amber">
            This is a <strong>soft delete</strong> — the account and all associated data
            will be retained for <strong>30 days</strong> and can be restored by a Super
            Admin before permanent deletion.
          </InfoBox>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" icon={Trash2} onClick={onClose}>
          Remove from team
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// TeamClient
// ---------------------------------------------------------------------------

interface TeamClientProps {
  members: Profile[];
}

export function TeamClient({ members }: TeamClientProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editMember, setEditMember] = useState<Profile | null>(null);
  const [toggleMember, setToggleMember] = useState<Profile | null>(null);
  const [deleteMember, setDeleteMember] = useState<Profile | null>(null);

  const rows = members.map((member) => [
    // Member
    <div key="member" className="flex items-center gap-3">
      <span className="w-8 h-8 rounded-full bg-navy flex items-center justify-center text-white text-xs font-semibold font-sans flex-shrink-0">
        {initials(member.full_name)}
      </span>
      <span className="font-medium text-ink">{member.full_name}</span>
    </div>,
    // Role
    <Pill key="role" tone="gray">{roleLabel(member.role)}</Pill>,
    // Email
    <span key="email" className="text-ink-3">{member.email}</span>,
    // Last active
    <span key="active" className="text-ink-3 text-xs">
      {member.last_active ? formatLastActive(member.last_active) : "-"}
    </span>,
    // Status
    <Pill key="status" tone={member.status === "Active" ? "green" : "gray"} dot>
      {member.status}
    </Pill>,
    // Actions
    <ActionMenu
      key="actions"
      actions={[
        {
          label: "Edit member",
          icon: Pencil,
          onClick: () => setEditMember(member),
        },
        {
          label: member.status === "Active" ? "Deactivate account" : "Reactivate account",
          icon: Power,
          onClick: () => setToggleMember(member),
        },
        { divider: true, label: "" },
        {
          label: "Remove from team",
          icon: Trash2,
          tone: "danger",
          onClick: () => setDeleteMember(member),
        },
      ]}
    />,
  ]);

  return (
    <>
      <div className="flex flex-col gap-6 font-sans">
        <PageTitle
          title="Team"
          sub="Everyone with access to your company's data. Invite new members, edit details, deactivate accounts, or soft-delete from your team."
          actions={
            <Button
              variant="primary"
              icon={UserPlus}
              onClick={() => setInviteOpen(true)}
            >
              Invite member
            </Button>
          }
        />

        <Card padding="p-0">
          <DataTable
            columns={["Member", "Role", "Email", "Last active", "Status", ""]}
            rows={rows}
          />
        </Card>
      </div>

      <InviteTeamMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
      <EditTeamMemberModal
        open={editMember !== null}
        onClose={() => setEditMember(null)}
        member={editMember}
      />
      <ToggleMemberModal
        open={toggleMember !== null}
        onClose={() => setToggleMember(null)}
        member={toggleMember}
      />
      <DeleteMemberModal
        open={deleteMember !== null}
        onClose={() => setDeleteMember(null)}
        member={deleteMember}
      />
    </>
  );
}
