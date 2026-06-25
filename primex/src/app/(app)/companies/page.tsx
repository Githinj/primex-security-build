import { getCompanies } from "@/lib/data/companies";
import { CompaniesClient } from "./companies-client";

export default async function CompaniesPage() {
  const companies = await getCompanies();

  return <CompaniesClient companies={companies} />;
}
