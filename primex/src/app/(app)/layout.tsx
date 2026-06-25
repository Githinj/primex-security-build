import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ProfileProvider } from '@/components/providers/profile-provider'
import { AppShell } from './app-shell'
import type { Profile } from '@/lib/types'

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

  return (
    <ProfileProvider profile={profile}>
      <AppShell>{children}</AppShell>
    </ProfileProvider>
  )
}
