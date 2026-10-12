import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { jsonResponse, mockFetch, renderRoutes } from '@/test/render'
import { SettingsPage } from './SettingsPage'

const routes = [{ path: '/admin/settings', element: <SettingsPage /> }]

beforeEach(() => {
  document.cookie = 'XSRF-TOKEN=abc'
})

function backend(
  overrides: (url: string, init?: RequestInit) => Response | undefined = () => undefined,
) {
  return mockFetch((url, init) => {
    const custom = overrides(url, init)
    if (custom) return custom
    if (url === '/api/admin/catalog')
      return jsonResponse(200, { shareToken: 'tok', url: 'https://me.example/c/tok' })
    if (url === '/api/auth/me')
      return jsonResponse(200, { email: 'me@example.com', displayName: 'Filipe' })
    if (url === '/api/admin/tags')
      return jsonResponse(200, [{ id: 't1', name: 'Clod', certificateCount: 2 }])
    return jsonResponse(200, {})
  })
}

describe('SettingsPage', () => {
  it('shows the share link and regenerates it after confirming', async () => {
    const fetchMock = backend((url, init) =>
      url === '/api/admin/catalog/regenerate-link' && init?.method === 'POST'
        ? jsonResponse(200, { shareToken: 'new', url: 'https://me.example/c/new' })
        : undefined,
    )
    renderRoutes(routes, '/admin/settings')
    const user = userEvent.setup()

    expect(await screen.findByDisplayValue('https://me.example/c/tok')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Generate new link' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent('The old link will stop working — update your CV.')
    await user.click(within(dialog).getByRole('button', { name: 'Generate new link' }))

    expect(await screen.findByDisplayValue('https://me.example/c/new')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/admin/catalog/regenerate-link')).toBe(
      true,
    )
  })

  it('checks the new password before sending, and shows a wrong current password', async () => {
    const fetchMock = backend((url) =>
      url === '/api/admin/account/password'
        ? jsonResponse(400, {
            status: 400,
            error: 'VALIDATION_ERROR',
            message: 'x',
            fields: { currentPassword: 'is incorrect' },
          })
        : undefined,
    )
    renderRoutes(routes, '/admin/settings')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Current password'), 'old-password')
    await user.type(screen.getByLabelText('New password'), 'short')
    await user.type(screen.getByLabelText('Confirm new password'), 'different')
    await user.click(screen.getByRole('button', { name: 'Change password' }))
    expect(await screen.findByText('Use at least 12 characters')).toBeInTheDocument()
    expect(screen.getByText("Passwords don't match")).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/admin/account/password')).toBe(false)

    await user.clear(screen.getByLabelText('New password'))
    await user.type(screen.getByLabelText('New password'), 'a-long-new-password')
    await user.clear(screen.getByLabelText('Confirm new password'))
    await user.type(screen.getByLabelText('Confirm new password'), 'a-long-new-password')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByText('is incorrect')).toBeInTheDocument()
  })

  it('renames a tag', async () => {
    const fetchMock = backend((url, init) =>
      url === '/api/admin/tags/t1' && init?.method === 'PUT'
        ? jsonResponse(200, { id: 't1', name: 'Cloud' })
        : undefined,
    )
    renderRoutes(routes, '/admin/settings')
    const user = userEvent.setup()

    expect(await screen.findByText('used by 2 certificates')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Rename Clod' }))
    const input = screen.getByRole('textbox', { name: 'New name for Clod' })
    await user.clear(input)
    await user.type(input, 'Cloud{Enter}')

    await waitFor(() => {
      const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')
      expect(put?.[1]?.body).toBe('{"name":"Cloud"}')
    })
  })
})
