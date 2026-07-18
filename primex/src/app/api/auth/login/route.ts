import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getRoleHomePath } from '@/lib/auth/role-redirect'

// POST with JSON body (used by fetch)
export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  let email: string, password: string

  // Support both JSON and form-encoded bodies
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const body = await request.json()
    email = body.email
    password = body.password
  } else {
    const formData = await request.formData()
    email = formData.get('email') as string
    password = formData.get('password') as string
  }

  // Trim stray whitespace from the email (common with copy-paste / autofill) so a
  // trailing space doesn't cause a spurious "Invalid email or password". Password is
  // left as-is — leading/trailing spaces can be legitimate password characters.
  email = (email ?? '').trim()

  if (!email || !password) {
    if (contentType.includes('application/json')) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 })
    }
    return NextResponse.redirect(new URL('/login?error=Email+and+password+are+required', request.url))
  }

  try {
    const response = contentType.includes('application/json')
      ? NextResponse.json({ success: true })
      : NextResponse.redirect(new URL('/dashboard', request.url))

    // Start with a clean cookie slate — ignore stale auth cookies from previous attempts
    const freshCookies: Array<{ name: string; value: string; options?: Record<string, unknown> }> = []

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() { return [] },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            freshCookies.push({ name, value, options })
            response.cookies.set(name, value, options)
          })
        },
      },
    })

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      const friendly = authError.message === 'Invalid login credentials'
        ? 'Invalid email or password'
        : authError.message

      if (contentType.includes('application/json')) {
        return NextResponse.json({ success: false, error: friendly }, { status: 401 })
      }
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(friendly)}`, request.url))
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

    if (contentType.includes('application/json')) {
      const successResponse = NextResponse.json({ success: true, redirectTo })
      response.cookies.getAll().forEach(cookie => {
        successResponse.cookies.set(cookie.name, cookie.value)
      })
      return successResponse
    }

    // Form POST: redirect with auth cookies
    const redirectResponse = NextResponse.redirect(new URL(redirectTo, request.url))
    response.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login failed'
    if (contentType.includes('application/json')) {
      return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, request.url))
  }
}
