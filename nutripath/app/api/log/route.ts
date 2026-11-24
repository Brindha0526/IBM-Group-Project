// app/api/log/route.ts
// GET  — returns food logs for the current user, filtered by date or last N days
// POST — logs a food entry after running safety rules

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getFoodDetail, searchFoods } from '@/lib/usda'
import { runSafetyRules, matchAllergens } from '@/lib/safety'
import type { FoodInput, ProfileInput } from '@/types/safety'

// ---------------------------------------------------------------------------
// Helper — resolve authenticated user + profile from DB
// ---------------------------------------------------------------------------

async function getAuthenticatedUser() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: { profile: true },
  })
  return user
}

// ---------------------------------------------------------------------------
// GET /api/log?start=ISO&end=ISO — logs in [start, end). Preferred: the client
//                                   computes local-midnight boundaries (lib/dates.ts)
//                                   so day cutoffs follow the user's timezone.
// GET /api/log?date=YYYY-MM-DD    — fallback; day in the SERVER's timezone
// GET /api/log?days=N             — fallback; last N days, server timezone
// ---------------------------------------------------------------------------

const MAX_RANGE_MS = 92 * 24 * 60 * 60 * 1000

const RangeSchema = z
  .object({
    start: z.string().datetime({ offset: true }).transform((v) => new Date(v)),
    end: z.string().datetime({ offset: true }).transform((v) => new Date(v)),
  })
  .refine(({ start, end }) => end > start && end.getTime() - start.getTime() <= MAX_RANGE_MS)

export async function GET(request: Request) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const daysParam = searchParams.get('days')
  const dateParam = searchParams.get('date')
  const startParam = searchParams.get('start')
  const endParam = searchParams.get('end')

  let where: { userId: string; loggedAt: { gte: Date; lt?: Date } }

  if (startParam || endParam) {
    const parsed = RangeSchema.safeParse({ start: startParam, end: endParam })
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'start and end must both be ISO timestamps, end after start, at most 92 days apart' },
        { status: 400 }
      )
    }
    where = { userId: user.id, loggedAt: { gte: parsed.data.start, lt: parsed.data.end } }
  } else if (daysParam) {
    const days = parseInt(daysParam, 10)
    if (isNaN(days) || days < 1) {
      return NextResponse.json({ error: 'Invalid days param' }, { status: 400 })
    }
    const since = new Date()
    since.setDate(since.getDate() - days)
    since.setHours(0, 0, 0, 0)
    where = { userId: user.id, loggedAt: { gte: since } }
  } else {
    // Fallback: interpret YYYY-MM-DD in the server's timezone. (new Date("YYYY-MM-DD")
    // would parse as UTC midnight.) Clients should send start/end instead so the
    // cutoff follows the user's local timezone.
    let start: Date
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const [y, mo, d] = dateParam.split('-').map(Number)
      start = new Date(y, mo - 1, d, 0, 0, 0, 0)
    } else {
      start = new Date()
      start.setHours(0, 0, 0, 0)
    }
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    where = { userId: user.id, loggedAt: { gte: start, lt: end } }
  }

  const logs = await prisma.foodLog.findMany({
    where,
    orderBy: { loggedAt: 'asc' },
  })

  return NextResponse.json({ logs })
}

// ---------------------------------------------------------------------------
// POST /api/log
// Body: { fdcId: string, foodName: string, servingG: number }
// ---------------------------------------------------------------------------

const PostBodySchema = z.object({
  fdcId: z.string().min(1),
  foodName: z.string().min(1),
  servingG: z.number().positive(),
})

export async function POST(request: Request) {
  // 1. Auth check
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Zod-validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = PostBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { fdcId, foodName, servingG } = parsed.data

  // 3. Fetch USDA detail — seed data items have non-numeric fdcIds that USDA
  //    can't look up directly, so fall back to a name-based search.
  let detail = await getFoodDetail(fdcId)

  if (!detail) {
    // Seed data fallback: search by food name and use the first Foundation /
    // SR Legacy result.
    const results = await searchFoods(foodName)
    const best =
      results.find((r) => r.dataType === 'Foundation' || r.dataType === 'SR Legacy') ??
      results[0]
    if (best) {
      detail = await getFoodDetail(best.fdcId)
    }
  }

  // 4. 422 if food not found even after fallback
  if (!detail) {
    return NextResponse.json(
      { error: 'Food not found in USDA database' },
      { status: 422 }
    )
  }

  // 5. Build FoodInput for safety check
  // All USDA nutrient values are per 100g — scale by servingG / 100
  const scale = servingG / 100

  const scaledNutrients: Record<string, number> = {}
  for (const n of detail.nutrients) {
    scaledNutrients[n.nutrientName] = n.value * scale
  }

  // Extract calories: nutrientName contains "Energy" and unitName is "kcal"
  const energyNutrient = detail.nutrients.find(
    (n) => n.nutrientName.includes('Energy') && n.unitName === 'kcal'
  )
  const calories = energyNutrient !== undefined ? energyNutrient.value * scale : undefined

  const foodInput: FoodInput = {
    fdcId,
    name: foodName,
    ingredients: [], // SR Legacy / Foundation foods have no ingredient list
    calories,
    nutrients: scaledNutrients,
  }

  // 6. Build ProfileInput from stored profile
  const profile = user.profile
  const profileInput: ProfileInput = {
    allergens: profile?.allergens ?? [],
    medications: profile?.medications ?? [],
    isPregnant: profile?.isPregnant ?? false,
    hasKidneyDisease: profile?.hasKidneyDisease ?? false,
    takesInsulin: profile?.takesInsulin ?? false,
    hasEdHistory: profile?.hasEdHistory ?? false,
  }

  // 7. Run safety rules
  const result = runSafetyRules(foodInput, profileInput)

  // 7b. Allergen check on the food name. USDA SR Legacy / Foundation foods have
  //     no ingredient list, so checkAllergens above can't see them. The log
  //     records what the user already ate, so a match is a warning (shown on
  //     the log row), not a block. Blocking still applies to meal-plan suggestions.
  const nameAllergens = matchAllergens(foodName, profileInput.allergens)
  if (nameAllergens.length > 0) {
    result.warnings.push(
      `${foodName} may contain ${nameAllergens.join(', ')}, which is on your allergen list.`
    )
    if (result.level === 'ok') result.level = 'warn'
  }

  // 8. Block if safety level is 'block'
  if (result.level === 'block') {
    return NextResponse.json(
      { error: 'This food was blocked by a safety rule', warnings: result.warnings },
      { status: 422 }
    )
  }

  // 9. Save to DB
  const savedLog = await prisma.foodLog.create({
    data: {
      userId: user.id,
      fdcId,
      foodName,
      servingG,
      nutrients: scaledNutrients,
      safetyPassed: result.level === 'ok', // 'warn' counts as passed — warning surfaced to user
    },
  })

  // 10. Return success with any warnings
  return NextResponse.json({ success: true, warnings: result.warnings, log: savedLog })
}
