import { getTeamMembers } from "@/lib/data/profiles";
import { TeamClient } from "./team-client";

export default async function TeamPage() {
  const members = await getTeamMembers();

  return <TeamClient members={members} />;
}
