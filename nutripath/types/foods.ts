// types/foods.ts
// Type definitions for the "Foods That Fit" seed dataset and API responses.

export interface NutrientHighlight {
  /** Display name, e.g. "Iron" */
  name: string
  /** Matches USDA nutrient name pattern, e.g. "Iron, Fe" */
  nutrientKey: string
  /** Amount per 100 g — approximate reference value */
  value: number
  /** Unit string, e.g. "mg" or "mcg" or "g" */
  unit: string
}

export interface SeedFood {
  /** USDA FoodData Central ID (real fdcId where possible) */
  fdcId: string
  /** Human-readable food name */
  name: string
  /** Cultural / regional tags, e.g. ["South Asian", "Indian", "Sri Lankan"] */
  cuisineTags: string[]
  /** Key nutrient values per 100 g */
  nutrientHighlights: NutrientHighlight[]
  /** Which FDA major-9 allergens are present in this food */
  allergenFlags: string[]
}
