'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logActivity } from './activity'

type Result = { success: boolean; error?: string }

// Fields a user is allowed to change on their OWN profile. Deliberately excludes
// role, company_id and status: self-service must never enable privilege
// escalation. company_manager (who can reach Settings) has no self-UPDATE RLS
// policy, and a permissive one would risk exactly that — so these writes go
// through the service role with a fixed column set, always scoped to the
// caller's own id.
interface MyProfileInput {
  full_name: string
  phone: string
  timezone: string
}

export async function updateMyProfile(input: MyProfileInput): Promise<Result> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const full_name = input.full_name.trim()
    if (!full_name) return { success: false, error: 'Full name is required' }

    const admin = createAdminSupabaseClient()
    const { error } = await admin
      .from('profiles')
      .update({
        full_name,
        phone: input.phone.trim() || null,
        timezone: input.timezone,
      })
      .eq('id', user.id)
    if (error) return { success: false, error: error.message }

    logActivity({
      actorId: user.id,
      actorName: full_name,
      action: 'Profile updated',
      target: user.email ?? user.id,
      icon: 'UserCog',
      tone: 'gray',
    })
    revalidatePath('/settings')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to save profile' }
  }
}

/**
 * Start an email change. Supabase sends a confirmation link to the NEW address;
 * auth.users.email (and, via the 008 trigger, profiles.email) only updates once
 * the user clicks it. Returns `pending: true` when a confirmation was sent.
 */
export async function updateMyEmail(newEmail: string): Promise<Result & { pending?: boolean }> {
  try {
    const email = newEmail.trim().toLowerCase()
    if (!email) return { success: false, error: 'Email is required' }

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }
    if (email === (user.email ?? '').toLowerCase()) return { success: true }

    const { error } = await supabase.auth.updateUser({ email })
    if (error) return { success: false, error: error.message }

    return { success: true, pending: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to update email' }
  }
}

/** Change the current user's password after verifying the current one. */
export async function changeMyPassword(currentPassword: string, newPassword: string): Promise<Result> {
  try {
    if (newPassword.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters' }
    }

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return { success: false, error: 'Not authenticated' }

    // Verify the current password by re-authenticating before allowing a change.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (signInError) return { success: false, error: 'Current password is incorrect' }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { success: false, error: error.message }

    logActivity({
      actorId: user.id,
      actorName: user.email,
      action: 'Password changed',
      target: user.email,
      icon: 'Clock',
      tone: 'amber',
    })
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to change password' }
  }
}

/** Upload a new avatar to the avatars bucket and persist its URL on the profile. */
export async function uploadMyAvatar(formData: FormData): Promise<Result & { url?: string }> {
  try {
    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: 'No file provided' }
    }
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image' }
    }
    if (file.size > 2 * 1024 * 1024) {
      return { success: false, error: 'Image must be under 2MB' }
    }

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const path = `${user.id}/avatar.${ext}`

    const admin = createAdminSupabaseClient()
    const bytes = new Uint8Array(await file.arrayBuffer())
    const { error: uploadError } = await admin.storage
      .from('avatars')
      .upload(path, bytes, { contentType: file.type, upsert: true })
    if (uploadError) return { success: false, error: uploadError.message }

    // Fixed path + upsert means the public URL is stable, so browsers would
    // cache the previous image — append a version query to bust it.
    const { data: pub } = admin.storage.from('avatars').getPublicUrl(path)
    const url = `${pub.publicUrl}?v=${Date.now()}`

    const { error } = await admin.from('profiles').update({ avatar_url: url }).eq('id', user.id)
    if (error) return { success: false, error: error.message }

    revalidatePath('/settings')
    return { success: true, url }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to upload photo' }
  }
}
