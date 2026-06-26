'use server'

import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

interface RegisterCompanyParams {
  fullName: string
  email: string
  companyName: string
  companyType: string
  sites: string
  message: string
}

export async function registerCompany(params: RegisterCompanyParams) {
  const admin = createAdminSupabaseClient()

  // 1. Create the company with status "Pending"
  const { data: company, error: companyError } = await admin
    .from('companies')
    .insert({
      name: params.companyName,
      type: params.companyType || 'Other',
      status: 'Pending',
    })
    .select('id')
    .single()

  if (companyError) throw companyError

  // 2. Generate a temp password
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let tempPassword = ''
  for (let i = 0; i < 12; i++) {
    tempPassword += chars[Math.floor(Math.random() * chars.length)]
  }
  tempPassword += '!1'

  // 3. Create auth user with company_manager role
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email: params.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: params.fullName,
      role: 'company_manager',
    },
  })

  if (userError) throw userError

  // 4. Link profile to company
  if (userData.user) {
    await admin
      .from('profiles')
      .update({ company_id: company.id })
      .eq('id', userData.user.id)
  }

  revalidatePath('/companies')

  return { tempPassword, email: params.email }
}
