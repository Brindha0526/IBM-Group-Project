// app/api/ai/meal-plan/route.ts
// Implemented in ST-7.
// Runs: OpenAI → USDA verify per ingredient → runSafetyRules() → return plan.
// OPENAI_API_KEY stays server-side — never NEXT_PUBLIC_.

import { NextResponse } from 'next/server'

export async function POST(_request: Request) {
  return NextResponse.json({ error: 'Not implemented — coming in ST-7' }, { status: 501 })
}
