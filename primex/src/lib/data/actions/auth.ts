'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { UserRole } from '@/lib/types'
import { requireRole } from '@/lib/auth/require-role'
import { getRoleHomePath } from '@/lib/auth/role-redirect'

interface LoginResult {
  success: boolean
  error?: string
  redirectTo?: string
}

export async function loginAction(email: string, password: string): Promise<LoginResult> {
  try {
    const supabase = await createServerSupabaseClient()

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      return { success: false, error: authError.message }
    }

    const { data: { user } } = await supabase.auth.getUser()
    let redirectTo = '/dashboard'
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      redirectTo = getRoleHomePath(profile?.role ?? 'client')
    }

    return { success: true, redirectTo }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Login failed. Please try again.',
    }
  }
}

export async function resetPasswordAction(newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated. Please use the reset link again.' }
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) {
      return { success: false, error: updateError.message }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const { logActivity } = await import('./activity')
    logActivity({
      actorId: user.id,
      actorName: profile?.full_name ?? user.email ?? 'Unknown',
      action: 'Password reset',
      target: user.email ?? 'Unknown user',
      icon: 'Clock',
      tone: 'amber',
    })

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Password reset failed' }
  }
}

interface InviteUserParams {
  email: string
  full_name: string
  role: UserRole
  company_id?: string | null
  phone?: string | null
}

export async function inviteUser(params: InviteUserParams) {
  const caller = await requireRole('super_admin', 'company_manager')
  const admin = createAdminSupabaseClient()

  // 1. Invite user — sends an email with a magic link to set their password
  const { data: userData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    params.email,
    {
      data: {
        full_name: params.full_name,
        role: params.role,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://primex-security-build.vercel.app'}/callback?type=invite`,
    }
  )

  if (inviteError) throw inviteError
  if (!userData.user) throw new Error('Invite returned no user')

  const userId = userData.user.id

  // 2. Update profile with company_id and phone (trigger only sets full_name, role, status)
  const updates: Record<string, unknown> = {}
  if (params.company_id) updates.company_id = params.company_id
  if (params.phone) updates.phone = params.phone

  if (Object.keys(updates).length > 0) {
    const { error: profileError } = await admin
      .from('profiles')
      .update(updates)
      .eq('id', userId)

    if (profileError) throw profileError
  }

  const { logActivity } = await import('./activity')
  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: 'User invited', target: params.email, icon: 'UserPlus', tone: 'blue' })

  revalidatePath('/team')
  revalidatePath('/companies')
  revalidatePath('/guards')

  return { userId, email: params.email }
}
