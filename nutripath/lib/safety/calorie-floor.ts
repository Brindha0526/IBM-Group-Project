import type { DayInput, SafetyResult } from '@/types/safety'

// NIH/USDA minimum for adults — do not change without an official source
export const CALORIE_FLOOR = 1200

const LOW_INTAKE_MSG =
  "Today's intake looks low. Eating enough each day supports your energy and wellbeing."

const CONSECUTIVE_LOW_MSG =
  "It looks like your intake has been low for a few days. If you're struggling, please reach out to your care team or a support line."

/**
 * Checks whether today's logged calories fall below the CALORIE_FLOOR.
 * If the user has had several consecutive low-intake days, includes a
 * supportive message directing them to their care team.
 *
 * Per GUIDELINES rule 7: no praise or rewards for eating less.
 */
export function checkCalorieFloor(day: DayInput): SafetyResult {
  if (day.totalCalories >= CALORIE_FLOOR) {
    return { level: 'ok', warnings: [] }
  }

  const warnings: string[] = [LOW_INTAKE_MSG]

  if (day.consecutiveLowDays >= 3) {
    warnings.push(CONSECUTIVE_LOW_MSG)
  }

  return { level: 'warn', warnings }
}
