import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { TagUsage } from './types'

export const tagKeys = {
  all: ['tags'] as const,
}

export function useTags() {
  return useQuery({
    queryKey: tagKeys.all,
    queryFn: () => api.get<TagUsage[]>('/api/admin/tags'),
  })
}

function useRefreshAfterTagChange() {
  const queryClient = useQueryClient()
  // Certificates show tag names, so they change too.
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: tagKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['certificates'] }),
    ])
}

export function useRenameTag() {
  const refresh = useRefreshAfterTagChange()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.put<{ id: string; name: string }>(`/api/admin/tags/${id}`, { name }),
    onSuccess: refresh,
  })
}

export function useDeleteTag() {
  const refresh = useRefreshAfterTagChange()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/admin/tags/${id}`),
    onSuccess: refresh,
  })
}
