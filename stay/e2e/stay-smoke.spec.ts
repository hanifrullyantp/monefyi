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

test.describe('Front Desk views', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-email').fill('owner@stay.com');
    await page.getByTestId('login-password').fill('demo123');
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/front-desk/);
  });

  test('switches between grid, floor plan, and timeline', async ({ page }) => {
    await expect(page.getByTestId('receptionist-dashboard')).toBeVisible();
    await expect(page.getByTestId('room-grid-view')).toBeVisible();

    await page.getByTestId('view-mode-floorplan').click();
    await expect(page.getByTestId('floor-plan-view')).toBeVisible();

    await page.getByTestId('view-mode-timeline').click();
    await expect(page.getByTestId('frontdesk-timeline-view')).toBeVisible();

    await page.getByTestId('view-mode-grid').click();
    await expect(page.getByTestId('room-grid-view')).toBeVisible();
  });

  test('floor plan shows canvas or auto-layout', async ({ page }) => {
    await page.getByTestId('view-mode-floorplan').click();
    await expect(page.getByTestId('floor-plan-view')).toBeVisible();

    const roomShape = page.locator('[data-testid^="floor-room-"]').first();
    const autoLayout = page.getByTestId('floorplan-auto-layout');

    if (await roomShape.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await expect(roomShape).toBeVisible();
      return;
    }

    if (await autoLayout.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await autoLayout.click();
      await expect(page.locator('[data-testid^="floor-room-"]').first()).toBeVisible({
        timeout: 5_000,
      });
    } else {
      await expect(page.getByTestId('floor-canvas')).toBeVisible();
    }
  });

  test('occupied room opens detail panel and records payment', async ({ page }) => {
    await expect(page.getByTestId('room-grid-view')).toBeVisible();

    await page.getByTestId('room-card-201').click();
    await expect(page.getByTestId('room-detail-panel')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('201').first()).toBeVisible();

    await page.getByRole('button', { name: 'Terima Pembayaran' }).first().click();
    await expect(page.getByTestId('room-payment-modal')).toBeVisible();

    await page.getByTestId('room-payment-submit').click();
    await expect(page.getByTestId('frontdesk-toast-success')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId('frontdesk-toast-success')).toContainText(/Pembayaran/i);
  });
});
