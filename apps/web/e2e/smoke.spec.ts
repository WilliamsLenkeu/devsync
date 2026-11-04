import { expect, test } from '@playwright/test';

const email = `e2e-${Date.now()}@test.dev`;
const password = 'correct-horse-battery';

test.describe('essential flows', () => {
  test('landing → register → create workspace → create project → create task on board', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('link', { name: /get started|sign up|register/i }).first().click();

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^name$/i).fill('E2E User');
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByRole('button', { name: /create|sign up|register/i }).click();
    await page.waitForURL(/\/(app|w\/)/);

    // Workspace select or auto-redirect — ensure we can create one.
    if (page.url().includes('/app')) {
      await page.getByRole('button', { name: /create workspace|new workspace/i }).click();
      await page.getByLabel(/^name$/i).fill('E2E Workspace');
      await page.getByRole('button', { name: /create|save/i }).click();
      await page.waitForURL(/\/w\//);
    }

    await page.getByRole('link', { name: /^projects$/i }).click();
    await page.getByRole('button', { name: /new project|create project/i }).click();
    await page.getByLabel(/^name$/i).fill('E2E App');
    const id = page.getByLabel(/identifier/i);
    if (await id.isVisible()) await id.fill('E2E');
    await page.getByRole('button', { name: /create|save/i }).click();

    // Land on board or overview — open board if needed.
    if (!page.url().includes('/board')) {
      await page.getByRole('link', { name: /board|open board/i }).first().click();
    }
    await expect(page.getByText(/backlog|todo|in progress/i).first()).toBeVisible();

    await page.getByRole('button', { name: /new task|create task/i }).click();
    await page.getByLabel(/^title$/i).fill('Ship e2e smoke');
    await page.getByRole('button', { name: /create|save|add/i }).click();
    await expect(page.getByText('Ship e2e smoke')).toBeVisible();
  });

  test('login rejects bad credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('nobody@test.dev');
    await page.getByLabel(/^password$/i).fill('wrong-password');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible();
  });
});
