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

interface InviteUserParams {
  email: string
  full_name: string
  role: UserRole
  company_id?: string | null
  phone?: string | null
  temp_password?: string
}

export async function inviteUser(params: InviteUserParams) {
  const caller = await requireRole('super_admin', 'company_manager')
  const admin = createAdminSupabaseClient()

  const password = params.temp_password || generateTempPassword()

  // 1. Create auth user — the handle_new_user trigger auto-creates a profile row
  const { data: userData, error: createError } = await admin.auth.admin.createUser({
    email: params.email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: params.full_name,
      role: params.role,
    },
  })

  if (createError) throw createError
  if (!userData.user) throw new Error('User creation returned no user')

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
  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: 'User account created', target: params.email, icon: 'UserPlus', tone: 'blue' })

  revalidatePath('/team')
  revalidatePath('/companies')
  revalidatePath('/guards')

  return { userId, email: params.email, tempPassword: password }
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pw = ''
  for (let i = 0; i < 12; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)]
  }
  return pw + '!1'
}
