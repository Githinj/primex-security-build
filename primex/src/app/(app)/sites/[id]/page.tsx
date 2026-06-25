import { getSiteById } from "@/lib/data/sites";
import { getCompanyById } from "@/lib/data/companies";
import { getCameras } from "@/lib/data/cameras";
import { getAlerts } from "@/lib/data/alerts";
import { getIncidents } from "@/lib/data/incidents";
import { SiteDetailClient } from "./site-detail-client";
import { notFound } from "next/navigation";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const site = await getSiteById(id);
  if (!site) notFound();

  const [company, cameras, alerts, incidents] = await Promise.all([
    getCompanyById(site.company_id),
    getCameras(id),
    getAlerts(id),
    getIncidents(id),
  ]);

  if (!company) notFound();

  return (
    <SiteDetailClient
      site={site}
      company={company}
      cameras={cameras}
      alerts={alerts}
      incidents={incidents}
    />
  );
}
