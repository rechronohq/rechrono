import { expect, test } from '@playwright/test';

import { login, marqueeSelect } from './helpers/app';

async function openProjectTaskViewMenu(page) {
    const menu = page.getByTestId('project-task-view-menu');

    if (await menu.isVisible().catch(() => false)) {
        return;
    }

    await page.getByTestId('project-task-view-menu-trigger').click();
}

async function setProjectTaskGrouping(page, grouping) {
    await openProjectTaskViewMenu(page);
    await page.getByRole('group', { name: 'Group tasks by' }).getByRole('button', {
        name: grouping === 'group' ? 'Group' : 'Person',
        exact: true,
    }).click();
}

async function setProjectTaskFilter(page, filter) {
    const labels = {
        all: 'All',
        completed: 'Completed',
        mine: 'Mine',
        open: 'Open',
    };

    await openProjectTaskViewMenu(page);
    await page.getByRole('menu', { name: 'Task filter' }).getByRole('menuitemradio', { name: new RegExp(`^${labels[filter]}\\b`) }).click();
}

test('projects renders through the shared app scaffold with a sortable data table', async ({ page }) => {
    await login(page);

    await page.goto('/projects');

    await expect(page.getByTestId('app-shell')).toBeVisible();
    await expect(page.getByTestId('app-context-bar-title')).toHaveText('Projects');
    await expect(page.getByTestId('app-context-bar-actions')).toHaveCount(0);
    await expect(page.getByTestId('projects-index-actions').getByRole('button', { name: 'Import' })).toHaveCount(0);
    await expect(page.getByTestId('projects-index-actions').getByRole('link', { name: 'New Project' })).toBeVisible();
    await expect(page.getByTestId('projects-table')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Start' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'End' })).toBeVisible();
    await expect(page.getByTestId('projects-table').getByRole('button', { name: 'Name' })).toBeVisible();
    await expect(page.getByTestId('projects-table').getByRole('button', { name: 'Start' })).toBeVisible();
    await expect(page.getByTestId('projects-table').getByRole('button', { name: 'End' })).toBeVisible();
});

test('projects appears in the app rail and becomes active when opened', async ({ page }) => {
    await login(page);

    const sidebar = page.getByTestId('app-shell-sidebar');

    await sidebar.getByRole('link', { name: 'Projects' }).click();

    await expect(page).toHaveURL(/\/projects$/);
    await expect(sidebar.getByRole('link', { name: 'Projects' })).toHaveAttribute('aria-current', 'page');
});

test('projects can create a new project from the projects app', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    await page.getByRole('button', { name: 'New Project' }).click();

    await expect(page).toHaveURL(/\/projects\/new$/);
    await expect(page.getByTestId('app-context-bar-title')).toHaveText('New Project');
    await expect(page.getByTestId('app-context-breadcrumb')).toContainText('All projects');
    await expect(page.getByTestId('app-context-breadcrumb')).toContainText('New project');
    await page.getByLabel('Name').fill('Projects App Launch');
    await page.getByLabel('Description').fill('Created from the projects directory.');
    await page.getByRole('button', { name: 'Create project' }).click();

    await expect(page).toHaveURL(/\/projects\/.+/);
    await expect(page.getByTestId('app-context-bar-title')).toHaveText('Projects');
    await expect(page.getByTestId('app-context-breadcrumb')).toContainText('Projects App Launch');
    await expect(page.getByText('Created from the projects directory.')).toBeVisible();
});

test('project creation page links to the import portal', async ({ page }) => {
    await login(page);

    await page.goto('/projects/new');
    await page.getByRole('link', { name: 'Import' }).click();

    await expect(page).toHaveURL(/\/imports$/);
    await expect(page.getByTestId('app-context-bar-title')).toHaveText('Imports');
    await expect(page.getByRole('heading', { name: 'Hive CSV' })).toBeVisible();
});

test('project creation page exposes template selection without a mode toggle', async ({ page }) => {
    await login(page);

    await page.goto('/projects/new');

    await expect(page.getByLabel('Template')).toBeVisible();
    await expect(page.getByLabel('Template')).toHaveValue('');
    await expect(page.getByLabel('Template').locator('option').first()).toHaveText('No template');
    await expect(page.getByLabel('Start date')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Use template' })).toHaveCount(0);
    await expect(page.getByText('No templates yet. Save a project as a template to use it here.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create project' })).toBeDisabled();
});

