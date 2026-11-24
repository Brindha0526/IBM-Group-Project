import { describe, it, expect } from 'vitest'
import {
  nutrientAmount,
  nutrientTotal,
  goalStatus,
  summarizeWeek,
  buildWeeklyReport,
  visibleGoals,
  type SummaryLog,
  type SummaryGoal,
} from '@/lib/summary'

const KEYS = ['2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24']
// Tests use the date part of loggedAt as the local day so they don't depend on TZ
const toKey = (iso: string) => iso.slice(0, 10)

function log(day: string, foodName: string, nutrients: Record<string, number>, servingG = 100): SummaryLog {
  return { id: `${day}-${foodName}`, foodName, servingG, loggedAt: `${day}T12:00:00.000Z`, nutrients }
}

const fiber: SummaryGoal = { nutrient: 'fiber', targetMin: 28, unit: 'g', label: 'Fibre', source: 'GUIDELINES' }
const sodium: SummaryGoal = { nutrient: 'sodium', targetMin: null, targetMax: 2300, unit: 'mg', label: 'Sodium', source: 'GUIDELINES' }
const calories: SummaryGoal = { nutrient: 'calories', targetMin: 1800, targetMax: 2200, unit: 'kcal', source: 'USER_DEFINED' }
const freeText: SummaryGoal = { nutrient: 'eat more greens', unit: '', source: 'USER_DEFINED' }

describe('nutrient matching', () => {
  it('maps goal names to USDA nutrient names, including aliases', () => {
    const n = {
      'Energy': 250,
      'Fiber, total dietary': 8,
      'Sodium, Na': 400,
      'Fatty acids, total saturated': 3,
      'Vitamin B-12': 1.2,
      'Vitamin D (D2 + D3), International Units': 40,
      'Vitamin D (D2 + D3)': 1,
    }
    expect(nutrientAmount(n, 'calories')).toBe(250)
    expect(nutrientAmount(n, 'fiber')).toBe(8)
    expect(nutrientAmount(n, 'sodium')).toBe(400)
    expect(nutrientAmount(n, 'saturated fat')).toBe(3)
    expect(nutrientAmount(n, 'vitamin b12')).toBe(1.2)
    expect(nutrientAmount(n, 'vitamin d')).toBe(1) // µg, not the IU entry
    expect(nutrientAmount(n, 'potassium')).toBeNull()
  })

  it('nutrientTotal is null when no log reports the nutrient', () => {
    const logs = [log(KEYS[0], 'a', { 'Fiber, total dietary': 5 }), log(KEYS[0], 'b', { Energy: 10 })]
    expect(nutrientTotal(logs, 'fiber')).toBe(5)
    expect(nutrientTotal(logs, 'iron')).toBeNull()
    expect(nutrientTotal([], 'fiber')).toBeNull()
  })
})

describe('goalStatus', () => {
  it('handles min, max and range goals', () => {
    expect(goalStatus(fiber, 30, true)).toBe('met')
    expect(goalStatus(fiber, 20, true)).toBe('not-met')
    expect(goalStatus(sodium, 2000, true)).toBe('met')
    expect(goalStatus(sodium, 2500, true)).toBe('not-met')
    expect(goalStatus(calories, 2000, true)).toBe('met')
    expect(goalStatus(calories, 1500, true)).toBe('not-met')
  })

  it('a day without logs is no-data, never not-met', () => {
    expect(goalStatus(fiber, null, false)).toBe('no-data')
  })

  it('a logged day missing the nutrient counts as 0 (max goals met, min goals not)', () => {
    expect(goalStatus(fiber, null, true)).toBe('not-met')
    expect(goalStatus(sodium, null, true)).toBe('met')
  })

  it('goals without numeric targets are no-target', () => {
    expect(goalStatus(freeText, 5, true)).toBe('no-target')
  })
})

describe('summarizeWeek', () => {
  const logs = [
    log(KEYS[0], 'Lentils', { Energy: 900, 'Fiber, total dietary': 30, 'Sodium, Na': 100 }),
    log(KEYS[0], 'Rice', { Energy: 400, 'Fiber, total dietary': 1 }),
    log(KEYS[2], 'Toast', { Energy: 300, 'Fiber, total dietary': 4, 'Sodium, Na': 2600 }),
    log('2026-11-10', 'Outside range', { Energy: 999 }),
  ]
  const week = summarizeWeek(logs, [fiber, sodium], KEYS, toKey)

  it('groups logs by day and ignores logs outside the range', () => {
    expect(week.days).toHaveLength(7)
    expect(week.days[0].logs).toHaveLength(2)
    expect(week.days[1].logs).toHaveLength(0)
    expect(week.days[2].logs).toHaveLength(1)
    expect(week.daysLogged).toBe(2)
  })

  it('totals calories and goal nutrients per day', () => {
    expect(week.days[0].calories).toBe(1300)
    expect(week.days[0].totals.fiber).toBe(31)
    expect(week.days[0].statuses.fiber).toBe('met')
    expect(week.days[2].statuses.fiber).toBe('not-met')
    expect(week.days[2].statuses.sodium).toBe('not-met')
    expect(week.days[1].statuses.fiber).toBe('no-data')
  })

  it('averages over logged days only', () => {
    expect(week.averageCalories).toBe(800)
    const f = week.goalStats.find((s) => s.goal.nutrient === 'fiber')!
    expect(f.average).toBe(17.5)
    expect(f.daysMet).toBe(1)
    expect(f.daysLogged).toBe(2)
  })

  it('counts logged days under the calorie floor as low-intake', () => {
    expect(week.lowIntakeDays).toBe(1) // 300 kcal day; 1300 kcal day is above 1200
  })
})

describe('buildWeeklyReport', () => {
  const logs = [log(KEYS[0], 'Lentils, raw', { Energy: 900, 'Fiber, total dietary': 30 }, 80)]
  const goals = [fiber, calories]
  const week = summarizeWeek(logs, goals, KEYS, toKey)
  const generatedAt = new Date(2026, 10, 24)

  it('includes the food log, averages, goal progress, source and disclaimer', () => {
    const text = buildWeeklyReport(week, goals, { hideCalories: false, generatedAt })
    expect(text).toContain('NutriPath — Weekly summary')
    expect(text).toContain('USDA FoodData Central')
    expect(text).toContain('Not medical advice')
    expect(text).toContain('Days with food logged: 1 of 7')
    expect(text).toContain('Lentils, raw — 80 g, 900 kcal')
    expect(text).toContain('Fibre: 30 g (goal: at least 28 g; met 1 of 1 days)')
    expect(text).toContain('Calories: 900 kcal')
    expect(text).toContain('(nothing logged)')
  })

  it('omits every calorie number when calories are hidden', () => {
    const text = buildWeeklyReport(week, goals, { hideCalories: true, generatedAt })
    expect(text).not.toMatch(/kcal/i)
    expect(text).not.toMatch(/calories/i)
    expect(text).toContain('Fibre: 30 g')
  })

  it('handles an empty week', () => {
    const empty = summarizeWeek([], goals, KEYS, toKey)
    const text = buildWeeklyReport(empty, goals, { hideCalories: false, generatedAt })
    expect(text).toContain('No food logged this week.')
  })

  it('visibleGoals drops calorie goals only when hidden', () => {
    expect(visibleGoals(goals, true)).toEqual([fiber])
    expect(visibleGoals(goals, false)).toEqual(goals)
  })
})
