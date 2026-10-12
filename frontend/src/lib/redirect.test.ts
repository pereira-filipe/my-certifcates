import { describe, expect, it } from 'vitest'
import { safeNextPath } from './redirect'

describe('safeNextPath', () => {
  it('keeps admin paths', () => {
    expect(safeNextPath('/admin')).toBe('/admin')
    expect(safeNextPath('/admin/certificates/42?tab=files')).toBe(
      '/admin/certificates/42?tab=files',
    )
  })

  it('falls back to /admin for anything else', () => {
    for (const next of [
      null,
      '',
      '/',
      '/c/token',
      '//evil.example',
      'https://evil.example',
      '/administrator',
    ]) {
      expect(safeNextPath(next)).toBe('/admin')
    }
  })
})
