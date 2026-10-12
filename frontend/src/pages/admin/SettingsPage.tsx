import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Copy, Pencil, RefreshCw, Trash2, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { useChangePassword, useUpdateProfile } from '@/api/account'
import { useMe } from '@/api/auth'
import { useCatalogLink, useRegenerateLink } from '@/api/catalog'
import { ApiError } from '@/api/client'
import { useDeleteTag, useRenameTag, useTags } from '@/api/tags'
import type { TagUsage } from '@/api/types'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { t } from '@/i18n'
import { copyWithToast } from '@/lib/clipboard'

export function SettingsPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>
      <ShareLinkSection />
      <ProfileSection />
      <PasswordSection />
      <TagsSection />
    </main>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/** Applies the backend's field errors to a form; returns false if there were none for these fields. */
function applyFieldErrors<T extends string>(
  error: unknown,
  fields: readonly T[],
  setError: (field: T, message: string) => void,
) {
  if (!(error instanceof ApiError)) return false
  const known = Object.entries(error.fields).filter(([field]) =>
    (fields as readonly string[]).includes(field),
  )
  for (const [field, message] of known) setError(field as T, message)
  return known.length > 0
}

function ShareLinkSection() {
  const link = useCatalogLink()
  const regenerate = useRegenerateLink()
  const [confirming, setConfirming] = useState(false)

  return (
    <Section title={t('settings.linkTitle')} description={t('settings.linkDescription')}>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          {link.data ? (
            <Input
              readOnly
              value={link.data.url}
              aria-label={t('settings.linkLabel')}
              className="font-mono text-sm"
              onFocus={(event) => event.target.select()}
            />
          ) : (
            <Skeleton className="h-8 flex-1" />
          )}
          <Button
            variant="outline"
            disabled={!link.data}
            onClick={() => link.data && copyWithToast(link.data.url, t('admin.linkCopied'))}
          >
            <Copy />
            {t('settings.copy')}
          </Button>
        </div>
        <div>
          <Button
            variant="outline"
            disabled={regenerate.isPending}
            onClick={() => setConfirming(true)}
          >
            <RefreshCw />
            {t('settings.regenerate')}
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('settings.regenerateTitle')}
        message={t('settings.regenerateMessage')}
        confirmLabel={t('settings.regenerate')}
        cancelLabel={t('settings.cancel')}
        onConfirm={() =>
          regenerate.mutate(undefined, {
            onSuccess: () => toast.success(t('settings.regenerated')),
            onError: () => toast.error(t('errors.generic')),
          })
        }
        destructive
      />
    </Section>
  )
}

const profileSchema = z.object({
  displayName: z.string().trim().min(1, t('form.required')).max(100, t('form.tooLong')),
})

function ProfileSection() {
  const me = useMe()
  if (!me.data) return null
  return <ProfileForm displayName={me.data.displayName} />
}

function ProfileForm({ displayName }: { displayName: string }) {
  const update = useUpdateProfile()
  const form = useForm({ resolver: zodResolver(profileSchema), defaultValues: { displayName } })
  const error = form.formState.errors.displayName?.message

  const onSubmit = form.handleSubmit(({ displayName }) =>
    update.mutate(displayName, {
      onSuccess: (me) => {
        form.reset({ displayName: me.displayName })
        toast.success(t('settings.profileSaved'))
      },
      onError: (e) => {
        if (
          !applyFieldErrors(e, ['displayName'] as const, (f, m) => form.setError(f, { message: m }))
        )
          toast.error(t('errors.generic'))
      },
    }),
  )

  return (
    <Section title={t('settings.profileTitle')}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="displayName">{t('settings.displayName')}</Label>
          <Input
            id="displayName"
            aria-invalid={!!error}
            aria-describedby="displayName-help"
            {...form.register('displayName')}
          />
          <p
            id="displayName-help"
            className={error ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}
          >
            {error ?? t('settings.displayNameHint')}
          </p>
        </div>
        <div>
          <Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
            {t('settings.save')}
          </Button>
        </div>
      </form>
    </Section>
  )
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, t('form.required')),
    newPassword: z
      .string()
      .min(12, t('settings.passwordTooShort'))
      .max(72, t('settings.passwordTooLong')),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: t('settings.passwordMismatch'),
  })

type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword'

