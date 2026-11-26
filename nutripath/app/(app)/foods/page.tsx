'use client'

// app/(app)/foods/page.tsx
// "Foods That Fit" — browse globally diverse foods filtered by cuisine,
// nutrient goals, allergens (from profile), and free-text search.
// All nutrient values are approximate per 100 g from the seed dataset.

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import type { SeedFood } from '@/types/foods'

// ---------------------------------------------------------------------------
// Types for profile / goals responses
// ---------------------------------------------------------------------------

interface ProfileResponse {
  cuisines?: string[]
  allergens?: string[]
  careTeamFlags?: string[]
}

interface GoalEntry {
  nutrient: string
  label?: string | null
}

// ---------------------------------------------------------------------------
// Fixed nutrient filter chips (always shown)
// ---------------------------------------------------------------------------

const NUTRIENT_FILTERS = [
  { label: 'High iron', key: 'iron' },
  { label: 'High vitamin D', key: 'vitamin d' },
  { label: 'High B12', key: 'b12' },
  { label: 'High fibre', key: 'fibre' },
  { label: 'High calcium', key: 'calcium' },
  { label: 'Low sodium', key: 'low sodium' },
] as const

type NutrientFilterKey = (typeof NUTRIENT_FILTERS)[number]['key']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** True if food has a nutrientHighlight matching the filter key. */
function foodMatchesNutrientFilter(food: SeedFood, key: NutrientFilterKey): boolean {
  if (key === 'low sodium') {
    // "Low sodium" means sodium highlight value ≤ 140 mg per 100 g, or no sodium listed
    const sodiumHighlight = food.nutrientHighlights.find((nh) =>
      nh.nutrientKey.toLowerCase().includes('sodium')
    )
    if (!sodiumHighlight) return true // no sodium listed → assume low
    return sodiumHighlight.value <= 140
  }

  // All other nutrient filters: match nutrient name or key
  return food.nutrientHighlights.some((nh) => {
    const nameLower = nh.name.toLowerCase()
    const keyLower = nh.nutrientKey.toLowerCase()
    // special aliases
    if (key === 'b12') {
      return nameLower.includes('b12') || nameLower.includes('b-12') || keyLower.includes('b-12')
    }
    if (key === 'fibre') {
      return nameLower.includes('fibre') || nameLower.includes('fiber') || keyLower.includes('fiber')
    }
    return nameLower.includes(key) || keyLower.includes(key)
  })
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
        active
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600'
      }`}
    >
      {label}
    </button>
  )
}

function AllergenBadge({ flags }: { flags: string[] }) {
  if (flags.length === 0) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
      Contains: {flags.join(', ')}
    </span>
  )
}

function FoodCard({ food }: { food: SeedFood }) {
  const logHref = `/log?fdcId=${encodeURIComponent(food.fdcId)}&name=${encodeURIComponent(food.name)}`

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-2">
      {/* Name */}
      <p className="font-semibold text-gray-900 text-sm leading-snug">{food.name}</p>

      {/* Cuisine tags */}
      <div className="flex flex-wrap gap-1">
        {food.cuisineTags.map((tag) => (
          <span
            key={tag}
            className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Nutrient highlights */}
      {food.nutrientHighlights.length > 0 && (
        <ul className="text-xs text-gray-700 space-y-0.5">
          {food.nutrientHighlights.slice(0, 3).map((nh) => (
            <li key={nh.nutrientKey}>
              <span className="font-medium">{nh.name}:</span>{' '}
              {nh.value} {nh.unit} per 100 g
            </li>
          ))}
        </ul>
      )}

      {/* Allergen warning (informational only — blocked foods are never shown) */}
      <AllergenBadge flags={food.allergenFlags} />

      {/* Source note */}
      <p className="text-xs text-gray-400">Per 100 g · Approximate values</p>

      {/* Log CTA */}
      <Link
        href={logHref}
        className="mt-auto inline-block text-center rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
      >
        Log this food
      </Link>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="col-span-full py-12 text-center space-y-2">
      <p className="text-gray-700 font-medium">No foods match your current filters.</p>
      <p className="text-sm text-gray-500">
        Try removing a filter or searching by name. You can also log any food directly from the{' '}
        <Link href="/log" className="underline text-blue-600">
          Food Log
        </Link>{' '}
        page.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FoodsPage() {
  // Profile / goals
  const [cuisinePrefs, setCuisinePrefs] = useState<string[]>([])
  const [profileLoaded, setProfileLoaded] = useState(false)

  // Foods from API
  const [allFoods, setAllFoods] = useState<SeedFood[]>([])
  const [foodsLoading, setFoodsLoading] = useState(true)

  // Filters
  const [searchText, setSearchText] = useState('')
  const [activeCuisines, setActiveCuisines] = useState<Set<string>>(new Set())
  const [activeNutrients, setActiveNutrients] = useState<Set<NutrientFilterKey>>(new Set())

  // ---------------------------------------------------------------------------
  // Load profile to get cuisine prefs and goals (for pre-sorting)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function load() {
      try {
        // Profile
        const profileRes = await fetch('/api/profile/me')
        let profile: ProfileResponse = {}
        if (profileRes.ok) {
          const data = await profileRes.json()
          profile = data.profile ?? {}
        }

        const cuisines: string[] = Array.isArray(profile.cuisines) ? profile.cuisines : []
        setCuisinePrefs(cuisines)

        // Build query params for /api/foods
        const params = new URLSearchParams()
        // We always load all foods here and do client-side filtering for
        // responsiveness; pass goals to get server-side priority sort
        let goalNames: string[] = []
        try {
          const goalsRes = await fetch('/api/goals')
          if (goalsRes.ok) {
            const gData = await goalsRes.json()
            goalNames = (gData.goals ?? [])
              .map((g: GoalEntry) => g.label ?? g.nutrient)
              .filter(Boolean)
          }
        } catch {
          // Goals not available — that's fine
        }

        if (cuisines.length > 0) {
          // Don't pre-filter by cuisine here — load all foods and filter client-side
          // so toggling chips is instant. We pass goals for server-side sort.
        }
        if (goalNames.length > 0) {
          params.set('goals', goalNames.join(','))
        }

        const url = `/api/foods${params.toString() ? `?${params.toString()}` : ''}`
        const foodsRes = await fetch(url)
        if (foodsRes.ok) {
          const data = await foodsRes.json()
          setAllFoods(Array.isArray(data.foods) ? data.foods : [])
        }
      } catch {
        // Network error — foods will stay empty
      } finally {
        setFoodsLoading(false)
        setProfileLoaded(true)
      }
    }
    load()
  }, [])

  // ---------------------------------------------------------------------------
  // Derived filtered list (pure client-side after initial fetch)
  // ---------------------------------------------------------------------------
  const visibleFoods = useMemo(() => {
    let list = allFoods

    // Text search
    const q = searchText.trim().toLowerCase()
    if (q) {
      list = list.filter((f) => f.name.toLowerCase().includes(q))
    }

    // Cuisine filter chips
    if (activeCuisines.size > 0) {
      list = list.filter((f) =>
        Array.from(activeCuisines).some((ac) => {
          const acLower = ac.toLowerCase()
          return f.cuisineTags.some(
            (tag) =>
              tag.toLowerCase().includes(acLower) || acLower.includes(tag.toLowerCase())
          )
        })
      )
    }

    // Nutrient filter chips — keep foods matching ANY active nutrient filter
    if (activeNutrients.size > 0) {
      list = list.filter((f) =>
        Array.from(activeNutrients).some((nk) => foodMatchesNutrientFilter(f, nk))
      )
    }

    return list
  }, [allFoods, searchText, activeCuisines, activeNutrients])

  // ---------------------------------------------------------------------------
  // Toggle helpers
  // ---------------------------------------------------------------------------
  function toggleCuisine(cuisine: string) {
    setActiveCuisines((prev) => {
      const next = new Set(prev)
      next.has(cuisine) ? next.delete(cuisine) : next.add(cuisine)
      return next
    })
  }

  function toggleNutrient(key: NutrientFilterKey) {
    setActiveNutrients((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Foods That Fit</h1>
        <p className="mt-1 text-sm text-gray-500">
          Browse foods that match your goals, allergens, and cultural preferences. All values are
          approximate per 100 g.
        </p>
      </div>

      {/* Search bar */}
      <div>
        <label htmlFor="food-search" className="block text-sm font-medium text-gray-700 mb-1">
          Search foods
        </label>
        <input
          id="food-search"
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="e.g. lentils, salmon, oats…"
          className="w-full max-w-md rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Cuisine filter chips */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Filter by cuisine</p>
        {profileLoaded && cuisinePrefs.length === 0 ? (
          <p className="text-sm text-gray-500">
            Add cuisine preferences in your profile to filter by culture.{' '}
            <Link href="/profile" className="text-blue-600 underline">
              Go to profile
            </Link>
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {cuisinePrefs.map((cuisine) => (
              <Chip
                key={cuisine}
                label={cuisine}
                active={activeCuisines.has(cuisine)}
                onClick={() => toggleCuisine(cuisine)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Nutrient filter chips */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Filter by nutrient</p>
        <div className="flex flex-wrap gap-2">
          {NUTRIENT_FILTERS.map(({ label, key }) => (
            <Chip
              key={key}
              label={label}
              active={activeNutrients.has(key)}
              onClick={() => toggleNutrient(key)}
            />
          ))}
        </div>
      </div>

      {/* Results count */}
      {!foodsLoading && (
        <p className="text-xs text-gray-500">
          {visibleFoods.length} food{visibleFoods.length !== 1 ? 's' : ''} shown
          {activeCuisines.size > 0 || activeNutrients.size > 0 || searchText
            ? ' (filtered)'
            : ''}
        </p>
      )}

      {/* Food cards grid */}
      {foodsLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleFoods.length === 0 ? (
            <EmptyState />
          ) : (
            visibleFoods.map((food) => <FoodCard key={`${food.fdcId}-${food.name}`} food={food} />)
          )}
        </div>
      )}

      {/* Footer note */}
      <p className="text-xs text-gray-400 border-t border-gray-100 pt-4">
        Nutrient values are approximate per 100 g, sourced from USDA FoodData Central reference
        data and NIH Office of Dietary Supplements fact sheets. Not medical advice — speak to your
        care team before making dietary changes.
      </p>
    </div>
  )
}
