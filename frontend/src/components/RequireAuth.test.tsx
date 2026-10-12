import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { jsonResponse, mockFetch, renderRoutes } from '@/test/render'
import { RequireAuth } from './RequireAuth'

const routes = [
  { path: '/login', element: <p>Login page</p> },
  {
    path: '/admin',
    element: <RequireAuth />,
    children: [{ path: 'settings', element: <p>Settings page</p> }],
  },
]

describe('RequireAuth', () => {
  it('sends logged-out visitors to login, remembering where they were going', async () => {
    mockFetch(() => jsonResponse(401, { status: 401, error: 'UNAUTHORIZED', message: '' }))
    const { router } = renderRoutes(routes, '/admin/settings?tab=profile')

    expect(await screen.findByText('Login page')).toBeInTheDocument()
    await waitFor(() =>
      expect(router.state.location.search).toBe(
        `?next=${encodeURIComponent('/admin/settings?tab=profile')}`,
      ),
    )
  })

  it('shows the page when logged in', async () => {
    mockFetch(() => jsonResponse(200, { email: 'owner@example.com', displayName: 'owner' }))
    renderRoutes(routes, '/admin/settings')

    expect(await screen.findByText('Settings page')).toBeInTheDocument()
  })
})
