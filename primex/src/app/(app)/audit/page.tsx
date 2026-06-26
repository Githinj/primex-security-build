import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/auth/role-redirect";
import { getActivity } from "@/lib/data/activity";
import { AuditClient } from "./audit-client";

export default async function AuditPage() {
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

  const activity = await getActivity(500);

  // Compute audit stat values from activity data
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventsToday = activity.filter(
    (a) => new Date(a.created_at) >= today
  ).length;

  const uniqueActors = new Set(activity.map((a) => a.who)).size;

  const criticalActions = activity.filter((a) => a.tone === "red").length;

  const systemEvents = activity.filter((a) => a.who === "System").length;

  const auditStats = { eventsToday, uniqueActors, criticalActions, systemEvents };

  return <AuditClient activity={activity} auditStats={auditStats} />;
}
