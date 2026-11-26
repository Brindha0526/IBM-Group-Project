import { describe, it, expect } from 'vitest'
import { buildMealPrefill } from '@/lib/meal-prefill'
import type { VerifiedMeal, IngredientNutrients } from '@/types/meal-plan'

const zero: IngredientNutrients = {
  calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sodiumMg: 0, ironMg: 0, calciumMg: 0,
}

const meal: VerifiedMeal = {
  name: 'Lentil soup with rice',
  mealType: 'lunch',
  ingredients: [
    { name: 'red lentils', fdcId: '172420', servingG: 80, nutrients: zero, safetyLevel: 'ok', safetyWarnings: [], usdaDescription: 'Lentils, raw' },
    { name: 'rice', fdcId: '168878', servingG: 150, nutrients: zero, safetyLevel: 'warn', safetyWarnings: ['x'], usdaDescription: '' },
  ],
  unverifiedIngredients: [
    { name: 'shrimp', servingG: 50, reason: 'Safety check: contains crustacean shellfish' },
  ],
  totals: zero,
  hasWarnings: true,
}

describe('buildMealPrefill', () => {
  it('pre-fills verified ingredients with their USDA id, description and serving', () => {
    const p = buildMealPrefill(meal, 'Monday')
    expect(p.mealName).toBe('Lentil soup with rice')
    expect(p.dayLabel).toBe('Monday')
    expect(p.items).toEqual([
      { fdcId: '172420', foodName: 'Lentils, raw', ingredientName: 'red lentils', servingG: 80 },
      // falls back to the ingredient name when USDA description is empty
      { fdcId: '168878', foodName: 'rice', ingredientName: 'rice', servingG: 150 },
    ])
  })

  it('lists unverified / safety-dropped ingredients as skipped, never as items', () => {
    const p = buildMealPrefill(meal, 'Monday')
    expect(p.skipped).toEqual([{ name: 'shrimp', servingG: 50, reason: 'Safety check: contains crustacean shellfish' }])
    expect(p.items.some((i) => i.ingredientName === 'shrimp')).toBe(false)
  })
})
