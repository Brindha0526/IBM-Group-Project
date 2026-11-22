// lib/usda.ts
// Wraps USDA FoodData Central REST API (server-side only).
// USDA_API_KEY must never be prefixed with NEXT_PUBLIC_.

import type { USDAFoodSummary, USDAFoodDetail, USDANutrient } from '@/types/usda'

const BASE = 'https://api.nal.usda.gov/fdc/v1'

function apiKey(): string {
  return process.env.USDA_API_KEY ?? 'DEMO_KEY'
}

// ---------------------------------------------------------------------------
// searchFoods — queries Foundation and SR Legacy data types for reliability
// ---------------------------------------------------------------------------

export async function searchFoods(query: string): Promise<USDAFoodSummary[]> {
  const url =
    `${BASE}/foods/search` +
    `?query=${encodeURIComponent(query)}` +
    `&dataType=Foundation,SR%20Legacy` +
    `&pageSize=20` +
    `&api_key=${apiKey()}`

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return []

  const data = (await res.json()) as {
    foods?: Array<{
      fdcId: number
      description: string
      brandOwner?: string
      dataType: string
    }>
  }

  return (data.foods ?? []).map((f) => ({
    fdcId: String(f.fdcId),
    description: f.description,
    brandOwner: f.brandOwner,
    dataType: f.dataType,
  }))
}

// ---------------------------------------------------------------------------
// getFoodDetail — fetches full nutrient profile for a single food
// ---------------------------------------------------------------------------

export async function getFoodDetail(fdcId: string): Promise<USDAFoodDetail | null> {
  const url = `${BASE}/food/${encodeURIComponent(fdcId)}?api_key=${apiKey()}`

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null

  const data = (await res.json()) as {
    fdcId: number
    description: string
    dataType: string
    foodNutrients?: Array<{
      nutrient: { id: number; name: string; unitName: string }
      amount?: number
    }>
    ingredients?: string
  }

  const nutrients: USDANutrient[] = (data.foodNutrients ?? [])
    .filter((n) => n.amount !== undefined && n.amount !== null)
    .map((n) => ({
      nutrientId: n.nutrient.id,
      nutrientName: n.nutrient.name,
      value: n.amount!,
      unitName: n.nutrient.unitName,
    }))

  return {
    fdcId: String(data.fdcId),
    description: data.description,
    dataType: data.dataType,
    nutrients,
    ingredients: data.ingredients,
  }
}
