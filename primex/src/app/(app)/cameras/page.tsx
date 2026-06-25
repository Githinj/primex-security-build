import { getCameras } from "@/lib/data/cameras";
import { getSites } from "@/lib/data/sites";
import { getCompanies } from "@/lib/data/companies";
import { CamerasClient } from "./cameras-client";

export default async function CamerasPage() {
  const [cameras, sites, companies] = await Promise.all([
    getCameras(),
    getSites(),
    getCompanies(),
  ]);

  return <CamerasClient cameras={cameras} sites={sites} companies={companies} />;
}
