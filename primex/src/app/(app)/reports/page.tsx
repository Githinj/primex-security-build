import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/auth/role-redirect";
import { getReports } from "@/lib/data/reports";
import { getIncidents } from "@/lib/data/incidents";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
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

  const [reports, allIncidents] = await Promise.all([
    getReports(),
    getIncidents(),
  ]);

  // Compute report stats
  const totalReports = reports.length;
  const totalIncidents = allIncidents.length;
  const resolvedIncidents = allIncidents.filter((i) =>
    ["Resolved", "Closed"].includes(i.status)
  ).length;
  const resolutionRate =
    totalIncidents > 0
      ? Math.round((resolvedIncidents / totalIncidents) * 100)
      : 0;

  // Avg response time from resolved/closed incidents (updated_at - started_at)
  // Incidents have updated_at in the DB but not in the TS type, so we fetch separately
  const supabaseForAvg = await createServerSupabaseClient();
  const { data: resolvedData } = await supabaseForAvg
    .from("incidents")
    .select("started_at, updated_at")
    .in("status", ["Resolved", "Closed"]);
  const resolvedRows = (resolvedData ?? []) as Array<{
    started_at: string;
    updated_at: string;
  }>;
  let avgResponseMinutes = 0;
  if (resolvedRows.length > 0) {
    const totalMinutes = resolvedRows.reduce((sum, inc) => {
      const diff =
        new Date(inc.updated_at).getTime() -
        new Date(inc.started_at).getTime();
      return sum + diff / 60_000;
    }, 0);
    avgResponseMinutes = Math.round(totalMinutes / resolvedRows.length);
  }

  // Monthly incident data (last 6 months)
  const now = new Date();
  const monthlyData: { label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const label = d.toLocaleString("en-AU", { month: "short" });
    const count = allIncidents.filter((inc) => {
      const t = new Date(inc.started_at);
      return t >= d && t <= monthEnd;
    }).length;
    monthlyData.push({ label, value: count });
  }

  // Avg incidents per month
  const monthsWithData = monthlyData.filter((m) => m.value > 0).length || 1;
  const avgIncidentsPerMonth = parseFloat(
    (totalIncidents / Math.max(monthsWithData, 1)).toFixed(1)
  );

  // Incident types - group by title keywords
  const typeCounts: Record<string, number> = {};
  for (const inc of allIncidents) {
    const title = inc.title;
    // Simple keyword grouping
    let category = "Other";
    const lower = title.toLowerCase();
    if (lower.includes("suspicious")) category = "Suspicious activity";
    else if (lower.includes("door") || lower.includes("access")) category = "Door / access";
    else if (lower.includes("camera") || lower.includes("offline")) category = "Camera offline";
    else if (lower.includes("motion") || lower.includes("after")) category = "After-hours motion";
    else if (lower.includes("perimeter") || lower.includes("breach")) category = "Perimeter breach";
    typeCounts[category] = (typeCounts[category] ?? 0) + 1;
  }
  const maxTypeCount = Math.max(...Object.values(typeCounts), 1);
  const incidentTypes = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      count,
      pct: Math.round((count / maxTypeCount) * 100),
    }));

  const reportStats = {
    totalReports,
    avgIncidentsPerMonth,
    avgResponseMinutes,
    resolutionRate,
  };

  return (
    <ReportsClient
      reports={reports}
      reportStats={reportStats}
      monthlyData={monthlyData}
      incidentTypes={incidentTypes}
    />
  );
}
