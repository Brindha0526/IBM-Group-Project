// app/api/profile/route.ts
// POST /api/profile — creates or updates the authenticated user's profile.

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const allergenValues = [
  'milk',
  'eggs',
  'fish',
  'crustacean shellfish',
  'tree nuts',
  'peanuts',
  'wheat',
  'soybeans',
  'sesame',
] as const

const careTeamFlagValues = [
  'LOW_IRON',
  'LOW_VITAMIN_D',
  'LOW_B12',
  'HIGH_CHOLESTEROL',
  'HIGH_BLOOD_SUGAR',
  'HIGH_BLOOD_PRESSURE',
] as const

const profileSchema = z.object({
  path: z.enum(['BEFORE', 'AFTER']),
  budget: z.string().optional(),
  schedule: z.string().optional(),
  cuisines: z.array(z.string()).default([]),
  religiousRules: z.array(z.string()).default([]),
  preferences: z.array(z.string()).default([]),
  allergens: z.array(z.enum(allergenValues)).default([]),
  medications: z.array(z.string()).default([]),
  medicalHistory: z.string().optional(),
  careTeamFlags: z.array(z.enum(careTeamFlagValues)).default([]),
  isPregnant: z.boolean().default(false),
  hasKidneyDisease: z.boolean().default(false),
  takesInsulin: z.boolean().default(false),
  hasEdHistory: z.boolean().default(false),
  hideCalories: z.boolean().default(false),
})

export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = profileSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const data = parsed.data
  const email = session.user.email!

  // Ensure the User row exists
  const user = await prisma.user.upsert({
    where: { email },
    create: { email },
    update: {},
  })

  await prisma.profile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      path: data.path,
      budget: data.budget,
      schedule: data.schedule,
      cuisines: data.cuisines,
      religiousRules: data.religiousRules,
      preferences: data.preferences,
      allergens: data.allergens,
      medications: data.medications,
      medicalHistory: data.medicalHistory,
      careTeamFlags: data.careTeamFlags,
      isPregnant: data.isPregnant,
      hasKidneyDisease: data.hasKidneyDisease,
      takesInsulin: data.takesInsulin,
      hasEdHistory: data.hasEdHistory,
      hideCalories: data.hideCalories,
    },
    update: {
      path: data.path,
      budget: data.budget,
      schedule: data.schedule,
      cuisines: data.cuisines,
      religiousRules: data.religiousRules,
      preferences: data.preferences,
      allergens: data.allergens,
      medications: data.medications,
      medicalHistory: data.medicalHistory,
      careTeamFlags: data.careTeamFlags,
      isPregnant: data.isPregnant,
      hasKidneyDisease: data.hasKidneyDisease,
      takesInsulin: data.takesInsulin,
      hasEdHistory: data.hasEdHistory,
      hideCalories: data.hideCalories,
    },
  })

  // Set a lightweight cookie so middleware knows this user has a profile,
  // avoiding a DB query on every request.
  const res = NextResponse.json({ success: true })
  res.cookies.set('nutripath_has_profile', '1', {
    path: '/',
    httpOnly: false, // readable by middleware (edge)
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  })
  return res
}
