import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import type { Certificate } from '@/api/types'
import { FileThumbnail } from '@/components/CertificateFiles'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { t } from '@/i18n'
import { formatMonthYear, isExpired } from '@/lib/dates'
import { cn } from '@/lib/utils'

type CertificateRowProps = {
  certificate: Certificate
  canReorder: boolean
  onTogglePublic: (isPublic: boolean) => void
  onDelete: () => void
}

/** One certificate in the admin list. Draggable by its handle when reordering is allowed. */
export function CertificateRow({
  certificate,
  canReorder,
  onTogglePublic,
  onDelete,
}: CertificateRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: certificate.id, disabled: !canReorder })
  const { id, title, issuer, issueDate, expirationDate, tags, isPublic } = certificate
  const switchId = `public-${id}`

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 sm:flex-nowrap',
        isDragging && 'relative z-10 shadow-lg',
      )}
    >
      {canReorder && (
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="-ml-1 cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing"
          aria-label={`${t('list.dragHandle')}: ${title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      )}

      {/* The main file comes first; its thumbnail is what visitors see on the card. */}
      <FileThumbnail file={certificate.files[0]} className="size-14" />

      <div className="min-w-0 flex-1">
        <Link to={`/admin/certificates/${id}`} className="font-medium hover:underline">
          {title}
        </Link>
        <p className="text-sm text-muted-foreground">
          {issuer} · {formatMonthYear(issueDate)}
        </p>
        {(tags.length > 0 || expirationDate) && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {expirationDate &&
              (isExpired(expirationDate) ? (
                <Badge variant="destructive">{t('list.expired')}</Badge>
              ) : (
                <Badge variant="outline">
                  {t('list.expires')} {formatMonthYear(expirationDate)}
                </Badge>
              ))}
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
        <div className="mr-2 flex items-center gap-2">
          <Switch
            id={switchId}
            checked={isPublic}
            onCheckedChange={onTogglePublic}
            aria-label={`${t('list.public')}: ${title}`}
          />
          <label htmlFor={switchId} className="w-14 text-sm text-muted-foreground">
            {isPublic ? t('list.public') : t('list.hidden')}
          </label>
        </div>
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/admin/certificates/${id}`} aria-label={`${t('list.edit')} ${title}`}>
            <Pencil />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`${t('list.delete')} ${title}`}
          onClick={onDelete}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  )
}
