// lib/goals.ts
// Deterministic goal derivation — no AI.
// Sources:
//   Dietary Guidelines for Americans 2020–2025 (dietaryguidelines.gov)
//   NIH Office of Dietary Supplements (ods.od.nih.gov)
//   MedlinePlus (medlineplus.gov)

import type { NutrientTarget, SuggestedGoal } from '@/types/goals'

// ---------------------------------------------------------------------------
// Profile shape accepted by deriveGoals (subset of Prisma Profile)
// ---------------------------------------------------------------------------

export interface GoalProfile {
  path: 'BEFORE' | 'AFTER'
  careTeamFlags?: string[]
  medicalHistory?: string | null
}

// ---------------------------------------------------------------------------
// Dietary Guidelines 2020–2025 baseline for a 2,000 kcal adult diet
// ---------------------------------------------------------------------------

const GUIDELINES_BASELINE: NutrientTarget[] = [
  {
    nutrient: 'fiber',
    targetMin: 28,
    unit: 'g',
    label: 'Fibre',
    source: 'GUIDELINES',
  },
  {
    nutrient: 'sodium',
    targetMax: 2300,
    unit: 'mg',
    label: 'Sodium',
    source: 'GUIDELINES',
  },
  {
    nutrient: 'saturated fat',
    targetMax: 22,
    unit: 'g',
    label: 'Saturated fat',
    source: 'GUIDELINES',
  },
  {
    nutrient: 'added sugars',
    targetMax: 50,
    unit: 'g',
    label: 'Added sugars',
    source: 'GUIDELINES',
  },
  {
    nutrient: 'calcium',
    targetMin: 1000,
    unit: 'mg',
    label: 'Calcium',
    source: 'GUIDELINES',
  },
  {
    nutrient: 'vitamin d',
    targetMin: 15,
    unit: 'mcg',
    label: 'Vitamin D',
    source: 'GUIDELINES',
  },
  {
    nutrient: 'iron',
    targetMin: 18,
    unit: 'mg',
    label: 'Iron (female DRI used as default)',
    source: 'GUIDELINES',
  },
  {
    nutrient: 'potassium',
    targetMin: 2600,
    unit: 'mg',
    label: 'Potassium',
    source: 'GUIDELINES',
  },
]

// ---------------------------------------------------------------------------
// CareTeamFlag → nutrient adjustment map
// ---------------------------------------------------------------------------

type CareTeamAdjustment = {
  flag: string
  targets: NutrientTarget[]
}

