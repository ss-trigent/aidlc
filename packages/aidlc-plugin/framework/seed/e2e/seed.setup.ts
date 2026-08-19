import { test as setup, expect } from '@playwright/test';

// Deterministic tests need a known starting state (ai/standards/testing-standards.md).
// This runs once before the suite and saves an authenticated session the specs
// reuse, so no test carries login steps that are not part of its criterion.
//
// Credentials come from the environment. Nothing instance-specific is committed —
// same rule the Jira integration follows.
const FILE = '.auth/user.json';

setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_USER;
  const password = process.env.E2E_PASSWORD;
  expect(
    email && password,
    'set E2E_USER and E2E_PASSWORD — a seeded account this suite may use',
  ).toBeTruthy();

  // Replace the selectors and the route with this product's sign-in screen.
  await page.goto('/login');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login/);

  await page.context().storageState({ path: FILE });
});
