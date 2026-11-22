import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware: refreshes the Supabase session on every request and redirects
 * unauthenticated users away from protected (app) routes to /login.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Refresh the session — this keeps the JWT alive without an extra round trip
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl

  // Auth pages — always allow through, never redirect unauthenticated users away
  const isAuthPage = pathname === '/login' || pathname === '/signup'

  // If logged in and on an auth page, send to /profile
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/profile', request.url))
  }

  // Protect all routes under /(app) — these map to paths like /profile, /goals, etc.
  const isAppRoute =
    pathname.startsWith('/profile') ||
    pathname.startsWith('/goals') ||
    pathname.startsWith('/log') ||
    pathname.startsWith('/foods') ||
    pathname.startsWith('/plan') ||
    pathname.startsWith('/grocery') ||
    pathname.startsWith('/summary') ||
    pathname.startsWith('/find-dietitian')

  // Unauthenticated on a protected route → send to /login (never redirect /login itself)
  if (isAppRoute && !isAuthPage && !session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
