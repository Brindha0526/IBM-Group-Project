// lib/summary.ts
// Pure helpers for the weekly summary and appointment-prep views.
// Deterministic — no AI. All nutrient numbers come from the USDA snapshots
// stored on each FoodLog row.

import { localDateKey, parseDateKey } from '@/lib/dates'
import { CALORIE_FLOOR } from '@/lib/safety/calorie-floor'
import type { NutrientTarget } from '@/types/goals'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SummaryLog {
  id: string
  foodName: string
  servingG: number
  loggedAt: string // ISO instant
  nutrients: Record<string, number>
}

/** A goal as stored (DB rows use null for a missing bound). */
export type SummaryGoal = Omit<NutrientTarget, 'targetMin' | 'targetMax'> & {
  targetMin?: number | null
  targetMax?: number | null
}

export type GoalStatus = 'met' | 'not-met' | 'no-data' | 'no-target'

export interface DaySummary {
  key: string // YYYY-MM-DD (local)
  logs: SummaryLog[]
  calories: number
  /** goal nutrient → total for the day (null when no logged food reports it) */
  totals: Record<string, number | null>
  statuses: Record<string, GoalStatus>
}

export interface GoalWeekStats {
  goal: SummaryGoal
  /** Average over days with logs that report this nutrient, or null */
  average: number | null
  daysMet: number
  daysLogged: number
}

export interface WeekSummary {
  days: DaySummary[]
  daysLogged: number
  averageCalories: number | null
  goalStats: GoalWeekStats[]
  lowIntakeDays: number
}

// ─── Nutrient matching ────────────────────────────────────────────────────────

/** Calories from a USDA nutrient snapshot (key contains "Energy"). */
export function extractCalories(nutrients: Record<string, number>): number | null {
  const key = Object.keys(nutrients).find((k) => k.toLowerCase().includes('energy'))
  return key !== undefined ? nutrients[key] : null
}

export function isCalorieNutrient(nutrient: string): boolean {
  const n = nutrient.toLowerCase()
  return ['energy', 'calories', 'kcal'].some((kw) => n.includes(kw))
}

/**
 * Goal nutrient name → substrings of USDA nutrient names. Covers names that
 * don't appear verbatim in USDA ("vitamin b12" vs "Vitamin B-12").
 */
const NUTRIENT_ALIASES: Record<string, string[]> = {
  'saturated fat': ['fatty acids, total saturated'],
  'added sugars': ['sugars, added'],
  'vitamin b12': ['vitamin b-12', 'vitamin b12'],
  'vitamin d': ['vitamin d (d2 + d3)', 'vitamin d'],
  fiber: ['fiber, total dietary', 'fiber'],
  fibre: ['fiber, total dietary', 'fiber'],
}

/** USDA keys we never want to sum (alternate units of the same nutrient). */
function isAlternateUnitKey(key: string): boolean {
  return key.toLowerCase().includes('international units')
}

/** The amount of `nutrient` in one log's snapshot, or null if not reported. */
export function nutrientAmount(nutrients: Record<string, number>, nutrient: string): number | null {
  if (isCalorieNutrient(nutrient)) return extractCalories(nutrients)
  const goal = nutrient.toLowerCase()
  const needles = NUTRIENT_ALIASES[goal] ?? [goal]
  const keys = Object.keys(nutrients).filter((k) => !isAlternateUnitKey(k))
  for (const needle of needles) {
    const key = keys.find((k) => k.toLowerCase().includes(needle))
    if (key !== undefined && typeof nutrients[key] === 'number') return nutrients[key]
  }
  return null
}

/** Total of `nutrient` across logs; null when no log reports it. */
export function nutrientTotal(logs: SummaryLog[], nutrient: string): number | null {
  let total: number | null = null
  for (const l of logs) {
    const v = nutrientAmount(l.nutrients, nutrient)
    if (v !== null) total = (total ?? 0) + v
  }
  return total
}

export function totalCalories(logs: SummaryLog[]): number {
  return logs.reduce((acc, l) => acc + (extractCalories(l.nutrients) ?? 0), 0)
}

// ─── Goals ────────────────────────────────────────────────────────────────────

function has(n: number | null | undefined): n is number {
  return n !== undefined && n !== null
}

export function goalHasTarget(goal: SummaryGoal): boolean {
  return has(goal.targetMin) || has(goal.targetMax)
}

/** Whether a day's total meets the goal. A day with no logs is 'no-data', never 'not-met'. */
export function goalStatus(goal: SummaryGoal, total: number | null, dayHasLogs: boolean): GoalStatus {
  if (!goalHasTarget(goal)) return 'no-target'
  if (!dayHasLogs) return 'no-data'
  const t = total ?? 0
  if (has(goal.targetMin) && t < goal.targetMin) return 'not-met'
  if (has(goal.targetMax) && t > goal.targetMax) return 'not-met'
  return 'met'
}

export function goalLabel(goal: SummaryGoal): string {
  return goal.label ?? goal.nutrient
}

