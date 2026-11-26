'use client'

// app/(app)/goals/page.tsx
// Standalone goal editor — change nutrition goals without re-running onboarding.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import GoalsEditor from '@/components/GoalsEditor'
import type { NutrientTarget } from '@/types/goals'

interface GoalsProfile {
  path: 'BEFORE' | 'AFTER'
  careTeamFlags: string[]
  hideCalories: boolean
  hasEdHistory: boolean
}

export default function GoalsPage() {
  const [profile, setProfile] = useState<GoalsProfile | null>(null)
  const [goals, setGoals] = useState<NutrientTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [pRes, gRes] = await Promise.all([fetch('/api/profile/me'), fetch('/api/goals')])
        if (!pRes.ok || !gRes.ok) throw new Error()
        const [{ profile: p }, { goals: g }] = await Promise.all([pRes.json(), gRes.json()])
        setProfile(p)
        setGoals(g ?? [])
      } catch {
        setLoadError('Could not load your goals. Please refresh to try again.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <Link href="/profile" className="text-xs text-blue-600 hover:underline">← Back to profile</Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Nutrition goals</h1>
        <p className="mt-1 text-sm text-gray-500">
          Add, remove or adjust the goals your daily check-in tracks.
        </p>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading your goals…</p>}
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}
      {!loading && !loadError && !profile && (
        <p className="text-sm text-gray-500">No profile found.</p>
      )}

      {profile && (
        <GoalsEditor
          initialGoals={goals}
          path={profile.path}
          careTeamFlags={profile.careTeamFlags ?? []}
          hideCalories={profile.hideCalories || profile.hasEdHistory}
          onSaved={setGoals}
        />
      )}

      <p className="text-xs text-gray-400 text-center pt-2 pb-6">
        Not medical advice. Always consult your healthcare team before making dietary changes.
      </p>
    </div>
  )
}
