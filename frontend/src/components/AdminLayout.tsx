import { ExternalLink, Link2, LogOut, Settings } from 'lucide-react'
import { Link, Outlet, useNavigate } from 'react-router'
import { useLogout } from '@/api/auth'
import { catalogPath, useCatalogLink } from '@/api/catalog'
import { Button } from '@/components/ui/button'
import { t } from '@/i18n'
import { copyWithToast } from '@/lib/clipboard'
import { ThemeToggle } from './ThemeToggle'

/** Top bar for every admin page (specs/FRONTEND.md §3). Button texts hide on small screens; labels stay. */
export function AdminLayout() {
  const logout = useLogout()
  const link = useCatalogLink()
  const navigate = useNavigate()

  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
          <Link to="/admin" className="font-semibold">
            {t('appName')}
          </Link>
          <div className="flex items-center gap-1">
            {link.data && (
              <>
                <Button variant="ghost" asChild>
                  <a
                    href={catalogPath(link.data)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('admin.viewCatalog')}
                  >
                    <ExternalLink />
                    <span className="hidden md:inline">{t('admin.viewCatalog')}</span>
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  aria-label={t('admin.copyLink')}
                  onClick={() => copyWithToast(link.data.url, t('admin.linkCopied'))}
                >
                  <Link2 />
                  <span className="hidden md:inline">{t('admin.copyLink')}</span>
                </Button>
              </>
            )}
            <ThemeToggle />
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin/settings" aria-label={t('admin.settings')}>
                <Settings />
              </Link>
            </Button>
            <Button
              variant="ghost"
              aria-label={t('admin.logout')}
              disabled={logout.isPending}
              onClick={() =>
                logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })
              }
            >
              <LogOut />
              <span className="hidden sm:inline">{t('admin.logout')}</span>
            </Button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
