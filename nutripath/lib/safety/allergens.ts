import type { FoodInput, ProfileInput, SafetyResult } from '@/types/safety'

/** FDA major-9 allergens — the only valid allergen values */
export const FDA_MAJOR_9 = [
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

/**
 * Checks whether any ingredient in the food matches a profile allergen.
 * Uses case-insensitive substring matching.
 * Returns level 'block' if any match is found.
 */
export function checkAllergens(food: FoodInput, profile: ProfileInput): SafetyResult {
  if (profile.allergens.length === 0 || food.ingredients.length === 0) {
    return { level: 'ok', warnings: [] }
  }

  const warnings: string[] = []

  for (const allergen of profile.allergens) {
    const allergenLower = allergen.toLowerCase()
    const matched = food.ingredients.some((ingredient) =>
      ingredient.toLowerCase().includes(allergenLower)
    )
    if (matched) {
      warnings.push(
        `${food.name} contains ${allergen}, which is on your allergen list.`
      )
    }
  }

  if (warnings.length > 0) {
    return { level: 'block', warnings }
  }

  return { level: 'ok', warnings: [] }
}
