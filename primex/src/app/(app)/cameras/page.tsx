import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/auth/role-redirect";
import { getCameras } from "@/lib/data/cameras";
import { getSites } from "@/lib/data/sites";
import { getCompanies } from "@/lib/data/companies";
import { CamerasClient } from "./cameras-client";

export default async function CamerasPage() {
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

  const [cameras, sites, companies] = await Promise.all([
    getCameras(),
    getSites(),
    getCompanies(),
  ]);

  return <CamerasClient cameras={cameras} sites={sites} companies={companies} />;
}
