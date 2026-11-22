import type { FoodInput, ProfileInput, SafetyResult, SafetyLevel } from '@/types/safety'
import { checkAllergens } from './allergens'
import { checkMedications } from './medications'
import { checkMissingData } from './missing-data'

export { checkAllergens } from './allergens'
export { checkMedications } from './medications'
export { checkCalorieFloor, CALORIE_FLOOR } from './calorie-floor'
export { checkSensitiveConditions } from './sensitive-conditions'
export { checkMissingData } from './missing-data'

/** Level priority: 'block' > 'warn' > 'ok' */
function mergeLevel(a: SafetyLevel, b: SafetyLevel): SafetyLevel {
  if (a === 'block' || b === 'block') return 'block'
  if (a === 'warn' || b === 'warn') return 'warn'
  return 'ok'
}

/**
 * Runs all food-level safety rules and merges the results.
 * Collects all warnings from every rule.
 * Level priority: 'block' > 'warn' > 'ok'.
 *
 * Note: checkCalorieFloor and checkSensitiveConditions are called separately
 * because they operate on day-level and profile-level data, not food-level.
 */
export function runSafetyRules(food: FoodInput, profile: ProfileInput): SafetyResult {
  const results = [
    checkAllergens(food, profile),
    checkMedications(food, profile),
    checkMissingData(food),
  ]

  const level = results.reduce<SafetyLevel>(
    (acc, r) => mergeLevel(acc, r.level),
    'ok'
  )

  const warnings = results.flatMap((r) => r.warnings)

  return { level, warnings }
}
