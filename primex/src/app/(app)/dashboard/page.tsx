import { getDashboardStats } from "@/lib/data/dashboard";
import { getIncidents } from "@/lib/data/incidents";
import { getSites } from "@/lib/data/sites";
import { getGuards } from "@/lib/data/guards";
import { getCompanies } from "@/lib/data/companies";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const [stats, incidents, sites, guards, companies] = await Promise.all([
    getDashboardStats(),
    getIncidents(),
    getSites(),
    getGuards(),
    getCompanies(),
  ]);

  return (
    <DashboardClient
      stats={stats}
      incidents={incidents}
      sites={sites}
      guards={guards}
      companies={companies}
    />
  );
}
