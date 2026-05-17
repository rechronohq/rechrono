import { TIMELINE_DENSITIES } from './constants';

const DEFAULT_DIMENSIONS = TIMELINE_DENSITIES.comfortable;

export function parseDateString(value) {
    const [year, month, day] = value.split('-').map(Number);

    return new Date(year, month - 1, day);
}

export function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export function shiftDate(value, days) {
    const next = parseDateString(value);
    next.setDate(next.getDate() + days);

    return formatDate(next);
}

export function shiftVisibleDate(value, days, showWeekends) {
    if (showWeekends || days === 0) {
        return shiftDate(value, days);
    }

    const next = parseDateString(value);
    const direction = days > 0 ? 1 : -1;
    let remaining = Math.abs(days);

    while (remaining > 0) {
        next.setDate(next.getDate() + direction);

        if (!isWeekend(next)) {
            remaining -= 1;
        }
    }

    return formatDate(next);
}

export function selectionUrl(projectIds, allProjects, assigneeFilters, assigneeOptions, baseUrl, showWeekends = false, collapsedProjectIds = []) {
    const url = new URL(baseUrl, window.location.origin);

    if (projectIds.length !== allProjects.length) {
        projectIds.forEach((projectId) => url.searchParams.append('projects[]', projectId));
    }

    const allAssigneeFilters = assigneeOptions.map((option) => option.filter_value).filter(Boolean);

    if (assigneeFilters.length && assigneeFilters.length !== allAssigneeFilters.length) {
        assigneeFilters.forEach((assigneeFilter) => url.searchParams.append('assignees[]', assigneeFilter));
    }

    if (showWeekends) {
        url.searchParams.set('show_weekends', '1');
    }

    collapsedProjectIds.forEach((projectId) => url.searchParams.append('collapsed[]', projectId));

    return url;
}

export function selectionFromUrl(locationHref, allProjects, assigneeOptions) {
    const url = new URL(locationHref, window.location.origin);
    const projectIds = url.searchParams.getAll('projects[]');
    const assigneeFilters = url.searchParams.getAll('assignees[]');
    const collapsedProjectIds = url.searchParams.getAll('collapsed[]');
    const allProjectIds = allProjects.map((project) => project.id);
    const allAssigneeFilters = assigneeOptions.map((option) => option.filter_value).filter(Boolean);
    return {
        projectIds: projectIds.length ? projectIds : allProjectIds,
        assigneeFilters: assigneeFilters.length ? assigneeFilters : allAssigneeFilters,
        showWeekends: url.searchParams.get('show_weekends') === '1',
        collapsedProjectIds: collapsedProjectIds.filter((projectId) => allProjectIds.includes(projectId)),
    };
}

export function selectedProjectsDescription(projects, selectedProjectIds) {
    const selectedProjects = projects.filter((project) => selectedProjectIds.includes(project.id));

    if (selectedProjects.length === projects.length) {
        return 'All projects';
    }

    if (!selectedProjects.length) {
        return 'No projects selected';
    }

    if (selectedProjects.length === 1) {
        return selectedProjects[0].name;
    }

    if (selectedProjects.length <= 3) {
        return selectedProjects.map((project) => project.name).join(', ');
    }

    return `${selectedProjects[0].name}, ${selectedProjects[1].name}, +${selectedProjects.length - 2} more`;
}

export function selectedAssigneesDescription(assigneeOptions, selectedAssigneeFilters) {
    const allAssigneeFilters = assigneeOptions.map((option) => option.filter_value).filter(Boolean);
    const selectedAssignees = assigneeOptions.filter((option) => selectedAssigneeFilters.includes(option.filter_value));

    if (selectedAssigneeFilters.length === allAssigneeFilters.length) {
        return 'All people';
    }

    if (!selectedAssignees.length) {
        return 'No people selected';
    }

    if (selectedAssignees.length === 1) {
        return selectedAssignees[0].label;
    }

    if (selectedAssignees.length <= 2) {
        return selectedAssignees.map((option) => option.label).join(', ');
    }

    return `${selectedAssignees[0].label}, ${selectedAssignees[1].label}, +${selectedAssignees.length - 2} more`;
}

