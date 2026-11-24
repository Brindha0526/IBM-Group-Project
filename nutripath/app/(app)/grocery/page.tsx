'use client'

// app/(app)/grocery/page.tsx
// Two sections:
//   1. Ingredients saved from the meal plan page (via localStorage).
//   2. Nearby grocery stores + health food shops via OSM Overpass (global, free).

import { useState, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GroceryItem {
  name: string
  servingG: number
  mealName: string
  dayLabel: string
}

interface NearbyStore {
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

const STORAGE_KEY = 'nutripath_grocery_items'

// ─── Grocery list section ─────────────────────────────────────────────────────

function GroceryListSection() {
  const [items,   setItems]   = useState<GroceryItem[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loaded,  setLoaded]  = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch { /* corrupted storage — ignore */ }
    setLoaded(true)
  }, [])

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function clearAll() {
    localStorage.removeItem(STORAGE_KEY)
    setItems([])
    setChecked(new Set())
  }

  if (!loaded) return null

  const grouped = items.reduce<Record<string, GroceryItem[]>>((acc, item) => {
    if (!acc[item.dayLabel]) acc[item.dayLabel] = []
    acc[item.dayLabel].push(item)
    return acc
  }, {})

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Your grocery list</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Ingredients saved from your meal plan. Tick items off as you shop.
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="shrink-0 text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-3 py-1.5"
          >
            Clear list
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl px-6 py-10 text-center space-y-2">
          <p className="text-gray-700 font-medium">Your grocery list is empty</p>
          <p className="text-sm text-gray-500">
            Go to{' '}
            <a href="/plan" className="text-blue-600 underline">Meal Plan</a>,
            generate a plan, then click <strong>Save to Grocery List</strong> on any meal.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([day, dayItems]) => (
            <div key={day} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">{day}</h3>
              </div>
              <ul className="divide-y divide-gray-100">
                {dayItems.map((item) => {
                  const key = `${item.dayLabel}__${item.name}`
                  const done = checked.has(key)
                  return (
                    <li key={key} className="flex items-center gap-3 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => toggle(key)}
                        className="h-4 w-4 rounded border-gray-300 text-green-600"
                      />
                      <div className={`flex-1 min-w-0 ${done ? 'opacity-40 line-through' : ''}`}>
                        <p className="text-sm font-medium text-gray-900 capitalize">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.servingG} g · {item.mealName}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
          <p className="text-xs text-gray-400 pt-2">
            {checked.size} of {items.length} item{items.length !== 1 ? 's' : ''} checked off.
          </p>
        </div>
      )}
    </section>
  )
}

// ─── Nearby stores section ────────────────────────────────────────────────────

const STORE_TYPE_FILTERS = [
  { label: 'All',              value: '' },
  { label: 'Supermarkets',     value: 'Supermarket' },
  { label: 'Grocery stores',   value: 'Grocery store' },
  { label: 'Health food',      value: 'Health food store' },
  { label: 'Organic',          value: 'Organic store' },
]

function NearbyStoresSection() {
  const [status,     setStatus]     = useState<'idle' | 'locating' | 'loading' | 'done' | 'error'>('idle')
  const [stores,     setStores]     = useState<NearbyStore[]>([])
  const [error,      setError]      = useState<string | null>(null)
  const [radius,     setRadius]     = useState(5)
  const [typeFilter, setTypeFilter] = useState('')

  async function fetchStores(lat: number, lng: number, r: number) {
    setStatus('loading')
    setError(null)
    try {
      const res = await fetch(`/api/nearby-stores?lat=${lat}&lng=${lng}&radius=${r}`)
      const data = await res.json()
      setStores(data.stores ?? [])
      setStatus('done')
    } catch {
      setError('Could not load nearby stores. Please try again.')
      setStatus('error')
    }
  }

  function handleLocate() {
    if (!navigator.geolocation) {
      setError('Your browser does not support geolocation.')
      setStatus('error')
      return
    }
    setStatus('locating')
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchStores(pos.coords.latitude, pos.coords.longitude, radius),
      (err) => {
        setError(
          err.code === 1
            ? 'Location access was denied. Please allow location in your browser settings.'
            : 'Could not get your location. Please try again.'
        )
        setStatus('error')
      },
      { timeout: 10000 }
    )
  }

  const filtered = typeFilter
    ? stores.filter((s) => s.type === typeFilter)
    : stores

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Nearby grocery stores</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Supermarkets, grocery stores, and health food shops near you.
          Powered by{' '}
          <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
            OpenStreetMap
          </a>{' '}
          — works worldwide.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Radius</label>
            <div className="flex gap-2">
              {[2, 5, 10, 25].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadius(r)}
                  className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors ${
                    radius === r
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                  }`}
                >
                  {r} mi
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLocate}
            disabled={status === 'locating' || status === 'loading'}
            className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {status === 'locating' || status === 'loading' ? (
              <>
                <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                {status === 'locating' ? 'Getting location…' : 'Searching…'}
              </>
            ) : (
              <>📍 Use my location</>
            )}
          </button>
        </div>

        {/* Type filter — only show once we have results */}
        {status === 'done' && stores.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
            {STORE_TYPE_FILTERS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTypeFilter(value)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  typeFilter === value
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* No results after filter */}
      {status === 'done' && filtered.length === 0 && stores.length > 0 && (
        <p className="text-sm text-gray-500">No {typeFilter.toLowerCase()} stores in results. Try a different filter.</p>
      )}

      {/* Empty results */}
      {status === 'done' && stores.length === 0 && (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl px-6 py-8 text-center">
          <p className="text-gray-700 font-medium">No stores found nearby</p>
          <p className="text-sm text-gray-500 mt-1">Try increasing the radius or searching from a different location.</p>
        </div>
      )}

      {/* Results */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            {filtered.length} store{filtered.length !== 1 ? 's' : ''} within {radius} miles
            {typeFilter ? ` · ${typeFilter}` : ''}
          </p>
          {filtered.map((store) => (
            <div key={store.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{store.name}</p>
                  <span className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">
                    {store.type}
                  </span>
                </div>
                <span className="shrink-0 text-xs text-gray-400 mt-0.5">{store.distanceMiles} mi</span>
              </div>
              {(store.address || store.city) && (
                <p className="text-xs text-gray-600 flex items-start gap-1">
                  <span className="text-gray-400">📍</span>
                  <span>{[store.address, store.city, store.postcode].filter(Boolean).join(', ')}</span>
                </p>
              )}
              {store.openingHours && (
                <p className="text-xs text-gray-500">🕐 {store.openingHours}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 pt-0.5">
                {store.phone && (
                  <a href={`tel:${store.phone.replace(/\s/g,'')}`} className="text-xs text-blue-600 hover:underline">
                    📞 {store.phone}
                  </a>
                )}
                {store.website && (
                  <a
                    href={store.website.startsWith('http') ? store.website : `https://${store.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Website →
                  </a>
                )}
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-400 pt-1">
            © OpenStreetMap contributors. Data may be incomplete — always verify before visiting.
          </p>
        </div>
      )}

      {/* Idle state */}
      {status === 'idle' && (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl px-6 py-8 text-center">
          <p className="text-gray-700 font-medium">Find stores near you</p>
          <p className="text-sm text-gray-500 mt-1">
            Click <strong>Use my location</strong> above to find nearby supermarkets and grocery stores.
          </p>
        </div>
      )}
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GroceryPage() {
  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Grocery</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your shopping list from your meal plan, plus nearby stores.
        </p>
      </div>
      <GroceryListSection />
      <NearbyStoresSection />
    </div>
  )
}
