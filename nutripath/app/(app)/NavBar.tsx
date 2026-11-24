'use client'

// app/(app)/NavBar.tsx
// Client component — desktop links, mobile hamburger menu, active-link highlight.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SignOutButton from './SignOutButton'

const NAV_LINKS = [
  { href: '/profile',         label: 'Profile' },
  { href: '/log',             label: 'Food Log' },
  { href: '/foods',           label: 'Foods' },
  { href: '/plan',            label: 'Meal Plan' },
  { href: '/grocery',         label: 'Grocery' },
  { href: '/summary',         label: 'Summary' },
  { href: '/find-dietitian',  label: 'Find a Dietitian' },
]

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  // Close the mobile menu whenever the route changes (incl. back/forward)
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/profile" className="text-lg font-bold text-blue-700 hover:text-blue-800 shrink-0">
          NutriPath
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-5 text-sm text-gray-600">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`hover:text-gray-900 transition-colors ${isActive(href) ? 'font-semibold text-blue-700' : ''}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <SignOutButton />
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="sm:hidden p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
          >
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <nav id="mobile-nav" className="sm:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              aria-current={isActive(href) ? 'page' : undefined}
              className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                isActive(href)
                  ? 'bg-blue-50 font-semibold text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
