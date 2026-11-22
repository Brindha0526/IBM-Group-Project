'use client'

// app/(app)/profile/page.tsx
// Profile view + edit page (post-onboarding).
// Shows all saved profile fields and goals in collapsible sections.
// Each section has an inline edit form. Changes save immediately via the APIs.
// Uses the full ProfileWizard for a complete re-do if the user wants it.

import { useState, useEffect, useCallback } from 'react'
import TagInput from '@/components/TagInput'
import { deriveGoals, suggestGoalsFromHistory } from '@/lib/goals'
import type { NutrientTarget, SuggestedGoal } from '@/types/goals'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  path: 'BEFORE' | 'AFTER'
  budget?: string | null
  schedule?: string | null
  cuisines: string[]
  religiousRules: string[]
  preferences: string[]
  allergens: string[]
  medications: string[]
  medicalHistory?: string | null
  careTeamFlags: string[]
  isPregnant: boolean
  hasKidneyDisease: boolean
  takesInsulin: boolean
  hasEdHistory: boolean
  hideCalories: boolean
}

interface SavedGoal extends NutrientTarget {
  id: string
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
]

const CARE_TEAM_FLAGS = [
  { value: 'LOW_IRON', label: 'Iron levels' },
  { value: 'LOW_VITAMIN_D', label: 'Vitamin D levels' },
  { value: 'LOW_B12', label: 'B12 levels' },
  { value: 'HIGH_CHOLESTEROL', label: 'Cholesterol' },
  { value: 'HIGH_BLOOD_SUGAR', label: 'Blood sugar' },
  { value: 'HIGH_BLOOD_PRESSURE', label: 'Blood pressure' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function goalKey(g: NutrientTarget) { return g.nutrient.toLowerCase() }

function targetRange(goal: NutrientTarget): string {
  if (goal.targetMin !== undefined && goal.targetMax !== undefined) return `${goal.targetMin}–${goal.targetMax} ${goal.unit}`
  if (goal.targetMin !== undefined) return `≥ ${goal.targetMin} ${goal.unit}`
  if (goal.targetMax !== undefined) return `≤ ${goal.targetMax} ${goal.unit}`
  return goal.unit
}

function sourceBadge(source: NutrientTarget['source']) {
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

function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
}

// ─── EditSection wrapper ──────────────────────────────────────────────────────

function EditSection({
  title,
  children,
  editing,
  onEdit,
  onCancel,
  onSave,
  saving,
}: {
  title: string
  children: React.ReactNode
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  saving?: boolean
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {!editing ? (
          <button type="button" onClick={onEdit} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            Edit
          </button>
        ) : (
          <div className="flex gap-3">
            <button type="button" onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700">
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [goals, setGoals] = useState<SavedGoal[]>([])
  const [loading, setLoading] = useState(true)

  // ── Which sections are in edit mode ──────────────────────────────────────────
  const [editingJourney, setEditingJourney] = useState(false)
  const [editingLifestyle, setEditingLifestyle] = useState(false)
  const [editingAllergens, setEditingAllergens] = useState(false)
  const [editingMedications, setEditingMedications] = useState(false)
  const [editingSensitive, setEditingSensitive] = useState(false)
  const [editingGoals, setEditingGoals] = useState(false)

  // ── Draft state (per section) ─────────────────────────────────────────────────
  const [draft, setDraft] = useState<ProfileData | null>(null)
  const [goalsDraft, setGoalsDraft] = useState<NutrientTarget[]>([])
  const [savingSection, setSavingSection] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Goals editor state
  const [goalInput, setGoalInput] = useState('')
  const [goalInputPreview, setGoalInputPreview] = useState<NutrientTarget | null>(null)
  const [suggestText, setSuggestText] = useState('')
  const [suggestions, setSuggestions] = useState<SuggestedGoal[]>([])
  const [suggestChecked, setSuggestChecked] = useState<Set<string>>(new Set())
  const [suggestShown, setSuggestShown] = useState(false)

  // ── Load data ─────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, gRes] = await Promise.all([fetch('/api/profile/me'), fetch('/api/goals')])
      if (pRes.ok) {
        const { profile: p } = await pRes.json()
        setProfile(p)
        setDraft(p)
      }
      if (gRes.ok) {
        const { goals: g } = await gRes.json()
        setGoals(g ?? [])
        setGoalsDraft(g ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Live preview for goal input
  useEffect(() => {
    if (!goalInput.trim()) { setGoalInputPreview(null); return }
    const hits = suggestGoalsFromHistory(goalInput)
    setGoalInputPreview(hits.length > 0 ? { ...hits[0], source: 'USER_DEFINED' } : null)
  }, [goalInput])

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading your profile…</div>
  if (!profile || !draft) return <div className="p-6 text-sm text-gray-500">No profile found.</div>

  // ── Save helpers ──────────────────────────────────────────────────────────────

  async function saveProfile(section: string, patch: Partial<ProfileData>) {
    setSavingSection(section)
    setSaveError(null)
    const updated = { ...profile, ...patch }
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      if (!res.ok) throw new Error('Failed to save')
      setProfile(updated)
      setDraft(updated)
    } catch {
      setSaveError('Could not save. Please try again.')
    } finally {
      setSavingSection(null)
    }
  }

  async function saveGoals(newGoals: NutrientTarget[]) {
    setSavingSection('goals')
    setSaveError(null)
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals: newGoals }),
      })
      if (!res.ok) throw new Error('Failed to save goals')
      await load()
    } catch {
      setSaveError('Could not save goals. Please try again.')
    } finally {
      setSavingSection(null)
    }
  }

  // ── Draft helpers ─────────────────────────────────────────────────────────────

  function updateDraft(patch: Partial<ProfileData>) {
    setDraft((prev) => prev ? { ...prev, ...patch } : prev)
  }

  function cancelSection(setter: (v: boolean) => void) {
    setDraft(profile)
    setSaveError(null)
    setter(false)
  }

  // ── Goals draft helpers ───────────────────────────────────────────────────────

  function addGoalToDraft(goal: NutrientTarget) {
    setGoalsDraft((prev) => {
      const key = goalKey(goal)
      return prev.some((g) => goalKey(g) === key) ? prev : [...prev, goal]
    })
  }

  function removeGoalFromDraft(key: string) {
    setGoalsDraft((prev) => prev.filter((g) => goalKey(g) !== key))
  }

  function handleAddGoalInput() {
    if (!goalInput.trim()) return
    addGoalToDraft(
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
    setSuggestChecked(new Set(s.map((g) => goalKey(g))))
    setSuggestShown(true)
  }

  function handleAddSuggested() {
    suggestions.filter((g) => suggestChecked.has(goalKey(g))).forEach(addGoalToDraft)
    setSuggestShown(false)
    setSuggestions([])
    setSuggestChecked(new Set())
  }

  // ── Care-team derived goals (AFTER path) ──────────────────────────────────────
  const careTeamGoals = profile.path === 'AFTER'
    ? deriveGoals({ path: 'AFTER', careTeamFlags: profile.careTeamFlags }).filter((g) => g.source === 'CARE_TEAM')
    : []

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your preferences, allergens, and goals — edit any section at any time.
        </p>
      </div>

      {saveError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {saveError}
        </div>
      )}

      {/* ── Journey ────────────────────────────────────────────────────────── */}
      <EditSection
        title="Your journey"
        editing={editingJourney}
        onEdit={() => setEditingJourney(true)}
        onCancel={() => cancelSection(setEditingJourney)}
        onSave={async () => {
          await saveProfile('journey', { path: draft!.path })
          setEditingJourney(false)
        }}
        saving={savingSection === 'journey'}
      >
        {!editingJourney ? (
          <p className="text-sm text-gray-700">
            {profile.path === 'BEFORE' ? '🌱 Before my visit' : '📋 After my visit'}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              { p: 'BEFORE' as const, icon: '🌱', label: 'Before my visit' },
              { p: 'AFTER' as const, icon: '📋', label: 'After my visit' },
            ]).map(({ p, icon, label }) => (
              <button
                key={p}
                type="button"
                onClick={() => updateDraft({ path: p })}
                className={`rounded-xl border-2 p-4 text-left text-sm transition-colors ${draft?.path === p ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}
              >
                <span className="text-xl">{icon}</span>
                <p className="mt-1 font-medium text-gray-900">{label}</p>
              </button>
            ))}
          </div>
        )}
      </EditSection>

      {/* ── Lifestyle ──────────────────────────────────────────────────────── */}
      <EditSection
        title="Lifestyle"
        editing={editingLifestyle}
        onEdit={() => setEditingLifestyle(true)}
        onCancel={() => cancelSection(setEditingLifestyle)}
        onSave={async () => {
          await saveProfile('lifestyle', {
            budget: draft!.budget ?? undefined,
            schedule: draft!.schedule ?? undefined,
            cuisines: draft!.cuisines,
            religiousRules: draft!.religiousRules,
            preferences: draft!.preferences,
          })
          setEditingLifestyle(false)
        }}
        saving={savingSection === 'lifestyle'}
      >
        {!editingLifestyle ? (
          <dl className="space-y-2 text-sm">
            {profile.budget && <Row label="Budget" value={profile.budget.replace('_', ' ')} />}
            {profile.schedule && <Row label="Schedule" value={profile.schedule.replace('_', ' ')} />}
            {profile.cuisines.length > 0 && <Row label="Cuisines" value={profile.cuisines.join(', ')} />}
            {profile.religiousRules.length > 0 && <Row label="Food guidelines" value={profile.religiousRules.join(', ')} />}
            {profile.preferences.length > 0 && <Row label="Other preferences" value={profile.preferences.join(', ')} />}
            {!profile.budget && !profile.cuisines.length && <p className="text-gray-400">No lifestyle info saved.</p>}
          </dl>
        ) : (
          <div className="space-y-5">
            <fieldset>
              <legend className="text-xs font-medium text-gray-600 mb-2">Budget</legend>
              {[{ value: 'flexible', label: 'Flexible' }, { value: 'moderate', label: 'Moderate' }, { value: 'budget_conscious', label: 'Budget-conscious' }].map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 mb-1 cursor-pointer">
                  <input type="radio" name="budget" value={value} checked={draft?.budget === value} onChange={() => updateDraft({ budget: value })} className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend className="text-xs font-medium text-gray-600 mb-2">Time to cook</legend>
              {[{ value: 'plenty', label: 'Plenty of time' }, { value: 'moderate', label: 'Moderate' }, { value: 'very_busy', label: 'Very busy' }].map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 mb-1 cursor-pointer">
                  <input type="radio" name="schedule" value={value} checked={draft?.schedule === value} onChange={() => updateDraft({ schedule: value })} className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </fieldset>
            <TagInput label="Cuisines" tags={draft?.cuisines ?? []} onChange={(v) => updateDraft({ cuisines: v })} placeholder="e.g. Caribbean, Korean…" />
            <TagInput label="Food guidelines" tags={draft?.religiousRules ?? []} onChange={(v) => updateDraft({ religiousRules: v })} placeholder="e.g. halal, kosher, vegan…" />
            <TagInput label="Other preferences" tags={draft?.preferences ?? []} onChange={(v) => updateDraft({ preferences: v })} placeholder="e.g. no mushrooms…" />
          </div>
        )}
      </EditSection>

      {/* ── Allergens ──────────────────────────────────────────────────────── */}
      <EditSection
        title="Allergies"
        editing={editingAllergens}
        onEdit={() => setEditingAllergens(true)}
        onCancel={() => cancelSection(setEditingAllergens)}
        onSave={async () => {
          await saveProfile('allergens', { allergens: draft!.allergens })
          setEditingAllergens(false)
        }}
        saving={savingSection === 'allergens'}
      >
        {!editingAllergens ? (
          profile.allergens.length > 0
            ? <p className="text-sm text-gray-700 capitalize">{profile.allergens.join(', ')}</p>
            : <p className="text-sm text-gray-400">No allergens selected.</p>
        ) : (
          <div className="space-y-2">
            {ALLERGENS.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={draft?.allergens.includes(value) ?? false} onChange={() => updateDraft({ allergens: toggleItem(draft?.allergens ?? [], value) })} className="h-4 w-4 rounded border-gray-300 text-green-600" />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        )}
      </EditSection>

      {/* ── Medications ────────────────────────────────────────────────────── */}
      <EditSection
        title="Medications & medical history"
        editing={editingMedications}
        onEdit={() => setEditingMedications(true)}
        onCancel={() => cancelSection(setEditingMedications)}
        onSave={async () => {
          await saveProfile('medications', { medications: draft!.medications, medicalHistory: draft!.medicalHistory })
          setEditingMedications(false)
        }}
        saving={savingSection === 'medications'}
      >
        {!editingMedications ? (
          <dl className="space-y-2 text-sm">
            <Row label="Medications" value={profile.medications.length > 0 ? profile.medications.join(', ') : 'None listed'} />
            {profile.medicalHistory && <Row label="Medical history" value={profile.medicalHistory} />}
          </dl>
        ) : (
          <div className="space-y-4">
            <TagInput label="Medications" tags={draft?.medications ?? []} onChange={(v) => updateDraft({ medications: v })} placeholder="Type a medication and press Enter…" />
            <div>
              <label htmlFor="medHistory" className="block text-xs font-medium text-gray-600 mb-1">Medical history <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                id="medHistory"
                rows={3}
                value={draft?.medicalHistory ?? ''}
                onChange={(e) => updateDraft({ medicalHistory: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>
          </div>
        )}
      </EditSection>

      {/* ── Care-team flags (AFTER path only) ──────────────────────────────── */}
      {profile.path === 'AFTER' && (
        <EditSection
          title="Care-team notes"
          editing={editingJourney /* reuse — care-team is part of journey context */}
          onEdit={() => setEditingJourney(true)}
          onCancel={() => cancelSection(setEditingJourney)}
          onSave={async () => {
            await saveProfile('journey', { path: draft!.path, careTeamFlags: draft!.careTeamFlags })
            setEditingJourney(false)
          }}
          saving={savingSection === 'journey'}
        >
          {profile.careTeamFlags.length > 0 ? (
            <ul className="space-y-1 text-sm text-gray-700">
              {profile.careTeamFlags.map((f) => (
                <li key={f} className="capitalize">{CARE_TEAM_FLAGS.find((ct) => ct.value === f)?.label ?? f}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">No care-team notes selected.</p>
          )}
          {editingJourney && (
            <div className="mt-3 space-y-2">
              {CARE_TEAM_FLAGS.map(({ value, label }) => (
                <label key={value} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={draft?.careTeamFlags.includes(value) ?? false} onChange={() => updateDraft({ careTeamFlags: toggleItem(draft?.careTeamFlags ?? [], value) })} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          )}
        </EditSection>
      )}

      {/* ── Sensitive flags ─────────────────────────────────────────────────── */}
      <EditSection
        title="Health & safety settings"
        editing={editingSensitive}
        onEdit={() => setEditingSensitive(true)}
        onCancel={() => cancelSection(setEditingSensitive)}
        onSave={async () => {
          await saveProfile('sensitive', {
            isPregnant: draft!.isPregnant,
            hasKidneyDisease: draft!.hasKidneyDisease,
            takesInsulin: draft!.takesInsulin,
            hasEdHistory: draft!.hasEdHistory,
            hideCalories: draft!.hideCalories,
          })
          setEditingSensitive(false)
        }}
        saving={savingSection === 'sensitive'}
      >
        {!editingSensitive ? (
          <dl className="space-y-1.5 text-sm">
            <Row label="Pregnant/breastfeeding" value={profile.isPregnant ? 'Yes' : 'No'} />
            <Row label="Kidney disease" value={profile.hasKidneyDisease ? 'Yes' : 'No'} />
            <Row label="Takes insulin" value={profile.takesInsulin ? 'Yes' : 'No'} />
            <Row label="ED history" value={profile.hasEdHistory ? 'Yes' : 'No'} />
            <Row label="Calorie display" value={profile.hideCalories ? 'Hidden' : 'Shown'} />
          </dl>
        ) : (
          <div className="space-y-3">
            {([
              { field: 'isPregnant' as const, label: 'Currently pregnant or breastfeeding?' },
              { field: 'hasKidneyDisease' as const, label: 'Have kidney disease?' },
              { field: 'takesInsulin' as const, label: 'Take insulin?' },
              { field: 'hasEdHistory' as const, label: 'History of disordered eating?' },
            ]).map(({ field, label }) => (
              <div key={field} className="rounded-lg border border-gray-200 p-3 flex items-center justify-between gap-4">
                <span className="text-sm text-gray-700">{label}</span>
                <div className="flex gap-3">
                  {(['Yes', 'No'] as const).map((opt) => (
                    <label key={opt} className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" checked={opt === 'Yes' ? draft?.[field] : !draft?.[field]} onChange={() => updateDraft({ [field]: opt === 'Yes' })} name={field} className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="rounded-lg border border-gray-200 p-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Hide calorie numbers</p>
                <p className="text-xs text-gray-500 mt-0.5">Focus on nutrients instead of calories.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={draft?.hideCalories}
                onClick={() => updateDraft({ hideCalories: !draft?.hideCalories })}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${draft?.hideCalories ? 'bg-green-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${draft?.hideCalories ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        )}
      </EditSection>

      {/* ── Goals ───────────────────────────────────────────────────────────── */}
      <EditSection
        title="Nutrition goals"
        editing={editingGoals}
        onEdit={() => { setGoalsDraft(goals); setEditingGoals(true) }}
        onCancel={() => { setGoalsDraft(goals); setSuggestShown(false); setEditingGoals(false); setSaveError(null) }}
        onSave={async () => {
          await saveGoals(goalsDraft)
          setEditingGoals(false)
        }}
        saving={savingSection === 'goals'}
      >
        {!editingGoals ? (
          goals.length > 0 ? (
            <ul className="space-y-2">
              {goals.map((g) => {
                const { cls, label } = sourceBadge(g.source)
                return (
                  <li key={goalKey(g)} className="flex items-center justify-between gap-2 text-sm">
                    <span className="capitalize text-gray-800">{g.label ?? g.nutrient}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {(g.targetMin !== undefined || g.targetMax !== undefined) && (
                        <span className="text-gray-500 text-xs">{targetRange(g)}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">No goals set. Click Edit to add some.</p>
          )
        ) : (
          <div className="space-y-5">
            {/* Add a specific goal */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">Add a specific goal</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddGoalInput()}
                  placeholder="e.g. eat more iron-rich foods…"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
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
            </div>

            {/* Suggest from context */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">Suggest goals for me</p>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                Suggestions come from general guidelines — <strong>not medical advice.</strong>
              </p>
              <textarea
                value={suggestText}
                onChange={(e) => setSuggestText(e.target.value)}
                rows={2}
                placeholder="e.g. I've been feeling tired, doctor mentioned iron…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
              <button type="button" onClick={handleSuggestGoals} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
                Suggest goals
              </button>
              {suggestShown && suggestions.length > 0 && (
                <div className="space-y-2">
                  {suggestions.map((g) => {
                    const key = goalKey(g)
                    return (
                      <label key={key} className="flex items-start gap-2 cursor-pointer bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                        <input type="checkbox" checked={suggestChecked.has(key)} onChange={() => setSuggestChecked((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })} className="mt-0.5 h-4 w-4 rounded text-green-600" />
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
            </div>

            {/* Care-team goals (AFTER path) */}
            {profile.path === 'AFTER' && careTeamGoals.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">From your care team</p>
                {careTeamGoals.map((g) => (
                  <button key={goalKey(g)} type="button" onClick={() => addGoalToDraft(g)} className="w-full flex items-center justify-between text-xs px-3 py-2 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-gray-800">
                    <span className="capitalize">{g.label ?? g.nutrient}</span>
                    <span className="text-gray-500">{targetRange(g)}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Current draft goals */}
            {goalsDraft.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-600">Current goals ({goalsDraft.length})</p>
                {goalsDraft.map((g) => (
                  <div key={goalKey(g)} className="flex items-center justify-between text-xs bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <span className="capitalize font-medium">{g.label ?? g.nutrient}</span>
                    <div className="flex items-center gap-2">
                      {(g.targetMin !== undefined || g.targetMax !== undefined) && <span className="text-gray-500">{targetRange(g)}</span>}
                      <button type="button" onClick={() => removeGoalFromDraft(goalKey(g))} className="text-gray-400 hover:text-red-500" aria-label="Remove">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </EditSection>

      {/* Not medical advice */}
      <p className="text-xs text-gray-400 text-center pt-2 pb-6">
        Not medical advice. Always consult your healthcare team before making dietary changes.
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500 shrink-0">{label}</dt>
      <dd className="text-gray-900 text-right capitalize">{value}</dd>
    </div>
  )
}
