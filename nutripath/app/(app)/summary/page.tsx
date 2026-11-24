'use client'

// app/(app)/summary/page.tsx
// Weekly summary — calories (or foods logged) per day, goals met per day, and a
// plain-text, print-friendly report to share with a dietitian.
// ?mode=appointment switches to appointment prep: what you ate, goals met and
// suggested topics to raise (deterministic rules, no AI).
// "This week" = the last 7 local days including today.

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { lastNDateKeys, logRangeQuery } from '@/lib/dates'
import { matchAllergens } from '@/lib/safety/allergens'
import {
  summarizeWeek,
  buildWeeklyReport,
  foodFrequency,
  suggestTopics,
  CARE_TEAM_FLAG_LABELS,
  visibleGoals,
  goalLabel,
  goalTargetText,
  goalHasTarget,
  formatDayKey,
  type SummaryLog,
  type SummaryGoal,
  type DaySummary,
  type GoalStatus,
  type WeekSummary,
  type FoodFrequency,
} from '@/lib/summary'

interface SummaryProfile {
  hideCalories: boolean
  hasEdHistory: boolean
  caloricGoalKcal: number | null
  careTeamFlags: string[]
  medications: string[]
  allergens: string[]
}

// ─── Chart ────────────────────────────────────────────────────────────────────

function WeekBarChart({
  days,
  hideCalories,
  targetKcal,
}: {
  days: DaySummary[]
  hideCalories: boolean
  targetKcal: number | null
}) {
  // When calories are hidden, chart how many foods were logged instead.
  const values = days.map((d) => (hideCalories ? d.logs.length : Math.round(d.calories)))
  const target = hideCalories ? null : targetKcal
  const max = Math.max(...values, target ?? 0, 1)
  const unit = hideCalories ? 'foods' : 'kcal'

  return (
    <figure>
      <div className="relative h-48 border-b border-gray-300">
        {target !== null && (
          <div
            className="absolute inset-x-0 border-t border-dashed border-gray-400"
            style={{ bottom: `${(target / max) * 100}%` }}
            aria-hidden="true"
          >
            <span className="absolute right-0 -top-5 bg-white px-1 text-[11px] text-gray-500">
              Target {target.toLocaleString()} kcal
            </span>
          </div>
        )}
        <div className="absolute inset-0 flex items-end gap-1.5 sm:gap-3">
          {days.map((d, i) => {
            const v = values[i]
            const pct = (v / max) * 100
            return (
              <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end">
                <span className="mb-1 text-[11px] tabular-nums text-gray-600">{v > 0 ? v.toLocaleString() : ''}</span>
                <div
                  className={`w-full max-w-[3rem] rounded-t ${v > 0 ? 'bg-blue-500' : 'bg-gray-200'}`}
                  style={{ height: v > 0 ? `${pct}%` : '2px' }}
                  title={`${formatDayKey(d.key)}: ${v.toLocaleString()} ${unit}`}
                />
              </div>
            )
          })}
        </div>
      </div>
      <div className="mt-1 flex gap-1.5 sm:gap-3">
        {days.map((d) => (
          <span key={d.key} className="flex-1 text-center text-[11px] text-gray-500">
            {formatDayKey(d.key).split(',')[0]}
            <span className="hidden sm:block">{formatDayKey(d.key).split(', ')[1]}</span>
          </span>
        ))}
      </div>
      <figcaption className="sr-only">
        {hideCalories ? 'Foods logged per day: ' : 'Calories logged per day: '}
        {days.map((d, i) => `${formatDayKey(d.key)} ${values[i]} ${unit}`).join('; ')}
      </figcaption>
    </figure>
  )
}

// ─── Goals grid ───────────────────────────────────────────────────────────────

const STATUS_CELL: Record<GoalStatus, { symbol: string; cls: string; label: string }> = {
  met:         { symbol: '✓', cls: 'bg-green-50 text-green-700', label: 'met' },
  'not-met':   { symbol: '○', cls: 'bg-gray-50 text-gray-500',   label: 'not yet' },
  'no-data':   { symbol: '–', cls: 'text-gray-300',              label: 'nothing logged' },
  'no-target': { symbol: '',  cls: 'text-gray-300',              label: 'no numeric target' },
}

