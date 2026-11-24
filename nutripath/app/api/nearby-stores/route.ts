// app/api/nearby-stores/route.ts
// GET /api/nearby-stores?lat=&lng=&radius=
//
// Uses the Nominatim OSM geocoding API to find grocery stores near a lat/lng.
// Nominatim is free, requires no API key, and works worldwide.
// We search within a bounding box derived from the radius, then filter by distance.
//
// Nominatim usage policy: 1 req/sec max, User-Agent required.
// https://operations.osmfoundation.org/policies/nominatim/

import { NextResponse } from 'next/server'

export interface NearbyStore {
  id: string
  name: string
  type: string
  address: string
  city: string
  postcode: string
  phone: string
  website: string
  lat: number
  lng: number
  distanceMiles: number
  openingHours: string
}

const SHOP_LABELS: Record<string, string> = {
  supermarket:    'Supermarket',
  grocery:        'Grocery store',
  health_food:    'Health food store',
  organic:        'Organic store',
  convenience:    'Convenience store',
  deli:           'Deli',
  farm:           'Farm shop',
  greengrocer:    'Greengrocer',
  butcher:        'Butcher',
  bakery:         'Bakery',
}

function shopLabel(type: string): string {
  return SHOP_LABELS[type] ?? 'Store'
}

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 3958.8
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Degrees of latitude per mile (approx)
const DEG_PER_MILE_LAT = 1 / 69.0
// Degrees of longitude per mile at a given latitude
function degPerMileLng(lat: number) {
  return 1 / (Math.cos((lat * Math.PI) / 180) * 69.0)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const latRaw    = searchParams.get('lat')
  const lngRaw    = searchParams.get('lng')
  const radiusRaw = searchParams.get('radius') ?? '5'

  if (!latRaw || !lngRaw) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  const lat    = parseFloat(latRaw)
  const lng    = parseFloat(lngRaw)
  const radius = Math.min(parseFloat(radiusRaw), 50)

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Invalid lat/lng' }, { status: 400 })
  }

  // Build a bounding box slightly larger than the radius so we catch edge cases
  const pad    = radius * 1.2
  const minLat = lat - pad * DEG_PER_MILE_LAT
  const maxLat = lat + pad * DEG_PER_MILE_LAT
  const minLng = lng - pad * degPerMileLng(lat)
  const maxLng = lng + pad * degPerMileLng(lat)
  const viewbox = `${minLng},${maxLat},${maxLng},${minLat}` // left,top,right,bottom

  // Query each shop type separately and merge — Nominatim handles one category per call well
  const shopTypes = ['supermarket', 'grocery', 'health_food', 'organic', 'greengrocer', 'convenience']

  const allResults: NearbyStore[] = []
  const seenIds = new Set<string>()

  for (const shopType of shopTypes) {
    try {
      const params = new URLSearchParams({
        q: shopType,
        format: 'jsonv2',
        limit: '15',
        addressdetails: '1',
        bounded: '1',
        viewbox,
        countrycodes: '',   // allow all countries
      })

      const url = `https://nominatim.openstreetmap.org/search?${params}`
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'NutriPath/1.0 (educational health app)',
          'Accept': 'application/json',
          'Accept-Language': 'en',
        },
        signal: AbortSignal.timeout(8000),
      })

      if (!res.ok) continue

      const data = await res.json() as Array<{
        place_id?: number
        osm_id?: number
        osm_type?: string
        lat?: string
        lon?: string
        name?: string
        class?: string
        type?: string
        display_name?: string
        address?: Record<string, string>
        extratags?: Record<string, string>
      }>

      for (const item of data) {
        // Only keep shop-class results
        if (item.class !== 'shop') continue

        const id = `${item.osm_type ?? 'x'}_${item.osm_id ?? item.place_id ?? Math.random()}`
        if (seenIds.has(id)) continue
        seenIds.add(id)

        const iLat  = parseFloat(item.lat ?? '0')
        const iLng  = parseFloat(item.lon ?? '0')
        const dist  = Math.round(haversineDistance(lat, lng, iLat, iLng) * 10) / 10
        if (dist > radius) continue

        const addr     = item.address ?? {}
        const street   = [addr.house_number, addr.road].filter(Boolean).join(' ')
        const city     = addr.city ?? addr.town ?? addr.village ?? addr.suburb ?? ''
        const postcode = addr.postcode ?? ''
        const extra    = item.extratags ?? {}

        allResults.push({
          id,
          name: item.name ?? addr.shop ?? shopLabel(item.type ?? shopType),
          type: shopLabel(item.type ?? shopType),
          address: street,
          city,
          postcode,
          phone:        extra.phone ?? extra['contact:phone'] ?? '',
          website:      extra.website ?? extra['contact:website'] ?? '',
          lat:          iLat,
          lng:          iLng,
          distanceMiles: dist,
          openingHours:  extra.opening_hours ?? '',
        })
      }
    } catch {
      // Skip this shop type if fetch fails — continue with others
      continue
    }
  }

  // Sort by distance, return top 25
  const stores = allResults
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, 25)

  return NextResponse.json({ stores, total: stores.length })
}
