'use client'

// components/GoalsEditor.tsx
// Nutrition-goal list + editor, shared by /goals (editing) and /profile (read-only list).
// Goals are deterministic (lib/goals.ts) — no AI. Saves via POST /api/goals,
// which replaces the user's whole goal list.

import { useEffect, useState } from 'react'
import { deriveGoals, suggestGoalsFromHistory } from '@/lib/goals'
import type { NutrientTarget, SuggestedGoal } from '@/types/goals'

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function goalKey(g: NutrientTarget) {
  return g.nutrient.toLowerCase()
}

/** Goals loaded from the DB use null for "no bound"; drafts use undefined. */
function has(n: number | null | undefined): n is number {
  return n !== undefined && n !== null
}

export function hasTarget(goal: NutrientTarget): boolean {
  return has(goal.targetMin) || has(goal.targetMax)
}

export function targetRange(goal: NutrientTarget): string {
  if (has(goal.targetMin) && has(goal.targetMax)) return `${goal.targetMin}–${goal.targetMax} ${goal.unit}`
  if (has(goal.targetMin)) return `≥ ${goal.targetMin} ${goal.unit}`
  if (has(goal.targetMax)) return `≤ ${goal.targetMax} ${goal.unit}`
  return goal.unit
}

export function isCalorieGoal(g: NutrientTarget): boolean {
  const n = g.nutrient.toLowerCase()
  return ['energy', 'calories', 'kcal'].some((kw) => n.includes(kw))
}

export function sourceBadge(source: NutrientTarget['source']) {
  const map: Record<string, string> = {
    GUIDELINES: 'bg-blue-100 text-blue-800',
    CARE_TEAM: 'bg-purple-100 text-purple-800',
    USER_DEFINED: 'bg-green-100 text-green-800',
    CURATED: 'bg-amber-100 text-amber-800',
  }
  const labels: Record<string, string> = {
    GUIDELINES: 'Guidelines',
    CARE_TEAM: 'Care team',
    USER_DEFINED: 'Your goal',
    CURATED: 'Suggested',
  }
  return { cls: map[source] ?? 'bg-gray-100 text-gray-700', label: labels[source] ?? source }
}

/** Target text for display, respecting the hide-calories setting. */
function displayTarget(g: NutrientTarget, hideCalories: boolean): string | null {
  if (!hasTarget(g)) return null
  if (hideCalories && isCalorieGoal(g)) return 'hidden'
  return targetRange(g)
}

// ─── Read-only list ───────────────────────────────────────────────────────────

