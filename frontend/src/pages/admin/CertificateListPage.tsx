import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import {
  useCertificates,
  useDeleteCertificate,
  useReorderCertificates,
  useSetVisibility,
} from '@/api/certificates'
import { useTags } from '@/api/tags'
import type { Certificate, CertificateFilters } from '@/api/types'
import { CertificateRow } from '@/components/CertificateRow'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { t } from '@/i18n'

const ALL = 'all'

/** Filters live in the URL (?q=&tag=&visibility=) so they survive reloads and the back button. */
function useListFilters() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const tag = params.get('tag') ?? ''
  const visibility = params.get('visibility') ?? ALL

  const update = (changes: Record<string, string>) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value && value !== ALL) next.set(key, value)
          else next.delete(key)
        }
        return next
      },
      { replace: true },
    )

  const filters: CertificateFilters = {
    ...(q && { q }),
    ...(tag && { tag }),
    ...(visibility !== ALL && { isPublic: visibility === 'public' }),
  }
  return { q, tag, visibility, filters, update, isFiltered: Object.keys(filters).length > 0 }
}

export function CertificateListPage() {
  const { q, tag, visibility, filters, update, isFiltered } = useListFilters()
  const [search, setSearch] = useState(q)
  const certificates = useCertificates(filters)
  const tags = useTags()
  const setVisibility = useSetVisibility()
  const reorder = useReorderCertificates()
  const deleteCertificate = useDeleteCertificate()
  const [toDelete, setToDelete] = useState<Certificate | null>(null)

  // Search as you type, but only call the API once typing pauses.
  useEffect(() => {
    if (search.trim() === q) return
    const timer = setTimeout(() => update({ q: search.trim() }), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- update is recreated each render
  }, [search, q])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const items = certificates.data ?? []
  const canReorder = !isFiltered && items.length > 1

  // Screen readers hear titles and positions, not internal ids.
  const describe = (id: UniqueIdentifier) => items.find((c) => c.id === id)?.title ?? ''
  const position = (id: UniqueIdentifier) =>
    `${items.findIndex((c) => c.id === id) + 1} of ${items.length}`
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Picked up ${describe(active.id)}, position ${position(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${describe(active.id)} moved to position ${position(over.id)}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over ? `${describe(active.id)} dropped at position ${position(over.id)}.` : undefined,
    onDragCancel: ({ active }) => `Moving ${describe(active.id)} was cancelled.`,
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = items.findIndex((c) => c.id === active.id)
    const to = items.findIndex((c) => c.id === over.id)
    reorder.mutate(arrayMove(items, from, to), {
      onError: () => toast.error(t('errors.generic')),
    })
  }

  const onTogglePublic = (certificate: Certificate, isPublic: boolean) =>
    setVisibility.mutate(
      { id: certificate.id, isPublic },
      {
        onSuccess: () => toast.success(isPublic ? t('list.nowPublic') : t('list.nowHidden')),
        onError: () => toast.error(t('errors.generic')),
      },
    )

  const onConfirmDelete = () => {
    if (!toDelete) return
    deleteCertificate.mutate(toDelete.id, {
      onSuccess: () => toast.success(t('list.deleted')),
      onError: () => toast.error(t('errors.generic')),
    })
    setToDelete(null)
  }

  const clearFilters = () => {
    setSearch('')
    update({ q: '', tag: '', visibility: '' })
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('list.title')}</h1>
        <Button asChild>
          <Link to="/admin/certificates/new">
            <Plus />
            {t('list.add')}
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            className="pl-8"
            placeholder={t('list.search')}
            aria-label={t('list.search')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select value={tag || ALL} onValueChange={(value) => update({ tag: value })}>
          <SelectTrigger className="w-full sm:w-44" aria-label={t('list.tagFilter')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('list.allTags')}</SelectItem>
            {tags.data?.map((option) => (
              <SelectItem key={option.id} value={option.name}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={visibility} onValueChange={(value) => update({ visibility: value })}>
          <SelectTrigger className="w-full sm:w-44" aria-label={t('list.visibilityFilter')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('list.allVisibility')}</SelectItem>
            <SelectItem value="public">{t('list.onlyPublic')}</SelectItem>
            <SelectItem value="hidden">{t('list.onlyHidden')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {certificates.isPending ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : certificates.isError ? (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-2">
            {t('list.loadError')}
            <Button variant="outline" size="sm" onClick={() => certificates.refetch()}>
              {t('list.retry')}
            </Button>
          </AlertDescription>
        </Alert>
      ) : items.length === 0 ? (
        isFiltered ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-muted-foreground">{t('list.noMatches')}</p>
            <Button variant="outline" onClick={clearFilters}>
              {t('list.clearFilters')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
            <p className="text-lg font-medium">{t('list.emptyTitle')}</p>
            <Button asChild>
              <Link to="/admin/certificates/new">
                <Plus />
                {t('list.emptyAction')}
              </Link>
            </Button>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-2">
          {items.length > 1 && (
            <p className="text-sm text-muted-foreground">
              {canReorder ? t('list.reorderHint') : t('list.reorderDisabled')}
            </p>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={onDragEnd}
            accessibility={{
              announcements,
              screenReaderInstructions: { draggable: t('list.dragInstructions') },
            }}
          >
            <SortableContext items={items} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-2">
                {items.map((certificate) => (
                  <CertificateRow
                    key={certificate.id}
                    certificate={certificate}
                    canReorder={canReorder}
                    onTogglePublic={(isPublic) => onTogglePublic(certificate, isPublic)}
                    onDelete={() => setToDelete(certificate)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={t('list.deleteTitle')}
        message={t('list.deleteMessage')}
        confirmLabel={t('list.delete')}
        cancelLabel={t('list.cancel')}
        onConfirm={onConfirmDelete}
        destructive
      />
    </main>
  )
}
