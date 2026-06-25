import { getActivity } from "@/lib/data/activity";
import { AuditClient } from "./audit-client";

export default async function AuditPage() {
  const activity = await getActivity(50);

  return <AuditClient activity={activity} />;
}