test('only the project name opens the project detail page', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    const projectRow = page.getByRole('row', { name: /Demo Workspace/ });
    await projectRow.locator('td').nth(2).click();

    await expect(page).toHaveURL(/\/projects$/);

    await projectRow.getByRole('link', { name: 'Demo Workspace' }).click();

    await expect(page).toHaveURL(/\/projects\/.+/);
    await expect(page.getByTestId('app-context-bar-title')).toHaveText('Projects');
    await expect(page.getByTestId('app-context-breadcrumb')).toContainText('Demo Workspace');
    await expect(page.getByTestId('app-context-bar-actions')).toHaveCount(0);
    await expect(page.getByTestId('project-detail-actions').getByRole('link', { name: 'Edit' })).toBeVisible();
    await expect(page.getByTestId('project-detail-actions').getByRole('link', { name: 'Timeline' })).toHaveCount(0);
});

test('projects table exposes timeline-style project actions from the row menu', async ({ page }) => {
    await login(page);

    await page.goto('/projects?status=all');
    const projectRow = page.getByRole('row', { name: /Demo Workspace/ });

    await projectRow.getByRole('button', { name: 'More actions for Demo Workspace' }).click();
    await expect(page.getByRole('menuitem')).toHaveText([
        'Open timeline',
        'Edit project',
        'Duplicate',
        'Save as template',
        'Archive',
        'Delete',
    ]);

    await page.getByRole('menuitem', { name: 'Edit project' }).click();

    await expect(page).toHaveURL(/\/projects\/.+\/edit$/);
    await expect(page.getByTestId('app-context-bar-title')).toContainText('Edit');
});

test('project and task selection use square controls in project view', async ({ page }) => {
    await login(page);

    await page.goto('/projects?status=all');
    const projectRow = page.getByRole('row', { name: /Demo Workspace/ });
    const projectSelector = projectRow.getByRole('checkbox', { name: 'Select Demo Workspace' });

    await expect(projectSelector).toHaveCSS('border-radius', '4px');
    await expect(projectSelector).toHaveCSS('opacity', '0');
    await projectRow.hover();
    await expect(projectSelector).toHaveCSS('opacity', '1');
    await projectSelector.click();
    await expect(projectRow).toHaveAttribute('data-state', 'selected');

    await projectRow.getByRole('link', { name: 'Demo Workspace' }).click();
    const taskRow = page.locator('.projects-detail-task').filter({ hasText: 'Review the schedule' });
    const taskSelector = taskRow.getByRole('checkbox', { name: 'Select Review the schedule' });

    await expect(taskRow.locator('.projects-detail-task__number')).toHaveCount(0);
    await expect(taskSelector).toHaveCSS('border-radius', '4px');
    await expect(taskSelector).toHaveCSS('opacity', '0');
    await taskRow.hover();
    await expect(taskSelector).toHaveCSS('opacity', '1');
    await expect(taskRow.getByRole('checkbox', { name: 'Mark complete Review the schedule' })).toBeVisible();

    const taskNameButton = taskRow.getByRole('button', { name: 'Edit Review the schedule' });
    await taskNameButton.hover();
    await expect(taskNameButton).toHaveCSS('text-decoration-line', 'underline');
});

test('projects page can delete multiple selected projects', async ({ page }) => {
    await login(page);

    await createProject(page, 'Bulk Child Board A');
    await createProject(page, 'Bulk Child Board B');

    await page.goto('/projects?status=all');
    await page.getByRole('row', { name: /Bulk Child Board A/ }).hover();
    await page.getByRole('checkbox', { name: 'Select Bulk Child Board A' }).click();
    await page.getByRole('row', { name: /Bulk Child Board B/ }).hover();
    await page.getByRole('checkbox', { name: 'Select Bulk Child Board B' }).click();

    await page.getByRole('button', { name: 'Bulk actions' }).click();
    await expect(page.getByRole('menuitem', { name: 'Move selected' })).toHaveCount(0);
    await page.getByRole('menuitem', { name: 'Delete selected' }).click();

    await expect(page.getByRole('row', { name: /Bulk Child Board A/ })).toHaveCount(0);
    await expect(page.getByRole('row', { name: /Bulk Child Board B/ })).toHaveCount(0);
});

