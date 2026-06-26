import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/auth/role-redirect";
import { getCompanies } from "@/lib/data/companies";
import { CompaniesClient } from "./companies-client";

export default async function CompaniesPage() {
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

  const companies = await getCompanies();

  return <CompaniesClient companies={companies} />;
}
