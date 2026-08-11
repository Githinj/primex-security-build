import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SITE_URL } from '@/lib/site-url'

/**
 * Password reset request.
 *
 * **This endpoint answers identically whether or not the address is
 * registered** (SEC-175). It previously listed every user through the
 * service-role admin client and returned a 404 reading "No account found with
 * this email address" — which let anyone POST a list of addresses and learn
 * which ones hold accounts at a security company. That is the whole attack:
 * the response is the oracle, so the response has to be constant.
 *
 * Consequences of that rule, all deliberate:
 *
 * - No existence check at all. The admin `listUsers()` call is gone, which also
 *   removes a full user-table scan from a public, unauthenticated endpoint.
 * - Supabase errors are logged, not returned. Even the rate-limit 429 is
 *   swallowed: Supabase throttles on mails actually sent, so a 429 could only
 *   ever come back for an address that *does* exist — reinstating the oracle
 *   through a side door.
 * - The only non-success response is a 400 for a malformed request, which is a
 *   property of the request rather than of the account.
 *
 * `resetPasswordForEmail` is itself silent about existence, so calling it
 * unconditionally is safe and is what makes the uniform answer honest rather
 * than a lie told over a real 404.
 */
export async function POST(request: NextRequest) {
  // Uniform answer for every caller — built once so no branch can drift.
  const accepted = NextResponse.json({ success: true })

  try {
    const { email } = await request.json()

    if (!email?.trim()) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 })
    }

    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // SITE_URL, not the request's Origin header: the caller does not get to
    // choose where a password-reset link points, and the old hardcoded fallback
    // was a Vercel domain that does not exist (SEC-152).
    const { error: resetError } = await supabaseAnon.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${SITE_URL}/callback?type=recovery`,
    })

    if (resetError) {
      console.error('[forgot-password] reset request failed:', resetError.message)
    }

    return accepted
  } catch (err) {
    console.error('[forgot-password] unexpected error:', err)
    return accepted
  }
}
