'use client'

// components/ProfileWizard.tsx
// Shared multi-step wizard used by both /onboarding (first time) and
// /profile (edit mode). Collects profile + goals and calls onSave when done.

import { useState, useEffect } from 'react'
import TagInput from '@/components/TagInput'
import { deriveGoals, suggestGoalsFromHistory } from '@/lib/goals'
import type { NutrientTarget, SuggestedGoal } from '@/types/goals'

// ─── Types ────────────────────────────────────────────────────────────────────

type Path = 'BEFORE' | 'AFTER'

export interface WizardProfile {
  path: Path
  budget: string
  schedule: string
  cuisines: string[]
  religiousRules: string[]
  preferences: string[]
  allergens: string[]
  medications: string[]
  medicalHistory: string
  careTeamFlags: string[]
  isPregnant: boolean
  hasKidneyDisease: boolean
  takesInsulin: boolean
  hasEdHistory: boolean
  hideCalories: boolean
}

export interface WizardResult {
  profile: WizardProfile
  goals: NutrientTarget[]
}

export interface ProfileWizardProps {
  /** Pre-fill the wizard with existing data (edit mode). */
  initialProfile?: Partial<WizardProfile>
  initialGoals?: NutrientTarget[]
  /** Called when the user completes the wizard and clicks Save. */
  onSave: (result: WizardResult) => Promise<void>
  /** Label for the final save button. */
  saveLabel?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLERGENS = [
  { value: 'milk', label: 'Milk' },
  { value: 'eggs', label: 'Eggs' },
  { value: 'fish', label: 'Fish' },
  { value: 'crustacean shellfish', label: 'Crustacean shellfish' },
  { value: 'tree nuts', label: 'Tree nuts' },
  { value: 'peanuts', label: 'Peanuts' },
  { value: 'wheat', label: 'Wheat' },
  { value: 'soybeans', label: 'Soybeans' },
  { value: 'sesame', label: 'Sesame' },
] as const

const CARE_TEAM_FLAGS = [
  { value: 'LOW_IRON', label: 'Your care team mentioned your iron levels' },
  { value: 'LOW_VITAMIN_D', label: 'Your care team mentioned your vitamin D levels' },
  { value: 'LOW_B12', label: 'Your care team mentioned your B12 levels' },
  { value: 'HIGH_CHOLESTEROL', label: 'Your care team mentioned your cholesterol' },
  { value: 'HIGH_BLOOD_SUGAR', label: 'Your care team mentioned your blood sugar' },
  { value: 'HIGH_BLOOD_PRESSURE', label: 'Your care team mentioned your blood pressure' },
] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
}

function goalKey(g: NutrientTarget) {
  return g.nutrient.toLowerCase()
}

function targetRange(goal: NutrientTarget): string {
  if (goal.targetMin !== undefined && goal.targetMax !== undefined) {
    return `${goal.targetMin}–${goal.targetMax} ${goal.unit}`
  }
  if (goal.targetMin !== undefined) return `≥ ${goal.targetMin} ${goal.unit}`
  if (goal.targetMax !== undefined) return `≤ ${goal.targetMax} ${goal.unit}`
  return goal.unit
}

// Steps:
// BEFORE: 1=path  2=lifestyle  3=allergens  4=medications  5=sensitive  6=goals  7=review
// AFTER:  1=path  2=lifestyle  3=care-team  4=allergens    5=medications 6=sensitive 7=goals 8=review
function totalSteps(path: Path | null) {
  return path === 'AFTER' ? 8 : 7
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ step, path }: { step: number; path: Path | null }) {
  return (
    <p className="mb-6 text-sm font-medium text-gray-500">
      Step {step} of {totalSteps(path)}
    </p>
  )
}

