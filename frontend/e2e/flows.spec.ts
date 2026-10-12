import { expect, test } from '@playwright/test'
import { catalogLink, cleanUp, logIn, makePdf, PREFIX } from './helpers.ts'

// The four key flows from specs/FRONTEND.md §9.

const TITLE = `${PREFIX} Cloud Practitioner`

test.beforeEach(async ({ page }) => {
  await logIn(page)
  await cleanUp(page)
})

test.afterEach(async ({ page }) => {
  await cleanUp(page)
})

test('1–3: add with a file, make public, hide; visitors never see private fields', async ({
  page,
  browser,
}) => {
  // 1. Add a certificate with a file, public, with private notes and an expiration date.
  await page
    .getByRole('link', { name: /Add (your first )?certificate/ })
    .first()
    .click()
  await page.getByLabel('Title*').fill(TITLE)
  await page.getByLabel('Issuer*').fill('Amazon Web Services')
  await page.getByLabel('Issue date*').fill('2025-03-10')
  await page.getByLabel('Expiration date').fill('2028-03-10')
  await page.getByLabel('Notes').fill('E2E private note')
  await page.getByLabel('Verification URL').fill('https://aws.example/verify/1')
  await page.getByLabel(/Drag files here/).setInputFiles({
    name: 'certificate.pdf',
    mimeType: 'application/pdf',
    buffer: await makePdf(page, TITLE),
  })
  await page.getByRole('switch', { name: 'Show in my public catalog' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('link', { name: TITLE, exact: true })).toBeVisible()

  // …appears in the public catalog for a visitor who never logged in.
  const { url } = await catalogLink(page)
  const visitorContext = await browser.newContext()
  const visitor = await visitorContext.newPage()
  await visitor.goto(url)
  const card = visitor.getByRole('link', { name: new RegExp(TITLE) })
  await expect(card).toBeVisible()
  await expect(card.getByRole('img', { name: TITLE })).toBeVisible()

  // 3. No expiration date or notes anywhere, also not in the detail.
  await card.click()
  const dialog = visitor.getByRole('dialog', { name: TITLE })
  await expect(dialog.getByRole('link', { name: 'Verify credential' })).toHaveAttribute(
    'href',
    'https://aws.example/verify/1',
  )
  await expect(dialog.locator('canvas')).toBeVisible() // the PDF is shown
  await expect(visitor.locator('body')).not.toContainText(/private note|2028|Expires|Expired/)

  // 2. Hide it → it disappears from the catalog.
  await page.getByRole('switch', { name: `Public: ${TITLE}` }).click()
  await expect(page.getByText('Hidden from your public catalog')).toBeVisible()
  await visitor.goto(url)
  await expect(
    visitor.getByText('No certificates to show yet.').or(visitor.locator('main li')),
  ).toBeVisible()
  await expect(visitor.getByRole('link', { name: new RegExp(TITLE) })).toHaveCount(0)
  await visitorContext.close()
})

test('4: a new link makes the old one show "Not found"', async ({ page, browser }) => {
  // Changes the owner's real share link, so it only runs where that's fine (CI sets this).
  test.skip(process.env.E2E_ALLOW_REGENERATE !== 'true', 'set E2E_ALLOW_REGENERATE=true to run')

  const before = await catalogLink(page)
  await page.goto('/admin/settings')
  await page.getByRole('button', { name: 'Generate new link' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Generate new link' }).click()
  await expect(page.getByText('New link ready. The old one no longer works.')).toBeVisible()
  const after = await catalogLink(page)
  expect(after.shareToken).not.toBe(before.shareToken)
  await expect(page.locator(`input[value="${after.url}"]`)).toBeVisible()

  const visitor = await (await browser.newContext()).newPage()
  await visitor.goto(before.url)
  await expect(visitor.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await visitor.goto(after.url)
  await expect(visitor.getByText('Certifications', { exact: true })).toBeVisible()
})
