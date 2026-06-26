'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export function useRealtimeAlerts() {
  const router = useRouter()
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])

  useEffect(() => {
    const channel = supabase
      .channel('ai-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          const alert = payload.new as { title?: string; severity?: string; source?: string }
          if (alert.source?.includes('AI')) {
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(`${alert.severity}: ${alert.title}`, {
                body: 'New AI detection alert',
                icon: '/favicon.ico',
              })
            }
          }
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, router])
}
