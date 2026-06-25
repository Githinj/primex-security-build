import { getIncidents } from "@/lib/data/incidents";
import { getSites } from "@/lib/data/sites";
import { getGuards } from "@/lib/data/guards";
import { IncidentsClient } from "./incidents-client";

export default async function IncidentsPage() {
  const [incidents, sites, guards] = await Promise.all([
    getIncidents(),
    getSites(),
    getGuards(),
  ]);

  return (
    <IncidentsClient incidents={incidents} sites={sites} guards={guards} />
  );
}
