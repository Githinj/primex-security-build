import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getRoleHomePath } from '@/lib/auth/role-redirect'

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Return diagnostic info if env vars missing
  if (!url || !anonKey) {
    return NextResponse.json({
      success: false,
      error: 'Server configuration error',
      debug: { hasUrl: !!url, hasKey: !!anonKey },
    }, { status: 500 })
  }

  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }

  const { email, password } = body
  if (!email || !password) {
    return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 })
  }

  // Wake up Supabase (free tier may be paused) with retry
  let supabaseAlive = false
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const healthRes = await fetch(`${url}/auth/v1/health`, {
        headers: { apikey: anonKey },
        signal: AbortSignal.timeout(8000),
      })
      if (healthRes.ok) {
        supabaseAlive = true
        break
      }
    } catch {
      // Retry after a short delay
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000))
    }
  }

  if (!supabaseAlive) {
    return NextResponse.json({
      success: false,
      error: 'Authentication server is waking up. Please try again in a few seconds.',
    }, { status: 503 })
  }

  try {
    const response = NextResponse.json({ success: true })

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      const friendlyError = authError.message === 'Invalid login credentials'
        ? 'Invalid email or password'
        : authError.message
      return NextResponse.json({ success: false, error: friendlyError }, { status: 401 })
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

    const successResponse = NextResponse.json({ success: true, redirectTo })
    response.cookies.getAll().forEach(cookie => {
      successResponse.cookies.set(cookie.name, cookie.value)
    })

    return successResponse
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const stack = err instanceof Error ? err.stack?.split('\n').slice(0, 3).join(' | ') : undefined
    return NextResponse.json({
      success: false,
      error: `Authentication error: ${message}`,
      debug: { supabaseAlive, errorType: err?.constructor?.name, stack },
    }, { status: 500 })
  }
}
