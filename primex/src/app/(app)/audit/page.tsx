import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/auth/role-redirect";
import { getActivity } from "@/lib/data/activity";
import { AuditClient } from "./audit-client";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function AuditPage({ searchParams }: Props) {
  const params = await searchParams;
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

  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 50;

  const activityResult = await getActivity(undefined, { page, pageSize });

  // Compute audit stat values from the current page of data
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventsToday = activityResult.data.filter(
    (a) => new Date(a.created_at) >= today
  ).length;
  const uniqueActors = new Set(activityResult.data.map((a) => a.who)).size;
  const criticalActions = activityResult.data.filter((a) => a.tone === "red").length;
  const systemEvents = activityResult.data.filter((a) => a.who === "System").length;

  const auditStats = { eventsToday, uniqueActors, criticalActions, systemEvents };

  return (
    <AuditClient
      activity={activityResult.data}
      total={activityResult.total}
      page={activityResult.page}
      pageSize={activityResult.pageSize}
      auditStats={auditStats}
    />
  );
}
