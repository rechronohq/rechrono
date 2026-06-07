import { getTaskRowActions } from '@/tasks/taskRowActions';

export function defaultTaskForm(project) {
    const fallbackDate = new Date().toISOString().slice(0, 10);
    const startDate = project.start_date ?? fallbackDate;

    return {
        name: '',
        description: '',
        parent_id: '',
        assignee_user_id: '',
        start_date: startDate,
        end_date: project.end_date ?? startDate,
        completed: false,
    };
}

export function assigneeInitial(name) {
    return (name?.trim()?.[0] ?? 'U').toUpperCase();
}

export function projectTaskViewKey(projectId) {
    return `rechrono.projectTaskView.${projectId}`;
}

export function savedProjectTaskView(projectId) {
    const fallback = {
        filter: 'all',
        grouping: 'person',
    };

    if (typeof window === 'undefined') {
        return fallback;
    }

    try {
        const saved = JSON.parse(window.localStorage.getItem(projectTaskViewKey(projectId)) ?? '{}');

        return {
            filter: ['all', 'open', 'completed', 'mine'].includes(saved.filter) ? saved.filter : fallback.filter,
            grouping: ['person', 'group'].includes(saved.grouping) ? saved.grouping : fallback.grouping,
        };
    } catch (error) {
        return fallback;
    }
}

export function formatTaskDate(value) {
    if (!value) {
        return '—';
    }

    const normalized = String(value).match(/^\d{4}-\d{2}-\d{2}$/)
        ? `${value}T00:00:00`
        : value;
    const date = new Date(normalized);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return new Intl.DateTimeFormat('en-CA', {
        day: '2-digit',
        month: 'short',
        timeZone: 'America/Toronto',
    }).format(date);
}

export function formatTaskDateRange(startDate, endDate) {
    return `${formatTaskDate(startDate)} - ${formatTaskDate(endDate)}`;
}

export function summarizeTaskGroups(taskGroups, fallbackSummary) {
    const allTasks = taskGroups.flatMap((group) => group.tasks ?? []);
    const tasks = projectTasks(taskGroups);

    if (tasks.length === 0) {
        return {
            total: allTasks.length === 0 ? fallbackSummary.total ?? 0 : 0,
            completed: allTasks.length === 0 ? fallbackSummary.completed ?? 0 : 0,
            open: allTasks.length === 0 ? fallbackSummary.open ?? 0 : 0,
            groups: fallbackSummary.groups ?? 0,
        };
    }

    return {
        total: tasks.length,
        completed: tasks.filter((task) => task.completed).length,
        open: tasks.filter((task) => !task.completed).length,
        groups: fallbackSummary.groups ?? 0,
    };
}

export function formatTaskCompletionSummary(summary) {
    const completed = Number(summary?.completed ?? 0);
    const total = Number(summary?.total ?? 0);

    return `${Number.isFinite(completed) ? completed : 0}/${Number.isFinite(total) ? total : 0}`;
}

export function taskFilters(taskGroups, currentUserId) {
    const tasks = projectTasks(taskGroups);

    return [
        {
            value: 'all',
            label: 'All',
            count: tasks.length,
        },
        {
            value: 'open',
            label: 'Open',
            count: tasks.filter((task) => !task.completed).length,
        },
        {
            value: 'completed',
            label: 'Completed',
            count: tasks.filter((task) => task.completed).length,
        },
        {
            value: 'mine',
            label: 'Mine',
            count: currentUserId
                ? tasks.filter((task) => Number(task.assignee_user_id) === Number(currentUserId)).length
                : 0,
        },
    ];
}

export function filterTaskGroups(taskGroups, filter, currentUserId) {
    return taskGroups
        .map((group) => {
            const rawTasks = group.tasks ?? [];
            const sourceTasks = (group.tasks ?? []).filter((task) => task.kind !== 'group');
            const tasks = sourceTasks.filter((task) => taskMatchesFilter(task, filter, currentUserId));

            return {
                ...group,
                empty_message: emptyMessageForFilter(filter, 'this person'),
                grouping: 'person',
                completed_count: sourceTasks.filter((task) => task.completed).length,
                source_task_count: sourceTasks.length,
                task_count: sourceTasks.length,
                tasks,
                has_timeline_groups: rawTasks.some((task) => task.kind === 'group'),
            };
        })
        .filter((group) => group.tasks.length > 0 || group.has_timeline_groups || (filter !== 'all' && group.source_task_count > 0));
}

export function groupTasksByTimelineGroup(taskGroups, filter, currentUserId, parentTaskOptions = []) {
    const allTasks = taskGroups.flatMap((group) => group.tasks ?? []);
    const groupOptions = parentTaskOptions.filter((task) => task.kind === 'group');
    const taskMap = new Map([
        ...groupOptions.map((task) => [task.id, task]),
        ...allTasks.map((task) => [task.id, task]),
    ]);
    const timelineGroups = [...taskMap.values()].filter((task) => task.kind === 'group');
    const tasksByGroupId = new Map(timelineGroups.map((group) => [group.id, []]));
    const sourceTasksByGroupId = new Map(timelineGroups.map((group) => [group.id, []]));
    const ungroupedTasks = [];
    const sourceUngroupedTasks = [];

    projectTasks(taskGroups).forEach((task) => {
        const groupId = timelineGroupIdForTask(task, taskMap);
        const matchesFilter = taskMatchesFilter(task, filter, currentUserId);

        if (groupId && tasksByGroupId.has(groupId)) {
            sourceTasksByGroupId.get(groupId).push(task);

            if (matchesFilter) {
                tasksByGroupId.get(groupId).push(task);
            }

            return;
        }

        sourceUngroupedTasks.push(task);

        if (matchesFilter) {
            ungroupedTasks.push(task);
        }
    });

    const sections = timelineGroups
        .map((group) => taskSection(group.name, tasksByGroupId.get(group.id) ?? [], group.id, filter, sourceTasksByGroupId.get(group.id) ?? []))
        .filter((group) => group.tasks.length > 0 || filter !== 'all');

    if (ungroupedTasks.length > 0 || (filter !== 'all' && sourceUngroupedTasks.length > 0)) {
        sections.push(taskSection('No group', ungroupedTasks, 'ungrouped', filter, sourceUngroupedTasks));
    }

    return sections;
}

