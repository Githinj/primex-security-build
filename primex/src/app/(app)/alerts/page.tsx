import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/auth/role-redirect";
import { getAlerts } from "@/lib/data/alerts";
import { getSites } from "@/lib/data/sites";
import { getCompanies } from "@/lib/data/companies";
import { getCameras } from "@/lib/data/cameras";
import { AlertsClient } from "./alerts-client";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function AlertsPage({ searchParams }: Props) {
  const params = await searchParams;
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

  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 25;

  const [alertsResult, sites, companies, cameras] = await Promise.all([
    getAlerts(undefined, { page, pageSize }),
    getSites(),
    getCompanies(),
    getCameras(),
  ]);

  return (
    <AlertsClient
      alerts={alertsResult.data}
      total={alertsResult.total}
      page={alertsResult.page}
      pageSize={alertsResult.pageSize}
      sites={sites}
      companies={companies}
      cameras={cameras}
    />
  );
}
