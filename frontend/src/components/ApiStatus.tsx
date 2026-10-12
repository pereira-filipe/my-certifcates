import { usePing } from '@/api/ping'
import { t } from '@/i18n'
import { cn } from '@/lib/utils'

export function ApiStatus() {
  const { isPending, isError } = usePing()
  const label = isPending
    ? t('apiStatus.checking')
    : isError
      ? t('apiStatus.down')
      : t('apiStatus.ok')

  return (
    <p role="status" className="flex items-center gap-2 text-sm">
      <span
        aria-hidden
        className={cn(
          'size-2 rounded-full',
          isPending ? 'bg-muted-foreground' : isError ? 'bg-destructive' : 'bg-green-600',
        )}
      />
      {label}
    </p>
  )
}
