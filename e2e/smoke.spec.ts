import { test, expect } from '@playwright/test';

test('home page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/qwk/i);
});

test('shows BBS wizard when no servers exist', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'BBS Wizard' })).toBeVisible();
  await expect(
    page.getByText("It looks like you haven't set up any BBS subcriptions yet."),
  ).toBeVisible();
});
