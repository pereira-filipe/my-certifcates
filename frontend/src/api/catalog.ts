import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { CatalogLink, PublicCatalog } from './types'

// --- Public: what visitors load through the share link ---

const publicBase = (token: string) => `/api/public/catalogs/${encodeURIComponent(token)}`

export const publicFileUrl = (token: string, fileId: string, download = false) =>
  `${publicBase(token)}/files/${fileId}${download ? '?download=true' : ''}`
export const publicThumbnailUrl = (token: string, fileId: string) =>
  `${publicBase(token)}/files/${fileId}/thumbnail`

/** The whole catalog in one request; the detail view reads from it too, so opening a card is instant. */
export function usePublicCatalog(token: string) {
  return useQuery({
    queryKey: ['public-catalog', token],
    queryFn: () => api.get<PublicCatalog>(publicBase(token), { redirectOn401: false }),
    retry: false,
  })
}

// --- Admin: the owner's share link ---

const linkKey = ['catalog-link'] as const

export function useCatalogLink() {
  return useQuery({
    queryKey: linkKey,
    queryFn: () => api.get<CatalogLink>('/api/admin/catalog'),
    staleTime: Infinity,
  })
}

export function useRegenerateLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<CatalogLink>('/api/admin/catalog/regenerate-link'),
    onSuccess: (link) => queryClient.setQueryData(linkKey, link),
  })
}

/** The link's path, so it opens on this same site (dev server or production). */
export const catalogPath = (link: CatalogLink) => `/c/${link.shareToken}`