export function selectedFiltersDescription(projects, selectedProjectIds, assigneeOptions, selectedAssigneeFilters) {
    const projectSummary = selectedProjectsDescription(projects, selectedProjectIds);
    const assigneeSummary = selectedAssigneesDescription(assigneeOptions, selectedAssigneeFilters);

    if (assigneeSummary === 'All people') {
        return projectSummary;
    }

    return `${projectSummary} • ${assigneeSummary}`;
}

export function buildDays(rangeStart, rangeEnd, showWeekends = false, dimensions = DEFAULT_DIMENSIONS) {
    const columnWidth = dimensions.columnWidth;
    const days = [];
    const months = [];
    const compressedBreaks = [];
    let cursor = parseDateString(rangeStart);
    const end = parseDateString(rangeEnd);
    let index = 0;
    let activeMonthKey = null;
    let activeMonth = null;
    let previousVisibleDate = null;

    while (cursor <= end) {
        const date = formatDate(cursor);
        const monthKey = `${cursor.getFullYear()}-${cursor.getMonth() + 1}`;
        const weekend = isWeekend(cursor);

        if (!weekend || showWeekends) {
            const left = index * columnWidth;
            const previousVisible = previousVisibleDate ? parseDateString(previousVisibleDate) : null;

            if (!showWeekends && previousVisible) {
                const diffDays = Math.round((parseDateString(date) - previousVisible) / 86400000);

                if (diffDays > 1) {
                    compressedBreaks.push({
                        after: previousVisibleDate,
                        before: date,
                        left,
                    });
                }
            }

            days.push({
                date,
                left,
                label: String(cursor.getDate()),
                isWeekend: weekend,
            });

            if (monthKey !== activeMonthKey) {
                activeMonth = {
                    key: monthKey,
                    label: cursor.toLocaleDateString(undefined, { month: 'long' }),
                    left,
                    width: columnWidth,
                };
                months.push(activeMonth);
                activeMonthKey = monthKey;
            } else {
                activeMonth.width += columnWidth;
            }

            previousVisibleDate = date;
            index += 1;
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    return {
        compressedBreaks,
        days,
        months,
        timelineWidth: days.length * columnWidth,
    };
}

export function resolveTodayLineLeft(todayDate, days, compressedBreaks, columnWidth) {
    const visibleDay = days.find((day) => day.date === todayDate);

    if (visibleDay) {
        return visibleDay.left + columnWidth / 2;
    }

    const today = parseDateString(todayDate);

    for (const breakpoint of compressedBreaks) {
        const after = parseDateString(breakpoint.after);
        const before = parseDateString(breakpoint.before);

        if (today > after && today < before) {
            return breakpoint.left;
        }
    }

    return null;
}

export function projectItems(items, projectId, parentId) {
    return [...items]
        .filter((item) => item.project_id === projectId && (item.parent_id ?? null) === parentId)
        .sort((a, b) => a.sort_order - b.sort_order);
}

export function buildRows(projects, visibleProjectIds, items, openComposerParentId, collapsedProjectIds = [], collapsedGroupIds = []) {
    const rows = [];
    const visibleProjectIdSet = new Set(visibleProjectIds);
    const collapsedProjectIdSet = new Set(collapsedProjectIds);
    const collapsedGroupIdSet = new Set(collapsedGroupIds);

    for (const project of projects.filter((candidate) => visibleProjectIds.includes(candidate.id))) {
        if (project.parent_id && visibleProjectIdSet.has(project.parent_id) && collapsedProjectIdSet.has(project.parent_id)) {
            continue;
        }

        rows.push({
            kind: 'project',
            key: `project-${project.id}`,
            project,
        });

        if (collapsedProjectIdSet.has(project.id)) {
            continue;
        }

        visitProjectRows(rows, items, project.id, null, 0, openComposerParentId, project.depth ?? 0, collapsedGroupIdSet);

        rows.push({
            kind: 'composer',
            key: `composer-root-${project.id}`,
            project_id: project.id,
            parent_id: null,
            depth: 0,
            project_depth: project.depth ?? 0,
            placeholder: `Add a task to ${project.name}...`,
        });
    }

    return rows;
}

export function visitProjectRows(rows, items, projectId, parentId, depth, openComposerParentId, projectDepth = 0, collapsedGroupIdSet = new Set()) {
    const projectChildren = projectItems(items, projectId, parentId);

    for (const item of projectChildren) {
        rows.push({
            kind: item.kind === 'group' ? 'group' : 'task',
            key: item.id,
            item,
            project_depth: projectDepth,
        });

        if (item.kind === 'group' && collapsedGroupIdSet.has(item.id)) {
            continue;
        }

        visitProjectRows(rows, items, projectId, item.id, depth + 1, openComposerParentId, projectDepth, collapsedGroupIdSet);

        if (openComposerParentId === item.id) {
            rows.push({
                kind: 'composer',
                key: `composer-${item.id}`,
                project_id: item.project_id,
                parent_id: item.id,
                depth: depth + 1,
                project_depth: projectDepth,
                placeholder: 'Add child task...',
            });
        }
    }
}

export function buildBars(rows, days, showWeekends = false, dimensions = DEFAULT_DIMENSIONS) {
    const { barHeight, columnWidth, rowHeight } = dimensions;
    const dayIndexMap = new Map(days.map((day, index) => [day.date, index]));

    return rows
        .map((row, index) => {
            if (row.kind !== 'task' && row.kind !== 'group') {
                return null;
            }

            if (!row.item.start || !row.item.end) {
                return null;
            }

            const left = visibleDateToX(row.item.start, days, dayIndexMap, showWeekends, columnWidth);
            const width = visibleDurationWidth(row.item.start, row.item.end, days, dayIndexMap, showWeekends, columnWidth);

            return {
                id: row.item.id,
                kind: row.kind,
                name: row.item.name,
                completed: row.item.completed,
                has_children: row.item.has_children,
                item: row.item,
                rowIndex: index,
                left,
                top: index * rowHeight + (rowHeight - barHeight) / 2,
                width,
            };
        })
        .filter(Boolean);
}

function visibleDateToX(date, days, dayIndexMap, showWeekends, columnWidth) {
    if (showWeekends) {
        return (dayIndexMap.get(date) ?? 0) * columnWidth;
    }

    const normalized = normalizeToVisibleDate(date, days, dayIndexMap, 'forward');

    return (dayIndexMap.get(normalized) ?? 0) * columnWidth;
}

function visibleDurationWidth(start, end, days, dayIndexMap, showWeekends, columnWidth) {
    if (showWeekends) {
        const startIndex = dayIndexMap.get(start) ?? 0;
        const endIndex = dayIndexMap.get(end) ?? startIndex;

        return Math.max((endIndex - startIndex + 1) * columnWidth, columnWidth);
    }

    const normalizedStart = normalizeToVisibleDate(start, days, dayIndexMap, 'forward');
    const normalizedEnd = normalizeToVisibleDate(end, days, dayIndexMap, 'backward');
    const startIndex = dayIndexMap.get(normalizedStart) ?? 0;
    const endIndex = dayIndexMap.get(normalizedEnd) ?? startIndex;

    return Math.max((Math.max(endIndex, startIndex) - startIndex + 1) * columnWidth, columnWidth);
}

function normalizeToVisibleDate(date, days, dayIndexMap, direction) {
    if (dayIndexMap.has(date)) {
        return date;
    }

    const cursor = parseDateString(date);

    while (true) {
        cursor.setDate(cursor.getDate() + (direction === 'forward' ? 1 : -1));
        const candidate = formatDate(cursor);

        if (dayIndexMap.has(candidate)) {
            return candidate;
        }

        if (candidate < (days[0]?.date ?? candidate) || candidate > (days.at(-1)?.date ?? candidate)) {
            return days[0]?.date ?? date;
        }
    }
}

function isWeekend(date) {
    return [0, 6].includes(date.getDay());
}

export function createTaskUrl(template, projectId) {
    return template.replace('__PROJECT__', projectId);
}

export function projectUrl(template, projectId) {
    return template.replace('__PROJECT__', projectId);
}

export function taskUrl(template, projectId, taskId) {
    return template.replace('__PROJECT__', projectId).replace('__TASK__', taskId);
}

export function buildFileUploadFormData(file) {
    const formData = new FormData();
    formData.append('file', file);

    return formData;
}

export function requestErrorMessages(error) {
    if (!error?.payload) {
        return error?.message ? [error.message] : [];
    }

    const fieldMessages = Object.values(error.payload.errors ?? {})
        .flat()
        .filter((value) => typeof value === 'string');

    if (fieldMessages.length > 0) {
        return fieldMessages;
    }

    return error.payload.message ? [error.payload.message] : (error.message ? [error.message] : []);
}

export function requestFieldErrors(error) {
    if (!error?.payload?.errors || typeof error.payload.errors !== 'object') {
        return {};
    }

    return Object.fromEntries(
        Object.entries(error.payload.errors).map(([field, messages]) => [
            field,
            Array.isArray(messages) ? messages.filter((value) => typeof value === 'string') : [],
        ]),
    );
}

function requestJsonError(message, status, payload = null) {
    const error = new Error(message);
    error.status = status;
    error.payload = payload;

    return error;
}

export function reorderSiblingItems(items, taskId, targetTaskId, position) {
    const task = items.find((item) => item.id === taskId);
    const target = items.find((item) => item.id === targetTaskId);

    if (!task || !target || task.id === target.id) {
        return items;
    }

    if (task.project_id !== target.project_id) {
        return items;
    }

    const nextParentId = target.parent_id ?? null;

    if (task.kind === 'group' && nextParentId !== null) {
        return items;
    }

    const siblingIds = items
        .filter((item) => item.project_id === task.project_id && (item.parent_id ?? null) === nextParentId)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => item.id)
        .filter((id) => id !== task.id);
    const targetIndex = siblingIds.indexOf(target.id);

    if (targetIndex === -1) {
        return items;
    }

    siblingIds.splice(position === 'before' ? targetIndex : targetIndex + 1, 0, task.id);

    const nextSortOrder = new Map(siblingIds.map((id, index) => [id, index + 1]));

    return items.map((item) => (
        nextSortOrder.has(item.id)
            ? {
                ...item,
                parent_id: item.id === task.id ? nextParentId : item.parent_id,
                sort_order: nextSortOrder.get(item.id),
            }
            : item
    ));
}

export function reparentItem(items, taskId, targetTaskId) {
    const task = items.find((item) => item.id === taskId);
    const target = items.find((item) => item.id === targetTaskId);

    if (!task || !target || task.id === target.id || task.project_id !== target.project_id) {
        return items;
    }

    if (task.kind === 'group') {
        return items;
    }

    const nextSortOrder = Math.max(
        0,
        ...items
            .filter((item) => item.project_id === target.project_id && item.parent_id === target.id)
            .map((item) => item.sort_order ?? 0),
    ) + 1;

    return items.map((item) => (
        item.id === task.id
            ? { ...item, parent_id: target.id, sort_order: nextSortOrder }
            : item
    ));
}

export async function request(url, options = {}) {
    const headers = new Headers(options.headers ?? {});
    const xsrfToken = document.cookie
        .split('; ')
        .find((value) => value.startsWith('XSRF-TOKEN='))
        ?.split('=')
        ?.slice(1)
        ?.join('=');
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

    headers.set('Accept', 'application/json');
    headers.set('X-Requested-With', 'XMLHttpRequest');

    if (xsrfToken) {
        headers.set('X-XSRF-TOKEN', decodeURIComponent(xsrfToken));
    } else if (csrfToken) {
        headers.set('X-CSRF-TOKEN', csrfToken);
    }

    if (isFormData) {
        headers.delete('Content-Type');
    } else if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
        method: 'GET',
        credentials: 'same-origin',
        ...options,
        headers,
    });

    const contentType = response.headers.get('content-type') ?? '';
    const expectsJson = contentType.includes('application/json');

    if (!expectsJson) {
        const bodyText = response.status === 204 ? '' : await response.text();

        if (response.ok) {
            throw requestJsonError('Expected a JSON response from the timeline API.', response.status, bodyText || null);
        }

        throw requestJsonError(bodyText || `Request failed: ${response.status}`, response.status, null);
    }

    const payload = await response.json();

    if (!response.ok) {
        throw requestJsonError(
            typeof payload === 'object' && payload !== null && typeof payload.message === 'string'
                ? payload.message
                : `Request failed: ${response.status}`,
            response.status,
            payload,
        );
    }

    return payload;
}
