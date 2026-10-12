import { expect, test } from '@playwright/test'
import { catalogLink, cleanUp, logIn, PREFIX } from './helpers.ts'

// The public catalog on desktop and on a phone (see the "phone" project in playwright.config.ts).

test('the catalog fits the screen and opens a detail', async ({ page, browser }) => {
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
      title: `${PREFIX} A rather long certificate title that has to wrap on a phone`,
      issuer: 'Oracle',
      issueDate: '2024-06-01',
      isPublic: true,
      tags: [`${PREFIX}-Java`],
    },
  })
  const { url } = await catalogLink(page)

  try {
    const visitor = await (await browser.newContext({ ...test.info().project.use })).newPage()
    await visitor.goto(url)
    const card = visitor.getByRole('link', { name: /A rather long certificate title/ })
    await expect(card).toBeVisible()
    expect(
      await visitor.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)

    await card.click()
    await expect(visitor.getByRole('dialog')).toBeVisible()
    expect(
      await visitor.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await visitor.keyboard.press('Escape')
    await expect(visitor.getByRole('dialog')).toHaveCount(0)
    await expect(visitor).toHaveURL(url)
  } finally {
    await cleanUp(page)
  }
})