const CARE_TEAM_ADJUSTMENTS: CareTeamAdjustment[] = [
  {
    flag: 'LOW_IRON',
    targets: [
      {
        nutrient: 'iron',
        targetMin: 18,
        unit: 'mg',
        label: 'Your care team mentioned your iron levels',
        source: 'CARE_TEAM',
      },
    ],
  },
  {
    flag: 'LOW_VITAMIN_D',
    targets: [
      {
        nutrient: 'vitamin d',
        targetMin: 20,
        unit: 'mcg',
        label: 'Your care team mentioned your vitamin D',
        source: 'CARE_TEAM',
      },
    ],
  },
  {
    flag: 'LOW_B12',
    targets: [
      {
        nutrient: 'vitamin b12',
        targetMin: 2.4,
        unit: 'mcg',
        label: 'Your care team mentioned your B12',
        source: 'CARE_TEAM',
      },
    ],
  },
  {
    flag: 'HIGH_CHOLESTEROL',
    targets: [
      {
        nutrient: 'saturated fat',
        targetMax: 15,
        unit: 'g',
        label: 'Saturated fat (adjusted for your care team notes)',
        source: 'CARE_TEAM',
      },
      {
        nutrient: 'fiber',
        targetMin: 30,
        unit: 'g',
        label: 'Fibre (adjusted for your care team notes)',
        source: 'CARE_TEAM',
      },
    ],
  },
  {
    flag: 'HIGH_BLOOD_SUGAR',
    targets: [
      {
        nutrient: 'added sugars',
        targetMax: 25,
        unit: 'g',
        label: 'Added sugars (adjusted for your care team notes)',
        source: 'CARE_TEAM',
      },
      {
        nutrient: 'fiber',
        targetMin: 30,
        unit: 'g',
        label: 'Fibre (adjusted for your care team notes)',
        source: 'CARE_TEAM',
      },
    ],
  },
  {
    flag: 'HIGH_BLOOD_PRESSURE',
    targets: [
      {
        nutrient: 'sodium',
        targetMax: 1500,
        unit: 'mg',
        label: 'Sodium (adjusted for your care team notes)',
        source: 'CARE_TEAM',
      },
      {
        nutrient: 'potassium',
        targetMin: 3500,
        unit: 'mg',
        label: 'Potassium (adjusted for your care team notes)',
        source: 'CARE_TEAM',
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// deriveGoals — deterministic, no AI
// ---------------------------------------------------------------------------

/**
 * Returns Dietary Guidelines for Americans default nutrient targets,
 * then overlays any CareTeamFlag adjustments from the profile.
 *
 * Source: Dietary Guidelines for Americans 2020–2025 (dietaryguidelines.gov)
 */
export function deriveGoals(profile: GoalProfile): NutrientTarget[] {
  // Start with a mutable copy of the baseline keyed by nutrient name.
  const targets = new Map<string, NutrientTarget>(
    GUIDELINES_BASELINE.map((t) => [t.nutrient, { ...t }])
  )

  // Apply CareTeamFlag overrides when the profile has flags.
  const flags = profile.careTeamFlags ?? []
  for (const adjustment of CARE_TEAM_ADJUSTMENTS) {
    if (!flags.includes(adjustment.flag)) continue
    for (const override of adjustment.targets) {
      targets.set(override.nutrient, { ...override })
    }
  }

  return Array.from(targets.values())
}

// ---------------------------------------------------------------------------
// Keyword map for suggestGoalsFromHistory
// ---------------------------------------------------------------------------

type KeywordEntry = {
  keywords: string[]
  goals: SuggestedGoal[]
  /**
   * Optional extra condition applied after keyword match.
   * Receives the original lowercased text and the matched keyword.
   */
  extraCondition?: (lowerText: string) => boolean
}

const KEYWORD_MAP: KeywordEntry[] = [
  {
    keywords: [
      'anaemia', 'anemia', 'low iron', 'iron deficiency', 'iron levels',
      'iron low', 'need more iron', 'eat more iron',
    ],
    goals: [
      {
        nutrient: 'iron',
        targetMin: 18,
        unit: 'mg',
        source: 'CURATED',
        reason:
          'Iron-rich foods may support your energy levels. Source: NIH Office of Dietary Supplements.',
      },
    ],
  },
  {
    keywords: [
      'b12', 'vitamin b12', 'b-12', 'fatigue', 'tiredness', 'low energy',
      'tired all the time', 'always tired', 'lack of energy', 'feeling tired',
      'vitamin b', 'b12 low', 'low b12',
    ],
    goals: [
      {
        nutrient: 'vitamin b12',
        targetMin: 2.4,
        unit: 'mcg',
        source: 'CURATED',
        reason:
          'B12 supports nerve function and energy. Source: NIH Office of Dietary Supplements.',
      },
    ],
    extraCondition: (text) => {
      const hasB12Term = /b12|b-12|vitamin b/.test(text)
      const hasFatigue = /fatigue|tiredness|tired|energy/.test(text)
      return hasB12Term || hasFatigue
    },
  },
  {
    keywords: [
      'constipation', 'digestive', 'bowel', 'fibre', 'fiber',
      'gut health', 'gut', 'bloating', 'bloated', 'irregular',
      'more fibre', 'more fiber', 'eat more vegetables',
    ],
    goals: [
      {
        nutrient: 'fiber',
        targetMin: 28,
        unit: 'g',
        source: 'CURATED',
        reason:
          'Fibre supports digestive health. Source: Dietary Guidelines for Americans.',
      },
    ],
  },
  {
    keywords: [
      'cholesterol', 'heart', 'lipids', 'cardiovascular',
      'heart health', 'heart disease', 'coronary', 'saturated fat',
      'high fat', 'high ldl', 'high cholesterol',
    ],
    goals: [
      {
        nutrient: 'saturated fat',
        targetMax: 15,
        unit: 'g',
        source: 'CURATED',
        reason:
          'Limiting saturated fat supports heart health. Source: Dietary Guidelines for Americans.',
      },
      {
        nutrient: 'fiber',
        targetMin: 30,
        unit: 'g',
        source: 'CURATED',
        reason:
          'Fibre can help manage cholesterol levels. Source: NIH Office of Dietary Supplements.',
      },
    ],
  },
  {
    keywords: [
      'blood sugar', 'glucose', 'diabetes', 'insulin resistance',
      'glycaemic', 'glycemic', 'type 2', 'pre-diabetes', 'prediabetes',
      'sugar levels', 'sugary', 'too much sugar', 'reduce sugar', 'cut sugar',
    ],
    goals: [
      {
        nutrient: 'fiber',
        targetMin: 30,
        unit: 'g',
        source: 'CURATED',
        reason:
          'Fibre helps slow glucose absorption. Source: Dietary Guidelines for Americans.',
      },
      {
        nutrient: 'added sugars',
        targetMax: 25,
        unit: 'g',
        source: 'CURATED',
        reason:
          'Reducing added sugars supports blood sugar balance. Source: Dietary Guidelines for Americans.',
      },
    ],
  },
  {
    keywords: [
      'bone', 'osteoporosis', 'osteopenia', 'fracture',
      'bone density', 'calcium', 'low calcium', 'bone health',
      'vitamin d', 'low vitamin d', 'vitamin d low', 'sunshine vitamin',
    ],
    goals: [
      {
        nutrient: 'calcium',
        targetMin: 1000,
        unit: 'mg',
        source: 'CURATED',
        reason:
          'Calcium is essential for bone health. Source: NIH Office of Dietary Supplements.',
      },
      {
        nutrient: 'vitamin d',
        targetMin: 15,
        unit: 'mcg',
        source: 'CURATED',
        reason:
          'Vitamin D helps your body absorb calcium. Source: NIH Office of Dietary Supplements.',
      },
    ],
  },
  {
    keywords: [
      'blood pressure', 'hypertension', 'high bp',
      'high blood pressure', 'bp', 'reduce salt', 'less salt',
      'lower sodium', 'cut salt', 'sodium',
    ],
    goals: [
      {
        nutrient: 'sodium',
        targetMax: 1500,
        unit: 'mg',
        source: 'CURATED',
        reason:
          'Reducing sodium can support healthy blood pressure. Source: Dietary Guidelines for Americans.',
      },
      {
        nutrient: 'potassium',
        targetMin: 3500,
        unit: 'mg',
        source: 'CURATED',
        reason:
          'Potassium-rich foods are linked to lower blood pressure. Source: NIH Office of Dietary Supplements.',
      },
    ],
  },
  {
    keywords: [
      'weight', 'overweight', 'lose weight', 'healthy weight',
      'eat healthier', 'eat better', 'healthier diet', 'balanced diet',
      'general health', 'overall health', 'wellness', 'feel better',
      'improve diet', 'nutrition', 'nutrient', 'healthy eating',
    ],
    goals: [
      {
        nutrient: 'fiber',
        targetMin: 28,
        unit: 'g',
        source: 'CURATED',
        reason:
          'Fibre supports fullness and overall diet quality. Source: Dietary Guidelines for Americans.',
      },
      {
        nutrient: 'added sugars',
        targetMax: 50,
        unit: 'g',
        source: 'CURATED',
        reason:
          'Keeping added sugars in check supports a balanced diet. Source: Dietary Guidelines for Americans.',
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// suggestGoalsFromHistory — keyword matching, no AI, no diagnosis
// ---------------------------------------------------------------------------

/**
 * Returns suggested goals based on case-insensitive keyword matching against
 * the user's free-text medical history.
 *
 * Deduplicates by nutrient, keeping the most restrictive value
 * (higher targetMin or lower targetMax).
 *
 * Sources: NIH Office of Dietary Supplements, Dietary Guidelines for Americans 2020–2025.
 */
export function suggestGoalsFromHistory(text: string): SuggestedGoal[] {
  const lower = text.trim().toLowerCase()
  const accumulated = new Map<string, SuggestedGoal>()

  for (const entry of KEYWORD_MAP) {
    const matched = entry.keywords.some((kw) => lower.includes(kw))
    if (!matched) continue
    if (entry.extraCondition && !entry.extraCondition(lower)) continue

    for (const goal of entry.goals) {
      const existing = accumulated.get(goal.nutrient)
      if (!existing) {
        accumulated.set(goal.nutrient, { ...goal })
      } else {
        // Keep most restrictive: higher min, lower max.
        const mergedMin =
          goal.targetMin !== undefined && existing.targetMin !== undefined
            ? Math.max(goal.targetMin, existing.targetMin)
            : goal.targetMin ?? existing.targetMin
        const mergedMax =
          goal.targetMax !== undefined && existing.targetMax !== undefined
            ? Math.min(goal.targetMax, existing.targetMax)
            : goal.targetMax ?? existing.targetMax
        accumulated.set(goal.nutrient, {
          ...existing,
          targetMin: mergedMin,
          targetMax: mergedMax,
        })
      }
    }
  }

  // If nothing matched, return the Dietary Guidelines baseline so the user
  // always gets useful suggestions rather than an empty list.
  if (accumulated.size === 0) {
    return GUIDELINES_BASELINE.map((g) => ({
      ...g,
      source: 'CURATED' as const,
      reason:
        'General healthy eating targets from the Dietary Guidelines for Americans 2020–2025.',
    }))
  }

  return Array.from(accumulated.values())
}
