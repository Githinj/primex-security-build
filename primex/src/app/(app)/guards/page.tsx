import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/auth/role-redirect";
import { getGuards } from "@/lib/data/guards";
import { GuardsClient } from "./guards-client";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function GuardsPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") {
    redirect(getRoleHomePath(profile?.role ?? "client"));
  }

  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 25;

  const guardsResult = await getGuards({ page, pageSize });

  return (
    <GuardsClient
      guards={guardsResult.data}
      total={guardsResult.total}
      page={guardsResult.page}
      pageSize={guardsResult.pageSize}
    />
  );
}
