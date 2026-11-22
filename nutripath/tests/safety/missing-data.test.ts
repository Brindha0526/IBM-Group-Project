import { describe, it, expect } from 'vitest'
import { checkMissingData } from '@/lib/safety/missing-data'
import type { FoodInput } from '@/types/safety'

const completeFood: FoodInput = {
  fdcId: '1',
  name: 'apple',
  ingredients: ['apple'],
  calories: 95,
  nutrients: { vitaminC: 8.4, fiber: 4.4 },
}

describe('checkMissingData', () => {
  it('returns ok when nutrients are present and non-empty, and calories are present', () => {
    const result = checkMissingData(completeFood)
    expect(result.level).toBe('ok')
    expect(result.warnings).toHaveLength(0)
  })

  it('returns warn about nutrition data when nutrients is undefined', () => {
    const result = checkMissingData({ ...completeFood, nutrients: undefined })
    expect(result.level).toBe('warn')
    expect(result.warnings.some((w) => w.includes('Nutrition data'))).toBe(true)
    expect(result.warnings.some((w) => w.includes('apple'))).toBe(true)
  })

  it('returns warn about nutrition data when nutrients is an empty object', () => {
    const result = checkMissingData({ ...completeFood, nutrients: {} })
    expect(result.level).toBe('warn')
    expect(result.warnings.some((w) => w.includes('Nutrition data'))).toBe(true)
  })

  it('returns warn about calories when calories is undefined but nutrients are present', () => {
    const result = checkMissingData({ ...completeFood, calories: undefined })
    expect(result.level).toBe('warn')
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('Calorie information')
    expect(result.warnings[0]).toContain('apple')
  })

  it('returns two warnings when both nutrients and calories are absent', () => {
    const result = checkMissingData({
      ...completeFood,
      calories: undefined,
      nutrients: undefined,
    })
    expect(result.level).toBe('warn')
    expect(result.warnings).toHaveLength(2)
    expect(result.warnings.some((w) => w.includes('Nutrition data'))).toBe(true)
    expect(result.warnings.some((w) => w.includes('Calorie information'))).toBe(true)
  })

  it('includes the food name in both warning messages', () => {
    const result = checkMissingData({
      ...completeFood,
      name: 'mystery food',
      calories: undefined,
      nutrients: undefined,
    })
    expect(result.warnings.every((w) => w.includes('mystery food'))).toBe(true)
  })
})
