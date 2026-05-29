import { router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { DEFAULT_TIMELINE_DENSITY, timelineDensityFor } from './constants';
import {
    applyMarqueeSelection,
    coerceSidebarHitIds,
    directBatchCompletionIds,
    extendSidebarSelection,
    normalizeSelectedSidebarIds,
    selectableSidebarItems,
    toggleSidebarSelection,
} from './sidebarSelection';
import { defaultProjectForm } from './projectDialogForm';
import { buildBars, buildDays, buildRows, request, selectionFromUrl } from './utils';
import { useTimelineDrag } from './useTimelineDrag';
import { useTimelineMutations } from './useTimelineMutations';

export function useTimelineBoard({ activeTimelineView, timelineData, routes, createTaskUrlTemplate, duplicateTaskUrlTemplate, reorderTaskUrlTemplate, updateTaskUrlTemplate }) {
    const [data, setData] = useState(timelineData);
    const [drafts, setDrafts] = useState({});
    const [openComposerParentId, setOpenComposerParentId] = useState(null);
    const [focusedComposerParentId, setFocusedComposerParentId] = useState(null);
    const [hoveredTaskId, setHoveredTaskId] = useState(null);
    const [collapsedGroupIds, setCollapsedGroupIds] = useState([]);
    const [selectedSidebarItemIds, setSelectedSidebarItemIds] = useState([]);
    const [sidebarSelectionAnchorId, setSidebarSelectionAnchorId] = useState(null);
    const [dependencyDragState, setDependencyDragState] = useState({
        activeTaskId: null,
        targetTaskId: null,
        clearCandidate: false,
    });
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [timelineDensityKey, setTimelineDensityKey] = useState(() => {
        if (timelineData.timeline_density) {
            return timelineDensityFor(timelineData.timeline_density).key;
        }

        if (typeof window === 'undefined') {
            return DEFAULT_TIMELINE_DENSITY;
        }

        return window.localStorage.getItem('rechrono.timelineDensity') ?? DEFAULT_TIMELINE_DENSITY;
    });
    const [projectFormOpen, setProjectFormOpen] = useState(false);
    const [projectForm, setProjectForm] = useState(defaultProjectForm);
    const [projectModalProjectId, setProjectModalProjectId] = useState(null);
    const [projectModalForm, setProjectModalForm] = useState({ name: '', description: '', parent_id: '' });
    const [taskModalTaskId, setTaskModalTaskId] = useState(null);
    const [taskModalForm, setTaskModalForm] = useState({
        name: '',
        description: '',
        project_id: '',
        parent_id: null,
        assignee_value: '',
        start_date: '',
        end_date: '',
        completed: false,
    });
    const [groupModalGroupId, setGroupModalGroupId] = useState(null);
    const [groupModalOpen, setGroupModalOpen] = useState(false);
    const [groupModalForm, setGroupModalForm] = useState({
        name: '',
        project_id: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const dataRef = useRef(timelineData);
    const timelineDensity = useMemo(() => timelineDensityFor(timelineDensityKey), [timelineDensityKey]);

    const layout = useMemo(
        () => buildDays(data.range_start, data.range_end, data.show_weekends ?? false, timelineDensity),
        [data.range_start, data.range_end, data.show_weekends, timelineDensity],
    );
    const rows = useMemo(
        () => buildRows(
            data.projects,
            data.visible_project_ids ?? data.selected_project_ids,
            data.items,
            openComposerParentId,
            data.collapsed_project_ids ?? [],
            collapsedGroupIds,
        ),
        [collapsedGroupIds, data.items, data.projects, data.selected_project_ids, data.visible_project_ids, data.collapsed_project_ids, openComposerParentId],
    );
    const bars = useMemo(
        () => buildBars(rows, layout.days, data.show_weekends ?? false, timelineDensity),
        [rows, layout.days, data.show_weekends, timelineDensity],
    );
    const selectableItems = useMemo(() => selectableSidebarItems(rows), [rows]);
    const selectableItemIds = useMemo(() => selectableItems.map((item) => item.id), [selectableItems]);
    const selectedSidebarRootIds = useMemo(
        () => normalizeSelectedSidebarIds(selectedSidebarItemIds, selectableItemIds, selectableItems),
        [selectedSidebarItemIds, selectableItemIds, selectableItems],
    );

    useEffect(() => {
        dataRef.current = timelineData;
        setData(timelineData);

        if (timelineData.timeline_density) {
            const nextDensity = timelineDensityFor(timelineData.timeline_density);
            setTimelineDensityKey(nextDensity.key);

            if (typeof window !== 'undefined') {
                window.localStorage.setItem('rechrono.timelineDensity', nextDensity.key);
            }
        }
    }, [timelineData]);

    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    useEffect(() => {
        setSelectedSidebarItemIds((current) => current.filter((itemId) => selectableItemIds.includes(itemId)));
        setSidebarSelectionAnchorId((current) => (current && selectableItemIds.includes(current) ? current : null));
    }, [selectableItemIds]);

    function descendantsOf(taskId) {
        const directChildren = dataRef.current.items.filter((item) => item.parent_id === taskId);
        const descendants = [];

        for (const child of directChildren) {
            descendants.push(child);
            descendants.push(...descendantsOf(child.id));
        }

        return descendants;
    }

    function ancestorsOf(taskId) {
        const ancestors = [];
        let currentParentId = dataRef.current.items.find((item) => item.id === taskId)?.parent_id ?? null;

        while (currentParentId !== null) {
            ancestors.push(currentParentId);
            currentParentId = dataRef.current.items.find((item) => item.id === currentParentId)?.parent_id ?? null;
        }

        return ancestors;
    }

    function taskCanAddChildren(task) {
        return task.depth < (data.max_depth ?? 2);
    }

    function itemHasChildren(itemId) {
        return data.items.some((candidate) => candidate.parent_id === itemId);
    }

    function clearSidebarSelection() {
        setSelectedSidebarItemIds([]);
        setSidebarSelectionAnchorId(null);
    }

    function setSingleSidebarSelection(itemId) {
        setSelectedSidebarItemIds(itemId ? [itemId] : []);
        setSidebarSelectionAnchorId(itemId ?? null);
    }

    async function persistTimelineViewSettings(nextData = dataRef.current, densityKey = timelineDensity.key) {
        if (!activeTimelineView?.update_url) {
            return;
        }

        await request(activeTimelineView.update_url, {
            method: 'PATCH',
            body: JSON.stringify({
                project_ids: nextData.selected_project_ids,
                assignee_filters: nextData.selected_assignee_filters ?? [],
                show_weekends: nextData.show_weekends ?? false,
                timeline_density: timelineDensityFor(densityKey).key,
                collapsed_project_ids: nextData.collapsed_project_ids ?? [],
            }),
        });
    }

    function toggleSidebarItemSelection(itemId) {
        setSelectedSidebarItemIds((current) => toggleSidebarSelection(current, selectableItemIds, selectableItems, itemId));
        setSidebarSelectionAnchorId(itemId);
    }

    function extendSidebarItemRange(itemId) {
        setSelectedSidebarItemIds((current) => extendSidebarSelection(
            current,
            sidebarSelectionAnchorId ?? itemId,
            itemId,
            selectableItemIds,
            selectableItems,
        ));
        setSidebarSelectionAnchorId(sidebarSelectionAnchorId ?? itemId);
    }

    function handleSidebarItemClick(item, event) {
        if (event.shiftKey) {
            extendSidebarItemRange(item.id);

            return;
        }

        if (event.metaKey || event.ctrlKey) {
            toggleSidebarItemSelection(item.id);

            return;
        }

        setSingleSidebarSelection(item.id);
        openTaskModal(item);
    }

    function applySidebarMarqueeSelection(hitIds, modifiers) {
        const resolvedHitIds = coerceSidebarHitIds(hitIds, selectableItemIds);

        setSelectedSidebarItemIds((current) => applyMarqueeSelection(
            current,
            resolvedHitIds,
            selectableItemIds,
            selectableItems,
            modifiers,
        ));
        setSidebarSelectionAnchorId(resolvedHitIds[0] ?? null);
    }

    async function markSelectedSidebarItems(completed) {
        const completionIds = directBatchCompletionIds(selectedSidebarRootIds, dataRef.current.items);

        if (!completionIds.length) {
            return;
        }

        await markTaskSetCompletion(completionIds, completed);
    }

    useEffect(() => {
        if (!selectedSidebarItemIds.length) {
            return undefined;
        }

        function onKeyDown(event) {
            if (event.key !== 'Escape') {
                return;
            }

            clearSidebarSelection();
        }

        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [selectedSidebarItemIds.length]);

    const breadcrumbs = useMemo(() => {
        if ((data.selected_project_ids ?? []).length !== 1) {
            return [{ label: 'All projects', projectId: null }];
        }

        const selectedProject = data.projects.find((project) => project.id === data.selected_project_ids[0]);

        if (!selectedProject) {
            return [{ label: 'All projects', projectId: null }];
        }

        const crumbs = [{ label: 'All projects', projectId: null }];

        if (selectedProject.parent_id) {
            const parent = data.projects.find((project) => project.id === selectedProject.parent_id);

            if (parent) {
                crumbs.push({ label: parent.name, projectId: parent.id });
            }
        }

        crumbs.push({ label: selectedProject.name, projectId: selectedProject.id });

        return crumbs;
    }, [data.projects, data.selected_project_ids]);

    function projectHasChildren(projectId) {
        return data.projects.some((project) => project.parent_id === projectId);
    }

    function projectCanCollapse(projectId) {
        return projectHasChildren(projectId) || data.items.some((item) => item.project_id === projectId);
    }

    const { shouldSuppressClick, startDrag: persistDragStart } = useTimelineDrag({
        columnWidth: timelineDensity.columnWidth,
        dataRef,
        setData,
        setDependencyDragState,
        updateTaskUrlTemplate,
    });

    const {
        markTaskCompletion,
        rootComposerKey,
        loadSelection,
        convertTaskToGroup,
        createGroup,
        deleteProject,
        deleteTask,
        duplicateProject,
        duplicateTask,
        reorderTasks,
        reorderTaskSet,
        renameTask,
        saveProjectAsTemplate,
        setProjectArchived,
        updateTask,
        updateProject,
        selectAllProjects,
        selectSingleProject,
        selectAllAssignees,
        setShowWeekends,
        submitProject,
        submitTask,
        toggleProjectCollapse,
        toggleAssigneeSelection,
        toggleProjectSelection,
        updateTaskAssignee,
        markTaskSetCompletion,
    } = useTimelineMutations({
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
        onTimelineViewSettingsChange: persistTimelineViewSettings,
    });

    useEffect(() => {
        function onPopState() {
            const selection = selectionFromUrl(
                window.location.href,
                dataRef.current.projects,
                dataRef.current.assignee_options ?? [],
            );

            loadSelection(selection.projectIds, selection.assigneeFilters, {
                collapsedProjectIds: selection.collapsedProjectIds,
                showWeekends: selection.showWeekends,
                writeHistory: false,
            });
        }

        window.addEventListener('popstate', onPopState);

        return () => {
            window.removeEventListener('popstate', onPopState);
        };
    }, [loadSelection]);

    function startDrag(event, task, mode) {
        persistDragStart(event, task, mode, descendantsOf(task.id), ancestorsOf(task.id));
    }

    function setTimelineDensity(nextDensityKey) {
        const nextDensity = timelineDensityFor(nextDensityKey);
        setTimelineDensityKey(nextDensity.key);

        if (typeof window !== 'undefined') {
            window.localStorage.setItem('rechrono.timelineDensity', nextDensity.key);
        }

        persistTimelineViewSettings(dataRef.current, nextDensity.key);
    }

    async function saveTimelineView(name) {
        const trimmedName = name.trim();

        if (!trimmedName || isSaving) {
            return;
        }

        setIsSaving(true);

        try {
            await request(routes.timelineViewsStore, {
                method: 'POST',
                body: JSON.stringify({
                    name: trimmedName,
                    project_ids: dataRef.current.selected_project_ids,
                    assignee_filters: dataRef.current.selected_assignee_filters ?? [],
                    show_weekends: dataRef.current.show_weekends ?? false,
                    timeline_density: timelineDensity.key,
                    collapsed_project_ids: dataRef.current.collapsed_project_ids ?? [],
                }),
            });

            router.reload({
                preserveScroll: true,
            });
        } finally {
            setIsSaving(false);
        }
    }

    function toggleComposer(taskId) {
        setOpenComposerParentId((current) => {
            const nextId = current === taskId ? null : taskId;
            setFocusedComposerParentId(nextId);

            return nextId;
        });
    }

    async function handleSubmitTask(parentId, projectId) {
        await submitTask(parentId, projectId);

        if (parentId !== null) {
            setFocusedComposerParentId(null);
        }
    }

    function openProjectModal(project) {
        setProjectModalProjectId(project.id);
        setProjectModalForm({
            name: project.name,
            description: project.description ?? '',
            parent_id: project.parent_id ?? '',
        });
    }

    function openProjectForm() {
        setProjectForm(defaultProjectForm());
        setProjectFormOpen(true);
    }

    function closeProjectForm(open) {
        if (open === false) {
            setProjectForm(defaultProjectForm());
        }

        setProjectFormOpen(Boolean(open));
    }

    function closeProjectModal() {
        setProjectModalProjectId(null);
        setProjectModalForm({ name: '', description: '', parent_id: '' });
    }

    function openTaskModal(task) {
        if (shouldSuppressClick(task.id)) {
            return;
        }

        if (task.kind === 'group') {
            closeTaskModal();
            openGroupModal(task);
            return;
        }

        closeGroupModal();
        setTaskModalTaskId(task.id);
        setTaskModalForm({
            name: task.name,
            description: task.description ?? '',
            project_id: task.project_id,
            parent_id: task.parent_id ?? null,
            assignee_value: task.assignee_user_id ? String(task.assignee_user_id) : '',
            start_date: task.start,
            end_date: task.end,
            completed: Boolean(task.completed),
        });
    }

    function closeTaskModal() {
        setTaskModalTaskId(null);
        setTaskModalForm({
            name: '',
            description: '',
            project_id: '',
            parent_id: null,
            assignee_value: '',
            start_date: '',
            end_date: '',
            completed: false,
        });
    }

    function openGroupModal(group) {
        if (shouldSuppressClick(group.id)) {
            return;
        }

        closeTaskModal();
        setGroupModalGroupId(group.id);
        setGroupModalOpen(true);
        setGroupModalForm({
            name: group.name,
            project_id: group.project_id,
        });
    }

    function openGroupCreate(project) {
        closeTaskModal();
        setGroupModalGroupId(null);
        setGroupModalOpen(true);
        setGroupModalForm({
            name: '',
            project_id: project.id,
        });
    }

    function closeGroupModal() {
        setGroupModalGroupId(null);
        setGroupModalOpen(false);
        setGroupModalForm({
            name: '',
            project_id: '',
        });
    }

    async function submitGroupModal() {
        const nextName = groupModalForm.name.trim();

        if (nextName === '' || !groupModalForm.project_id) {
            return;
        }

        if (!groupModalGroupId) {
            await createGroup(groupModalForm.project_id, nextName);
            closeGroupModal();
            return;
        }

        const group = data.items.find((item) => item.id === groupModalGroupId);

        if (!group) {
            return;
        }

        await updateTask(group, {
            name: nextName,
            project_id: groupModalForm.project_id,
            parent_id: null,
        });
        closeGroupModal();
    }

    async function removeGroupFromModal() {
        const group = data.items.find((item) => item.id === groupModalGroupId);

        if (!group) {
            return;
        }

        await deleteTask(group);
        closeGroupModal();
    }

    async function duplicateGroupFromModal() {
        const group = data.items.find((item) => item.id === groupModalGroupId);

        if (!group) {
            return;
        }

        await duplicateTask(group);
        closeGroupModal();
    }

    async function submitTaskModal() {
        const task = dataRef.current.items.find((item) => item.id === taskModalTaskId);
        const nextName = taskModalForm.name.trim();

        if (!task || nextName === '') {
            return;
        }

        const assigneeUserId = taskModalForm.assignee_value ? Number(taskModalForm.assignee_value) : null;

        await updateTask(task, {
            name: nextName,
            description: taskModalForm.description.trim() || null,
            project_id: taskModalForm.project_id,
            parent_id: taskModalForm.parent_id,
            assignee_user_id: assigneeUserId,
            start_date: taskModalForm.start_date,
            end_date: taskModalForm.end_date,
            completed: taskModalForm.completed,
        });
        closeTaskModal();
    }

    async function removeTaskFromModal() {
        const task = dataRef.current.items.find((item) => item.id === taskModalTaskId);

        if (!task) {
            return;
        }

        await deleteTask(task);
        closeTaskModal();
    }

    async function duplicateTaskFromModal() {
        const task = dataRef.current.items.find((item) => item.id === taskModalTaskId);

        if (!task) {
            return;
        }

        await duplicateTask(task);
        closeTaskModal();
    }

    async function submitProjectModal() {
        const project = data.projects.find((item) => item.id === projectModalProjectId);
        const nextName = projectModalForm.name.trim();

        if (!project || nextName === '') {
            return;
        }

        await updateProject(project, {
            name: nextName,
            description: projectModalForm.description,
            parent_id: projectModalForm.parent_id || null,
        });
        closeProjectModal();
    }

    async function archiveProjectFromModal() {
        const project = data.projects.find((item) => item.id === projectModalProjectId);

        if (!project) {
            return;
        }

        await setProjectArchived(project, project.is_active !== false);
        closeProjectModal();
    }

    async function removeProjectFromModal() {
        const project = data.projects.find((item) => item.id === projectModalProjectId);

        if (!project) {
            return;
        }

        await deleteProject(project);
        closeProjectModal();
    }

    async function duplicateProjectFromModal() {
        const project = data.projects.find((item) => item.id === projectModalProjectId);

        if (!project) {
            return;
        }

        await duplicateProject(project);
        closeProjectModal();
    }

    async function saveProjectAsTemplateFromModal() {
        const project = data.projects.find((item) => item.id === projectModalProjectId);

        if (!project) {
            return;
        }

        await saveProjectAsTemplate(project);
        closeProjectModal();
    }

    const taskModalParentOptions = useMemo(() => {
        if (!taskModalTaskId || !taskModalForm.project_id) {
            return [];
        }

        const sameProjectTasks = data.items.filter((item) => item.project_id === taskModalForm.project_id && item.id !== taskModalTaskId);
        const descendantIds = new Set(descendantsOf(taskModalTaskId).map((item) => item.id));

        return sameProjectTasks
            .filter((item) => !descendantIds.has(item.id))
            .sort((a, b) => {
                if (a.kind !== b.kind) {
                    return a.kind === 'group' ? -1 : 1;
                }

                return (a.sort_order ?? 0) - (b.sort_order ?? 0);
            });
    }, [data.items, taskModalForm.project_id, taskModalTaskId]);

    function setTaskModalField(field, value) {
        setTaskModalForm((current) => {
            const next = {
                ...current,
                [field]: value,
            };

            if (field === 'project_id') {
                const validParent = dataRef.current.items.some((item) => item.id === current.parent_id && item.project_id === value);
                next.parent_id = validParent ? current.parent_id : null;
            }

            return next;
        });
    }

    function setProjectModalField(field, value) {
        setProjectModalForm((current) => ({
            ...current,
            [field]: value,
        }));
    }

    function setGroupModalField(field, value) {
        setGroupModalForm((current) => ({
            ...current,
            [field]: value,
        }));
    }

    function toggleGroupCollapse(groupId) {
        setCollapsedGroupIds((current) => (
            current.includes(groupId)
                ? current.filter((id) => id !== groupId)
                : [...current, groupId]
        ));
    }

    return {
        BAR_HEIGHT: timelineDensity.barHeight,
        ROW_HEIGHT: timelineDensity.rowHeight,
        bars,
        breadcrumbs,
        clearSidebarSelection,
        collapsedProjectIds: data.collapsed_project_ids ?? [],
        data,
        dependencyDragState,
        drafts,
        filtersOpen,
        focusedComposerParentId,
        hoveredTaskId,
        isSaving,
        layout,
        loadSelection,
        markTaskCompletion,
        maxDepth: data.max_depth ?? 2,
        markSelectedSidebarItems,
        openComposerParentId,
        projectForm,
        projectFormOpen,
        projectModalProjectId,
        projectModalForm,
        projectModalOpen: projectModalProjectId !== null,
        groupModalForm,
        groupModalGroupId,
        groupModalOpen,
        rootComposerKey,
        selectedSidebarItemIds,
        selectedSidebarRootIds,
        reorderTasks,
        reorderTaskSet,
        rows,
        selectAllAssignees,
        selectAllProjects,
        selectSingleProject,
        itemHasChildren,
        projectHasChildren,
        projectCanCollapse,
        collapsedGroupIds,
        toggleGroupCollapse,
        openGroupCreate,
        openGroupModal,
        closeGroupModal,
        convertTaskToGroup,
        submitGroupModal,
        removeGroupFromModal,
        duplicateGroupFromModal,
        removeTaskFromModal,
        removeProjectFromModal,
        archiveProjectFromModal,
        deleteProject,
        deleteTask,
        duplicateProject,
        duplicateTask,
        saveProjectAsTemplateFromModal,
        saveProjectAsTemplate,
        setShowWeekends,
        setDrafts,
        setFiltersOpen,
        setOpenComposerParentId,
        setProjectModalField,
        setProjectForm,
        setProjectFormOpen: closeProjectForm,
        setGroupModalField,
        setTaskModalField,
        startDrag,
        submitProjectModal,
        submitProject,
        submitTask: handleSubmitTask,
        submitTaskModal,
        taskCanAddChildren,
        taskModalForm,
        taskModalOpen: taskModalTaskId !== null,
        taskModalParentOptions,
        timelineWidth: layout.timelineWidth,
        timelineDensity,
        setTimelineDensity,
        saveTimelineView,
        toggleSidebarItemSelection,
        toggleAssigneeSelection,
        toggleComposer,
        toggleProjectCollapse,
        toggleProjectSelection,
        updateTaskAssignee,
        setSingleSidebarSelection,
        handleSidebarItemClick,
        applySidebarMarqueeSelection,
        extendSidebarItemRange,
        duplicateTaskFromModal,
        duplicateProjectFromModal,
        openTaskModal,
        openProjectModal,
        openProjectForm,
        closeTaskModal,
        closeProjectModal,
        setDependencyDragState,
        setHoveredTaskId,
        setSingleSidebarSelection,
    };
}
