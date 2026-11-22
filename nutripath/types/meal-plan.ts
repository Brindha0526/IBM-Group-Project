// types/meal-plan.ts
// Types for the AI meal plan generator (ST-7).
// The AI returns meal names + ingredient lists only — never nutrition numbers.
// All nutrition data is sourced from USDA after AI generation.

import type { SafetyLevel } from './safety'

// ---------------------------------------------------------------------------
// Raw AI output — before USDA verification
// ---------------------------------------------------------------------------

/** A single ingredient as returned by the AI (name only, no nutrition). */
export interface RawIngredient {
  name: string           // e.g. "spinach"
  servingG: number       // suggested serving in grams
}

/** A single meal as returned by the AI. */
export interface RawMeal {
  name: string           // e.g. "Lentil soup with roti"
  mealType: MealType     // 'breakfast' | 'lunch' | 'dinner' | 'snack'
  ingredients: RawIngredient[]
}

/** Full raw meal plan output from GPT-4o-mini. */
export interface RawMealPlan {
  days: RawDayPlan[]
}

export interface RawDayPlan {
  dayLabel: string       // e.g. "Day 1" or "Monday"
  meals: RawMeal[]
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

// ---------------------------------------------------------------------------
// Verified output — after USDA + safety pipeline
// ---------------------------------------------------------------------------

/** Nutrient snapshot for one ingredient (from USDA, scaled to servingG). */
export interface IngredientNutrients {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG: number
  sodiumMg: number
  ironMg: number
  calciumMg: number
}

/** A verified ingredient — has USDA-sourced nutrition and passed safety rules. */
export interface VerifiedIngredient {
  name: string
  fdcId: string
  servingG: number
  nutrients: IngredientNutrients
  safetyLevel: SafetyLevel
  safetyWarnings: string[]
  usdaDescription: string
}

/** An ingredient that could not be verified (USDA lookup failed). */
export interface UnverifiedIngredient {
  name: string
  servingG: number
  reason: string         // e.g. "USDA data not found"
}

/** A verified meal with USDA-sourced per-meal nutrient totals. */
export interface VerifiedMeal {
  name: string
  mealType: MealType
  ingredients: VerifiedIngredient[]
  unverifiedIngredients: UnverifiedIngredient[]
  totals: IngredientNutrients
  hasWarnings: boolean
}

export interface VerifiedDayPlan {
  dayLabel: string
  meals: VerifiedMeal[]
  dayTotals: IngredientNutrients
}

/** Final verified meal plan returned to the client. */
export interface VerifiedMealPlan {
  days: VerifiedDayPlan[]
  sensitiveConditionWarning?: string
  disclaimers: string[]
}
