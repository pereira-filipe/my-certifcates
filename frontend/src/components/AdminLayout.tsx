import { LogOut, Settings } from 'lucide-react'
import { Link, Outlet, useNavigate } from 'react-router'
import { useLogout } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { t } from '@/i18n'
import { ThemeToggle } from './ThemeToggle'

/** Top bar for every admin page. "View public catalog" and "Copy link" need the share link (M5). */
export function AdminLayout() {
  const logout = useLogout()
  const navigate = useNavigate()

  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
          <Link to="/admin" className="font-semibold">
            {t('appName')}
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin/settings" aria-label={t('admin.settings')}>
                <Settings />
              </Link>
            </Button>
            <Button
              variant="ghost"
              disabled={logout.isPending}
              onClick={() =>
                logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })
              }
            >
              <LogOut />
              {t('admin.logout')}
            </Button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
