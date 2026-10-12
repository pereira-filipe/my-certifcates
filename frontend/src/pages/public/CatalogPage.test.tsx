import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { PublicCatalog } from '@/api/types'
import { jsonResponse, mockFetch, renderRoutes } from '@/test/render'
import { CatalogPage } from './CatalogPage'
import { CertificateDetailPage } from './CertificateDetailPage'

const routes = [
  {
    path: '/c/:shareToken',
    element: <CatalogPage />,
    children: [{ path: ':certificateId', element: <CertificateDetailPage /> }],
  },
]

const CATALOG: PublicCatalog = {
  displayName: 'Filipe Pereira',
  certificates: [
    {
      id: 'c1',
      title: 'AWS Cloud Practitioner',
      issuer: 'Amazon Web Services',
      issueDate: '2025-03-10',
      credentialId: 'AWS-123',
      verificationUrl: 'https://aws.example/verify/123',
      tags: ['Cloud'],
      files: [
        {
          id: 'f1',
          originalName: 'aws.png',
          contentType: 'image/png',
          sizeBytes: 2048,
          isPrimary: true,
          hasThumbnail: true,
        },
        {
          id: 'f2',
          originalName: 'transcript.pdf',
          contentType: 'application/pdf',
          sizeBytes: 4096,
          isPrimary: false,
          hasThumbnail: true,
        },
      ],
    },
    {
      id: 'c2',
      title: 'Scrum Master',
      issuer: 'Scrum.org',
      issueDate: '2024-01-05',
      tags: [],
      files: [],
    },
  ],
}

describe('public catalog', () => {
  it('shows the owner and a card per certificate', async () => {
    mockFetch(() => jsonResponse(200, CATALOG))
    renderRoutes(routes, '/c/tok')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Filipe Pereira' }),
    ).toBeInTheDocument()
    const cards = screen.getAllByRole('link')
    expect(cards).toHaveLength(2)
    expect(within(cards[0]).getByRole('img', { name: 'AWS Cloud Practitioner' })).toHaveAttribute(
      'src',
      '/api/public/catalogs/tok/files/f1/thumbnail',
    )
    expect(within(cards[0]).getByText('Amazon Web Services · Mar 2025')).toBeInTheDocument()
    expect(within(cards[1]).queryByRole('img')).not.toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('Filipe Pereira — Certifications'))
  })

  it('never shows private fields, even if the server sent them', async () => {
    const leaky = {
      ...CATALOG,
      certificates: [
        { ...CATALOG.certificates[0], notes: 'SECRET NOTE', expirationDate: '2031-01-01' },
      ],
    }
    mockFetch(() => jsonResponse(200, leaky))
    renderRoutes(routes, '/c/tok/c1')

    await screen.findByRole('dialog')
    expect(document.body.textContent).not.toMatch(/SECRET NOTE|2031|Expires|Expired/)
  })

  it('opens the detail with verify, download and other files', async () => {
    mockFetch(() => jsonResponse(200, CATALOG))
    const { router } = renderRoutes(routes, '/c/tok')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: /AWS Cloud Practitioner/ }))

    const dialog = await screen.findByRole('dialog', { name: 'AWS Cloud Practitioner' })
    expect(router.state.location.pathname).toBe('/c/tok/c1')
    const verify = within(dialog).getByRole('link', { name: 'Verify credential' })
    expect(verify).toHaveAttribute('href', 'https://aws.example/verify/123')
    expect(verify).toHaveAttribute('target', '_blank')
    expect(verify).toHaveAttribute('rel', 'noopener noreferrer')
    expect(within(dialog).getByRole('link', { name: 'Download' })).toHaveAttribute(
      'href',
      '/api/public/catalogs/tok/files/f1?download=true',
    )
    expect(within(dialog).getByRole('img', { name: 'AWS Cloud Practitioner' })).toHaveAttribute(
      'src',
      '/api/public/catalogs/tok/files/f1',
    )
    expect(within(dialog).getByText('AWS-123')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /transcript\.pdf/ })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/c/tok'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('hides Verify when there is no link', async () => {
    mockFetch(() => jsonResponse(200, CATALOG))
    renderRoutes(routes, '/c/tok/c2')

    const dialog = await screen.findByRole('dialog', { name: 'Scrum Master' })
    expect(
      within(dialog).queryByRole('link', { name: 'Verify credential' }),
    ).not.toBeInTheDocument()
  })

  it('shows not found for a bad link', async () => {
    mockFetch(() => jsonResponse(404, { status: 404, error: 'NOT_FOUND', message: 'Not found' }))
    renderRoutes(routes, '/c/wrong')

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })

  it('says so when nothing is public yet', async () => {
    mockFetch(() => jsonResponse(200, { displayName: 'Filipe', certificates: [] }))
    renderRoutes(routes, '/c/tok')

    expect(await screen.findByText('No certificates to show yet.')).toBeInTheDocument()
  })
})
