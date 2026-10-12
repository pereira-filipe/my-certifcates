import { useQueryClient } from '@tanstack/react-query'
import { Download, ExternalLink, FileText, Star, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { certificateKeys } from '@/api/certificates'
import { fileUrl, thumbnailUrl, useDeleteFile, useSetPrimaryFile } from '@/api/files'
import type { CertificateFile } from '@/api/types'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FileDropzone } from '@/components/FileDropzone'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { t } from '@/i18n'
import { formatSize, MAX_FILES_PER_CERTIFICATE } from '@/lib/files'
import { uploadAll, type UploadState } from '@/lib/uploads'

export function UploadProgressList({
  uploads,
  onDismiss,
}: {
  uploads: UploadState[]
  onDismiss?: (key: string) => void
}) {
  if (uploads.length === 0) return null
  return (
    <ul className="flex flex-col gap-2">
      {uploads.map((upload) => (
        <li key={upload.key} className="flex flex-col gap-1 rounded-md border p-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{upload.name}</span>
            {upload.error && onDismiss && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={t('files.remove')}
                onClick={() => onDismiss(upload.key)}
              >
                <X />
              </Button>
            )}
          </div>
          {upload.error ? (
            <p className="text-destructive" role="alert">
              {upload.error}
            </p>
          ) : (
            <div
              role="progressbar"
              aria-label={`${t('files.uploading')} ${upload.name}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(upload.progress * 100)}
              className="h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full bg-primary transition-[width]"
                style={{ width: `${Math.round(upload.progress * 100)}%` }}
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

export function FileThumbnail({ file, className }: { file?: CertificateFile; className?: string }) {
  if (file?.hasThumbnail) {
    return (
      <img
        src={thumbnailUrl(file.id)}
        alt=""
        loading="lazy"
        className={`shrink-0 rounded-md border bg-white object-cover object-top ${className}`}
      />
    )
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground ${className}`}
    >
      <FileText className="size-6" aria-hidden />
    </div>
  )
}

/** Files of a saved certificate: uploads right away, main file, open, download, delete. */
export function CertificateFilesSection({
  certificateId,
  files,
}: {
  certificateId: string
  files: CertificateFile[]
}) {
  const queryClient = useQueryClient()
  const [uploads, setUploads] = useState<UploadState[]>([])
  const [toDelete, setToDelete] = useState<CertificateFile | null>(null)
  const setPrimary = useSetPrimaryFile()
  const deleteFile = useDeleteFile()
  const busy = uploads.some((u) => !u.error)

  const onFiles = async (chosen: File[]) => {
    await uploadAll(certificateId, chosen, setUploads)
    await queryClient.invalidateQueries({ queryKey: certificateKeys.all })
  }

  return (
    <div className="flex flex-col gap-3">
      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex flex-wrap items-center gap-3 rounded-md border p-2 sm:flex-nowrap"
            >
              <FileThumbnail file={file} className="size-12" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.originalName}</p>
                <p className="text-xs text-muted-foreground">{formatSize(file.sizeBytes)}</p>
              </div>
              <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
                {file.isPrimary ? (
                  <Badge>{t('files.main')}</Badge>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={setPrimary.isPending}
                    onClick={() =>
                      setPrimary.mutate(file.id, {
                        onError: () => toast.error(t('errors.generic')),
                      })
                    }
                  >
                    <Star />
                    {t('files.makeMain')}
                  </Button>
                )}
                <Button variant="ghost" size="icon" asChild>
                  <a
                    href={fileUrl(file.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${t('files.open')} ${file.originalName}`}
                  >
                    <ExternalLink />
                  </a>
                </Button>
                <Button variant="ghost" size="icon" asChild>
                  <a
                    href={fileUrl(file.id, true)}
                    aria-label={`${t('files.download')} ${file.originalName}`}
                  >
                    <Download />
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`${t('files.delete')} ${file.originalName}`}
                  onClick={() => setToDelete(file)}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <UploadProgressList
        uploads={uploads}
        onDismiss={(key) => setUploads((current) => current.filter((u) => u.key !== key))}
      />
      <FileDropzone
        onFiles={onFiles}
        remaining={
          MAX_FILES_PER_CERTIFICATE - files.length - uploads.filter((u) => !u.error).length
        }
        disabled={busy}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={t('files.deleteTitle')}
        message={t('files.deleteMessage')}
        confirmLabel={t('files.delete')}
        cancelLabel={t('files.cancel')}
        onConfirm={() => {
          if (toDelete)
            deleteFile.mutate(toDelete.id, { onError: () => toast.error(t('errors.generic')) })
          setToDelete(null)
        }}
        destructive
      />
    </div>
  )
}

/** Files chosen before the certificate exists; uploaded right after it's created (specs/FRONTEND.md §3). */
export function QueuedFilesSection({
  files,
  onChange,
  uploads,
  disabled,
}: {
  files: File[]
  onChange: (files: File[]) => void
  uploads: UploadState[]
  disabled: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      {files.length > 0 && uploads.length === 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="flex items-center gap-3 rounded-md border p-2">
              <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(file.size)} · {t('files.queued')}
                </p>
              </div>
              {i === 0 && <Badge>{t('files.main')}</Badge>}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`${t('files.remove')} ${file.name}`}
                disabled={disabled}
                onClick={() => onChange(files.filter((_, index) => index !== i))}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <UploadProgressList uploads={uploads} />
      <FileDropzone
        onFiles={(chosen) => onChange([...files, ...chosen])}
        remaining={MAX_FILES_PER_CERTIFICATE - files.length}
        disabled={disabled}
      />
    </div>
  )
}
