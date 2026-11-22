import { describe, it, expect } from 'vitest'
import { checkSensitiveConditions } from '@/lib/safety/sensitive-conditions'
import type { ProfileInput } from '@/types/safety'

const allFalse: ProfileInput = {
  allergens: [],
  medications: [],
  isPregnant: false,
  hasKidneyDisease: false,
  takesInsulin: false,
  hasEdHistory: false,
}

describe('checkSensitiveConditions', () => {
  it('returns ok when all sensitive flags are false', () => {
    const result = checkSensitiveConditions(allFalse)
    expect(result.level).toBe('ok')
    expect(result.warnings).toHaveLength(0)
  })

  it('returns warn when isPregnant is true', () => {
    const result = checkSensitiveConditions({ ...allFalse, isPregnant: true })
    expect(result.level).toBe('warn')
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('Based on your profile')
  })

  it('returns warn when hasKidneyDisease is true', () => {
    const result = checkSensitiveConditions({ ...allFalse, hasKidneyDisease: true })
    expect(result.level).toBe('warn')
    expect(result.warnings).toHaveLength(1)
  })

  it('returns warn when takesInsulin is true', () => {
    const result = checkSensitiveConditions({ ...allFalse, takesInsulin: true })
    expect(result.level).toBe('warn')
    expect(result.warnings).toHaveLength(1)
  })

  it('returns warn when hasEdHistory is true', () => {
    const result = checkSensitiveConditions({ ...allFalse, hasEdHistory: true })
    expect(result.level).toBe('warn')
    expect(result.warnings).toHaveLength(1)
  })

  it('returns single warning (not duplicated) when multiple flags are true', () => {
    const result = checkSensitiveConditions({
      ...allFalse,
      isPregnant: true,
      hasKidneyDisease: true,
      takesInsulin: true,
      hasEdHistory: true,
    })
    expect(result.level).toBe('warn')
    expect(result.warnings).toHaveLength(1)
  })

  it('warning message uses "based on your profile" wording (not "you have")', () => {
    const result = checkSensitiveConditions({ ...allFalse, isPregnant: true })
    expect(result.warnings[0].toLowerCase()).toContain('based on your profile')
    expect(result.warnings[0].toLowerCase()).not.toContain('you have')
  })
})
