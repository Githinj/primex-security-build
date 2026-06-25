import { getIncidentById } from "@/lib/data/incidents";
import { getSiteById } from "@/lib/data/sites";
import { getGuardById } from "@/lib/data/guards";
import { getAlertById } from "@/lib/data/alerts";
import { IncidentDetailClient } from "./incident-detail-client";
import { notFound } from "next/navigation";

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const incident = await getIncidentById(id);
  if (!incident) notFound();

  const [site, guard, alert] = await Promise.all([
    getSiteById(incident.site_id),
    incident.guard_id ? getGuardById(incident.guard_id) : Promise.resolve(null),
    getAlertById(incident.alert_id),
  ]);

  if (!site) notFound();
  if (!alert) notFound();

  return (
    <IncidentDetailClient
      incident={incident}
      site={site}
      guard={guard}
      alert={alert}
    />
  );
}
