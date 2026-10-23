import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000,
  use: { baseURL: 'http://localhost:4173/tapkotyper/', viewport: { width: 1366, height: 768 } },
  // The e2e build (`--mode e2e`) reads `?minActive=` so tests need not play two minutes per level.
  webServer: { command: 'npx tsc --noEmit && npx vite build --mode e2e --outDir .e2e/dist && npx vite preview --outDir .e2e/dist --port 4173 --strictPort', url: 'http://localhost:4173/tapkotyper/', reuseExistingServer: true, timeout: 120_000 },
});
