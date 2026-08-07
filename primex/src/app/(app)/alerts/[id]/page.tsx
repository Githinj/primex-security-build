import { getAlertById } from "@/lib/data/alerts";
import { getSiteById } from "@/lib/data/sites";
import { getCameraById } from "@/lib/data/cameras";
import { signedPlaybackUrl } from "@/lib/storage/presign";
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

  // AI frames live in a private bucket — the stored URL grants no access, so
  // sign a short-lived one here, after the page's own authorization checks.
  const frameUrl = alert.frame_url ? signedPlaybackUrl(alert.frame_url) : null;

  return (
    <AlertDetailClient alert={alert} site={site} camera={camera} frameUrl={frameUrl} />
  );
}
