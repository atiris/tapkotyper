import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000,
  // One line per test and the failures in full: a session reads this output, a long list costs it tokens.
  reporter: process.env.CI ? 'list' : 'line',
  use: { baseURL: 'http://localhost:4173/', viewport: { width: 1366, height: 768 } },
  // The e2e build (`--mode e2e`) reads `?minActive=` so tests need not play two minutes per level.
  // `--configLoader runner`: the default loader prints a hundred lines of hints on every start.
  webServer: { command: 'npx tsc --noEmit && npx vite build --configLoader runner --mode e2e --outDir .e2e/dist && npx vite preview --configLoader runner --outDir .e2e/dist --port 4173 --strictPort', url: 'http://localhost:4173/', reuseExistingServer: true, timeout: 120_000 },
});
