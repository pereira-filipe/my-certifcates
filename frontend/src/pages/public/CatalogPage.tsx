import { useEffect } from 'react'
import { Outlet, useParams } from 'react-router'
import { usePublicCatalog } from '@/api/catalog'
import { ApiError } from '@/api/client'
import { CertificateCard } from '@/components/catalog/CertificateCard'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { t } from '@/i18n'
import { NotFoundPage } from './NotFoundPage'

/** /c/:shareToken — the page recruiters open. The detail opens over it (child route). */
export function CatalogPage() {
  const { shareToken = '' } = useParams()
  const catalog = usePublicCatalog(shareToken)
  const displayName = catalog.data?.displayName

  useEffect(() => {
    if (displayName) document.title = `${displayName} — ${t('catalog.pageTitle')}`
  }, [displayName])

  if (catalog.isError && catalog.error instanceof ApiError && catalog.error.status === 404) {
    return <NotFoundPage />
  }

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-4 px-4 py-8 sm:py-10">
          <div>
            {catalog.isPending ? (
              <Skeleton className="h-9 w-56" />
            ) : (
              <h1 className="text-3xl font-bold tracking-tight">{displayName}</h1>
            )}
            <p className="mt-1 text-lg text-muted-foreground">{t('catalog.subtitle')}</p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {catalog.isPending ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="aspect-[4/5] w-full rounded-xl" />
            ))}
          </div>
        ) : catalog.isError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p>{t('catalog.loadError')}</p>
            <Button variant="outline" onClick={() => catalog.refetch()}>
              {t('catalog.retry')}
            </Button>
          </div>
        ) : catalog.data.certificates.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">{t('catalog.empty')}</p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {catalog.data.certificates.map((certificate) => (
              <li key={certificate.id} className="flex">
                <CertificateCard token={shareToken} certificate={certificate} />
              </li>
            ))}
          </ul>
        )}
      </main>

      <Outlet />
    </div>
  )
}
