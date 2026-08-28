import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

import { login, sidebarProjectRow, sidebarTaskRow } from './helpers/app';

test('timeline exports the full current view as PNG and PDF', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1100, height: 700 });
    await login(page);

    const horizontalScroll = page.locator('.timeline-horizontal-scroll');
    await horizontalScroll.evaluate((element) => {
        element.scrollLeft = 300;
    });

    await page.getByTestId('timeline-export-trigger').click();
    const pngDownloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'Download PNG' }).click();
    const pngDownload = await pngDownloadPromise;
    const pngPath = testInfo.outputPath(pngDownload.suggestedFilename());
    await pngDownload.saveAs(pngPath);
    const png = await readFile(pngPath);

    expect(pngDownload.suggestedFilename()).toMatch(/^timeline-\d{4}-\d{2}-\d{2}\.png$/);
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.readUInt32BE(16)).toBeGreaterThan(1100);
    expect(png.byteLength).toBeGreaterThan(50_000);
    expect(await imageContainsNonWhitePixels(page, png)).toBe(true);

    await page.getByTestId('timeline-export-trigger').click();
    const pdfDownloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'Download PDF' }).click();
    const pdfDownload = await pdfDownloadPromise;
    const pdfPath = testInfo.outputPath(pdfDownload.suggestedFilename());
    await pdfDownload.saveAs(pdfPath);
    const pdf = await readFile(pdfPath);

    expect(pdfDownload.suggestedFilename()).toMatch(/^timeline-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    await expect(page.getByTestId('timeline-export-trigger')).toBeEnabled();
    await expect(page.getByRole('alert')).toHaveCount(0);
});

async function imageContainsNonWhitePixels(page, imageBuffer) {
    return page.evaluate(async (base64) => {
        const image = new Image();
        image.src = `data:image/png;base64,${base64}`;
        await image.decode();

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = Math.max(1, Math.round((image.height / image.width) * canvas.width));
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;

        for (let index = 0; index < pixels.length; index += 4) {
            if (pixels[index] < 245 || pixels[index + 1] < 245 || pixels[index + 2] < 245) {
                return true;
            }
        }

        return false;
    }, imageBuffer.toString('base64'));
}

test('project header selection supports browser back navigation', async ({ page }) => {
    await login(page);

    const projectRow = sidebarProjectRow(page, 'Example Project');
    await projectRow.hover();
    await projectRow.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Open' }).click();

    await expect(sidebarTaskRow(page, 'Organize ideas')).toBeVisible();
    await expect(sidebarTaskRow(page, 'Plan')).toHaveCount(0);

    await page.goBack();

    await expect(sidebarTaskRow(page, 'Organize ideas')).toBeVisible();
    await expect(sidebarTaskRow(page, 'Plan')).toBeVisible();
});

test('breadcrumb navigation still works from a selected project', async ({ page }) => {
    await login(page);

    const projectRow = sidebarProjectRow(page, 'Example Project');
    await projectRow.hover();
    await projectRow.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Open' }).click();

    const commandBar = page.getByTestId('tasks-command-bar');
    const breadcrumbs = commandBar.getByRole('navigation');
    await expect(breadcrumbs.getByRole('button', { name: 'Example Project' })).toBeVisible();

    await breadcrumbs.getByRole('button', { name: 'All projects' }).click();

    await expect(sidebarTaskRow(page, 'Organize ideas')).toBeVisible();
    await expect(sidebarTaskRow(page, 'Plan')).toBeVisible();
});