test('projects page supports rectangle project selection', async ({ page }) => {
    await login(page);

    await createProject(page, 'Marquee Project A');
    await createProject(page, 'Marquee Project B');

    await page.goto('/projects?status=all');
    const firstProject = page.getByRole('row', { name: /Marquee Project A/ });
    const secondProject = page.getByRole('row', { name: /Marquee Project B/ });
    const firstBox = await firstProject.boundingBox();
    const secondBox = await secondProject.boundingBox();

    expect(firstBox).not.toBeNull();
    expect(secondBox).not.toBeNull();

    await marqueeSelect(
        page,
        { x: firstBox.x + 48, y: firstBox.y + 6 },
        { x: secondBox.x + secondBox.width - 48, y: secondBox.y + secondBox.height - 6 },
    );

    await expect(firstProject).toHaveAttribute('data-state', 'selected');
    await expect(secondProject).toHaveAttribute('data-state', 'selected');
    await expect(page.getByText('2 selected')).toBeVisible();
});

test('projects page shows contextual actions for selected projects', async ({ page }) => {
    await login(page);

    await createProject(page, 'Context Project A');
    await createProject(page, 'Context Project B');

    await page.goto('/projects?status=all');
    const firstProject = page.getByRole('row', { name: /Context Project A/ });
    const secondProject = page.getByRole('row', { name: /Context Project B/ });

    await firstProject.hover();
    await firstProject.getByRole('checkbox', { name: 'Select Context Project A' }).click();
    await secondProject.hover();
    await secondProject.getByRole('checkbox', { name: 'Select Context Project B' }).click();

    await secondProject.click({ button: 'right' });

    await expect(page.getByRole('menuitem', { name: 'Archive 2' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Delete 2' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Edit project' })).toHaveCount(0);
});

test('projects page makes saved templates visible and usable', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    const projectRow = page.getByRole('row', { name: /Example Project/ });
    await projectRow.getByRole('button', { name: 'More actions for Example Project' }).click();

    await Promise.all([
        page.waitForResponse((response) => response.url().includes('/projects/') && response.url().includes('/template') && response.status() === 200),
        page.getByRole('menuitem', { name: 'Save as template' }).click(),
    ]);

    await page.goto('/projects?status=templates');
    const templateRow = page.getByRole('row', { name: /Example Project Template/ });
    await expect(templateRow).toBeVisible();
    await expect(templateRow.getByText('Template', { exact: true })).toBeVisible();

    await templateRow.getByRole('button', { name: 'More actions for Example Project Template' }).click();
    await expect(page.getByRole('menuitem')).toHaveText([
        'Edit template',
        'Duplicate',
        'Delete',
    ]);

    await page.goto('/projects/new');
    await page.getByLabel('Name').fill('Template-created project');
    await page.getByLabel('Template').selectOption({ label: 'Example Project Template' });
    await expect(page.getByLabel('Start date')).toHaveCount(0);
    await page.getByRole('button', { name: 'Create project' }).click();

    await expect(page).toHaveURL(/\/projects\/.+/);
    await expect(page.getByTestId('app-context-breadcrumb')).toContainText('Template-created project');
});

async function createProject(page, name) {
    await page.waitForLoadState('networkidle');
    await page.goto('/projects/new', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Name').fill(name);
    await Promise.all([
        page.waitForURL(/\/projects\/.+/),
        page.getByRole('button', { name: 'Create project' }).click(),
    ]);
    await page.waitForLoadState('networkidle');
}

test('projects detail can navigate to a standalone edit page', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    await page.getByRole('row', { name: /Demo Workspace/ }).getByRole('link', { name: 'Demo Workspace' }).click();
    await page.getByTestId('project-detail-actions').getByRole('link', { name: 'Edit' }).click();

    await expect(page).toHaveURL(/\/projects\/.+\/edit$/);
    await expect(page.getByTestId('app-context-bar-title')).toContainText('Edit');
});

test('project detail exposes project actions from the page menu', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    await page.getByRole('row', { name: /Demo Workspace/ }).getByRole('link', { name: 'Demo Workspace' }).click();
    await page.getByTestId('project-detail-actions').getByRole('button', { name: 'More actions for Demo Workspace' }).focus();
    await page.keyboard.press('Enter');

    await expect(page.getByRole('menuitem')).toHaveText([
        'Open timeline',
        'Edit project',
        'Duplicate',
        'Save as template',
        'Archive',
        'Delete',
    ]);
});

