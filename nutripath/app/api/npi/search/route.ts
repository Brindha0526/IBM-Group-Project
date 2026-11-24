// app/api/npi/search/route.ts
// GET /api/npi/search?zip=&city=&state=&limit=
//
// Proxies the CMS NPI Registry public API (no key required).
// Returns individual (NPI-1) and organisation (NPI-2) dietitian providers.
// https://npiregistry.cms.hhs.gov/api-page

import { NextResponse } from 'next/server'

const NPI_BASE = 'https://npiregistry.cms.hhs.gov/api/'

export interface NpiProvider {
  npi: string
  enumerationType: 'individual' | 'organization'
  name: string           // personal full name or org name
  credential: string     // e.g. "RD, LDN"
  gender: string         // 'M' | 'F' | '' — only for NPI-1
  phone: string
  address: string
  city: string
  state: string
  zip: string
  country: string
  taxonomy: string       // primary taxonomy description
  taxonomyCode: string   // e.g. "133V00000X"
}

function extractProviders(raw: unknown): NpiProvider[] {
  const data = raw as {
    results?: Array<{
      number?: string
      enumeration_type?: string   // "NPI-1" (individual) | "NPI-2" (organization)
      basic?: {
        // NPI-1 individual fields
        first_name?: string
        last_name?: string
        middle_name?: string
        credential?: string
        gender?: string
        // NPI-2 organization fields
        organization_name?: string
        authorized_official_credential?: string
        authorized_official_first_name?: string
        authorized_official_last_name?: string
      }
      addresses?: Array<{
        address_1?: string
        address_2?: string
        city?: string
        state?: string
        postal_code?: string
        country_code?: string
        telephone_number?: string
        address_purpose?: string
      }>
      taxonomies?: Array<{
        code?: string
        desc?: string
        primary?: boolean
      }>
    }>
  }
  if (!data?.results) return []

  return data.results.map((r) => {
    const basic = r.basic ?? {}
    const isOrg = r.enumeration_type === 'NPI-2'

    // Name: org records use organization_name; individual records use first+last
    const name = isOrg
      ? (basic.organization_name ?? 'Unknown Organisation')
      : [basic.first_name, basic.middle_name, basic.last_name]
          .filter(Boolean)
          .join(' ') || 'Unknown'

    // Credential: individual has credential directly; org records expose it on
    // the authorized official
    const credential = isOrg
      ? (basic.authorized_official_credential ?? '')
      : (basic.credential ?? '')

    // Prefer LOCATION address, fallback to first
    const addr =
      r.addresses?.find((a) => a.address_purpose === 'LOCATION') ??
      r.addresses?.[0] ??
      {}

    const primaryTaxonomy =
      r.taxonomies?.find((t) => t.primary) ??
      r.taxonomies?.[0] ??
      {}

    return {
      npi: r.number ?? '',
      enumerationType: isOrg ? 'organization' : 'individual',
      name,
      credential,
      gender: isOrg ? '' : (basic.gender ?? ''),
      phone: addr.telephone_number ?? '',
      address: [addr.address_1, addr.address_2].filter(Boolean).join(', '),
      city: addr.city ?? '',
      state: addr.state ?? '',
      zip: (addr.postal_code ?? '').slice(0, 5),
      country: addr.country_code ?? 'US',
      taxonomy: primaryTaxonomy.desc ?? 'Dietitian, Registered',
      taxonomyCode: primaryTaxonomy.code ?? '',
    }
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const zip   = searchParams.get('zip')?.trim()   ?? ''
  const city  = searchParams.get('city')?.trim()  ?? ''
  const state = searchParams.get('state')?.trim() ?? ''
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '25', 10), 50)

  if (!zip && !city && !state) {
    return NextResponse.json(
      { error: 'Provide at least one of: zip, city, state' },
      { status: 400 }
    )
  }

  const params = new URLSearchParams({
    version: '2.1',
    taxonomy_description: 'Dietitian',
    limit: String(limit),
    skip: '0',
  })
  if (zip)   params.set('postal_code', zip)
  if (city)  params.set('city', city)
  if (state) params.set('state', state)

  try {
    const res = await fetch(`${NPI_BASE}?${params}`, {
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `NPI registry returned ${res.status}` },
        { status: 502 }
      )
    }

    const data = await res.json()
    const providers = extractProviders(data)

    // Keep only genuine dietitian/nutrition records
    const dietitians = providers.filter(
      (p) =>
        p.taxonomy.toLowerCase().includes('dietitian') ||
        p.taxonomy.toLowerCase().includes('nutrition')
    )

    return NextResponse.json({ providers: dietitians, total: dietitians.length })
  } catch {
    return NextResponse.json(
      { error: 'Failed to reach NPI registry. Please try again.' },
      { status: 502 }
    )
  }
}
