import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/auth/role-redirect";
import { getDashboardStats } from "@/lib/data/dashboard";
import { getIncidents } from "@/lib/data/incidents";
import { getSites } from "@/lib/data/sites";
import { getGuards } from "@/lib/data/guards";
import { getCompanies } from "@/lib/data/companies";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") {
    redirect(getRoleHomePath(profile?.role ?? "client"));
  }

  const [stats, incidents, sites, guards, companies] = await Promise.all([
    getDashboardStats(),
    getIncidents(),
    getSites(),
    getGuards(),
    getCompanies(),
  ]);

  return (
    <DashboardClient
      stats={stats}
      incidents={incidents}
      sites={sites}
      guards={guards}
      companies={companies}
    />
  );
}
