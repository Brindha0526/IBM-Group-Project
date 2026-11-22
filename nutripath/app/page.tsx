import { redirect } from 'next/navigation'

/**
 * Root index: unauthenticated users go to /login.
 * Middleware will redirect authenticated users from /login → /profile.
 */
export default function RootPage() {
  redirect('/login')
}
