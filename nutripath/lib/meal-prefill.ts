// lib/meal-prefill.ts
// Hand-off from a meal-plan card to the food log ("Log this meal").
// The plan page stores the meal's items in sessionStorage and navigates to
// /log?prefill=meal; the log page reads them and lets the user confirm.
// Every item is still logged through POST /api/log, so USDA lookup and the
// safety rules run as usual.

import type { VerifiedMeal } from '@/types/meal-plan'

export const MEAL_PREFILL_KEY = 'nutripath_log_prefill'

export interface MealPrefillItem {
  fdcId: string
  /** USDA description — what fdcId actually refers to; stored as the log's foodName */
  foodName: string
  /** The ingredient name the plan used (e.g. "spinach") */
  ingredientName: string
  servingG: number
}

export interface MealPrefillSkipped {
  name: string
  servingG: number
  reason: string
}

export interface MealPrefill {
  mealName: string
  dayLabel: string
  items: MealPrefillItem[]
  /** Ingredients without USDA data, or dropped by a safety rule — not pre-filled */
  skipped: MealPrefillSkipped[]
}

export function buildMealPrefill(meal: VerifiedMeal, dayLabel: string): MealPrefill {
  return {
    mealName: meal.name,
    dayLabel,
    items: meal.ingredients.map((ing) => ({
      fdcId: ing.fdcId,
      foodName: ing.usdaDescription || ing.name,
      ingredientName: ing.name,
      servingG: ing.servingG,
    })),
    skipped: meal.unverifiedIngredients.map((ing) => ({
      name: ing.name,
      servingG: ing.servingG,
      reason: ing.reason,
    })),
  }
}

function isMealPrefill(v: unknown): v is MealPrefill {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.mealName === 'string' &&
    Array.isArray(o.items) &&
    o.items.every(
      (i: Record<string, unknown>) =>
        typeof i?.fdcId === 'string' && typeof i?.foodName === 'string' && typeof i?.servingG === 'number'
    ) &&
    Array.isArray(o.skipped)
  )
}

export function saveMealPrefill(prefill: MealPrefill): void {
  sessionStorage.setItem(MEAL_PREFILL_KEY, JSON.stringify(prefill))
}

export function loadMealPrefill(): MealPrefill | null {
  try {
    const raw = sessionStorage.getItem(MEAL_PREFILL_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isMealPrefill(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function clearMealPrefill(): void {
  try { sessionStorage.removeItem(MEAL_PREFILL_KEY) } catch { /* ignore */ }
}
