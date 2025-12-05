import { test, expect } from '@playwright/test'
test('login e navegação', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[name="email"]', 'user@example.com')
  await page.fill('input[name="password"]', 'secret')
  await page.click('button:has-text("Entrar")')
  await page.waitForURL('/home')
  await expect(page.locator('text=APOSTAS')).toBeVisible()
})