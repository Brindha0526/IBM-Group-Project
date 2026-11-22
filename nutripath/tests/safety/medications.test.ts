import { describe, it, expect } from 'vitest'
import { checkMedications } from '@/lib/safety/medications'
import type { FoodInput, ProfileInput } from '@/types/safety'

const baseProfile: ProfileInput = {
  allergens: [],
  medications: [],
  isPregnant: false,
  hasKidneyDisease: false,
  takesInsulin: false,
  hasEdHistory: false,
}

const spinachFood: FoodInput = {
  fdcId: '10',
  name: 'spinach',
  ingredients: ['spinach'],
  calories: 23,
  nutrients: { vitaminK: 483 },
}

const plainRiceFood: FoodInput = {
  fdcId: '20',
  name: 'white rice',
  ingredients: ['rice', 'water'],
  calories: 200,
  nutrients: { carbohydrates: 45 },
}

const grapefruitFood: FoodInput = {
  fdcId: '30',
  name: 'grapefruit juice',
  ingredients: ['grapefruit juice'],
  calories: 96,
  nutrients: { vitaminC: 70 },
}

const agedCheeseFood: FoodInput = {
  fdcId: '40',
  name: 'aged cheddar',
  ingredients: ['cheddar'],
  calories: 110,
  nutrients: { calcium: 200 },
}

describe('checkMedications', () => {
  it('returns ok when no medications on profile', () => {
    const result = checkMedications(spinachFood, { ...baseProfile, medications: [] })
    expect(result.level).toBe('ok')
    expect(result.warnings).toHaveLength(0)
  })

  it('returns warn with specific message: warfarin + spinach (conflicting ingredient)', () => {
    const result = checkMedications(spinachFood, { ...baseProfile, medications: ['warfarin'] })
    expect(result.level).toBe('warn')
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('spinach')
    expect(result.warnings[0]).toContain('warfarin')
    expect(result.warnings[0]).toContain('vitamin K')
  })

  it('returns ok: warfarin + food with no conflicting ingredient', () => {
    const result = checkMedications(plainRiceFood, { ...baseProfile, medications: ['warfarin'] })
    expect(result.level).toBe('ok')
    expect(result.warnings).toHaveLength(0)
  })

  it('returns warn with standing message for unknown medication', () => {
    const result = checkMedications(plainRiceFood, {
      ...baseProfile,
      medications: ['some-unknown-drug'],
    })
    expect(result.level).toBe('warn')
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('some-unknown-drug')
    expect(result.warnings[0]).toContain("check with your pharmacist")
  })

  it('normalises medication name with mixed case and punctuation (Warfarin. → warfarin)', () => {
    const result = checkMedications(spinachFood, { ...baseProfile, medications: ['Warfarin.'] })
    expect(result.level).toBe('warn')
    expect(result.warnings[0]).toContain('vitamin K')
  })

  it('returns warn for multiple medications: one known with conflict, one unknown', () => {
    const result = checkMedications(spinachFood, {
      ...baseProfile,
      medications: ['warfarin', 'unknownMed'],
    })
    expect(result.level).toBe('warn')
    expect(result.warnings).toHaveLength(2)
    // First warning is from warfarin conflict
    expect(result.warnings[0]).toContain('vitamin K')
    // Second warning is the standing unknown message
    expect(result.warnings[1]).toContain('unknownMed')
  })

  it('returns warn: MAOI (phenelzine) + aged cheese', () => {
    const result = checkMedications(agedCheeseFood, { ...baseProfile, medications: ['phenelzine'] })
    expect(result.level).toBe('warn')
    expect(result.warnings[0]).toContain('MAOI')
  })

  it('returns warn: statin (atorvastatin) + grapefruit juice', () => {
    const result = checkMedications(grapefruitFood, {
      ...baseProfile,
      medications: ['atorvastatin'],
    })
    expect(result.level).toBe('warn')
    expect(result.warnings[0]).toContain('Grapefruit')
  })

  it('returns warn: unknown medication regardless of food', () => {
    const result = checkMedications(plainRiceFood, {
      ...baseProfile,
      medications: ['metformin'],
    })
    expect(result.level).toBe('warn')
    expect(result.warnings[0]).toContain('metformin')
  })

  it('returns warn: tranylcypromine (MAOI) + sauerkraut ingredient', () => {
    const fermentedFood: FoodInput = {
      fdcId: '50',
      name: 'reuben sandwich',
      ingredients: ['bread', 'sauerkraut', 'corned beef'],
      calories: 500,
      nutrients: { sodium: 1200 },
    }
    const result = checkMedications(fermentedFood, {
      ...baseProfile,
      medications: ['tranylcypromine'],
    })
    expect(result.level).toBe('warn')
    expect(result.warnings[0]).toContain('MAOI')
  })
})
