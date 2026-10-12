import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useBlocker, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { useCertificate, useCreateCertificate, useUpdateCertificate } from '@/api/certificates'
import { ApiError } from '@/api/client'
import { useTags } from '@/api/tags'
import type { Certificate, CertificateFile, CertificateInput } from '@/api/types'
import { CertificateFilesSection, QueuedFilesSection } from '@/components/CertificateFiles'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { TagPicker } from '@/components/TagPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { t } from '@/i18n'
import { uploadAll, type UploadState } from '@/lib/uploads'

// Same limits as the backend (specs/BACKEND.md §2), checked here first for instant feedback.
const schema = z
  .object({
    title: z.string().trim().min(1, t('form.required')).max(200, t('form.tooLong')),
    issuer: z.string().trim().min(1, t('form.required')).max(200, t('form.tooLong')),
    issueDate: z.string().min(1, t('form.required')),
    expirationDate: z.string(),
    credentialId: z.string().trim().max(200, t('form.tooLong')),
    verificationUrl: z
      .string()
      .trim()
      .max(500, t('form.tooLong'))
      .refine((url) => url === '' || /^https?:\/\/\S+$/i.test(url), t('form.invalidUrl')),
    notes: z.string().max(10_000, t('form.tooLong')),
    isPublic: z.boolean(),
    tags: z.array(z.string()).max(20, t('form.tooManyTags')),
  })
  .refine((v) => !v.expirationDate || !v.issueDate || v.expirationDate >= v.issueDate, {
    path: ['expirationDate'],
    message: t('form.expirationBeforeIssue'),
  })

type FormValues = z.input<typeof schema>
type FieldName = keyof FormValues

const EMPTY: FormValues = {
  title: '',
  issuer: '',
  issueDate: '',
  expirationDate: '',
  credentialId: '',
  verificationUrl: '',
  notes: '',
  isPublic: false,
  tags: [],
}

function toFormValues(c: Certificate): FormValues {
  return {
    title: c.title,
    issuer: c.issuer,
    issueDate: c.issueDate,
    expirationDate: c.expirationDate ?? '',
    credentialId: c.credentialId ?? '',
    verificationUrl: c.verificationUrl ?? '',
    notes: c.notes ?? '',
    isPublic: c.isPublic,
    tags: c.tags,
  }
}

function toInput(values: z.output<typeof schema>): CertificateInput {
  const orNull = (value: string) => (value.trim() === '' ? null : value.trim())
  return {
    title: values.title,
    issuer: values.issuer,
    issueDate: values.issueDate,
    expirationDate: orNull(values.expirationDate),
    credentialId: orNull(values.credentialId),
    verificationUrl: orNull(values.verificationUrl),
    notes: orNull(values.notes),
    isPublic: values.isPublic,
    tags: values.tags,
  }
}

/** /admin/certificates/new and /admin/certificates/:id */
export function CertificateFormPage() {
  const { id } = useParams()
  const certificate = useCertificate(id)

  if (!id) return <CertificateForm key="new" initialValues={EMPTY} />

  if (certificate.isPending) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </main>
    )
  }

  if (certificate.isError) {
    const notFound = certificate.error instanceof ApiError && certificate.error.status === 404
    return (
      <main className="mx-auto flex max-w-2xl flex-col items-start gap-4 px-4 py-6">
        <p>{notFound ? t('form.notFound') : t('errors.generic')}</p>
        <Button variant="outline" asChild>
          <Link to="/admin">{t('form.backToList')}</Link>
        </Button>
      </main>
    )
  }

  // Keyed by id so the form starts fresh when switching certificates.
  return (
    <CertificateForm
      key={id}
      id={id}
      initialValues={toFormValues(certificate.data)}
      files={certificate.data.files}
    />
  )
}

