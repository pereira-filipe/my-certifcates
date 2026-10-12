// All UI texts live here, so a Portuguese file can be added later (see specs/FRONTEND.md §6).
export const en = {
  appName: 'My Certificates',
  catalog: {
    subtitle: 'Certifications',
  },
  notFound: {
    title: 'Page not found',
    message: "The page you're looking for doesn't exist or is no longer available.",
  },
  theme: {
    toggle: 'Toggle dark mode',
  },
  apiStatus: {
    checking: 'Checking the API…',
    ok: 'API is reachable',
    down: "Can't reach the API",
  },
  errors: {
    generic: 'Something went wrong. Try again.',
    network: "Can't reach the server. Check your connection and try again.",
  },
  placeholder: 'Coming soon',
  login: {
    title: 'Log in',
    description: 'Manage your certificates.',
    email: 'Email',
    password: 'Password',
    submit: 'Log in',
    submitting: 'Logging in…',
    invalid: 'Invalid email or password',
    blocked: 'Too many failed attempts. Try again in a few minutes.',
    expired: 'Your session expired, please log in again.',
    emailRequired: 'Enter your email',
    emailInvalid: 'Enter a valid email',
    passwordRequired: 'Enter your password',
  },
  admin: {
    logout: 'Log out',
  },
}

export type Messages = typeof en
