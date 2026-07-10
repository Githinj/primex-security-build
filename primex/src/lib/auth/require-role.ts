import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function requireRole(...allowedRoles: string[]) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || !allowedRoles.includes(profile.role)) {
    throw new Error('Unauthorized')
  }

  return { userId: user.id, email: user.email ?? null, role: profile.role, companyId: profile.company_id, fullName: profile.full_name }
}

export async function requireActiveCompany(caller: { role: string; companyId: string | null }) {
  if (caller.role === 'company_manager' && caller.companyId) {
    const supabase = await createServerSupabaseClient()
    const { data: company } = await supabase
      .from('companies')
      .select('status')
      .eq('id', caller.companyId)
      .single()
    if (company?.status !== 'Active') {
      throw new Error('Your company must be approved before you can perform this action')
    }
  }
}
