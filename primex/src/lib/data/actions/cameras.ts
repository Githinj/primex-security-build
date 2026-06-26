'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'

export async function createCamera(data: { site_id: string; name: string; location: string; status?: string }) {
  const caller = await requireRole('super_admin', 'company_manager')
  const supabase = await createServerSupabaseClient()
  if (caller.role === 'company_manager' && caller.companyId) {
    const { data: company } = await supabase
      .from('companies')
      .select('status')
      .eq('id', caller.companyId)
      .single()
    if (company?.status !== 'Active') {
      throw new Error('Your company must be approved before you can perform this action')
    }
  }
  const { error } = await supabase.from('cameras').insert(data)
  if (error) throw error
  revalidatePath('/cameras')
}

export async function deleteCamera(id: string) {
  await requireRole('super_admin', 'company_manager')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('cameras').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/cameras')
}
