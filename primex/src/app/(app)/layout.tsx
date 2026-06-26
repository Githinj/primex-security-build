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

  // Fetch companies for scope dropdown (used by super_admin)
  let companies: Company[] = []
  if (profile?.role === 'super_admin') {
    try {
      companies = await getCompanies()
    } catch {
      companies = []
    }
  }

  return (
    <ProfileProvider profile={profile}>
      <ScopeProvider companies={companies}>
        <AppShell>{children}</AppShell>
      </ScopeProvider>
    </ProfileProvider>
  )
}
