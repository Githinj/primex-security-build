import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { timingSafeEqual } from 'crypto'
import { getRoleHomePath } from '@/lib/auth/role-redirect'

// POST-only login helper for mobile debugging — tests the full auth flow.
// Disabled unless TEST_LOGIN_SECRET is set, and even then requires that
// secret on every call, so it can't be reached by guessing credentials alone.
// Usage: POST /api/auth/test-login  { "email": "x", "password": "y" }
//   header: x-test-login-secret: <TEST_LOGIN_SECRET>
function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export async function GET() {
  return NextResponse.json({ success: false, error: 'Use POST' }, { status: 405 })
}

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.TEST_LOGIN_SECRET
  if (!configuredSecret) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }

  const suppliedSecret = request.headers.get('x-test-login-secret') ?? ''
  if (!timingSafeStringEqual(suppliedSecret, configuredSecret)) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const email = body?.email
  const password = body?.password

  if (!email || !password) {
    return NextResponse.json({ success: false, error: 'Pass { email, password } in the JSON body' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  try {
    const response = NextResponse.json({ success: true })
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      return NextResponse.json({ success: false, error: authError.message })
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

    const successResponse = NextResponse.json({ success: true, redirectTo, userId: user?.id })
    response.cookies.getAll().forEach(cookie => {
      successResponse.cookies.set(cookie.name, cookie.value)
    })
    return successResponse
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown',
      type: err?.constructor?.name,
    })
  }
}
