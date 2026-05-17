import { expect } from '@playwright/test';

export async function login(page) {
    await page.goto('/tasks');
    await page.locator('input[type="email"]').fill(process.env.E2E_LOGIN_EMAIL ?? '');
    await page.locator('input[type="password"]').fill(process.env.E2E_LOGIN_PASSWORD ?? '');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/tasks/);
}

export function sidebarTaskRow(page, name) {
    return page.locator('aside .timeline-tree-row').filter({ hasText: name }).first();
}

export function sidebarProjectRow(page, name) {
    return page.locator('aside .timeline-project-shell').filter({ hasText: name }).first();
}

export function selectedSidebarRow(page, name) {
    return page.locator('aside .timeline-tree-row[data-selected="true"]').filter({ hasText: name }).first();
}

export async function marqueeSelect(page, from, to) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.mouse.up();
}

export async function modifierSelect(locator, modifier) {
    await locator.evaluate((element, key) => {
        const eventInit = {
            bubbles: true,
            cancelable: true,
            shiftKey: key === 'Shift',
            ctrlKey: key === 'Control',
            metaKey: key === 'Meta',
        };

        element.dispatchEvent(new MouseEvent('mousedown', eventInit));
        element.dispatchEvent(new MouseEvent('mouseup', eventInit));
        element.dispatchEvent(new MouseEvent('click', eventInit));
    }, modifier);
}