export function goalTargetText(goal: SummaryGoal): string {
  if (has(goal.targetMin) && has(goal.targetMax)) return `${goal.targetMin}–${goal.targetMax} ${goal.unit}`
  if (has(goal.targetMin)) return `at least ${goal.targetMin} ${goal.unit}`
  if (has(goal.targetMax)) return `at most ${goal.targetMax} ${goal.unit}`
  return 'no numeric target'
}

/** Goals to show: drop calorie goals when calories are hidden. */
export function visibleGoals<G extends SummaryGoal>(goals: G[], hideCalories: boolean): G[] {
  return hideCalories ? goals.filter((g) => !isCalorieNutrient(g.nutrient)) : goals
}

// ─── Week ─────────────────────────────────────────────────────────────────────

/**
 * Builds the per-day and per-goal summary for the given local day keys.
 * `toDayKey` maps a log's ISO timestamp to its local day (injectable for tests).
 */
export function summarizeWeek(
  logs: SummaryLog[],
  goals: SummaryGoal[],
  dayKeys: string[],
  toDayKey: (iso: string) => string = (iso) => localDateKey(new Date(iso))
): WeekSummary {
  const byDay: Record<string, SummaryLog[]> = Object.fromEntries(dayKeys.map((k) => [k, []]))
  for (const log of logs) {
    const key = toDayKey(log.loggedAt)
    if (byDay[key]) byDay[key].push(log)
  }

  const days: DaySummary[] = dayKeys.map((key) => {
    const dayLogs = byDay[key]
    const totals: Record<string, number | null> = {}
    const statuses: Record<string, GoalStatus> = {}
    for (const g of goals) {
      const total = nutrientTotal(dayLogs, g.nutrient)
      totals[g.nutrient] = total
      statuses[g.nutrient] = goalStatus(g, total, dayLogs.length > 0)
    }
    return { key, logs: dayLogs, calories: totalCalories(dayLogs), totals, statuses }
  })

  const logged = days.filter((d) => d.logs.length > 0)

  const goalStats: GoalWeekStats[] = goals.map((g) => {
    const values = logged.map((d) => d.totals[g.nutrient]).filter((v): v is number => v !== null)
    return {
      goal: g,
      average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null,
      daysMet: days.filter((d) => d.statuses[g.nutrient] === 'met').length,
      daysLogged: logged.length,
    }
  })

  return {
    days,
    daysLogged: logged.length,
    averageCalories: logged.length > 0 ? logged.reduce((a, d) => a + d.calories, 0) / logged.length : null,
    goalStats,
    lowIntakeDays: logged.filter((d) => d.calories < CALORIE_FLOOR).length,
  }
}

// ─── Appointment prep ─────────────────────────────────────────────────────────

export interface FoodFrequency {
  name: string
  count: number
  totalG: number
}

/** Foods eaten this week, most frequent first (ties: larger total grams first). */
export function foodFrequency(logs: SummaryLog[]): FoodFrequency[] {
  const map = new Map<string, FoodFrequency>()
  for (const l of logs) {
    const key = l.foodName.trim().toLowerCase()
    const cur = map.get(key) ?? { name: l.foodName.trim(), count: 0, totalG: 0 }
    cur.count += 1
    cur.totalG += l.servingG
    map.set(key, cur)
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count || b.totalG - a.totalG)
}

/** GUIDELINES fixed list — phrased as what the care team mentioned, never a diagnosis. */
export const CARE_TEAM_FLAG_LABELS: Record<string, string> = {
  LOW_IRON: 'low iron',
  LOW_VITAMIN_D: 'low vitamin D',
  LOW_B12: 'low B12',
  HIGH_CHOLESTEROL: 'high cholesterol',
  HIGH_BLOOD_SUGAR: 'high blood sugar',
  HIGH_BLOOD_PRESSURE: 'high blood pressure',
}

export interface TopicInput {
  week: WeekSummary
  goals: SummaryGoal[]
  careTeamFlags: string[]
  medications: string[]
  /** Names of logged foods that matched the user's allergens */
  allergenFlaggedFoods: string[]
}

/**
 * Deterministic conversation starters for a dietitian visit.
 * Wording follows GUIDELINES: supportive, no judgement, defer to the care team.
 */
