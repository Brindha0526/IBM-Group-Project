// lib/ai.ts
// Placeholder — implemented in ST-7.
// Wraps OpenAI GPT-4o-mini for meal plan generation (server-side only).
// OPENAI_API_KEY must never be prefixed with NEXT_PUBLIC_.
// The AI never produces nutrition numbers; all numbers come from USDA.

export async function generateMealPlan(
  _profile: unknown,
  _goals: unknown[]
): Promise<unknown> {
  throw new Error('Not implemented — coming in ST-7')
}
