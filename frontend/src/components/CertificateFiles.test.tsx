import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Certificate, CertificateFile } from '@/api/types'
import { CertificateFormPage } from '@/pages/admin/CertificateFormPage'
import { jsonResponse, mockFetch, mockUploads, renderRoutes } from '@/test/render'

const routes = [
  { path: '/admin', element: <p>List page</p> },
  { path: '/admin/certificates/new', element: <CertificateFormPage /> },
  { path: '/admin/certificates/:id', element: <CertificateFormPage /> },
]

function storedFile(overrides: Partial<CertificateFile>): CertificateFile {
  return {
    id: 'f1',
    originalName: 'certificate.pdf',
    contentType: 'application/pdf',
    sizeBytes: 1536,
    isPrimary: true,
    hasThumbnail: true,
    createdAt: '',
    ...overrides,
  }
}

const CERT: Certificate = {
  id: 'c1',
  title: 'AWS',
  issuer: 'Amazon',
  issueDate: '2025-03-10',
  isPublic: false,
  displayOrder: 0,
  tags: [],
  files: [],
  createdAt: '',
  updatedAt: '',
}

beforeEach(() => {
  document.cookie = 'XSRF-TOKEN=abc'
})

function pdf(name = 'certificate.pdf', size = 1000) {
  const file = new File(['%PDF-'], name, { type: 'application/pdf' })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('files on the certificate form', () => {
  it('refuses wrong types and big files before uploading', async () => {
    mockFetch(() => jsonResponse(200, []))
    const uploads = mockUploads(() => ({ status: 201, body: {} }))
    renderRoutes(routes, '/admin/certificates/new')
    const user = userEvent.setup({ applyAccept: false })

    const input = await screen.findByLabelText(/Drag files here/)
    await user.upload(input, [
      new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }),
      pdf('huge.pdf', 11 * 1024 * 1024),
    ])

    expect(screen.getByText('logo.svg is not a PDF, PNG, JPG or WEBP file')).toBeInTheDocument()
    expect(screen.getByText('huge.pdf is larger than 10 MB')).toBeInTheDocument()
    expect(uploads).toHaveLength(0)
  })

  it('uploads queued files right after creating, the first one as main', async () => {
    const fetchMock = mockFetch((_url, init) =>
      init?.method === 'POST' ? jsonResponse(201, CERT) : jsonResponse(200, []),
    )
    const uploads = mockUploads(() => ({ status: 201, body: storedFile({}) }))
    const { router } = renderRoutes(routes, '/admin/certificates/new')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Title*'), 'AWS')
    await user.type(screen.getByLabelText('Issuer*'), 'Amazon')
    const date = screen.getByLabelText('Issue date*')
    await user.type(date, '2025-03-10')
    await user.upload(screen.getByLabelText(/Drag files here/), [pdf('one.pdf'), pdf('two.pdf')])
    expect(screen.getAllByText(/Will be uploaded when you save/)).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'))
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(true)
    expect(uploads.map((u) => u.url)).toEqual([
      '/api/admin/certificates/c1/files?primary=true',
      '/api/admin/certificates/c1/files?primary=false',
    ])
    expect((uploads[0].body.get('file') as File).name).toBe('one.pdf')
    expect(uploads[0].headers['X-XSRF-TOKEN']).toBe('abc')
  })

  it('stays on the saved certificate when an upload fails', async () => {
    mockFetch((url, init) => {
      if (init?.method === 'POST') return jsonResponse(201, CERT)
      if (url === '/api/admin/certificates/c1') return jsonResponse(200, CERT)
      return jsonResponse(200, [])
    })
    mockUploads(() => ({
      status: 400,
      body: { status: 400, error: 'VALIDATION_ERROR', message: 'Some fields are invalid' },
    }))
    const { router } = renderRoutes(routes, '/admin/certificates/new')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Title*'), 'AWS')
    await user.type(screen.getByLabelText('Issuer*'), 'Amazon')
    await user.type(screen.getByLabelText('Issue date*'), '2025-03-10')
    await user.upload(screen.getByLabelText(/Drag files here/), [pdf()])
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/certificates/c1'))
  })

  it('lists saved files and moves the main file', async () => {
    const fetchMock = mockFetch((url, init) => {
      if (init?.method === 'PATCH')
        return jsonResponse(200, storedFile({ id: 'f2', isPrimary: true }))
      if (url === '/api/admin/certificates/c1')
        return jsonResponse(200, {
          ...CERT,
          files: [
            storedFile({}),
            storedFile({
              id: 'f2',
              originalName: 'transcript.png',
              hasThumbnail: false,
              isPrimary: false,
            }),
          ],
        })
      return jsonResponse(200, [])
    })
    renderRoutes(routes, '/admin/certificates/c1')
    const user = userEvent.setup()

    const rows = await screen.findAllByRole('listitem')
    expect(within(rows[0]).getByText('Main')).toBeInTheDocument()
    expect(within(rows[0]).getByText('1.5 KB')).toBeInTheDocument()
    expect(within(rows[0]).getByRole('link', { name: 'Download certificate.pdf' })).toHaveAttribute(
      'href',
      '/api/admin/files/f1?download=true',
    )

    await user.click(within(rows[1]).getByRole('button', { name: 'Make main' }))

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) => url === '/api/admin/files/f2/primary' && init?.method === 'PATCH',
        ),
      ).toBe(true),
    )
  })
})
