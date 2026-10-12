/**
 * Where to go after login. Only admin pages are allowed, so a crafted link like
 * `/login?next=https://evil.example` can't send the owner to another site.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (next && /^\/admin(?:[/?#]|$)/.test(next)) return next
  return '/admin'
}