export function GoalList({ goals, hideCalories }: { goals: NutrientTarget[]; hideCalories: boolean }) {
  if (goals.length === 0) {
    return <p className="text-sm text-gray-400">No goals set yet.</p>
  }
  return (
    <ul className="space-y-2">
      {goals.map((g) => {
        const { cls, label } = sourceBadge(g.source)
        const target = displayTarget(g, hideCalories)
        return (
          <li key={goalKey(g)} className="flex items-center justify-between gap-2 text-sm">
            <span className="capitalize text-gray-800">{g.label ?? g.nutrient}</span>
            <div className="flex items-center gap-2 shrink-0">
              {target && <span className="text-gray-500 text-xs">{target}</span>}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ─── Editor ───────────────────────────────────────────────────────────────────

export interface GoalsEditorProps {
  initialGoals: NutrientTarget[]
  path: 'BEFORE' | 'AFTER'
  careTeamFlags: string[]
  hideCalories: boolean
  /** Called with the saved list after a successful POST /api/goals. */
  onSaved?: (goals: NutrientTarget[]) => void
}

export default function GoalsEditor({
  initialGoals,
  path,
  careTeamFlags,
  hideCalories,
  onSaved,
}: GoalsEditorProps) {
  const [draft, setDraft] = useState<NutrientTarget[]>(initialGoals)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const [goalInput, setGoalInput] = useState('')
  const [goalInputPreview, setGoalInputPreview] = useState<NutrientTarget | null>(null)
  const [suggestText, setSuggestText] = useState('')
  const [suggestions, setSuggestions] = useState<SuggestedGoal[]>([])
  const [suggestChecked, setSuggestChecked] = useState<Set<string>>(new Set())
  const [suggestShown, setSuggestShown] = useState(false)

  useEffect(() => { setDraft(initialGoals) }, [initialGoals])

  // Live preview for the free-text goal input
  useEffect(() => {
    if (!goalInput.trim()) { setGoalInputPreview(null); return }
    const hits = suggestGoalsFromHistory(goalInput)
    setGoalInputPreview(hits.length > 0 ? { ...hits[0], source: 'USER_DEFINED' } : null)
  }, [goalInput])

  const dirty = JSON.stringify(draft.map(goalKey)) !== JSON.stringify(initialGoals.map(goalKey))

  const careTeamGoals = path === 'AFTER'
    ? deriveGoals({ path: 'AFTER', careTeamFlags }).filter((g) => g.source === 'CARE_TEAM')
    : []

  function addGoal(goal: NutrientTarget) {
    setSavedAt(null)
    setDraft((prev) => (prev.some((g) => goalKey(g) === goalKey(goal)) ? prev : [...prev, goal]))
  }

  function removeGoal(key: string) {
    setSavedAt(null)
    setDraft((prev) => prev.filter((g) => goalKey(g) !== key))
  }

  function handleAddGoalInput() {
    if (!goalInput.trim()) return
    addGoal(
      goalInputPreview
        ? { ...goalInputPreview, source: 'USER_DEFINED' }
        : { nutrient: goalInput.trim().toLowerCase(), label: goalInput.trim(), unit: '', source: 'USER_DEFINED' }
    )
    setGoalInput('')
    setGoalInputPreview(null)
  }

  function handleSuggestGoals() {
    const s = suggestGoalsFromHistory(suggestText)
    setSuggestions(s)
    setSuggestChecked(new Set(s.map(goalKey)))
    setSuggestShown(true)
  }

  function handleAddSuggested() {
    suggestions.filter((g) => suggestChecked.has(goalKey(g))).forEach(addGoal)
    setSuggestShown(false)
    setSuggestions([])
    setSuggestChecked(new Set())
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      // Send only the fields the API accepts (drop DB-only id, userId, createdAt)
      const goals = draft.map((g) => ({
        nutrient: g.nutrient,
        targetMin: g.targetMin ?? null,
        targetMax: g.targetMax ?? null,
        unit: g.unit ?? '',
        label: g.label ?? null,
        source: g.source,
      }))
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals }),
      })
      if (!res.ok) throw new Error('Failed to save goals')
      setSavedAt(Date.now())
      onSaved?.(draft)
    } catch {
      setError('Could not save your goals. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Current goals */}
      <section className="bg-white border border-gray-200 rounded-xl px-5 py-4 space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">Your goals ({draft.length})</h2>
        {draft.length === 0 ? (
          <p className="text-sm text-gray-400">No goals yet. Add one below.</p>
        ) : (
          draft.map((g) => {
            const key = goalKey(g)
            const { cls, label } = sourceBadge(g.source)
            const target = displayTarget(g, hideCalories)
            return (
              <div key={key} className="flex items-center justify-between gap-2 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <span className="capitalize font-medium text-gray-800">{g.label ?? g.nutrient}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {target && <span className="text-gray-500 text-xs">{target}</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
                  <button
                    type="button"
                    onClick={() => removeGoal(key)}
                    className="text-gray-400 hover:text-gray-700 px-1"
                    aria-label={`Remove ${g.label ?? g.nutrient}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })
        )}
      </section>

      {/* Add a specific goal */}
      <section className="bg-white border border-gray-200 rounded-xl px-5 py-4 space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">Add a goal</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddGoalInput()}
            placeholder="e.g. eat more iron-rich foods…"
            aria-label="Describe a goal"
            className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button type="button" onClick={handleAddGoalInput} disabled={!goalInput.trim()} className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg disabled:opacity-40 hover:bg-green-700">
            Add
          </button>
        </div>
        {goalInputPreview && (
          <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1">
            Maps to: {goalInputPreview.label ?? goalInputPreview.nutrient} — {targetRange(goalInputPreview)}
          </p>
        )}
      </section>

      {/* Suggestions */}
      <section className="bg-white border border-gray-200 rounded-xl px-5 py-4 space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">Suggest goals for me</h2>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
          Suggestions come from general guidelines — <strong>not medical advice.</strong>
        </p>
        <textarea
          value={suggestText}
          onChange={(e) => setSuggestText(e.target.value)}
          rows={2}
          placeholder="e.g. I've been feeling tired, my doctor mentioned iron…"
          aria-label="Describe what's going on"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
        />
        <button type="button" onClick={handleSuggestGoals} disabled={!suggestText.trim()} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-40">
          Suggest goals
        </button>
        {suggestShown && suggestions.length === 0 && (
          <p className="text-xs text-gray-500">No matching suggestions — try describing it differently, or add a goal above.</p>
        )}
        {suggestShown && suggestions.length > 0 && (
          <div className="space-y-2">
            {suggestions.map((g) => {
              const key = goalKey(g)
              return (
                <label key={key} className="flex items-start gap-2 cursor-pointer bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <input
                    type="checkbox"
                    checked={suggestChecked.has(key)}
                    onChange={() => setSuggestChecked((prev) => {
                      const n = new Set(prev)
                      if (n.has(key)) n.delete(key)
                      else n.add(key)
                      return n
                    })}
                    className="mt-0.5 h-4 w-4 rounded text-green-600"
                  />
                  <div className="text-xs">
                    <span className="font-medium capitalize">{g.label ?? g.nutrient}</span>
                    <span className="text-gray-500 ml-1">— {targetRange(g)}</span>
                    <p className="text-gray-400 mt-0.5">{g.reason}</p>
                  </div>
                </label>
              )
            })}
            <button type="button" onClick={handleAddSuggested} disabled={suggestChecked.size === 0} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg disabled:opacity-40 hover:bg-green-700">
              Add selected
            </button>
          </div>
        )}
      </section>

      {/* Care-team goals (AFTER path) */}
      {careTeamGoals.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-xl px-5 py-4 space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">From what your care team mentioned</h2>
          {careTeamGoals.map((g) => {
            const added = draft.some((d) => goalKey(d) === goalKey(g))
            return (
              <button
                key={goalKey(g)}
                type="button"
                onClick={() => addGoal(g)}
                disabled={added}
                className="w-full flex items-center justify-between text-xs px-3 py-2 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-gray-800 disabled:opacity-50 disabled:cursor-default"
              >
                <span className="capitalize">{g.label ?? g.nutrient}</span>
                <span className="text-gray-500">{added ? 'Added' : targetRange(g)}</span>
              </button>
            )
          })}
        </section>
      )}

      {/* Save bar */}
      <div className="flex items-center justify-end gap-3">
        {error && <p className="text-sm text-red-600 mr-auto">{error}</p>}
        {savedAt && !dirty && <p className="text-sm text-green-700 mr-auto">✓ Goals saved</p>}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save goals'}
        </button>
      </div>
    </div>
  )
}
