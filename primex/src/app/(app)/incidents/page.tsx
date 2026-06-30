import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/auth/role-redirect";
import { getSites } from "@/lib/data/sites";
import { getGuards } from "@/lib/data/guards";
import { applyPagination, toPaginatedResult } from "@/lib/data/pagination";
import { IncidentsClient } from "./incidents-client";

interface Props {
  searchParams: Promise<{ page?: string; status?: string }>;
}

export default async function IncidentsPage({ searchParams }: Props) {
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
  const status = params.status || "All";

  let query = supabase
    .from("incidents")
    .select("*", { count: "exact" })
    .order("started_at", { ascending: false });

  if (status !== "All") query = query.eq("status", status);
  query = applyPagination(query, { page, pageSize });

  const { data, error, count } = await query;
  if (error) throw error;
  const incidentsResult = toPaginatedResult(data ?? [], count, { page, pageSize });

  const [sites, guards] = await Promise.all([getSites(), getGuards()]);

  return (
    <IncidentsClient
      incidents={incidentsResult.data}
      total={incidentsResult.total}
      page={incidentsResult.page}
      pageSize={incidentsResult.pageSize}
      status={status}
      sites={sites}
      guards={guards}
    />
  );
}
