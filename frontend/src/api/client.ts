import type { ApiErrorBody } from './types'

const CSRF_COOKIE = 'XSRF-TOKEN'
const CSRF_HEADER = 'X-XSRF-TOKEN'
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/** Any failed API call. `status` 0 means the server couldn't be reached. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields: Record<string, string>

  constructor(body: ApiErrorBody) {
    super(body.message)
    this.name = 'ApiError'
    this.status = body.status
    this.code = body.error
    this.fields = body.fields ?? {}
  }
}

function readCookie(name: string): string | undefined {
  const prefix = `${name}=`
  const match = document.cookie.split('; ').find((part) => part.startsWith(prefix))
  return match ? decodeURIComponent(match.slice(prefix.length)) : undefined
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiErrorBody).status === 'number' &&
    typeof (value as ApiErrorBody).error === 'string'
  )
}

/** In the admin area a 401 means the session expired: go to the login page and come back after. */
function redirectToLoginIfAdmin() {
  const { pathname, search } = window.location
  if (!pathname.startsWith('/admin')) return
  const next = encodeURIComponent(pathname + search)
  window.location.assign(`/login?expired=1&next=${next}`)
}

export type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown }

/**
 * Calls the backend at `/api/...` with the session cookie and CSRF token,
 * and turns the backend's error format into an {@link ApiError}.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers: extraHeaders, ...init } = options
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(extraHeaders)
  headers.set('Accept', 'application/json')

  let requestBody: BodyInit | undefined
  if (body instanceof FormData) {
    requestBody = body
  } else if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
    requestBody = JSON.stringify(body)
  }

  if (UNSAFE_METHODS.has(method)) {
    const token = readCookie(CSRF_COOKIE)
    if (token) headers.set(CSRF_HEADER, token)
  }

  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      method,
      headers,
      body: requestBody,
      credentials: 'include',
    })
  } catch {
    throw new ApiError({ status: 0, error: 'NETWORK_ERROR', message: 'Network error' })
  }

  if (response.status === 401) redirectToLoginIfAdmin()

  if (!response.ok) {
    const data: unknown = await response.json().catch(() => undefined)
    throw new ApiError(
      isApiErrorBody(data)
        ? data
        : { status: response.status, error: 'HTTP_ERROR', message: response.statusText },
    )
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
}
