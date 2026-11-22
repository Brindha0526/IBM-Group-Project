import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Minimal layout for /onboarding — just checks auth, no profile redirect.
 * Uses the same footer as the main app layout.
 */
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center">
          <span className="text-lg font-bold text-blue-700">NutriPath</span>
        </div>
      </header>

      <main className="flex-1 w-full">
        {children}
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          Not medical advice. Always consult your healthcare team.
        </div>
      </footer>
    </div>
  )
}
