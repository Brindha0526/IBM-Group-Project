// lib/ai.ts
// Wraps Anthropic Claude for meal plan generation (server-side only).
// ANTHROPIC_API_KEY must never be prefixed with NEXT_PUBLIC_.
//
// Key invariants (from PLAN.md §6 and GUIDELINES):
// - The AI returns meal names + ingredient lists ONLY — never nutrition numbers.
// - The AI never sees medications or sensitive flags directly.
// - Only cuisine/preference tags, allergen exclusions, and care-team flag labels
//   are included in the prompt — no PII.

import Anthropic from '@anthropic-ai/sdk'
import type { RawMealPlan, RawDayPlan, RawMeal, RawIngredient, MealType } from '@/types/meal-plan'

// ---------------------------------------------------------------------------
// Types for the inputs — mirrors the Prisma profile/goal shapes
// ---------------------------------------------------------------------------

export interface PlanProfile {
  cuisines: string[]
  religiousRules: string[]
  preferences: string[]
  allergens: string[]
  careTeamFlags: string[]
  budget?: string | null
  schedule?: string | null
  isPregnant: boolean
  hasKidneyDisease: boolean
  takesInsulin: boolean
  hasEdHistory: boolean
}

export interface PlanGoal {
  nutrient: string
  targetMin?: number | null
  targetMax?: number | null
  unit: string
  label?: string | null
}

// ---------------------------------------------------------------------------
// Anthropic client — lazy, singleton, server-side only
// ---------------------------------------------------------------------------

let _client: Anthropic | null = null

function getClient(): Anthropic {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set.')
    }
    _client = new Anthropic({ apiKey: key })
  }
  return _client
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildSystemPrompt(): string {
  return `You are a meal planning assistant. Your job is to suggest meal names and ingredient lists.

RULES (must follow exactly):
1. Return ONLY a valid JSON object — no markdown, no prose, no explanation.
2. Never include nutrition numbers (calories, grams of protein, carbs, fat, etc.) — the client will look those up from USDA.
3. Never include medication names or supplement dosages in any output.
4. Output only ingredient names and suggested serving sizes in grams.
5. Each ingredient name should be a simple, common food name that can be looked up in USDA FoodData Central (e.g. "brown rice", "chicken breast", "lentils").
6. Use realistic single-serving portion sizes targeting roughly 1800–2000 kcal total per day across all meals. Typical examples: cooked grains 150–180g, meat/fish 100–130g, vegetables 80–100g, legumes cooked 120–150g, dairy 100–150g, fruit 100–120g, nuts/seeds 20–30g, bread 50–60g.

JSON schema to follow exactly:
{
  "days": [
    {
      "dayLabel": "Day 1",
      "meals": [
        {
          "name": "<meal name>",
          "mealType": "breakfast" | "lunch" | "dinner" | "snack",
          "ingredients": [
            { "name": "<ingredient name>", "servingG": <number> }
          ]
        }
      ]
    }
  ]
}`
}

