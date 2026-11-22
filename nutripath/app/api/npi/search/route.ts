// app/api/npi/search/route.ts
// Implemented in ST-10.
// Proxies CMS NPI Registry — filtered to taxonomy code 133V00000X.

import { NextResponse } from 'next/server'

export async function GET(_request: Request) {
  return NextResponse.json({ error: 'Not implemented — coming in ST-10' }, { status: 501 })
}
