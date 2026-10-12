import { useParams } from 'react-router'
import { PlaceholderPage } from '@/components/PlaceholderPage'
import { t } from '@/i18n'

export function CatalogPage() {
  const { shareToken } = useParams()
  return (
    <PlaceholderPage title={t('catalog.subtitle')}>
      <p className="text-sm text-muted-foreground">Token: {shareToken}</p>
    </PlaceholderPage>
  )
}
