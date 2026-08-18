import { defineConfig, devices } from '@playwright/test';

// The e2e root is wherever --root put this file. testDir is relative to it, and
// it is the one place that records the layout — personas read it, humans edit it.
export default defineConfig({
  testDir: './src',
  // The JSON report is what aidlc-qa-coverage.mjs reads to build AC evidence.
  reporter: [['list'], ['json', { outputFile: 'playwright-report.json' }]],
  // A red test is a finding (ai/standards/testing-standards.md): no retries
  // locally, and one in CI only to distinguish infrastructure flake from a real
  // failure — never to make a failing assertion eventually pass.
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  use: {
    // Same repo: leave E2E_BASE_URL unset and let webServer below start the app.
    // Separate QA repo: point it at the deployed environment under test.
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /seed\.setup\.ts/ },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: '.auth/user.json' },
    },
  ],
  // Uncomment in a same-repo install so CI has an app to test. Replace the
  // command with whatever starts THIS project — there is no default that is
  // right for every stack.
  // webServer: {
  //   command: 'npm run start',
  //   url: process.env.E2E_BASE_URL ?? 'http://localhost:4200',
  //   reuseExistingServer: !process.env.CI,
  // },
});