function PasswordSection() {
  const change = useChangePassword()
  const form = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit(({ currentPassword, newPassword }) =>
    change.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          form.reset()
          toast.success(t('settings.passwordChanged'))
        },
        onError: (e) => {
          if (
            !applyFieldErrors(e, ['currentPassword', 'newPassword'] as const, (f, m) =>
              form.setError(f, { message: m }),
            )
          )
            toast.error(t('errors.generic'))
        },
      },
    ),
  )

  const field = (name: PasswordField, label: string, autoComplete: string, hint?: string) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        type="password"
        autoComplete={autoComplete}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] || hint ? `${name}-help` : undefined}
        {...form.register(name)}
      />
      {(errors[name] || hint) && (
        <p
          id={`${name}-help`}
          className={errors[name] ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}
        >
          {errors[name]?.message ?? hint}
        </p>
      )}
    </div>
  )

  return (
    <Section title={t('settings.passwordTitle')}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
        {/* Lets password managers know which account this is. */}
        <input type="text" autoComplete="username" hidden readOnly />
        {field('currentPassword', t('settings.currentPassword'), 'current-password')}
        {field(
          'newPassword',
          t('settings.newPassword'),
          'new-password',
          t('settings.passwordHint'),
        )}
        {field('confirmPassword', t('settings.confirmPassword'), 'new-password')}
        <div>
          <Button type="submit" disabled={change.isPending}>
            {t('settings.changePassword')}
          </Button>
        </div>
      </form>
    </Section>
  )
}

function TagsSection() {
  const tags = useTags()
  const [toDelete, setToDelete] = useState<TagUsage | null>(null)
  const deleteTag = useDeleteTag()

  return (
    <Section title={t('settings.tagsTitle')}>
      {tags.isPending ? (
        <Skeleton className="h-20 w-full" />
      ) : !tags.data?.length ? (
        <p className="text-sm text-muted-foreground">{t('settings.tagsEmpty')}</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {tags.data.map((tag) => (
            <TagRow key={tag.id} tag={tag} onDelete={() => setToDelete(tag)} />
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={t('settings.deleteTagTitle')}
        message={t('settings.deleteTagMessage')}
        confirmLabel={t('settings.deleteTag')}
        cancelLabel={t('settings.cancel')}
        onConfirm={() => {
          if (toDelete)
            deleteTag.mutate(toDelete.id, {
              onSuccess: () => toast.success(t('settings.tagDeleted')),
              onError: () => toast.error(t('errors.generic')),
            })
          setToDelete(null)
        }}
        destructive
      />
    </Section>
  )
}

function TagRow({ tag, onDelete }: { tag: TagUsage; onDelete: () => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(tag.name)
  const [error, setError] = useState<string>()
  const rename = useRenameTag()
  const usage = `${t('settings.used')} ${tag.certificateCount} ${
    tag.certificateCount === 1 ? t('settings.certificateWord') : t('settings.certificatesWord')
  }`

  const save = () => {
    const trimmed = name.trim()
    if (!trimmed) return setError(t('form.required'))
    if (trimmed.length > 50) return setError(t('form.tooLong'))
    rename.mutate(
      { id: tag.id, name: trimmed },
      {
        onSuccess: () => {
          setEditing(false)
          setError(undefined)
          toast.success(t('settings.tagRenamed'))
        },
        onError: (e) =>
          setError(e instanceof ApiError && e.fields.name ? e.fields.name : t('errors.generic')),
      },
    )
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-1 py-2">
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
        >
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label={`${t('settings.renameLabel')} ${tag.name}`}
            aria-invalid={!!error}
            onKeyDown={(event) => event.key === 'Escape' && setEditing(false)}
          />
          <Button
            type="submit"
            size="icon"
            aria-label={t('settings.saveName')}
            disabled={rename.isPending}
          >
            <Check />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('settings.cancel')}
            onClick={() => {
              setEditing(false)
              setName(tag.name)
              setError(undefined)
            }}
          >
            <X />
          </Button>
        </form>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </li>
    )
  }

  return (
    <li className="flex items-center gap-2 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{tag.name}</p>
        <p className="text-xs text-muted-foreground">{usage}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`${t('settings.rename')} ${tag.name}`}
        onClick={() => setEditing(true)}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`${t('settings.deleteTag')} ${tag.name}`}
        onClick={onDelete}
      >
        <Trash2 />
      </Button>
    </li>
  )
}
