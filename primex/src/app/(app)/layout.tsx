import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ProfileProvider } from '@/components/providers/profile-provider'
import { ScopeProvider } from '@/components/providers/scope-provider'
import { AppShell } from './app-shell'
import { getCompanies } from '@/lib/data/companies'
import type { Profile } from '@/lib/types'
import type { Company } from '@/lib/types'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: Profile | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = data
  }

  // Fetch companies for scope dropdown + nav counts (super_admin only)
  let companies: Company[] = []
  let navCounts: Record<string, number> = {}
  if (profile?.role === 'super_admin') {
    try {
      const [companiesData, counts] = await Promise.all([
        getCompanies(),
        Promise.all([
          supabase.from('companies').select('*', { count: 'exact', head: true }),
          supabase.from('sites').select('*', { count: 'exact', head: true }),
          supabase.from('cameras').select('*', { count: 'exact', head: true }),
          supabase.from('alerts').select('*', { count: 'exact', head: true }).in('status', ['New', 'Reviewing', 'Escalated']),
          supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['Open', 'In Progress', 'Dispatched']),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'guard'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
        ]),
      ])
      companies = companiesData
      navCounts = {
        companies: counts[0].count ?? 0,
        sites: counts[1].count ?? 0,
        cameras: counts[2].count ?? 0,
        alerts: counts[3].count ?? 0,
        incidents: counts[4].count ?? 0,
        guards: counts[5].count ?? 0,
        team: counts[6].count ?? 0,
      }
    } catch {
      companies = []
    }
  }

  return (
    <ProfileProvider profile={profile}>
      <ScopeProvider companies={companies}>
        <AppShell navCounts={navCounts}>{children}</AppShell>
      </ScopeProvider>
    </ProfileProvider>
  )
}
