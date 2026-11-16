// AI-assisted project code. See AI-USE.md and assets/ai-disclosure.json.
import { expect, test } from '@playwright/test';

test('AI identification remains visible in the app and its independent arcade session', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  await expect(
    page.getByRole('complementary', { name: 'AI assistance disclosure' }),
  ).toBeVisible();
  await expect(page.locator('.brand .ai-logo-mark')).toHaveText(
    'AI-GENERATED LOGO',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('link', { name: 'Play rover' }).click();
  await page.getByRole('button', { name: 'Start practice mission' }).click();
  await expect(
    page
      .getByRole('dialog')
      .getByText('AI-ASSISTED GAME / FICTIONAL TERRAIN / SCHEMATIC ROUTE'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close expedition game' }).click();
  await page.locator('#ai-use').scrollIntoViewIfNeeded();
  await expect(
    page.getByRole('region', { name: 'Project AI use' }),
  ).toContainText(
    'NASA and partner imagery and source records retain their original credits.',
  );
  await page.screenshot({ path: 'docs/ai-disclosure-mobile.png' });
});