function GoalsGrid({ days, goals }: { days: DaySummary[]; goals: SummaryGoal[] }) {
  const tracked = goals.filter(goalHasTarget)
  if (tracked.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No goals with a numeric target yet. <Link href="/goals" className="text-blue-600 hover:underline">Set goals →</Link>
      </p>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] text-sm">
        <thead>
          <tr className="text-xs text-gray-500">
            <th className="py-2 pr-3 text-left font-medium">Goal</th>
            {days.map((d) => (
              <th key={d.key} className="px-1 py-2 text-center font-medium">{formatDayKey(d.key).split(',')[0]}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tracked.map((g) => (
            <tr key={g.nutrient}>
              <th scope="row" className="py-2 pr-3 text-left font-normal">
                <span className="block font-medium capitalize text-gray-800">{goalLabel(g)}</span>
                <span className="block text-xs text-gray-400">{goalTargetText(g)}</span>
              </th>
              {days.map((d) => {
                const status = d.statuses[g.nutrient] ?? 'no-data'
                const cell = STATUS_CELL[status]
                return (
                  <td key={d.key} className="px-1 py-2 text-center">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded ${cell.cls}`}
                      title={`${formatDayKey(d.key)}: ${cell.label}`}
                    >
                      {cell.symbol}
                      <span className="sr-only">{cell.label}</span>
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-gray-400">✓ met · ○ not yet · – nothing logged</p>
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

function ReportExport({ text, filename }: { text: string; filename: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  function handleDownload() {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 print:hidden">
        <button type="button" onClick={handleCopy} className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
          {copied ? '✓ Copied' : 'Copy text'}
        </button>
        <button type="button" onClick={handleDownload} className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
          Download .txt
        </button>
        <button type="button" onClick={() => window.print()} className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
          Print
        </button>
      </div>
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-4 font-mono text-xs leading-relaxed text-gray-800 print:max-h-none print:overflow-visible print:border-0 print:p-0 print:text-[11pt]">
        {text}
      </pre>
    </div>
  )
}

// ─── Appointment prep ─────────────────────────────────────────────────────────

function AppointmentPrep({
  week,
  foods,
  topics,
  careTeamFlags,
}: {
  week: WeekSummary
  foods: FoodFrequency[]
  topics: string[]
  careTeamFlags: string[]
}) {
  const tracked = week.goalStats.filter((s) => goalHasTarget(s.goal))
  const flagLabels = careTeamFlags.map((f) => CARE_TEAM_FLAG_LABELS[f]).filter(Boolean)

  return (
    <div className="space-y-4 print:hidden">
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Topics you could raise</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Conversation starters based on this week&apos;s log. Your dietitian will know what&apos;s right for you.
        </p>
        {topics.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">Nothing specific this week — bring any questions you have.</p>
        ) : (
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-800">
            {topics.map((t, i) => <li key={i}>{t}</li>)}
          </ol>
        )}
      </section>

      {flagLabels.length > 0 && (
        <section className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm text-purple-900">
          <span className="font-semibold">Your care team mentioned:</span> {flagLabels.join(', ')}
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">What you ate most</h2>
          {foods.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">Nothing logged this week.</p>
          ) : (
            <ul className="mt-3 space-y-1.5 text-sm">
              {foods.slice(0, 10).map((f) => (
                <li key={f.name} className="flex justify-between gap-3">
                  <span className="truncate text-gray-800">{f.name}</span>
                  <span className="shrink-0 tabular-nums text-xs text-gray-500">{f.count}×</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Goals met</h2>
          {tracked.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              No goals with a numeric target. <Link href="/goals" className="text-blue-600 hover:underline">Set goals →</Link>
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5 text-sm">
              {tracked.map((s) => {
                const pct = s.daysLogged > 0 ? (s.daysMet / s.daysLogged) * 100 : 0
                return (
                  <li key={s.goal.nutrient}>
                    <div className="flex justify-between gap-3">
                      <span className="capitalize text-gray-800">{goalLabel(s.goal)}</span>
                      <span className="shrink-0 text-xs text-gray-500">
                        {s.daysMet} of {s.daysLogged} logged days
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function SummaryPageInner() {
  const searchParams = useSearchParams()
  const appointmentMode = searchParams.get('mode') === 'appointment'
  const dayKeys = useMemo(() => lastNDateKeys(7), [])
  const [logs, setLogs] = useState<SummaryLog[]>([])
  const [goals, setGoals] = useState<SummaryGoal[]>([])
  const [profile, setProfile] = useState<SummaryProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [lRes, gRes, pRes] = await Promise.all([
          fetch(`/api/log?${logRangeQuery(dayKeys[0], dayKeys[dayKeys.length - 1])}`),
          fetch('/api/goals'),
          fetch('/api/profile/me'),
        ])
        if (!lRes.ok || !gRes.ok || !pRes.ok) throw new Error()
        const [l, g, p] = await Promise.all([lRes.json(), gRes.json(), pRes.json()])
        setLogs(l.logs ?? [])
        setGoals(g.goals ?? [])
        setProfile(p.profile ?? null)
      } catch {
        setError('Could not load your summary. Please refresh to try again.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [dayKeys])

  // Hide calories if the user set the toggle OR disclosed an ED history
  const hideCalories = (profile?.hideCalories ?? false) || (profile?.hasEdHistory ?? false)
  const shownGoals = useMemo(() => visibleGoals(goals, hideCalories), [goals, hideCalories])
  const week = useMemo(() => summarizeWeek(logs, shownGoals, dayKeys), [logs, shownGoals, dayKeys])

  const calorieGoal = goals.find((g) => g.nutrient.toLowerCase() === 'calories')
  const targetKcal = profile?.caloricGoalKcal ?? calorieGoal?.targetMin ?? calorieGoal?.targetMax ?? null

  const allLogs = useMemo(() => week.days.flatMap((d) => d.logs), [week])
  const foods = useMemo(() => foodFrequency(allLogs), [allLogs])
  const topics = useMemo(() => {
    const allergens = profile?.allergens ?? []
    return suggestTopics({
      week,
      goals: shownGoals,
      careTeamFlags: profile?.careTeamFlags ?? [],
      medications: profile?.medications ?? [],
      allergenFlaggedFoods: allLogs
        .filter((l) => matchAllergens(l.foodName, allergens).length > 0)
        .map((l) => l.foodName),
    })
  }, [week, shownGoals, profile, allLogs])

  const report = useMemo(
    () =>
      buildWeeklyReport(week, shownGoals, {
        hideCalories,
        generatedAt: new Date(),
        appointment: appointmentMode
          ? { foods, topics, careTeamFlags: profile?.careTeamFlags ?? [] }
          : undefined,
      }),
    [week, shownGoals, hideCalories, appointmentMode, foods, topics, profile]
  )

  return (
    <div className="max-w-3xl space-y-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-gray-900">
          {appointmentMode ? 'Prepare for your appointment' : 'Weekly Summary'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {formatDayKey(dayKeys[0])} – {formatDayKey(dayKeys[dayKeys.length - 1])} · numbers from USDA FoodData Central
        </p>
        <div className="mt-4 inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-sm" role="tablist">
          <Link
            href="/summary"
            role="tab"
            aria-selected={!appointmentMode}
            className={`rounded-md px-3 py-1.5 ${!appointmentMode ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            This week
          </Link>
          <Link
            href="/summary?mode=appointment"
            role="tab"
            aria-selected={appointmentMode}
            className={`rounded-md px-3 py-1.5 ${appointmentMode ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Appointment prep
          </Link>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading your week…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <>
          {week.daysLogged === 0 && (
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 print:hidden">
              Nothing logged in the last 7 days yet.{' '}
              <Link href="/log" className="text-blue-600 hover:underline">Log a meal →</Link>
            </div>
          )}

          {appointmentMode && (
            <AppointmentPrep
              week={week}
              foods={foods}
              topics={topics}
              careTeamFlags={profile?.careTeamFlags ?? []}
            />
          )}

          {!appointmentMode && (
            <>
              <section className="rounded-lg border border-gray-200 bg-white p-4 print:hidden">
                <div className="mb-4 flex items-baseline justify-between gap-2">
                  <h2 className="text-sm font-semibold text-gray-900">
                    {hideCalories ? 'Foods logged per day' : 'Calories logged per day'}
                  </h2>
                  <span className="text-xs text-gray-500">
                    {week.daysLogged} of 7 days logged
                  </span>
                </div>
                <WeekBarChart days={week.days} hideCalories={hideCalories} targetKcal={targetKcal} />
              </section>

              <section className="rounded-lg border border-gray-200 bg-white p-4 print:hidden">
                <h2 className="mb-3 text-sm font-semibold text-gray-900">Goals by day</h2>
                <GoalsGrid days={week.days} goals={shownGoals} />
              </section>
            </>
          )}

          <section className="space-y-2">
            <div className="print:hidden">
              <h2 className="text-sm font-semibold text-gray-900">Share with your dietitian</h2>
              <p className="text-xs text-gray-500">
                {appointmentMode
                  ? 'A plain-text appointment summary: topics, what you ate, goals met, and the full food log.'
                  : "A plain-text copy of this week's food log and nutrient averages."}{' '}
                Copy it, download it, or print it.
              </p>
            </div>
            <ReportExport
              text={report}
              filename={`nutripath-${appointmentMode ? 'appointment' : 'week'}-${dayKeys[dayKeys.length - 1]}.txt`}
            />
          </section>
        </>
      )}
    </div>
  )
}

export default function SummaryPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500">Loading…</p>}>
      <SummaryPageInner />
    </Suspense>
  )
}
