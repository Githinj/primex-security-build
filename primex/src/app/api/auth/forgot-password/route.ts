import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email?.trim()) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if user exists
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) {
      return NextResponse.json({ success: false, error: 'Server error. Please try again.' }, { status: 500 })
    }

    const userExists = users.some(u => u.email?.toLowerCase() === email.toLowerCase().trim())
    if (!userExists) {
      return NextResponse.json({
        success: false,
        error: 'No account found with this email address.',
      }, { status: 404 })
    }

    // User exists — send reset email
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const origin = request.headers.get('origin') || 'https://primex-security-build.vercel.app'
    const { error: resetError } = await supabaseAnon.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/callback?type=recovery`,
    })

    if (resetError) {
      // Rate limiting
      if (resetError.message.includes('security purposes')) {
        return NextResponse.json({
          success: false,
          error: 'Please wait a moment before requesting another reset.',
        }, { status: 429 })
      }
      return NextResponse.json({ success: false, error: resetError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
