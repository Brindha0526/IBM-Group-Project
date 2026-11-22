// app/api/profile/me/route.ts
// GET /api/profile/me — returns the current user's profile, or null if not set up yet.

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

  return NextResponse.json({ profile: user?.profile ?? null })
}
