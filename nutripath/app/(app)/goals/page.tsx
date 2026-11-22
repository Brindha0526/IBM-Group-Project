'use client'

// app/(app)/goals/page.tsx
// Goals setup page — ST-4.
// Three entry-point cards + current goals list + dietary guidelines baseline.
// No diagnosis language. Source attributions on every suggested goal.
// "Not medical advice" on the history card.

import { useEffect, useState, useCallback } from 'react'
import { deriveGoals, suggestGoalsFromHistory } from '@/lib/goals'
import type { NutrientTarget, SuggestedGoal } from '@/types/goals'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfileData {
  path: 'BEFORE' | 'AFTER'
  careTeamFlags: string[]
  medicalHistory: string | null
}

interface SavedGoal extends NutrientTarget {
  id: string
  createdAt: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sourceLabel(source: NutrientTarget['source']): string {
  switch (source) {
    case 'GUIDELINES':
      return 'Dietary Guidelines'
    case 'CARE_TEAM':
      return 'Care team'
    case 'USER_DEFINED':
      return 'Your goal'
    case 'CURATED':
      return 'Suggested'
  }
}

function sourceBadgeClass(source: NutrientTarget['source']): string {
  switch (source) {
    case 'GUIDELINES':
      return 'bg-blue-100 text-blue-800'
    case 'CARE_TEAM':
      return 'bg-purple-100 text-purple-800'
    case 'USER_DEFINED':
      return 'bg-green-100 text-green-800'
    case 'CURATED':
      return 'bg-amber-100 text-amber-800'
  }
}

function targetRange(goal: NutrientTarget): string {
  if (goal.targetMin !== undefined && goal.targetMax !== undefined) {
    return `${goal.targetMin}–${goal.targetMax} ${goal.unit}`
  }
  if (goal.targetMin !== undefined) return `≥ ${goal.targetMin} ${goal.unit}`
  if (goal.targetMax !== undefined) return `≤ ${goal.targetMax} ${goal.unit}`
  return goal.unit
}

/** Returns a stable key for a goal for de-duplication in the pending list. */
function goalKey(g: NutrientTarget): string {
  return g.nutrient.toLowerCase()
}

// ---------------------------------------------------------------------------
// Free-text → nutrient mapping (card 1)
// Client-side lookup using the same keyword logic as suggestGoalsFromHistory.
// ---------------------------------------------------------------------------

function mapFreeTextToGoal(text: string): NutrientTarget | null {
  if (!text.trim()) return null
  const suggestions = suggestGoalsFromHistory(text)
  if (suggestions.length === 0) return null
  // Return the first (or most relevant) match.
  return suggestions[0]
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function GoalsPage() {
  // ---- Data state ----
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [savedGoals, setSavedGoals] = useState<SavedGoal[]>([])
  const [pendingGoals, setPendingGoals] = useState<NutrientTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // ---- Card 1 state (specific goal) ----
  const [card1Text, setCard1Text] = useState('')
  const [card1Preview, setCard1Preview] = useState<NutrientTarget | null>(null)
  const [card1IsNote, setCard1IsNote] = useState(false)

  // ---- Card 2 state (history / help me) ----
  const [card2Text, setCard2Text] = useState('')
  const [card2Suggestions, setCard2Suggestions] = useState<SuggestedGoal[]>([])
  const [card2Checked, setCard2Checked] = useState<Set<string>>(new Set())
  const [card2Shown, setCard2Shown] = useState(false)

  // ---- Card 3 state (care-team flags, AFTER path only) ----
  const [card3Goals, setCard3Goals] = useState<NutrientTarget[]>([])
  const [card3Checked, setCard3Checked] = useState<Set<string>>(new Set())

  // ---- Dietary Guidelines baseline collapsible ----
  const [guidelinesOpen, setGuidelinesOpen] = useState(false)

  // ---------------------------------------------------------------------------
  // Load profile + existing goals on mount
  // ---------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [profileRes, goalsRes] = await Promise.all([
        fetch('/api/profile/me'),
        fetch('/api/goals'),
      ])

