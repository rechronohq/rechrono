import { expect, test } from '@playwright/test';

import { login } from './helpers/app';

test('clients use project-style list and detail layouts', async ({ page }) => {
    await login(page);
    await page.goto('/clients');

    await expect(page.getByTestId('clients-table')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New client' })).toBeVisible();
    await expect(page.getByLabel('Client name')).toHaveCount(0);

    await page.getByRole('button', { name: 'New client' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('Client name').fill('Project-style client');
    await page.getByRole('button', { name: 'Create client' }).click();

    await expect(page.getByRole('heading', { name: 'Project-style client' })).toBeVisible();
    await expect(page.getByTestId('client-detail')).toBeVisible();
    await expect(page.getByTestId('client-detail').locator('.projects-table-shell')).toHaveCount(0);
    await expect(page.getByTestId('client-detail').locator('.projects-detail-hero')).toHaveCount(1);
    await expect(page.getByTestId('client-detail').locator('.projects-detail-summary-card')).toHaveCount(2);
    await expect(page.getByTestId('client-detail').locator('.projects-detail-section')).toHaveCount(0);
    await expect(page.getByTestId('client-detail').locator('table')).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Edit client' })).toHaveCount(0);
    await page.getByRole('button', { name: 'More actions for Project-style client' }).click();
    await expect(page.getByRole('menuitem', { name: 'Edit client' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Archive' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Add contact' })).toBeVisible();
    await expect(page.getByLabel('Client name')).toHaveCount(0);
});
