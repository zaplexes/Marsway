import { Buffer } from 'node:buffer';
import { expect, test } from '@playwright/test';
import {
  emptyInput,
  expeditionFromPlan,
  initialRover,
  practiceExpedition,
  scanCheckpoint,
  stepRover,
} from '../src/game/expedition';
import {
  emptyMission,
  TRIP_VERSION,
  type TripDraft,
} from '../src/planning/trip';
import { mockWorldTiles } from './mock-world-tiles';

const draft: TripDraft = {
  schemaVersion: 1,
  modelVersion: TRIP_VERSION,
  base: { latitude: 0, longitude: 179 },
  mission: { ...emptyMission },
  stops: [
    {
      id: 'one',
      name: 'First destination',
      latitude: 0,
      longitude: -179,
      reference: 'catalogue-centre',
      sourceUrl: 'https://example.org/one',
      tasks: ['Review layered rocks'],
      completed: [false],
      workMinutes: '',
    },
    {
      id: 'two',
      name: 'Second destination',
      latitude: 85,
      longitude: 50,
      reference: 'catalogue-centre',
      sourceUrl: 'https://example.org/two',
      tasks: ['Review panorama'],
      completed: [false],
      workMinutes: '',
    },
  ],
};

test('game arenas preserve planned order and return without modifying plan or task state', () => {
  const before = JSON.stringify(draft);
  const expedition = expeditionFromPlan(draft)!;
  expect(expedition.points.map((p) => p.name)).toEqual([
    'Your base',
    'First destination',
    'Second destination',
    'Your base',
  ]);
  expect(
    expedition.points.every(
      (p) => Number.isFinite(p.x) && Number.isFinite(p.z),
    ),
  ).toBe(true);
  expect(expedition.points.at(-1)).toEqual(expedition.points[0]);
  const state = initialRover(expedition);
  expect(scanCheckpoint(state)).toEqual(state);
  const input = { ...emptyInput(), forward: true };
  expect(stepRover(state, input, 10, expedition, false)).toEqual(
    stepRover(state, input, 0.05, expedition, false),
  );
  let rover = state;
  for (let i = 0; i < 10000 && rover.phase !== 'complete'; i++) {
    rover = stepRover(rover, emptyInput(), 0.05, expedition, true);
    if (rover.phase === 'arrived') rover = scanCheckpoint(rover);
  }
  expect(rover.phase).toBe('complete');
  expect(rover.scans).toBe(2);
  expect(JSON.stringify(draft)).toBe(before);
  expect(expeditionFromPlan({ ...draft, base: null })).toBeNull();
  expect(expeditionFromPlan({ ...draft, stops: [] })).toBeNull();
  expect(
    expeditionFromPlan({ ...draft, base: { latitude: 91, longitude: 0 } }),
  ).toBeNull();
  expect(practiceExpedition().kind).toBe('practice');
});

test.beforeEach(async ({ page }) => {
  await mockWorldTiles(page);
});

