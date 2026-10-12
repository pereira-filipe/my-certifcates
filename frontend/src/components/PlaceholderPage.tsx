import type { ReactNode } from 'react'
import { t } from '@/i18n'
import { ThemeToggle } from './ThemeToggle'

/** Temporary page body until each screen is built (F3–F7). */
export function PlaceholderPage({
  title,
  children,
  showThemeToggle = true,
}: {
  title: string
  children?: ReactNode
  /** Admin pages already have the toggle in the top bar. */
  showThemeToggle?: boolean
}) {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {showThemeToggle && <ThemeToggle />}
      </div>
      <p className="text-muted-foreground">{t('placeholder')}</p>
      {children}
    </main>
  )
}
