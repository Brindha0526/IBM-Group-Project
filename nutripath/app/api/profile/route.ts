// app/api/profile/route.ts
// POST /api/profile — creates or updates the authenticated user's profile.

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { withCustomAllergens } from '@/lib/safety/allergens'

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
  // FDA major-9 values plus any custom allergies the user typed (e.g. "mustard").
  allergens: z
    .array(z.string().trim().min(1).max(60))
    .max(30)
    .default([])
    .transform((list) => withCustomAllergens(list, list)),
  medications: z.array(z.string()).default([]),
  medicalHistory: z.string().optional(),
  careTeamFlags: z.array(z.enum(careTeamFlagValues)).default([]),
  isPregnant: z.boolean().default(false),
  hasKidneyDisease: z.boolean().default(false),
  takesInsulin: z.boolean().default(false),
  hasEdHistory: z.boolean().default(false),
  hideCalories: z.boolean().default(false),
  // Location
  zipCode: z.string().optional(),
  country: z.string().optional(),
  // Body metrics — coerce strings to numbers so form values ("156", "") work correctly
  heightCm: z.union([z.coerce.number().positive(), z.literal(''), z.null()]).optional().transform((v) => (v === '' || v === null ? undefined : Number(v))),
  weightKg: z.union([z.coerce.number().positive(), z.literal(''), z.null()]).optional().transform((v) => (v === '' || v === null ? undefined : Number(v))),
  age: z.union([z.coerce.number().int().min(1).max(120), z.literal(''), z.null()]).optional().transform((v) => (v === '' || v === null ? undefined : Number(v))),
  sex: z.union([z.enum(['MALE', 'FEMALE', 'OTHER']), z.literal(''), z.null()]).optional().transform((v) => (v === '' || v === null ? undefined : v as 'MALE' | 'FEMALE' | 'OTHER')),
  activityLevel: z.union([z.enum(['SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE', 'EXTRA_ACTIVE']), z.literal(''), z.null()]).optional().transform((v) => (v === '' || v === null ? undefined : v as 'SEDENTARY' | 'LIGHTLY_ACTIVE' | 'MODERATELY_ACTIVE' | 'VERY_ACTIVE' | 'EXTRA_ACTIVE')),
  weightGoal: z.union([z.enum(['LOSE', 'MAINTAIN', 'GAIN']), z.literal(''), z.null()]).optional().transform((v) => (v === '' || v === null ? undefined : v as 'LOSE' | 'MAINTAIN' | 'GAIN')),
  goalIntensity: z.union([z.enum(['MODERATE', 'AGGRESSIVE', 'LEAN', 'STANDARD']), z.literal(''), z.null()]).optional().transform((v) => (v === '' || v === null ? undefined : v as 'MODERATE' | 'AGGRESSIVE' | 'LEAN' | 'STANDARD')),
  caloricGoalKcal: z.union([z.coerce.number().int().positive(), z.literal(''), z.null()]).optional().transform((v) => (v === '' || v === null ? undefined : Number(v))),
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

  const sharedFields = {
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
    zipCode: data.zipCode,
    country: data.country,
    heightCm: data.heightCm,
    weightKg: data.weightKg,
    age: data.age,
    sex: data.sex,
    activityLevel: data.activityLevel,
    weightGoal: data.weightGoal,
    goalIntensity: data.goalIntensity,
    caloricGoalKcal: data.caloricGoalKcal,
  }

  await prisma.profile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...sharedFields },
    update: sharedFields,
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
