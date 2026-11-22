// types/usda.ts
// Types for USDA FoodData Central API responses used in ST-5.

export interface USDAFoodSummary {
  fdcId: string
  description: string
  brandOwner?: string
  dataType: string // e.g. "SR Legacy", "Branded", "Foundation"
}

export interface USDANutrient {
  nutrientId: number
  nutrientName: string // e.g. "Energy", "Iron, Fe"
  value: number
  unitName: string // e.g. "kcal", "mg"
}

export interface USDAFoodDetail {
  fdcId: string
  description: string
  dataType: string
  nutrients: USDANutrient[]
  ingredients?: string // ingredient text from USDA, if present
}