function CertificateForm({
  id,
  initialValues,
  files = [],
}: {
  id?: string
  initialValues: FormValues
  files?: CertificateFile[]
}) {
  const navigate = useNavigate()
  const tags = useTags()
  const create = useCreateCertificate()
  const update = useUpdateCertificate(id ?? '')
  // Where to go once saved (and, for a new certificate, once its files are uploaded).
  const [leaveTo, setLeaveTo] = useState<string | null>(null)
  // A new certificate's files wait here until it has an id.
  const [queued, setQueued] = useState<File[]>([])
  const [uploads, setUploads] = useState<UploadState[]>([])
  const uploading = uploads.some((u) => !u.error)
  const saving = create.isPending || update.isPending || uploading

  const form = useForm<FormValues, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  })
  const { errors } = form.formState
  const hasChanges = form.formState.isDirty || queued.length > 0

  // Ask before leaving with unsaved changes: in-app navigation…
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasChanges && !leaveTo && currentLocation.pathname !== nextLocation.pathname,
  )
  // …and closing or reloading the tab.
  useEffect(() => {
    if (!hasChanges || leaveTo) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [hasChanges, leaveTo])

  // Leave after a successful save, once the blocker above knows the changes are saved.
  useEffect(() => {
    if (leaveTo) navigate(leaveTo)
  }, [leaveTo, navigate])

  const onSubmit = form.handleSubmit((values) => {
    const mutation = id ? update : create
    mutation.mutate(toInput(values), {
      onSuccess: async (saved) => {
        if (!id && queued.length > 0) {
          const failed = await uploadAll(saved.id, queued, setUploads, true)
          setQueued([])
          if (failed > 0) {
            // Keep what worked; the edit page shows the certificate so the rest can be added again.
            toast.error(t('files.savedButUploadFailed'))
            setLeaveTo(`/admin/certificates/${saved.id}`)
            return
          }
        }
        toast.success(t('form.saved'))
        setLeaveTo('/admin')
      },
      onError: (error) => {
        // Show the backend's field errors under the matching fields.
        const fieldErrors = error instanceof ApiError ? Object.entries(error.fields) : []
        const known = fieldErrors.filter(([field]) => field in EMPTY)
        for (const [field, message] of known) form.setError(field as FieldName, { message })
        if (known.length === 0) toast.error(t('errors.generic'))
      },
    })
  })

  const field = (name: FieldName) => ({
    id: name,
    'aria-invalid': !!errors[name],
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
  })

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-semibold">{id ? t('form.editTitle') : t('form.addTitle')}</h1>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <Field name="title" label={t('form.title')} required error={errors.title?.message}>
          <Input {...field('title')} {...form.register('title')} />
        </Field>

        <Field name="issuer" label={t('form.issuer')} required error={errors.issuer?.message}>
          <Input {...field('issuer')} {...form.register('issuer')} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name="issueDate"
            label={t('form.issueDate')}
            required
            error={errors.issueDate?.message}
          >
            <Input type="date" {...field('issueDate')} {...form.register('issueDate')} />
          </Field>
          <Field
            name="expirationDate"
            label={t('form.expirationDate')}
            hint={t('form.expirationHint')}
            error={errors.expirationDate?.message}
          >
            <Input type="date" {...field('expirationDate')} {...form.register('expirationDate')} />
          </Field>
        </div>

        <Field
          name="credentialId"
          label={t('form.credentialId')}
          error={errors.credentialId?.message}
        >
          <Input {...field('credentialId')} {...form.register('credentialId')} />
        </Field>

        <Field
          name="verificationUrl"
          label={t('form.verificationUrl')}
          hint={t('form.verificationUrlHint')}
          error={errors.verificationUrl?.message}
        >
          <Input
            type="url"
            inputMode="url"
            placeholder="https://"
            {...field('verificationUrl')}
            {...form.register('verificationUrl')}
          />
        </Field>

        <Field name="tags" label={t('form.tags')} error={errors.tags?.message} group>
          <Controller
            control={form.control}
            name="tags"
            render={({ field: { value, onChange } }) => (
              <TagPicker
                labelledBy="tags-label"
                value={value}
                onChange={onChange}
                suggestions={tags.data?.map((tag) => tag.name) ?? []}
              />
            )}
          />
        </Field>

        <Field name="files" label={t('files.title')} hint={t('files.hint')} group>
          {id ? (
            <CertificateFilesSection certificateId={id} files={files} />
          ) : (
            <QueuedFilesSection
              files={queued}
              onChange={setQueued}
              uploads={uploads}
              disabled={saving}
            />
          )}
        </Field>

        <Field
          name="notes"
          label={t('form.notes')}
          hint={t('form.notesHint')}
          error={errors.notes?.message}
        >
          <Textarea rows={4} {...field('notes')} {...form.register('notes')} />
        </Field>

        <div className="flex items-start gap-3 rounded-lg border p-4">
          <Controller
            control={form.control}
            name="isPublic"
            render={({ field: { value, onChange } }) => (
              <Switch
                id="isPublic"
                checked={value}
                onCheckedChange={onChange}
                aria-describedby="isPublic-hint"
              />
            )}
          />
          <div className="flex flex-col gap-1">
            <Label htmlFor="isPublic">{t('form.isPublic')}</Label>
            <p id="isPublic-hint" className="text-sm text-muted-foreground">
              {t('form.isPublicHint')}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? t('form.saving') : t('form.save')}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/admin')}>
            {t('form.cancel')}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => !open && blocker.reset?.()}
        title={t('form.unsavedTitle')}
        message={t('form.unsavedMessage')}
        confirmLabel={t('form.discard')}
        cancelLabel={t('form.keepEditing')}
        onConfirm={() => blocker.proceed?.()}
        destructive
      />
    </main>
  )
}

type FieldProps = {
  name: FieldName | 'files'
  label: string
  required?: boolean
  hint?: string
  error?: string
  /** For controls that aren't a single input (e.g. the tag picker): the label names the group instead. */
  group?: boolean
  children: ReactNode
}

/** Label, input, hint and error message for one form field. */
function Field({ name, label, required, hint, error, group, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label id={`${name}-label`} htmlFor={group ? undefined : name}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
      </Label>
      {children}
      {hint && !error && <p className="text-sm text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${name}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
