import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data/profiles";
import { SettingsClient } from "./settings-client";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await getProfile(user.id);
  if (!profile) redirect("/login");
  return <SettingsClient profile={profile} />;
}
