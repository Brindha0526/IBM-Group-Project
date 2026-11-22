// app/api/profile/me/route.ts
// GET /api/profile/me — returns the current user's profile, or null if not set up yet.
// Also sets the nutripath_has_profile cookie so middleware knows whether to
// redirect to /onboarding on the first request after login.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = session.user.email!

  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  })

  const res = NextResponse.json({ profile: user?.profile ?? null })

  // Keep the cookie in sync with the actual DB state.
  if (user?.profile) {
    res.cookies.set('nutripath_has_profile', '1', {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    })
  } else {
    res.cookies.delete('nutripath_has_profile')
  }

  return res
}
