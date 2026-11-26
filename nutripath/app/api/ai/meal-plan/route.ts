// app/api/ai/meal-plan/route.ts
// POST /api/ai/meal-plan
//
// Pipeline (from PLAN.md §6):
//   1. Auth + load profile + goals from DB
//   2. Call generateMealPlan() → RawMealPlan (names + ingredients only)
//   3. For each ingredient: USDA lookup → runSafetyRules()
//      - 'block' → drop ingredient; track count
//      - If >50% of a meal's ingredients are blocked → retry the whole plan (max 2 retries)
//   4. Assemble VerifiedMealPlan → return to client
//
// OPENAI_API_KEY stays server-side — never NEXT_PUBLIC_.

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { generateMealPlan } from '@/lib/ai'
import { searchFoods, getFoodDetail } from '@/lib/usda'
import { runSafetyRules, checkSensitiveConditions } from '@/lib/safety'
import type { PlanProfile, PlanGoal } from '@/lib/ai'
import type { ProfileInput, FoodInput } from '@/types/safety'
import type {
  RawMeal,
  RawIngredient,
  VerifiedMealPlan,
  VerifiedDayPlan,
  VerifiedMeal,
  VerifiedIngredient,
  UnverifiedIngredient,
  IngredientNutrients,
} from '@/types/meal-plan'

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

const RequestSchema = z.object({
  days: z.union([z.literal(1), z.literal(7)]).default(1),
})

// ---------------------------------------------------------------------------
// USDA nutrient extraction helpers
// ---------------------------------------------------------------------------

/** USDA nutrient IDs for the nutrients we care about */
const NUTRIENT_IDS = {
  energy:   [1008, 2047, 2048], // Energy (kcal)
  protein:  [1003],             // Protein
  carbs:    [1005],             // Carbohydrate, by difference
  fat:      [1004],             // Total lipid (fat)
  fiber:    [1079],             // Fiber, total dietary
  sodium:   [1093],             // Sodium, Na
  iron:     [1089],             // Iron, Fe
  calcium:  [1087],             // Calcium, Ca
}

function extractNutrient(
  nutrients: Array<{ nutrientId: number; value: number }>,
  ids: number[]
): number {
  for (const id of ids) {
    const n = nutrients.find((n) => n.nutrientId === id)
    if (n !== undefined) return n.value
  }
  return 0
}

/** Scale a per-100g nutrient value to the actual serving size. */
function scaleNutrients(
  raw: { nutrientId: number; value: number }[],
  servingG: number
): IngredientNutrients {
  const scale = servingG / 100
  return {
    calories:  Math.round(extractNutrient(raw, NUTRIENT_IDS.energy)  * scale * 10) / 10,
    proteinG:  Math.round(extractNutrient(raw, NUTRIENT_IDS.protein) * scale * 10) / 10,
    carbsG:    Math.round(extractNutrient(raw, NUTRIENT_IDS.carbs)   * scale * 10) / 10,
    fatG:      Math.round(extractNutrient(raw, NUTRIENT_IDS.fat)     * scale * 10) / 10,
    fiberG:    Math.round(extractNutrient(raw, NUTRIENT_IDS.fiber)   * scale * 10) / 10,
    sodiumMg:  Math.round(extractNutrient(raw, NUTRIENT_IDS.sodium)  * scale * 10) / 10,
    ironMg:    Math.round(extractNutrient(raw, NUTRIENT_IDS.iron)    * scale * 10) / 10,
    calciumMg: Math.round(extractNutrient(raw, NUTRIENT_IDS.calcium) * scale * 10) / 10,
  }
}