test('project detail shows related tasks grouped by person', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    await page.getByRole('row', { name: /Demo Workspace/ }).getByRole('link', { name: 'Demo Workspace' }).click();

    await expect(page.getByRole('heading', { name: 'Tasks by person' })).toBeVisible();
    await expect(page.getByText('Unassigned')).toBeVisible();
    await expect(page.getByText('6 open · 1 done · 7 total')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add a first task' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Track progress' })).toBeVisible();

    const unassignedGroup = page.locator('.projects-detail-assignee').filter({ has: page.getByRole('heading', { name: 'Unassigned' }) });
    const unassignedHeader = unassignedGroup.locator('.projects-detail-assignee__header');
    const sectionSelector = unassignedGroup.getByRole('checkbox', { name: 'Select all tasks for Unassigned' });
    await page.mouse.move(1, 1);
    await expect(sectionSelector).toBeVisible();
    await expect(sectionSelector).toHaveCSS('opacity', '0');
    await unassignedHeader.hover();
    await expect(sectionSelector).toHaveCSS('opacity', '1');
    await expect(unassignedGroup.getByRole('checkbox', { name: /^Select (?!all tasks for)/ })).toHaveCount(7);
});

test('project detail section checkbox selects and clears visible tasks in that section', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    await page.getByRole('row', { name: /Demo Workspace/ }).getByRole('link', { name: 'Demo Workspace' }).click();

    const unassignedGroup = page.locator('.projects-detail-assignee').filter({ has: page.getByRole('heading', { name: 'Unassigned' }) });
    const sectionSelector = unassignedGroup.getByRole('checkbox', { name: 'Select all tasks for Unassigned' });
    const firstTask = unassignedGroup.locator('.projects-detail-task').filter({ hasText: 'Add a first task' });
    const secondTask = unassignedGroup.locator('.projects-detail-task').filter({ hasText: 'Track progress' }).first();

    await expect(sectionSelector).toBeVisible();
    await expect(sectionSelector).not.toBeChecked();
    await unassignedGroup.locator('.projects-detail-assignee__header').hover();

    await sectionSelector.click();

    await expect(firstTask).toHaveAttribute('data-state', 'selected');
    await expect(secondTask).toHaveAttribute('data-state', 'selected');
    await expect(sectionSelector).toBeChecked();
    await expect(page.getByRole('button', { name: '7 selected' })).toBeVisible();

    await sectionSelector.click();

    await expect(firstTask).not.toHaveAttribute('data-state', 'selected');
    await expect(secondTask).not.toHaveAttribute('data-state', 'selected');
    await expect(sectionSelector).not.toBeChecked();
    await expect(page.getByRole('button', { name: '7 selected' })).toHaveCount(0);
});

test('project detail ignores rectangle task selection gestures', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    await page.getByRole('row', { name: /Demo Workspace/ }).getByRole('link', { name: 'Demo Workspace' }).click();

    const firstTask = page.locator('.projects-detail-task').filter({ hasText: 'Add a first task' });
    const middleTask = page.locator('.projects-detail-task').filter({
        has: page.getByRole('button', { name: 'Edit Plan', exact: true }),
    });
    const secondTask = page.locator('.projects-detail-task').filter({ hasText: 'Track progress' }).first();
    await firstTask.scrollIntoViewIfNeeded();
    await secondTask.scrollIntoViewIfNeeded();
    const firstBox = await firstTask.boundingBox();
    const secondBox = await secondTask.boundingBox();

    expect(firstBox).not.toBeNull();
    expect(secondBox).not.toBeNull();

    await marqueeSelect(
        page,
        { x: firstBox.x + 48, y: firstBox.y + 6 },
        { x: secondBox.x + secondBox.width - 48, y: secondBox.y + secondBox.height - 6 },
    );

    await expect(firstTask).not.toHaveAttribute('data-state', 'selected');
    await expect(middleTask).not.toHaveAttribute('data-state', 'selected');
    await expect(secondTask).not.toHaveAttribute('data-state', 'selected');
    await expect(page.getByRole('button', { name: '3 selected' })).toHaveCount(0);
    await expect(page.locator('.projects-detail-section__selected-count')).toHaveCount(0);
});

