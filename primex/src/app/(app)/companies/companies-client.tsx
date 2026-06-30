"use client";

import { useState } from "react";
import {
  UserPlus,
  Building,
  Eye,
  Pencil,
  Ban,
  Power,
} from "lucide-react";

import {
  PageTitle,
  Card,
  Pill,
  DataTable,
  Button,
  SearchInput,
  ActionMenu,
  FilterPills,
} from "@/components/ui";

import type { Company, CompanyStatus } from "@/lib/types";

import { InviteCompanyModal } from "@/components/companies/invite-company-modal";
import { CompanyDetailsModal } from "@/components/companies/company-details-modal";
import { SuspendCompanyModal } from "@/components/companies/suspend-company-modal";

// --- types -----------------------------------------------------------------

type ModalMode = "invite" | "details-view" | "details-edit" | "suspend" | null;

// --- helpers ----------------------------------------------------------------

function statusTone(status: CompanyStatus): "green" | "red" | "amber" {
  switch (status) {
    case "Active":
      return "green";
    case "Suspended":
      return "red";
    case "Pending":
      return "amber";
  }
}

// --- CompaniesClient --------------------------------------------------------

interface CompaniesClientProps {
  companies: Company[];
}

const PAGE_SIZE = 25;
const STATUS_OPTIONS = ["All", "Active", "Pending", "Suspended"] as const;
type StatusFilter = typeof STATUS_OPTIONS[number];

export function CompaniesClient({ companies }: CompaniesClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [page, setPage] = useState(1);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Filter companies by search + status
  const filtered = companies.filter((c) => {
    if (statusFilter !== "All" && c.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q);
  });

  function openDetails(company: Company) {
    setSelectedCompany(company);
    setModalMode("details-view");
  }

  function openEdit(company: Company) {
    setSelectedCompany(company);
    setModalMode("details-edit");
  }

  function openSuspend(company: Company) {
    setSelectedCompany(company);
    setModalMode("suspend");
  }

  function closeModal() {
    setModalMode(null);
    setSelectedCompany(null);
  }

  const paginatedFiltered = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Build table rows
  const rows = paginatedFiltered.map((company) => [
    // Company name
    <span key="name" className="flex items-center gap-2.5">
      <span className="w-7 h-7 rounded-lg bg-surface-subtle border border-border flex items-center justify-center flex-shrink-0">
        <Building size={13} className="text-ink-3" strokeWidth={2} />
      </span>
      <span className="font-medium text-ink text-[13px]">{company.name}</span>
    </span>,
    // Type
    <span key="type" className="text-ink-3 text-[13px]">{company.type}</span>,
    // Sites
    <span key="sites" className="text-ink-2 text-[13px] font-medium">{company.sites}</span>,
    // Users
    <span key="users" className="text-ink-2 text-[13px] font-medium">{company.users}</span>,
    // Status
    <Pill key="status" tone={statusTone(company.status)} dot size="sm">
      {company.status}
    </Pill>,
    // Actions
    <ActionMenu
      key="actions"
      actions={[
        {
          label: "View details",
          icon: Eye,
          onClick: () => openDetails(company),
        },
        {
          label: "Edit company",
          icon: Pencil,
          onClick: () => openEdit(company),
        },
        { divider: true, label: "" },
        {
          label: company.status === "Suspended" ? "Restore access" : "Suspend company",
          icon: company.status === "Suspended" ? Power : Ban,
          tone: company.status !== "Suspended" ? "danger" : undefined,
          onClick: () => openSuspend(company),
        },
      ]}
    />,
  ]);

  return (
    <div className="px-4 sm:px-9 py-6 sm:py-8 flex flex-col gap-6">

      {/* Header */}
      <PageTitle
        title="Companies"
        sub="Every company is a hard data boundary. Sites, users, alerts and incidents are scoped per company. Only Super Admin can invite new companies."
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={UserPlus}
            onClick={() => setModalMode("invite")}
          >
            Invite company
          </Button>
        }
      />

      {/* Main table card */}
      <Card padding="p-0">
        {/* Search + filter header */}
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3">
          <div className="w-full sm:w-64">
            <SearchInput
              placeholder="Search companies..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <FilterPills
            options={[...STATUS_OPTIONS]}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
          />
        </div>

        <div className="overflow-x-auto">
          <DataTable
            columns={["Company", "Type", "Sites", "Users", "Status", ""]}
            rows={rows}
            pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, onPageChange: (p) => setPage(p) }}
          />
        </div>

        {filtered.length === 0 && (
          <p className="px-5 py-8 text-sm text-ink-3 font-sans text-center">
            No companies match your search.
          </p>
        )}
      </Card>

      {/* Modals */}
      <InviteCompanyModal
        open={modalMode === "invite"}
        onClose={closeModal}
      />

      <CompanyDetailsModal
        open={modalMode === "details-view" || modalMode === "details-edit"}
        onClose={closeModal}
        company={selectedCompany}
        mode={modalMode === "details-edit" ? "edit" : "view"}
      />

      <SuspendCompanyModal
        open={modalMode === "suspend"}
        onClose={closeModal}
        company={selectedCompany}
      />
    </div>
  );
}
