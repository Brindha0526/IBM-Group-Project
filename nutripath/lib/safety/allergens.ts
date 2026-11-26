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

// ─── Custom allergies ─────────────────────────────────────────────────────────
// Users can add allergies beyond the FDA major 9 (e.g. mustard, kiwi, celery).
// They are stored alongside the FDA values in Profile.allergens (lowercased) and
// matched against any word starting with the name or its singular form.

/** Lowercase, trim and collapse whitespace. */
export function normalizeAllergen(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function isFdaAllergen(a: string): a is FdaAllergen {
  return (FDA_MAJOR_9 as readonly string[]).includes(normalizeAllergen(a))
}

/** Allergens the user typed in themselves (not one of the FDA major 9). */
export function customAllergens(allergens: string[]): string[] {
  return allergens.filter((a) => !isFdaAllergen(a))
}

/**
 * Replaces the custom part of `allergens` with `custom`, keeping the FDA
 * selections. Custom entries are normalised and de-duplicated; one that names
 * an FDA allergen (e.g. "Peanuts") is stored as that FDA value.
 */
export function withCustomAllergens(allergens: string[], custom: string[]): string[] {
  const result = allergens.filter(isFdaAllergen).map(normalizeAllergen)
  for (const raw of custom) {
    const a = normalizeAllergen(raw)
    if (a && !result.includes(a)) result.push(a)
  }
  return result
}

/** Keywords for an allergen not in the FDA map: its own name, plus a singular form. */
function customKeywords(name: string): string[] {
  const kws = [name]
  if (name.endsWith('ies') && name.length > 4) kws.push(name.slice(0, -3) + 'y')
  else if (name.endsWith('es') && name.length > 3) kws.push(name.slice(0, -2), name.slice(0, -1))
  else if (name.endsWith('s') && name.length > 3) kws.push(name.slice(0, -1))
  return kws
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function wordPrefixRegex(keyword: string): RegExp {
  return new RegExp(`\\b${escapeRegExp(keyword)}`, 'i')
}

function keywordRegex(keyword: string): RegExp {
  return new RegExp(`\\b${escapeRegExp(keyword)}(?:s|es)?\\b`, 'i')
}

/**
 * Returns the allergens (from the given list) that appear in `text`, using the
 * keyword map. Custom allergens (not in the FDA major-9 map) match their own
 * name, singular or plural. Case-insensitive.
 */
export function matchAllergens(text: string, allergens: string[]): string[] {
  const lower = text.toLowerCase()
  return allergens.filter((allergen) => {
    const key = normalizeAllergen(allergen) as FdaAllergen
    if (!key) return false
    const known = ALLERGEN_KEYWORDS[key]
    let haystack = lower
    for (const phrase of ALLERGEN_EXCLUSIONS[key] ?? []) {
      haystack = haystack.split(phrase).join(' ')
    }
    if (known) return known.some((kw) => keywordRegex(kw).test(haystack))
    // Custom allergy: match any word that STARTS with the name (or its singular),
    // so "kiwi" also flags "Kiwifruit". Over-flagging is safer than missing it.
    return customKeywords(key).some((kw) => wordPrefixRegex(kw).test(haystack))
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
