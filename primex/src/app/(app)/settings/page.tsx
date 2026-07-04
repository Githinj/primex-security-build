import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/auth/role-redirect";
import { getProfile } from "@/lib/data/profiles";
import { getNotificationPreferences } from "@/lib/data/actions/notification-preferences";
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

  const notificationPrefs = await getNotificationPreferences();

  return <SettingsClient profile={profile} notificationPrefs={notificationPrefs} />;
}
