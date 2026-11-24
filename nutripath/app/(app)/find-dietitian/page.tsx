'use client'

// app/(app)/find-dietitian/page.tsx
// Find a Registered Dietitian using the CMS NPI Registry (free, no key).
// Server returns all available fields; client filters by type, gender, and name.

import { useState } from 'react'

interface Provider {
  npi: string
  enumerationType: 'individual' | 'organization'
  name: string
  credential: string
  gender: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  country: string
  taxonomy: string
  taxonomyCode: string
}

const US_STATES = [
  '', 'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY','DC',
]

// Taxonomy descriptions we can filter on — derived from real NPI data
const TAXONOMY_FILTERS = [
  { label: 'All types',           value: '' },
  { label: 'Registered Dietitian', value: 'Dietitian, Registered' },
  { label: 'Sports nutrition',     value: 'Sports' },
  { label: 'Paediatric',           value: 'Pediatric' },
  { label: 'Renal',                value: 'Renal' },
  { label: 'Metabolic',            value: 'Metabolic' },
  { label: 'Gerontology',          value: 'Gerontological' },
]

function ProviderCard({ p }: { p: Provider }) {
  const isOrg = p.enumerationType === 'organization'
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-900">
            {p.name}
            {p.credential && (
              <span className="ml-1.5 text-xs font-normal text-gray-500">{p.credential}</span>
            )}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">
              {p.taxonomy}
            </span>
            {isOrg && (
              <span className="text-xs text-purple-700 bg-purple-50 border border-purple-100 rounded px-1.5 py-0.5">
                Organisation
              </span>
            )}
            {!isOrg && p.gender === 'F' && (
              <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                She/her
              </span>
            )}
            {!isOrg && p.gender === 'M' && (
              <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                He/him
              </span>
            )}
          </div>
        </div>
        <span className="shrink-0 text-xs text-gray-400 mt-0.5">NPI {p.npi}</span>
      </div>

      {(p.address || p.city || p.state) && (
        <p className="text-xs text-gray-600 flex items-start gap-1">
          <span>📍</span>
          <span>{[p.address, p.city, p.state, p.zip].filter(Boolean).join(', ')}</span>
        </p>
      )}

      {p.phone && (
        <p className="text-xs text-gray-600">
          📞{' '}
          <a href={`tel:${p.phone.replace(/\D/g,'')}`} className="hover:text-blue-600">
            {p.phone}
          </a>
        </p>
      )}

      <p className="text-xs text-gray-400 pt-1">
        Source: CMS National Provider Identifier Registry
      </p>
    </div>
  )
}

