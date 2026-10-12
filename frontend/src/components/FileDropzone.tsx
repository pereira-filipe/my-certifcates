import { Upload } from 'lucide-react'
import { useId, useRef, useState, type DragEvent } from 'react'
import { t } from '@/i18n'
import { ACCEPT_ATTRIBUTE, checkFile } from '@/lib/files'
import { cn } from '@/lib/utils'

type FileDropzoneProps = {
  /** Called with the files that passed the type and size checks. */
  onFiles: (files: File[]) => void
  /** How many more files are allowed. */
  remaining: number
  disabled?: boolean
}

/** Drag-and-drop or click to choose. Wrong types and big files are refused here, before any upload. */
export function FileDropzone({ onFiles, remaining, disabled = false }: FileDropzoneProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [problems, setProblems] = useState<string[]>([])

  const take = (list: FileList | null) => {
    if (!list || disabled) return
    const accepted: File[] = []
    const rejected: string[] = []
    for (const file of Array.from(list)) {
      const problem = checkFile(file)
      if (problem === 'type') rejected.push(`${file.name} ${t('files.wrongType')}`)
      else if (problem === 'size') rejected.push(`${file.name} ${t('files.tooBig')}`)
      else accepted.push(file)
    }
    if (accepted.length > remaining) rejected.push(t('files.tooMany'))
    setProblems(rejected)
    if (accepted.length > 0) onFiles(accepted.slice(0, remaining))
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    take(event.dataTransfer.files)
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors',
          'has-focus-visible:ring-2 has-focus-visible:ring-ring',
          dragging ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
          (disabled || remaining <= 0) && 'pointer-events-none opacity-50',
        )}
      >
        <Upload className="size-5 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium">{t('files.drop')}</span>
        <span className="text-xs text-muted-foreground">{t('files.limits')}</span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          disabled={disabled || remaining <= 0}
          onChange={(event) => {
            take(event.target.files)
            event.target.value = '' // allow choosing the same file again
          }}
        />
      </label>
      {problems.length > 0 && (
        <ul className="text-sm text-destructive" role="alert">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
