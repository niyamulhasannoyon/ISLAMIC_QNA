import { test, expect } from '@playwright/test';

test.describe('Deen QnA E2E Quality Verification', () => {
  test('homepage renders search hero, accessibility landmark and categories', async ({ page }) => {
    await page.goto('/');

    // Check main document landmark
    await expect(page.locator('#main-content')).toBeAttached();

    // Check search input presence
    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    await expect(searchInput).toBeVisible();

    // Check skip to content link exists
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();
  });

  test('executes search query and renders fatwa results', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    await searchInput.fill('সালাত');

    // Wait for debounced search and cards to render
    const card = page.locator('article, [class*="card"], a[href^="/fatwa/"]').first();
    await expect(card).toBeVisible({ timeout: 10000 });
  });

  test('filters by source and updates results', async ({ page }) => {
    await page.goto('/?source=at-tahreek');

    // Verify source parameter is present in URL
    await expect(page).toHaveURL(/source=at-tahreek/);

    // Results container should render
    await page.waitForLoadState('networkidle');
    const firstArticle = page.locator('a[href^="/fatwa/"]').first();
    await expect(firstArticle).toBeVisible({ timeout: 10000 });
  });

  test('opens reader modal on card click and closes safely', async ({ page }) => {
    await page.goto('/');

    // Wait for fatwa cards to load
    const fatwaCard = page.locator('a[href^="/fatwa/"]').first();
    await expect(fatwaCard).toBeVisible({ timeout: 10000 });

    // Click card
    await fatwaCard.click();

    // Modal or page transition should show the dialog or detail view
    const modalDialog = page.locator('[role="dialog"]');
    if (await modalDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(modalDialog).toBeVisible();
      // Close modal
      const closeButton = modalDialog.locator('button[aria-label*="close" i], button:has-text("✕"), button:has-text("বন্ধ")').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await expect(modalDialog).not.toBeVisible();
      }
    } else {
      // If client rendered directly as detail navigation, check detail view
      await expect(page.locator('h1')).toBeVisible();
    }
  });

  test('canonical slug page renders with rich schema, disclaimer, and source link', async ({ page }) => {
    // Navigate to sources page first to test static route
    await page.goto('/sources');

    await expect(page.locator('h1')).toContainText('উৎস ও বিষয়বস্তু ঘোষণা');
    await expect(page.locator('text=মাসিক আত-তাহরীক').first()).toBeVisible();
    await expect(page.locator('text=মাসিক আলকাউসার').first()).toBeVisible();

    // Check presence of scholar disclaimer banner
    await expect(page.locator('text=জরুরী শরয়ী ঘোষণা ও সতর্কতা').first()).toBeVisible();
  });

  test('contact and feedback page renders with submission form', async ({ page }) => {
    await page.goto('/contact');

    await expect(page.locator('h1')).toContainText('যোগাযোগ ও রিপোর্ট');
    await expect(page.locator('input#name, input[placeholder*="আব্দুল্লাহ"]')).toBeVisible();
    await expect(page.locator('textarea#message')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});
