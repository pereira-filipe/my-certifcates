// Dates from the API are "YYYY-MM-DD" (no time zone). They're handled as UTC so they never shift a day.

const monthYear = new Intl.DateTimeFormat('en', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

/** "2025-03-10" → "Mar 2025" (specs/FRONTEND.md §6). */
export function formatMonthYear(date: string): string {
  return monthYear.format(parseDate(date))
}

/** Today as "YYYY-MM-DD" in the viewer's time zone. */
export function today(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Whether a certificate has expired, for the owner-only badge. A certificate is still valid on its expiration day. */
export function isExpired(expirationDate: string, todayDate: string = today()): boolean {
  return expirationDate < todayDate
}
