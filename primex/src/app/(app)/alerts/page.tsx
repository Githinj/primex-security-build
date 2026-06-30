import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/auth/role-redirect";
import { getSites } from "@/lib/data/sites";
import { getCompanies } from "@/lib/data/companies";
import { getCameras } from "@/lib/data/cameras";
import { applyPagination, toPaginatedResult } from "@/lib/data/pagination";
import { AlertsClient } from "./alerts-client";

interface Props {
  searchParams: Promise<{ page?: string; severity?: string; status?: string }>;
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
  const severity = params.severity || "All";
  const status = params.status || "All";

  // Build filtered + paginated query
  let query = supabase
    .from("alerts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (severity !== "All") query = query.eq("severity", severity);
  if (status !== "All") query = query.eq("status", status);
  query = applyPagination(query, { page, pageSize });

  const { data, error, count } = await query;
  if (error) throw error;
  const alertsResult = toPaginatedResult(data ?? [], count, { page, pageSize });

  const [sites, companies, cameras] = await Promise.all([
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
      severity={severity}
      status={status}
      sites={sites}
      companies={companies}
      cameras={cameras}
    />
  );
}
