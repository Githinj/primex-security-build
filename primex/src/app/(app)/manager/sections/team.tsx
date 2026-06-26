"use client";

import { useState } from "react";
import {
  UserPlus,
  Pencil,
  Power,
  Trash2,
} from "lucide-react";
import {
  PageTitle,
  Button,
  Card,
  DataTable,
  Pill,
  ActionMenu,
} from "@/components/ui";
import type { Profile } from "@/lib/types";
import { InviteTeamMemberModal } from "@/components/team/invite-member-modal";
import { EditTeamMemberModal } from "@/components/team/edit-member-modal";
import { ToggleMemberModal } from "@/components/team/toggle-member-modal";
import { DeleteMemberModal } from "@/components/team/delete-member-modal";

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

interface CompanyTeamProps {
  members: Profile[];
}

export function CompanyTeam({ members }: CompanyTeamProps) {
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
    <Pill key="role" tone="gray">
      {roleLabel(member.role)}
    </Pill>,
    // Email
    <span key="email" className="text-ink-3">
      {member.email}
    </span>,
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
          label:
            member.status === "Active"
              ? "Deactivate account"
              : "Reactivate account",
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
          sub="Everyone with access to your company's data. Invite new members, edit details, deactivate accounts, or remove from your team."
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
