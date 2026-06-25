import { getSites } from "@/lib/data/sites";
import { getCompanies } from "@/lib/data/companies";
import { SitesClient } from "./sites-client";

export default async function SitesPage() {
  const [sites, companies] = await Promise.all([getSites(), getCompanies()]);

  return <SitesClient sites={sites} companies={companies} />;
}
