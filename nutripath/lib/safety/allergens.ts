import type { FoodInput, ProfileInput, SafetyResult } from '@/types/safety'

/** FDA major-9 allergens — the only valid allergen values */
export const FDA_MAJOR_9 = [
  'milk',
  'eggs',
  'fish',
  'crustacean shellfish',
  'tree nuts',
  'peanuts',
  'wheat',
  'soybeans',
  'sesame',
] as const

export type FdaAllergen = (typeof FDA_MAJOR_9)[number]

/**
 * Food names and hidden ingredients that indicate each allergen.
 * USDA does not label allergens, so GUIDELINES rule 3 asks us to keep our own
 * list. Matching is by whole word (plurals allowed), so "egg" does not match
 * "eggplant" and "fish" does not match "shellfish". When in doubt we flag:
 * over-warning is safer than missing an allergen.
 */
export const ALLERGEN_KEYWORDS: Record<FdaAllergen, string[]> = {
  milk: [
    'milk', 'buttermilk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream',
    'whey', 'casein', 'ghee', 'paneer', 'kefir', 'curd', 'dairy', 'lactose',
  ],
  eggs: ['egg', 'mayonnaise', 'meringue', 'albumin'],
  fish: [
    'fish', 'salmon', 'tuna', 'cod', 'tilapia', 'sardine', 'anchovy', 'anchovies',
    'mackerel', 'trout', 'halibut', 'haddock', 'pollock', 'herring', 'catfish',
    'swordfish', 'bass', 'snapper',
  ],
  'crustacean shellfish': [
    'shellfish', 'crustacean', 'shrimp', 'prawn', 'crab', 'lobster', 'crayfish',
    'crawfish', 'langoustine', 'krill',
  ],
  'tree nuts': [
    'tree nut', 'almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'hazelnut',
    'filbert', 'macadamia', 'brazil nut', 'pine nut', 'chestnut', 'praline',
    'marzipan', 'nutella',
  ],
  peanuts: ['peanut', 'groundnut'],
  wheat: [
    'wheat', 'flour', 'bread', 'pasta', 'spaghetti', 'macaroni', 'couscous',
    'bulgur', 'seitan', 'semolina', 'durum', 'spelt', 'farro', 'naan', 'chapati',
    'roti', 'pita', 'cracker', 'gluten',
  ],
  soybeans: ['soy', 'soya', 'soybean', 'soymilk', 'tofu', 'edamame', 'tempeh', 'miso', 'natto'],
  sesame: ['sesame', 'tahini', 'benne'],
}

/**
 * Phrases that contain an allergen keyword but are not that allergen
 * (e.g. "almond milk" is not dairy). They are removed before matching that
 * allergen only — "almond milk" still flags tree nuts.
 */
const ALLERGEN_EXCLUSIONS: Partial<Record<FdaAllergen, string[]>> = {
  milk: [
    'coconut milk', 'almond milk', 'soy milk', 'oat milk', 'rice milk', 'cashew milk',
    'peanut butter', 'almond butter', 'cashew butter', 'nut butter', 'cocoa butter',
    'apple butter', 'shea butter', 'coconut cream', 'cream of tartar',
  ],
  wheat: [
    'rice flour', 'almond flour', 'coconut flour', 'chickpea flour', 'corn flour',
    'oat flour', 'buckwheat', 'gluten-free', 'gluten free', 'rice cracker', 'rice pasta',
  ],
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function keywordRegex(keyword: string): RegExp {
  return new RegExp(`\\b${escapeRegExp(keyword)}(?:s|es)?\\b`, 'i')
}

/**
 * Returns the allergens (from the given list) that appear in `text`, using the
 * keyword map. Allergens not in the FDA major-9 map fall back to matching their
 * own name. Case-insensitive.
 */
export function matchAllergens(text: string, allergens: string[]): string[] {
  const lower = text.toLowerCase()
  return allergens.filter((allergen) => {
    const key = allergen.toLowerCase() as FdaAllergen
    const keywords = ALLERGEN_KEYWORDS[key] ?? [key]
    let haystack = lower
    for (const phrase of ALLERGEN_EXCLUSIONS[key] ?? []) {
      haystack = haystack.split(phrase).join(' ')
    }
    return keywords.some((kw) => keywordRegex(kw).test(haystack))
  })
}

/**
 * Checks whether any ingredient in the food matches a profile allergen.
 * Uses case-insensitive keyword matching (see ALLERGEN_KEYWORDS).
 * Returns level 'block' if any match is found.
 */
export function checkAllergens(food: FoodInput, profile: ProfileInput): SafetyResult {
  if (profile.allergens.length === 0 || food.ingredients.length === 0) {
    return { level: 'ok', warnings: [] }
  }

  const warnings: string[] = []

  for (const allergen of profile.allergens) {
    const matched = food.ingredients.some(
      (ingredient) => matchAllergens(ingredient, [allergen]).length > 0
    )
    if (matched) {
      warnings.push(
        `${food.name} contains ${allergen}, which is on your allergen list.`
      )
    }
  }

  if (warnings.length > 0) {
    return { level: 'block', warnings }
  }

  return { level: 'ok', warnings: [] }
}
