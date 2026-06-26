import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS, used for admin operations like creating users.
// NEVER expose this client to the browser.
export function createAdminSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
