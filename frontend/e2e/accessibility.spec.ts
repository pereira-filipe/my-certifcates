import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { catalogLink, cleanUp, logIn, PREFIX } from './helpers.ts'

// Automated accessibility checks (axe) on every page, in light and dark mode (specs/FRONTEND.md §6).

async function expectNoViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const summary = results.violations.map(
    (v) =>
      `${label} – ${v.id} (${v.impact}): ${v.help}\n    ${v.nodes
        .slice(0, 3)
        .map((n) => `${n.target.join(' ')}: ${n.failureSummary?.split('\n').slice(1).join(' ')}`)
        .join('\n    ')}`,
  )
  expect(summary, summary.join('\n')).toEqual([])
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`pages have no accessibility violations (${colorScheme})`, async ({ page, browser }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/login')
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible()
    await expectNoViolations(page, 'login')

    await logIn(page)
    await cleanUp(page)
    const headers = {
      'X-XSRF-TOKEN': decodeURIComponent(
        (await page.context().cookies()).find((c) => c.name === 'XSRF-TOKEN')?.value ?? '',
      ),
    }
    await page.request.post('/api/admin/certificates', {
      headers,
      data: {
        title: `${PREFIX} Accessible certificate`,
        issuer: 'W3C',
        issueDate: '2019-01-01',
        expirationDate: '2020-02-01', // shows the red "Expired" badge, which must be readable too
        credentialId: 'A11Y-1',
        verificationUrl: 'https://example.com/verify',
        isPublic: true,
        tags: [`${PREFIX}-A11y`],
      },
    })
    try {
      await page.goto('/admin')
      await expect(
        page.getByRole('link', { name: `${PREFIX} Accessible certificate`, exact: true }),
      ).toBeVisible()
      await expectNoViolations(page, 'list')

      await page.goto('/admin/certificates/new')
      await page.getByRole('button', { name: 'Save' }).click() // show the error messages too
      await expect(page.getByText('Required').first()).toBeVisible()
      await expectNoViolations(page, 'form')

      await page.goto('/admin/settings')
      await expect(page.getByText(`${PREFIX}-A11y`)).toBeVisible()
      await expectNoViolations(page, 'settings')

      const { url } = await catalogLink(page)
      const visitor = await (await browser.newContext({ colorScheme })).newPage()
      await visitor.goto(url)
      await expect(visitor.getByRole('link', { name: /Accessible certificate/ })).toBeVisible()
      await expectNoViolations(visitor, 'catalog')
      await visitor.getByRole('link', { name: /Accessible certificate/ }).click()
      await expect(visitor.getByRole('dialog')).toBeVisible()
      // Let the dialog finish fading in, so colors are measured at full opacity.
      await visitor
        .getByRole('dialog')
        .evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)))
      await expectNoViolations(visitor, 'detail')
      await visitor.goto(`${url}-wrong`)
      await expect(visitor.getByRole('heading', { name: 'Page not found' })).toBeVisible()
      await expectNoViolations(visitor, 'not found')
    } finally {
      await cleanUp(page)
    }
  })
}

test('login works with the keyboard only', async ({ page }) => {
  await page.goto('/login')
  await page.keyboard.press('Tab') // theme toggle or email, depending on autofocus
  await page.getByLabel('Email').focus()
  await page.keyboard.type(process.env.E2E_OWNER_EMAIL ?? '')
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Password')).toBeFocused()
  await page.keyboard.type(process.env.E2E_OWNER_PASSWORD ?? '')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/admin$/)
})
