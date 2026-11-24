import { describe, it, expect } from 'vitest'
import { checkAllergens, matchAllergens } from '@/lib/safety/allergens'
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

describe('matchAllergens (keyword map)', () => {
  it('matches USDA-style names that the plain allergen word would miss', () => {
    expect(matchAllergens('Egg, whole, raw, fresh', ['eggs'])).toEqual(['eggs'])
    expect(matchAllergens('Peanut butter, smooth style', ['peanuts'])).toEqual(['peanuts'])
    expect(matchAllergens('Nuts, almonds', ['tree nuts'])).toEqual(['tree nuts'])
    expect(matchAllergens('Crustaceans, shrimp, cooked', ['crustacean shellfish'])).toEqual(['crustacean shellfish'])
    expect(matchAllergens('Tofu, firm, prepared with calcium sulfate', ['soybeans'])).toEqual(['soybeans'])
    expect(matchAllergens('Cheese, cheddar', ['milk'])).toEqual(['milk'])
    expect(matchAllergens('Bread, whole-wheat, commercially prepared', ['wheat'])).toEqual(['wheat'])
    expect(matchAllergens('Seeds, sesame butter, tahini', ['sesame'])).toEqual(['sesame'])
    expect(matchAllergens('Fish, salmon, Atlantic, farmed', ['fish'])).toEqual(['fish'])
  })

  it('is case-insensitive', () => {
    expect(matchAllergens('SHRIMP COCKTAIL', ['crustacean shellfish'])).toHaveLength(1)
  })

  it('returns every matching allergen', () => {
    expect(matchAllergens('Egg sandwich on wheat bread with cheese', ['milk', 'eggs', 'wheat', 'fish']))
      .toEqual(['milk', 'eggs', 'wheat'])
  })

  it('uses whole-word matching to avoid obvious false positives', () => {
    expect(matchAllergens('Eggplant, raw', ['eggs'])).toEqual([])
    expect(matchAllergens('Shellfish, mixed', ['fish'])).toEqual([])
    expect(matchAllergens('Squash, butternut, raw', ['milk'])).toEqual([])
  })

  it('does not flag plant milks/nut butters as dairy, but still flags the nut/soy', () => {
    expect(matchAllergens('Almond milk, unsweetened', ['milk', 'tree nuts'])).toEqual(['tree nuts'])
    expect(matchAllergens('Soy milk, original', ['milk', 'soybeans'])).toEqual(['soybeans'])
    expect(matchAllergens('Peanut butter', ['milk', 'peanuts'])).toEqual(['peanuts'])
  })

  it('does not flag gluten-free flours as wheat', () => {
    expect(matchAllergens('Rice flour, white', ['wheat'])).toEqual([])
    expect(matchAllergens('Buckwheat groats', ['wheat'])).toEqual([])
  })

  it('returns nothing for an empty allergen list or unrelated food', () => {
    expect(matchAllergens('Peanut butter', [])).toEqual([])
    expect(matchAllergens('Rice, white, cooked', ['milk', 'eggs', 'wheat'])).toEqual([])
  })

  it('checkAllergens blocks keyword matches in ingredients', () => {
    const result = checkAllergens(
      { ...baseFood, name: 'pad thai', ingredients: ['rice noodles', 'shrimp', 'crushed peanuts'] },
      { ...baseProfile, allergens: ['crustacean shellfish', 'peanuts'] }
    )
    expect(result.level).toBe('block')
    expect(result.warnings).toHaveLength(2)
  })
})
