'use client'

// app/(app)/log/page.tsx
// Food Log page — two tabs:
//   Tab 1: Search and log foods via USDA FoodData Central
//   Tab 2: Today's check-in — progress against goals + low-intake detection
// Accepts ?fdcId and ?name query params to pre-select a food on mount
// (linked from the "Foods That Fit" page).

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import type { USDAFoodSummary } from '@/types/usda'
import type { NutrientTarget } from '@/types/goals'
import { matchAllergens } from '@/lib/safety/allergens'
import { localDateKey, lastNDateKeys, logRangeQuery } from '@/lib/dates'
import { loadMealPrefill, clearMealPrefill, type MealPrefill } from '@/lib/meal-prefill'
import { nutrientTotal } from '@/lib/summary'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FoodLogEntry {
  id: string
  fdcId: string
  foodName: string
  servingG: number
  loggedAt: string
  nutrients: Record<string, number>
  safetyPassed: boolean
}

interface SavedGoal extends NutrientTarget {
  id: string
  createdAt: string
}

interface ProfileData {
  hideCalories: boolean
  hasEdHistory: boolean
  allergens: string[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find calories from the nutrient map (key contains "Energy", kcal). */
function extractCalories(nutrients: Record<string, number>): number | null {
  const key = Object.keys(nutrients).find(
    (k) => k.includes('Energy') || k.toLowerCase().includes('energy')
  )
  return key !== undefined ? nutrients[key] : null
}

/** Total calories for the day across all logs. */
function totalCaloriesForDay(logs: FoodLogEntry[]): number {
  return logs.reduce((acc, l) => {
    const kcal = extractCalories(l.nutrients)
    return acc + (kcal ?? 0)
  }, 0)
}

/** Progress bar colour based on % of target. */
function barColour(pct: number, hasMax: boolean): string {
  if (hasMax && pct > 100) return 'bg-amber-500'
  if (pct >= 100) return 'bg-green-500'
  return 'bg-blue-500'
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SourceLabel() {
  return (
    <span className="text-xs text-gray-400 ml-1">
      (USDA FoodData Central)
    </span>
  )
}

function WarningCard({ message }: { message: string }) {
  return (
    <div className="rounded bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
      ⚠ {message}
    </div>
  )
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
      ✕ {message}
    </div>
  )
}

// ---------------------------------------------------------------------------
// "Log this meal" hand-off from the meal plan page
// ---------------------------------------------------------------------------

type PrefillStatus = 'pending' | 'logging' | 'logged' | 'error'

interface PrefillRow {
  fdcId: string
  foodName: string
  ingredientName: string
  servingG: number
  include: boolean
  status: PrefillStatus
  message?: string
  warnings: string[]
}

function MealPrefillPanel({
  prefill,
  onItemLogged,
  onClose,
}: {
  prefill: MealPrefill
  onItemLogged: () => Promise<void> | void
  onClose: () => void
}) {
  const [rows, setRows] = useState<PrefillRow[]>(() =>
    prefill.items.map((i) => ({ ...i, include: true, status: 'pending', warnings: [] }))
  )
  const [running, setRunning] = useState(false)

  function patchRow(idx: number, patch: Partial<PrefillRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const toLog = rows.filter((r) => r.include && r.status !== 'logged' && r.servingG > 0)
  const allDone = rows.length > 0 && rows.every((r) => !r.include || r.status === 'logged')

  async function handleLogAll() {
    setRunning(true)
    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx]
      if (!r.include || r.status === 'logged' || r.servingG <= 0) continue
      patchRow(idx, { status: 'logging', message: undefined, warnings: [] })
      try {
        const res = await fetch('/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fdcId: r.fdcId, foodName: r.foodName, servingG: r.servingG }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok) {
          patchRow(idx, { status: 'logged', warnings: data.warnings ?? [] })
        } else {
          patchRow(idx, {
            status: 'error',
            message: data.error ?? 'Could not log this item',
            warnings: data.warnings ?? [],
          })
        }
      } catch {
        patchRow(idx, { status: 'error', message: 'Network error — try again' })
      }
    }
    setRunning(false)
    await onItemLogged()
  }

  useEffect(() => {
    if (allDone) clearMealPrefill()
  }, [allDone])

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-blue-700">From your meal plan</p>
          <h2 className="text-sm font-semibold text-gray-900">{prefill.mealName}</h2>
          <p className="text-xs text-gray-500">Adjust the amounts to what you actually ate, then log.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={running}
          className="text-xs text-gray-500 hover:text-gray-800 disabled:opacity-40"
        >
          {allDone ? 'Close' : 'Dismiss'}
        </button>
      </div>

      <ul className="space-y-2">
        {rows.map((r, idx) => (
          <li key={`${r.fdcId}-${idx}`} className="rounded border border-gray-200 bg-white px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex min-w-0 flex-1 items-center gap-2">
                <input
                  type="checkbox"
                  checked={r.include}
                  disabled={r.status === 'logged' || running}
                  onChange={(e) => patchRow(idx, { include: e.target.checked })}
                  className="h-4 w-4 rounded text-blue-600"
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-gray-900 capitalize">{r.ingredientName}</span>
                  <span className="block truncate text-xs text-gray-500">USDA: {r.foodName}</span>
                </span>
              </label>
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={r.servingG}
                  disabled={r.status === 'logged' || running}
                  onChange={(e) => patchRow(idx, { servingG: Number(e.target.value) })}
                  aria-label={`Grams of ${r.ingredientName}`}
                  className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                />
                g
              </label>
              <span className="w-16 text-right text-xs">
                {r.status === 'logging' && <span className="text-gray-500">Logging…</span>}
                {r.status === 'logged' && <span className="text-green-700">✓ Logged</span>}
                {r.status === 'error' && <span className="text-red-600">Not logged</span>}
              </span>
            </div>
            {r.message && <p className="mt-1 text-xs text-red-600">{r.message}</p>}
            {r.warnings.map((w, i) => (
              <p key={i} className="mt-1 text-xs text-amber-800">⚠ {w}</p>
            ))}
          </li>
        ))}
      </ul>

      {prefill.skipped.length > 0 && (
        <div className="text-xs text-gray-600">
          <p className="font-medium">Not pre-filled — search for these below if you ate them:</p>
          <ul className="mt-1 list-disc pl-5">
            {prefill.skipped.map((s, i) => (
              <li key={i}>
                <span className="capitalize">{s.name}</span> ({s.servingG}g) — {s.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!allDone && (
        <button
          type="button"
          onClick={handleLogAll}
          disabled={running || toLog.length === 0}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        >
          {running ? 'Logging…' : `Log ${toLog.length} item${toLog.length === 1 ? '' : 's'}`}
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 1 — Log food
// ---------------------------------------------------------------------------

function LogFoodTab({
  hideCalories,
  allergens,
  onLogged,
  prefillFdcId,
  prefillName,
  prefillMeal,
}: {
  hideCalories: boolean
  allergens: string[]
  onLogged: () => void
  prefillFdcId?: string
  prefillName?: string
  /** True when arriving via "Log this meal" (/log?prefill=meal) */
  prefillMeal?: boolean
}) {
  const [mealPrefill, setMealPrefill] = useState<MealPrefill | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<USDAFoodSummary[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<USDAFoodSummary | null>(null)
  const [servingG, setServingG] = useState(100)
  const [submitting, setSubmitting] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<FoodLogEntry[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load today's logs
  const loadLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const res = await fetch(`/api/log?${logRangeQuery(localDateKey())}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs ?? [])
      }
    } finally {
      setLogsLoading(false)
    }
  }, [])

  // Read the meal hand-off after mount (sessionStorage isn't available during SSR).
  // It is cleared once everything is logged or the panel is dismissed.
  useEffect(() => {
    if (prefillMeal) setMealPrefill(loadMealPrefill())
  }, [prefillMeal])

  // Pre-select food when navigated here from "Foods That Fit"
  useEffect(() => {
    if (prefillFdcId && prefillName) {
      const synthetic: USDAFoodSummary = {
        fdcId: prefillFdcId,
        description: prefillName,
        dataType: 'Seed Data',
      }
      setSelected(synthetic)
      setQuery(prefillName)
    }
  }, [prefillFdcId, prefillName])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  // Debounced search — 400ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/usda/search?q=${encodeURIComponent(trimmed)}`)
        if (res.ok) {
          const data = await res.json()
          setResults(Array.isArray(data) ? data : [])
        }
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  async function handleLog() {
    if (!selected) return
    setSubmitting(true)
    setWarnings([])
    setError(null)
    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fdcId: selected.fdcId,
          foodName: selected.description,
          servingG,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setWarnings(data.warnings ?? [])
        setSelected(null)
        setQuery('')
        setResults([])
        setServingG(100)
        onLogged()
        await loadLogs()
      } else {
        setError(data.error ?? 'Failed to log food')
        setWarnings(data.warnings ?? [])
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {mealPrefill && (
        <MealPrefillPanel
          prefill={mealPrefill}
          onItemLogged={async () => { onLogged(); await loadLogs() }}
          onClose={() => { clearMealPrefill(); setMealPrefill(null) }}
        />
      )}

      {/* Search box */}
      <div>
        <label htmlFor="food-search" className="block text-sm font-medium text-gray-700 mb-1">
          Search for a food
        </label>
        <input
          id="food-search"
          type="text"
          value={query}
          onChange={(e) => {
            setSelected(null)
            setQuery(e.target.value)
          }}
          placeholder="Search for a food…"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searching && (
          <p className="mt-1 text-xs text-gray-500">Searching…</p>
        )}
      </div>

      {/* Results list */}
      {results.length > 0 && !selected && (
        <ul className="border border-gray-200 rounded divide-y divide-gray-100 max-h-72 overflow-y-auto">
          {results.map((food) => (
            <li key={food.fdcId} className="flex items-center justify-between px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{food.description}</p>
                <span className="inline-block mt-0.5 text-xs rounded bg-gray-100 text-gray-600 px-1.5 py-0.5">
                  {food.dataType}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelected(food)
                  setWarnings([])
                  setError(null)
                }}
                className="ml-3 shrink-0 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add food panel */}
      {selected && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
          <p className="text-sm font-semibold text-gray-900">{selected.description}</p>
          <span className="inline-block text-xs rounded bg-gray-200 text-gray-600 px-1.5 py-0.5">
            {selected.dataType}
          </span>

          <div>
            <label htmlFor="serving-g" className="block text-sm font-medium text-gray-700 mb-1">
              Serving size (g)
            </label>
            <input
              id="serving-g"
              type="number"
              min={1}
              value={servingG}
              onChange={(e) => setServingG(Number(e.target.value))}
              className="w-32 rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Warnings / errors */}
          {error && <ErrorCard message={error} />}
          {warnings.map((w, i) => <WarningCard key={i} message={w} />)}

          <div className="flex gap-2">
            <button
              onClick={handleLog}
              disabled={submitting || servingG <= 0}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Logging…' : 'Log this food'}
            </button>
            <button
              onClick={() => {
                setSelected(null)
                setWarnings([])
                setError(null)
              }}
              className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>

          <p className="text-xs text-gray-400">
            Nutrition data from USDA FoodData Central
          </p>
        </div>
      )}

      {/* Success warnings (after clearing selected) */}
      {!selected && warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => <WarningCard key={i} message={w} />)}
        </div>
      )}

      {/* Today's log */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Today&apos;s log
        </h2>

        {logsLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-500">No foods logged today.</p>
        ) : (
          <div className="border border-gray-200 rounded divide-y divide-gray-100">
            {/* Header */}
            <div className={`grid text-xs font-medium text-gray-500 px-3 py-2 bg-gray-50 ${hideCalories ? 'grid-cols-3' : 'grid-cols-4'}`}>
              <span>Food</span>
              <span>Serving</span>
              {!hideCalories && <span>Energy <SourceLabel /></span>}
              <span>Key nutrients <SourceLabel /></span>
            </div>

            {logs.map((log) => {
              const kcal = extractCalories(log.nutrients)
              const flaggedAllergens = matchAllergens(log.foodName, allergens)
              // Show a few key nutrients
              const keyNutrients: { name: string; value: number; unit: string }[] = []
              const nutrientPriority = [
                'Protein', 'Total lipid (fat)', 'Carbohydrate, by difference',
                'Fiber, total dietary', 'Sodium, Na', 'Iron, Fe',
              ]
              for (const prio of nutrientPriority) {
                const match = Object.entries(log.nutrients).find(([k]) =>
                  k.includes(prio.split(',')[0])
                )
                if (match) {
                  const [name, value] = match
                  keyNutrients.push({ name, value, unit: 'g' })
                  if (keyNutrients.length >= 3) break
                }
              }

              return (
                <div key={log.id} className="px-3 py-2 text-sm">
                  <div className={`grid items-start ${hideCalories ? 'grid-cols-3' : 'grid-cols-4'}`}>
                    <span className="font-medium text-gray-900 truncate pr-2">
                      {log.foodName}
                    </span>
                    <span className="text-gray-600">{log.servingG}g</span>
                    {!hideCalories && (
                      <span className="text-gray-600">
                        {kcal !== null ? `${Math.round(kcal)} kcal` : '—'}
                      </span>
                    )}
                    <span className="text-gray-500 text-xs leading-5">
                      {keyNutrients.length > 0
                        ? keyNutrients.map((n) => `${n.name}: ${n.value.toFixed(1)}`).join(' · ')
                        : '—'}
                    </span>
                  </div>
                  {flaggedAllergens.length > 0 && (
                    <p className="mt-1 inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-800">
                      ⚠ May contain {flaggedAllergens.join(', ')}, which is on your allergen list
                    </p>
                  )}
                </div>
              )
            })}

            {/* Totals row */}
            {!hideCalories && (
              <div className="grid grid-cols-4 px-3 py-2 bg-gray-50 text-sm font-medium text-gray-700">
                <span>Total</span>
                <span>{logs.reduce((a, l) => a + l.servingG, 0).toFixed(0)}g</span>
                <span>{Math.round(totalCaloriesForDay(logs))} kcal <SourceLabel /></span>
                <span />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 2 — Today's check-in
// ---------------------------------------------------------------------------

function CheckInTab({ hideCalories }: { hideCalories: boolean }) {
  const [goals, setGoals] = useState<SavedGoal[]>([])
  const [logs, setLogs] = useState<FoodLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [lowIntakeDays, setLowIntakeDays] = useState(0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const weekKeys = lastNDateKeys(7) // last 7 local days, including today
      try {
        const [goalsRes, logsRes, weekRes] = await Promise.all([
          fetch('/api/goals'),
          fetch(`/api/log?${logRangeQuery(localDateKey())}`),
          fetch(`/api/log?${logRangeQuery(weekKeys[0], weekKeys[weekKeys.length - 1])}`),
        ])
        if (goalsRes.ok) {
          const d = await goalsRes.json()
          setGoals(d.goals ?? [])
        }
        if (logsRes.ok) {
          const d = await logsRes.json()
          setLogs(d.logs ?? [])
        }
        if (weekRes.ok) {
          const d = await weekRes.json()
          const weekLogs: FoodLogEntry[] = d.logs ?? []
          // Group by day and count days where total calories < 1200
          const byDay: Record<string, FoodLogEntry[]> = {}
          for (const entry of weekLogs) {
            const day = localDateKey(new Date(entry.loggedAt)) // local day, not UTC
            if (!byDay[day]) byDay[day] = []
            byDay[day].push(entry)
          }
          let lowDays = 0
          for (const dayLogs of Object.values(byDay)) {
            if (totalCaloriesForDay(dayLogs) < 1200) lowDays++
          }
          setLowIntakeDays(lowDays)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return <p className="text-sm text-gray-500">Loading…</p>
  }

  // Filter out energy/calories goal if hideCalories is true
  const visibleGoals = hideCalories
    ? goals.filter((g) => !['energy', 'calories', 'kcal'].some((kw) => g.nutrient.toLowerCase().includes(kw)))
    : goals

  return (
    <div className="space-y-6">
      {/* Low-intake banner — GUIDELINES §7: supportive only, contains no numbers,
          so it is shown even when calories are hidden (incl. ED history). */}
      {lowIntakeDays >= 3 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          It looks like your intake has been low for a few days. If you&apos;re struggling,
          please reach out to your care team or a support line.
        </div>
      )}

      {visibleGoals.length === 0 ? (
        <p className="text-sm text-gray-500">
          No goals set yet.{' '}
          <a href="/goals" className="text-blue-600 hover:underline">Set goals →</a>
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-gray-400">
            Nutrient totals from USDA FoodData Central
          </p>
          {visibleGoals.map((goal) => {
            // Shared matcher: handles USDA naming (e.g. "Vitamin B-12", "Fatty acids, total saturated")
            const total = nutrientTotal(logs, goal.nutrient) ?? 0

            const target = goal.targetMin ?? goal.targetMax ?? null
            const hasMax = goal.targetMax !== undefined && goal.targetMax !== null
            const pct = target && target > 0 ? Math.min((total / target) * 100, 150) : 0

            const displayName = goal.label ?? goal.nutrient

            return (
              <div key={goal.id} className="space-y-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium text-gray-800">{displayName}</span>
                  <span className="text-gray-500 text-xs">
                    {total.toFixed(1)} / {target !== null ? `${target} ${goal.unit}` : `— ${goal.unit}`}
                    <SourceLabel />
                  </span>
                </div>
                {target !== null && (
                  <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColour(pct, hasMax)}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                )}
                <p className="text-xs text-gray-400">
                  {hasMax ? `Target: ≤ ${goal.targetMax} ${goal.unit}` : goal.targetMin !== undefined && goal.targetMin !== null ? `Target: ≥ ${goal.targetMin} ${goal.unit}` : ''}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page (inner — uses useSearchParams, must be inside Suspense)
// ---------------------------------------------------------------------------

function LogPageInner() {
  const searchParams = useSearchParams()
  const prefillFdcId = searchParams.get('fdcId') ?? undefined
  const prefillName = searchParams.get('name') ?? undefined
  const prefillMeal = searchParams.get('prefill') === 'meal'

  const [tab, setTab] = useState<'log' | 'checkin'>('log')
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [checkInKey, setCheckInKey] = useState(0) // bump to re-fetch check-in after logging

  useEffect(() => {
    fetch('/api/profile/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          setProfile({
            hideCalories: d.profile.hideCalories ?? false,
            hasEdHistory: d.profile.hasEdHistory ?? false,
            allergens: Array.isArray(d.profile.allergens) ? d.profile.allergens : [],
          })
        }
      })
      .catch(() => {/* no-op — profile may not exist yet */})
  }, [])

  // Hide calories if the user set the toggle OR disclosed an ED history
  const hideCalories = (profile?.hideCalories ?? false) || (profile?.hasEdHistory ?? false)
  const allergens = profile?.allergens ?? []

  function handleLogged() {
    // Bump the check-in tab so its data refreshes when user switches to it
    setCheckInKey((k) => k + 1)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Food Log</h1>
      <p className="text-sm text-gray-500 mb-6">
        Search and log foods using USDA FoodData Central.
      </p>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setTab('log')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'log'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Log food
        </button>
        <button
          onClick={() => setTab('checkin')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'checkin'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Today&apos;s check-in
        </button>
      </div>

      {/* Tab content */}
      {tab === 'log' && (
        <LogFoodTab
          hideCalories={hideCalories}
          allergens={allergens}
          onLogged={handleLogged}
          prefillFdcId={prefillFdcId}
          prefillName={prefillName}
          prefillMeal={prefillMeal}
        />
      )}
      {tab === 'checkin' && (
        <CheckInTab key={checkInKey} hideCalories={hideCalories} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page (exported — wraps inner in Suspense required by useSearchParams)
// ---------------------------------------------------------------------------

export default function LogPage() {
  return (
    <Suspense fallback={null}>
      <LogPageInner />
    </Suspense>
  )
}
