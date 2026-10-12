import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { PingResponse } from './types'

/** Temporary M1 check; removed once real endpoints exist. */
export function usePing() {
  return useQuery({
    queryKey: ['ping'],
    queryFn: () => api.get<PingResponse>('/api/public/ping'),
    retry: false,
  })
}
