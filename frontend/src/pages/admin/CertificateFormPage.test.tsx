import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { jsonResponse, mockFetch, renderRoutes } from '@/test/render'
import { CertificateFormPage } from './CertificateFormPage'

const routes = [
  { path: '/admin', element: <p>List page</p> },
  { path: '/admin/certificates/new', element: <CertificateFormPage /> },
  { path: '/admin/certificates/:id', element: <CertificateFormPage /> },
]

const SAVED = {
  id: 'new-id',
  title: 'AWS Cloud Practitioner',
  issuer: 'Amazon',
  issueDate: '2025-03-10',
  isPublic: false,
  displayOrder: 0,
  tags: ['Cloud'],
  createdAt: '',
  updatedAt: '',
}

beforeEach(() => {
  document.cookie = 'XSRF-TOKEN=abc'
})

function setDate(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('CertificateFormPage', () => {
  it('checks required fields, the link and the dates before saving', async () => {
    const fetchMock = mockFetch(() => jsonResponse(200, []))
    renderRoutes(routes, '/admin/certificates/new')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText(/Verification URL/), 'javascript:alert(1)')
    setDate('Issue date*', '2025-03-10')
    setDate('Expiration date', '2024-01-01')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findAllByText('Required')).toHaveLength(2)
    expect(screen.getByText('Enter a link starting with http:// or https://')).toBeInTheDocument()
    expect(screen.getByText("Can't be before the issue date")).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
  })

  it('creates a certificate with a new tag, then goes back to the list', async () => {
    const fetchMock = mockFetch((url, init) => {
      if (init?.method === 'POST') return jsonResponse(201, SAVED)
      if (url === '/api/admin/tags')
        return jsonResponse(200, [{ id: 't', name: 'AWS', certificateCount: 1 }])
      return jsonResponse(200, [])
    })
    const { router } = renderRoutes(routes, '/admin/certificates/new')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Title*'), '  AWS Cloud Practitioner ')
    await user.type(screen.getByLabelText('Issuer*'), 'Amazon')
    setDate('Issue date*', '2025-03-10')
    await user.click(screen.getByRole('button', { name: 'Add tag' }))
    await user.type(await screen.findByPlaceholderText('Find or create a tag'), 'Cloud')
    await user.click(await screen.findByRole('option', { name: /Create “Cloud”/ }))
    await user.click(screen.getByRole('switch', { name: 'Show in my public catalog' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'))
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      title: 'AWS Cloud Practitioner',
      issuer: 'Amazon',
      issueDate: '2025-03-10',
      expirationDate: null,
      credentialId: null,
      verificationUrl: null,
      notes: null,
      isPublic: true,
      tags: ['Cloud'],
    })
  })

  it('shows field errors from the backend', async () => {
    mockFetch((_url, init) =>
      init?.method === 'POST'
        ? jsonResponse(400, {
            status: 400,
            error: 'VALIDATION_ERROR',
            message: 'x',
            fields: { issuer: 'must not be blank' },
          })
        : jsonResponse(200, []),
    )
    renderRoutes(routes, '/admin/certificates/new')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Title*'), 'T')
    await user.type(screen.getByLabelText('Issuer*'), 'I')
    setDate('Issue date*', '2025-03-10')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('must not be blank')).toBeInTheDocument()
  })

  it('loads an existing certificate and saves changes with PUT', async () => {
    const fetchMock = mockFetch((url, init) => {
      if (url === '/api/admin/certificates/new-id' && init?.method === 'PUT')
        return jsonResponse(200, SAVED)
      if (url === '/api/admin/certificates/new-id') return jsonResponse(200, SAVED)
      return jsonResponse(200, [])
    })
    const { router } = renderRoutes(routes, '/admin/certificates/new-id')
    const user = userEvent.setup()

    const title = await screen.findByLabelText('Title*')
    expect(title).toHaveValue('AWS Cloud Practitioner')
    expect(screen.getByText('Cloud')).toBeInTheDocument()

    await user.clear(title)
    await user.type(title, 'Renamed')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'))
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')
    expect(JSON.parse(String(put?.[1]?.body))).toMatchObject({ title: 'Renamed', tags: ['Cloud'] })
  })

  it('asks before leaving with unsaved changes', async () => {
    mockFetch(() => jsonResponse(200, []))
    const { router } = renderRoutes(routes, '/admin/certificates/new')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Title*'), 'Half typed')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    expect(router.state.location.pathname).toBe('/admin/certificates/new')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Discard' }),
    )
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'))
  })

  it('says when the certificate does not exist', async () => {
    mockFetch(() => jsonResponse(404, { status: 404, error: 'NOT_FOUND', message: 'x' }))
    renderRoutes(routes, '/admin/certificates/missing')

    expect(
      await screen.findByText("This certificate doesn't exist or was deleted."),
    ).toBeInTheDocument()
  })
})