test('project popup exposes project tools including project view', async ({ page }) => {
    await login(page);

    const projectRow = sidebarProjectRow(page, 'Demo Workspace');
    await projectRow.click();

    await expect(page.getByRole('dialog', { name: 'Edit project' })).toBeVisible();
    await expect(page.getByLabel('Notes')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Archive' })).toBeVisible();
    await page.getByRole('button', { name: 'View project' }).click();

    await expect(page).toHaveURL(/\/projects\/.+/);
    await expect(page.getByRole('heading', { name: 'Tasks by person' })).toBeVisible();
});

test('project popup can update notes', async ({ page }) => {
    await login(page);

    const projectRow = sidebarProjectRow(page, 'Demo Workspace');
    await projectRow.click();

    await page.getByLabel('Notes').fill('Timeline popup notes');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(page.getByRole('dialog', { name: 'Edit project' })).toHaveCount(0);

    await sidebarProjectRow(page, 'Demo Workspace').click();
    await expect(page.getByLabel('Notes')).toHaveValue('Timeline popup notes');
});

test('project popup can archive a project', async ({ page }) => {
    await login(page);

    await page.goto('/projects/new');
    await page.getByLabel('Name').fill('Archive Confirmation Project');
    await Promise.all([
        page.waitForURL(/\/projects\/.+/),
        page.getByRole('button', { name: 'Create project' }).click(),
    ]);
    await page.waitForLoadState('networkidle');

    await page.goto('/tasks');

    const projectRow = sidebarProjectRow(page, 'Archive Confirmation Project');
    await projectRow.click();

    await page.getByRole('button', { name: 'Archive' }).click();
    await expect(page.getByRole('dialog', { name: 'Archive project?' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('dialog', { name: 'Archive project?' })).toHaveCount(0);
    await expect(sidebarProjectRow(page, 'Archive Confirmation Project')).toBeVisible();

    await page.getByRole('button', { name: 'Archive' }).click();
    await page.getByRole('button', { name: 'Archive project' }).click();

    await expect(page.getByRole('dialog', { name: 'Edit project' })).toHaveCount(0);
    await expect(sidebarProjectRow(page, 'Archive Confirmation Project')).toHaveCount(0);
});

test('project popup confirms before deleting a project', async ({ page }) => {
    await login(page);

    await page.goto('/projects/new');
    await page.getByLabel('Name').fill('Disposable Timeline Project');
    await Promise.all([
        page.waitForURL(/\/projects\/.+/),
        page.getByRole('button', { name: 'Create project' }).click(),
    ]);
    await page.waitForLoadState('networkidle');

    await page.goto('/tasks');

    const projectRow = sidebarProjectRow(page, 'Disposable Timeline Project');
    await projectRow.click();

    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('dialog', { name: 'Delete project?' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('dialog', { name: 'Delete project?' })).toHaveCount(0);
    await expect(sidebarProjectRow(page, 'Disposable Timeline Project')).toBeVisible();

    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete project' }).click();

    await expect(page.getByRole('dialog', { name: 'Edit project' })).toHaveCount(0);
    await expect(sidebarProjectRow(page, 'Disposable Timeline Project')).toHaveCount(0);
});

test('archived projects are hidden from the timeline', async ({ page }) => {
    await login(page);

    await page.goto('/projects/new');
    await page.getByLabel('Name').fill('Archived Timeline Board');
    await Promise.all([
        page.waitForURL(/\/projects\/.+/),
        page.getByRole('button', { name: 'Create project' }).click(),
    ]);
    await page.waitForLoadState('networkidle');

    await page.goto('/projects?status=all');
    const projectRow = page.getByRole('row', { name: /Archived Timeline Board/ });
    await projectRow.getByRole('button', { name: 'More actions for Archived Timeline Board' }).click();
    await page.getByRole('menuitem', { name: 'Archive' }).click();

    await page.goto('/tasks');

    await expect(sidebarProjectRow(page, 'Archived Timeline Board')).toHaveCount(0);
    await expect(sidebarProjectRow(page, 'Demo Workspace')).toBeVisible();
});

test('project rows align with the timeline day band', async ({ page }) => {
    await login(page);

    const projectRow = sidebarProjectRow(page, 'Example Project');
    const dayBand = page.locator('.timeline-days');

    const projectRowBox = await projectRow.boundingBox();
    const dayBandBox = await dayBand.boundingBox();

    expect(projectRowBox).not.toBeNull();
    expect(dayBandBox).not.toBeNull();

    expect(projectRowBox.y).toBeGreaterThanOrEqual(dayBandBox.y + dayBandBox.height - 1);
});

test('task reorder handles align across task nesting levels', async ({ page }) => {
    await login(page);

    const rootTaskRow = sidebarTaskRow(page, 'Plan');
    const childTaskRow = sidebarTaskRow(page, 'Review the schedule');

    await expect(rootTaskRow).toBeVisible();
    await expect(childTaskRow).toBeVisible();

    const rootHandleBox = await rootTaskRow.getByRole('button', { name: 'Reorder task' }).boundingBox();
    const childHandleBox = await childTaskRow.getByRole('button', { name: 'Reorder task' }).boundingBox();

    expect(rootHandleBox).not.toBeNull();
    expect(childHandleBox).not.toBeNull();
    expect(Math.round(childHandleBox.x)).toBe(Math.round(rootHandleBox.x));
});

test('date header stays fixed while scrolling the timeline', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 360 });
    await login(page);

    const scrollContainer = page.locator('.timeline-scroll');
    const header = page.locator('.timeline-header');
    const before = await header.boundingBox();

    expect(before).not.toBeNull();

    await scrollContainer.evaluate((element) => {
        element.scrollTop = 220;
    });

    await expect.poll(async () => scrollContainer.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

    const after = await header.boundingBox();
    expect(after).not.toBeNull();
    expect(Math.round(after.y)).toBe(Math.round(before.y));
});

test('timeline shows a vertical indicator for today', async ({ page }) => {
    await login(page);

    const todayMarker = page.locator('.timeline-today-line');
    const todayHeader = page.locator('.timeline-day[data-today="true"]');

    await expect(todayMarker).toBeVisible();
    await expect(todayHeader).toBeVisible();

    const markerBox = await todayMarker.boundingBox();
    const dayBox = await todayHeader.boundingBox();

    expect(markerBox).not.toBeNull();
    expect(dayBox).not.toBeNull();
    expect(Math.abs((markerBox.x + markerBox.width / 2) - (dayBox.x + dayBox.width / 2))).toBeLessThanOrEqual(1);
    expect(markerBox.y).toBeGreaterThanOrEqual(dayBox.y + dayBox.height - 1);
});

test('sidebar rows scroll vertically with the timeline without following horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 360 });
    await login(page);

    const verticalScroll = page.locator('.timeline-scroll');
    const horizontalScroll = page.locator('.timeline-horizontal-scroll');
    const sidebarRow = sidebarTaskRow(page, 'Review the schedule');
    const timelineRow = page.locator('.timeline-grid-row').nth(2);

    const sidebarBefore = await sidebarRow.boundingBox();
    const timelineBefore = await timelineRow.boundingBox();
    expect(sidebarBefore).not.toBeNull();
    expect(timelineBefore).not.toBeNull();

    await verticalScroll.evaluate((element) => {
        element.scrollTop = 160;
    });

    await expect.poll(async () => verticalScroll.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

    const sidebarAfterVertical = await sidebarRow.boundingBox();
    const timelineAfterVertical = await timelineRow.boundingBox();
    expect(sidebarAfterVertical).not.toBeNull();
    expect(timelineAfterVertical).not.toBeNull();
    expect(sidebarAfterVertical.y).toBeLessThan(sidebarBefore.y);
    expect(timelineAfterVertical.y).toBeLessThan(timelineBefore.y);

    const sidebarXBefore = sidebarAfterVertical.x;

    await horizontalScroll.evaluate((element) => {
        element.scrollLeft = 220;
    });

    await expect.poll(async () => horizontalScroll.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

    const sidebarAfterHorizontal = await sidebarRow.boundingBox();
    expect(sidebarAfterHorizontal).not.toBeNull();
    expect(Math.round(sidebarAfterHorizontal.x)).toBe(Math.round(sidebarXBefore));
});

test('hovering a timeline bar highlights the matching sidebar task', async ({ page }) => {
    await login(page);

    const sidebarRow = sidebarTaskRow(page, 'Review the schedule');
    await expect(sidebarRow).toBeVisible();

    const taskId = await sidebarRow.getAttribute('data-task-id');
    expect(taskId).not.toBeNull();

    await page.locator(`.timeline-bar[data-task-bar-id="${taskId}"]`).hover();

    await expect(sidebarRow).toHaveAttribute('data-hovered', 'true');
});

test('timeline view settings can show weekends when needed', async ({ page }) => {
    await login(page);

    await expect(page.locator('.timeline-weekend-band')).toHaveCount(0);

    await page.getByTestId('timeline-settings-trigger').click();
    await page.getByRole('checkbox', { name: 'Show weekends' }).click();

    await expect(page).toHaveURL(/show_weekends=1/);
    await expect(page.locator('.timeline-weekend-band').first()).toBeVisible();
});

test('timeline view settings can switch to compact density', async ({ page }) => {
    await login(page);

    const firstDay = page.locator('.timeline-day').first();
    const firstRow = page.locator('.timeline-row-shell').first();
    const comfortableDayBox = await firstDay.boundingBox();
    const comfortableRowBox = await firstRow.boundingBox();

    expect(comfortableDayBox).not.toBeNull();
    expect(comfortableRowBox).not.toBeNull();
    expect(Math.round(comfortableDayBox.width)).toBe(38);
    expect(Math.round(comfortableRowBox.height)).toBe(38);

    await page.getByTestId('timeline-settings-trigger').click();
    await page.getByTestId('timeline-density-compact').click();

    await expect.poll(async () => {
        const box = await firstDay.boundingBox();

        return Math.round(box?.width ?? 0);
    }).toBe(28);

    const compactRowBox = await firstRow.boundingBox();
    expect(compactRowBox).not.toBeNull();
    expect(Math.round(compactRowBox.height)).toBe(30);

    const composerRow = page.locator('.timeline-composer-row').first();
    const composerInput = composerRow.locator('input[placeholder="New task"]');
    const composerRowBox = await composerRow.boundingBox();
    const composerInputBox = await composerInput.boundingBox();

    expect(composerRowBox).not.toBeNull();
    expect(composerInputBox).not.toBeNull();
    expect(Math.round(composerRowBox.height)).toBe(30);
    expect(Math.abs((composerInputBox.y + composerInputBox.height / 2) - (composerRowBox.y + composerRowBox.height / 2))).toBeLessThanOrEqual(1);
});

test('timeline views can be saved loaded renamed and deleted from the sidebar', async ({ page }) => {
    await login(page);

    const projectRow = sidebarProjectRow(page, 'Example Project');
    await projectRow.hover();
    await projectRow.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Open' }).click();

    await page.getByTestId('timeline-settings-trigger').click();
    await page.getByRole('checkbox', { name: 'Show weekends' }).click();
    await page.getByTestId('timeline-density-compact').click();
    await page.keyboard.press('Escape');

    await page.getByTestId('timeline-settings-trigger').click();
    await page.getByRole('button', { name: 'Save view' }).click();
    await page.getByLabel('View name').fill('Website compact');
    const saveResponsePromise = page.waitForResponse((response) => (
        response.url().endsWith('/timeline/views') && response.request().method() === 'POST'
    ));
    await page.getByRole('button', { name: 'Save timeline view' }).click();
    await expect.poll(async () => (await saveResponsePromise).status()).toBe(201);

    const sidebar = page.getByTestId('app-shell-sidebar');
    await expect(sidebar.getByRole('link', { name: 'Website compact' })).toBeVisible();

    await page.goto('/tasks');
    await expect(sidebarTaskRow(page, 'Plan')).toBeVisible();
    await expect(page.locator('.timeline-weekend-band')).toHaveCount(0);

    await sidebar.getByRole('link', { name: 'Website compact' }).click();

    await expect(page).toHaveURL(/\/timeline\/views\/.+/);
    await expect(sidebarTaskRow(page, 'Organize ideas')).toBeVisible();
    await expect(sidebarTaskRow(page, 'Plan')).toHaveCount(0);
    await expect(page.locator('.timeline-weekend-band').first()).toBeVisible();
    await expect.poll(async () => {
        const box = await page.locator('.timeline-day').first().boundingBox();

        return Math.round(box?.width ?? 0);
    }).toBe(28);

    await sidebar.getByRole('button', { name: 'More actions for saved view Website compact' }).click();
    page.once('dialog', (dialog) => dialog.accept('Website compact renamed'));
    await page.getByRole('menuitem', { name: 'Rename' }).click();
    await expect(sidebar.getByRole('link', { name: 'Website compact renamed' })).toBeVisible();

    await sidebar.getByRole('button', { name: 'More actions for saved view Website compact renamed' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await expect(sidebar.getByRole('link', { name: 'Website compact renamed' })).toHaveCount(0);
});

test('active timeline view saves changed settings back to the saved view', async ({ page }) => {
    await login(page);

    const projectRow = sidebarProjectRow(page, 'Example Project');
    await projectRow.hover();
    await projectRow.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Open' }).click();

    await page.getByTestId('timeline-settings-trigger').click();
    await page.getByRole('button', { name: 'Save view' }).click();
    await page.getByLabel('View name').fill('Editable view');
    await page.getByRole('button', { name: 'Save timeline view' }).click();

    const sidebar = page.getByTestId('app-shell-sidebar');
    await sidebar.getByRole('link', { name: 'Editable view' }).click();
    await expect(page).toHaveURL(/\/timeline\/views\/.+/);

    await page.getByTestId('timeline-settings-trigger').click();
    const settingsPatch = page.waitForResponse((response) => (
        /\/timeline\/views\/.+/.test(response.url()) && response.request().method() === 'PATCH'
    ));
    await page.getByRole('checkbox', { name: 'Show weekends' }).click();
    await expect.poll(async () => (await settingsPatch).status()).toBe(200);

    const densityPatch = page.waitForResponse((response) => (
        /\/timeline\/views\/.+/.test(response.url()) && response.request().method() === 'PATCH'
    ));
    await page.getByTestId('timeline-density-compact').click();
    await expect.poll(async () => (await densityPatch).status()).toBe(200);
    await page.keyboard.press('Escape');

    await page.goto('/tasks');
    await expect(page.locator('.timeline-weekend-band')).toHaveCount(0);

    await sidebar.getByRole('link', { name: 'Editable view' }).click();

    await expect(page.locator('.timeline-weekend-band').first()).toBeVisible();
    await expect.poll(async () => {
        const box = await page.locator('.timeline-day').first().boundingBox();

        return Math.round(box?.width ?? 0);
    }).toBe(28);
});

test('project rows expose hover actions and open the same menu from overflow or right-click', async ({ page }) => {
    await login(page);

    const projectRow = sidebarProjectRow(page, 'Example Project');
    await expect(projectRow).toBeVisible();

    await expect(projectRow.getByRole('button', { name: 'More actions' })).toHaveCount(1);

    await projectRow.hover();
    await expect(projectRow.getByRole('button', { name: 'More actions' })).toBeVisible();

    await projectRow.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Open' }).click();
    await expect(sidebarTaskRow(page, 'Organize ideas')).toBeVisible();
    await expect(sidebarTaskRow(page, 'Plan')).toHaveCount(0);

    await page.goBack();

    await projectRow.hover();
    await projectRow.getByRole('button', { name: 'More actions' }).click();

    await expect(page.getByRole('menu')).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Open' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'New group' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Save as template' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();

    await page.keyboard.press('Escape');

    await projectRow.click({ button: 'right' });

    await expect(page.getByRole('menuitem', { name: 'Open' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'New group' })).toBeVisible();
});

test('task row actions can convert a task into a group', async ({ page }) => {
    await login(page);

    const taskRow = sidebarTaskRow(page, 'Share the plan');
    await taskRow.hover();
    await taskRow.getByRole('button', { name: 'More actions' }).click();

    await expect(page.getByRole('menuitem', { name: 'Mark complete' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Convert to group' }).click();

    const convertedRow = sidebarTaskRow(page, 'Share the plan');
    await expect(convertedRow.getByRole('checkbox')).toHaveCount(0);

    await convertedRow.click();

    await expect(page.getByRole('dialog', { name: 'Edit group' })).toBeVisible();
    await expect(page.getByTestId('group-dialog-name')).toHaveValue('Share the plan');
});

test('project chevron toggles collapse without opening the project modal', async ({ page }) => {
    await login(page);

    const projectRow = sidebarProjectRow(page, 'Demo Workspace');
    await expect(projectRow).toBeVisible();

    await projectRow.getByRole('button', { name: 'Collapse project' }).click();

    await expect(page.getByRole('heading', { name: 'Edit project' })).toHaveCount(0);
    await expect(sidebarTaskRow(page, 'Plan')).toHaveCount(0);
});

test('clicking a sidebar task opens the edit modal', async ({ page }) => {
    await login(page);

    const taskRow = sidebarTaskRow(page, 'Review the schedule');
    await taskRow.hover();
    await expect(taskRow.getByRole('button', { name: 'More actions' })).toBeVisible();
    await taskRow.click();

    await expect(page.getByRole('heading', { name: 'Edit task' })).toBeVisible();
    await expect(page.locator('input[placeholder=\"Task name\"]')).toHaveValue('Review the schedule');
    await expect(page.getByLabel('Notes')).toBeVisible();
});

test('dragging a calendar task does not open the edit modal', async ({ page }) => {
    await login(page);

    const taskBar = page.locator('.timeline-bar').filter({ hasText: 'Review the schedule' }).first();
    await expect(taskBar).toBeVisible();

    const box = await taskBar.boundingBox();

    if (!box) {
        throw new Error('Review the schedule bar not found');
    }

    await page.mouse.move(box.x + (box.width / 2), box.y + (box.height / 2));
    await page.mouse.down();
    await page.mouse.move(box.x + (box.width / 2) + 60, box.y + (box.height / 2), { steps: 8 });
    await page.mouse.up();

    await expect(page.getByRole('heading', { name: 'Edit task' })).toHaveCount(0);
});

test('clicking a project row opens the project modal', async ({ page }) => {
    await login(page);

    const projectRow = sidebarProjectRow(page, 'Example Project');
    await expect(projectRow).toBeVisible();

    await projectRow.getByRole('button', { name: 'Example Project' }).click();
    await expect(page.getByRole('heading', { name: 'Edit project' })).toBeVisible();
});
