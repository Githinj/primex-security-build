import { getReports } from "@/lib/data/reports";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
  const reports = await getReports();

  return <ReportsClient reports={reports} />;
}
