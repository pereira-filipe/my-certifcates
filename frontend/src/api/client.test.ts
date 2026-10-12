import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from './client'

const fetchMock = vi.fn<typeof fetch>()

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  document.cookie = 'XSRF-TOKEN=abc123'
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
})

describe('api client', () => {
  it('returns JSON and sends cookies', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { status: 'ok' }))

    await expect(api.get('/api/public/ping')).resolves.toEqual({ status: 'ok' })

    const [, init] = fetchMock.mock.calls[0]
    expect(init?.credentials).toBe('include')
    expect(new Headers(init?.headers).has('X-XSRF-TOKEN')).toBe(false)
  })

  it('sends the CSRF token and a JSON body on POST', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await api.post('/api/admin/things', { title: 'AWS' })

    const [, init] = fetchMock.mock.calls[0]
    const headers = new Headers(init?.headers)
    expect(headers.get('X-XSRF-TOKEN')).toBe('abc123')
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(init?.body).toBe('{"title":"AWS"}')
  })

  it('turns the backend error format into an ApiError with field errors', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        status: 400,
        error: 'VALIDATION_ERROR',
        message: 'Invalid data',
        fields: { title: 'must not be blank' },
      }),
    )

    const error = await api.post('/api/admin/things', {}).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      fields: { title: 'must not be blank' },
    })
  })

  it('reports an unreachable server as status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(api.get('/api/public/ping')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    })
  })
})