export default function FindDietitianPage() {
  // Search form state
  const [zip,   setZip]   = useState('')
  const [city,  setCity]  = useState('')
  const [state, setState] = useState('')

  // Server data
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [providers, setProviders] = useState<Provider[] | null>(null)

  // Client-side filters (applied to `providers` without re-fetching)
  const [nameFilter,     setNameFilter]     = useState('')
  const [taxonomyFilter, setTaxonomyFilter] = useState('')
  const [genderFilter,   setGenderFilter]   = useState('')   // '' | 'F' | 'M'
  const [typeFilter,     setTypeFilter]     = useState('')   // '' | 'individual' | 'organization'

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!zip && !city && !state) {
      setError('Enter a ZIP code, city, or select a state to search.')
      return
    }
    setLoading(true)
    setError(null)
    setProviders(null)
    // Reset client filters on new search
    setNameFilter('')
    setTaxonomyFilter('')
    setGenderFilter('')
    setTypeFilter('')

    const params = new URLSearchParams()
    if (zip)   params.set('zip',   zip.trim())
    if (city)  params.set('city',  city.trim())
    if (state) params.set('state', state)
    params.set('limit', '50')   // fetch more so client filters have more to work with

    try {
      const res = await fetch(`/api/npi/search?${params}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Search failed. Please try again.')
        return
      }
      setProviders(data.providers ?? [])
    } catch {
      setError('Network error — please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    setZip('')
    setCity('')
    setState('')
    setProviders(null)
    setError(null)
    setNameFilter('')
    setTaxonomyFilter('')
    setGenderFilter('')
    setTypeFilter('')
  }

  // Apply client-side filters
  const filtered = (providers ?? []).filter((p) => {
    if (nameFilter && !p.name.toLowerCase().includes(nameFilter.toLowerCase())) return false
    if (taxonomyFilter && !p.taxonomy.toLowerCase().includes(taxonomyFilter.toLowerCase())) return false
    if (genderFilter && p.gender !== genderFilter) return false
    if (typeFilter && p.enumerationType !== typeFilter) return false
    return true
  })

  const inputCls = 'rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 w-full'

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find a Dietitian</h1>
        <p className="mt-1 text-sm text-gray-500">
          Search for Registered Dietitian Nutritionists (RDNs) near you.
          Results come from the free{' '}
          <a href="https://npiregistry.cms.hhs.gov" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
            CMS NPI Registry
          </a>{' '}
          — US providers only.
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <p className="text-sm font-medium text-gray-700">
          Search by location <span className="font-normal text-gray-400">(fill in one or more)</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ZIP code</label>
            <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="e.g. 10001" maxLength={10} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Chicago" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
            <select value={state} onChange={(e) => setState(e.target.value)} className={inputCls}>
              <option value="">Any state</option>
              {US_STATES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={loading} className="px-5 py-2 rounded-md bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Searching…' : 'Search'}
          </button>
          {(zip || city || state || providers !== null) && (
            <button type="button" onClick={handleClear} className="text-sm text-gray-400 hover:text-gray-600">Clear</button>
          )}
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-10 text-sm text-gray-500">
          <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-green-600 border-t-transparent mb-2" />
          <p>Searching the NPI Registry…</p>
        </div>
      )}

      {/* Client-side filters — shown once we have results */}
      {!loading && providers !== null && providers.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Filter results</p>
            {(nameFilter || taxonomyFilter || genderFilter || typeFilter) && (
              <button
                type="button"
                onClick={() => { setNameFilter(''); setTaxonomyFilter(''); setGenderFilter(''); setTypeFilter('') }}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Name search */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Search by name</label>
            <input
              type="text"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="e.g. Smith, Wellness Center…"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 w-full"
            />
          </div>

          {/* Specialty — show count per option; dim if 0 results */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Specialty</label>
            <div className="flex flex-wrap gap-1.5">
              {TAXONOMY_FILTERS.map(({ label, value }) => {
                const count = value === ''
                  ? providers.length
                  : providers.filter((p) => p.taxonomy.toLowerCase().includes(value.toLowerCase())).length
                const isActive = taxonomyFilter === value
                const isEmpty  = count === 0 && value !== ''
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => !isEmpty && setTaxonomyFilter(value)}
                    disabled={isEmpty}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      isActive
                        ? 'bg-green-600 text-white border-green-600'
                        : isEmpty
                          ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
                    }`}
                  >
                    {label} <span className={isActive ? 'opacity-70' : 'text-gray-400'}>{count}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Provider type — show counts */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Provider type</label>
            <div className="flex gap-2">
              {[
                { label: 'All',           value: '',             count: providers.length },
                { label: 'Individual',    value: 'individual',   count: providers.filter(p => p.enumerationType === 'individual').length },
                { label: 'Organisation',  value: 'organization', count: providers.filter(p => p.enumerationType === 'organization').length },
              ].map(({ label, value, count }) => {
                const isActive = typeFilter === value
                const isEmpty  = count === 0 && value !== ''
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => !isEmpty && setTypeFilter(value)}
                    disabled={isEmpty}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      isActive
                        ? 'bg-green-600 text-white border-green-600'
                        : isEmpty
                          ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
                    }`}
                  >
                    {label} <span className={isActive ? 'opacity-70' : 'text-gray-400'}>{count}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Gender — only show if at least one individual result has a gender set */}
          {providers.some(p => p.gender === 'F' || p.gender === 'M') && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Provider gender</label>
              <div className="flex gap-2">
                {[
                  { label: 'Any',    value: '',  count: providers.length },
                  { label: 'Female', value: 'F', count: providers.filter(p => p.gender === 'F').length },
                  { label: 'Male',   value: 'M', count: providers.filter(p => p.gender === 'M').length },
                ].map(({ label, value, count }) => {
                  const isActive = genderFilter === value
                  const isEmpty  = count === 0 && value !== ''
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => !isEmpty && setGenderFilter(value)}
                      disabled={isEmpty}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        isActive
                          ? 'bg-green-600 text-white border-green-600'
                          : isEmpty
                            ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
                      }`}
                    >
                      {label} <span className={isActive ? 'opacity-70' : 'text-gray-400'}>{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {!loading && providers !== null && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            {filtered.length === 0
              ? (providers.length > 0
                  ? 'No results match your filters. Try adjusting them.'
                  : 'No dietitians found for that location. Try a nearby city or different ZIP.')
              : `${filtered.length} of ${providers.length} dietitian${providers.length !== 1 ? 's' : ''} shown`}
          </p>

          {filtered.map((p) => <ProviderCard key={p.npi} p={p} />)}

          {filtered.length > 0 && (
            <p className="text-xs text-gray-400 pt-2">
              Data from CMS NPI Registry. Always verify credentials and availability directly with
              the provider. This is not a referral or endorsement.
            </p>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && providers === null && !error && (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl px-6 py-10 text-center space-y-2">
          <p className="text-gray-700 font-medium">Search for a dietitian near you</p>
          <p className="text-sm text-gray-500">
            Enter a ZIP code, city, or state above. Results are Registered Dietitian
            Nutritionists from the official US provider registry.
          </p>
        </div>
      )}
    </div>
  )
}
