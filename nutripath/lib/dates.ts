// lib/dates.ts
// Local-timezone day helpers.
//
// Day boundaries are computed in the BROWSER's timezone and sent to the API as
// absolute ISO instants (?start=…&end=…). The server never has to guess the
// user's timezone (it runs in UTC on Vercel), and DST is handled by the
// browser's Date implementation.

/** YYYY-MM-DD for the given instant in the runtime's local timezone. */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parses YYYY-MM-DD into local midnight. Returns null if malformed. */
export function parseDateKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return localDateKey(d) === key ? d : null
}

/** Local midnight at the start of `key` and of the following day. */
export function localDayBounds(key: string): { start: Date; end: Date } {
  const start = parseDateKey(key)
  if (!start) throw new Error(`Invalid date key: ${key}`)
  const end = new Date(start)
  end.setDate(end.getDate() + 1) // calendar-day step, DST-safe
  return { start, end }
}

/** The last `n` local date keys ending with `today`, oldest first. */
export function lastNDateKeys(n: number, today: Date = new Date()): string[] {
  const keys: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    keys.push(localDateKey(d))
  }
  return keys
}

/** Query string for /api/log covering local days `fromKey`..`toKey` inclusive. */
export function logRangeQuery(fromKey: string, toKey: string = fromKey): string {
  const { start } = localDayBounds(fromKey)
  const { end } = localDayBounds(toKey)
  return `start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`
}
