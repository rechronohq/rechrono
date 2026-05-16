import { expect, test } from '@playwright/test';

import { login, sidebarTaskRow } from './helpers/app';

test('shows the shared app shell structure on tasks', async ({ page }) => {
    await login(page);

    const shell = page.getByTestId('app-shell');
    const sidebar = page.getByTestId('app-shell-sidebar');
    const sidebarTop = page.getByTestId('app-shell-sidebar-top');
    const sidebarMiddle = page.getByTestId('app-shell-sidebar-middle');
    const sidebarBottom = page.getByTestId('app-shell-sidebar-bottom');
    const accountBlock = page.getByTestId('app-shell-account');
    const main = page.getByTestId('app-shell-main');
    const content = page.getByTestId('app-shell-content');
    const appContextBar = page.getByTestId('app-context-bar');
    const appContextBarTitle = page.getByTestId('app-context-bar-title');
    const appContextBarActions = page.getByTestId('app-context-bar-actions');
    const timelineHeader = page.locator('.timeline-header');

    await expect(shell).toBeVisible();
    await expect(sidebar).toBeVisible();
    await expect(main).toBeVisible();
    await expect(content).toBeVisible();
    await expect(sidebarTop).toBeVisible();
    await expect(sidebarMiddle).toBeVisible();
    await expect(sidebarBottom).toBeVisible();

    const sidebarBox = await sidebar.boundingBox();
    expect(sidebarBox).not.toBeNull();
    expect(sidebarBox.height).toBeGreaterThan(700);
    const accountBox = await accountBlock.boundingBox();
    expect(accountBox).not.toBeNull();
    expect(accountBox.y).toBeGreaterThan(sidebarBox.y + sidebarBox.height - 160);
    const mainBox = await main.boundingBox();
    expect(mainBox).not.toBeNull();
    expect(mainBox.x).toBeGreaterThan(sidebarBox.x + sidebarBox.width - 4);

    await expect(appContextBar).toBeVisible();
    await expect(appContextBarTitle).toHaveText('Tasks');
    await expect(appContextBarActions).toBeVisible();
    await expect(appContextBarActions.getByRole('button', { name: 'Import' })).toHaveCount(0);
    await expect(timelineHeader).toBeVisible();
    await expect(sidebar.getByText('Rechrono')).toBeVisible();
    await expect(sidebar.getByRole('navigation', { name: 'Sidebar' })).toBeVisible();
    await expect(sidebar.getByText('Apps')).toBeVisible();
    await expect(sidebar.getByText('Management')).toBeVisible();
    await expect(sidebar.getByText('Admin')).toHaveCount(0);
    await expect(sidebar.getByRole('link', { name: 'Timeline' })).toHaveAttribute('aria-current', 'page');
    await expect(sidebar.getByRole('link', { name: 'Projects' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Clients' })).toHaveCount(0);
    await expect(sidebar.getByRole('link', { name: 'Timesheets' })).toHaveCount(0);
    await expect(sidebar.getByRole('link', { name: 'Invoices' })).toHaveCount(0);
    await expect(sidebar.getByRole('link', { name: 'Settings' })).toHaveCount(0);
    await expect(accountBlock).toBeVisible();
    await expect(sidebar.getByTestId('app-shell-account-trigger')).toBeVisible();
    await sidebar.getByTestId('app-shell-account-trigger').click();
    await expect(sidebar.getByRole('button', { name: 'Profile' })).toBeVisible();
    await expect(sidebar.getByRole('button', { name: 'Log out' })).toBeVisible();
    await expect(appContextBar.getByTestId('app-context-bar-context')).toHaveCount(0);
    await expect(sidebarTaskRow(page, 'Scenario review')).toBeVisible();
});

test('app rail navigates between timeline and projects', async ({ page }) => {
    await login(page);

    const sidebar = page.getByTestId('app-shell-sidebar');
    const plannerLink = sidebar.getByRole('link', { name: 'Timeline' });
    const projectsLink = sidebar.getByRole('link', { name: 'Projects' });

    await expect(plannerLink).toHaveAttribute('aria-current', 'page');

    await projectsLink.click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(projectsLink).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('app-context-bar-title')).toHaveText('Projects');

    await plannerLink.click();
    await expect(page).toHaveURL(/\/planner$/);
    await expect(plannerLink).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('app-context-bar-title')).toHaveText('Tasks');
});
