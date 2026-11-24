'use client'

// components/ProfileWizard.tsx
// Shared multi-step wizard used by both /onboarding (first time) and
// /profile (edit mode). Collects profile + goals and calls onSave when done.

import { useState, useEffect } from 'react'
import TagInput from '@/components/TagInput'
import { customAllergens, withCustomAllergens } from '@/lib/safety/allergens'
import { deriveGoals, suggestGoalsFromHistory, calcCaloricTarget } from '@/lib/goals'
import type { NutrientTarget, SuggestedGoal } from '@/types/goals'
import type { GoalIntensity } from '@/lib/goals'

// ─── Types ────────────────────────────────────────────────────────────────────

type Path = 'BEFORE' | 'AFTER'
type Sex = 'MALE' | 'FEMALE' | 'OTHER'
type ActivityLevel = 'SEDENTARY' | 'LIGHTLY_ACTIVE' | 'MODERATELY_ACTIVE' | 'VERY_ACTIVE' | 'EXTRA_ACTIVE'
type WeightGoal = 'LOSE' | 'MAINTAIN' | 'GAIN'
type CutIntensity  = 'MODERATE' | 'AGGRESSIVE'
type BulkIntensity = 'LEAN' | 'STANDARD' | 'AGGRESSIVE'

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
  // Location
  zipCode: string
  country: string
  // Body metrics
  heightCm: string        // stored as string in form; parsed to number before save
  weightKg: string
  age: string
  sex: Sex | ''
  activityLevel: ActivityLevel | ''
  weightGoal: WeightGoal | ''
  /** Intensity level for cut (MODERATE/AGGRESSIVE) or bulk (LEAN/STANDARD/AGGRESSIVE). */
  goalIntensity: GoalIntensity | ''
  caloricGoalKcal: number | null  // user-confirmed/overridden final target
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

const ACTIVITY_LEVEL_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'SEDENTARY',         label: 'Sedentary',          desc: 'Little or no exercise, desk job' },
  { value: 'LIGHTLY_ACTIVE',    label: 'Lightly active',     desc: 'Light exercise 1–3 days/week' },
  { value: 'MODERATELY_ACTIVE', label: 'Moderately active',  desc: 'Moderate exercise 3–5 days/week' },
  { value: 'VERY_ACTIVE',       label: 'Very active',        desc: 'Hard exercise 6–7 days/week' },
  { value: 'EXTRA_ACTIVE',      label: 'Extra active',       desc: 'Very hard exercise + physical job' },
]

const WEIGHT_GOAL_OPTIONS: { value: WeightGoal; label: string; desc: string }[] = [
  { value: 'LOSE',     label: 'Lose fat',         desc: 'Create a calorie deficit to lose weight gradually and safely' },
  { value: 'MAINTAIN', label: 'Maintain weight',  desc: 'Stay at your current weight — eat at TDEE' },
  { value: 'GAIN',     label: 'Build muscle',     desc: 'Create a calorie surplus to support muscle gain' },
]

const CUT_INTENSITY_OPTIONS: { value: CutIntensity; label: string; pct: string; rate: string }[] = [
  { value: 'MODERATE',   label: 'Moderate cut',   pct: '−15% of TDEE', rate: '~0.3–0.5 kg/week loss' },
  { value: 'AGGRESSIVE', label: 'Aggressive cut',  pct: '−25% of TDEE', rate: '~0.5–0.8 kg/week loss' },
]

const BULK_INTENSITY_OPTIONS: { value: BulkIntensity; label: string; pct: string; rate: string }[] = [
  { value: 'LEAN',       label: 'Lean bulk',       pct: '+10% of TDEE', rate: '~0.1–0.2 kg/week gain' },
  { value: 'STANDARD',   label: 'Standard bulk',   pct: '+15% of TDEE', rate: '~0.2–0.3 kg/week gain' },
  { value: 'AGGRESSIVE', label: 'Aggressive bulk',  pct: '+20% of TDEE', rate: '~0.3–0.4 kg/week gain' },
]

// Step layout:
// BEFORE: 1=path  2=lifestyle  3=body-metrics  4=caloric-goal  5=allergens  6=medications  7=sensitive  8=goals  9=review
// AFTER:  1=path  2=lifestyle  3=care-team  4=body-metrics  5=caloric-goal  6=allergens  7=medications  8=sensitive  9=goals  10=review
function totalSteps(path: Path | null) {
  return path === 'AFTER' ? 10 : 9
}

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

