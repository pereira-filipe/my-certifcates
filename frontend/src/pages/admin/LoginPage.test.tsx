import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { jsonResponse, mockFetch, renderRoutes } from '@/test/render'
import { LoginPage } from './LoginPage'

const OWNER = { email: 'owner@example.com', displayName: 'owner' }

const routes = [
  { path: '/login', element: <LoginPage /> },
  { path: '/admin/*', element: <p>Admin area</p> },
]

beforeEach(() => {
  document.cookie = 'XSRF-TOKEN=abc'
})

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Log in' }))
}

describe('LoginPage', () => {
  it('logs in and goes to the page from ?next=', async () => {
    const fetchMock = mockFetch((url, init) => {
      if (url === '/api/auth/me')
        return jsonResponse(401, { status: 401, error: 'UNAUTHORIZED', message: '' })
      if (url === '/api/auth/login' && init?.method === 'POST') return jsonResponse(200, OWNER)
      throw new Error(`Unexpected call ${url}`)
    })
    const { router } = renderRoutes(routes, '/login?next=%2Fadmin%2Fsettings')

    await fillAndSubmit('owner@example.com', 'correct-horse-battery')

    expect(await screen.findByText('Admin area')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/settings')
    const loginCall = fetchMock.mock.calls.find(([url]) => url === '/api/auth/login')
    expect(new Headers(loginCall?.[1]?.headers).get('X-XSRF-TOKEN')).toBe('abc')
  })

  it('shows one generic message for wrong credentials', async () => {
    mockFetch((url) =>
      url === '/api/auth/me'
        ? jsonResponse(401, { status: 401, error: 'UNAUTHORIZED', message: '' })
        : jsonResponse(401, { status: 401, error: 'INVALID_CREDENTIALS', message: 'x' }),
    )
    renderRoutes(routes, '/login')

    await fillAndSubmit('owner@example.com', 'wrong-password')

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
  })

  it('explains when login is temporarily blocked', async () => {
    mockFetch((url) =>
      url === '/api/auth/me'
        ? jsonResponse(401, { status: 401, error: 'UNAUTHORIZED', message: '' })
        : jsonResponse(429, { status: 429, error: 'LOGIN_BLOCKED', message: 'x' }),
    )
    renderRoutes(routes, '/login')

    await fillAndSubmit('owner@example.com', 'whatever-password')

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many failed attempts')
  })

  it('validates the fields before calling the API', async () => {
    const fetchMock = mockFetch(() =>
      jsonResponse(401, { status: 401, error: 'UNAUTHORIZED', message: '' }),
    )
    renderRoutes(routes, '/login')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Email'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByText('Enter a valid email')).toBeInTheDocument()
    expect(screen.getByText('Enter your password')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/auth/login')).toBe(false)
  })

  it('shows the session-expired notice', async () => {
    mockFetch(() => jsonResponse(401, { status: 401, error: 'UNAUTHORIZED', message: '' }))
    renderRoutes(routes, '/login?expired=1')

    expect(
      await screen.findByText('Your session expired, please log in again.'),
    ).toBeInTheDocument()
  })

  it('skips the form when already logged in', async () => {
    mockFetch(() => jsonResponse(200, OWNER))
    const { router } = renderRoutes(routes, '/login')

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'))
  })
})
