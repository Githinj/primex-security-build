'use client'

import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '../supabase/client'
import type { UserRole } from '../types'
import { useProfile } from '@/components/providers/profile-provider'

export function useAuth() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  const profile = useProfile()

  return {
    user: profile,
    role: (profile?.role ?? 'client') as UserRole,
    isLoading: false,
    signIn: async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push('/dashboard')
      router.refresh()
    },
    signOut: async () => {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    },
  }
}
