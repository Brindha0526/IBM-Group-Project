// app/api/foods/route.ts
// GET /api/foods
//
// Query params:
//   ?cuisines=  comma-separated list of the user's cuisine preferences (free-text)
//   ?goals=     comma-separated nutrient display names to prioritise (e.g. "Iron,Vitamin D")
//
// No 401 — unauthenticated requests get the full list minus any allergens from the
// session (if present). Allergen filtering requires a valid session + profile.
//
// Logic:
//   1. Start with all SEED_FOODS
//   2. If authenticated + profile has allergens, silently remove blocked foods
//   3. If ?cuisines param: keep only foods where ≥1 cuisineTag contains any
//      cuisine entry (case-insensitive substring match)
//   4. If ?goals param: sort foods that have a matching nutrientHighlight to the top
//   5. Return filtered, sorted list

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { SEED_FOODS } from '@/data/seed-foods'
import type { SeedFood } from '@/types/foods'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const cuisinesParam = searchParams.get('cuisines') ?? ''
  const goalsParam = searchParams.get('goals') ?? ''

  // ---------------------------------------------------------------------------
  // 1. Base list
  // ---------------------------------------------------------------------------
  let foods: SeedFood[] = [...SEED_FOODS]

  // ---------------------------------------------------------------------------
  // 2. Allergen blocking — only if authenticated with a profile
  // ---------------------------------------------------------------------------
  try {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email! },
        include: { profile: true },
      })

      if (user?.profile?.allergens && Array.isArray(user.profile.allergens)) {
        const userAllergens = (user.profile.allergens as string[]).map((a) =>
          a.toLowerCase()
        )

        if (userAllergens.length > 0) {
          foods = foods.filter((food) => {
            // Block if any allergenFlag matches any user allergen
            return !food.allergenFlags.some((flag) =>
              userAllergens.some((ua) => flag.toLowerCase().includes(ua))
            )
          })
        }
      }
    }
  } catch {
    // Session or DB error — proceed without allergen filtering
  }

  // ---------------------------------------------------------------------------
  // 3. Cuisine filter — case-insensitive substring match
  // ---------------------------------------------------------------------------
  if (cuisinesParam.trim()) {
    const cuisineEntries = cuisinesParam
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean)

    if (cuisineEntries.length > 0) {
      foods = foods.filter((food) => {
        const tagLower = food.cuisineTags.map((t) => t.toLowerCase())
        // Keep if any cuisineTag contains any of the user's cuisine entries
        // OR any user entry is a substring of any tag
        return cuisineEntries.some((entry) =>
          tagLower.some(
            (tag) => tag.includes(entry) || entry.includes(tag)
          )
        )
      })
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Sort by nutrient priority
  // ---------------------------------------------------------------------------
  if (goalsParam.trim()) {
    const goalNames = goalsParam
      .split(',')
      .map((g) => g.trim().toLowerCase())
      .filter(Boolean)

    if (goalNames.length > 0) {
      foods.sort((a, b) => {
        const aMatches = a.nutrientHighlights.some((nh) =>
          goalNames.some((g) => nh.name.toLowerCase().includes(g))
        )
        const bMatches = b.nutrientHighlights.some((nh) =>
          goalNames.some((g) => nh.name.toLowerCase().includes(g))
        )
        if (aMatches && !bMatches) return -1
        if (!aMatches && bMatches) return 1
        return 0
      })
    }
  }

  return NextResponse.json({ foods })
}