      if (profileRes.ok) {
        const { profile: p } = await profileRes.json()
        if (p) {
          const profileData: ProfileData = {
            path: p.path,
            careTeamFlags: p.careTeamFlags ?? [],
            medicalHistory: p.medicalHistory ?? null,
          }
          setProfile(profileData)
          setCard2Text(p.medicalHistory ?? '')

          // Pre-compute care-team goals for card 3
          if (p.path === 'AFTER') {
            const all = deriveGoals(profileData)
            setCard3Goals(all.filter((g) => g.source === 'CARE_TEAM'))
          }
        }
      }

      if (goalsRes.ok) {
        const { goals } = await goalsRes.json()
        setSavedGoals(goals ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ---------------------------------------------------------------------------
  // Card 1 — live preview as the user types
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!card1Text.trim()) {
      setCard1Preview(null)
      setCard1IsNote(false)
      return
    }
    const matched = mapFreeTextToGoal(card1Text)
    if (matched) {
      setCard1Preview({ ...matched, source: 'USER_DEFINED' })
      setCard1IsNote(false)
    } else {
      setCard1Preview(null)
      setCard1IsNote(true)
    }
  }, [card1Text])

  function handleCard1Add() {
    if (!card1Text.trim()) return

    if (card1Preview) {
      addToPending(card1Preview)
    } else {
      // Save as a label-only goal (no numeric target)
      addToPending({
        nutrient: card1Text.trim().toLowerCase(),
        label: card1Text.trim(),
        unit: '',
        source: 'USER_DEFINED',
      })
    }
    setCard1Text('')
    setCard1Preview(null)
    setCard1IsNote(false)
  }

  // ---------------------------------------------------------------------------
  // Card 2 — medical history → suggestions
  // ---------------------------------------------------------------------------

  function handleCard2Suggest() {
    const suggestions = suggestGoalsFromHistory(card2Text)
    setCard2Suggestions(suggestions)
    setCard2Checked(new Set(suggestions.map((g) => goalKey(g))))
    setCard2Shown(true)
  }

  function toggleCard2(key: string) {
    setCard2Checked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleCard2AddSelected() {
    const toAdd = card2Suggestions.filter((g) => card2Checked.has(goalKey(g)))
    toAdd.forEach(addToPending)
    setCard2Shown(false)
    setCard2Suggestions([])
    setCard2Checked(new Set())
  }

  // ---------------------------------------------------------------------------
  // Card 3 — care-team derived goals
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // Pre-check all care-team goals
    setCard3Checked(new Set(card3Goals.map((g) => goalKey(g))))
  }, [card3Goals])

  function toggleCard3(key: string) {
    setCard3Checked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleCard3AddSelected() {
    const toAdd = card3Goals.filter((g) => card3Checked.has(goalKey(g)))
    toAdd.forEach(addToPending)
  }

  // ---------------------------------------------------------------------------
  // Pending goals management
  // ---------------------------------------------------------------------------

  function addToPending(goal: NutrientTarget) {
    setPendingGoals((prev) => {
      const key = goalKey(goal)
      const exists = prev.some((g) => goalKey(g) === key)
      if (exists) return prev
      return [...prev, goal]
    })
  }

  function removePending(key: string) {
    setPendingGoals((prev) => prev.filter((g) => goalKey(g) !== key))
  }

  // ---------------------------------------------------------------------------
  // Combined list (saved + pending, pending takes precedence for display)
  // ---------------------------------------------------------------------------

  const allGoals: NutrientTarget[] = [
    ...savedGoals.filter(
      (sg) => !pendingGoals.some((pg) => goalKey(pg) === goalKey(sg))
    ),
    ...pendingGoals,
  ]

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  async function handleSave() {
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals: allGoals }),
      })
      if (res.ok) {
        setSaveStatus('saved')
        setPendingGoals([])
        await loadData()
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        setSaveStatus('error')
      }
    } catch {
      setSaveStatus('error')
    }
  }

  // ---------------------------------------------------------------------------
  // Dietary Guidelines baseline list
  // ---------------------------------------------------------------------------

  const guidelinesGoals = profile
    ? deriveGoals({ path: profile.path, careTeamFlags: [] }).filter(
        (g) => g.source === 'GUIDELINES'
      )
    : deriveGoals({ path: 'BEFORE', careTeamFlags: [] }).filter(
        (g) => g.source === 'GUIDELINES'
      )

  function addGuidelineGoal(goal: NutrientTarget) {
    addToPending({ ...goal })
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="p-6 text-gray-500 text-sm">Loading your goals…</div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Your Goals</h1>
        <p className="mt-1 text-sm text-gray-500">
          Set nutrition goals that work for you. You can add, edit, or remove goals at any time.
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Entry-point cards                                                   */}
      {/* ------------------------------------------------------------------ */}

      {/* Card 1 — specific goal */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            I have a specific goal
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Type what you'd like to work on and we'll map it to a nutrient target.
          </p>
        </div>

        <input
          type="text"
          value={card1Text}
          onChange={(e) => setCard1Text(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCard1Add()}
          placeholder="e.g. eat more iron-rich foods, reduce salt intake…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Preview */}
        {card1Preview && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-900">
            We'll add a goal to reach{' '}
            <strong>{targetRange(card1Preview)}</strong> of{' '}
            <strong>{card1Preview.label ?? card1Preview.nutrient}</strong> per day.
          </div>
        )}
        {card1IsNote && card1Text.trim() && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-600">
            We'll add this as a note to your profile goals.
          </div>
        )}

        <button
          onClick={handleCard1Add}
          disabled={!card1Text.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          Add this goal
        </button>
      </section>

      {/* Card 2 — help me */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            I'm not sure — help me
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Describe your health context (optional) and we'll suggest goals based on
            general guidelines.
          </p>
        </div>

        {/* Always-visible disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          These suggestions come from general guidelines — not a diagnosis.{' '}
          <strong>Not medical advice.</strong>
        </div>

        <textarea
          value={card2Text}
          onChange={(e) => setCard2Text(e.target.value)}
          rows={4}
          placeholder="e.g. I've been feeling tired, my doctor mentioned my iron. I have a family history of high cholesterol…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />

        <button
          onClick={handleCard2Suggest}
          disabled={!card2Text.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          Suggest goals
        </button>

        {card2Shown && card2Suggestions.length === 0 && (
          <p className="text-sm text-gray-500">
            No matching suggestions found. Try describing specific health areas like
            digestion, heart health, or bone health.
          </p>
        )}

        {card2Shown && card2Suggestions.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">
              Select the goals you'd like to add:
            </p>
            {card2Suggestions.map((goal) => {
              const key = goalKey(goal)
              return (
                <label
                  key={key}
                  className="flex items-start gap-3 cursor-pointer bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-100"
                >
                  <input
                    type="checkbox"
                    checked={card2Checked.has(key)}
                    onChange={() => toggleCard2(key)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <div className="text-sm">
                    <span className="font-medium text-gray-900 capitalize">
                      {goal.label ?? goal.nutrient}
                    </span>
                    <span className="text-gray-500 ml-1">
                      — {targetRange(goal)}
                    </span>
                    <p className="text-gray-500 mt-0.5">{goal.reason}</p>
                  </div>
                </label>
              )
            })}

            <button
              onClick={handleCard2AddSelected}
              disabled={card2Checked.size === 0}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-40 hover:bg-blue-700 transition-colors"
            >
              Add selected goals
            </button>
          </div>
        )}
      </section>

      {/* Card 3 — care-team flags (AFTER path only) */}
      {profile?.path === 'AFTER' && card3Goals.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Use my care-team advice
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Based on what your care team mentioned, here are suggested goals.
              Select the ones you'd like to track.
            </p>
          </div>

          <div className="space-y-3">
            {card3Goals.map((goal) => {
              const key = goalKey(goal)
              return (
                <label
                  key={key}
                  className="flex items-start gap-3 cursor-pointer bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 hover:bg-purple-100"
                >
                  <input
                    type="checkbox"
                    checked={card3Checked.has(key)}
                    onChange={() => toggleCard3(key)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600"
                  />
                  <div className="text-sm">
                    <span className="font-medium text-gray-900 capitalize">
                      {goal.label ?? goal.nutrient}
                    </span>
                    <span className="text-gray-500 ml-1">
                      — {targetRange(goal)}
                    </span>
                  </div>
                </label>
              )
            })}
          </div>

          <button
            onClick={handleCard3AddSelected}
            disabled={card3Checked.size === 0}
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg disabled:opacity-40 hover:bg-purple-700 transition-colors"
          >
            Add selected goals
          </button>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Current goals list                                                  */}
      {/* ------------------------------------------------------------------ */}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Your current goals</h2>
          {pendingGoals.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
              {pendingGoals.length} unsaved
            </span>
          )}
        </div>

        {allGoals.length === 0 ? (
          <p className="text-sm text-gray-500">
            No goals set yet. Use the cards above to add your first goal.
          </p>
        ) : (
          <ul className="space-y-2">
            {allGoals.map((goal) => {
              const key = goalKey(goal)
              const isPending = pendingGoals.some((g) => goalKey(g) === key)
              return (
                <li
                  key={key}
                  className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border ${
                    isPending
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {goal.label ?? goal.nutrient}
                    </span>
                    {(goal.targetMin !== undefined || goal.targetMax !== undefined) && (
                      <span className="text-sm text-gray-500 ml-1">
                        — {targetRange(goal)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${sourceBadgeClass(goal.source)}`}
                    >
                      {sourceLabel(goal.source)}
                    </span>
                    {isPending && (
                      <button
                        onClick={() => removePending(key)}
                        aria-label={`Remove ${goal.nutrient} goal`}
                        className="text-gray-400 hover:text-red-500 transition-colors text-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {/* Save button */}
        {allGoals.length > 0 && (
          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors"
            >
              {saveStatus === 'saving' ? 'Saving…' : 'Save goals'}
            </button>
            {saveStatus === 'saved' && (
              <span className="ml-3 text-sm text-green-600">Goals saved.</span>
            )}
            {saveStatus === 'error' && (
              <span className="ml-3 text-sm text-red-600">
                Something went wrong. Please try again.
              </span>
            )}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Dietary Guidelines baseline — collapsible                           */}
      {/* ------------------------------------------------------------------ */}

      <section className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setGuidelinesOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 text-left transition-colors"
          aria-expanded={guidelinesOpen}
        >
          <span className="text-sm font-semibold text-gray-700">
            Dietary Guidelines baseline (2020–2025)
          </span>
          <span className="text-gray-400 text-sm">{guidelinesOpen ? '▲' : '▼'}</span>
        </button>

        {guidelinesOpen && (
          <div className="px-5 pb-5 pt-3 bg-white space-y-2">
            <p className="text-xs text-gray-500 mb-3">
              These are the recommended daily targets for a 2,000 kcal adult diet from the
              Dietary Guidelines for Americans 2020–2025 (dietaryguidelines.gov). Click any
              item to add it to your goals.
            </p>
            <ul className="space-y-1">
              {guidelinesGoals.map((goal) => (
                <li key={goal.nutrient}>
                  <button
                    onClick={() => addGuidelineGoal(goal)}
                    className="w-full flex items-center justify-between text-sm px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 text-gray-700 transition-colors text-left"
                  >
                    <span className="capitalize">{goal.label ?? goal.nutrient}</span>
                    <span className="text-gray-400 ml-2 shrink-0">{targetRange(goal)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}
