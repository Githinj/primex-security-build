import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSites } from '@/lib/data/sites'
import { getCameras } from '@/lib/data/cameras'
import { getAlerts } from '@/lib/data/alerts'
import { getIncidents } from '@/lib/data/incidents'
import { getReports } from '@/lib/data/reports'
import type { Profile } from '@/lib/types'
import { PortalClient } from './portal-client'

export default async function PortalPage() {
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

  if (!profile || !profile.company_id) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-ink-3 text-sm">No portal access available.</p>
      </div>
    )
  }

  // Get the first site for this company (business clients are scoped to one site)
  const sites = await getSites(profile.company_id)
  const site = sites[0] ?? null

  if (!site) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-ink-3 text-sm">No site found for your account.</p>
      </div>
    )
  }

  const [cameras, alerts, incidents, reports] = await Promise.all([
    getCameras(site.id),
    getAlerts(site.id),
    getIncidents(site.id),
    getReports(profile.company_id),
  ])

  return (
    <PortalClient
      profile={profile}
      site={site}
      cameras={cameras}
      alerts={alerts}
      incidents={incidents}
      reports={reports}
    />
  )
}
