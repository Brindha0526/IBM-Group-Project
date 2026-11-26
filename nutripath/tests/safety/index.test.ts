import { describe, it, expect } from 'vitest'
import { runSafetyRules } from '@/lib/safety'
import type { FoodInput, ProfileInput } from '@/types/safety'

const safeProfile: ProfileInput = {
  allergens: [],
  medications: [],
  isPregnant: false,
  hasKidneyDisease: false,
  takesInsulin: false,
  hasEdHistory: false,
}

const safeFood: FoodInput = {
  fdcId: '1',
  name: 'brown rice',
  ingredients: ['brown rice', 'water'],
  calories: 215,
  nutrients: { carbohydrates: 45, fiber: 3.5 },
}

describe('runSafetyRules (integration)', () => {
  it('returns ok for a safe food and safe profile', () => {
    const result = runSafetyRules(safeFood, safeProfile)
    expect(result.level).toBe('ok')
    expect(result.warnings).toHaveLength(0)
  })

  it('returns block when allergen match overrides medication warn', () => {
    const result = runSafetyRules(
      { ...safeFood, ingredients: ['wheat', 'water'] },
      {
        ...safeProfile,
        allergens: ['wheat'],
        medications: ['warfarin'], // warfarin has no conflict with this food's name/ingredients
      }
    )
    expect(result.level).toBe('block')
  })

  it('warn from medication does not upgrade to block', () => {
    const result = runSafetyRules(
      {
        ...safeFood,
        name: 'spinach salad',
        ingredients: ['spinach', 'olive oil'],
      },
      {
        ...safeProfile,
        medications: ['warfarin'],
      }
    )
    expect(result.level).toBe('warn')
    expect(result.warnings.some((w) => w.includes('vitamin K'))).toBe(true)
  })

  it('collects warnings from multiple rules', () => {
    // warfarin + spinach (medication warn) AND missing calories (missing-data warn)
    const result = runSafetyRules(
      {
        ...safeFood,
        name: 'spinach',
        ingredients: ['spinach'],
        calories: undefined,
        nutrients: { vitaminK: 483 },
      },
      {
        ...safeProfile,
        medications: ['warfarin'],
      }
    )
    expect(result.level).toBe('warn')
    // at least one warning from medications and one from missing-data
    expect(result.warnings.some((w) => w.includes('vitamin K'))).toBe(true)
    expect(result.warnings.some((w) => w.includes('Calorie information'))).toBe(true)
  })

  it('merges level correctly: block + warn → block', () => {
    // allergen match (block) + medication conflict (warn) → block
    const result = runSafetyRules(
      {
        ...safeFood,
        name: 'spinach pasta',
        ingredients: ['wheat', 'spinach', 'water'],
      },
      {
        ...safeProfile,
        allergens: ['wheat'],
        medications: ['warfarin'],
      }
    )
    expect(result.level).toBe('block')
    // warnings from both rules are present
    expect(result.warnings.some((w) => w.includes('wheat'))).toBe(true)
    expect(result.warnings.some((w) => w.includes('vitamin K'))).toBe(true)
  })

  it('missing-data warn does not become block when no allergen or medication issues', () => {
    const result = runSafetyRules(
      { ...safeFood, nutrients: undefined, calories: undefined },
      safeProfile
    )
    expect(result.level).toBe('warn')
    expect(result.warnings).toHaveLength(2)
  })
})

describe('runSafetyRules for sensitive-condition profiles (meal plans)', () => {
  it('still blocks allergens when the profile is in general-only mode', () => {
    const result = runSafetyRules(
      // Meal plans pass the ingredient name + USDA description as ingredients
      { ...safeFood, name: 'Peanut butter', ingredients: ['peanut butter', 'peanut butter, smooth style'] },
      { ...safeProfile, allergens: ['peanuts'], isPregnant: true, hasEdHistory: true }
    )
    expect(result.level).toBe('block')
  })
})
