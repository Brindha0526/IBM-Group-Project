import type { ProfileInput, SafetyResult } from '@/types/safety'

const SENSITIVE_MSG =
  "Based on your profile, we'll show you general suggestions only. Please follow the guidance of your care team."

/**
 * If any sensitive health flag is set, restricts suggestions to general-only
 * and directs the user to their care team.
 *
 * Per GUIDELINES: never say "you have [condition]" — use "based on your profile".
 */
export function checkSensitiveConditions(profile: ProfileInput): SafetyResult {
  const isSensitive =
    profile.isPregnant ||
    profile.hasKidneyDisease ||
    profile.takesInsulin ||
    profile.hasEdHistory

  if (isSensitive) {
    return { level: 'warn', warnings: [SENSITIVE_MSG] }
  }

  return { level: 'ok', warnings: [] }
}
