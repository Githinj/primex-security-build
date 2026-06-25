import { getGuards } from "@/lib/data/guards";
import { GuardsClient } from "./guards-client";

export default async function GuardsPage() {
  const guards = await getGuards();

  return <GuardsClient guards={guards} />;
}
