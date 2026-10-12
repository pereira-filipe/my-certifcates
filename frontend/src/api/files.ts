import { useMutation, useQueryClient } from '@tanstack/react-query'
import { certificateKeys } from './certificates'
import { api, ApiError, ensureCsrfCookie, isApiErrorBody, redirectToLoginIfAdmin } from './client'
import type { CertificateFile } from './types'

export const fileUrl = (id: string, download = false) =>
  `/api/admin/files/${id}${download ? '?download=true' : ''}`
export const thumbnailUrl = (id: string) => `/api/admin/files/${id}/thumbnail`

type UploadOptions = {
  primary?: boolean
  /** 0 to 1 */
  onProgress?: (fraction: number) => void
}

/**
 * Uploads one file. Uses XMLHttpRequest rather than fetch because fetch can't report upload progress
 * (specs/FRONTEND.md §3).
 */
export async function uploadFile(
  certificateId: string,
  file: File,
  { primary = false, onProgress }: UploadOptions = {},
): Promise<CertificateFile> {
  const token = await ensureCsrfCookie()
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api/admin/certificates/${certificateId}/files?primary=${primary}`)
    xhr.withCredentials = true
    xhr.setRequestHeader('Accept', 'application/json')
    if (token) xhr.setRequestHeader('X-XSRF-TOKEN', token)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total)
    }
    xhr.onload = () => {
      let body: unknown
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        body = undefined
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as CertificateFile)
        return
      }
      if (xhr.status === 401) redirectToLoginIfAdmin()
      reject(
        new ApiError(
          isApiErrorBody(body)
            ? body
            : { status: xhr.status, error: 'HTTP_ERROR', message: xhr.statusText },
        ),
      )
    }
    xhr.onerror = () =>
      reject(new ApiError({ status: 0, error: 'NETWORK_ERROR', message: 'Network error' }))
    const form = new FormData()
    form.append('file', file)
    xhr.send(form)
  })
}

function useRefreshCertificates() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: certificateKeys.all })
}

export function useSetPrimaryFile() {
  const refresh = useRefreshCertificates()
  return useMutation({
    mutationFn: (fileId: string) =>
      api.patch<CertificateFile>(`/api/admin/files/${fileId}/primary`),
    onSettled: refresh,
  })
}

export function useDeleteFile() {
  const refresh = useRefreshCertificates()
  return useMutation({
    mutationFn: (fileId: string) => api.delete<void>(`/api/admin/files/${fileId}`),
    onSettled: refresh,
  })
}
