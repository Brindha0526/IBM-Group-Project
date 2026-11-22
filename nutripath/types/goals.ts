// types/goals.ts

export interface NutrientTarget {
  nutrient: string    // e.g. "iron"
  targetMin?: number
  targetMax?: number
  unit: string        // e.g. "mg"
  label?: string      // display name e.g. "Iron"
  source: 'GUIDELINES' | 'CARE_TEAM' | 'USER_DEFINED' | 'CURATED'
}

export interface SuggestedGoal extends NutrientTarget {
  reason: string      // why we're suggesting this — shown to user
}
