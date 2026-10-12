import { describe, expect, it } from 'vitest'
import { formatMonthYear, isExpired } from './dates'

describe('dates', () => {
  it('formats month and year without shifting the day', () => {
    expect(formatMonthYear('2025-03-01')).toBe('Mar 2025')
    expect(formatMonthYear('2027-06-30')).toBe('Jun 2027')
  })

  it('treats the expiration day itself as still valid', () => {
    expect(isExpired('2026-10-11', '2026-10-12')).toBe(true)
    expect(isExpired('2026-10-12', '2026-10-12')).toBe(false)
    expect(isExpired('2027-01-01', '2026-10-12')).toBe(false)
  })
})
