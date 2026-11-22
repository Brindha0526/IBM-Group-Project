import { redirect } from 'next/navigation'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import SignOutButton from './SignOutButton'

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

  // Allow /onboarding through without the profile check (it creates the profile)
  // This check only runs for the other app routes — Next.js runs this layout
  // for all routes under (app) except those with their own layout.
  // We detect onboarding by checking the cookie: if not set, verify in DB.
  const cookieStore = cookies()
  const hasProfileCookie = cookieStore.get('nutripath_has_profile')?.value === '1'

  if (!hasProfileCookie) {
    // Check DB — slightly slower but only happens once per session until cookie is set
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
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/profile" className="text-lg font-bold text-blue-700 hover:text-blue-800">
            NutriPath
          </Link>

          <nav className="hidden sm:flex items-center gap-5 text-sm text-gray-600">
            <Link href="/profile" className="hover:text-gray-900">Profile</Link>
            <Link href="/log" className="hover:text-gray-900">Food Log</Link>
            <Link href="/foods" className="hover:text-gray-900">Foods</Link>
            <Link href="/plan" className="hover:text-gray-900">Meal Plan</Link>
            <Link href="/grocery" className="hover:text-gray-900">Grocery</Link>
            <Link href="/summary" className="hover:text-gray-900">Summary</Link>
            <Link href="/find-dietitian" className="hover:text-gray-900">Find a Dietitian</Link>
          </nav>

          <SignOutButton />
        </div>
      </header>

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
