// Upload rules, same as the backend (specs/BACKEND.md §4). Checked here first so nothing too big or of the
// wrong type is sent. The backend still checks the real content.

export const MAX_FILE_SIZE = 10 * 1024 * 1024
export const MAX_FILES_PER_CERTIFICATE = 10

const ACCEPTED: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
}

/** For the file input's `accept` attribute. */
export const ACCEPT_ATTRIBUTE = Object.entries(ACCEPTED)
  .flatMap(([type, extensions]) => [type, ...extensions])
  .join(',')

export type FileProblem = 'type' | 'size'

/** Why a file can't be uploaded, or null if it's fine. */
export function checkFile(file: File): FileProblem | null {
  const name = file.name.toLowerCase()
  const typeOk =
    file.type in ACCEPTED ||
    Object.values(ACCEPTED).some((exts) => exts.some((ext) => name.endsWith(ext)))
  if (!typeOk) return 'type'
  if (file.size > MAX_FILE_SIZE) return 'size'
  return null
}

/** 1536 → "1.5 KB" */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
