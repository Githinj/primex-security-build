import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getRoleHomePath } from '@/lib/auth/role-redirect'
import type { Incident, Site, Profile } from '@/lib/types'
import { GuardClient } from './guard-client'

export default async function GuardPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch the guard's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  if (profile.role !== 'guard') {
    redirect(getRoleHomePath(profile.role))
  }

  // Fetch incidents assigned to this guard that are not Closed
  const { data: incidents } = await supabase
    .from('incidents')
    .select('*')
    .eq('guard_id', user.id)
    .neq('status', 'Closed')
    .order('started_at', { ascending: false })

  const incidentList: Incident[] = incidents ?? []

  // Fetch site data for those incidents
  const siteIds = [...new Set(incidentList.map((i) => i.site_id))]
  let sites: Site[] = []
  if (siteIds.length > 0) {
    const { data: siteData } = await supabase
      .from('sites')
      .select('*')
      .in('id', siteIds)
    sites = siteData ?? []
  }

  return (
    <GuardClient
      profile={profile as Profile}
      incidents={incidentList}
      sites={sites}
    />
  )
}