function sumNutrients(list: IngredientNutrients[]): IngredientNutrients {
  return list.reduce(
    (acc, n) => ({
      calories:  Math.round((acc.calories  + n.calories)  * 10) / 10,
      proteinG:  Math.round((acc.proteinG  + n.proteinG)  * 10) / 10,
      carbsG:    Math.round((acc.carbsG    + n.carbsG)    * 10) / 10,
      fatG:      Math.round((acc.fatG      + n.fatG)      * 10) / 10,
      fiberG:    Math.round((acc.fiberG    + n.fiberG)    * 10) / 10,
      sodiumMg:  Math.round((acc.sodiumMg  + n.sodiumMg)  * 10) / 10,
      ironMg:    Math.round((acc.ironMg    + n.ironMg)    * 10) / 10,
      calciumMg: Math.round((acc.calciumMg + n.calciumMg) * 10) / 10,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sodiumMg: 0, ironMg: 0, calciumMg: 0 }
  )
}

// ---------------------------------------------------------------------------
// Ingredient verification — USDA lookup + safety check
// ---------------------------------------------------------------------------

async function verifyIngredient(
  ing: RawIngredient,
  profileInput: ProfileInput
): Promise<{ verified: VerifiedIngredient | null; unverified: UnverifiedIngredient | null }> {
  // 1. USDA search
  const results = await searchFoods(ing.name)
  if (results.length === 0) {
    return {
      verified: null,
      unverified: { name: ing.name, servingG: ing.servingG, reason: 'USDA data not found' },
    }
  }

  // Pick the first Foundation or SR Legacy result for reliability
  const best =
    results.find((r) => r.dataType === 'Foundation' || r.dataType === 'SR Legacy') ??
    results[0]

  // 2. Full nutrient detail
  const detail = await getFoodDetail(best.fdcId)
  if (!detail) {
    return {
      verified: null,
      unverified: { name: ing.name, servingG: ing.servingG, reason: 'USDA detail fetch failed' },
    }
  }

  // 3. Build FoodInput for safety rules
  const foodInput: FoodInput = {
    fdcId: detail.fdcId,
    name: detail.description,
    // Parse ingredient text from USDA if available
    // Always include the ingredient name and the USDA description so allergens
    // are caught even when USDA has no ingredient list (SR Legacy / Foundation).
    ingredients: [
      ing.name.toLowerCase(),
      detail.description.toLowerCase(),
      ...(detail.ingredients
        ? detail.ingredients
            .toLowerCase()
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : []),
    ],
    calories: extractNutrient(
      detail.nutrients.map((n) => ({ nutrientId: n.nutrientId, value: n.value })),
      NUTRIENT_IDS.energy
    ),
    nutrients: Object.fromEntries(
      detail.nutrients.map((n) => [n.nutrientName.toLowerCase(), n.value])
    ),
  }

  // 4. Run safety rules. These run for every user: general-only mode limits
  //    how tailored the advice is, never the allergen/medication protections
  //    (GUIDELINES rule 3: allergens are blocked from ALL plans).
  const safetyResult = runSafetyRules(foodInput, profileInput)

  if (safetyResult.level === 'block') {
    // Blocked ingredients are dropped
    return {
      verified: null,
      unverified: {
        name: ing.name,
        servingG: ing.servingG,
        reason: `Safety check: ${safetyResult.warnings.join('; ')}`,
      },
    }
  }

  const nutrients = scaleNutrients(
    detail.nutrients.map((n) => ({ nutrientId: n.nutrientId, value: n.value })),
    ing.servingG
  )

  return {
    verified: {
      name: ing.name,
      fdcId: detail.fdcId,
      servingG: ing.servingG,
      nutrients,
      safetyLevel: safetyResult.level,
      safetyWarnings: safetyResult.warnings,
      usdaDescription: detail.description,
    },
    unverified: null,
  }
}

// ---------------------------------------------------------------------------
// Meal verification
// ---------------------------------------------------------------------------

async function verifyMeal(
  meal: RawMeal,
  profileInput: ProfileInput
): Promise<VerifiedMeal> {
  // Verify all ingredients in parallel
  const results = await Promise.all(
    meal.ingredients.map((ing) => verifyIngredient(ing, profileInput))
  )

  const verified: VerifiedIngredient[] = results
    .map((r) => r.verified)
    .filter((v): v is VerifiedIngredient => v !== null)

  const unverified: UnverifiedIngredient[] = results
    .map((r) => r.unverified)
    .filter((u): u is UnverifiedIngredient => u !== null)

  const totals = sumNutrients(verified.map((v) => v.nutrients))
  const hasWarnings =
    unverified.length > 0 ||
    verified.some((v) => v.safetyLevel === 'warn')

  return {
    name: meal.name,
    mealType: meal.mealType,
    ingredients: verified,
    unverifiedIngredients: unverified,
    totals,
    hasWarnings,
  }
}

// ---------------------------------------------------------------------------
// Fraction of ingredients that were blocked in a plan (used for retry logic)
// ---------------------------------------------------------------------------

function blockedFraction(days: VerifiedDayPlan[]): number {
  let total = 0
  let blocked = 0
  for (const day of days) {
    for (const meal of day.meals) {
      total += meal.ingredients.length + meal.unverifiedIngredients.length
      blocked += meal.unverifiedIngredients.length
    }
  }
  return total === 0 ? 0 : blocked / total
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // 1. Auth
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse + validate request body
  let bodyRaw: unknown
  try {
    bodyRaw = await request.json()
  } catch {
    bodyRaw = {}
  }

  const parsed = RequestSchema.safeParse(bodyRaw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 422 }
    )
  }
  const { days } = parsed.data

  // 3. Load profile + goals
  const userRecord = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: { profile: true, goals: true },
  })

  if (!userRecord?.profile) {
    return NextResponse.json(
      { error: 'Profile not found. Please complete your profile first.' },
      { status: 400 }
    )
  }

  const dbProfile = userRecord.profile
  const dbGoals = userRecord.goals

  // 4. Build PlanProfile — no PII, no medications
  const planProfile: PlanProfile = {
    cuisines:       dbProfile.cuisines,
    religiousRules: dbProfile.religiousRules,
    preferences:    dbProfile.preferences,
    allergens:      dbProfile.allergens,
    careTeamFlags:  dbProfile.careTeamFlags,
    budget:         dbProfile.budget,
    schedule:       dbProfile.schedule,
    isPregnant:     dbProfile.isPregnant,
    hasKidneyDisease: dbProfile.hasKidneyDisease,
    takesInsulin:   dbProfile.takesInsulin,
    hasEdHistory:   dbProfile.hasEdHistory,
  }

  const planGoals: PlanGoal[] = dbGoals.map((g) => ({
    nutrient:  g.nutrient,
    targetMin: g.targetMin,
    targetMax: g.targetMax,
    unit:      g.unit,
    label:     g.label,
  }))

  // 5. Build ProfileInput for runSafetyRules (includes medications)
  const profileInput: ProfileInput = {
    allergens:       dbProfile.allergens,
    medications:     dbProfile.medications,
    isPregnant:      dbProfile.isPregnant,
    hasKidneyDisease: dbProfile.hasKidneyDisease,
    takesInsulin:    dbProfile.takesInsulin,
    hasEdHistory:    dbProfile.hasEdHistory,
  }

  // Sensitive condition check → general-only mode (surfaced as a warning on the plan)
  const sensitiveCheck = checkSensitiveConditions(profileInput)

  // 6. AI → USDA → Safety pipeline with up to 2 retries
  const MAX_RETRIES = 2
  let verifiedDays: VerifiedDayPlan[] = []
  let lastError: string | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let rawPlan
    try {
      rawPlan = await generateMealPlan(planProfile, planGoals, days)
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'AI generation failed'
      continue
    }

    // Verify all days → meals → ingredients
    const dayResults: VerifiedDayPlan[] = await Promise.all(
      rawPlan.days.map(async (rawDay) => {
        const meals = await Promise.all(
          rawDay.meals.map((meal) => verifyMeal(meal, profileInput))
        )
        const dayTotals = sumNutrients(meals.map((m) => m.totals))
        return { dayLabel: rawDay.dayLabel, meals, dayTotals }
      })
    )

    verifiedDays = dayResults

    // Retry if more than 50% of ingredients were blocked
    if (blockedFraction(dayResults) > 0.5 && attempt < MAX_RETRIES) {
      continue
    }

    break
  }

  if (verifiedDays.length === 0) {
    return NextResponse.json(
      { error: lastError ?? 'Failed to generate a meal plan. Please try again.' },
      { status: 502 }
    )
  }

  // 7. Assemble final plan
  const disclaimers: string[] = [
    'Not medical advice. Always consult your healthcare team before making dietary changes.',
    'Nutrient totals are sourced from USDA FoodData Central and are approximate.',
  ]
  if (dbProfile.medications.length > 0) {
    disclaimers.push(
      'Some of your medications may interact with certain foods. Always check with your pharmacist before making dietary changes.'
    )
  }

  const result: VerifiedMealPlan = {
    days: verifiedDays,
    sensitiveConditionWarning: sensitiveCheck.level !== 'ok'
      ? sensitiveCheck.warnings[0]
      : undefined,
    disclaimers,
  }

  return NextResponse.json({ plan: result })
}
