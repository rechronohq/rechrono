import { defineConfig } from '@playwright/test';
import { buildE2EEnv, E2E_BASE_URL } from './tests/e2e/environment.js';

const cwd = process.cwd();

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false,
    retries: 0,
    timeout: 30_000,
    use: {
        baseURL: E2E_BASE_URL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    globalSetup: './tests/e2e/global-setup.js',
    webServer: {
        command: 'php artisan serve --env=testing --host=127.0.0.1 --port=4010',
        env: buildE2EEnv(cwd),
        reuseExistingServer: false,
        timeout: 120_000,
        url: E2E_BASE_URL,
    },
});
