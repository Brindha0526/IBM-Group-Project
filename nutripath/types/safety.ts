export interface FoodInput {
  fdcId: string
  name: string                // e.g. "spinach"
  ingredients: string[]       // ingredient names, lowercase
  calories?: number           // kcal, optional — may be absent
  nutrients?: Record<string, number> // nutrient name → amount
}

export interface ProfileInput {
  allergens: string[]         // from FDA major-9 list
  medications: string[]       // free-text, as entered by user
  isPregnant: boolean
  hasKidneyDisease: boolean
  takesInsulin: boolean
  hasEdHistory: boolean
}

export interface DayInput {
  totalCalories: number       // sum of all logged foods for the day
  consecutiveLowDays: number  // how many days in a row below floor
}

export type SafetyLevel = 'block' | 'warn' | 'ok'

export interface SafetyResult {
  level: SafetyLevel          // 'block' = do not show; 'warn' = show with warning; 'ok' = safe
  warnings: string[]          // human-readable messages shown to the user
}
