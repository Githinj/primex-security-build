import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/auth/role-redirect";
import { getProfile } from "@/lib/data/profiles";
import { SettingsClient } from "./settings-client";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await getProfile(user.id);
  if (!profile) redirect("/login");

  if (!["super_admin", "company_manager"].includes(profile.role)) {
    redirect(getRoleHomePath(profile.role));
  }

  return <SettingsClient profile={profile} />;
}
