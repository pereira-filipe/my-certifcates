import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from './client'
import type { LoginRequest, Me } from './types'

export const meQueryKey = ['me'] as const

/** The logged-in owner, or `null` when not logged in. */
export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: async (): Promise<Me | null> => {
      try {
        return await api.get<Me>('/api/auth/me', { redirectOn401: false })
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (credentials: LoginRequest) =>
      api.post<Me>('/api/auth/login', credentials, { redirectOn401: false }),
    onSuccess: (me) => queryClient.setQueryData(meQueryKey, me),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<void>('/api/auth/logout', undefined, { redirectOn401: false }),
    onSettled: () => {
      // Forget everything cached for the owner, then mark as logged out.
      queryClient.clear()
      queryClient.setQueryData(meQueryKey, null)
    },
  })
}
