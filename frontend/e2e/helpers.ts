import { expect, type APIRequestContext, type Page } from '@playwright/test'

export const OWNER = {
  email: process.env.E2E_OWNER_EMAIL ?? '',
  password: process.env.E2E_OWNER_PASSWORD ?? '',
}

if (!OWNER.email || !OWNER.password) {
  throw new Error(
    'Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD (the owner account of the app under test).',
  )
}

/** Everything these tests create starts with this, and is removed afterwards. */
export const PREFIX = 'E2E'

export async function logIn(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(OWNER.email)
  await page.getByLabel('Password').fill(OWNER.password)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}

async function xsrf(request: APIRequestContext) {
  const state = await request.storageState()
  return state.cookies.find((c) => c.name === 'XSRF-TOKEN')?.value ?? ''
}

/** Removes certificates titled "E2E…" and tags named "E2E…", through the API of a logged-in page. */
export async function cleanUp(page: Page) {
  const request = page.request
  const headers = { 'X-XSRF-TOKEN': decodeURIComponent(await xsrf(request)) }
  for (const c of await (await request.get('/api/admin/certificates')).json())
    if (c.title.startsWith(PREFIX))
      await request.delete(`/api/admin/certificates/${c.id}`, { headers })
  for (const t of await (await request.get('/api/admin/tags')).json())
    if (t.name.startsWith(PREFIX)) await request.delete(`/api/admin/tags/${t.id}`, { headers })
}

export async function catalogLink(page: Page): Promise<{ shareToken: string; url: string }> {
  return (await page.request.get('/api/admin/catalog')).json()
}

/** A small, real PDF made by the browser. */
export async function makePdf(page: Page, text: string): Promise<Buffer> {
  const maker = await page.context().newPage()
  await maker.setContent(
    `<div style="font-family:serif;text-align:center;padding:60px;border:10px double #1d4ed8;height:380px"><h1>Certificate</h1><p>${text}</p></div>`,
  )
  const pdf = await maker.pdf({ width: '800px', height: '560px', printBackground: true })
  await maker.close()
  return pdf
}