function NavButtons({
  step,
  onBack,
  onContinue,
  continueLabel,
  continueDisabled,
  loading,
}: {
  step: number
  onBack: () => void
  onContinue: () => void
  continueLabel?: string
  continueDisabled?: boolean
  loading?: boolean
}) {
  return (
    <div className="mt-8 flex items-center justify-between">
      {step > 1 ? (
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onContinue}
        disabled={continueDisabled || loading}
        className="rounded-md bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40"
      >
        {loading ? 'Saving…' : (continueLabel ?? 'Continue')}
      </button>
    </div>
  )
}

function SensitiveQuestion({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-gray-700">{label}</span>
        <div className="flex gap-3">
          {(['Yes', 'No'] as const).map((opt) => (
            <label key={opt} className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                checked={opt === 'Yes' ? checked : !checked}
                onChange={() => onChange(opt === 'Yes')}
                name={label}
                className="h-4 w-4 border-gray-300 text-green-600"
              />
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      </div>
      {checked && (
        <p className="mt-2 text-xs text-green-700 bg-green-50 rounded px-3 py-2">
          We'll show you general suggestions and recommend speaking with your care team.
        </p>
      )}
    </div>
  )
}

// ─── Goals step inner component ───────────────────────────────────────────────

function GoalsStep({
  path,
  careTeamFlags,
  pendingGoals,
  setPendingGoals,
  onBack,
  onContinue,
}: {
  path: Path
  careTeamFlags: string[]
  pendingGoals: NutrientTarget[]
  setPendingGoals: React.Dispatch<React.SetStateAction<NutrientTarget[]>>
  onBack: () => void
  onContinue: () => void
}) {
  const [card1Text, setCard1Text] = useState('')
  const [card1Preview, setCard1Preview] = useState<NutrientTarget | null>(null)
  const [card2Text, setCard2Text] = useState('')
  const [card2Suggestions, setCard2Suggestions] = useState<SuggestedGoal[]>([])
  const [card2Checked, setCard2Checked] = useState<Set<string>>(new Set())
  const [card2Shown, setCard2Shown] = useState(false)
  const [guidelinesOpen, setGuidelinesOpen] = useState(false)

  // Care-team derived goals (AFTER path only)
  const careTeamGoals =
    path === 'AFTER'
      ? deriveGoals({ path: 'AFTER', careTeamFlags }).filter((g) => g.source === 'CARE_TEAM')
      : []
  const [ctChecked, setCtChecked] = useState<Set<string>>(
    new Set(careTeamGoals.map((g) => goalKey(g)))
  )

  const guidelinesGoals = deriveGoals({ path, careTeamFlags: [] }).filter(
    (g) => g.source === 'GUIDELINES'
  )

  // Live preview for card1
  useEffect(() => {
    if (!card1Text.trim()) { setCard1Preview(null); return }
    const hits = suggestGoalsFromHistory(card1Text)
    setCard1Preview(hits.length > 0 ? { ...hits[0], source: 'USER_DEFINED' } : null)
  }, [card1Text])

  function addToPending(goal: NutrientTarget) {
    setPendingGoals((prev) => {
      const key = goalKey(goal)
      return prev.some((g) => goalKey(g) === key) ? prev : [...prev, goal]
    })
  }

  function removeFromPending(key: string) {
    setPendingGoals((prev) => prev.filter((g) => goalKey(g) !== key))
  }

  function handleCard1Add() {
    if (!card1Text.trim()) return
    addToPending(
      card1Preview
        ? { ...card1Preview, source: 'USER_DEFINED' }
        : { nutrient: card1Text.trim().toLowerCase(), label: card1Text.trim(), unit: '', source: 'USER_DEFINED' }
    )
    setCard1Text('')
    setCard1Preview(null)
  }

  function handleSuggest() {
    const suggestions = suggestGoalsFromHistory(card2Text)
    setCard2Suggestions(suggestions)
    setCard2Checked(new Set(suggestions.map((g) => goalKey(g))))
    setCard2Shown(true)
  }

  function handleAddSuggested() {
    card2Suggestions.filter((g) => card2Checked.has(goalKey(g))).forEach(addToPending)
    setCard2Shown(false)
    setCard2Suggestions([])
    setCard2Checked(new Set())
  }

  function handleAddCareTeam() {
    careTeamGoals.filter((g) => ctChecked.has(goalKey(g))).forEach(addToPending)
  }

  const stepNum = path === 'AFTER' ? 7 : 6

  return (
    <div>
      <StepIndicator step={stepNum} path={path} />
      <h1 className="text-2xl font-bold text-gray-900">Your Goals</h1>
      <p className="mt-2 text-gray-500 text-sm">
        Set nutrition goals that work for you. You can skip this and add goals later.
      </p>

      <div className="mt-6 space-y-5">
        {/* Card 1 — specific goal */}
        <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">I have a specific goal</h2>
          <input
            type="text"
            value={card1Text}
            onChange={(e) => setCard1Text(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCard1Add()}
            placeholder="e.g. eat more iron-rich foods, reduce salt intake…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {card1Preview && (
            <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
              Maps to: {card1Preview.label ?? card1Preview.nutrient} — {targetRange(card1Preview)}
            </p>
          )}
          <button
            type="button"
            onClick={handleCard1Add}
            disabled={!card1Text.trim()}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg disabled:opacity-40 hover:bg-green-700"
          >
            Add goal
          </button>
        </section>

        {/* Card 2 — help me suggest */}
        <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Help me choose</h2>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            Suggestions come from general guidelines — not a diagnosis. <strong>Not medical advice.</strong>
          </p>
          <textarea
            value={card2Text}
            onChange={(e) => setCard2Text(e.target.value)}
            rows={3}
            placeholder="e.g. I've been feeling tired, my doctor mentioned my iron…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
          <button
            type="button"
            onClick={handleSuggest}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
          >
            Suggest goals
          </button>

          {card2Shown && card2Suggestions.length > 0 && (
            <div className="space-y-2">
              {card2Suggestions.map((goal) => {
                const key = goalKey(goal)
                return (
                  <label key={key} className="flex items-start gap-2 cursor-pointer bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <input
                      type="checkbox"
                      checked={card2Checked.has(key)}
                      onChange={() => setCard2Checked((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600"
                    />
                    <div className="text-xs">
                      <span className="font-medium text-gray-900 capitalize">{goal.label ?? goal.nutrient}</span>
                      <span className="text-gray-500 ml-1">— {targetRange(goal)}</span>
                      <p className="text-gray-400 mt-0.5">{goal.reason}</p>
                    </div>
                  </label>
                )
              })}
              <button
                type="button"
                onClick={handleAddSuggested}
                disabled={card2Checked.size === 0}
                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg disabled:opacity-40 hover:bg-green-700"
              >
                Add selected
              </button>
            </div>
          )}
        </section>

        {/* Card 3 — care-team flags (AFTER path only) */}
        {path === 'AFTER' && careTeamGoals.length > 0 && (
          <section className="bg-white border border-purple-200 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">From your care team</h2>
            <p className="text-xs text-gray-500">Based on what you told us your care team mentioned.</p>
            <div className="space-y-2">
              {careTeamGoals.map((goal) => {
                const key = goalKey(goal)
                return (
                  <label key={key} className="flex items-start gap-2 cursor-pointer bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                    <input
                      type="checkbox"
                      checked={ctChecked.has(key)}
                      onChange={() => setCtChecked((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600"
                    />
                    <div className="text-xs">
                      <span className="font-medium text-gray-900 capitalize">{goal.label ?? goal.nutrient}</span>
                      <span className="text-gray-500 ml-1">— {targetRange(goal)}</span>
                    </div>
                  </label>
                )
              })}
            </div>
            <button
              type="button"
              onClick={handleAddCareTeam}
              disabled={ctChecked.size === 0}
              className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg disabled:opacity-40 hover:bg-purple-700"
            >
              Add selected
            </button>
          </section>
        )}

        {/* Dietary Guidelines baseline */}
        <section className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setGuidelinesOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
          >
            <span className="text-xs font-semibold text-gray-700">Dietary Guidelines baseline (2020–2025)</span>
            <span className="text-gray-400 text-xs">{guidelinesOpen ? '▲' : '▼'}</span>
          </button>
          {guidelinesOpen && (
            <div className="px-4 pb-4 pt-2 bg-white space-y-1">
              <p className="text-xs text-gray-500 mb-2">Click any item to add it to your goals.</p>
              {guidelinesGoals.map((goal) => (
                <button
                  key={goal.nutrient}
                  type="button"
                  onClick={() => addToPending({ ...goal })}
                  className="w-full flex items-center justify-between text-xs px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 text-gray-700"
                >
                  <span className="capitalize">{goal.label ?? goal.nutrient}</span>
                  <span className="text-gray-400 ml-2 shrink-0">{targetRange(goal)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Pending goals list */}
        {pendingGoals.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700">Goals to save ({pendingGoals.length}):</p>
            <ul className="space-y-1">
              {pendingGoals.map((goal) => (
                <li key={goalKey(goal)} className="flex items-center justify-between text-xs bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <span className="capitalize font-medium text-gray-900">{goal.label ?? goal.nutrient}</span>
                  <div className="flex items-center gap-2">
                    {(goal.targetMin !== undefined || goal.targetMax !== undefined) && (
                      <span className="text-gray-500">{targetRange(goal)}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFromPending(goalKey(goal))}
                      className="text-gray-400 hover:text-red-500"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <NavButtons step={stepNum} onBack={onBack} onContinue={onContinue} continueLabel="Review & save" />
    </div>
  )
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

const BLANK: WizardProfile = {
  path: 'BEFORE',
  budget: '',
  schedule: '',
  cuisines: [],
  religiousRules: [],
  preferences: [],
  allergens: [],
  medications: [],
  medicalHistory: '',
  careTeamFlags: [],
  isPregnant: false,
  hasKidneyDisease: false,
  takesInsulin: false,
  hasEdHistory: false,
  hideCalories: false,
}

export default function ProfileWizard({
  initialProfile,
  initialGoals = [],
  onSave,
  saveLabel = 'Save my profile',
}: ProfileWizardProps) {
  const [step, setStep] = useState(initialProfile ? 2 : 1)
  const [profile, setProfile] = useState<WizardProfile>({ ...BLANK, ...initialProfile })
  const [pendingGoals, setPendingGoals] = useState<NutrientTarget[]>(initialGoals)
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function update(patch: Partial<WizardProfile>) {
    setProfile((prev) => ({ ...prev, ...patch }))
  }

  const isAfter = profile.path === 'AFTER'
  const last = totalSteps(profile.path)

  // ── Step routing ─────────────────────────────────────────────────────────────
  // BEFORE: 1=path  2=lifestyle  3=allergens  4=medications  5=sensitive  6=goals  7=review
  // AFTER:  1=path  2=lifestyle  3=care-team  4=allergens    5=medications 6=sensitive 7=goals 8=review

  function goBack() { setStep((s) => s - 1) }
  function goNext() { setStep((s) => s + 1) }
  function selectPath(p: Path) { setProfile((prev) => ({ ...prev, path: p })); setStep(2) }

  async function handleSave() {
    setLoading(true)
    setSaveError(null)
    try {
      await onSave({ profile, goals: pendingGoals })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Goals step index
  const goalsStep = isAfter ? 7 : 6
  const reviewStep = last

  // ── Allergen toggle helper ────────────────────────────────────────────────────
  function toggleAllergen(val: string) {
    update({ allergens: toggleItem(profile.allergens, val) })
  }
  function toggleCareTeamFlag(val: string) {
    update({ careTeamFlags: toggleItem(profile.careTeamFlags, val) })
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">

      {/* Step 1 — Path selection */}
      {step === 1 && (
        <div>
          <StepIndicator step={1} path={null} />
          <h1 className="text-2xl font-bold text-gray-900">Where are you in your journey?</h1>
          <p className="mt-2 text-gray-500">Choose the option that best describes you right now.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {([
              { p: 'BEFORE' as Path, icon: '🌱', title: 'Before my visit', desc: 'I want to build healthy habits and find a dietitian' },
              { p: 'AFTER' as Path, icon: '📋', title: 'After my visit', desc: 'My care team gave me specific guidance to follow' },
            ]).map(({ p, icon, title, desc }) => (
              <button
                key={p}
                type="button"
                onClick={() => selectPath(p)}
                className={`rounded-xl border-2 p-6 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  profile.path === p ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="text-3xl">{icon}</div>
                <h2 className="mt-3 text-lg font-semibold text-gray-900">{title}</h2>
                <p className="mt-1 text-sm text-gray-500">{desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2 — Lifestyle (both paths) */}
      {step === 2 && (
        <div>
          <StepIndicator step={2} path={profile.path} />
          <h1 className="text-2xl font-bold text-gray-900">Your lifestyle</h1>
          <p className="mt-2 text-gray-500">Help us tailor food ideas that fit your everyday life.</p>
          <div className="mt-6 space-y-6">
            <fieldset>
              <legend className="text-sm font-medium text-gray-700">What's your food budget like?</legend>
              <div className="mt-2 space-y-2">
                {[{ value: 'flexible', label: 'Flexible' }, { value: 'moderate', label: 'Moderate' }, { value: 'budget_conscious', label: 'Budget-conscious' }].map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="budget" value={value} checked={profile.budget === value} onChange={() => update({ budget: value })} className="h-4 w-4 border-gray-300 text-green-600" />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-medium text-gray-700">How much time do you usually have to cook?</legend>
              <div className="mt-2 space-y-2">
                {[{ value: 'plenty', label: 'Plenty of time' }, { value: 'moderate', label: 'Moderate' }, { value: 'very_busy', label: 'Very busy' }].map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="schedule" value={value} checked={profile.schedule === value} onChange={() => update({ schedule: value })} className="h-4 w-4 border-gray-300 text-green-600" />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <TagInput label="What cuisines or cultural foods do you enjoy?" tags={profile.cuisines} onChange={(cuisines) => update({ cuisines })} placeholder="e.g. Caribbean, Korean, Ethiopian…" />
            <TagInput label="Any religious or ethical food guidelines?" tags={profile.religiousRules} onChange={(religiousRules) => update({ religiousRules })} placeholder="e.g. halal, kosher, vegan…" />
            <TagInput label="Any other food preferences?" tags={profile.preferences} onChange={(preferences) => update({ preferences })} placeholder="e.g. no mushrooms, prefer spicy…" />
          </div>
          <NavButtons step={2} onBack={goBack} onContinue={goNext} />
        </div>
      )}

      {/* Step 3 (AFTER only) — Care-team flags */}
      {step === 3 && isAfter && (
        <div>
          <StepIndicator step={3} path={profile.path} />
          <h1 className="text-2xl font-bold text-gray-900">What did your care team mention?</h1>
          <p className="mt-2 text-gray-500">Select everything that applies. You can always update this later.</p>
          <div className="mt-6 space-y-3">
            {CARE_TEAM_FLAGS.map(({ value, label }) => (
              <label key={value} className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={profile.careTeamFlags.includes(value)} onChange={() => toggleCareTeamFlag(value)} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600" />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-400">Not medical advice. We use this to tailor your food suggestions.</p>
          <NavButtons step={3} onBack={goBack} onContinue={goNext} />
        </div>
      )}

      {/* Allergens */}
      {((step === 3 && !isAfter) || (step === 4 && isAfter)) && (
        <div>
          <StepIndicator step={isAfter ? 4 : 3} path={profile.path} />
          <h1 className="text-2xl font-bold text-gray-900">Do you have any food allergies?</h1>
          <div className="mt-6 space-y-3">
            {ALLERGENS.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={profile.allergens.includes(value)} onChange={() => toggleAllergen(value)} className="h-4 w-4 rounded border-gray-300 text-green-600" />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-400">We'll make sure none of your plans or suggestions include these.</p>
          <NavButtons step={isAfter ? 4 : 3} onBack={goBack} onContinue={goNext} />
        </div>
      )}

      {/* Medications */}
      {((step === 4 && !isAfter) || (step === 5 && isAfter)) && (
        <div>
          <StepIndicator step={isAfter ? 5 : 4} path={profile.path} />
          <h1 className="text-2xl font-bold text-gray-900">Are you taking any medications?</h1>
          <p className="mt-2 text-gray-500">This helps us flag potential food interactions. We'll always tell you to check with your pharmacist.</p>
          <div className="mt-6 space-y-6">
            <div>
              <TagInput label="Medications" tags={profile.medications} onChange={(medications) => update({ medications })} placeholder="Type a medication name and press Enter…" />
              <p className="mt-2 text-xs text-gray-400">We use this only to flag possible food interactions. Always check with your pharmacist.</p>
            </div>
            <div>
              <label htmlFor="medHistory" className="block text-sm font-medium text-gray-700">Medical history <span className="font-normal text-gray-400">(optional)</span></label>
              <p className="mt-1 text-xs text-gray-500">Describe anything relevant — we'll use this to suggest helpful goals on the next screen.</p>
              <textarea
                id="medHistory"
                rows={4}
                value={profile.medicalHistory}
                onChange={(e) => update({ medicalHistory: e.target.value })}
                placeholder="e.g. 'I have anaemia and was recently told my vitamin D is low'"
                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
          </div>
          <NavButtons step={isAfter ? 5 : 4} onBack={goBack} onContinue={goNext} />
        </div>
      )}

      {/* Sensitive flags */}
      {((step === 5 && !isAfter) || (step === 6 && isAfter)) && (
        <div>
          <StepIndicator step={isAfter ? 6 : 5} path={profile.path} />
          <h1 className="text-2xl font-bold text-gray-900">A few more details to keep you safe</h1>
          <p className="mt-2 text-gray-500">Your answers help us give you suggestions that are right for your situation.</p>
          <div className="mt-6 space-y-4">
            <SensitiveQuestion label="Are you currently pregnant or breastfeeding?" checked={profile.isPregnant} onChange={(val) => update({ isPregnant: val })} />
            <SensitiveQuestion label="Do you have kidney disease?" checked={profile.hasKidneyDisease} onChange={(val) => update({ hasKidneyDisease: val })} />
            <SensitiveQuestion label="Do you take insulin?" checked={profile.takesInsulin} onChange={(val) => update({ takesInsulin: val })} />
            <SensitiveQuestion label="Do you have a history of disordered eating?" checked={profile.hasEdHistory} onChange={(val) => update({ hasEdHistory: val })} />
          </div>
          <div className="mt-6 rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Hide calorie numbers</p>
                <p className="mt-1 text-xs text-gray-500">Some people find it more helpful to focus on nutrients rather than calories.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={profile.hideCalories}
                onClick={() => update({ hideCalories: !profile.hideCalories })}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${profile.hideCalories ? 'bg-green-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${profile.hideCalories ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
          <NavButtons step={isAfter ? 6 : 5} onBack={goBack} onContinue={goNext} />
        </div>
      )}

      {/* Goals step */}
      {step === goalsStep && (
        <GoalsStep
          path={profile.path}
          careTeamFlags={profile.careTeamFlags}
          pendingGoals={pendingGoals}
          setPendingGoals={setPendingGoals}
          onBack={goBack}
          onContinue={goNext}
        />
      )}

      {/* Review step */}
      {step === reviewStep && (
        <div>
          <StepIndicator step={reviewStep} path={profile.path} />
          <h1 className="text-2xl font-bold text-gray-900">Review your profile</h1>
          <p className="mt-2 text-gray-500">Take a moment to check everything looks right before we save.</p>

          <dl className="mt-6 divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden text-sm">
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="font-medium text-gray-500 shrink-0">Journey</dt>
              <dd className="text-gray-900">{profile.path === 'BEFORE' ? 'Before my visit' : 'After my visit'}</dd>
            </div>
            {profile.budget && (
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="font-medium text-gray-500 shrink-0">Budget</dt>
                <dd className="text-gray-900 capitalize">{profile.budget.replace('_', ' ')}</dd>
              </div>
            )}
            {profile.cuisines.length > 0 && (
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="font-medium text-gray-500 shrink-0">Cuisines</dt>
                <dd className="text-gray-900 text-right">{profile.cuisines.join(', ')}</dd>
              </div>
            )}
            {profile.allergens.length > 0 && (
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="font-medium text-gray-500 shrink-0">Allergens</dt>
                <dd className="text-gray-900 text-right capitalize">{profile.allergens.join(', ')}</dd>
              </div>
            )}
            {isAfter && profile.careTeamFlags.length > 0 && (
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="font-medium text-gray-500 shrink-0">Care-team notes</dt>
                <dd className="text-gray-900">{profile.careTeamFlags.length} selected</dd>
              </div>
            )}
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="font-medium text-gray-500 shrink-0">Goals</dt>
              <dd className="text-gray-900">{pendingGoals.length > 0 ? `${pendingGoals.length} goal${pendingGoals.length !== 1 ? 's' : ''}` : 'None added yet'}</dd>
            </div>
          </dl>

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
            <p className="text-sm font-semibold text-amber-800">Not medical advice</p>
            <p className="mt-1 text-sm text-amber-700">This app supports healthy eating — it does not diagnose conditions or replace your care team.</p>
          </div>

          {saveError && (
            <p className="mt-4 text-sm text-red-600">{saveError}</p>
          )}

          <NavButtons step={reviewStep} onBack={goBack} onContinue={handleSave} continueLabel={saveLabel} loading={loading} />
        </div>
      )}
    </div>
  )
}
