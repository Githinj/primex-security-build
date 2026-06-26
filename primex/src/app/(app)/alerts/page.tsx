import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/auth/role-redirect";
import { getAlerts } from "@/lib/data/alerts";
import { getSites } from "@/lib/data/sites";
import { getCompanies } from "@/lib/data/companies";
import { getCameras } from "@/lib/data/cameras";
import { AlertsClient } from "./alerts-client";

export default async function AlertsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["super_admin", "company_manager"].includes(profile?.role ?? "")) {
    redirect(getRoleHomePath(profile?.role ?? "client"));
  }

  const [alerts, sites, companies, cameras] = await Promise.all([
    getAlerts(),
    getSites(),
    getCompanies(),
    getCameras(),
  ]);

  return <AlertsClient alerts={alerts} sites={sites} companies={companies} cameras={cameras} />;
}
