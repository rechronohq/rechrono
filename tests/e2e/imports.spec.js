import { expect, test } from '@playwright/test';

import { login } from './helpers/app';

test('imports page renders outside the primary app navigation', async ({ page }) => {
    await login(page);

    await page.goto('/imports');

    await expect(page.getByTestId('app-shell')).toBeVisible();
    await expect(page.getByTestId('app-context-bar-title')).toHaveText('Imports');
    await expect(page.getByTestId('app-shell-body').getByRole('heading', { name: 'Imports' })).toBeVisible();
    await expect(page.getByTestId('app-shell-sidebar').getByRole('link', { name: 'Imports' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Hive CSV' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import Hive CSV' })).toBeVisible();
});

test('imports page imports a Hive CSV', async ({ page }) => {
    await login(page);

    await page.route('**/imports/hive', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                root_project_count: 2,
                subproject_count: 0,
                task_count: 3,
                matched_assignee_count: 1,
                matched_assignees: [{ name: 'Planner Admin Two' }],
                unmatched_assignee_names: ['Unknown Person'],
                skipped_row_count: 0,
                warnings: ['Row 3 (Execute QA): Unresolved parent task "qa prep".'],
                root_project_ids: ['imported-root', 'imported-qa'],
                project_ids: ['imported-root', 'imported-qa'],
            }),
        });
    });

    await page.goto('/imports');
    await page.getByRole('button', { name: 'Import Hive CSV' }).click();
    await expect(page.getByRole('heading', { name: 'Import Hive CSV' })).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({
        name: 'hive-import.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('ID,Title\n1,Launch planning\n'),
    });

    await page.getByRole('button', { name: 'Import' }).last().click();

    await expect(page.getByText('2 root projects')).toBeVisible();
    await expect(page.getByText('0 subprojects')).toBeVisible();
    await expect(page.getByText('3 tasks')).toBeVisible();
    await expect(page.getByText('1 matched assignee')).toBeVisible();
    await expect(page.getByText('Unknown Person')).toBeVisible();
    await expect(page.getByText('Row 3 (Execute QA): Unresolved parent task "qa prep".')).toBeVisible();
    await expect(page.getByText('Projects refreshed with imported Hive data.')).toBeVisible();
    await expect(page.locator('input[type="file"]')).toHaveJSProperty('files.length', 0);
    await expect(page.getByRole('button', { name: 'Import' }).last()).toBeDisabled();
});

test('imports page Hive import shows inline validation errors', async ({ page }) => {
    await login(page);

    await page.route('**/imports/hive', async (route) => {
        await route.fulfill({
            status: 422,
            contentType: 'application/json',
            body: JSON.stringify({
                message: 'The provided file could not be parsed.',
                errors: {
                    file: ['Hive CSV headers are missing required columns.'],
                },
            }),
        });
    });

    await page.goto('/imports');
    await page.getByRole('button', { name: 'Import Hive CSV' }).click();
    await page.locator('input[type="file"]').setInputFiles({
        name: 'broken.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('Title\nBroken row\n'),
    });

    await page.getByRole('button', { name: 'Import' }).last().click();

    await expect(page.getByText('Hive CSV headers are missing required columns.')).toBeVisible();
});

test('imports page Hive import rejects unexpected non-json success responses', async ({ page }) => {
    await login(page);

    await page.route('**/imports/hive', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'text/plain',
            body: 'ok',
        });
    });

    await page.goto('/imports');
    await page.getByRole('button', { name: 'Import Hive CSV' }).click();
    await page.locator('input[type="file"]').setInputFiles({
        name: 'broken-success.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('ID,Title\n1,Launch planning\n'),
    });

    await page.getByRole('button', { name: 'Import' }).last().click();

    await expect(page.getByText('Expected a JSON response from the app API.')).toBeVisible();
});

test('imports page Hive import stays open during an in-flight request', async ({ page }) => {
    await login(page);

    let releaseImport;
    const importReady = new Promise((resolve) => {
        releaseImport = resolve;
    });

    await page.route('**/imports/hive', async (route) => {
        await importReady;
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                root_project_count: 1,
                subproject_count: 0,
                task_count: 1,
                matched_assignee_count: 0,
                matched_assignees: [],
                unmatched_assignee_names: [],
                skipped_row_count: 0,
                warnings: [],
                root_project_ids: ['imported-root'],
                project_ids: ['imported-root'],
            }),
        });
    });

    await page.goto('/imports');
    await page.getByRole('button', { name: 'Import Hive CSV' }).click();
    await page.locator('input[type="file"]').setInputFiles({
        name: 'slow.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('ID,Title\n1,Launch planning\n'),
    });

    await page.getByRole('button', { name: 'Import' }).last().click();
    await page.keyboard.press('Escape');
    await page.mouse.click(5, 5);
    await expect(page.getByRole('heading', { name: 'Import Hive CSV' })).toBeVisible();

    releaseImport();
    await expect(page.getByText('1 root project')).toBeVisible();
});
