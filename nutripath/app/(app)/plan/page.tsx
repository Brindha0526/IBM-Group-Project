'use client'

// app/(app)/plan/page.tsx
// AI Meal Plan Generator — ST-7
//
// Generates a 1-day or 7-day plan via POST /api/ai/meal-plan.
// Every ingredient is USDA-verified and safety-checked on the server.
// Nutrition numbers are USDA-sourced — the AI never produces them.
// A "Not medical advice" note is shown per GUIDELINES §Safety rules rule 9.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { buildMealPrefill, saveMealPrefill } from '@/lib/meal-prefill'
import type {
  VerifiedMealPlan,
  VerifiedDayPlan,
  VerifiedMeal,
  VerifiedIngredient,
  UnverifiedIngredient,
  IngredientNutrients,
  MealType,
} from '@/types/meal-plan'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mealTypeLabel(type: MealType): string {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function fmt(val: number, decimals = 1): string {
  return val.toFixed(decimals)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NutrientRow({
  label,
  value,
  unit,
}: {
  label: string
  value: number
  unit: string
}) {
  return (
    <div className="flex justify-between text-xs text-gray-700 py-0.5">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium tabular-nums">
        {fmt(value)} {unit}
      </span>
    </div>
  )
}

function NutrientPanel({
  totals,
  hideCalories,
}: {
  totals: IngredientNutrients
  hideCalories?: boolean
}) {
  return (
    <div className="rounded bg-gray-50 border border-gray-100 px-3 py-2 space-y-0.5">
      {!hideCalories && (
        <NutrientRow label="Calories" value={totals.calories} unit="kcal" />
      )}
      <NutrientRow label="Protein"  value={totals.proteinG}  unit="g" />
      <NutrientRow label="Carbs"    value={totals.carbsG}    unit="g" />
      <NutrientRow label="Fat"      value={totals.fatG}      unit="g" />
      <NutrientRow label="Fibre"    value={totals.fiberG}    unit="g" />
      <NutrientRow label="Sodium"   value={totals.sodiumMg}  unit="mg" />
      <NutrientRow label="Iron"     value={totals.ironMg}    unit="mg" />
      <NutrientRow label="Calcium"  value={totals.calciumMg} unit="mg" />
    </div>
  )
}

function IngredientList({
  verified,
  unverified,
}: {
  verified: VerifiedIngredient[]
  unverified: UnverifiedIngredient[]
}) {
  return (
    <ul className="space-y-1">
      {verified.map((ing) => (
        <li key={ing.fdcId + ing.name} className="text-sm">
          <div className="flex items-start justify-between gap-2">
            <span className="text-gray-800">
              {ing.name}{' '}
              <span className="text-gray-400 text-xs">
                ({ing.servingG} g · {ing.usdaDescription})
              </span>
            </span>
            {ing.safetyLevel === 'warn' && (
              <span className="shrink-0 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                ⚠ Note
              </span>
            )}
            {ing.safetyLevel === 'ok' && (
              <span className="shrink-0 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                ✓ Safe
              </span>
            )}
          </div>
          {ing.safetyWarnings.length > 0 && (
            <ul className="mt-0.5 ml-2 space-y-0.5">
              {ing.safetyWarnings.map((w, i) => (
                <li key={i} className="text-xs text-amber-700">
                  {w}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}

      {unverified.map((ing, i) => (
        <li key={i} className="text-sm">
          <div className="flex items-start justify-between gap-2">
            <span className="text-gray-500 line-through">{ing.name}</span>
            <span className="shrink-0 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">
              Data unavailable
            </span>
          </div>
          <p className="text-xs text-gray-400 ml-2">{ing.reason}</p>
        </li>
      ))}
    </ul>
  )
}

function SaveToGroceryButton({ meal, dayLabel }: { meal: VerifiedMeal; dayLabel: string }) {
  // Combine verified + unverified — grocery list only needs names, not nutrition data.
  const allIngredients = [
    ...meal.ingredients.map((ing) => ({ name: ing.name, servingG: ing.servingG })),
    ...meal.unverifiedIngredients.map((ing) => ({ name: ing.name, servingG: ing.servingG })),
  ]

  // Derive saved state directly from localStorage so it survives re-renders and
  // collapses — the button stays green for the life of the page session.
  function isSaved(): boolean {
    try {
      const existing = JSON.parse(
        localStorage.getItem('nutripath_grocery_items') ?? '[]'
      ) as Array<{ name: string; mealName: string; dayLabel: string }>
      // A meal is "saved" if every one of its ingredients is already in the list
      return allIngredients.length > 0 && allIngredients.every((ing) =>
        existing.some((e) => e.name === ing.name && e.dayLabel === dayLabel)
      )
    } catch {
      return false
    }
  }

  const [saved, setSaved] = useState(() => isSaved())

  function handleSave() {
    const existing = JSON.parse(
      localStorage.getItem('nutripath_grocery_items') ?? '[]'
    ) as Array<{ name: string; servingG: number; mealName: string; dayLabel: string }>

    const newItems = allIngredients.map((ing) => ({
      name: ing.name,
      servingG: ing.servingG,
      mealName: meal.name,
      dayLabel,
    }))

    const deduped = [
      ...existing.filter(
        (e) => !newItems.some((n) => n.name === e.name && n.dayLabel === e.dayLabel)
      ),
      ...newItems,
    ]

    localStorage.setItem('nutripath_grocery_items', JSON.stringify(deduped))
    setSaved(true)   // stays true — no timeout reset
  }

  if (allIngredients.length === 0) return null

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={saved}
      className={`text-xs font-medium rounded px-3 py-1.5 transition-colors ${
        saved
          ? 'bg-green-100 text-green-700 border border-green-200 cursor-default'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {saved ? '✓ In Grocery List' : 'Save to Grocery List'}
    </button>
  )
}

function LogThisMealButton({ meal, dayLabel }: { meal: VerifiedMeal; dayLabel: string }) {
  const router = useRouter()
  const [failed, setFailed] = useState(false)

  // Only USDA-verified ingredients can be logged (POST /api/log needs an fdcId)
  if (meal.ingredients.length === 0) return null

  function handleClick() {
    try {
      saveMealPrefill(buildMealPrefill(meal, dayLabel))
      router.push('/log?prefill=meal')
    } catch {
      setFailed(true) // sessionStorage unavailable (e.g. some private modes)
    }
  }

  return (
    <>
      {failed && (
        <span className="text-xs text-gray-500 self-center">Couldn&apos;t open the log. Try logging items from the Food Log page.</span>
      )}
      <button
        type="button"
        onClick={handleClick}
        className="text-xs font-medium rounded px-3 py-1.5 border border-blue-600 text-blue-700 hover:bg-blue-50 transition-colors"
      >
        Log this meal
      </button>
    </>
  )
}

function MealCard({
  meal,
  dayLabel,
  hideCalories,
}: {
  meal: VerifiedMeal
  dayLabel: string
  hideCalories: boolean
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div
      className={`bg-white border rounded-lg overflow-hidden ${
        meal.hasWarnings ? 'border-amber-200' : 'border-gray-200'
      }`}
    >
      {/* Meal header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">
            {mealTypeLabel(meal.mealType)}
          </span>
          <h4 className="text-sm font-semibold text-gray-900">{meal.name}</h4>
        </div>
        <div className="flex items-center gap-2">
          {/* Real safety warnings on verified ingredients (e.g. allergen interaction) */}
          {meal.ingredients.some((i) => i.safetyLevel === 'warn') && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
              ⚠ Safety note
            </span>
          )}
          {/* USDA lookup failures — data missing but not a safety concern */}
          {meal.unverifiedIngredients.length > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">
              {meal.unverifiedIngredients.length} nutrition unknown
            </span>
          )}
          {meal.unverifiedIngredients.length === 0 && meal.ingredients.length > 0 && !meal.ingredients.some((i) => i.safetyLevel === 'warn') && (
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
              ✓ All verified
            </span>
          )}
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-gray-400 hover:text-gray-600 ml-1"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-3 space-y-3">
          {/* Ingredients */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Ingredients
            </p>
            <IngredientList
              verified={meal.ingredients}
              unverified={meal.unverifiedIngredients}
            />
          </div>

          {/* Per-meal nutrient totals */}
          {meal.ingredients.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Meal totals (USDA-sourced)
              </p>
              <NutrientPanel totals={meal.totals} hideCalories={hideCalories} />
            </div>
          )}

          {meal.unverifiedIngredients.length > 0 && (
            <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded px-2 py-1.5">
              ⚠ {meal.unverifiedIngredients.length} ingredient
              {meal.unverifiedIngredients.length > 1 ? 's' : ''} could not be verified in
              USDA — nutrient totals exclude{' '}
              {meal.unverifiedIngredients.length > 1 ? 'them' : 'it'}.
            </p>
          )}

          {/* Actions — log the meal / save to grocery */}
          <div className="flex flex-wrap justify-end gap-2">
            <LogThisMealButton meal={meal} dayLabel={dayLabel} />
            <SaveToGroceryButton meal={meal} dayLabel={dayLabel} />
          </div>
        </div>
      )}
    </div>
  )
}

function DaySection({
  day,
  hideCalories,
}: {
  day: VerifiedDayPlan
  hideCalories: boolean
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900">{day.dayLabel}</h3>
        {!hideCalories && (
          <span className="text-sm text-gray-500 tabular-nums">
            ~{fmt(day.dayTotals.calories, 0)} kcal
          </span>
        )}
      </div>

      <div className="space-y-3">
        {day.meals.map((meal) => (
          <MealCard
            key={meal.name + meal.mealType}
            meal={meal}
            dayLabel={day.dayLabel}
            hideCalories={hideCalories}
          />
        ))}
      </div>

      {/* Day totals summary */}
      <details className="group">
        <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 select-none">
          View day totals (USDA-sourced)
        </summary>
        <div className="mt-2">
          <NutrientPanel totals={day.dayTotals} hideCalories={hideCalories} />
        </div>
      </details>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PlanPage() {
  const [days, setDays] = useState<1 | 7>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [plan, setPlan] = useState<VerifiedMealPlan | null>(null)
  // Hide calories if the user set the toggle OR disclosed an ED history.
  // Defaults to hidden until the profile loads so numbers never flash on screen.
  const [hideCalories, setHideCalories] = useState(true)

  useEffect(() => {
    fetch('/api/profile/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const p = d?.profile
        setHideCalories(Boolean(p?.hideCalories) || Boolean(p?.hasEdHistory))
      })
      .catch(() => {/* keep hidden on error */})
  }, [])

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    setPlan(null)

    try {
      const res = await fetch('/api/ai/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      setPlan(data.plan as VerifiedMealPlan)
    } catch {
      setError('Network error — please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meal Plan Generator</h1>
        <p className="mt-1 text-sm text-gray-500">
          Generate a personalised meal plan. Every suggestion is verified against USDA
          FoodData Central and your safety rules before it reaches you.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Plan length
          </label>
          <div className="flex gap-2">
            {([1, 7] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-4 py-2 rounded border text-sm font-medium transition-colors ${
                  days === d
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                }`}
              >
                {d === 1 ? '1 day' : '7 days'}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="px-5 py-2 rounded bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Generating…' : 'Generate plan'}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-3" />
          <p className="text-sm text-gray-600 font-medium">Generating your meal plan…</p>
          <p className="text-xs text-gray-400 mt-1">
            Checking every ingredient against USDA data and your safety rules.
            This may take up to 30 seconds.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Plan results */}
      {plan && !loading && (
        <div className="space-y-6">
          {/* Sensitive condition warning */}
          {plan.sensitiveConditionWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <strong>Note:</strong> {plan.sensitiveConditionWarning}
            </div>
          )}

          {/* Day sections */}
          {plan.days.map((day) => (
            <DaySection key={day.dayLabel} day={day} hideCalories={hideCalories} />
          ))}

          {/* Disclaimers */}
          <div className="border-t border-gray-100 pt-4 space-y-1">
            {plan.disclaimers.map((d, i) => (
              <p key={i} className="text-xs text-gray-400">
                {d}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Empty state — no plan generated yet */}
      {!plan && !loading && !error && (
        <div className="bg-white border border-dashed border-gray-200 rounded-lg px-6 py-10 text-center space-y-2">
          <p className="text-gray-700 font-medium">No meal plan generated yet</p>
          <p className="text-sm text-gray-500">
            Choose a plan length above and click <strong>Generate plan</strong> to get
            started. Your profile preferences, allergens, and goals are used automatically.
          </p>
        </div>
      )}
    </div>
  )
}
