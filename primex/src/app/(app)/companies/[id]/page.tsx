import { getCompanyById } from "@/lib/data/companies";
import { getSites } from "@/lib/data/sites";
import { getCameras } from "@/lib/data/cameras";
import { getTeamMembers } from "@/lib/data/profiles";
import { notFound } from "next/navigation";
import { CompanyDetailClient } from "./company-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyDetailPage({ params }: PageProps) {
  const { id } = await params;

  const company = await getCompanyById(id);
  if (!company) notFound();

  const [sites, cameras, team] = await Promise.all([
    getSites(company.id),
    getCameras(),
    getTeamMembers(),
  ]);

  // Filter team members relevant to this company
  const companyTeam = team.filter(
    (t) =>
      t.role === "super_admin" ||
      t.role === "dispatcher" ||
      t.company_id === company.id
  ).slice(0, 8);

  return (
    <CompanyDetailClient
      company={company}
      sites={sites}
      cameras={cameras}
      team={companyTeam}
    />
  );
}
