import { getCameras } from "@/lib/data/cameras";
import { getSites } from "@/lib/data/sites";
import { CamerasClient } from "./cameras-client";

export default async function CamerasPage() {
  const [cameras, sites] = await Promise.all([getCameras(), getSites()]);

  return <CamerasClient cameras={cameras} sites={sites} />;
}
