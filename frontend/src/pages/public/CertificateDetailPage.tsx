import { Check, Copy, Download, ExternalLink } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { publicFileUrl, usePublicCatalog } from '@/api/catalog'
import type { PublicCertificate, PublicFile } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { t } from '@/i18n'
import { formatMonthYear } from '@/lib/dates'
import { formatSize } from '@/lib/files'

// pdf.js is big; only visitors who open a PDF download it.
const PdfViewer = lazy(() =>
  import('@/components/catalog/PdfViewer').then((m) => ({ default: m.PdfViewer })),
)

/**
 * /c/:shareToken/:certificateId — a dialog over the catalog. Works as a direct link too: the catalog loads
 * behind it. Closing goes back to the grid without reloading it.
 */
export function CertificateDetailPage() {
  const { shareToken = '', certificateId } = useParams()
  const navigate = useNavigate()
  const catalog = usePublicCatalog(shareToken)
  const certificate = catalog.data?.certificates.find((c) => c.id === certificateId)

  const close = () => navigate(`/c/${shareToken}`, { preventScrollReset: true })

  if (catalog.isPending || catalog.isError) return null

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      {/* scrollbar-gutter keeps the width steady when the PDF makes the dialog scroll (else it re-sizes in a loop). */}
      <DialogContent className="max-h-[92svh] overflow-y-auto [scrollbar-gutter:stable] sm:max-w-3xl">
        {certificate ? (
          <Detail token={shareToken} certificate={certificate} />
        ) : (
          <DialogHeader>
            <DialogTitle>{t('notFound.title')}</DialogTitle>
            <DialogDescription>{t('notFound.message')}</DialogDescription>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Detail({ token, certificate }: { token: string; certificate: PublicCertificate }) {
  const { title, issuer, issueDate, credentialId, verificationUrl, tags, files } = certificate
  const [main, ...others] = files

  return (
    <div className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle className="pr-6 text-xl">{title}</DialogTitle>
        <DialogDescription>
          {issuer} · {t('catalog.issued')} {formatMonthYear(issueDate)}
        </DialogDescription>
      </DialogHeader>

      {main && <Preview token={token} file={main} title={title} />}

      {credentialId && (
        <dl className="text-sm">
          <dt className="text-muted-foreground">{t('catalog.credentialId')}</dt>
          <dd className="flex items-center gap-1">
            <span className="font-mono break-all">{credentialId}</span>
            <CopyButton value={credentialId} />
          </dd>
        </dl>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {verificationUrl && (
          <Button asChild>
            <a href={verificationUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink />
              {t('catalog.verify')}
            </a>
          </Button>
        )}
        {main && (
          <Button variant="outline" asChild>
            <a href={publicFileUrl(token, main.id, true)}>
              <Download />
              {t('catalog.download')}
            </a>
          </Button>
        )}
      </div>

      {others.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{t('catalog.otherFiles')}</h3>
          <ul className="flex flex-col gap-1">
            {others.map((file) => (
              <li key={file.id}>
                <a
                  href={publicFileUrl(token, file.id, true)}
                  className="inline-flex items-center gap-2 text-sm hover:underline"
                >
                  <Download className="size-4" aria-hidden />
                  {file.originalName}
                  <span className="text-muted-foreground">({formatSize(file.sizeBytes)})</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Preview({ token, file, title }: { token: string; file: PublicFile; title: string }) {
  if (file.contentType === 'application/pdf') {
    return (
      <Suspense fallback={<Skeleton className="aspect-[1/1.41] w-full" />}>
        <PdfViewer url={publicFileUrl(token, file.id)} title={title} />
      </Suspense>
    )
  }
  return (
    <img
      src={publicFileUrl(token, file.id)}
      alt={title}
      className="max-h-[60svh] w-full rounded-md border bg-white object-contain"
    />
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={
        copied ? t('catalog.copied') : `${t('catalog.copy')} ${t('catalog.credentialId')}`
      }
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  )
}
