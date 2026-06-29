import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCompanyById } from "@/lib/data/companies";
import { getSites } from "@/lib/data/sites";
import { notFound } from "next/navigation";
import { CompanyDetailClient } from "./company-detail-client";
import type { Camera, Profile } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyDetailPage({ params }: PageProps) {
  const { id } = await params;

  const company = await getCompanyById(id);
  if (!company) notFound();

  const sites = await getSites(company.id);
  const siteIds = sites.map((s) => s.id);

  const supabase = await createServerSupabaseClient();

  // Fetch only cameras belonging to this company's sites
  const [camerasResult, teamResult] = await Promise.all([
    supabase.from('cameras').select('*').in('site_id', siteIds.length > 0 ? siteIds : ['']).order('name'),
    supabase.from('profiles').select('*').or(`company_id.eq.${company.id},role.eq.super_admin,role.eq.dispatcher`).order('full_name').limit(8),
  ]);

  const cameras: Camera[] = camerasResult.data ?? [];
  const companyTeam: Profile[] = teamResult.data ?? [];

  return (
    <CompanyDetailClient
      company={company}
      sites={sites}
      cameras={cameras}
      team={companyTeam}
    />
  );
}
