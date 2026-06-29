import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/auth/role-redirect";
import { getSites } from "@/lib/data/sites";
import { getCompanies } from "@/lib/data/companies";
import { SitesClient } from "./sites-client";

interface Props {
  searchParams: Promise<{ page?: string }>;
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

  const [sitesResult, companies] = await Promise.all([
    getSites(undefined, { page, pageSize }),
    getCompanies(),
  ]);

  return (
    <SitesClient
      sites={sitesResult.data}
      total={sitesResult.total}
      page={sitesResult.page}
      pageSize={sitesResult.pageSize}
      companies={companies}
    />
  );
}
