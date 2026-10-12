import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { vi } from 'vitest'
import { ThemeProvider } from '@/lib/theme'

/** Renders routes in memory with a fresh query client (no retries, no cache between tests). */
export function renderRoutes(routes: RouteObject[], initialPath: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })
  render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>,
  )
  return { router, queryClient }
}

export function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Replaces fetch; `handler` gets the URL and init of each call. */
export function mockFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(handler(String(input), init)),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

type FakeUpload = { url: string; headers: Record<string, string>; body: FormData }

/**
 * Replaces XMLHttpRequest for uploads. Each request reports 50% then 100% progress and answers with
 * `respond(url)`. Returns the list of requests made.
 */
export function mockUploads(respond: (url: string) => { status: number; body: unknown }) {
  const requests: FakeUpload[] = []
  class FakeXHR {
    status = 0
    statusText = ''
    responseText = ''
    withCredentials = false
    upload: {
      onprogress?: (event: { lengthComputable: boolean; loaded: number; total: number }) => void
    } = {}
    onload?: () => void
    onerror?: () => void
    private url = ''
    private headers: Record<string, string> = {}
    open(_method: string, url: string) {
      this.url = url
    }
    setRequestHeader(name: string, value: string) {
      this.headers[name] = value
    }
    send(body: FormData) {
      requests.push({ url: this.url, headers: this.headers, body })
      const { status, body: response } = respond(this.url)
      setTimeout(() => {
        this.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 })
        this.upload.onprogress?.({ lengthComputable: true, loaded: 100, total: 100 })
        this.status = status
        this.responseText = JSON.stringify(response)
        this.onload?.()
      }, 0)
    }
  }
  vi.stubGlobal('XMLHttpRequest', FakeXHR)
  return requests
}
