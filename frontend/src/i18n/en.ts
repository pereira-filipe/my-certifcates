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
}

export type Messages = typeof en
