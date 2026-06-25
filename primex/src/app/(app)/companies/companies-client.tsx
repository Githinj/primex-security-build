"use client";

import { useState } from "react";
import {
  UserPlus,
  Building,
  Eye,
  Pencil,
  Ban,
  Power,
  Send,
  Filter,
} from "lucide-react";

import {
  PageTitle,
  Card,
  Pill,
  DataTable,
  Button,
  SearchInput,
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
  KV,
} from "@/components/ui";

import type { Company, CompanyStatus } from "@/lib/types";

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

// --- InviteCompanyModal -----------------------------------------------------

interface InviteCompanyModalProps {
  open: boolean;
  onClose: () => void;
}

function InviteCompanyModal({ open, onClose }: InviteCompanyModalProps) {
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    type: "",
    contactName: "",
    contactEmail: "",
    plan: "",
  });

  function handleClose() {
    setSuccess(false);
    setForm({ companyName: "", type: "", contactName: "", contactEmail: "", plan: "" });
    onClose();
  }

  function handleSubmit() {
    setSuccess(true);
  }

  return (
    <Modal open={open} onClose={handleClose} width="max-w-lg">
      {success ? (
        <SuccessState
          title="Invitation sent"
          sub={`${form.companyName || "The company"} has been invited. They'll receive an email to complete setup.`}
          onDone={handleClose}
        />
      ) : (
        <>
          <ModalHeader
            title="Invite company"
            eyebrow="Super Admin"
            sub="A new data boundary will be created for this company."
            onClose={handleClose}
          />
          <ModalBody>
            <div className="flex flex-col gap-4">
              <Field label="Company name" required>
                <TextInput
                  placeholder="e.g. Apex Retail Group"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                />
              </Field>
              <Field label="Industry / type" required>
                <Select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  placeholder="Select type..."
                  options={[
                    { value: "Retail", label: "Retail" },
                    { value: "Logistics", label: "Logistics" },
                    { value: "Healthcare", label: "Healthcare" },
                    { value: "Finance", label: "Finance" },
                    { value: "Education", label: "Education" },
                    { value: "Other", label: "Other" },
                  ]}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Contact name" required>
                  <TextInput
                    placeholder="Full name"
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  />
                </Field>
                <Field label="Contact email" required>
                  <TextInput
                    type="email"
                    placeholder="name@company.com"
                    value={form.contactEmail}
                    onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Initial plan">
                <Select
                  value={form.plan}
                  onChange={(e) => setForm({ ...form, plan: e.target.value })}
                  placeholder="Select plan..."
                  options={[
                    { value: "starter", label: "Starter - up to 5 sites" },
                    { value: "growth", label: "Growth - up to 20 sites" },
                    { value: "enterprise", label: "Enterprise - unlimited" },
                  ]}
                />
              </Field>
              <InfoBox tone="blue">
                An invitation email will be sent to the contact. They will set up their own
                password and can begin adding sites and users immediately.
              </InfoBox>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" icon={Send} onClick={handleSubmit}>
              Send invitation
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

// --- CompanyDetailsModal ----------------------------------------------------

interface CompanyDetailsModalProps {
  open: boolean;
  onClose: () => void;
  company: Company | null;
  mode: "view" | "edit";
  onSwitchToEdit: () => void;
}

function CompanyDetailsModal({
  open,
  onClose,
  company,
  mode,
  onSwitchToEdit,
}: CompanyDetailsModalProps) {
  const [editForm, setEditForm] = useState({
    name: company?.name ?? "",
    type: company?.type ?? "",
    status: company?.status ?? "Active",
  });

  const [saved, setSaved] = useState(false);

  // Sync form when company changes
  if (company && editForm.name !== company.name && mode === "view") {
    setEditForm({ name: company.name, type: company.type, status: company.status });
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  }

  if (!company) return null;

  return (
    <Modal open={open} onClose={onClose} width="max-w-md">
      <ModalHeader
        title={mode === "view" ? company.name : "Edit company"}
        eyebrow={mode === "view" ? company.type : "Editing"}
        onClose={onClose}
      />
      <ModalBody>
        {mode === "view" ? (
          <div className="flex flex-col gap-3">
            <KV k="Company name" v={company.name} />
            <KV k="Industry / type" v={company.type} />
            <KV
              k="Status"
              v={
                <Pill tone={statusTone(company.status)} dot size="sm">
                  {company.status}
                </Pill>
              }
            />
            <KV k="Sites" v={company.sites} />
            <KV k="Users" v={company.users} />
            <KV k="Company ID" v={<span className="text-ink-4 font-mono text-xs">{company.id}</span>} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {saved && (
              <InfoBox tone="green">Changes saved successfully.</InfoBox>
            )}
            <Field label="Company name" required>
              <TextInput
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </Field>
            <Field label="Industry / type" required>
              <Select
                value={editForm.type}
                onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                options={[
                  { value: "Retail", label: "Retail" },
                  { value: "Logistics", label: "Logistics" },
                  { value: "Healthcare", label: "Healthcare" },
                  { value: "Finance", label: "Finance" },
                  { value: "Education", label: "Education" },
                  { value: "Other", label: "Other" },
                ]}
              />
            </Field>
            <Field label="Status">
              <Select
                value={editForm.status}
                onChange={(e) =>
                  setEditForm({ ...editForm, status: e.target.value as CompanyStatus })
                }
                options={[
                  { value: "Active", label: "Active" },
                  { value: "Pending", label: "Pending" },
                  { value: "Suspended", label: "Suspended" },
                ]}
              />
            </Field>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {mode === "view" ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button variant="primary" icon={Pencil} onClick={onSwitchToEdit}>
              Edit company
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Save changes
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}

// --- SuspendCompanyModal ----------------------------------------------------

interface SuspendCompanyModalProps {
  open: boolean;
  onClose: () => void;
  company: Company | null;
}

function SuspendCompanyModal({ open, onClose, company }: SuspendCompanyModalProps) {
  if (!company) return null;

  const isSuspended = company.status === "Suspended";

  function handleConfirm() {
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} width="max-w-sm">
      <ModalHeader
        title={isSuspended ? `Restore ${company.name}` : `Suspend ${company.name}`}
        onClose={onClose}
      />
      <ModalBody>
        <div className="flex flex-col gap-4">
          <InfoBox tone={isSuspended ? "green" : "amber"}>
            {isSuspended
              ? `Restoring ${company.name} will re-enable all their sites, users, and camera feeds immediately.`
              : `Suspending ${company.name} will immediately disable access for all their users and pause all camera feeds. This action can be reversed.`}
          </InfoBox>
          <p className="text-sm text-ink-2 font-sans">
            Are you sure you want to <strong>{isSuspended ? "restore" : "suspend"}</strong> this company?
          </p>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={isSuspended ? "primary" : "danger"}
          icon={isSuspended ? Power : Ban}
          onClick={handleConfirm}
        >
          {isSuspended ? "Restore company" : "Suspend company"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// --- CompaniesClient --------------------------------------------------------

interface CompaniesClientProps {
  companies: Company[];
}

export function CompaniesClient({ companies }: CompaniesClientProps) {
  const [search, setSearch] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Filter companies by search
  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.type.toLowerCase().includes(search.toLowerCase())
  );

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

  // Build table rows
  const rows = filtered.map((company) => [
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
          label: company.status === "Suspended" ? "Restore company" : "Suspend company",
          icon: company.status === "Suspended" ? Power : Ban,
          tone: company.status !== "Suspended" ? "danger" : undefined,
          onClick: () => openSuspend(company),
        },
      ]}
    />,
  ]);

  return (
    <div className="px-9 py-8 flex flex-col gap-6">

      {/* Header */}
      <PageTitle
        title="Companies"
        sub="Every company is a hard data boundary. Sites, users, alerts and incidents are scoped per company. Only Super Admin can invite new companies."
        actions={
          <>
            <Button variant="secondary" size="sm" icon={Filter}>
              Status
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={UserPlus}
              onClick={() => setModalMode("invite")}
            >
              Invite company
            </Button>
          </>
        }
      />

      {/* Main table card */}
      <Card padding="p-0">
        {/* Search bar header */}
        <div className="px-4 py-3 border-b border-border">
          <SearchInput
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <DataTable
          columns={["Company", "Type", "Sites", "Users", "Status", ""]}
          rows={rows}
        />

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
        onSwitchToEdit={() => setModalMode("details-edit")}
      />

      <SuspendCompanyModal
        open={modalMode === "suspend"}
        onClose={closeModal}
        company={selectedCompany}
      />
    </div>
  );
}
