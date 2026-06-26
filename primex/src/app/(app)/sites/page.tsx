import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/auth/role-redirect";
import { getSites } from "@/lib/data/sites";
import { getCompanies } from "@/lib/data/companies";
import { SitesClient } from "./sites-client";

export default async function SitesPage() {
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

  const [sites, companies] = await Promise.all([getSites(), getCompanies()]);

  return <SitesClient sites={sites} companies={companies} />;
}
