'use client'

// app/(app)/onboarding/page.tsx
// First-time onboarding flow. Uses the shared ProfileWizard.
// Saves profile + goals together, then redirects to /log.

import { useRouter } from 'next/navigation'
import ProfileWizard, { type WizardResult } from '@/components/ProfileWizard'

export default function OnboardingPage() {
  const router = useRouter()

  async function handleSave({ profile, goals }: WizardResult) {
    // Save profile
    const profileRes = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    if (!profileRes.ok) {
      const body = await profileRes.json().catch(() => ({}))
      throw new Error(body.error ?? 'Failed to save profile')
    }

    // Save goals (if any)
    if (goals.length > 0) {
      const goalsRes = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals }),
      })
      if (!goalsRes.ok) {
        throw new Error('Profile saved, but goals could not be saved. You can add them from your profile.')
      }
    }

    router.push('/log')
  }

  return <ProfileWizard onSave={handleSave} saveLabel="Finish setup" />
}
