import { useMutation, useQueryClient } from '@tanstack/react-query'
import { meQueryKey } from './auth'
import { api } from './client'
import type { Me } from './types'

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (displayName: string) => api.put<Me>('/api/admin/account', { displayName }),
    onSuccess: (me) => queryClient.setQueryData(meQueryKey, me),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      api.put<void>('/api/admin/account/password', body),
  })
}
