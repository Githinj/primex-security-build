import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/auth/role-redirect";
import { getTeamMembers } from "@/lib/data/profiles";
import { TeamClient } from "./team-client";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function TeamPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["super_admin", "company_manager"].includes(profile?.role ?? "")) {
    redirect(getRoleHomePath(profile?.role ?? "client"));
  }

  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 25;

  const membersResult = await getTeamMembers({ page, pageSize });

  return (
    <TeamClient
      members={membersResult.data}
      total={membersResult.total}
      page={membersResult.page}
      pageSize={membersResult.pageSize}
    />
  );
}
