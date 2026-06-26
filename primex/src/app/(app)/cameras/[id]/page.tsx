import { getCameraById } from "@/lib/data/cameras";
import { getSiteById } from "@/lib/data/sites";
import { getCameraAiConfig } from "@/lib/data/camera-ai-config";
import { notFound } from "next/navigation";
import { CameraDetailClient } from "./camera-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CameraDetailPage({ params }: PageProps) {
  const { id } = await params;

  const camera = await getCameraById(id);
  if (!camera) notFound();

  const site = await getSiteById(camera.site_id);
  if (!site) notFound();

  const aiConfig = await getCameraAiConfig(camera.id);

  return <CameraDetailClient camera={camera} site={site} aiConfig={aiConfig} />;
}
