import { useQuery } from '@tanstack/react-query'
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
