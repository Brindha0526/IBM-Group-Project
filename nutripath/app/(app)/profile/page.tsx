'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TagInput from '@/components/TagInput'

// ─── Types ────────────────────────────────────────────────────────────────────

type Path = 'BEFORE' | 'AFTER'

type Allergen =
  | 'milk'
  | 'eggs'
  | 'fish'
  | 'crustacean shellfish'
  | 'tree nuts'
  | 'peanuts'
  | 'wheat'
  | 'soybeans'
  | 'sesame'

type CareTeamFlag =
  | 'LOW_IRON'
  | 'LOW_VITAMIN_D'
  | 'LOW_B12'
  | 'HIGH_CHOLESTEROL'
  | 'HIGH_BLOOD_SUGAR'
  | 'HIGH_BLOOD_PRESSURE'

interface WizardState {
  step: number
  path: Path | null
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

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLERGENS: { value: Allergen; label: string }[] = [
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

const CARE_TEAM_FLAGS: { value: CareTeamFlag; label: string }[] = [
  { value: 'LOW_IRON', label: 'Your care team mentioned your iron levels' },
  { value: 'LOW_VITAMIN_D', label: 'Your care team mentioned your vitamin D levels' },
  { value: 'LOW_B12', label: 'Your care team mentioned your B12 levels' },
  { value: 'HIGH_CHOLESTEROL', label: 'Your care team mentioned your cholesterol' },
  { value: 'HIGH_BLOOD_SUGAR', label: 'Your care team mentioned your blood sugar' },
  { value: 'HIGH_BLOOD_PRESSURE', label: 'Your care team mentioned your blood pressure' },
]

const TOTAL_STEPS = 6

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  return (
    <p className="mb-6 text-sm font-medium text-gray-500">
      Step {step} of {TOTAL_STEPS}
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
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
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
        className="rounded-md bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-40"
      >
        {loading ? 'Saving…' : (continueLabel ?? 'Continue')}
      </button>
    </div>
  )
}

// ─── Step 1: Path selection ───────────────────────────────────────────────────

function Step1({
  path,
  onSelect,
}: {
  path: Path | null
  onSelect: (p: Path) => void
}) {
  return (
    <div>
      <StepIndicator step={1} />
      <h1 className="text-2xl font-bold text-gray-900">Where are you in your journey?</h1>
      <p className="mt-2 text-gray-500">Choose the option that best describes you right now.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {/* BEFORE card */}
        <button
          type="button"
          onClick={() => onSelect('BEFORE')}
          className={`rounded-xl border-2 p-6 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 ${
            path === 'BEFORE'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 hover:border-green-300'
          }`}
        >
          <div className="text-3xl">🌱</div>
          <h2 className="mt-3 text-lg font-semibold text-gray-900">Before my visit</h2>
          <p className="mt-1 text-sm text-gray-500">
            I want to build healthy habits and find a dietitian
          </p>
        </button>

        {/* AFTER card */}
        <button
          type="button"
          onClick={() => onSelect('AFTER')}
          className={`rounded-xl border-2 p-6 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 ${
            path === 'AFTER'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 hover:border-green-300'
          }`}
        >
          <div className="text-3xl">📋</div>
          <h2 className="mt-3 text-lg font-semibold text-gray-900">After my visit</h2>
          <p className="mt-1 text-sm text-gray-500">
            My care team gave me specific guidance to follow
          </p>
        </button>
      </div>
    </div>
  )
}

// ─── Step 2a: Lifestyle (BEFORE) ──────────────────────────────────────────────

function Step2Before({
  state,
  update,
  onBack,
  onContinue,
}: {
  state: WizardState
  update: (patch: Partial<WizardState>) => void
  onBack: () => void
  onContinue: () => void
}) {
  return (
    <div>
      <StepIndicator step={2} />
      <h1 className="text-2xl font-bold text-gray-900">Your lifestyle</h1>
      <p className="mt-2 text-gray-500">Help us tailor food ideas that fit your everyday life.</p>

      <div className="mt-6 space-y-6">
        {/* Budget */}
        <fieldset>
          <legend className="text-sm font-medium text-gray-700">
            What&apos;s your food budget like?
          </legend>
          <div className="mt-2 space-y-2">
            {[
              { value: 'flexible', label: 'Flexible' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'budget_conscious', label: 'Budget-conscious' },
            ].map(({ value, label }) => (
              <label key={value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="budget"
                  value={value}
                  checked={state.budget === value}
                  onChange={() => update({ budget: value })}
                  className="h-4 w-4 border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Schedule */}
        <fieldset>
          <legend className="text-sm font-medium text-gray-700">
            How much time do you usually have to cook?
          </legend>
          <div className="mt-2 space-y-2">
            {[
              { value: 'plenty', label: 'Plenty of time to cook' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'very_busy', label: 'Very busy' },
            ].map(({ value, label }) => (
              <label key={value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="schedule"
                  value={value}
                  checked={state.schedule === value}
                  onChange={() => update({ schedule: value })}
                  className="h-4 w-4 border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Cuisines */}
        <TagInput
          label="What cuisines or cultural foods do you enjoy?"
          tags={state.cuisines}
          onChange={(cuisines) => update({ cuisines })}
          placeholder="e.g. Caribbean, Korean, Ethiopian…"
        />

        {/* Religious / ethical rules */}
        <TagInput
          label="Any religious or ethical food guidelines?"
          tags={state.religiousRules}
          onChange={(religiousRules) => update({ religiousRules })}
          placeholder="e.g. halal, kosher, vegan…"
        />

        {/* Other preferences */}
        <TagInput
          label="Any other food preferences?"
          tags={state.preferences}
          onChange={(preferences) => update({ preferences })}
          placeholder="e.g. no mushrooms, prefer spicy…"
        />
      </div>

      <NavButtons step={2} onBack={onBack} onContinue={onContinue} />
    </div>
  )
}

// ─── Step 2b: Care-team flags (AFTER) ────────────────────────────────────────

function Step2After({
  state,
  update,
  onBack,
  onContinue,
}: {
  state: WizardState
  update: (patch: Partial<WizardState>) => void
  onBack: () => void
  onContinue: () => void
}) {
  function toggle(flag: string) {
    update({ careTeamFlags: toggleItem(state.careTeamFlags, flag) })
  }

  return (
    <div>
      <StepIndicator step={2} />
      <h1 className="text-2xl font-bold text-gray-900">What did your care team mention?</h1>
      <p className="mt-2 text-gray-500">
        Select everything that applies. You can always update this later.
      </p>

      <div className="mt-6 space-y-3">
        {CARE_TEAM_FLAGS.map(({ value, label }) => (
          <label
            key={value}
            className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={state.careTeamFlags.includes(value)}
              onChange={() => toggle(value)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">{label}</span>
          </label>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Not medical advice. We use this to tailor your food suggestions.
      </p>

      <NavButtons step={2} onBack={onBack} onContinue={onContinue} />
    </div>
  )
}

// ─── Step 3: Allergens ────────────────────────────────────────────────────────

function Step3({
  state,
  update,
  onBack,
  onContinue,
}: {
  state: WizardState
  update: (patch: Partial<WizardState>) => void
  onBack: () => void
  onContinue: () => void
}) {
  function toggle(allergen: string) {
    update({ allergens: toggleItem(state.allergens, allergen) })
  }

  return (
    <div>
      <StepIndicator step={3} />
      <h1 className="text-2xl font-bold text-gray-900">Do you have any food allergies?</h1>

      <div className="mt-6 space-y-3">
        {ALLERGENS.map(({ value, label }) => (
          <label
            key={value}
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={state.allergens.includes(value)}
              onChange={() => toggle(value)}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">{label}</span>
          </label>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-400">
        We&apos;ll make sure none of your plans or suggestions include these.
      </p>

      <NavButtons step={3} onBack={onBack} onContinue={onContinue} />
    </div>
  )
}

// ─── Step 4: Medications ──────────────────────────────────────────────────────

function Step4({
  state,
  update,
  onBack,
  onContinue,
}: {
  state: WizardState
  update: (patch: Partial<WizardState>) => void
  onBack: () => void
  onContinue: () => void
}) {
  return (
    <div>
      <StepIndicator step={4} />
      <h1 className="text-2xl font-bold text-gray-900">Are you taking any medications?</h1>
      <p className="mt-2 text-gray-500">
        This helps us flag potential food interactions. We&apos;ll always tell you to check with
        your pharmacist.
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <TagInput
            label="Medications"
            tags={state.medications}
            onChange={(medications) => update({ medications })}
            placeholder="Type a medication name and press Enter…"
          />
          <p className="mt-2 text-xs text-gray-400">
            We use this only to flag possible food interactions. Always check with your pharmacist.
          </p>
        </div>

        <div>
          <label
            htmlFor="medicalHistory"
            className="block text-sm font-medium text-gray-700"
          >
            Medical history{' '}
            <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Describe anything relevant in your own words — we&apos;ll use this to suggest helpful
            goals on the next screen.
          </p>
          <textarea
            id="medicalHistory"
            rows={4}
            value={state.medicalHistory}
            onChange={(e) => update({ medicalHistory: e.target.value })}
            placeholder="e.g. 'I have anaemia and was recently told my vitamin D is low'"
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>
      </div>

      <NavButtons step={4} onBack={onBack} onContinue={onContinue} />
    </div>
  )
}

// ─── Step 5: Sensitive flags ──────────────────────────────────────────────────

const GENERAL_SUGGESTIONS_NOTE =
  "We'll show you general suggestions and recommend speaking with your care team."

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
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              checked={checked === true}
              onChange={() => onChange(true)}
              name={label}
              className="h-4 w-4 border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">Yes</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              checked={checked === false}
              onChange={() => onChange(false)}
              name={label}
              className="h-4 w-4 border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">No</span>
          </label>
        </div>
      </div>
      {checked && (
        <p className="mt-2 text-xs text-green-700 bg-green-50 rounded px-3 py-2">
          {GENERAL_SUGGESTIONS_NOTE}
        </p>
      )}
    </div>
  )
}

function Step5({
  state,
  update,
  onBack,
  onContinue,
}: {
  state: WizardState
  update: (patch: Partial<WizardState>) => void
  onBack: () => void
  onContinue: () => void
}) {
  return (
    <div>
      <StepIndicator step={5} />
      <h1 className="text-2xl font-bold text-gray-900">A few more details to keep you safe</h1>
      <p className="mt-2 text-gray-500">
        Your answers help us give you suggestions that are right for your situation.
      </p>

      <div className="mt-6 space-y-4">
        <SensitiveQuestion
          label="Are you currently pregnant or breastfeeding?"
          checked={state.isPregnant}
          onChange={(val) => update({ isPregnant: val })}
        />
        <SensitiveQuestion
          label="Do you have kidney disease?"
          checked={state.hasKidneyDisease}
          onChange={(val) => update({ hasKidneyDisease: val })}
        />
        <SensitiveQuestion
          label="Do you take insulin?"
          checked={state.takesInsulin}
          onChange={(val) => update({ takesInsulin: val })}
        />
        <SensitiveQuestion
          label="Do you have a history of disordered eating?"
          checked={state.hasEdHistory}
          onChange={(val) => update({ hasEdHistory: val })}
        />
      </div>

      {/* Calorie-hide toggle */}
      <div className="mt-6 rounded-lg border border-gray-200 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Hide calorie numbers</p>
            <p className="mt-1 text-xs text-gray-500">
              Some people find it more helpful to focus on nutrients rather than calories.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={state.hideCalories}
            onClick={() => update({ hideCalories: !state.hideCalories })}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
              state.hideCalories ? 'bg-green-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                state.hideCalories ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <NavButtons step={5} onBack={onBack} onContinue={onContinue} />
    </div>
  )
}

// ─── Step 6: Confirmation ─────────────────────────────────────────────────────

function Step6({
  state,
  onBack,
  onSave,
  loading,
}: {
  state: WizardState
  onBack: () => void
  onSave: () => void
  loading: boolean
}) {
  const pathLabel = state.path === 'BEFORE' ? 'Before my visit' : 'After my visit'

  return (
    <div>
      <StepIndicator step={6} />
      <h1 className="text-2xl font-bold text-gray-900">Review your profile</h1>
      <p className="mt-2 text-gray-500">
        Take a moment to check everything looks right before we save.
      </p>

      <dl className="mt-6 divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
        <SummaryRow label="Journey" value={pathLabel} />

        {state.path === 'BEFORE' && (
          <>
            {state.budget && (
              <SummaryRow
                label="Budget"
                value={
                  state.budget === 'flexible'
                    ? 'Flexible'
                    : state.budget === 'moderate'
                    ? 'Moderate'
                    : 'Budget-conscious'
                }
              />
            )}
            {state.schedule && (
              <SummaryRow
                label="Schedule"
                value={
                  state.schedule === 'plenty'
                    ? 'Plenty of time to cook'
                    : state.schedule === 'moderate'
                    ? 'Moderate'
                    : 'Very busy'
                }
              />
            )}
            {state.cuisines.length > 0 && (
              <SummaryRow label="Cuisines" value={state.cuisines.join(', ')} />
            )}
            {state.religiousRules.length > 0 && (
              <SummaryRow label="Food guidelines" value={state.religiousRules.join(', ')} />
            )}
            {state.preferences.length > 0 && (
              <SummaryRow label="Preferences" value={state.preferences.join(', ')} />
            )}
          </>
        )}

        {state.path === 'AFTER' && state.careTeamFlags.length > 0 && (
          <SummaryRow
            label="Care-team mentions"
            value={`${state.careTeamFlags.length} item${state.careTeamFlags.length !== 1 ? 's' : ''} selected`}
          />
        )}

        {state.allergens.length > 0 && (
          <SummaryRow
            label="Allergens"
            value={state.allergens
              .map((a) => a.charAt(0).toUpperCase() + a.slice(1))
              .join(', ')}
          />
        )}

        <SummaryRow
          label="Medications"
          value={
            state.medications.length > 0
              ? `${state.medications.length} medication${state.medications.length !== 1 ? 's' : ''} listed`
              : 'None listed'
          }
        />

        <SummaryRow
          label="Calorie display"
          value={state.hideCalories ? 'Hidden' : 'Shown'}
        />
      </dl>

      {/* Not medical advice notice */}
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
        <p className="text-sm font-semibold text-amber-800">Not medical advice</p>
        <p className="mt-1 text-sm text-amber-700">
          This app supports healthy eating — it does not diagnose conditions or replace your
          care team.
        </p>
      </div>

      <NavButtons
        step={6}
        onBack={onBack}
        onContinue={onSave}
        continueLabel="Save my profile"
        loading={loading}
      />
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3 text-sm">
      <dt className="font-medium text-gray-500 shrink-0">{label}</dt>
      <dd className="text-gray-900 text-right">{value}</dd>
    </div>
  )
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

const INITIAL_STATE: WizardState = {
  step: 1,
  path: null,
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

export default function ProfilePage() {
  const router = useRouter()
  const [state, setState] = useState<WizardState>(INITIAL_STATE)
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Pre-fill from existing profile on mount
  useEffect(() => {
    fetch('/api/profile/me')
      .then((r) => r.json())
      .then(({ profile }) => {
        if (!profile) return
        setState((prev) => ({
          ...prev,
          path: profile.path ?? null,
          budget: profile.budget ?? '',
          schedule: profile.schedule ?? '',
          cuisines: profile.cuisines ?? [],
          religiousRules: profile.religiousRules ?? [],
          preferences: profile.preferences ?? [],
          allergens: profile.allergens ?? [],
          medications: profile.medications ?? [],
          medicalHistory: profile.medicalHistory ?? '',
          careTeamFlags: profile.careTeamFlags ?? [],
          isPregnant: profile.isPregnant ?? false,
          hasKidneyDisease: profile.hasKidneyDisease ?? false,
          takesInsulin: profile.takesInsulin ?? false,
          hasEdHistory: profile.hasEdHistory ?? false,
          hideCalories: profile.hideCalories ?? false,
        }))
      })
      .catch(() => {
        // Not authenticated or no profile yet — stay on step 1 with blank state
      })
  }, [])

  function update(patch: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...patch }))
  }

  function goBack() {
    setState((prev) => ({ ...prev, step: prev.step - 1 }))
  }

  function goNext() {
    setState((prev) => ({ ...prev, step: prev.step + 1 }))
  }

  function selectPath(p: Path) {
    setState((prev) => ({ ...prev, path: p, step: 2 }))
  }

  async function handleSave() {
    if (!state.path) return
    setLoading(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: state.path,
          budget: state.budget || undefined,
          schedule: state.schedule || undefined,
          cuisines: state.cuisines,
          religiousRules: state.religiousRules,
          preferences: state.preferences,
          allergens: state.allergens,
          medications: state.medications,
          medicalHistory: state.medicalHistory || undefined,
          careTeamFlags: state.careTeamFlags,
          isPregnant: state.isPregnant,
          hasKidneyDisease: state.hasKidneyDisease,
          takesInsulin: state.takesInsulin,
          hasEdHistory: state.hasEdHistory,
          hideCalories: state.hideCalories,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setSaveError(body.error ?? 'Something went wrong. Please try again.')
        return
      }
      router.push('/goals')
    } catch {
      setSaveError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      {state.step === 1 && (
        <Step1 path={state.path} onSelect={selectPath} />
      )}

      {state.step === 2 && state.path === 'BEFORE' && (
        <Step2Before state={state} update={update} onBack={goBack} onContinue={goNext} />
      )}

      {state.step === 2 && state.path === 'AFTER' && (
        <Step2After state={state} update={update} onBack={goBack} onContinue={goNext} />
      )}

      {state.step === 3 && (
        <Step3 state={state} update={update} onBack={goBack} onContinue={goNext} />
      )}

      {state.step === 4 && (
        <Step4 state={state} update={update} onBack={goBack} onContinue={goNext} />
      )}

      {state.step === 5 && (
        <Step5 state={state} update={update} onBack={goBack} onContinue={goNext} />
      )}

      {state.step === 6 && (
        <Step6 state={state} onBack={goBack} onSave={handleSave} loading={loading} />
      )}

      {saveError && (
        <p className="mt-4 text-sm text-red-600">{saveError}</p>
      )}
    </div>
  )
}