export function projectTasks(taskGroups) {
    return taskGroups
        .flatMap((group) => group.tasks ?? [])
        .filter((task) => task.kind !== 'group');
}

export function selectableTasks(taskGroups) {
    return projectTasks(taskGroups).filter((task) => task.update_url);
}

export function tasksByIds(taskGroups, taskIds) {
    const taskIdSet = new Set(taskIds);

    return projectTasks(taskGroups).filter((task) => taskIdSet.has(task.id));
}

export function taskActionsForTask(task, handlers) {
    return getTaskRowActions(task, handlers, {
        canAddChildren: true,
        canConvertToGroup: false,
    });
}

export function selectedTaskSelectionActions(tasks, handlers, assigneeOptions = []) {
    const count = tasks.length;
    const hasIncompleteTasks = tasks.some((task) => task.update_url && !task.completed);
    const hasCompletedTasks = tasks.some((task) => task.update_url && task.completed);
    const deletableTasks = tasks.filter((task) => task.destroy_url);

    if (count === 0) {
        return [];
    }

    return [
        assigneeOptions.length > 0
            ? {
                id: 'assign-selected',
                label: 'Assign selected',
                children: assigneeOptions.map((option) => ({
                    id: `assign-selected-${option.value ?? 'unassigned'}`,
                    label: option.label,
                    onSelect: () => handlers.onAssign(option.value),
                })),
            }
            : null,
        hasIncompleteTasks
            ? {
                id: 'mark-selected-complete',
                label: `Mark ${count} complete`,
                onSelect: handlers.onMarkComplete,
            }
            : null,
        hasCompletedTasks
            ? {
                id: 'mark-selected-incomplete',
                label: `Mark ${count} incomplete`,
                onSelect: handlers.onMarkIncomplete,
            }
            : null,
        deletableTasks.length > 0
            ? {
                id: 'delete-selected',
                label: `Delete ${deletableTasks.length}`,
                tone: 'destructive',
                onSelect: () => handlers.onDelete(deletableTasks),
            }
            : null,
    ].filter(Boolean);
}

export function emptyProjectTaskMessage(taskGroups, filter, grouping) {
    if (projectTasks(taskGroups).length === 0) {
        return 'No tasks are attached to this project yet.';
    }

    const label = grouping === 'group' ? 'timeline groups' : 'people';

    if (filter === 'open') {
        return `No open tasks found across ${label}.`;
    }

    if (filter === 'completed') {
        return `No completed tasks found across ${label}.`;
    }

    if (filter === 'mine') {
        return `No tasks assigned to you found across ${label}.`;
    }

    return 'No tasks match this filter.';
}

export function updateTaskInGroups(taskGroups, taskId, updates) {
    return updateTasksInGroups(taskGroups, [taskId], updates);
}

export function updateTasksInGroups(taskGroups, taskIds, updates) {
    const taskIdSet = new Set(taskIds);

    return taskGroups.map((group) => {
        const tasks = (group.tasks ?? []).map((task) => (
            taskIdSet.has(task.id) ? { ...task, ...updates } : task
        ));
        const completedCount = tasks.filter((task) => task.kind !== 'group' && task.completed).length;

        return {
            ...group,
            completed_count: completedCount,
            tasks,
        };
    });
}

function taskSection(name, tasks, id, filter, sourceTasks = tasks) {
    return {
        assignee_id: id,
        assignee_name: name,
        empty_message: emptyMessageForFilter(filter, 'this group'),
        grouping: 'group',
        parent_id: id === 'ungrouped' ? '' : id,
        completed_count: sourceTasks.filter((task) => task.completed).length,
        source_task_count: sourceTasks.length,
        task_count: sourceTasks.length,
        tasks,
    };
}

function timelineGroupIdForTask(task, taskMap) {
    let parentId = task.parent_id;

    while (parentId) {
        const parent = taskMap.get(parentId);

        if (!parent) {
            return null;
        }

        if (parent.kind === 'group') {
            return parent.id;
        }

        parentId = parent.parent_id;
    }

    return null;
}

function taskMatchesFilter(task, filter, currentUserId) {
    if (filter === 'open') {
        return !task.completed;
    }

    if (filter === 'completed') {
        return task.completed;
    }

    if (filter === 'mine') {
        return currentUserId && Number(task.assignee_user_id) === Number(currentUserId);
    }

    return true;
}

function emptyMessageForFilter(filter, label) {
    if (filter === 'open') {
        return `No open tasks for ${label}.`;
    }

    if (filter === 'completed') {
        return `No completed tasks for ${label}.`;
    }

    if (filter === 'mine') {
        return `No tasks assigned to you for ${label}.`;
    }

    return `No tasks for ${label}.`;
}