test('drive, pause, scan every practice checkpoint and return to base', async ({
  page,
}) => {
  test.setTimeout(65000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const launcher = page.getByRole('region', { name: 'Rover expedition game' });
  await expect(
    launcher.getByRole('button', { name: 'Drive my plan' }),
  ).toBeDisabled();
  await launcher
    .getByRole('button', { name: 'Start practice mission' })
    .click();
  const game = page.getByRole('dialog');
  const canvas = game.locator('canvas');
  await expect(canvas).toBeFocused();
  await expect(game).toContainText('Copper crater');
  const initialScroll = await game.evaluate((node) => node.scrollTop);
  await page.keyboard.down('Space');
  await page.keyboard.down('Space');
  await page.keyboard.up('Space');
  await page.waitForTimeout(200);
  expect(await game.evaluate((node) => node.scrollTop)).toBe(initialScroll);
  const start = await canvas.getAttribute('data-z');
  await page.keyboard.down('w');
  await page.waitForTimeout(500);
  await page.keyboard.up('w');
  await expect(canvas).not.toHaveAttribute('data-z', start!);
  await game.getByRole('button', { name: 'Pause', exact: true }).click();
  const paused = await canvas.getAttribute('data-z');
  await page.waitForTimeout(250);
  await expect(canvas).toHaveAttribute('data-z', paused!);
  await game.getByRole('button', { name: 'Resume driving' }).click();
  await game.getByRole('button', { name: 'Route assist: off' }).click();
  await game.screenshot({ path: 'docs/rover-expedition-desktop.png' });
  for (let stop = 0; stop < 3; stop++) {
    const scan = game.getByRole('button', { name: /Scan checkpoint/ });
    try {
      await expect(scan).toBeEnabled({ timeout: 20000 });
    } catch {
      throw new Error(`Checkpoint ${stop}: ${await game.innerText()}`);
    }
    await scan.click();
  }
  await expect(canvas).toHaveAttribute('data-phase', 'complete', {
    timeout: 15000,
  });
  await expect(game).toContainText('One dusty adventure, complete.');
  await game.getByText('Expedition journal', { exact: false }).click();
  await expect(game.locator('.game-journal li')).toHaveCount(3);
  await game.getByRole('button', { name: 'Drive it again' }).click();
  await expect(canvas).toHaveAttribute('data-phase', 'driving');
  await expect(game).toContainText('0 / 3');
  await page.keyboard.press('Escape');
  await expect(game).toHaveCount(0);
  await expect(
    launcher.getByRole('button', { name: 'Start practice mission' }),
  ).toBeFocused();
  expect(errors).toEqual([]);
});

test('mobile touch controls and imported plan use an independent expedition snapshot', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // The arcade renderer is independent of WebGL and orbital imagery delivery.
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      kind: string,
      ...args: unknown[]
    ) {
      if (kind === 'webgl' || kind === 'webgl2') return null;
      return Reflect.apply(get, this, [kind, ...args]);
    } as typeof get;
  });
  await page.goto('/');
  await page.getByLabel('Import plan JSON').setInputFiles({
    name: 'game-plan.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(draft)),
  });
  await page.getByRole('button', { name: 'Drive my plan' }).click();
  const game = page.getByRole('dialog');
  const canvas = game.locator('canvas');
  await expect(game).toContainText('YOUR PLAN / ARCADE EXPEDITION');
  await expect(game).toContainText('First destination');
  await expect(game).toContainText('0 / 2');
  const forward = game.getByRole('button', {
    name: 'Drive forward',
    exact: true,
  });
  // Real pointer events exercise pointer capture on mouse and touch alike.
  await forward.hover();
  await page.mouse.down();
  await page.waitForTimeout(350);
  await page.mouse.up();
  expect(
    Math.abs(Number(await canvas.getAttribute('data-x'))) +
      Math.abs(Number(await canvas.getAttribute('data-z'))),
  ).toBeGreaterThan(0);
  await game.getByRole('button', { name: 'Pause', exact: true }).click();
  await game.getByRole('button', { name: 'Resume driving' }).click();
  await game.screenshot({ path: 'docs/rover-expedition-mobile.png' });
  expect(
    await game.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await game.getByRole('button', { name: 'Close expedition game' }).click();
  await expect(page.locator('.trip-stops > li')).toHaveCount(2);
  await expect(page.locator('.trip-task input').first()).not.toBeChecked();
});

test('unavailable canvas has a recoverable exit and restores page scrolling', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      kind: string,
      ...args: unknown[]
    ) {
      if (kind === '2d') return null;
      return Reflect.apply(get, this, [kind, ...args]);
    } as typeof get;
  });
  await page.goto('/');
  const launcher = page.getByRole('button', { name: 'Start practice mission' });
  await launcher.click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'Canvas rendering is unavailable',
  );
  await page
    .getByRole('button', { name: 'Return to planner', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(launcher).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    'hidden',
  );
});
