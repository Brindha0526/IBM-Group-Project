import { describe, it, expect } from 'vitest'
import { localDateKey, parseDateKey, localDayBounds, lastNDateKeys, logRangeQuery } from '@/lib/dates'

describe('lib/dates', () => {
  it('localDateKey uses local calendar fields, not UTC', () => {
    // 23:30 local is the next day in UTC for zones west of UTC; the key must
    // still be the local date. (Run with TZ=… to exercise other zones.)
    const d = new Date(2026, 2, 5, 23, 30)
    expect(localDateKey(d)).toBe('2026-03-05')
    const early = new Date(2026, 2, 5, 0, 15)
    expect(localDateKey(early)).toBe('2026-03-05')
  })

  it('parseDateKey returns local midnight and rejects bad input', () => {
    const d = parseDateKey('2026-11-24')!
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(10)
    expect(d.getDate()).toBe(24)
    expect(d.getHours()).toBe(0)
    expect(parseDateKey('2026-02-30')).toBeNull()
    expect(parseDateKey('24/11/2026')).toBeNull()
    expect(parseDateKey('')).toBeNull()
  })

  it('localDayBounds spans exactly one local calendar day', () => {
    const { start, end } = localDayBounds('2026-11-24')
    expect(localDateKey(start)).toBe('2026-11-24')
    expect(localDateKey(end)).toBe('2026-11-25')
    expect(end.getHours()).toBe(0)
    // An instant late in the local day falls inside the range
    const late = new Date(2026, 10, 24, 23, 59)
    expect(late >= start && late < end).toBe(true)
  })

  it('localDayBounds throws on invalid keys', () => {
    expect(() => localDayBounds('nope')).toThrow()
  })

  it('lastNDateKeys returns n consecutive days ending today, oldest first, across month ends', () => {
    expect(lastNDateKeys(3, new Date(2026, 2, 1, 12))).toEqual(['2026-02-27', '2026-02-28', '2026-03-01'])
    expect(lastNDateKeys(1, new Date(2026, 0, 1))).toEqual(['2026-01-01'])
  })

  it('logRangeQuery covers from-day start to the end of to-day', () => {
    const q = new URLSearchParams(logRangeQuery('2026-11-18', '2026-11-24'))
    expect(new Date(q.get('start')!).getTime()).toBe(new Date(2026, 10, 18).getTime())
    expect(new Date(q.get('end')!).getTime()).toBe(new Date(2026, 10, 25).getTime())
  })

  it('logRangeQuery for a single day', () => {
    const q = new URLSearchParams(logRangeQuery('2026-11-24'))
    expect(new Date(q.get('start')!).getTime()).toBe(new Date(2026, 10, 24).getTime())
    expect(new Date(q.get('end')!).getTime()).toBe(new Date(2026, 10, 25).getTime())
  })
})
