import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({
  server: { host: '127.0.0.1', port: 0 },
  logLevel: 'silent',
});
await server.listen();
const port = server.httpServer.address().port;
const url = `http://127.0.0.1:${port}`;

const executablePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });

try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const input = page.getByLabel(/Tulis apa yang mau kamu lakukan/i);
  await input.fill('buat RAB rumah tipe 45 dua lantai');
  await input.press('Enter');
  await page.getByRole('heading', { level: 1, name: /Rumah 45/ }).waitFor();

  await page.getByRole('button', { name: /Editor denah/i }).first().click();
  const svg = page.locator('svg[role="application"]');
  await svg.waitFor();

  const vbBefore = await svg.getAttribute('viewBox');
  const firstRoom = svg.locator('g[role="button"]').first();
  const secondRoom = svg.locator('g[role="button"]').nth(1);
  const firstLabel = await firstRoom.getAttribute('aria-label');
  const firstRoomName = (firstLabel || '').split(',')[0];
  const trackedRoom = svg.locator(`g[role="button"][aria-label^="${firstRoomName},"]`).first();
  const roomPolyBefore = await firstRoom.locator('polygon').getAttribute('points');
  const box = await firstRoom.boundingBox();
  const box2 = await secondRoom.boundingBox();
  assert.ok(box && box2, 'Room boundingBox must exist');

  // Drag first room to second room's center using real mouse down -> move -> up
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2, { steps: 10 });
  await page.mouse.up();

  const vbAfterRoomDrag = await svg.getAttribute('viewBox');
  const roomPolyAfterDrag = await trackedRoom.locator('polygon').getAttribute('points');
  assert.equal(vbAfterRoomDrag, vbBefore, 'Canvas viewBox must NOT pan when dragging a room');
  assert.notEqual(roomPolyAfterDrag, roomPolyBefore, 'Room polygon points must change after drag');

  // Pan empty canvas background
  const svgBox = await svg.boundingBox();
  assert.ok(svgBox, 'SVG boundingBox must exist');
  await page.mouse.move(svgBox.x + 15, svgBox.y + 15);
  await page.mouse.down();
  await page.mouse.move(svgBox.x + 75, svgBox.y + 55, { steps: 6 });
  await page.mouse.up();
  const vbAfterPan = await svg.getAttribute('viewBox');
  assert.notEqual(vbAfterPan, vbAfterRoomDrag, 'Canvas viewBox MUST pan when dragging empty background');

  assert.deepEqual(errors, [], 'No uncaught page errors');
  console.log(JSON.stringify({
    status: 'PASS',
    vbBefore,
    vbAfterRoomDrag,
    roomMoved: roomPolyBefore !== roomPolyAfterDrag,
    canvasPannedOnRoomDrag: vbBefore !== vbAfterRoomDrag,
    canvasPannedOnBackground: vbAfterPan !== vbAfterRoomDrag,
  }, null, 2));
  await page.close();

  // Mobile 360x800 overflow check
  const mob = await browser.newPage({ viewport: { width: 360, height: 800 }, reducedMotion: 'reduce' });
  mob.setDefaultTimeout(30000);
  await mob.goto(url, { waitUntil: 'domcontentloaded' });
  await mob.getByLabel(/Tulis apa yang mau kamu lakukan/i).waitFor();
  const overflowHome = await mob.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.equal(overflowHome, 0, 'No horizontal overflow on 360px mobile');
  console.log(JSON.stringify({ overflowHome }));
  await mob.close();
} finally {
  await browser.close();
  await server.close();
}
