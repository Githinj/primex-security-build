"use client";

import { useState } from "react";
import { Filter, Plus, Eye, Pencil, Power, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  PageTitle,
  Card,
  DataTable,
  Pill,
  Button,
  ActionMenu,
} from "@/components/ui";
import { AddSiteModal } from "@/components/sites/add-site-modal";
import type { Site, Company, SiteRisk, SiteStatus } from "@/lib/types";

function riskTone(risk: SiteRisk): "red" | "amber" | "green" {
  switch (risk) {
    case "High":
      return "red";
    case "Medium":
      return "amber";
    case "Low":
      return "green";
  }
}

function statusTone(status: SiteStatus): "green" | "amber" {
  return status === "Active" ? "green" : "amber";
}

interface SitesClientProps {
  sites: Site[];
  companies: Company[];
}

export function SitesClient({ sites, companies }: SitesClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  const rows = sites.map((site) => {
    const company = companies.find((c) => c.id === site.company_id);

    return [
      // Site name + address
      <div key="site" className="flex flex-col gap-0.5">
        <span className="font-medium text-ink">{site.name}</span>
        <span className="text-xs text-ink-4">{site.address}</span>
      </div>,

      // Company
      <span key="company" className="text-ink-2">
        {company?.name ?? "—"}
      </span>,

      // Type
      <span key="type" className="text-ink-2">
        {site.type}
      </span>,

      // Risk
      <Pill key="risk" tone={riskTone(site.risk)}>
        {site.risk}
      </Pill>,

      // Cameras
      <span key="cameras" className="text-ink-2 tabular-nums">
        {site.cameras}
      </span>,

      // Status
      <Pill key="status" tone={statusTone(site.status)}>
        {site.status}
      </Pill>,

      // Actions
      <ActionMenu
        key="actions"
        actions={[
          {
            label: "View site",
            icon: Eye,
            onClick: () => router.push(`/sites/${site.id}`),
          },
          {
            label: "Edit site",
            icon: Pencil,
            onClick: () => {},
          },
          { divider: true, label: "" },
          {
            label: site.status === "Active" ? "Deactivate site" : "Activate site",
            icon: Power,
            onClick: () => {},
          },
          {
            label: "Delete site",
            icon: Trash2,
            tone: "danger",
            onClick: () => {},
          },
        ]}
      />,
    ];
  });

  return (
    <>
      <div className="px-9 py-8 flex flex-col gap-6">
        <PageTitle
          title="Sites"
          sub="Each site belongs to one company and carries its own cameras, alerts, and incidents. Super Admin can create or delete sites on behalf of any company."
          actions={
            <>
              <Button variant="secondary" icon={Filter}>
                Risk
              </Button>
              <Button
                variant="primary"
                icon={Plus}
                onClick={() => setModalOpen(true)}
              >
                Add site
              </Button>
            </>
          }
        />

        <Card padding="p-0">
          <DataTable
            columns={["Site", "Company", "Type", "Risk", "Cameras", "Status", ""]}
            rows={rows}
          />
        </Card>
      </div>

      <AddSiteModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
