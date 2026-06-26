import { getAlerts } from '@/lib/data/alerts'
import { getIncidents } from '@/lib/data/incidents'
import { getGuards } from '@/lib/data/guards'
import { getSites } from '@/lib/data/sites'
import { getCameras } from '@/lib/data/cameras'
import { getActivity } from '@/lib/data/activity'
import { DispatcherClient } from './dispatcher-client'

export default async function DispatcherPage() {
  const [alerts, incidents, guards, sites, cameras, activity] = await Promise.all([
    getAlerts(),
    getIncidents(),
    getGuards(),
    getSites(),
    getCameras(),
    getActivity(10),
  ])

  return (
    <DispatcherClient
      alerts={alerts}
      incidents={incidents}
      guards={guards}
      sites={sites}
      cameras={cameras}
      activity={activity}
    />
  )
}
