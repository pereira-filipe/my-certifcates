// Apply dark mode before first paint to avoid a white flash (see src/lib/theme.tsx).
// A separate file, not inline, so the Content-Security-Policy can forbid inline scripts.
try {
  var stored = localStorage.getItem('theme')
  var dark = stored ? stored === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
  if (dark) document.documentElement.classList.add('dark')
} catch (e) {}
