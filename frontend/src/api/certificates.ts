import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api } from './client'
import { tagKeys } from './tags'
import type { Certificate, CertificateFilters, CertificateInput } from './types'

const BASE = '/api/admin/certificates'

export const certificateKeys = {
  all: ['certificates'] as const,
  lists: () => [...certificateKeys.all, 'list'] as const,
  list: (filters: CertificateFilters) => [...certificateKeys.lists(), filters] as const,
  detail: (id: string) => [...certificateKeys.all, 'detail', id] as const,
}

function listUrl({ q, tag, isPublic }: CertificateFilters) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (tag) params.set('tag', tag)
  if (isPublic !== undefined) params.set('public', String(isPublic))
  const query = params.toString()
  return query ? `${BASE}?${query}` : BASE
}

export function useCertificates(filters: CertificateFilters) {
  return useQuery({
    queryKey: certificateKeys.list(filters),
    queryFn: () => api.get<Certificate[]>(listUrl(filters)),
  })
}

export function useCertificate(id: string | undefined) {
  return useQuery({
    queryKey: certificateKeys.detail(id ?? ''),
    queryFn: () => api.get<Certificate>(`${BASE}/${id}`),
    enabled: !!id,
  })
}

function invalidateAfterChange(queryClient: QueryClient) {
  // Tags can be created by saving a certificate, and counts change on delete.
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: certificateKeys.all }),
    queryClient.invalidateQueries({ queryKey: tagKeys.all }),
  ])
}

export function useCreateCertificate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CertificateInput) => api.post<Certificate>(BASE, input),
    onSuccess: () => invalidateAfterChange(queryClient),
  })
}

export function useUpdateCertificate(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CertificateInput) => api.put<Certificate>(`${BASE}/${id}`, input),
    onSuccess: (saved) => {
      queryClient.setQueryData(certificateKeys.detail(id), saved)
      return invalidateAfterChange(queryClient)
    },
  })
}

export function useDeleteCertificate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`${BASE}/${id}`),
    onSuccess: () => invalidateAfterChange(queryClient),
  })
}

/** Snapshot every cached list so an optimistic change can be undone. */
function snapshotLists(queryClient: QueryClient) {
  return queryClient.getQueriesData<Certificate[]>({ queryKey: certificateKeys.lists() })
}

function restoreLists(queryClient: QueryClient, snapshot: ReturnType<typeof snapshotLists>) {
  for (const [key, data] of snapshot) queryClient.setQueryData(key, data)
}

/** Public/Hidden switch: updates the list right away, rolls back if the server refuses. */
export function useSetVisibility() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) =>
      api.patch<Certificate>(`${BASE}/${id}/visibility`, { isPublic }),
    onMutate: async ({ id, isPublic }) => {
      await queryClient.cancelQueries({ queryKey: certificateKeys.lists() })
      const snapshot = snapshotLists(queryClient)
      queryClient.setQueriesData<Certificate[]>({ queryKey: certificateKeys.lists() }, (old) =>
        old?.map((c) => (c.id === id ? { ...c, isPublic } : c)),
      )
      return { snapshot }
    },
    onError: (_error, _vars, context) => {
      if (context) restoreLists(queryClient, context.snapshot)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: certificateKeys.all }),
  })
}

/** Drag-and-drop order: `ordered` is the full, unfiltered list in its new order. */
export function useReorderCertificates() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ordered: Certificate[]) =>
      api.put<void>(
        `${BASE}/order`,
        ordered.map((c) => c.id),
      ),
    onMutate: async (ordered) => {
      await queryClient.cancelQueries({ queryKey: certificateKeys.lists() })
      const snapshot = snapshotLists(queryClient)
      queryClient.setQueryData(certificateKeys.list({}), ordered)
      return { snapshot }
    },
    onError: (_error, _vars, context) => {
      if (context) restoreLists(queryClient, context.snapshot)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: certificateKeys.lists() }),
  })
}
