import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import NavBar from './NavBar'

/**
 * Authenticated shell layout — wraps all (app) routes except /onboarding.
 * Server-side session check: unauthenticated → /login.
 * No profile yet → /onboarding.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Allow /onboarding through without the profile check (it creates the profile).
  // Detect via cookie first; fall back to DB on first request.
  const cookieStore = cookies()
  const hasProfileCookie = cookieStore.get('nutripath_has_profile')?.value === '1'

  if (!hasProfileCookie) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { profile: { select: { id: true } } },
    })
    if (!user?.profile) {
      redirect('/onboarding')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />

      {/* Page content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {children}
      </main>

      {/* Footer — "Not medical advice" required by GUIDELINES §Safety rules rule 9 */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          Not medical advice. Always consult your healthcare team.
        </div>
      </footer>
    </div>
  )
}