/** Returns true if all required body-metric fields are filled and valid */
/** e.g. "Lose weight — Moderate cut", "Maintain weight". Uses the wizard's option labels. */
function goalWithIntensityLabel(goal: WeightGoal, intensity: GoalIntensity | ''): string {
  const goalLabel = WEIGHT_GOAL_OPTIONS.find((o) => o.value === goal)?.label ?? goal
  if (goal === 'MAINTAIN') return goalLabel
  const options: { value: string; label: string }[] =
    goal === 'LOSE' ? CUT_INTENSITY_OPTIONS : BULK_INTENSITY_OPTIONS
  const fallback = goal === 'LOSE' ? 'MODERATE' : 'STANDARD' // same defaults as the intensity step
  const intensityLabel = options.find((o) => o.value === (intensity || fallback))?.label
  return intensityLabel ? `${goalLabel} — ${intensityLabel}` : goalLabel
}

function metricsComplete(p: WizardProfile): boolean {
  const h = parseFloat(p.heightCm)
  const w = parseFloat(p.weightKg)
  const a = parseInt(p.age, 10)
  return (
    !isNaN(h) && h > 0 &&
    !isNaN(w) && w > 0 &&
    !isNaN(a) && a >= 1 && a <= 120 &&
    p.sex !== '' &&
    p.activityLevel !== ''
  )
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
  incomplete,
  incompleteMessage,
}: {
  step: number
  onBack: () => void
  onContinue: () => void
  continueLabel?: string
  continueDisabled?: boolean
  loading?: boolean
  /** If set, clicking Continue shows this warning + a "Skip anyway" link before advancing */
  incomplete?: boolean
  incompleteMessage?: string
}) {
  const [warned, setWarned] = useState(false)

  function handleContinue() {
    if (incomplete && !warned) {
      setWarned(true)
      return
    }
    setWarned(false)
    onContinue()
  }

  return (
    <div className="mt-8">
      {warned && incomplete && (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs text-amber-700">
            <strong>Heads up:</strong> {incompleteMessage ?? 'Please finish this step before continuing.'}
          </p>
          <button
            type="button"
            onClick={() => { setWarned(false); onContinue() }}
            className="shrink-0 text-xs text-amber-600 underline hover:text-amber-800 whitespace-nowrap"
          >
            Skip anyway
          </button>
        </div>
      )}
      <div className="flex items-center justify-between">
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
          onClick={handleContinue}
          disabled={continueDisabled || loading}
          className="rounded-md bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40"
        >
          {loading ? 'Saving…' : (continueLabel ?? 'Continue')}
        </button>
      </div>
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

// ─── Body Metrics Step ────────────────────────────────────────────────────────

function BodyMetricsStep({
  profile,
  stepNum,
  onUpdate,
  onBack,
  onContinue,
}: {
  profile: WizardProfile
  stepNum: number
  onUpdate: (patch: Partial<WizardProfile>) => void
  onBack: () => void
  onContinue: () => void
}) {
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric')

  // Imperial display state — kept in sync with profile.heightCm / profile.weightKg
  // When switching units we derive the display values from the stored metric values.
  const [ftRaw, setFtRaw] = useState(() => {
    const cm = parseFloat(profile.heightCm)
    if (!isNaN(cm)) return String(Math.floor(cm / 30.48))
    return ''
  })
  const [inRaw, setInRaw] = useState(() => {
    const cm = parseFloat(profile.heightCm)
    if (!isNaN(cm)) return String(Math.round((cm / 2.54) % 12))
    return ''
  })
  const [lbsRaw, setLbsRaw] = useState(() => {
    const kg = parseFloat(profile.weightKg)
    if (!isNaN(kg)) return String(Math.round(kg * 2.20462))
    return ''
  })

  // When switching to imperial, populate display from current metric values
  function switchToImperial() {
    const cm = parseFloat(profile.heightCm)
    const kg = parseFloat(profile.weightKg)
    if (!isNaN(cm)) {
      const totalIn = cm / 2.54
      setFtRaw(String(Math.floor(totalIn / 12)))
      setInRaw(String(Math.round(totalIn % 12)))
    }
    if (!isNaN(kg)) {
      setLbsRaw(String(Math.round(kg * 2.20462)))
    }
    setUnit('imperial')
  }

  // When switching to metric, populate display from current imperial values
  function switchToMetric() {
    const ft = parseInt(ftRaw, 10)
    const inches = parseInt(inRaw, 10)
    const lbs = parseFloat(lbsRaw)
    if (!isNaN(ft) || !isNaN(inches)) {
      const totalIn = (isNaN(ft) ? 0 : ft) * 12 + (isNaN(inches) ? 0 : inches)
      if (totalIn > 0) onUpdate({ heightCm: String(Math.round(totalIn * 2.54)) })
    }
    if (!isNaN(lbs) && lbs > 0) {
      onUpdate({ weightKg: String(Math.round((lbs / 2.20462) * 10) / 10) })
    }
    setUnit('metric')
  }

  // Handle imperial height change → update metric store
  function handleFtChange(val: string) {
    setFtRaw(val)
    const ft = parseInt(val, 10)
    const inches = parseInt(inRaw, 10)
    const totalIn = (isNaN(ft) ? 0 : ft) * 12 + (isNaN(inches) ? 0 : inches)
    if (totalIn > 0) onUpdate({ heightCm: String(Math.round(totalIn * 2.54)) })
    else onUpdate({ heightCm: '' })
  }
  function handleInChange(val: string) {
    setInRaw(val)
    const ft = parseInt(ftRaw, 10)
    const inches = parseInt(val, 10)
    const totalIn = (isNaN(ft) ? 0 : ft) * 12 + (isNaN(inches) ? 0 : inches)
    if (totalIn > 0) onUpdate({ heightCm: String(Math.round(totalIn * 2.54)) })
    else onUpdate({ heightCm: '' })
  }
  function handleLbsChange(val: string) {
    setLbsRaw(val)
    const lbs = parseFloat(val)
    if (!isNaN(lbs) && lbs > 0) {
      onUpdate({ weightKg: String(Math.round((lbs / 2.20462) * 10) / 10) })
    } else {
      onUpdate({ weightKg: '' })
    }
  }

  const inputCls = 'rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500'

  return (
    <div>
      <StepIndicator step={stepNum} path={profile.path} />
      <h1 className="text-2xl font-bold text-gray-900">Your body metrics</h1>
      <p className="mt-2 text-gray-500 text-sm">
        We use these to calculate a personalised calorie target. All fields are optional —
        skip this step if you prefer not to share.
      </p>

      {/* Unit toggle */}
      <div className="mt-5 inline-flex rounded-lg border border-gray-200 overflow-hidden text-sm">
        {(['metric', 'imperial'] as const).map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => u === 'metric' ? switchToMetric() : switchToImperial()}
            className={`px-4 py-2 font-medium transition-colors ${
              unit === u ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {u === 'metric' ? 'Metric (kg / cm)' : 'Imperial (lb / ft)'}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-5">

        {/* Height + Weight */}
        {unit === 'metric' ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
              <input
                type="number"
                min={50} max={272} step={0.5}
                value={profile.heightCm}
                onChange={(e) => onUpdate({ heightCm: e.target.value })}
                placeholder="e.g. 170"
                className={`w-full ${inputCls}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
              <input
                type="number"
                min={20} max={500} step={0.5}
                value={profile.weightKg}
                onChange={(e) => onUpdate({ weightKg: e.target.value })}
                placeholder="e.g. 70"
                className={`w-full ${inputCls}`}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0} max={8} step={1}
                  value={ftRaw}
                  onChange={(e) => handleFtChange(e.target.value)}
                  placeholder="5"
                  className={`w-20 ${inputCls}`}
                />
                <span className="text-sm text-gray-500">ft</span>
                <input
                  type="number"
                  min={0} max={11} step={1}
                  value={inRaw}
                  onChange={(e) => handleInChange(e.target.value)}
                  placeholder="7"
                  className={`w-20 ${inputCls}`}
                />
                <span className="text-sm text-gray-500">in</span>
                {profile.heightCm && (
                  <span className="text-xs text-gray-400">= {profile.heightCm} cm</span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (lbs)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={44} max={1100} step={1}
                  value={lbsRaw}
                  onChange={(e) => handleLbsChange(e.target.value)}
                  placeholder="154"
                  className={`w-28 ${inputCls}`}
                />
                <span className="text-sm text-gray-500">lbs</span>
                {profile.weightKg && (
                  <span className="text-xs text-gray-400">= {profile.weightKg} kg</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Age */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
          <input
            type="number"
            min={1} max={120} step={1}
            value={profile.age}
            onChange={(e) => onUpdate({ age: e.target.value })}
            placeholder="e.g. 32"
            className={`w-40 ${inputCls}`}
          />
        </div>

        {/* Sex */}
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-2">
            Biological sex <span className="font-normal text-gray-400">(used only for the BMR formula)</span>
          </legend>
          <div className="flex flex-wrap gap-4">
            {([
              { value: 'MALE',   label: 'Male'   },
              { value: 'FEMALE', label: 'Female' },
              { value: 'OTHER',  label: 'Prefer not to say / other' },
            ] as const).map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sex"
                  value={value}
                  checked={profile.sex === value}
                  onChange={() => onUpdate({ sex: value })}
                  className="h-4 w-4 border-gray-300 text-green-600"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Activity level */}
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-2">Activity level</legend>
          <div className="space-y-2">
            {ACTIVITY_LEVEL_OPTIONS.map(({ value, label, desc }) => (
              <label
                key={value}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  profile.activityLevel === value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <input
                  type="radio"
                  name="activityLevel"
                  value={value}
                  checked={profile.activityLevel === value}
                  onChange={() => onUpdate({ activityLevel: value })}
                  className="mt-0.5 h-4 w-4 border-gray-300 text-green-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Your measurements are stored securely and used only to personalise your calorie target.
      </p>

      <NavButtons
        step={stepNum}
        onBack={onBack}
        onContinue={onContinue}
        continueLabel="Continue"
        incomplete={!metricsComplete(profile)}
        incompleteMessage="Please fill in height, weight, age, sex, and activity level so we can calculate your calorie goal. You can skip if you'd prefer to set a target manually."
      />
    </div>
  )
}


// ─── Caloric Goal Step ────────────────────────────────────────────────────────

// ─── BMI recommendation helpers ───────────────────────────────────────────────

type BmiCategory = 'Underweight' | 'Healthy weight' | 'Overweight' | 'Obese'

/** What goal makes clinical sense for each BMI category. */
const BMI_RECOMMENDED_GOAL: Record<BmiCategory, WeightGoal> = {
  'Underweight':    'GAIN',
  'Healthy weight': 'MAINTAIN',
  'Overweight':     'LOSE',
  'Obese':          'LOSE',
}

/** Human-readable note shown next to the BMI category. */
const BMI_GUIDANCE: Record<BmiCategory, string> = {
  'Underweight':    'Your BMI is below 18.5. Building lean muscle or healthy weight gain is typically recommended.',
  'Healthy weight': 'Your BMI is in the healthy range (18.5–24.9). Maintaining is a great goal.',
  'Overweight':     'Your BMI is 25–29.9. A moderate calorie deficit can help move towards a healthier range.',
  'Obese':          'Your BMI is ≥ 30. A supervised, gradual deficit is usually the safest approach.',
}

/** Warning shown when the user's chosen goal conflicts with their BMI. */
function bmiConflictWarning(bmiCategory: BmiCategory, goal: WeightGoal): string | null {
  if (bmiCategory === 'Underweight' && goal === 'LOSE') {
    return 'Your BMI indicates you are underweight. A further calorie deficit may be unsafe — please consult a dietitian before cutting.'
  }
  if ((bmiCategory === 'Obese' || bmiCategory === 'Overweight') && goal === 'GAIN') {
    return 'At your current BMI, a calorie surplus for bulking is generally not recommended without professional guidance.'
  }
  return null
}

function CaloricGoalStep({
  profile,
  stepNum,
  onUpdate,
  onBack,
  onContinue,
}: {
  profile: WizardProfile
  stepNum: number
  onUpdate: (patch: Partial<WizardProfile>) => void
  onBack: () => void
  onContinue: () => void
}) {
  // If the user has an ED history, skip the calorie numbers entirely.
  if (profile.hasEdHistory) {
    return (
      <div>
        <StepIndicator step={stepNum} path={profile.path} />
        <h1 className="text-2xl font-bold text-gray-900">Calorie goal</h1>
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-5 py-5">
          <p className="text-sm font-semibold text-green-800">We'll focus on nutrients, not numbers</p>
          <p className="mt-2 text-sm text-green-700">
            Because you told us about your history with disordered eating, we won't set a
            calorie target. Your goals will focus on nourishing nutrients instead.
          </p>
        </div>
        <NavButtons step={stepNum} onBack={onBack} onContinue={onContinue} continueLabel="Continue" />
      </div>
    )
  }

  const h = parseFloat(profile.heightCm)
  const w = parseFloat(profile.weightKg)
  const a = parseInt(profile.age, 10)

  const sex           = profile.sex           as Sex
  const activityLevel = profile.activityLevel as ActivityLevel
  const weightGoal    = (profile.weightGoal   as WeightGoal) || 'MAINTAIN'
  const goalIntensity = profile.goalIntensity as GoalIntensity | ''

  // Derive the effective intensity — default if none chosen yet
  const effectiveIntensity: GoalIntensity | undefined =
    goalIntensity
      ? goalIntensity
      : weightGoal === 'LOSE' ? 'MODERATE'
      : weightGoal === 'GAIN' ? 'STANDARD'
      : undefined

  const result = calcCaloricTarget({
    heightCm: h, weightKg: w, age: a, sex, activityLevel, weightGoal,
    intensity: effectiveIntensity,
  })

  // Override input state
  const [overrideRaw, setOverrideRaw] = useState(
    profile.caloricGoalKcal !== null ? String(profile.caloricGoalKcal) : ''
  )
  const overrideVal   = parseInt(overrideRaw, 10)
  const overrideValid = !isNaN(overrideVal) && overrideVal >= 800 && overrideVal <= 10000

  // Sync confirmed target to parent when any input changes
  useEffect(() => {
    const confirmed = overrideValid ? overrideVal : result.targetKcal
    onUpdate({ caloricGoalKcal: confirmed, weightGoal, goalIntensity: effectiveIntensity ?? '' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weightGoal, goalIntensity, overrideRaw, result.targetKcal])

  const displayTarget = overrideValid ? overrideVal : result.targetKcal

  const BMI_COLOUR =
    result.bmiCategory === 'Healthy weight' ? 'text-green-700'
    : result.bmiCategory === 'Underweight'  ? 'text-blue-700'
    : result.bmiCategory === 'Overweight'   ? 'text-amber-700'
    :                                          'text-red-700'

  const BMI_BG =
    result.bmiCategory === 'Healthy weight' ? 'bg-green-50 border-green-200'
    : result.bmiCategory === 'Underweight'  ? 'bg-blue-50 border-blue-200'
    : result.bmiCategory === 'Overweight'   ? 'bg-amber-50 border-amber-200'
    :                                          'bg-red-50 border-red-200'

  const recommendedGoal = BMI_RECOMMENDED_GOAL[result.bmiCategory]
  const conflictWarning = bmiConflictWarning(result.bmiCategory, weightGoal)

  // Weekly rate display
  const weeklyRateAbs   = Math.abs(result.weeklyRateKg)
  const weeklyRateLabel =
    result.weeklyRateKg < 0 ? `~${weeklyRateAbs} kg/week loss`
    : result.weeklyRateKg > 0 ? `~${weeklyRateAbs} kg/week gain`
    : 'weight maintenance'

  // Offset label for the breakdown row
  const offsetLabel =
    result.offset === 0
      ? '—'
      : result.offset < 0
        ? `${result.offset.toLocaleString()} kcal (${Math.round(Math.abs(result.offset / result.tdee) * 100)}% deficit)`
        : `+${result.offset.toLocaleString()} kcal (+${Math.round((result.offset / result.tdee) * 100)}% surplus)`

  return (
    <div>
      <StepIndicator step={stepNum} path={profile.path} />
      <h1 className="text-2xl font-bold text-gray-900">Your calorie goal</h1>
      <p className="mt-2 text-gray-500 text-sm">
        Based on your body metrics, we've calculated your daily calorie needs using the
        Mifflin-St Jeor equation — the method most dietitians use today.
      </p>

      {/* ── BMI summary card ── */}
      <div className={`mt-5 rounded-xl border px-4 py-4 ${BMI_BG}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Your BMI</p>
            <p className={`text-2xl font-bold ${BMI_COLOUR}`}>{result.bmi}</p>
            <p className={`text-sm font-semibold ${BMI_COLOUR}`}>{result.bmiCategory}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">BMR (at rest)</p>
            <p className="text-xl font-bold text-gray-900">{result.bmr.toLocaleString()} kcal</p>
            <p className="text-xs text-gray-400">Base metabolic rate</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">TDEE (with activity)</p>
            <p className="text-xl font-bold text-gray-900">{result.tdee.toLocaleString()} kcal</p>
            <p className="text-xs text-gray-400">Total daily expenditure</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-600">{BMI_GUIDANCE[result.bmiCategory]}</p>
        {result.bmiCategory !== 'Healthy weight' && (
          <p className="mt-1 text-xs text-gray-400 italic">
            BMI is a screening tool, not a diagnosis — it doesn't account for muscle mass or ethnicity.
          </p>
        )}
      </div>

      {/* ── Goal selector ── */}
      <div className="mt-5">
        <p className="text-sm font-medium text-gray-700 mb-1">What is your goal?</p>
        <p className="text-xs text-gray-400 mb-3">
          Based on your BMI, we recommend <strong>{WEIGHT_GOAL_OPTIONS.find(o => o.value === recommendedGoal)?.label}</strong>.
        </p>
        <div className="space-y-2">
          {WEIGHT_GOAL_OPTIONS.map(({ value, label, desc }) => (
            <label
              key={value}
              className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-colors ${
                weightGoal === value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <input
                type="radio"
                name="weightGoal"
                value={value}
                checked={weightGoal === value}
                onChange={() => {
                  // Reset intensity when switching goal type
                  onUpdate({ weightGoal: value, goalIntensity: '' })
                }}
                className="mt-0.5 h-4 w-4 border-gray-300 text-green-600"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  {value === recommendedGoal && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Recommended for you
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* ── Conflict warning ── */}
      {conflictWarning && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          <strong>Heads up:</strong> {conflictWarning}
        </div>
      )}

      {/* ── Cut intensity sub-selector ── */}
      {weightGoal === 'LOSE' && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">How aggressive is your cut?</p>
          <div className="grid grid-cols-2 gap-2">
            {CUT_INTENSITY_OPTIONS.map(({ value, label, pct, rate }) => (
              <label
                key={value}
                className={`flex flex-col rounded-xl border-2 p-3 cursor-pointer transition-colors ${
                  (goalIntensity || 'MODERATE') === value
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <input
                  type="radio"
                  name="cutIntensity"
                  value={value}
                  checked={(goalIntensity || 'MODERATE') === value}
                  onChange={() => onUpdate({ goalIntensity: value })}
                  className="sr-only"
                />
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{pct}</p>
                <p className="text-xs text-green-700 font-medium mt-1">{rate}</p>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── Bulk intensity sub-selector ── */}
      {weightGoal === 'GAIN' && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">How aggressive is your bulk?</p>
          <div className="grid grid-cols-3 gap-2">
            {BULK_INTENSITY_OPTIONS.map(({ value, label, pct, rate }) => (
              <label
                key={value}
                className={`flex flex-col rounded-xl border-2 p-3 cursor-pointer transition-colors ${
                  (goalIntensity || 'STANDARD') === value
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <input
                  type="radio"
                  name="bulkIntensity"
                  value={value}
                  checked={(goalIntensity || 'STANDARD') === value}
                  onChange={() => onUpdate({ goalIntensity: value })}
                  className="sr-only"
                />
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{pct}</p>
                <p className="text-xs text-green-700 font-medium mt-1">{rate}</p>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── Live target breakdown ── */}
      <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Your calculated target</p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">TDEE (maintenance)</span>
            <span className="font-medium text-gray-900">{result.tdee.toLocaleString()} kcal</span>
          </div>
          {result.offset !== 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">{result.offset < 0 ? 'Calorie deficit' : 'Calorie surplus'}</span>
              <span className={`font-medium ${result.offset < 0 ? 'text-orange-600' : 'text-blue-600'}`}>{offsetLabel}</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-1.5 flex justify-between">
            <span className="font-semibold text-gray-900">Daily target</span>
            <span className="font-bold text-green-700 text-base">{displayTarget.toLocaleString()} kcal</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Acceptable range (±10%)</span>
            <span className="text-gray-500">{result.rangeMin.toLocaleString()}–{result.rangeMax.toLocaleString()} kcal</span>
          </div>
          {weightGoal !== 'MAINTAIN' && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Estimated weekly change</span>
              <span className={`font-medium ${result.weeklyRateKg < 0 ? 'text-orange-600' : 'text-blue-600'}`}>{weeklyRateLabel}</span>
            </div>
          )}
        </div>
      </div>

      {result.safetyFloorApplied && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          <strong>Safety minimum applied.</strong> Your calculated target was below the safe minimum ({sex === 'MALE' ? '1,500' : '1,200'} kcal).
          We've set it to {result.targetKcal.toLocaleString()} kcal — please speak to a dietitian if you need a lower intake.
        </div>
      )}

      {/* ── Manual override ── */}
      <div className="mt-4 rounded-xl border border-gray-200 p-4">
        <p className="text-sm font-medium text-gray-700">
          Override target <span className="font-normal text-gray-400">(optional)</span>
        </p>
        <p className="mt-1 text-xs text-gray-500">
          If your dietitian or coach has given you a specific calorie target, enter it here.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min={800}
            max={10000}
            step={50}
            value={overrideRaw}
            onChange={(e) => setOverrideRaw(e.target.value)}
            placeholder={String(result.targetKcal)}
            className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <span className="text-sm text-gray-500">kcal/day</span>
          {overrideRaw && !overrideValid && (
            <span className="text-xs text-red-500">Enter a value between 800 and 10,000</span>
          )}
          {overrideRaw && overrideValid && (
            <span className="text-xs text-green-600">✓ Override applied</span>
          )}
        </div>
        {overrideRaw && overrideValid && (
          <button
            type="button"
            onClick={() => setOverrideRaw('')}
            className="mt-2 text-xs text-gray-400 hover:text-red-500"
          >
            Remove override — use calculated {result.targetKcal.toLocaleString()} kcal
          </button>
        )}
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Calculations use Mifflin-St Jeor (1990). Estimates only — not medical advice.
        Always confirm targets with your dietitian or healthcare provider.
      </p>

      <NavButtons step={stepNum} onBack={onBack} onContinue={onContinue} />
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
  stepNum,
}: {
  path: Path
  careTeamFlags: string[]
  pendingGoals: NutrientTarget[]
  setPendingGoals: React.Dispatch<React.SetStateAction<NutrientTarget[]>>
  onBack: () => void
  onContinue: () => void
  stepNum: number
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
  zipCode: '',
  country: '',
  heightCm: '',
  weightKg: '',
  age: '',
  sex: '',
  activityLevel: '',
  weightGoal: '',
  goalIntensity: '',
  caloricGoalKcal: null,
}

/** sessionStorage key for the first-time onboarding draft (cleared after save). */
const DRAFT_KEY = 'nutripath_wizard_draft'

interface WizardDraft {
  step: number
  profile: WizardProfile
  pendingGoals: NutrientTarget[]
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

  // ── Draft persistence (first-time onboarding only) ──────────────────────────
  // Restore after mount, not in useState initialisers: the server render has no
  // sessionStorage, so reading it during the first render would cause a
  // hydration mismatch. `draftRestored` keeps the save effect from overwriting
  // a stored draft with the blank initial state before the restore has run.
  const persistDraft = !initialProfile
  const [draftRestored, setDraftRestored] = useState(false)

  useEffect(() => {
    if (!persistDraft) return
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (raw) {
        const draft = JSON.parse(raw) as Partial<WizardDraft>
        const restoredProfile: WizardProfile = { ...BLANK, ...draft.profile }
        setProfile(restoredProfile)
        if (Array.isArray(draft.pendingGoals)) setPendingGoals(draft.pendingGoals)
        const max = totalSteps(restoredProfile.path)
        if (typeof draft.step === 'number' && draft.step >= 1) setStep(Math.min(draft.step, max))
      }
    } catch { /* corrupt or unavailable storage — start fresh */ }
    setDraftRestored(true)
  }, [persistDraft])

  useEffect(() => {
    if (!persistDraft || !draftRestored) return
    try {
      const draft: WizardDraft = { step, profile, pendingGoals }
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch { /* storage full or private mode — persistence is best-effort */ }
  }, [persistDraft, draftRestored, step, profile, pendingGoals])

  function update(patch: Partial<WizardProfile>) {
    setProfile((prev) => ({ ...prev, ...patch }))
  }

  const isAfter = profile.path === 'AFTER'
  const last = totalSteps(profile.path)

  // ── Step routing ─────────────────────────────────────────────────────────────
  // BEFORE: 1=path  2=lifestyle  3=body-metrics  4=caloric-goal  5=allergens  6=medications  7=sensitive  8=goals  9=review
  // AFTER:  1=path  2=lifestyle  3=care-team  4=body-metrics  5=caloric-goal  6=allergens  7=medications  8=sensitive  9=goals  10=review

  function goBack() { setStep((s) => s - 1) }
  function goNext() { setStep((s) => s + 1) }
  function selectPath(p: Path) { setProfile((prev) => ({ ...prev, path: p })); setStep(2) }

  async function handleSave() {
    setLoading(true)
    setSaveError(null)

    // Inject the caloric goal as a NutrientTarget if not hiding calories and
    // we have a valid computed or overridden target.
    let goalsToSave = [...pendingGoals]
    if (!profile.hideCalories && !profile.hasEdHistory && profile.caloricGoalKcal) {
      const calorieGoal: NutrientTarget = {
        nutrient: 'calories',
        targetMin: profile.caloricGoalKcal - 100,
        targetMax: profile.caloricGoalKcal + 100,
        unit: 'kcal',
        label: `Calories (${profile.caloricGoalKcal.toLocaleString()} kcal/day target)`,
        source: 'GUIDELINES',
      }
      // Only inject if not already set by user
      if (!goalsToSave.some((g) => g.nutrient === 'calories')) {
        goalsToSave = [calorieGoal, ...goalsToSave]
      }
    }

    try {
      await onSave({ profile, goals: goalsToSave })
      if (persistDraft) {
        try { sessionStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Step indices derived from path
  const bodyMetricsStep   = isAfter ? 4 : 3
  const caloricGoalStep   = isAfter ? 5 : 4
  const allergensStep     = isAfter ? 6 : 5
  const medicationsStep   = isAfter ? 7 : 6
  const sensitiveStep     = isAfter ? 8 : 7
  const goalsStep         = isAfter ? 9 : 8
  const reviewStep        = last

  // Review-step numbers. BMI and calories are hidden when the user hides
  // calories or disclosed ED history (GUIDELINES: never focus on weight).
  const showBodyNumbers = !profile.hideCalories && !profile.hasEdHistory
  const reviewCalc = metricsComplete(profile)
    ? calcCaloricTarget({
        heightCm: parseFloat(profile.heightCm),
        weightKg: parseFloat(profile.weightKg),
        age: parseInt(profile.age, 10),
        sex: profile.sex as Sex,
        activityLevel: profile.activityLevel as ActivityLevel,
        weightGoal: (profile.weightGoal || 'MAINTAIN') as WeightGoal,
        intensity: profile.goalIntensity || undefined,
      })
    : null

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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP / Postcode <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={profile.zipCode}
                  onChange={(e) => update({ zipCode: e.target.value })}
                  placeholder="e.g. 10001 or SW1A 1AA"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={profile.country}
                  onChange={(e) => update({ country: e.target.value.toUpperCase().slice(0, 2) })}
                  placeholder="e.g. US, GB, CA"
                  maxLength={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                <p className="mt-1 text-xs text-gray-400">2-letter country code</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 -mt-2">Used to find nearby farmers markets and local dietitians.</p>
          </div>
          <NavButtons
            step={2}
            onBack={goBack}
            onContinue={goNext}
            incomplete={!profile.budget || !profile.schedule}
            incompleteMessage="Please select your food budget and cooking time before continuing."
          />
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

      {/* Body metrics step */}
      {step === bodyMetricsStep && (
        <BodyMetricsStep
          profile={profile}
          stepNum={bodyMetricsStep}
          onUpdate={update}
          onBack={goBack}
          onContinue={goNext}
        />
      )}

      {/* Caloric goal step */}
      {step === caloricGoalStep && (
        metricsComplete(profile) ? (
          <CaloricGoalStep
            profile={profile}
            stepNum={caloricGoalStep}
            onUpdate={update}
            onBack={goBack}
            onContinue={goNext}
          />
        ) : (
          // Metrics were skipped — show a brief note and move on
          <div>
            <StepIndicator step={caloricGoalStep} path={profile.path} />
            <h1 className="text-2xl font-bold text-gray-900">Calorie goal</h1>
            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 px-5 py-5">
              <p className="text-sm font-semibold text-gray-700">No metrics provided</p>
              <p className="mt-2 text-sm text-gray-500">
                You skipped the body metrics step, so we can't calculate a personalised calorie target.
                You can always set one later from your profile, or enter one manually below.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="number"
                  min={800}
                  max={10000}
                  step={50}
                  value={profile.caloricGoalKcal ?? ''}
                  onChange={(e) => update({ caloricGoalKcal: e.target.value ? parseInt(e.target.value, 10) : null })}
                  placeholder="e.g. 2000"
                  className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                <span className="text-sm text-gray-500">kcal/day <span className="text-gray-400">(optional)</span></span>
              </div>
            </div>
            <NavButtons step={caloricGoalStep} onBack={goBack} onContinue={goNext} />
          </div>
        )
      )}

      {/* Allergens */}
      {step === allergensStep && (
        <div>
          <StepIndicator step={allergensStep} path={profile.path} />
          <h1 className="text-2xl font-bold text-gray-900">Do you have any food allergies?</h1>
          <div className="mt-6 space-y-3">
            {ALLERGENS.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={profile.allergens.includes(value)} onChange={() => toggleAllergen(value)} className="h-4 w-4 rounded border-gray-300 text-green-600" />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
          <div className="mt-5">
            <TagInput
              label="Any other allergies or intolerances?"
              hint="Type one and press Enter — e.g. mustard, kiwi, celery. We'll flag foods whose names mention it."
              tags={customAllergens(profile.allergens)}
              onChange={(custom) => update({ allergens: withCustomAllergens(profile.allergens, custom) })}
              placeholder="e.g. mustard"
            />
          </div>
          <p className="mt-4 text-xs text-gray-400">We'll make sure none of your plans or suggestions include these. Food data doesn't always list every ingredient, so please still check labels.</p>
          <NavButtons step={allergensStep} onBack={goBack} onContinue={goNext} />
        </div>
      )}

      {/* Medications */}
      {step === medicationsStep && (
        <div>
          <StepIndicator step={medicationsStep} path={profile.path} />
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
          <NavButtons step={medicationsStep} onBack={goBack} onContinue={goNext} />
        </div>
      )}

      {/* Sensitive flags */}
      {step === sensitiveStep && (
        <div>
          <StepIndicator step={sensitiveStep} path={profile.path} />
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
          <NavButtons step={sensitiveStep} onBack={goBack} onContinue={goNext} />
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
          stepNum={goalsStep}
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
            {(profile.heightCm || profile.weightKg) && (
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="font-medium text-gray-500 shrink-0">Body metrics</dt>
                <dd className="text-gray-900 text-right">
                  {profile.heightCm ? `${profile.heightCm} cm` : '—'} / {profile.weightKg ? `${profile.weightKg} kg` : '—'}
                  {profile.age ? `, age ${profile.age}` : ''}
                </dd>
              </div>
            )}
            {showBodyNumbers && reviewCalc && (
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="font-medium text-gray-500 shrink-0">BMI</dt>
                <dd className="text-gray-900 text-right">
                  {reviewCalc.bmi} <span className="text-gray-500">({reviewCalc.bmiCategory})</span>
                  <span className="block text-xs text-gray-400">A screening tool, not a diagnosis</span>
                </dd>
              </div>
            )}
            {showBodyNumbers && profile.weightGoal && (
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="font-medium text-gray-500 shrink-0">Goal</dt>
                <dd className="text-gray-900 text-right">{goalWithIntensityLabel(profile.weightGoal, profile.goalIntensity)}</dd>
              </div>
            )}
            {showBodyNumbers && profile.caloricGoalKcal && (
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="font-medium text-gray-500 shrink-0">Calorie target</dt>
                <dd className="text-gray-900 text-right">
                  {profile.caloricGoalKcal.toLocaleString()} kcal/day
                  {reviewCalc && reviewCalc.targetKcal !== profile.caloricGoalKcal && (
                    <span className="block text-xs text-gray-400">
                      Calculated: {reviewCalc.targetKcal.toLocaleString()} kcal/day (you adjusted it)
                    </span>
                  )}
                </dd>
              </div>
            )}
            {(profile.hideCalories || profile.hasEdHistory) && (
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="font-medium text-gray-500 shrink-0">Calorie target</dt>
                <dd className="text-gray-500 italic text-xs">Hidden — focusing on nutrients</dd>
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
