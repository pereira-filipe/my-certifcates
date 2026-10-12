import type { ReactNode } from 'react'
import { t } from '@/i18n'
import { ThemeToggle } from './ThemeToggle'

/** Temporary page body until each screen is built (F3–F7). */
export function PlaceholderPage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col gap-4 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <ThemeToggle />
      </div>
      <p className="text-muted-foreground">{t('placeholder')}</p>
      {children}
    </main>
  )
}
