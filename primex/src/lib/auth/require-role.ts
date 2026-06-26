import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function requireRole(...allowedRoles: string[]) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || !allowedRoles.includes(profile.role)) {
    throw new Error('Unauthorized')
  }

  return { userId: user.id, role: profile.role, companyId: profile.company_id }
}