test('project detail hides timeline groups as tasks and can group tasks by them', async ({ page }) => {
    await login(page);

    await createProject(page, 'Grouped Detail Project');

    await page.goto('/tasks');
    const projectRow = page.locator('aside .timeline-project-shell').filter({ hasText: 'Grouped Detail Project' }).first();
    await projectRow.hover();
    await projectRow.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'New group' }).click();
    await page.getByTestId('group-dialog-name').fill('Production');
    await page.getByRole('button', { name: 'Save' }).click();

    await page.goto('/projects');
    await page.getByRole('row', { name: /Grouped Detail Project/ }).getByRole('link', { name: 'Grouped Detail Project' }).click();
    const unassignedGroup = page.locator('.projects-detail-assignee').filter({ has: page.getByRole('heading', { name: 'Unassigned' }) });
    await unassignedGroup.getByRole('button', { name: 'New task' }).click();
    await page.getByLabel('Task name').fill('Shot cleanup');
    await page.getByLabel('Parent task or group').selectOption({ label: 'Group: Production' });
    await page.getByLabel('Start date').fill('2026-06-02');
    await page.getByLabel('End date').fill('2026-06-03');
    await page.getByRole('button', { name: 'Create task' }).click();

    await expect(page.getByRole('heading', { name: 'Tasks by person' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Edit Production' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Edit Shot cleanup' })).toBeVisible();

    await setProjectTaskGrouping(page, 'group');

    await expect(page.getByRole('heading', { name: 'Tasks by group' })).toBeVisible();

    const productionGroup = page.locator('.projects-detail-assignee').filter({ has: page.getByRole('heading', { name: 'Production' }) });
    await expect(productionGroup.getByRole('heading', { name: 'Edit Shot cleanup' })).toBeVisible();

    await setProjectTaskFilter(page, 'completed');
    await expect(productionGroup.getByText('1 open · 0 done · 1 total')).toBeVisible();
    await expect(productionGroup.getByText('No completed tasks for this group.')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Tasks by group' })).toBeVisible();
    await expect(page.getByTestId('project-task-view-menu-trigger')).toContainText('Completed');

    await setProjectTaskFilter(page, 'all');
    const productionGroupAfterReload = page.locator('.projects-detail-assignee').filter({ has: page.getByRole('heading', { name: 'Production' }) });
    await productionGroupAfterReload.getByRole('button', { name: 'New task' }).click();
    await expect(page.getByLabel('Parent task or group')).toHaveValue(/.+/);
    await expect(page.getByLabel('Parent task or group').locator('option:checked')).toHaveText('Group: Production');
});

