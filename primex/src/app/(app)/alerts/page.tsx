import { getAlerts } from "@/lib/data/alerts";
import { getSites } from "@/lib/data/sites";
import { getCompanies } from "@/lib/data/companies";
import { getCameras } from "@/lib/data/cameras";
import { AlertsClient } from "./alerts-client";

export default async function AlertsPage() {
  const [alerts, sites, companies, cameras] = await Promise.all([
    getAlerts(),
    getSites(),
    getCompanies(),
    getCameras(),
  ]);

  return <AlertsClient alerts={alerts} sites={sites} companies={companies} cameras={cameras} />;
}
