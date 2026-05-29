import {
    createTaskUrl,
    formatDate,
    parseDateString,
    projectUrl,
    reorderSiblingItems,
    reparentItem,
    request,
    selectionUrl,
    taskUrl,
} from './utils';
import { defaultProjectForm, projectCreationRequest } from './projectDialogForm';

export function useTimelineMutations({
    createTaskUrlTemplate,
    duplicateTaskUrlTemplate,
    dataRef,
    drafts,
    isSaving,
    projectForm,
    reorderTaskUrlTemplate,
    routes,
    updateTaskUrlTemplate,
    setData,
    setDrafts,
    setFiltersOpen,
    setIsSaving,
    setOpenComposerParentId,
    setProjectForm,
    setProjectFormOpen,
    onTimelineViewSettingsChange,
}) {
    function findTask(taskId) {
        return dataRef.current.items.find((item) => item.id === taskId) ?? null;
    }

    function syncUrl(projectIds, assigneeFilters, collapsedProjectIds, options = {}) {
        const { history = 'replace' } = options;
        window.history[history === 'push' ? 'pushState' : 'replaceState'](
            {},
            '',
            selectionUrl(
                projectIds,
                dataRef.current.projects,
                assigneeFilters,
                dataRef.current.assignee_options ?? [],
                routes.tasks,
                dataRef.current.show_weekends ?? false,
                collapsedProjectIds,
            ),
        );
    }

    function allAssigneeFilters() {
        return (dataRef.current.assignee_options ?? []).map((option) => option.filter_value).filter(Boolean);
    }

    async function loadSelection(projectIds, assigneeFilters, options = {}) {
        const { closeFilters = false, history = 'push', writeHistory = true } = options;
        const showWeekends = options.showWeekends ?? (dataRef.current.show_weekends ?? false);
        const collapsedProjectIds = options.collapsedProjectIds ?? (dataRef.current.collapsed_project_ids ?? []);
        const normalizedIds = projectIds.length ? projectIds : dataRef.current.projects.map((project) => project.id);
        const normalizedAssigneeFilters = assigneeFilters.length
            ? assigneeFilters
            : (dataRef.current.assignee_options ?? []).map((option) => option.filter_value).filter(Boolean);
        const payload = await request(
            selectionUrl(
                normalizedIds,
                dataRef.current.projects,
                normalizedAssigneeFilters,
                dataRef.current.assignee_options ?? [],
                routes.tasksData,
                showWeekends,
                collapsedProjectIds,
            ),
        );

        dataRef.current = payload;
        setData(payload);
        if (closeFilters) {
            setFiltersOpen(false);
        }
        if (writeHistory) {
            syncUrl(normalizedIds, normalizedAssigneeFilters, payload.collapsed_project_ids ?? collapsedProjectIds, { history });
        }
        onTimelineViewSettingsChange?.(payload);
    }

    async function toggleProjectSelection(projectId) {
        const nextSelection = dataRef.current.selected_project_ids.includes(projectId)
            ? dataRef.current.selected_project_ids.filter((id) => id !== projectId)
            : [...dataRef.current.selected_project_ids, projectId];

        await loadSelection(nextSelection, dataRef.current.selected_assignee_filters ?? []);
    }

    async function toggleAssigneeSelection(assigneeFilter) {
        const currentFilters = dataRef.current.selected_assignee_filters ?? [];
        const nextFilters = currentFilters.includes(assigneeFilter)
            ? currentFilters.filter((value) => value !== assigneeFilter)
            : [...currentFilters, assigneeFilter];

        await loadSelection(dataRef.current.selected_project_ids, nextFilters);
    }

    async function selectAllProjects() {
        await loadSelection(
            dataRef.current.projects.map((project) => project.id),
            dataRef.current.selected_assignee_filters ?? [],
        );
    }

    async function selectSingleProject(projectId) {
        const expandedCollapsedProjectIds = (dataRef.current.collapsed_project_ids ?? []).filter((id) => {
            if (id === projectId) {
                return false;
            }

            const project = dataRef.current.projects.find((candidate) => candidate.id === id);

            return project?.parent_id !== projectId;
        });

        await loadSelection(
            [projectId],
            dataRef.current.selected_assignee_filters ?? [],
            {
                collapsedProjectIds: expandedCollapsedProjectIds,
            },
        );
    }

    async function selectAllAssignees() {
        await loadSelection(
            dataRef.current.selected_project_ids,
            (dataRef.current.assignee_options ?? []).map((option) => option.filter_value).filter(Boolean),
        );
    }

    async function setShowWeekends(showWeekends) {
        await loadSelection(
            dataRef.current.selected_project_ids,
            dataRef.current.selected_assignee_filters ?? [],
            { showWeekends },
        );
    }

    async function submitProject() {
        if (!projectForm.name.trim() || isSaving) {
            return;
        }

        setIsSaving(true);

        try {
            const projectRequest = projectCreationRequest({
                form: projectForm,
                routes,
                timelineState: dataRef.current,
            });
            const payload = await request(projectRequest.url, {
                method: 'POST',
                body: JSON.stringify(projectRequest.body),
            });

            dataRef.current = payload;
            setData(payload);
            setProjectForm(defaultProjectForm());
            setProjectFormOpen(false);
            syncUrl(payload.selected_project_ids, payload.selected_assignee_filters ?? [], payload.collapsed_project_ids ?? [], { history: 'replace' });
        } finally {
            setIsSaving(false);
        }
    }

    async function updateProject(project, changes) {
        const payload = await request(projectUrl(routes.projectsUpdate, project.id), {
            method: 'PATCH',
            body: JSON.stringify({
                ...changes,
                selected_project_ids: dataRef.current.selected_project_ids,
                selected_assignee_filters: dataRef.current.selected_assignee_filters ?? [],
                show_weekends: dataRef.current.show_weekends ?? false,
                collapsed_project_ids: dataRef.current.collapsed_project_ids ?? [],
            }),
        });

        dataRef.current = payload;
        setData(payload);
        syncUrl(payload.selected_project_ids, payload.selected_assignee_filters ?? [], payload.collapsed_project_ids ?? [], { history: 'replace' });
    }

    async function setProjectArchived(project, archived) {
        await request(routes.projectsBulkAction, {
            method: 'POST',
            body: JSON.stringify({
                action: archived ? 'archive' : 'unarchive',
                project_ids: [project.id],
            }),
        });

        await loadSelection(dataRef.current.selected_project_ids, dataRef.current.selected_assignee_filters ?? [], {
            collapsedProjectIds: dataRef.current.collapsed_project_ids ?? [],
            history: 'replace',
        });
    }

    async function duplicateProject(project) {
        const payload = await request(projectUrl(routes.projectsDuplicate, project.id), {
            method: 'POST',
            body: JSON.stringify({
                selected_project_ids: dataRef.current.selected_project_ids,
                selected_assignee_filters: dataRef.current.selected_assignee_filters ?? [],
                show_weekends: dataRef.current.show_weekends ?? false,
                collapsed_project_ids: dataRef.current.collapsed_project_ids ?? [],
            }),
        });

        dataRef.current = payload;
        setData(payload);
        syncUrl(payload.selected_project_ids, payload.selected_assignee_filters ?? [], payload.collapsed_project_ids ?? [], { history: 'replace' });
    }

    async function saveProjectAsTemplate(project) {
        const payload = await request(projectUrl(routes.projectsTemplate, project.id), {
            method: 'POST',
            body: JSON.stringify({
                selected_project_ids: dataRef.current.selected_project_ids,
                selected_assignee_filters: dataRef.current.selected_assignee_filters ?? [],
                show_weekends: dataRef.current.show_weekends ?? false,
                collapsed_project_ids: dataRef.current.collapsed_project_ids ?? [],
            }),
        });

        dataRef.current = payload;
        setData(payload);
        syncUrl(payload.selected_project_ids, payload.selected_assignee_filters ?? [], payload.collapsed_project_ids ?? [], { history: 'replace' });
    }

    async function deleteProject(project) {
        const payload = await request(projectUrl(routes.projectsDestroy, project.id), {
            method: 'DELETE',
            body: JSON.stringify({
                selected_project_ids: dataRef.current.selected_project_ids,
                selected_assignee_filters: dataRef.current.selected_assignee_filters ?? [],
                show_weekends: dataRef.current.show_weekends ?? false,
                collapsed_project_ids: dataRef.current.collapsed_project_ids ?? [],
            }),
        });

        dataRef.current = payload;
        setData(payload);
        syncUrl(payload.selected_project_ids, payload.selected_assignee_filters ?? [], payload.collapsed_project_ids ?? [], { history: 'replace' });
    }

    function rootComposerKey(projectId) {
        return `root:${projectId}`;
    }

    function nextTaskDates(projectId, parentId) {
        const siblings = dataRef.current.items.filter(
            (item) => item.project_id === projectId && (item.parent_id ?? null) === (parentId ?? null),
        );

        if (!siblings.length) {
            const parent = parentId ? findTask(parentId) : null;

            if (parent) {
                return {
                    start_date: parent.start,
                    end_date: parent.start,
                };
            }

            const projectTasks = dataRef.current.items.filter((item) => item.project_id === projectId);

            if (projectTasks.length) {
                const next = parseDateString(projectTasks.sort((a, b) => a.sort_order - b.sort_order).at(-1).end);
                next.setDate(next.getDate() + 1);

                return {
                    start_date: formatDate(next),
                    end_date: formatDate(next),
                };
            }
        }

        if (siblings.length) {
            const lastTask = siblings.sort((a, b) => a.sort_order - b.sort_order).at(-1);
            const next = parseDateString(lastTask.end);
            next.setDate(next.getDate() + 1);

            return {
                start_date: formatDate(next),
                end_date: formatDate(next),
            };
        }

        const today = new Date().toISOString().slice(0, 10);

        return {
            start_date: today,
            end_date: today,
        };
    }

    async function submitTask(parentId, projectId) {
        const draftKey = parentId ?? rootComposerKey(projectId);
        const names = (drafts[draftKey] ?? '')
            .split(',')
            .map((name) => name.trim())
            .filter(Boolean);

        if (!names.length || isSaving) {
            setDrafts((previous) => ({
                ...previous,
                [draftKey]: names.join(', '),
            }));

            return;
        }

        setIsSaving(true);

        try {
            let payload = null;

            for (const name of names) {
                const defaults = nextTaskDates(projectId, parentId);
                payload = await request(createTaskUrl(createTaskUrlTemplate, projectId), {
                    method: 'POST',
                    body: JSON.stringify({
                        name,
                        parent_id: parentId,
                        start_date: defaults.start_date,
                        end_date: defaults.end_date,
                        selected_project_ids: dataRef.current.selected_project_ids,
                        selected_assignee_filters: dataRef.current.selected_assignee_filters ?? [],
                        show_weekends: dataRef.current.show_weekends ?? false,
                        collapsed_project_ids: dataRef.current.collapsed_project_ids ?? [],
                    }),
                });

                dataRef.current = payload;
                setData(payload);
            }

            setDrafts((previous) => ({
                ...previous,
                [draftKey]: '',
            }));

            if (parentId !== null) {
                setOpenComposerParentId(null);
            }

            if (payload?.selected_project_ids) {
                syncUrl(payload.selected_project_ids, payload.selected_assignee_filters ?? [], payload.collapsed_project_ids ?? [], { history: 'replace' });
            }
        } finally {
            setIsSaving(false);
        }
    }

    async function createGroup(projectId, name) {
        setIsSaving(true);

        try {
            const payload = await request(createTaskUrl(createTaskUrlTemplate, projectId), {
                method: 'POST',
                body: JSON.stringify({
                    kind: 'group',
                    name,
                    project_id: projectId,
                    parent_id: null,
                    selected_project_ids: dataRef.current.selected_project_ids,
                    selected_assignee_filters: dataRef.current.selected_assignee_filters ?? [],
                    show_weekends: dataRef.current.show_weekends ?? false,
                    collapsed_project_ids: dataRef.current.collapsed_project_ids ?? [],
                }),
            });

            dataRef.current = payload;
            setData(payload);

            if (payload?.selected_project_ids) {
                syncUrl(payload.selected_project_ids, payload.selected_assignee_filters ?? [], payload.collapsed_project_ids ?? [], { history: 'replace' });
            }

            return payload;
        } finally {
            setIsSaving(false);
        }
    }

    async function markTaskCompletion(task, completed) {
        const payload = await request(taskUrl(updateTaskUrlTemplate, task.project_id, task.id), {
            method: 'PATCH',
            body: JSON.stringify({
                completed,
                selected_project_ids: dataRef.current.selected_project_ids,
                selected_assignee_filters: dataRef.current.selected_assignee_filters ?? [],
                show_weekends: dataRef.current.show_weekends ?? false,
                collapsed_project_ids: dataRef.current.collapsed_project_ids ?? [],
            }),
        });

        dataRef.current = payload;
        setData(payload);
    }

    async function markTaskSetCompletion(taskIds, completed) {
        for (const taskId of taskIds) {
            const task = findTask(taskId);

            if (!task) {
                continue;
            }

            // Groups are structural-only and are expanded by the caller.
            if (task.kind === 'group') {
                continue;
            }

            await markTaskCompletion(task, completed);
        }
    }

    async function updateTaskAssignee(task, assigneeValue) {
        const previousData = dataRef.current;
        const nextAssigneeUserId = assigneeValue ? Number(assigneeValue) : null;
        const nextAssigneeName = previousData.assignee_options?.find((option) => {
            if (nextAssigneeUserId !== null) {
                return option.type === 'user' && option.user_id === nextAssigneeUserId;
            }

            return option.type === null;
        })?.label ?? null;

        const optimisticData = {
            ...previousData,
            items: previousData.items.map((item) => item.id === task.id
                ? {
                    ...item,
                    assignee_user_id: nextAssigneeUserId,
                    assignee_name: nextAssigneeUserId === null ? null : nextAssigneeName,
                }
                : item),
        };

        dataRef.current = optimisticData;
        setData(optimisticData);

        try {
            const payload = await request(taskUrl(updateTaskUrlTemplate, task.project_id, task.id), {
                method: 'PATCH',
                body: JSON.stringify({
                    assignee_user_id: nextAssigneeUserId,
                    selected_project_ids: previousData.selected_project_ids,
                    selected_assignee_filters: previousData.selected_assignee_filters ?? [],
                    show_weekends: previousData.show_weekends ?? false,
                    collapsed_project_ids: previousData.collapsed_project_ids ?? [],
                }),
            });

            dataRef.current = payload;
            setData(payload);
        } catch (error) {
            dataRef.current = previousData;
            setData(previousData);
            throw error;
        }
    }

    async function updateTask(task, changes) {
        const payload = await request(taskUrl(updateTaskUrlTemplate, task.project_id, task.id), {
            method: 'PATCH',
            body: JSON.stringify({
                ...changes,
                selected_project_ids: dataRef.current.selected_project_ids,
                selected_assignee_filters: dataRef.current.selected_assignee_filters ?? [],
                show_weekends: dataRef.current.show_weekends ?? false,
                collapsed_project_ids: dataRef.current.collapsed_project_ids ?? [],
            }),
        });

        dataRef.current = payload;
        setData(payload);
    }

    async function reorderTasks(task, targetTask, position) {
        const previousData = dataRef.current;
        const optimisticItems = position === 'into'
            ? reparentItem(previousData.items, task.id, targetTask.id)
            : reorderSiblingItems(previousData.items, task.id, targetTask.id, position);
        const optimisticData = {
            ...previousData,
            items: optimisticItems,
        };

        dataRef.current = optimisticData;
        setData(optimisticData);

        try {
            const payload = await request(projectUrl(reorderTaskUrlTemplate, task.project_id), {
                method: 'POST',
                body: JSON.stringify({
                    task_id: task.id,
                    target_task_id: targetTask.id,
                    position,
                    selected_project_ids: previousData.selected_project_ids,
                    selected_assignee_filters: previousData.selected_assignee_filters ?? [],
                    show_weekends: previousData.show_weekends ?? false,
                    collapsed_project_ids: previousData.collapsed_project_ids ?? [],
                }),
            });

            dataRef.current = payload;
            setData(payload);
        } catch (error) {
            dataRef.current = previousData;
            setData(previousData);
            throw error;
        }
    }

    async function reorderTaskSet(taskIds, targetTask, position) {
        const orderedTaskIds = position === 'after'
            ? [...taskIds].reverse()
            : [...taskIds];

        for (const taskId of orderedTaskIds) {
            const task = findTask(taskId);
            const currentTargetTask = findTask(targetTask.id);

            if (!task || !currentTargetTask) {
                continue;
            }

            await reorderTasks(task, currentTargetTask, position);
        }
    }

    async function renameTask(task, name) {
        await updateTask(task, { name });
    }

    async function convertTaskToGroup(task) {
        await updateTask(task, { kind: 'group' });
    }

    async function deleteTask(task) {
        const payload = await request(taskUrl(updateTaskUrlTemplate, task.project_id, task.id), {
            method: 'DELETE',
            body: JSON.stringify({
                selected_project_ids: dataRef.current.selected_project_ids,
                selected_assignee_filters: dataRef.current.selected_assignee_filters ?? [],
                show_weekends: dataRef.current.show_weekends ?? false,
                collapsed_project_ids: dataRef.current.collapsed_project_ids ?? [],
            }),
        });

        dataRef.current = payload;
        setData(payload);
    }

    async function duplicateTask(task) {
        const payload = await request(taskUrl(duplicateTaskUrlTemplate, task.project_id, task.id), {
            method: 'POST',
            body: JSON.stringify({
                selected_project_ids: dataRef.current.selected_project_ids,
                selected_assignee_filters: dataRef.current.selected_assignee_filters ?? [],
                show_weekends: dataRef.current.show_weekends ?? false,
                collapsed_project_ids: dataRef.current.collapsed_project_ids ?? [],
            }),
        });

        dataRef.current = payload;
        setData(payload);
    }

    function toggleProjectCollapse(projectId) {
        const currentCollapsed = dataRef.current.collapsed_project_ids ?? [];
        const nextCollapsed = currentCollapsed.includes(projectId)
            ? currentCollapsed.filter((id) => id !== projectId)
            : [...currentCollapsed, projectId];
        const nextData = {
            ...dataRef.current,
            collapsed_project_ids: nextCollapsed,
        };

        dataRef.current = nextData;
        setData(nextData);
        syncUrl(
            nextData.selected_project_ids,
            nextData.selected_assignee_filters ?? [],
            nextCollapsed,
            { history: 'push' },
        );
        onTimelineViewSettingsChange?.(nextData);
    }

    return {
        markTaskCompletion,
        markTaskSetCompletion,
        rootComposerKey,
        loadSelection,
        reorderTasks,
        reorderTaskSet,
        renameTask,
        selectAllProjects,
        selectSingleProject,
        selectAllAssignees,
        setShowWeekends,
        submitProject,
        createGroup,
        convertTaskToGroup,
        submitTask,
        updateProject,
        duplicateProject,
        setProjectArchived,
        saveProjectAsTemplate,
        deleteTask,
        deleteProject,
        duplicateTask,
        toggleProjectCollapse,
        toggleAssigneeSelection,
        toggleProjectSelection,
        updateTask,
        updateTaskAssignee,
    };
}
