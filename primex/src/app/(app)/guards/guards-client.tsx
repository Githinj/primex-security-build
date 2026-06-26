"use client";

import { Plus, User, Pencil, UserX } from "lucide-react";
import {
  PageTitle,
  Card,
  DataTable,
  Pill,
  ActionMenu,
  Button,
} from "@/components/ui";
import type { Profile, GuardStatus } from "@/lib/types";

interface GuardsClientProps {
  guards: Profile[];
}

function guardTone(status: GuardStatus): "green" | "amber" | "gray" {
  switch (status) {
    case "Available":
      return "green";
    case "On Incident":
      return "amber";
    case "Off-duty":
      return "gray";
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function GuardsClient({ guards }: GuardsClientProps) {
  const rows = guards.map((guard) => [
    /* Guard - avatar + name */
    <span key="guard" className="inline-flex items-center gap-3">
      <span className="w-8 h-8 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xs font-semibold font-sans">
          {getInitials(guard.full_name)}
        </span>
      </span>
      <span className="font-medium text-ink">{guard.full_name}</span>
    </span>,

    /* Zone */
    <span key="zone" className="text-ink-2">
      {guard.zone}
    </span>,

    /* Phone */
    <span key="phone" className="text-ink-2 tabular-nums font-mono text-xs">
      {guard.phone}
    </span>,

    /* Shifts */
    <span key="shifts" className="text-ink-3 text-xs whitespace-nowrap">
      {guard.shifts}
    </span>,

    /* Status */
    <Pill key="status" tone={guardTone(guard.guard_status ?? "Off-duty")} dot>
      {guard.guard_status ?? "Off-duty"}
    </Pill>,

    /* Actions */
    <ActionMenu
      key="actions"
      actions={[
        {
          label: "View profile",
          icon: User,
          onClick: () => {},
        },
        {
          label: "Edit",
          icon: Pencil,
          onClick: () => {},
        },
        { divider: true, label: "" },
        {
          label: "Deactivate",
          icon: UserX,
          tone: "danger",
          onClick: () => {},
        },
      ]}
    />,
  ]);

  return (
    <div className="px-4 sm:px-9 py-6 sm:py-8 flex flex-col gap-6">
      <PageTitle
        title="Guards"
        sub="Field responders across all zones. Status updates from the mobile app in real-time."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => {}}>
            Add guard
          </Button>
        }
      />

      <Card padding="p-0">
        <div className="overflow-x-auto">
          <DataTable
            columns={["Guard", "Zone", "Phone", "Shifts", "Status", ""]}
            rows={rows}
          />
        </div>
      </Card>
    </div>
  );
}
