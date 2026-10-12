import { ApiStatus } from '@/components/ApiStatus'
import { PlaceholderPage } from '@/components/PlaceholderPage'
import { t } from '@/i18n'

/** Temporary M1 check page: shows whether the frontend can reach the backend. */
export function HomePage() {
  return (
    <PlaceholderPage title={t('appName')}>
      <ApiStatus />
    </PlaceholderPage>
  )
}
