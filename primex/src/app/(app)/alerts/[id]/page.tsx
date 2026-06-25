import { getAlertById } from "@/lib/data/alerts";
import { getSiteById } from "@/lib/data/sites";
import { getCameraById } from "@/lib/data/cameras";
import { AlertDetailClient } from "./alert-detail-client";
import { notFound } from "next/navigation";

export default async function AlertDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const alert = await getAlertById(id);
  if (!alert) notFound();

  const site = await getSiteById(alert.site_id);
  if (!site) notFound();

  const camera = alert.camera_id ? await getCameraById(alert.camera_id) : null;

  return <AlertDetailClient alert={alert} site={site} camera={camera} />;
}
