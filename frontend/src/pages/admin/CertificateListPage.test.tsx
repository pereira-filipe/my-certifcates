import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Certificate } from '@/api/types'
import { jsonResponse, mockFetch, renderRoutes } from '@/test/render'
import { CertificateListPage } from './CertificateListPage'

function certificate(overrides: Partial<Certificate>): Certificate {
  return {
    id: 'id-1',
    title: 'Java SE Programmer',
    issuer: 'Oracle',
    issueDate: '2025-03-10',
    isPublic: false,
    displayOrder: 0,
    tags: [],
    createdAt: '2025-03-10T00:00:00Z',
    updatedAt: '2025-03-10T00:00:00Z',
    ...overrides,
  }
}

const routes = [{ path: '/admin', element: <CertificateListPage /> }]

beforeEach(() => {
  document.cookie = 'XSRF-TOKEN=abc'
})

describe('CertificateListPage', () => {
  it('shows each certificate with issuer, date, tags and expiration', async () => {
    mockFetch((url) =>
      url.startsWith('/api/admin/tags')
        ? jsonResponse(200, [])
        : jsonResponse(200, [
            certificate({ tags: ['Java'], expirationDate: '2020-01-01' }),
            certificate({
              id: 'id-2',
              title: 'AWS Cloud',
              issuer: 'Amazon',
              expirationDate: '2099-06-30',
            }),
          ]),
    )
    renderRoutes(routes, '/admin')

    const rows = await screen.findAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('Oracle · Mar 2025')).toBeInTheDocument()
    expect(within(rows[0]).getByText('Java')).toBeInTheDocument()
    expect(within(rows[0]).getByText('Expired')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Expires Jun 2099')).toBeInTheDocument()
  })

  it('shows the empty state', async () => {
    mockFetch(() => jsonResponse(200, []))
    renderRoutes(routes, '/admin')

    expect(await screen.findByText('No certificates yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add your first certificate' })).toHaveAttribute(
      'href',
      '/admin/certificates/new',
    )
  })

  it('makes a certificate public right away', async () => {
    let isPublic = false
    const fetchMock = mockFetch((url, init) => {
      if (url.startsWith('/api/admin/tags')) return jsonResponse(200, [])
      if (init?.method === 'PATCH') {
        isPublic = true
        return jsonResponse(200, certificate({ isPublic }))
      }
      return jsonResponse(200, [certificate({ isPublic })])
    })
    renderRoutes(routes, '/admin')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('switch', { name: 'Public: Java SE Programmer' }))

    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Public: Java SE Programmer' })).toBeChecked(),
    )
    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')
      expect(patch?.[0]).toBe('/api/admin/certificates/id-1/visibility')
      expect(patch?.[1]?.body).toBe('{"isPublic":true}')
    })
  })

  it('asks before deleting', async () => {
    const fetchMock = mockFetch((url, init) => {
      if (url.startsWith('/api/admin/tags')) return jsonResponse(200, [])
      if (init?.method === 'DELETE') return new Response(null, { status: 204 })
      return jsonResponse(200, [certificate({})])
    })
    renderRoutes(routes, '/admin')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Delete Java SE Programmer' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false)

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) => url === '/api/admin/certificates/id-1' && init?.method === 'DELETE',
        ),
      ).toBe(true),
    )
  })

  it('searches after typing pauses and turns off reordering', async () => {
    const fetchMock = mockFetch((url) =>
      url.startsWith('/api/admin/tags')
        ? jsonResponse(200, [])
        : jsonResponse(200, [certificate({}), certificate({ id: 'id-2', title: 'Other' })]),
    )
    renderRoutes(routes, '/admin')
    const user = userEvent.setup()
    expect(await screen.findByText(/Drag the handles/)).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox', { name: 'Search by title or issuer' }), 'java')

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => url === '/api/admin/certificates?q=java')).toBe(
        true,
      ),
    )
    expect(await screen.findByText('Clear the search and filters to reorder.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Drag to reorder/ })).not.toBeInTheDocument()
  })
})
