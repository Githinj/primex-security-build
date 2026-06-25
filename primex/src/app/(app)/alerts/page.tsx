import { getAlerts } from "@/lib/data/alerts";
import { getSites } from "@/lib/data/sites";
import { AlertsClient } from "./alerts-client";

export default async function AlertsPage() {
  const [alerts, sites] = await Promise.all([getAlerts(), getSites()]);

  return <AlertsClient alerts={alerts} sites={sites} />;
}
