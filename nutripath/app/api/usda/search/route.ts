// app/api/usda/search/route.ts
// GET /api/usda/search?q=<query>
// Proxies USDA FoodData Central search — USDA_API_KEY stays server-side.

import { NextResponse } from 'next/server'
import { searchFoods } from '@/lib/usda'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  if (!q) {
    return NextResponse.json({ error: 'Missing required query param: q' }, { status: 400 })
  }

  const results = await searchFoods(q)
  return NextResponse.json(results)
}