test('project detail can filter related tasks by completion state', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    await page.getByRole('row', { name: /Demo Workspace/ }).getByRole('link', { name: 'Demo Workspace' }).click();

    await setProjectTaskFilter(page, 'completed');
    await expect(page.getByRole('heading', { name: 'Add a first task' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Review the schedule' })).toHaveCount(0);

    await setProjectTaskFilter(page, 'open');
    await expect(page.getByRole('heading', { name: 'Review the schedule' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add a first task' })).toHaveCount(0);

    await setProjectTaskFilter(page, 'all');
    await expect(page.getByRole('heading', { name: 'Add a first task' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Review the schedule' })).toBeVisible();
});

test('project detail can mark related tasks complete from the row menu', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    await page.getByRole('row', { name: /Demo Workspace/ }).getByRole('link', { name: 'Demo Workspace' }).click();

    const taskRow = page.locator('.projects-detail-task').filter({ hasText: 'Review the schedule' });
    await expect(taskRow.getByRole('checkbox', { name: /Mark Review the schedule/ })).toHaveCount(0);
    await expect(page.getByText('6 open · 1 done · 7 total')).toBeVisible();

    await taskRow.getByRole('button', { name: 'More actions for Review the schedule' }).click();
    await page.getByRole('menuitem', { name: 'Mark complete' }).click();

    await taskRow.getByRole('button', { name: 'More actions for Review the schedule' }).click();
    await expect(page.getByRole('menuitem', { name: 'Mark incomplete' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText('5 open · 2 done · 7 total')).toBeVisible();
});

test('project task row menu matches timeline task actions and supports right click', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    await page.getByRole('row', { name: /Demo Workspace/ }).getByRole('link', { name: 'Demo Workspace' }).click();

    const taskRow = page.locator('.projects-detail-task').filter({ hasText: 'Share the plan' });
    await taskRow.getByRole('button', { name: 'More actions for Share the plan' }).click();
    await expect(page.getByRole('menuitem')).toHaveText([
        'Mark complete',
        'Add child',
        'Edit',
        'Duplicate',
        'Delete',
    ]);
    await page.keyboard.press('Escape');

    await taskRow.click({ button: 'right' });
    await expect(page.getByRole('menuitem', { name: 'Mark complete' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Add child' })).toBeVisible();
});

test('project detail can mark selected tasks complete from bulk actions', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    await page.getByRole('row', { name: /Demo Workspace/ }).getByRole('link', { name: 'Demo Workspace' }).click();

    const scenarioRow = page.locator('.projects-detail-task').filter({ hasText: 'Review the schedule' });
    const launchRow = page.locator('.projects-detail-task').filter({ hasText: 'Share the plan' });

    await scenarioRow.getByRole('button', { name: 'More actions for Review the schedule' }).click();
    const incompleteScenarioItem = page.getByRole('menuitem', { name: 'Mark incomplete' });
    if (await incompleteScenarioItem.count()) {
        await incompleteScenarioItem.click();
        await page.reload();
    } else {
        await page.keyboard.press('Escape');
    }

    await scenarioRow.hover();
    await scenarioRow.getByRole('checkbox', { name: 'Select Review the schedule' }).click();
    await launchRow.hover();
    await launchRow.getByRole('checkbox', { name: 'Select Share the plan' }).click();

    await expect(page.getByRole('button', { name: '2 selected' })).toBeVisible();
    await expect(page.locator('.projects-detail-section__selected-count')).toHaveCount(0);
    await page.getByRole('button', { name: '2 selected' }).click();
    await page.getByRole('menuitem', { name: 'Mark selected complete' }).click();

    await scenarioRow.getByRole('button', { name: 'More actions for Review the schedule' }).click();
    await expect(page.getByRole('menuitem', { name: 'Mark incomplete' })).toBeVisible();
    await page.keyboard.press('Escape');
    await launchRow.getByRole('button', { name: 'More actions for Share the plan' }).click();
    await expect(page.getByRole('menuitem', { name: 'Mark incomplete' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: '2 selected' })).toHaveCount(0);
});

test('project detail can mark selected completed tasks incomplete from bulk actions', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    await page.getByRole('row', { name: /Demo Workspace/ }).getByRole('link', { name: 'Demo Workspace' }).click();

    const scenarioRow = page.locator('.projects-detail-task').filter({ hasText: 'Review the schedule' });
    const launchRow = page.locator('.projects-detail-task').filter({ hasText: 'Share the plan' });

    for (const row of [scenarioRow, launchRow]) {
        await row.getByRole('button', { name: /^More actions for / }).click();
        const completeItem = page.getByRole('menuitem', { name: 'Mark complete' });
        if (await completeItem.count()) {
            await completeItem.click();
        } else {
            await page.keyboard.press('Escape');
        }
    }

    await scenarioRow.hover();
    await scenarioRow.getByRole('checkbox', { name: 'Select Review the schedule' }).click();
    await launchRow.hover();
    await launchRow.getByRole('checkbox', { name: 'Select Share the plan' }).click();

    await page.getByRole('button', { name: '2 selected' }).click();
    await page.getByRole('menuitem', { name: 'Mark selected incomplete' }).click();

    await scenarioRow.getByRole('button', { name: 'More actions for Review the schedule' }).click();
    await expect(page.getByRole('menuitem', { name: 'Mark complete' })).toBeVisible();
    await page.keyboard.press('Escape');
    await launchRow.getByRole('button', { name: 'More actions for Share the plan' }).click();
    await expect(page.getByRole('menuitem', { name: 'Mark complete' })).toBeVisible();
});

test('project detail shows contextual actions for selected tasks', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    await page.getByRole('row', { name: /Demo Workspace/ }).getByRole('link', { name: 'Demo Workspace' }).click();

    const buildRow = page.locator('.projects-detail-task').filter({
        has: page.getByRole('button', { name: 'Edit Track progress', exact: true }),
    });
    const frontendRow = page.locator('.projects-detail-task').filter({ hasText: 'Add a nested task' });

    await buildRow.hover();
    await buildRow.getByRole('checkbox', { name: 'Select Track progress' }).click();
    await frontendRow.hover();
    await frontendRow.getByRole('checkbox', { name: 'Select Add a nested task' }).click();

    await frontendRow.click({ button: 'right' });

    await expect(page.getByRole('menuitem', { name: 'Mark 2 complete' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Delete 2' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Edit' })).toHaveCount(0);
});

test('project detail can delete selected tasks from bulk actions', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    await page.getByRole('row', { name: /Demo Workspace/ }).getByRole('link', { name: 'Demo Workspace' }).click();

    const scenarioRow = page.locator('.projects-detail-task').filter({ hasText: 'Review the schedule' });
    const launchRow = page.locator('.projects-detail-task').filter({ hasText: 'Share the plan' });

    await scenarioRow.hover();
    await scenarioRow.getByRole('checkbox', { name: 'Select Review the schedule' }).click();
    await launchRow.hover();
    await launchRow.getByRole('checkbox', { name: 'Select Share the plan' }).click();

    await page.getByRole('button', { name: '2 selected' }).click();
    await page.getByRole('menuitem', { name: 'Delete selected' }).click();
    await expect(page.getByRole('dialog', { name: 'Delete selected tasks?' })).toBeVisible();
    await page.getByRole('button', { name: 'Delete tasks' }).click();

    await expect(page.getByRole('heading', { name: 'Review the schedule' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Share the plan' })).toHaveCount(0);
});

test('project detail can create and edit related tasks', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    await page.getByRole('row', { name: /Demo Workspace/ }).getByRole('link', { name: 'Demo Workspace' }).click();

    await page.locator('.projects-detail-assignee').first().getByRole('button', { name: 'New task' }).click();
    await page.getByLabel('Task name').fill('Project page follow-up');
    await page.getByLabel('Notes').fill('Project-view task note.');
    await page.getByLabel('Start date').fill('2026-06-02');
    await page.getByLabel('End date').fill('2026-06-03');
    await page.getByRole('button', { name: 'Create task' }).click();

    await expect(page.getByRole('heading', { name: 'Project page follow-up' })).toBeVisible();

    await page.getByRole('button', { name: 'Edit Project page follow-up' }).click();
    await expect(page.getByLabel('Notes')).toHaveValue('Project-view task note.');
    await page.getByLabel('Task name').fill('Project page follow-up edited');
    await page.getByLabel('Notes').fill('Updated project-view task note.');
    await page.getByRole('button', { name: 'Save task' }).click();

    await expect(page.getByRole('heading', { name: 'Project page follow-up edited' })).toBeVisible();

    const editedTaskRow = page.locator('.projects-detail-task').filter({ hasText: 'Project page follow-up edited' });
    await editedTaskRow.hover();
    await editedTaskRow.getByRole('button', { name: 'More actions for Project page follow-up edited' }).click();
    await page.getByRole('menuitem', { name: 'Duplicate' }).click();
    await expect(page.getByRole('heading', { name: 'Project page follow-up edited Copy' })).toBeVisible();

    const copiedTaskRow = page.locator('.projects-detail-task').filter({ hasText: 'Project page follow-up edited Copy' });
    await copiedTaskRow.hover();
    await copiedTaskRow.getByRole('button', { name: 'More actions for Project page follow-up edited Copy' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await expect(page.getByRole('heading', { name: 'Delete task?' })).toBeVisible();
    await expect(page.getByText('This will delete "Project page follow-up edited Copy" from the project. This cannot be undone.')).toBeVisible();
    await page.getByRole('button', { name: 'Delete task' }).click();
    await expect(page.getByRole('heading', { name: 'Project page follow-up edited Copy' })).toHaveCount(0);
});

test('project edit page can update planner fields', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    await page.getByRole('row', { name: /Demo Workspace/ }).getByRole('link', { name: 'Demo Workspace' }).click();
    await page.getByTestId('project-detail-actions').getByRole('link', { name: 'Edit' }).click();

    await page.getByLabel('Description').fill('Updated planner project description.');
    await page.getByRole('button', { name: 'Save project' }).click();

    await expect(page).toHaveURL(/\/projects\/.+/);
    await expect(page.getByText('Updated planner project description.')).toBeVisible();
});
