// AI-assisted project code. See AI-USE.md and assets/ai-disclosure.json.
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import console from 'node:console';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';

const root = resolve('artifacts/marsway-video-updated');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  recordVideo: { dir: `${root}/raw`, size: { width: 1920, height: 1080 } },
});
const anchor = performance.now();
const page = await context.newPage();
const scenes = [];
const pause = (ms) => page.waitForTimeout(ms);
const scroll = async (locator) => {
  await locator.scrollIntoViewIfNeeded();
  await pause(700);
};
async function scene(name, action, focus = null) {
  const start = (performance.now() - anchor) / 1000;
  await page.screenshot({ path: `${root}/raw/${name}.png` });
  await action();
  const end = (performance.now() - anchor) / 1000;
  scenes.push({ name, start, duration: end - start, focus });
  await writeFile(
    `${root}/raw/scenes.json`,
    `${JSON.stringify(scenes, null, 2)}\n`,
  );
  console.log(name, start, end);
}
try {
  await page.goto('https://zaplexes.github.io/Marsway/', {
    waitUntil: 'networkidle',
  });
  const skip = page.getByRole('button', { name: 'Skip tutorial' });
  if (await skip.isVisible()) await skip.click();
  await pause(2500);
  await scroll(page.locator('#exploration-map'));
  await scene('01-globe', async () => {
    const canvas = page.locator('.map-host canvas').first();
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.43, box.y + box.height * 0.5, {
      steps: 70,
    });
    await page.mouse.up();
    await pause(3000);
  });
  await page.getByRole('button', { name: /Jezero view/ }).click();
  await pause(8000);
  await scene('02-imagery', async () => {
    await pause(1500);
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await pause(3500);
  });
  await page.getByText('Enter coordinates instead', { exact: true }).click();
  await page.getByLabel('Base latitude').fill('18.4446');
  await page.getByLabel('Base longitude').fill('77.4509');
  await page.getByRole('button', { name: 'Set base coordinates' }).click();
  await page.getByRole('link', { name: /Compare destinations/ }).click();
  const calc = page.locator('#destination-calculator');
  await calc.getByLabel('Search radius').fill('1000');
  await page.locator('.destination-results > li').first().waitFor();
  await calc
    .locator('.destination-results > li')
    .first()
    .evaluate((element) => element.scrollIntoView({ block: 'start' }));
  await pause(800);
  const comparisonFocus = await calc
    .locator('.destination-results > li')
    .first()
    .boundingBox();
  await scene(
    '03-compare',
    async () => {
      await pause(1400);
      await calc
        .locator('.destination-results > li')
        .first()
        .getByText('Why this score?', { exact: true })
        .click();
      await pause(3200);
    },
    comparisonFocus,
  );
  await calc.getByText('Scoring rules & preferences', { exact: true }).click();
  await calc
    .getByText('Study interest by feature type', { exact: true })
    .click();
  const interest = calc.getByLabel('Crater, craters study interest (%)', {
    exact: true,
  });
  await scroll(interest);
  const interestFocus = await interest.locator('..').boundingBox();
  await scene(
    '04-interests',
    async () => {
      await pause(900);
      await interest.fill('80');
      await pause(1800);
    },
    interestFocus,
  );
  await calc.getByText('Scoring rules & preferences', { exact: true }).click();
  await calc
    .locator('.destination-results > li')
    .first()
    .getByRole('button')
    .click();
  await pause(4500);
  await page.getByRole('link', { name: /Inspect this destination/ }).click();
  await pause(1000);
  await scene('05-evidence', async () => {
    await pause(1800);
    await page.mouse.wheel(0, 300);
    await pause(2800);
  });
  await page
    .getByRole('button', { name: 'Add selected destination to trip' })
    .click();
  const trip = page.getByRole('region', { name: 'Round-trip planner' });
  await scroll(trip.locator('header'));
  await scene('06-trip', async () => {
    await pause(1800);
    await page.mouse.wheel(0, 190);
    await pause(3000);
  });
  await page.getByRole('button', { name: /Drive my plan/ }).click();
  const game = page.getByRole('dialog');
  const canvas = game.locator('canvas');
  await canvas.waitFor();
  await pause(700);
  const gameFocus = await game.boundingBox();
  await scene(
    '07-game-drive',
    async () => {
      await canvas.focus();
      await page.keyboard.down('w');
      await expect(canvas).toHaveAttribute('data-phase', 'arrived', {
        timeout: 60000,
      });
      await page.keyboard.up('w');
    },
    gameFocus,
  );
  await scene(
    '08-game-scan',
    async () => {
      await pause(600);
      await page.keyboard.press('Space');
      await pause(800);
      await game.getByRole('button', { name: 'Route assist: off' }).click();
      await pause(3200);
    },
    gameFocus,
  );
  await writeFile(
    `${root}/raw/page-text.txt`,
    await page.locator('body').innerText(),
  );
} finally {
  const video = page.video();
  await context.close();
  await video.saveAs(`${root}/raw/browser.webm`);
  await browser.close();
}
