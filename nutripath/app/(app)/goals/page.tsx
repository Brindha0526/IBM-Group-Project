import { redirect } from 'next/navigation'

// /goals now lives inside the Profile page.
export default function GoalsPage() {
  redirect('/profile')
}
