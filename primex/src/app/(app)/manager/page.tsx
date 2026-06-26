import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getRoleHomePath } from "@/lib/auth/role-redirect";
import { getCompanyById } from "@/lib/data/companies";
import { getSites } from "@/lib/data/sites";
import { getCameras } from "@/lib/data/cameras";
import { getAlerts } from "@/lib/data/alerts";
import { getIncidents } from "@/lib/data/incidents";
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

  const [company, sites, alerts, incidents, reports] = await Promise.all([
    getCompanyById(companyId),
    getSites(companyId),
    getAlerts(),
    getIncidents(),
    getReports(companyId),
  ]);

  if (!company) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-ink-3 font-sans text-sm">Company not found.</p>
      </div>
    );
  }

  // Fetch cameras for all company sites
  const siteIds = sites.map((s) => s.id);
  const allCameras = await getCameras();
  const cameras = allCameras.filter((c) => siteIds.includes(c.site_id));

  // Filter alerts and incidents to only those belonging to company sites
  const companyAlerts = alerts.filter((a) => siteIds.includes(a.site_id));
  const companyIncidents = incidents.filter((i) => siteIds.includes(i.site_id));

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