export function suggestTopics({ week, goals, careTeamFlags, medications, allergenFlaggedFoods }: TopicInput): string[] {
  const topics: string[] = []

  for (const flag of careTeamFlags) {
    const label = CARE_TEAM_FLAG_LABELS[flag]
    if (label) topics.push(`Follow up on what your care team mentioned about ${label}, and which foods help.`)
  }

  if (week.daysLogged > 0) {
    for (const stat of week.goalStats) {
      if (!goalHasTarget(stat.goal) || isCalorieNutrient(stat.goal.nutrient)) continue
      if (stat.daysMet < stat.daysLogged / 2) {
        topics.push(`Ask about easier ways to reach your ${goalLabel(stat.goal).toLowerCase()} goal (${goalTargetText(stat.goal)}) — it was met on ${stat.daysMet} of ${stat.daysLogged} logged days.`)
      }
    }
  }

  if (allergenFlaggedFoods.length > 0) {
    const names = Array.from(new Set(allergenFlaggedFoods)).slice(0, 5).join(', ')
    topics.push(`Some logged foods may contain an allergen on your list (${names}). Ask about safe swaps and reading labels.`)
  }

  if (medications.length > 0) {
    topics.push('Ask whether any foods interact with your medications. Your pharmacist can help too.')
  }

  if (week.lowIntakeDays >= 3) {
    topics.push('Some days this week looked lighter than usual. It may help to talk about appetite, energy and how meals have been feeling.')
  }

  if (week.daysLogged < 4) {
    topics.push('Talk about what would make tracking meals easier day to day.')
  }

  if (topics.length === 0 && goals.length > 0) {
    topics.push('Share what has been working well this week and what you would like to focus on next.')
  }

  return topics
}

// ─── Plain-text export ────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  return n >= 100 ? Math.round(n).toString() : (Math.round(n * 10) / 10).toString()
}

export function formatDayKey(key: string): string {
  const d = parseDateKey(key)
  if (!d) return key
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export interface ReportOptions {
  hideCalories: boolean
  generatedAt: Date
  appointment?: {
    foods: FoodFrequency[]
    topics: string[]
    careTeamFlags: string[]
  }
}

/** Plain-text weekly report a user can share with their dietitian. */
export function buildWeeklyReport(week: WeekSummary, goals: SummaryGoal[], opts: ReportOptions): string {
  const shownGoals = visibleGoals(goals, opts.hideCalories)
  const first = week.days[0]?.key
  const last = week.days[week.days.length - 1]?.key
  const lines: string[] = []

  lines.push(opts.appointment ? 'NutriPath — Appointment summary' : 'NutriPath — Weekly summary')
  if (first && last) lines.push(`${formatDayKey(first)} – ${formatDayKey(last)}`)
  lines.push(`Generated ${opts.generatedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`)
  lines.push('Nutrition numbers: USDA FoodData Central. Not medical advice.')
  lines.push('')
  lines.push(`Days with food logged: ${week.daysLogged} of ${week.days.length}`)

  if (opts.appointment && opts.appointment.careTeamFlags.length > 0) {
    const labels = opts.appointment.careTeamFlags.map((f) => CARE_TEAM_FLAG_LABELS[f]).filter(Boolean)
    if (labels.length > 0) lines.push(`My care team mentioned: ${labels.join(', ')}`)
  }

  // Averages
  lines.push('')
  lines.push(`DAILY AVERAGES (over ${week.daysLogged} logged day${week.daysLogged === 1 ? '' : 's'})`)
  if (week.daysLogged === 0) {
    lines.push('  No food logged this week.')
  } else {
    if (!opts.hideCalories && week.averageCalories !== null) {
      lines.push(`  Calories: ${fmtNum(week.averageCalories)} kcal`)
    }
    const stats = week.goalStats.filter((s) => shownGoals.includes(s.goal))
    for (const s of stats) {
      if (opts.hideCalories && isCalorieNutrient(s.goal.nutrient)) continue
      const avg = s.average === null ? 'no data' : `${fmtNum(s.average)} ${s.goal.unit}`.trim()
      const target = goalHasTarget(s.goal)
        ? ` (goal: ${goalTargetText(s.goal)}; met ${s.daysMet} of ${s.daysLogged} days)`
        : ''
      lines.push(`  ${goalLabel(s.goal)}: ${avg}${target}`)
    }
    if (stats.length === 0) lines.push('  No nutrition goals set.')
  }

  // Appointment prep
  if (opts.appointment) {
    lines.push('')
    lines.push('WHAT I ATE MOST THIS WEEK')
    if (opts.appointment.foods.length === 0) lines.push('  Nothing logged.')
    for (const f of opts.appointment.foods.slice(0, 10)) {
      lines.push(`  - ${f.name} (${f.count}×, ${fmtNum(f.totalG)} g total)`)
    }
    lines.push('')
    lines.push('TOPICS TO RAISE')
    if (opts.appointment.topics.length === 0) lines.push('  None suggested.')
    opts.appointment.topics.forEach((t, i) => lines.push(`  ${i + 1}. ${t}`))
  }

  // Full food log
  lines.push('')
  lines.push('FOOD LOG')
  for (const day of week.days) {
    lines.push(`  ${formatDayKey(day.key)}`)
    if (day.logs.length === 0) {
      lines.push('    (nothing logged)')
      continue
    }
    for (const l of day.logs) {
      const kcal = extractCalories(l.nutrients)
      const cal = !opts.hideCalories && kcal !== null ? `, ${fmtNum(kcal)} kcal` : ''
      lines.push(`    - ${l.foodName} — ${fmtNum(l.servingG)} g${cal}`)
    }
    if (!opts.hideCalories) lines.push(`    Day total: ${fmtNum(day.calories)} kcal`)
  }

  return lines.join('\n') + '\n'
}
