import { test, expect } from '@playwright/test';

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

  test('AI assistant responds to quick prompt', async ({ page }) => {
    await page.getByTestId('ai-assistant-toggle').click();
    await expect(page.getByTestId('ai-assistant-panel')).toBeVisible();
    await page.getByRole('button', { name: 'Pendapatan' }).click();
    await expect(page.getByText(/pendapatan/i).first()).toBeVisible({ timeout: 8_000 });
  });
});
