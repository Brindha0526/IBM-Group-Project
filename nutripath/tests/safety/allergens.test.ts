import { describe, it, expect } from 'vitest'
import { checkAllergens } from '@/lib/safety/allergens'
import type { FoodInput, ProfileInput } from '@/types/safety'

const baseProfile: ProfileInput = {
  allergens: [],
  medications: [],
  isPregnant: false,
  hasKidneyDisease: false,
  takesInsulin: false,
  hasEdHistory: false,
}

const baseFood: FoodInput = {
  fdcId: '1',
  name: 'bread',
  ingredients: ['wheat flour', 'water', 'yeast', 'salt'],
  calories: 250,
  nutrients: { carbohydrates: 50 },
}

describe('checkAllergens', () => {
  it('returns ok when profile has no allergens', () => {
    const result = checkAllergens(baseFood, { ...baseProfile, allergens: [] })
    expect(result.level).toBe('ok')
    expect(result.warnings).toHaveLength(0)
  })

  it('returns ok when food ingredients do not match any profile allergen', () => {
    const result = checkAllergens(
      { ...baseFood, ingredients: ['rice', 'water', 'salt'] },
      { ...baseProfile, allergens: ['wheat', 'peanuts'] }
    )
    expect(result.level).toBe('ok')
    expect(result.warnings).toHaveLength(0)
  })

  it('returns block when a food ingredient matches a profile allergen', () => {
    const result = checkAllergens(
      { ...baseFood, ingredients: ['wheat flour', 'water'] },
      { ...baseProfile, allergens: ['wheat'] }
    )
    expect(result.level).toBe('block')
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('wheat')
  })

  it('returns block with one warning per allergen match for multiple matches', () => {
    const result = checkAllergens(
      { ...baseFood, ingredients: ['wheat flour', 'milk powder', 'eggs'] },
      { ...baseProfile, allergens: ['wheat', 'milk', 'eggs'] }
    )
    expect(result.level).toBe('block')
    expect(result.warnings).toHaveLength(3)
  })

  it('performs case-insensitive matching (ingredient "WHEAT" matches allergen "wheat")', () => {
    const result = checkAllergens(
      { ...baseFood, ingredients: ['WHEAT FLOUR', 'WATER'] },
      { ...baseProfile, allergens: ['wheat'] }
    )
    expect(result.level).toBe('block')
  })

  it('returns ok when ingredient list is empty', () => {
    const result = checkAllergens(
      { ...baseFood, ingredients: [] },
      { ...baseProfile, allergens: ['wheat', 'milk'] }
    )
    expect(result.level).toBe('ok')
    expect(result.warnings).toHaveLength(0)
  })

  it('uses substring matching so an ingredient that contains the allergen name matches', () => {
    // "peanuts" (allergen) is a substring of ingredient "dry roasted peanuts"
    const result = checkAllergens(
      { ...baseFood, ingredients: ['dry roasted peanuts', 'salt'] },
      { ...baseProfile, allergens: ['peanuts'] }
    )
    expect(result.level).toBe('block')
  })
})
