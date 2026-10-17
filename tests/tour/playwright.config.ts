import { defineConfig } from '@playwright/test';

/**
 * Screenshot tour for visual review (`npm run tour`): not a CI gate. Builds nothing itself; run
 * `npm run build:test` first (the npm script does). Output: test-results/tour/*.png and the
 * contact sheets from scripts/tour-sheet.mjs.
 */
export default defineConfig({
  testDir: '.',
  timeout: 240_000,
  expect: { timeout: 20_000 },
  workers: 2,
  reporter: [['list']],
  outputDir: '../../test-results/tour-run',
  use: {
    baseURL: 'http://127.0.0.1:4173/',
    headless: true,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    launchOptions: {
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--autoplay-policy=no-user-gesture-required',
      ],
    },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
