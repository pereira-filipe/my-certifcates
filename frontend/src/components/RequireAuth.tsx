import { Navigate, Outlet, useLocation } from 'react-router'
import { useMe } from '@/api/auth'
import { Skeleton } from '@/components/ui/skeleton'

/** Guards /admin/*: logged-out visitors go to /login and come back here afterwards. */
export function RequireAuth() {
  const me = useMe()
  const location = useLocation()

  if (me.isPending) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6" aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!me.data) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  return <Outlet />
}
