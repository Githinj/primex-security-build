import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/auth/role-redirect";
import { getCompanies } from "@/lib/data/companies";
import { applyPagination, toPaginatedResult } from "@/lib/data/pagination";
import { SitesClient } from "./sites-client";

interface Props {
  searchParams: Promise<{ page?: string; risk?: string }>;
}

export default async function SitesPage({ searchParams }: Props) {
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
  const risk = params.risk || "All";

  let query = supabase
    .from("sites")
    .select("*, cameras(count)", { count: "exact" })
    .order("name");

  if (risk !== "All") query = query.eq("risk", risk);
  query = applyPagination(query, { page, pageSize });

  const { data, error, count } = await query;
  if (error) throw error;

  const sites = (data ?? []).map((s: any) => ({
    id: s.id,
    company_id: s.company_id,
    name: s.name,
    type: s.type,
    address: s.address,
    risk: s.risk,
    status: s.status,
    cameras: s.cameras[0]?.count ?? 0,
  }));

  const sitesResult = toPaginatedResult(sites, count, { page, pageSize });
  const companies = await getCompanies();

  return (
    <SitesClient
      sites={sitesResult.data}
      total={sitesResult.total}
      page={sitesResult.page}
      pageSize={sitesResult.pageSize}
      risk={risk}
      companies={companies}
    />
  );
}