function buildUserPrompt(
  profile: PlanProfile,
  goals: PlanGoal[],
  days: number
): string {
  const lines: string[] = []

  lines.push(`Generate a ${days}-day meal plan.`)

  if (profile.cuisines.length > 0) {
    lines.push(`Preferred cuisines: ${profile.cuisines.join(', ')}.`)
  }

  if (profile.religiousRules.length > 0) {
    lines.push(`Dietary rules: ${profile.religiousRules.join(', ')}.`)
  }

  if (profile.preferences.length > 0) {
    lines.push(`Preferences: ${profile.preferences.join(', ')}.`)
  }

  if (profile.allergens.length > 0) {
    lines.push(
      `MUST EXCLUDE these allergens entirely — do not include any ingredient that contains: ${profile.allergens.join(', ')}.`
    )
  }

  if (profile.budget === 'low') {
    lines.push('Use affordable, budget-friendly ingredients.')
  }

  if (profile.schedule === 'busy_weekdays') {
    lines.push('Keep weekday meals quick to prepare (under 30 minutes).')
  }

  // Care-team flags → phrased as general nutrient guidance, never as diagnoses
  const ctfGoals = profile.careTeamFlags
    .map((flag) => {
      switch (flag) {
        case 'LOW_IRON':       return 'iron-rich foods'
        case 'LOW_VITAMIN_D':  return 'vitamin D-rich foods'
        case 'LOW_B12':        return 'vitamin B12-rich foods'
        case 'HIGH_CHOLESTEROL': return 'low-saturated-fat foods'
        case 'HIGH_BLOOD_SUGAR': return 'low-glycemic-index foods'
        case 'HIGH_BLOOD_PRESSURE': return 'low-sodium foods'
        default: return null
      }
    })
    .filter(Boolean)

  if (ctfGoals.length > 0) {
    lines.push(`Please prioritise: ${ctfGoals.join(', ')}.`)
  }

  // User-defined goals → nutrient labels only (no numbers)
  const goalLabels = goals
    .map((g) => g.label ?? g.nutrient)
    .filter(Boolean)
    .slice(0, 5) // limit to avoid overly long prompt

  if (goalLabels.length > 0) {
    lines.push(`The person is working on these nutrient goals: ${goalLabels.join(', ')}.`)
  }

  // Sensitive conditions → general-only guidance, never naming the condition
  if (
    profile.isPregnant ||
    profile.hasKidneyDisease ||
    profile.takesInsulin ||
    profile.hasEdHistory
  ) {
    lines.push(
      'Please suggest only gentle, commonly recommended foods suitable for a broad range of health situations. Keep variety moderate and portions reasonable.'
    )
  }

  lines.push(
    'Each day should include breakfast, lunch, dinner, and one snack. Use 3–5 ingredients per meal. Ingredient names must be simple common names suitable for USDA FoodData Central lookup. Keep portions to typical single-serving sizes (see rules) so the total day stays around 1800–2000 kcal.'
  )

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Response parser — strict; throws on unexpected shape
// ---------------------------------------------------------------------------

function stripMarkdownFences(raw: string): string {
  // Claude sometimes wraps JSON in ```json ... ``` or ``` ... ```
  return raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
}

function parseMealPlanResponse(raw: string): RawMealPlan {
  let parsed: unknown
  try {
    parsed = JSON.parse(stripMarkdownFences(raw))
  } catch {
    throw new Error('AI response was not valid JSON.')
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Array.isArray((parsed as Record<string, unknown>).days)
  ) {
    throw new Error('AI response missing "days" array.')
  }

  const days = (parsed as { days: unknown[] }).days

  const result: RawDayPlan[] = days.map((day, di) => {
    if (typeof day !== 'object' || day === null) {
      throw new Error(`Day ${di} is not an object.`)
    }
    const d = day as Record<string, unknown>
    const dayLabel = typeof d.dayLabel === 'string' ? d.dayLabel : `Day ${di + 1}`

    if (!Array.isArray(d.meals)) {
      throw new Error(`Day ${di} missing "meals" array.`)
    }

    const meals: RawMeal[] = (d.meals as unknown[]).map((meal, mi) => {
      if (typeof meal !== 'object' || meal === null) {
        throw new Error(`Day ${di} meal ${mi} is not an object.`)
      }
      const m = meal as Record<string, unknown>
      const name = typeof m.name === 'string' ? m.name : `Meal ${mi + 1}`
      const mealType = validateMealType(m.mealType)

      if (!Array.isArray(m.ingredients)) {
        throw new Error(`Day ${di} meal "${name}" missing ingredients.`)
      }

      const ingredients: RawIngredient[] = (m.ingredients as unknown[]).map((ing, ii) => {
        if (typeof ing !== 'object' || ing === null) {
          throw new Error(`Ingredient ${ii} in "${name}" is not an object.`)
        }
        const i = ing as Record<string, unknown>
        const ingName = typeof i.name === 'string' ? i.name.trim() : ''
        const servingG =
          typeof i.servingG === 'number' && i.servingG > 0 ? i.servingG : 100

        if (!ingName) {
          throw new Error(`Ingredient ${ii} in "${name}" has empty name.`)
        }

        return { name: ingName, servingG }
      })

      return { name, mealType, ingredients }
    })

    return { dayLabel, meals }
  })

  return { days: result }
}

function validateMealType(val: unknown): MealType {
  const valid: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
  if (typeof val === 'string' && valid.includes(val as MealType)) {
    return val as MealType
  }
  return 'lunch' // safe default
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calls Claude to generate a raw meal plan (names + ingredients only).
 * Does NOT perform USDA lookup or safety checks — that is the route's job.
 *
 * @param profile  User profile (cuisine prefs, allergens, care-team flags).
 * @param goals    User goals (nutrient labels for guidance only).
 * @param days     1 or 7 (defaults to 1).
 */
export async function generateMealPlan(
  profile: PlanProfile,
  goals: PlanGoal[],
  days: 1 | 7 = 1
): Promise<RawMealPlan> {
  const client = getClient()

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: days === 7 ? 4000 : 1200,
    system: buildSystemPrompt(),
    messages: [
      { role: 'user', content: buildUserPrompt(profile, goals, days) },
    ],
  })

  const block = response.content[0]
  const content = block?.type === 'text' ? block.text : ''
  if (!content.trim()) {
    throw new Error('Claude returned an empty response.')
  }

  return parseMealPlanResponse(content.trim())
}
