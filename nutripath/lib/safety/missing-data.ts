import type { FoodInput, SafetyResult } from '@/types/safety'

/**
 * Warns when USDA nutrient or calorie data is absent for a food.
 * Per GUIDELINES rule 8: when data is missing, warn — never assume a food is safe.
 */
export function checkMissingData(food: FoodInput): SafetyResult {
  const warnings: string[] = []

  const nutrientsAbsent =
    food.nutrients === undefined || Object.keys(food.nutrients).length === 0

  if (nutrientsAbsent) {
    warnings.push(
      `Nutrition data for ${food.name} could not be verified. We can't confirm it meets your goals.`
    )
  }

  if (food.calories === undefined) {
    warnings.push(
      `Calorie information for ${food.name} is not available from USDA.`
    )
  }

  if (warnings.length > 0) {
    return { level: 'warn', warnings }
  }

  return { level: 'ok', warnings: [] }
}
