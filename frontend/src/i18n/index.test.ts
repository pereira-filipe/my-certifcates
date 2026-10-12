import { describe, expect, it } from 'vitest'
import { t } from '.'

describe('t', () => {
  it('returns top-level and nested texts', () => {
    expect(t('appName')).toBe('My Certificates')
    expect(t('notFound.title')).toBe('Page not found')
  })
})
