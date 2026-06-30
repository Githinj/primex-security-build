import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getRoleHomePath } from '@/lib/auth/role-redirect'

// GET version of login for mobile debugging — tests the full auth flow
// Usage: /api/auth/test-login?email=x&password=y
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')
  const password = request.nextUrl.searchParams.get('password')

  if (!email || !password) {
    return NextResponse.json({ success: false, error: 'Pass ?email=x&password=y' })
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
