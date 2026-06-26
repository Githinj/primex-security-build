import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/auth/role-redirect";
import { getIncidents } from "@/lib/data/incidents";
import { getSites } from "@/lib/data/sites";
import { getGuards } from "@/lib/data/guards";
import { IncidentsClient } from "./incidents-client";

export default async function IncidentsPage() {
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

  const [incidents, sites, guards] = await Promise.all([
    getIncidents(),
    getSites(),
    getGuards(),
  ]);

  return (
    <IncidentsClient incidents={incidents} sites={sites} guards={guards} />
  );
}
