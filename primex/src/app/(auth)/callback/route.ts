import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const type = searchParams.get('type')
      // Recovery flow → set new password
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/reset-password', request.url))
      }
      // Invite flow → set initial password
      if (type === 'invite') {
        return NextResponse.redirect(new URL('/reset-password', request.url))
      }
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // If something goes wrong, redirect to login with error
  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url))
}
