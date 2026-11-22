// app/api/usda/food/[fdcId]/route.ts
// GET /api/usda/food/[fdcId]
// Returns full nutrient profile for a USDA food — USDA_API_KEY stays server-side.

import { NextResponse } from 'next/server'
import { getFoodDetail } from '@/lib/usda'

export async function GET(
  _request: Request,
  { params }: { params: { fdcId: string } }
) {
  const detail = await getFoodDetail(params.fdcId)

  if (!detail) {
    return NextResponse.json({ error: 'Food not found' }, { status: 404 })
  }

  return NextResponse.json(detail)
}
