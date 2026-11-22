import type { FoodInput, ProfileInput, SafetyResult } from '@/types/safety'

interface ConflictEntry {
  conflictFoods: string[]
  message: (food: string, med: string) => string
}

/** Food-medication conflict map — sourced from MedlinePlus */
const CONFLICT_MAP: Record<string, ConflictEntry> = {
  warfarin: {
    conflictFoods: ['spinach', 'kale', 'broccoli', 'brussels sprouts', 'collard greens', 'swiss chard', 'parsley'],
    message: (food, med) =>
      `Check with your pharmacist before eating ${food} while taking ${med}. It is high in vitamin K, which may affect how ${med} works.`,
  },
  phenelzine: {
    conflictFoods: ['aged cheese', 'cheddar', 'brie', 'camembert', 'parmesan', 'cured meat', 'salami', 'pepperoni', 'soy sauce', 'beer', 'wine', 'miso', 'kimchi', 'sauerkraut'],
    message: (food, med) =>
      `Check with your pharmacist before eating ${food} while taking ${med}. Aged and fermented foods may cause a serious reaction with MAOIs.`,
  },
  tranylcypromine: {
    conflictFoods: ['aged cheese', 'cheddar', 'brie', 'camembert', 'parmesan', 'cured meat', 'salami', 'pepperoni', 'soy sauce', 'beer', 'wine', 'miso', 'kimchi', 'sauerkraut'],
    message: (food, med) =>
      `Check with your pharmacist before eating ${food} while taking ${med}. Aged and fermented foods may cause a serious reaction with MAOIs.`,
  },
  isocarboxazid: {
    conflictFoods: ['aged cheese', 'cheddar', 'brie', 'camembert', 'parmesan', 'cured meat', 'salami', 'pepperoni', 'soy sauce', 'beer', 'wine', 'miso', 'kimchi', 'sauerkraut'],
    message: (food, med) =>
      `Check with your pharmacist before eating ${food} while taking ${med}. Aged and fermented foods may cause a serious reaction with MAOIs.`,
  },
  atorvastatin: {
    conflictFoods: ['grapefruit', 'grapefruit juice'],
    message: (food, med) =>
      `Check with your pharmacist before eating ${food} while taking ${med}. Grapefruit can increase the amount of this medication in your blood.`,
  },
  simvastatin: {
    conflictFoods: ['grapefruit', 'grapefruit juice'],
    message: (food, med) =>
      `Check with your pharmacist before eating ${food} while taking ${med}. Grapefruit can increase the amount of this medication in your blood.`,
  },
  lovastatin: {
    conflictFoods: ['grapefruit', 'grapefruit juice'],
    message: (food, med) =>
      `Check with your pharmacist before eating ${food} while taking ${med}. Grapefruit can increase the amount of this medication in your blood.`,
  },
  lithium: {
    conflictFoods: ['coffee', 'tea', 'energy drink', 'caffeine'],
    message: (food, med) =>
      `Check with your pharmacist before consuming ${food} while taking ${med}. Large changes in caffeine intake may affect lithium levels.`,
  },
}

/** Normalize a user-entered medication name for map lookup */
function normalizeMed(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
}

/**
 * Checks whether any food in the user's log conflicts with their medications.
 * - Known medication with a conflicting ingredient → 'warn' with specific message
 * - Unknown medication → 'warn' with standing message
 * - Known medication, no conflict → 'ok'
 * - No medications on profile → 'ok'
 */
export function checkMedications(food: FoodInput, profile: ProfileInput): SafetyResult {
  if (profile.medications.length === 0) {
    return { level: 'ok', warnings: [] }
  }

  const warnings: string[] = []

  for (const rawMed of profile.medications) {
    const normalizedMed = normalizeMed(rawMed)
    const entry = CONFLICT_MAP[normalizedMed]

    if (entry === undefined) {
      warnings.push(
        `We don't have specific conflict information for ${rawMed} — check with your pharmacist before making dietary changes.`
      )
      continue
    }

    // Check food name and each ingredient for a conflict
    const foodTerms = [food.name.toLowerCase(), ...food.ingredients.map((i) => i.toLowerCase())]
    for (const conflictFood of entry.conflictFoods) {
      const conflictLower = conflictFood.toLowerCase()
      const matched = foodTerms.some((term) => term.includes(conflictLower))
      if (matched) {
        warnings.push(entry.message(food.name, rawMed))
        break // one warning per medication is enough
      }
    }
  }

  if (warnings.length > 0) {
    return { level: 'warn', warnings }
  }

  return { level: 'ok', warnings: [] }
}
