import { Award } from 'lucide-react'
import { Link } from 'react-router'
import { publicThumbnailUrl } from '@/api/catalog'
import type { PublicCertificate } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { formatMonthYear } from '@/lib/dates'

/** One card in the public grid. The whole card is a link to the detail. */
export function CertificateCard({
  token,
  certificate,
}: {
  token: string
  certificate: PublicCertificate
}) {
  const { id, title, issuer, issueDate, tags, files } = certificate
  const main = files[0]

  return (
    <Link
      to={id}
      preventScrollReset
      className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {/* Whole certificate visible (most are landscape), never cropped. */}
      <div className="aspect-[4/3] overflow-hidden border-b bg-white">
        {main?.hasThumbnail ? (
          <img
            src={publicThumbnailUrl(token, main.id)}
            alt={title}
            loading="lazy"
            className="size-full object-contain p-3 transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
            <Award className="size-10" aria-hidden />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h2 className="leading-snug font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">
          {issuer} · {formatMonthYear(issueDate)}
        </p>
        {tags.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1 pt-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
