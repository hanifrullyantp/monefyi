import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { preview } from 'vite';

const dir = 'reports/phase-1';
await mkdir(dir, { recursive: true });
const app = await preview({ configFile: false, logLevel: 'silent', preview: { host: '127.0.0.1', port: 0 } });
const port = app.httpServer.address().port;
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const results = [];
try {
  for (const size of [{ width: 1366, height: 900 }, { width: 360, height: 800 }]) {
    const page = await browser.newPage({ viewport: size, reducedMotion: 'reduce' });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const widths = {};
    const checkWidth = async key => {
      widths[key] = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.equal(widths[key], 0, `Overflow ${key} @ ${size.width}`);
    };
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'domcontentloaded' });
    await page.locator('.studio-model img').first().waitFor();
    await page.locator('.card-price').first().waitFor();
    await checkWidth('workspace');
    await page.screenshot({ path: `${dir}/workspace-${size.width === 360 ? 'mobile' : 'desktop'}.png` });
    await page.getByRole('button', { name: 'RAB detail', exact: true }).click();
    assert.equal(await page.locator('.studio-project').count(), 1);
    await page.getByRole('button', { name: 'Semua', exact: true }).click();
    await page.getByLabel('Cari proyek', { exact: true }).fill('Andi');
    assert.equal(await page.locator('.studio-project').count(), 1);
    await page.getByLabel('Cari proyek', { exact: true }).fill('');
    await page.getByRole('button', { name: 'Lihat rekap anggaran' }).click();
    await page.getByRole('dialog').getByRole('button', { name: /^Rumah Bapak Andi/ }).click();
    const money = async label => {
      const rows = page.locator('#rab-ringkasan dl > div');
      const row = rows.filter({ has: page.getByText(label, { exact: true }) });
      return Number((await row.locator('dd').innerText()).replace(/\D/g, ''));
    };
    const grand = await money('Total dibayar pembeli');
    const net = await money('Harga jual sebelum PPN');
    const vat = await money('PPN');
    assert.equal(grand, net + vat);
    await checkWidth('rincian');
    await page.getByRole('button', { name: 'Proyek', exact: true }).first().click();
    await page.locator('#total-title').waitFor();
    await page.getByRole('button', { name: /^PPN .*aktif/ }).click();
    await page.waitForFunction(value => Number(document.querySelector('#total-title')?.textContent.replace(/\D/g, '')) === value, net);
    await page.getByRole('button', { name: /^PPN .*nonaktif/ }).click();
    await page.waitForFunction(value => Number(document.querySelector('#total-title')?.textContent.replace(/\D/g, '')) === value, grand);
    await checkWidth('proyek');
    await page.getByRole('button', { name: 'Planner harga', exact: true }).first().click();
    await page.locator('#t-sellingPrice').fill('139016400');
    await page.waitForFunction(() => document.querySelector('#t-rap')?.value === '110240000');
    await checkWidth('planner');
    await page.getByRole('button', { name: 'Buka menu modul' }).click();
    await page.getByRole('menuitem', { name: /^Pengaturan/ }).click();
    await page.getByRole('button', { name: /^Faktor harga bahan/ }).click();
    await page.getByLabel('Standar', { exact: true }).fill('1.1');
    await page.getByRole('button', { name: 'Simpan faktor' }).click();
    await page.getByRole('button', { name: /^Faktor harga bahan/ }).click();
    assert.equal(await page.getByLabel('Standar', { exact: true }).inputValue(), '1.1');
    await checkWidth('faktorBahan');
    await page.getByRole('button', {name:'Batal', exact:true}).click();
    await page.getByRole('button', {name:'Proyek',exact:true}).click();
    await page.waitForFunction(n => Number(document.querySelector('.card-price')?.textContent.replace(/\D/g, '')) > n, grand);
    const afterMaterialEdit = Number((await page.locator('.card-price').first().innerText()).replace(/\D/g, ''));
    assert.deepEqual(errors, []);
    results.push({ viewport: size, overflow: widths, buyerTotal: grand, afterMaterialEdit, saleExTax: net, vat, targetRap: 110240000,
      filter: 'lulus', taxToggle: 'lulus', factorEditor: 'lulus', pageErrors: errors });
    console.log(JSON.stringify(results.at(-1)));
    await page.close();
  }
  await writeFile(`${dir}/browser.json`, JSON.stringify({ browser: browser.version(), results }, null, 2) + '\n');
} finally {
  await browser.close();
  await new Promise(resolve => app.httpServer.close(resolve));
}