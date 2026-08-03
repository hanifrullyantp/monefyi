import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('shows STAY landing at /stay/', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Kelola Penginapan Anda/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Profesional').first()).toBeVisible();
  });

  test('CTA navigates to login', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Masuk/i }).first().click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Login flow', () => {
  test('mock demo login redirects to front desk', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-email').fill('owner@stay.com');
    await page.getByTestId('login-password').fill('demo123');
    await page.getByTestId('login-submit').click();

    await expect(page).toHaveURL(/\/front-desk/);
    await expect(page.getByText(/Front Desk|KASIR/i).first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Navigation after login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-email').fill('receptionist@stay.com');
    await page.getByTestId('login-password').fill('demo123');
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/front-desk/);
  });

  test('can open bookings page', async ({ page }) => {
    await page.getByTestId('nav-bookings').click();
    await expect(page).toHaveURL(/\/bookings/);
    await expect(page.getByTestId('bookings-page')).toBeVisible();
    await expect(page.getByTestId('new-booking-btn')).toBeVisible();
  });

  test('can open POS page and see payment grid', async ({ page }) => {
    await page.getByTestId('nav-pos').click();
    await expect(page).toHaveURL(/\/pos/);
    await expect(page.getByText(/KASIR \/ POS/i)).toBeVisible();
    await expect(page.getByText('TUNAI')).toBeVisible();
    await expect(page.getByText('QRIS')).toBeVisible();
  });

  test('AI assistant responds to quick prompt', async ({ page }) => {
    await page.getByTestId('ai-assistant-toggle').click();
    await expect(page.getByTestId('ai-assistant-panel')).toBeVisible();
    await page.getByRole('button', { name: 'Pendapatan' }).click();
    await expect(page.getByText(/pendapatan/i).first()).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('Denah Kamar floor plan', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-email').fill('owner@stay.com');
    await page.getByTestId('login-password').fill('demo123');
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/front-desk/);
  });

  test('shows rooms on denah canvas or allows auto-layout', async ({ page }) => {
    await page.getByTestId('denah-view-btn').click();
    await expect(page.getByTestId('denah-canvas')).toBeVisible();

    const placedRoom = page.locator('[data-testid^="denah-room-"]').first();
    const emptyState = page.getByTestId('denah-empty-state');

    if (await placedRoom.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await expect(placedRoom).toBeVisible();
      return;
    }

    await expect(emptyState).toBeVisible();
    await page.getByTestId('denah-auto-layout-btn').click();
    await expect(page.locator('[data-testid^="denah-room-"]').first()).toBeVisible({ timeout: 5_000 });
  });
});
