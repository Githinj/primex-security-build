import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getRoleHomePath } from "@/lib/auth/role-redirect";
import { getCompanyById } from "@/lib/data/companies";
import { getSites } from "@/lib/data/sites";
import { getReports } from "@/lib/data/reports";
import type { Profile } from "@/lib/types";
import { ManagerClient } from "./manager-client";

export default async function ManagerPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  if (!profile || !['company_manager', 'super_admin'].includes(profile.role)) {
    redirect(getRoleHomePath(profile?.role ?? 'client'));
  }

  if (!profile?.company_id) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-ink-3 font-sans text-sm">
          No company assigned to your account.
        </p>
      </div>
    );
  }

  const companyId = profile.company_id;

  const [company, sites, reports] = await Promise.all([
    getCompanyById(companyId),
    getSites(companyId),
    getReports(companyId),
  ]);

  if (!company) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-ink-3 font-sans text-sm">Company not found.</p>
      </div>
    );
  }

  // Fetch cameras, alerts, incidents filtered by company sites (server-side)
  const siteIds = sites.map((s) => s.id);
  const supabaseForData = await createServerSupabaseClient();

  const [camerasResult, alertsResult, incidentsResult] = await Promise.all([
    supabaseForData.from('cameras').select('*').in('site_id', siteIds.length > 0 ? siteIds : ['']).order('name'),
    supabaseForData.from('alerts').select('*').in('site_id', siteIds.length > 0 ? siteIds : ['']).order('created_at', { ascending: false }),
    supabaseForData.from('incidents').select('*').in('site_id', siteIds.length > 0 ? siteIds : ['']).order('started_at', { ascending: false }),
  ]);

  const cameras = camerasResult.data ?? [];
  const companyAlerts = alertsResult.data ?? [];
  const companyIncidents = incidentsResult.data ?? [];

  // Fetch team members for this company
  const { data: teamData } = await supabase
    .from("profiles")
    .select("*")
    .eq("company_id", companyId)
    .order("full_name");
  const teamMembers: Profile[] = teamData ?? [];

  return (
    <ManagerClient
      company={company}
      sites={sites}
      cameras={cameras}
      alerts={companyAlerts}
      incidents={companyIncidents}
      teamMembers={teamMembers}
      reports={reports}
    />
  );
}
