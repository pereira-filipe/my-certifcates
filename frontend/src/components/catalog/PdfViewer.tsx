import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { t } from '@/i18n'

// pdf.js does the heavy work in a web worker, bundled by Vite from pdfjs-dist.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

/** Shows a PDF inside the page, one page at a time, as wide as its container. Loaded only when needed. */
export function PdfViewer({ url, title }: { url: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number>()
  const [pages, setPages] = useState(0)
  const [page, setPage] = useState(1)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    // Ignore 1–2 px changes so a scrollbar appearing can't start a resize loop.
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.floor(entry.contentRect.width)
      setWidth((current) =>
        current !== undefined && Math.abs(current - next) < 3 ? current : next,
      )
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  if (failed) return <p className="text-sm text-muted-foreground">{t('catalog.pdfError')}</p>

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-md border bg-white">
        <Document
          file={url}
          loading={<Skeleton className="aspect-[1/1.41] w-full" />}
          onLoadSuccess={({ numPages }) => setPages(numPages)}
          onLoadError={() => setFailed(true)}
        >
          {width && (
            <Page
              pageNumber={page}
              width={width}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              loading={<Skeleton className="aspect-[1/1.41] w-full" />}
              aria-label={`${title}, ${t('catalog.page')} ${page}`}
            />
          )}
        </Document>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={t('catalog.previousPage')}
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft />
          </Button>
          <span aria-live="polite">
            {t('catalog.page')} {page} {t('catalog.of')} {pages}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={t('catalog.nextPage')}
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  )
}
