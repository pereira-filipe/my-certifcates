import { ApiError } from '@/api/client'
import { uploadFile } from '@/api/files'
import { t } from '@/i18n'

export type UploadState = {
  key: string
  name: string
  progress: number
  error?: string
}

/**
 * Uploads files one after another, reporting progress. The first file becomes the main one when
 * `firstIsPrimary` is set. Resolves with how many failed.
 */
export async function uploadAll(
  certificateId: string,
  files: File[],
  setUploads: (update: (current: UploadState[]) => UploadState[]) => void,
  firstIsPrimary = false,
): Promise<number> {
  const batch = files.map((file, i) => ({
    key: `${Date.now()}-${i}-${file.name}`,
    name: file.name,
    progress: 0,
  }))
  setUploads((current) => [...current, ...batch])
  const patch = (key: string, change: Partial<UploadState>) =>
    setUploads((current) => current.map((u) => (u.key === key ? { ...u, ...change } : u)))

  let failed = 0
  for (const [i, file] of files.entries()) {
    const { key } = batch[i]
    try {
      await uploadFile(certificateId, file, {
        primary: firstIsPrimary && i === 0,
        onProgress: (progress) => patch(key, { progress }),
      })
      setUploads((current) => current.filter((u) => u.key !== key))
    } catch (error) {
      failed++
      const reason =
        error instanceof ApiError && error.status !== 0 ? error.message : t('errors.network')
      patch(key, { error: `${t('files.uploadFailed')}: ${reason}` })
    }
  }
  return failed
}
