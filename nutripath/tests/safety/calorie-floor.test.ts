import { describe, it, expect } from 'vitest'
import { checkCalorieFloor, CALORIE_FLOOR } from '@/lib/safety/calorie-floor'
import type { DayInput } from '@/types/safety'

describe('checkCalorieFloor', () => {
  it('returns ok when calories are above the floor with no low days', () => {
    const result = checkCalorieFloor({ totalCalories: 1500, consecutiveLowDays: 0 })
    expect(result.level).toBe('ok')
    expect(result.warnings).toHaveLength(0)
  })

  it('returns ok when calories are exactly at the floor', () => {
    const result = checkCalorieFloor({ totalCalories: CALORIE_FLOOR, consecutiveLowDays: 0 })
    expect(result.level).toBe('ok')
    expect(result.warnings).toHaveLength(0)
  })

  it('returns warn with single message when calories are below floor (no consecutive days)', () => {
    const result = checkCalorieFloor({ totalCalories: 1199, consecutiveLowDays: 0 })
    expect(result.level).toBe('warn')
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('low')
  })

  it('returns warn with two messages when calories are below floor AND consecutiveLowDays >= 3', () => {
    const result = checkCalorieFloor({ totalCalories: 1199, consecutiveLowDays: 3 })
    expect(result.level).toBe('warn')
    expect(result.warnings).toHaveLength(2)
    // Second message should include care-team direction
    expect(result.warnings[1]).toContain('care team')
  })

  it('returns warn with two messages when totalCalories=0 and consecutiveLowDays=5', () => {
    const result = checkCalorieFloor({ totalCalories: 0, consecutiveLowDays: 5 })
    expect(result.level).toBe('warn')
    expect(result.warnings).toHaveLength(2)
    expect(result.warnings[1]).toContain('care team')
  })

  it('returns warn with single message when consecutiveLowDays=2 (below threshold of 3)', () => {
    const result = checkCalorieFloor({ totalCalories: 900, consecutiveLowDays: 2 })
    expect(result.level).toBe('warn')
    expect(result.warnings).toHaveLength(1)
  })

  it('CALORIE_FLOOR constant is 1200', () => {
    expect(CALORIE_FLOOR).toBe(1200)
  })
})
