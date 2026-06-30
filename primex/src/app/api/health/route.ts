import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY

  let supabaseReachable = false
  let supabaseError = ''

  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      },
    })
    supabaseReachable = res.ok
    if (!res.ok) {
      supabaseError = `${res.status} ${res.statusText}`
    }
  } catch (err) {
    supabaseError = err instanceof Error ? err.message : 'Unknown error'
  }

  return NextResponse.json({
    status: 'ok',
    env: {
      NEXT_PUBLIC_SUPABASE_URL: url || '(not set)',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: hasAnonKey ? '(set)' : '(not set)',
      SUPABASE_SERVICE_ROLE_KEY: hasServiceKey ? '(set)' : '(not set)',
    },
    supabase: {
      reachable: supabaseReachable,
      error: supabaseError || null,
    },
  })
}
