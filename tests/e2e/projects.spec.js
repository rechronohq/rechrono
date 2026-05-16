import { expect, test } from '@playwright/test';

import { login } from './helpers/app';

test('projects renders through the shared app scaffold with a sortable data table', async ({ page }) => {
    await login(page);

    await page.goto('/projects');

    await expect(page.getByTestId('app-shell')).toBeVisible();
    await expect(page.getByTestId('app-context-bar-title')).toHaveText('Projects');
    await expect(page.getByTestId('projects-table')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Start' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'End' })).toBeVisible();
    await expect(page.getByTestId('projects-table').getByRole('button', { name: 'Name' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Project' })).toBeVisible();
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
    await page.getByLabel('Name').fill('Projects App Launch');
    await page.getByLabel('Description').fill('Created from the projects directory.');
    await page.getByRole('button', { name: 'Create project' }).click();

    await expect(page).toHaveURL(/\/projects\/.+/);
    await expect(page.getByTestId('app-context-bar-title')).toHaveText('Projects');
    await expect(page.getByTestId('app-context-breadcrumb')).toContainText('Projects App Launch');
    await expect(page.getByText('Created from the projects directory.')).toBeVisible();
});

test('only the project name opens the project detail page', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    const projectRow = page.getByRole('row', { name: /Default Planning Board/ });
    await projectRow.getByText('May', { exact: false }).first().click();

    await expect(page).toHaveURL(/\/projects$/);

    await projectRow.getByRole('link', { name: 'Default Planning Board' }).click();

    await expect(page).toHaveURL(/\/projects\/.+/);
    await expect(page.getByTestId('app-context-bar-title')).toHaveText('Projects');
    await expect(page.getByTestId('app-context-breadcrumb')).toContainText('Default Planning Board');
    await expect(page.getByRole('button', { name: 'Open timeline' })).toBeVisible();
});

test('projects table exposes timeline-style project actions from the row menu', async ({ page }) => {
    await login(page);

    await page.goto('/projects?status=all');
    const projectRow = page.getByRole('row', { name: /Default Planning Board/ });

    await projectRow.getByRole('button', { name: 'More actions for Default Planning Board' }).click();
    await expect(page.getByRole('menuitem')).toHaveText([
        'Open timeline',
        'Edit project',
        'Archive',
        'Duplicate',
        'Save as template',
        'Delete',
    ]);

    await page.getByRole('menuitem', { name: 'Edit project' }).click();

    await expect(page).toHaveURL(/\/projects\/.+\/edit$/);
    await expect(page.getByTestId('app-context-bar-title')).toContainText('Edit');
});

test('project and task selection use square controls in project view', async ({ page }) => {
    await login(page);

    await page.goto('/projects?status=all');
    const projectRow = page.getByRole('row', { name: /Default Planning Board/ });
    const projectSelector = projectRow.getByRole('checkbox', { name: 'Select Default Planning Board' });

    await expect(projectSelector).toHaveCSS('border-radius', '4px');
    await projectSelector.click();
    await expect(projectRow).toHaveAttribute('data-state', 'selected');

    await projectRow.getByRole('link', { name: 'Default Planning Board' }).click();
    const taskRow = page.locator('.projects-detail-task').filter({ hasText: 'Scenario review' });

    await expect(taskRow.getByRole('checkbox', { name: 'Select Scenario review' })).toHaveCSS('border-radius', '4px');
    await expect(taskRow.getByRole('checkbox', { name: /Mark Scenario review/ })).toHaveCount(0);
});

test('projects page can move and delete multiple selected projects', async ({ page }) => {
    await login(page);

    await createProject(page, 'Bulk Parent Board');
    await createProject(page, 'Bulk Child Board A');
    await createProject(page, 'Bulk Child Board B');

    await page.goto('/projects?status=all');
    await page.getByRole('checkbox', { name: 'Select Bulk Child Board A' }).click();
    await page.getByRole('checkbox', { name: 'Select Bulk Child Board B' }).click();

    await page.getByLabel('Parent for selected projects').selectOption({ label: 'Bulk Parent Board' });
    await page.getByRole('button', { name: 'Bulk actions' }).click();
    await page.getByRole('menuitem', { name: 'Move selected' }).click();

    await expect(page.getByRole('row', { name: /Bulk Child Board A/ })).toBeVisible();
    await page.getByRole('row', { name: /Bulk Child Board A/ }).getByRole('link', { name: 'Bulk Child Board A' }).click();

    await expect(page.getByRole('link', { name: 'Bulk Parent Board' })).toBeVisible();

    await page.goto('/projects?status=all');
    await page.getByRole('checkbox', { name: 'Select Bulk Child Board A' }).click();
    await page.getByRole('checkbox', { name: 'Select Bulk Child Board B' }).click();
    await page.getByRole('button', { name: 'Bulk actions' }).click();
    await page.getByRole('menuitem', { name: 'Delete selected' }).click();

    await expect(page.getByRole('row', { name: /Bulk Child Board A/ })).toHaveCount(0);
    await expect(page.getByRole('row', { name: /Bulk Child Board B/ })).toHaveCount(0);
});

test('projects page makes saved templates visible and usable', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    const projectRow = page.getByRole('row', { name: /Website Relaunch/ });
    await projectRow.getByRole('button', { name: 'More actions for Website Relaunch' }).click();

    await Promise.all([
        page.waitForResponse((response) => response.url().includes('/projects/') && response.url().includes('/template') && response.status() === 200),
        page.getByRole('menuitem', { name: 'Save as template' }).click(),
    ]);

    await page.goto('/projects?status=templates');
    const templateRow = page.getByRole('row', { name: /Website Relaunch Template/ });
    await expect(templateRow).toBeVisible();
    await expect(templateRow.getByText('Template', { exact: true })).toBeVisible();

    await templateRow.getByRole('button', { name: 'More actions for Website Relaunch Template' }).click();
    await expect(page.getByRole('menuitem')).toHaveText([
        'Edit template',
        'Duplicate',
        'Delete',
    ]);

    await page.goto('/projects/new');
    await page.getByRole('button', { name: 'Use template' }).click();
    await page.getByLabel('Name').fill('Template-created project');
    await page.getByLabel('Template').selectOption({ label: 'Website Relaunch Template' });
    await page.getByLabel('Start date').fill('2026-06-01');
    await page.getByRole('button', { name: 'Create from template' }).click();

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
    await page.getByRole('row', { name: /Default Planning Board/ }).getByRole('link', { name: 'Default Planning Board' }).click();
    await page.getByRole('link', { name: 'Edit project' }).click();

    await expect(page).toHaveURL(/\/projects\/.+\/edit$/);
    await expect(page.getByTestId('app-context-bar-title')).toContainText('Edit');
});

test('project detail exposes project actions from the header menu', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    await page.getByRole('row', { name: /Default Planning Board/ }).getByRole('link', { name: 'Default Planning Board' }).click();
    await page.getByRole('button', { name: 'More actions for Default Planning Board' }).focus();
    await page.keyboard.press('Enter');

    await expect(page.getByRole('menuitem')).toHaveText([
        'Open timeline',
        'Edit project',
        'Archive',
        'Duplicate',
        'Save as template',
        'Delete',
    ]);
});

test('project detail shows related tasks grouped by person', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    await page.getByRole('row', { name: /Default Planning Board/ }).getByRole('link', { name: 'Default Planning Board' }).click();

    await expect(page.getByRole('heading', { name: 'Tasks by person' })).toBeVisible();
    await expect(page.getByText('Unassigned')).toBeVisible();
    await expect(page.getByText('6 open · 1 done · 7 total')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Kickoff and scope' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Build planner' })).toBeVisible();

    const unassignedGroup = page.locator('.projects-detail-assignee').filter({ has: page.getByRole('heading', { name: 'Unassigned' }) });
    await unassignedGroup.getByRole('button', { name: 'Collapse Unassigned' }).click();
    await expect(unassignedGroup.getByText('7 tasks hidden')).toBeVisible();
    await expect(unassignedGroup.getByRole('heading', { name: 'Kickoff and scope' })).toHaveCount(0);

    await page.reload();
    const reloadedUnassignedGroup = page.locator('.projects-detail-assignee').filter({ has: page.getByRole('heading', { name: 'Unassigned' }) });
    await expect(reloadedUnassignedGroup.getByText('7 tasks hidden')).toBeVisible();

    await reloadedUnassignedGroup.getByRole('button', { name: 'Expand Unassigned' }).click();
    await expect(reloadedUnassignedGroup.getByRole('heading', { name: 'Kickoff and scope' })).toBeVisible();

    await page.getByRole('button', { name: 'Collapse all' }).click();
    await expect(reloadedUnassignedGroup.getByText('7 tasks hidden')).toBeVisible();
    await page.getByRole('button', { name: 'Expand all' }).click();
    await expect(reloadedUnassignedGroup.getByRole('heading', { name: 'Kickoff and scope' })).toBeVisible();
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

    await page.getByRole('group', { name: 'Group tasks by' }).getByRole('button', { name: 'Group', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Tasks by group' })).toBeVisible();

    const productionGroup = page.locator('.projects-detail-assignee').filter({ has: page.getByRole('heading', { name: 'Production' }) });
    await expect(productionGroup.getByRole('heading', { name: 'Edit Shot cleanup' })).toBeVisible();

    await page.getByLabel('Task filter').selectOption('completed');
    await expect(productionGroup.getByText('1 open · 0 done · 1 total')).toBeVisible();
    await expect(productionGroup.getByText('No completed tasks for this group.')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Tasks by group' })).toBeVisible();
    await expect(page.getByLabel('Task filter')).toHaveValue('completed');

    await page.getByLabel('Task filter').selectOption('all');
    const productionGroupAfterReload = page.locator('.projects-detail-assignee').filter({ has: page.getByRole('heading', { name: 'Production' }) });
    await productionGroupAfterReload.getByRole('button', { name: 'New task' }).click();
    await expect(page.getByLabel('Parent task or group')).toHaveValue(/.+/);
    await expect(page.getByLabel('Parent task or group').locator('option:checked')).toHaveText('Group: Production');
});

test('project detail can filter related tasks by completion state', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    await page.getByRole('row', { name: /Default Planning Board/ }).getByRole('link', { name: 'Default Planning Board' }).click();

    await page.getByLabel('Task filter').selectOption('completed');
    await expect(page.getByRole('heading', { name: 'Kickoff and scope' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Scenario review' })).toHaveCount(0);

    await page.getByLabel('Task filter').selectOption('open');
    await expect(page.getByRole('heading', { name: 'Scenario review' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Kickoff and scope' })).toHaveCount(0);

    await page.getByLabel('Task filter').selectOption('all');
    await expect(page.getByRole('heading', { name: 'Kickoff and scope' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Scenario review' })).toBeVisible();
});

test('project detail can mark related tasks complete from the row menu', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    await page.getByRole('row', { name: /Default Planning Board/ }).getByRole('link', { name: 'Default Planning Board' }).click();

    const taskRow = page.locator('.projects-detail-task').filter({ hasText: 'Scenario review' });
    await expect(taskRow.getByRole('checkbox', { name: /Mark Scenario review/ })).toHaveCount(0);
    await expect(page.getByText('6 open · 1 done · 7 total')).toBeVisible();

    await taskRow.getByRole('button', { name: 'More actions for Scenario review' }).click();
    await page.getByRole('menuitem', { name: 'Mark complete' }).click();

    await taskRow.getByRole('button', { name: 'More actions for Scenario review' }).click();
    await expect(page.getByRole('menuitem', { name: 'Mark incomplete' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText('5 open · 2 done · 7 total')).toBeVisible();
});

test('project task row menu matches timeline task actions and supports right click', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    await page.getByRole('row', { name: /Default Planning Board/ }).getByRole('link', { name: 'Default Planning Board' }).click();

    const taskRow = page.locator('.projects-detail-task').filter({ hasText: 'Review and launch' });
    await taskRow.getByRole('button', { name: 'More actions for Review and launch' }).click();
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
    await page.getByRole('row', { name: /Default Planning Board/ }).getByRole('link', { name: 'Default Planning Board' }).click();

    const scenarioRow = page.locator('.projects-detail-task').filter({ hasText: 'Scenario review' });
    const launchRow = page.locator('.projects-detail-task').filter({ hasText: 'Review and launch' });

    await scenarioRow.getByRole('button', { name: 'More actions for Scenario review' }).click();
    const incompleteScenarioItem = page.getByRole('menuitem', { name: 'Mark incomplete' });
    if (await incompleteScenarioItem.count()) {
        await incompleteScenarioItem.click();
        await page.reload();
    } else {
        await page.keyboard.press('Escape');
    }

    await scenarioRow.getByRole('checkbox', { name: 'Select Scenario review' }).click();
    await launchRow.getByRole('checkbox', { name: 'Select Review and launch' }).click();

    await expect(page.getByText('2 selected')).toBeVisible();
    await page.getByRole('button', { name: 'Bulk actions' }).click();
    await page.getByRole('menuitem', { name: 'Mark selected complete' }).click();

    await scenarioRow.getByRole('button', { name: 'More actions for Scenario review' }).click();
    await expect(page.getByRole('menuitem', { name: 'Mark incomplete' })).toBeVisible();
    await page.keyboard.press('Escape');
    await launchRow.getByRole('button', { name: 'More actions for Review and launch' }).click();
    await expect(page.getByRole('menuitem', { name: 'Mark incomplete' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText('2 selected')).toHaveCount(0);
});

test('project detail can create and edit related tasks', async ({ page }) => {
    await login(page);

    await page.goto('/projects');
    await page.getByRole('row', { name: /Default Planning Board/ }).getByRole('link', { name: 'Default Planning Board' }).click();

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
    await page.getByRole('row', { name: /Default Planning Board/ }).getByRole('link', { name: 'Default Planning Board' }).click();
    await page.getByRole('link', { name: 'Edit project' }).click();

    await page.getByLabel('Description').fill('Updated planner project description.');
    await page.getByRole('button', { name: 'Save project' }).click();

    await expect(page).toHaveURL(/\/projects\/.+/);
    await expect(page.getByText('Updated planner project description.')).toBeVisible();
});

test('projects page imports a Hive CSV', async ({ page }) => {
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

    await page.goto('/projects');
    await page.getByRole('button', { name: 'Import' }).click();
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

test('projects page Hive import shows inline validation errors', async ({ page }) => {
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

    await page.goto('/projects');
    await page.getByRole('button', { name: 'Import' }).click();
    await page.locator('input[type="file"]').setInputFiles({
        name: 'broken.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('Title\nBroken row\n'),
    });

    await page.getByRole('button', { name: 'Import' }).last().click();

    await expect(page.getByText('Hive CSV headers are missing required columns.')).toBeVisible();
});

test('projects page Hive import rejects unexpected non-json success responses', async ({ page }) => {
    await login(page);

    await page.route('**/imports/hive', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'text/plain',
            body: 'ok',
        });
    });

    await page.goto('/projects');
    await page.getByRole('button', { name: 'Import' }).click();
    await page.locator('input[type="file"]').setInputFiles({
        name: 'broken-success.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('ID,Title\n1,Launch planning\n'),
    });

    await page.getByRole('button', { name: 'Import' }).last().click();

    await expect(page.getByText('Expected a JSON response from the app API.')).toBeVisible();
});

test('projects page Hive import stays open during an in-flight request', async ({ page }) => {
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

    await page.goto('/projects');
    await page.getByRole('button', { name: 'Import' }).click();
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
