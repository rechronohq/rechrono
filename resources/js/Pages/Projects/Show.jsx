import { Link, router, usePage } from '@inertiajs/react';
import { CalendarDays, CheckCircle2, Circle, ListTodo, MoreHorizontal, Plus, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox, SelectionCheckbox } from '@/components/ui/checkbox';
import { RowContextMenu } from '@/components/RowContextMenu';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import AppBreadcrumb from '@/components/AppBreadcrumb';
import AppPage from '@/Layouts/AppPage';
import { formatProjectDateRange } from '@/lib/formatters';
import { request } from '@/lib/request';
import { toAppPath } from '@/lib/url';
import { cn } from '@/lib/utils';
import { ProjectActionsDropdown } from '@/projects/ProjectActionsDropdown';
import { ProjectTaskViewMenu } from '@/projects/ProjectTaskViewMenu';
import { TaskDialog } from '@/tasks/TaskDialog';
import { getTaskRowActions } from '@/tasks/taskRowActions';

export default function ProjectsShow({ project }) {
    const { auth, routes } = usePage().props;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [taskFilter, setTaskFilter] = useState(() => savedProjectTaskView(project.id).filter);
    const [taskGrouping, setTaskGrouping] = useState(() => savedProjectTaskView(project.id).grouping);
    const [taskModalOpen, setTaskModalOpen] = useState(false);
    const [taskModalMode, setTaskModalMode] = useState('create');
    const [taskModalTask, setTaskModalTask] = useState(null);
    const [taskPendingDelete, setTaskPendingDelete] = useState(null);
    const [tasksPendingDelete, setTasksPendingDelete] = useState([]);
    const [taskForm, setTaskForm] = useState(() => defaultTaskForm(project));
    const [taskGroups, setTaskGroups] = useState(project.task_groups ?? []);
    const [selectedTaskIds, setSelectedTaskIds] = useState([]);
    const [taskContextMenu, setTaskContextMenu] = useState({ anchor: null, open: false, taskId: null, mode: 'row' });
    const taskSummary = summarizeTaskGroups(taskGroups, project.task_summary ?? {});
    const currentUserId = auth?.user?.id ?? null;
    const personGroupCount = useMemo(
        () => filterTaskGroups(taskGroups, 'all', null).length,
        [taskGroups],
    );
    const taskFilterOptions = useMemo(
        () => taskFilters(taskGroups, currentUserId),
        [taskGroups, currentUserId],
    );
    const visibleTaskGroups = useMemo(
        () => (taskGrouping === 'group'
            ? groupTasksByTimelineGroup(taskGroups, taskFilter, currentUserId, project.parent_task_options ?? [])
            : filterTaskGroups(taskGroups, taskFilter, currentUserId)),
        [project.parent_task_options, taskGroups, taskFilter, taskGrouping, currentUserId],
    );
    const visibleSelectableTaskIds = useMemo(
        () => selectableTasks(visibleTaskGroups).map((task) => task.id),
        [visibleTaskGroups],
    );
    const visibleSelectableTaskIdSet = useMemo(
        () => new Set(visibleSelectableTaskIds),
        [visibleSelectableTaskIds],
    );
    const selectedVisibleTaskIds = useMemo(
        () => selectedTaskIds.filter((taskId) => visibleSelectableTaskIdSet.has(taskId)),
        [selectedTaskIds, visibleSelectableTaskIdSet],
    );
    const completionPercent = taskSummary.total > 0
        ? Math.round(((taskSummary.completed ?? 0) / taskSummary.total) * 100)
        : 0;
    const context = (
        <AppBreadcrumb
            items={[
                { label: 'All projects', href: toAppPath(routes?.projects?.index ?? '/projects') },
                { label: project.name },
            ]}
        />
    );

    useEffect(() => {
        setTaskGroups(project.task_groups ?? []);
    }, [project.task_groups]);

    useEffect(() => {
        setSelectedTaskIds((current) => current.filter((taskId) => visibleSelectableTaskIdSet.has(taskId)));
    }, [visibleSelectableTaskIdSet]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.localStorage.setItem(projectTaskViewKey(project.id), JSON.stringify({
            filter: taskFilter,
            grouping: taskGrouping,
        }));
    }, [project.id, taskFilter, taskGrouping]);

    async function handleProjectAction(action) {
        if (isSubmitting) {
            return;
        }

        setIsSubmitting(true);

        try {
            if (action === 'archive' || action === 'unarchive') {
                await request(toAppPath(project.bulk_action_url), {
                    method: 'POST',
                    body: JSON.stringify({
                        action,
                        project_ids: [project.id],
                    }),
                });

                router.reload({
                    preserveScroll: true,
                });

                return;
            }

            const actionUrls = {
                delete: project.destroy_url,
                duplicate: project.duplicate_url,
                'save-as-template': project.template_url,
            };
            const url = actionUrls[action];

            if (!url) {
                return;
            }

            await request(toAppPath(url), {
                method: action === 'delete' ? 'DELETE' : 'POST',
            });

            if (action === 'delete') {
                router.visit(toAppPath(routes?.projects?.index ?? '/projects'));

                return;
            }

            router.reload({
                preserveScroll: true,
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleTaskCompletionChange(task, completed) {
        setTaskGroups((current) => updateTaskInGroups(current, task.id, {
            completed,
            progress: completed ? 100 : Math.min(task.progress ?? 0, 99),
        }));

        try {
            await request(toAppPath(task.update_url), {
                method: 'PATCH',
                body: JSON.stringify({ completed }),
            });
        } catch (error) {
            setTaskGroups((current) => updateTaskInGroups(current, task.id, {
                completed: task.completed,
                progress: task.progress,
            }));
        }
    }

    async function handleSelectedTasksCompletion(completed = true) {
        const selectedTasks = tasksByIds(taskGroups, selectedTaskIds)
            .filter((task) => task.update_url && task.kind !== 'group' && task.completed !== completed);

        if (selectedTasks.length === 0 || isSubmitting) {
            return;
        }

        setIsSubmitting(true);
        setTaskGroups((current) => updateTasksInGroups(current, selectedTasks.map((task) => task.id), {
            completed,
            progress: completed ? 100 : 99,
        }));

        try {
            for (const task of selectedTasks) {
                await request(toAppPath(task.update_url), {
                    method: 'PATCH',
                    body: JSON.stringify({ completed }),
                });
            }

            setSelectedTaskIds([]);
            router.reload({ preserveScroll: true });
        } finally {
            setIsSubmitting(false);
        }
    }

    function selectedTaskRecords() {
        return tasksByIds(taskGroups, selectedTaskIds)
            .filter((task) => task.kind !== 'group');
    }

    function selectedDeletableTasks() {
        return selectedTaskRecords().filter((task) => task.destroy_url);
    }

    function selectedTasksMatchingCompletion(completed) {
        return selectedTaskRecords().filter((task) => task.update_url && task.completed === completed);
    }

    function toggleTaskSelection(taskId, checked) {
        setSelectedTaskIds((current) => checked
            ? Array.from(new Set([...current, taskId]))
            : current.filter((id) => id !== taskId));
    }

    function toggleTaskGroupSelection(taskIds, checked) {
        const taskIdSet = new Set(taskIds);

        setSelectedTaskIds((current) => checked
            ? Array.from(new Set([...current, ...taskIds]))
            : current.filter((taskId) => !taskIdSet.has(taskId)));
    }

    function closeTaskContextMenu() {
        setTaskContextMenu({ anchor: null, open: false, taskId: null, mode: 'row' });
    }

    function openTaskContextMenu(task, anchor) {
        setTaskContextMenu({
            anchor,
            mode: selectedVisibleTaskIds.length > 1 && selectedVisibleTaskIds.includes(task.id) ? 'selection' : 'row',
            open: true,
            taskId: task.id,
        });
    }

    function openCreateTaskModal(defaults = {}) {
        setTaskModalMode('create');
        setTaskModalTask(null);
        setTaskForm({
            ...defaultTaskForm(project),
            ...defaults,
        });
        setTaskModalOpen(true);
    }

    function openEditTaskModal(task) {
        setTaskModalMode('edit');
        setTaskModalTask(task);
        setTaskForm({
            name: task.name ?? '',
            description: task.description ?? '',
            parent_id: task.parent_id ?? '',
            assignee_user_id: task.assignee_user_id ?? '',
            start_date: task.start_date ?? '',
            end_date: task.end_date ?? '',
            completed: Boolean(task.completed),
        });
        setTaskModalOpen(true);
    }

    function closeTaskModal(open) {
        if (open === false) {
            setTaskModalTask(null);
            setTaskForm(defaultTaskForm(project));
        }

        setTaskModalOpen(Boolean(open));
    }

    async function submitTaskModal() {
        const name = taskForm.name.trim();

        if (!name || !taskForm.start_date || !taskForm.end_date) {
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                name,
                description: taskForm.description.trim() || null,
                parent_id: taskForm.parent_id || null,
                assignee_user_id: taskForm.assignee_user_id ? Number(taskForm.assignee_user_id) : null,
                start_date: taskForm.start_date,
                end_date: taskForm.end_date,
                completed: taskForm.completed,
            };

            await request(toAppPath(taskModalMode === 'edit' ? taskModalTask.update_url : project.create_task_url), {
                method: taskModalMode === 'edit' ? 'PATCH' : 'POST',
                body: JSON.stringify(payload),
            });

            setTaskModalOpen(false);
            router.reload({ preserveScroll: true });
        } finally {
            setIsSubmitting(false);
        }
    }

    async function duplicateTask(task) {
        if (!task.duplicate_url) {
            return;
        }

        setIsSubmitting(true);

        try {
            await request(toAppPath(task.duplicate_url), { method: 'POST' });
            router.reload({ preserveScroll: true });
        } finally {
            setIsSubmitting(false);
        }
    }

    async function deleteTask(task) {
        if (!task.destroy_url) {
            return;
        }

        setIsSubmitting(true);

        try {
            await request(toAppPath(task.destroy_url), { method: 'DELETE' });
            setTaskPendingDelete(null);
            router.reload({ preserveScroll: true });
        } finally {
            setIsSubmitting(false);
        }
    }

    async function deleteTasks(tasks) {
        const deletableTasks = tasks.filter((task) => task?.destroy_url);

        if (deletableTasks.length === 0 || isSubmitting) {
            return;
        }

        setIsSubmitting(true);

        try {
            for (const task of deletableTasks) {
                await request(toAppPath(task.destroy_url), { method: 'DELETE' });
            }

            setTasksPendingDelete([]);
            setSelectedTaskIds((current) => current.filter((taskId) => !deletableTasks.some((task) => task.id === taskId)));
            router.reload({ preserveScroll: true });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <AppPage
            title="Projects"
            activeApp="projects"
            container="wide"
            context={context}
        >
            <div className="projects-detail-page">
                <div className="projects-detail-intro">
                    <div className="projects-detail-intro__heading">
                        <h1 id="project-detail-title" className="projects-detail-title">{project.name}</h1>
                        {!project.is_active ? <span className="projects-detail-status">Archived</span> : null}
                    </div>
                    <div className="projects-detail-actions" data-testid="project-detail-actions">
                        <Link
                            href={toAppPath(project.edit_url)}
                            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'px-2 text-stone-600')}
                        >
                            Edit
                        </Link>
                        <ProjectActionsDropdown
                            disabled={isSubmitting}
                            onAction={handleProjectAction}
                            project={project}
                        />
                    </div>
                </div>

                <section className="projects-detail-hero" aria-labelledby="project-detail-title">
                    <div className="projects-detail-hero__content">
                        {project.description?.trim() ? (
                            <p className="projects-detail-description">{project.description}</p>
                        ) : null}
                        <ProjectHeroFacts project={project} />
                    </div>

                    <div className="projects-detail-hero__panel" aria-label="Project task summary">
                        <div className="projects-detail-progress">
                            <div>
                                <span className="projects-detail-progress__value">{completionPercent}%</span>
                                <span className="projects-detail-progress__label">complete</span>
                            </div>
                            <div className="projects-detail-progress__track" aria-hidden="true">
                                <span style={{ width: `${completionPercent}%` }} />
                            </div>
                        </div>
                        <dl className="projects-detail-summary-grid">
                            <SummaryMetric icon={ListTodo} label="Tasks" value={taskSummary.total ?? 0} />
                            <SummaryMetric icon={CheckCircle2} label="Done" value={taskSummary.completed ?? 0} />
                            <SummaryMetric icon={Circle} label="Open" value={taskSummary.open ?? 0} />
                            <SummaryMetric icon={UsersRound} label="People" value={personGroupCount} />
                        </dl>
                    </div>
                </section>

                <section className="projects-detail-section projects-detail-tasks" aria-labelledby="project-tasks-title">
                    <div className="projects-detail-section__header">
                        <div>
                            <h2 id="project-tasks-title" className="projects-detail-section__heading">
                                {taskGrouping === 'group' ? 'Tasks by group' : 'Tasks by person'}
                            </h2>
                            <p className="projects-detail-section__copy">
                                Work connected to this project, organized by {taskGrouping === 'group' ? 'timeline group' : 'assignee'}.
                            </p>
                        </div>
                        <div className="projects-detail-section__actions">
                            <ProjectTaskViewMenu
                                filterOptions={taskFilterOptions}
                                grouping={taskGrouping}
                                onFilterChange={setTaskFilter}
                                onGroupingChange={setTaskGrouping}
                                taskFilter={taskFilter}
                            />
                            <div className="projects-detail-section__bulk">
                                {selectedVisibleTaskIds.length > 0 ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button type="button" variant="outline" size="sm" disabled={isSubmitting}>
                                                {selectedVisibleTaskIds.length} selected
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {selectedTasksMatchingCompletion(false).length > 0 ? (
                                                <DropdownMenuItem onSelect={() => handleSelectedTasksCompletion(true)}>
                                                    Mark selected complete
                                                </DropdownMenuItem>
                                            ) : null}
                                            {selectedTasksMatchingCompletion(true).length > 0 ? (
                                                <DropdownMenuItem onSelect={() => handleSelectedTasksCompletion(false)}>
                                                    Mark selected incomplete
                                                </DropdownMenuItem>
                                            ) : null}
                                            <DropdownMenuItem
                                                className="text-red-700 focus:bg-red-50 focus:text-red-700"
                                                onSelect={() => setTasksPendingDelete(selectedDeletableTasks())}
                                            >
                                                Delete selected
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    {visibleTaskGroups.length > 0 ? (
                        <div className="projects-detail-assignee-list">
                            {visibleTaskGroups.map((group) => (
                                <AssigneeTaskGroup
                                    key={group.assignee_id ?? 'unassigned'}
                                    group={group}
                                    disabled={isSubmitting}
                                    onCreateTask={(defaults) => openCreateTaskModal(defaults)}
                                    onDeleteTask={setTaskPendingDelete}
                                    onDuplicateTask={duplicateTask}
                                    onEditTask={openEditTaskModal}
                                    onAddChildTask={(task) => openCreateTaskModal({ parent_id: task.id })}
                                    onGroupSelectionChange={toggleTaskGroupSelection}
                                    onSelectionChange={toggleTaskSelection}
                                    onTaskContextMenu={openTaskContextMenu}
                                    onTaskCompletionChange={handleTaskCompletionChange}
                                    selectedTaskIds={selectedTaskIds}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="projects-detail-empty">
                            {emptyProjectTaskMessage(taskGroups, taskFilter, taskGrouping)}
                        </div>
                    )}
                </section>
            </div>

            <TaskDialog
                assigneeOptions={project.assignee_options ?? []}
                disabled={isSubmitting}
                mode={taskModalMode}
                onClose={closeTaskModal}
                onFieldChange={(field, value) => setTaskForm((current) => ({ ...current, [field]: value }))}
                onSubmit={submitTaskModal}
                open={taskModalOpen}
                parentTaskOptions={(project.parent_task_options ?? []).filter((task) => task.id !== taskModalTask?.id)}
                showCompletion={taskModalMode === 'edit'}
                submitLabel={taskModalMode === 'create' ? 'Create task' : 'Save task'}
                testId="project-task-dialog"
                value={taskForm}
            />
            <DeleteTaskDialog
                disabled={isSubmitting}
                onClose={() => setTaskPendingDelete(null)}
                onConfirm={() => deleteTask(taskPendingDelete)}
                task={taskPendingDelete}
            />
            <DeleteTasksDialog
                disabled={isSubmitting}
                onClose={() => setTasksPendingDelete([])}
                onConfirm={() => deleteTasks(tasksPendingDelete)}
                tasks={tasksPendingDelete}
            />
            <RowContextMenu
                anchor={taskContextMenu.anchor}
                actions={taskContextMenu.mode === 'selection'
                    ? selectedTaskSelectionActions(selectedTaskRecords(), {
                        onDelete: (tasks) => setTasksPendingDelete(tasks.filter((task) => task.destroy_url)),
                        onMarkComplete: () => handleSelectedTasksCompletion(true),
                        onMarkIncomplete: () => handleSelectedTasksCompletion(false),
                    })
                    : taskActionsForTask(tasksByIds(taskGroups, [taskContextMenu.taskId])[0], {
                        onAddChild: (task) => openCreateTaskModal({ parent_id: task.id }),
                        onDelete: setTaskPendingDelete,
                        onDuplicate: duplicateTask,
                        onEdit: openEditTaskModal,
                        onToggleCompletion: handleTaskCompletionChange,
                    })}
                open={taskContextMenu.open}
                onOpenChange={(open) => {
                    if (!open) {
                        closeTaskContextMenu();
                    }
                }}
            />
        </AppPage>
    );
}

function SummaryMetric({ icon: Icon, label, value }) {
    return (
        <div className="projects-detail-summary-card">
            <dt>
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
            </dt>
            <dd>{value}</dd>
        </div>
    );
}

function ProjectHeroFacts({ project }) {
    const schedule = formatProjectDateRange(project.start_date, project.end_date);
    const parent = project.parent;

    if (!parent?.name && !schedule) {
        return null;
    }

    return (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-stone-500">
            {parent?.name ? (
                <Link
                    href={toAppPath(parent.show_url)}
                    className="font-medium text-stone-600 transition-colors hover:text-stone-900"
                >
                    {parent.name}
                </Link>
            ) : null}
            {parent?.name && schedule ? (
                <span className="hidden text-stone-300 sm:inline" aria-hidden="true">
                    ·
                </span>
            ) : null}
            {schedule ? (
                <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-4 shrink-0 text-stone-400" aria-hidden="true" />
                    <time dateTime={projectScheduleDateTime(project)}>{schedule}</time>
                </span>
            ) : null}
        </div>
    );
}

function projectScheduleDateTime(project) {
    const start = project.start_date ? String(project.start_date).slice(0, 10) : '';
    const end = project.end_date ? String(project.end_date).slice(0, 10) : '';

    if (start && end) {
        return start === end ? start : `${start}/${end}`;
    }

    return start || end || undefined;
}

function AssigneeTaskGroup({ group, onAddChildTask, onCreateTask, onDeleteTask, onDuplicateTask, onEditTask, onGroupSelectionChange, onSelectionChange, onTaskContextMenu, onTaskCompletionChange, selectedTaskIds }) {
    const groupProgress = group.task_count > 0
        ? Math.round(((group.completed_count ?? 0) / group.task_count) * 100)
        : 0;
    const openCount = Math.max((group.task_count ?? 0) - (group.completed_count ?? 0), 0);
    const createDefaults = group.grouping === 'group'
        ? { parent_id: group.parent_id ?? '' }
        : { assignee_user_id: group.assignee_id ?? '' };
    const selectableTaskIds = group.tasks
        .filter((task) => task.update_url && task.kind !== 'group')
        .map((task) => task.id);
    const selectedGroupTaskCount = selectableTaskIds.filter((taskId) => selectedTaskIds.includes(taskId)).length;
    const allGroupTasksSelected = selectableTaskIds.length > 0 && selectedGroupTaskCount === selectableTaskIds.length;
    const someGroupTasksSelected = selectedGroupTaskCount > 0 && !allGroupTasksSelected;

    return (
        <article className="projects-detail-assignee">
            <div className="projects-detail-assignee__header">
                <div className="projects-detail-assignee__identity">
                    <SelectionCheckbox
                        aria-label={`Select all tasks for ${group.assignee_name}`}
                        checked={someGroupTasksSelected ? 'indeterminate' : allGroupTasksSelected}
                        className="projects-detail-assignee__select-checkbox"
                        disabled={selectableTaskIds.length === 0}
                        onCheckedChange={(checked) => onGroupSelectionChange(selectableTaskIds, checked)}
                    />
                    <div className="projects-detail-avatar" aria-hidden="true">{assigneeInitial(group.assignee_name)}</div>
                    <div>
                        <h3>{group.assignee_name}</h3>
                        <p>{openCount} open · {group.completed_count} done · {group.task_count} total</p>
                    </div>
                </div>
                <div className="projects-detail-assignee__tools">
                    <div className="projects-detail-assignee__progress" aria-label={`${groupProgress}% complete`}>
                        <span style={{ width: `${groupProgress}%` }} />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0 rounded-full"
                        aria-label="New task"
                        onClick={() => onCreateTask(createDefaults)}
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                    </Button>
                </div>
            </div>

            <div className="projects-detail-task-list">
                {group.tasks.length > 0 ? (
                    group.tasks.map((task) => (
                        <TaskRow
                            key={task.id}
                            onCompletionChange={onTaskCompletionChange}
                            onDelete={onDeleteTask}
                            onDuplicate={onDuplicateTask}
                            onEdit={onEditTask}
                            onAddChild={onAddChildTask}
                            onSelectionChange={onSelectionChange}
                            onTaskContextMenu={onTaskContextMenu}
                            selected={selectedTaskIds.includes(task.id)}
                            task={task}
                        />
                    ))
                ) : (
                    <div className="projects-detail-task-empty">{group.empty_message}</div>
                )}
            </div>
        </article>
    );
}

function TaskRow({ onAddChild, onCompletionChange, onDelete, onDuplicate, onEdit, onSelectionChange, onTaskContextMenu, selected, task }) {
    const actions = taskActionsForTask(task, {
        onAddChild,
        onDelete,
        onDuplicate,
        onEdit,
        onToggleCompletion: onCompletionChange,
    });

    return (
        <div
            className="projects-detail-task"
            data-completed={task.completed}
            data-project-task-id={task.id}
            data-selectable={task.update_url && task.kind !== 'group' ? 'true' : 'false'}
            data-state={selected ? 'selected' : undefined}
            onContextMenu={(event) => {
                event.preventDefault();
                onTaskContextMenu(task, {
                    x: event.clientX,
                    y: event.clientY,
                });
            }}
        >
            <div className="projects-detail-task__selection" data-marquee-ignore>
                <SelectionCheckbox
                    aria-label={`Select ${task.name}`}
                    checked={selected}
                    className="projects-detail-task__select-checkbox"
                    disabled={!task.update_url || task.kind === 'group'}
                    onCheckedChange={(checked) => onSelectionChange(task.id, checked)}
                />
                <Checkbox
                    aria-label={`${task.completed ? 'Mark incomplete' : 'Mark complete'} ${task.name}`}
                    checked={task.completed}
                    disabled={!task.update_url || task.kind === 'group'}
                    onCheckedChange={(checked) => onCompletionChange(task, checked)}
                />
            </div>
            <div className="projects-detail-task__main">
                <h4>
                    <button
                        type="button"
                        aria-label={`Edit ${task.name}`}
                        onClick={() => onEdit(task)}
                    >
                        {task.name}
                    </button>
                </h4>
                <div className="projects-detail-task__meta">
                    {task.parent_name ? <span>{task.parent_name}</span> : null}
                    <span>{formatTaskDateRange(task.start_date, task.end_date)}</span>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button type="button" className="projects-detail-task__actions" aria-label={`More actions for ${task.name}`} data-marquee-ignore>
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        {actions.map((action) => (
                            <DropdownMenuItem
                                key={action.id}
                                className={cn(action.tone === 'destructive' && 'text-red-700 focus:bg-red-50 focus:text-red-700')}
                                onSelect={action.onSelect}
                            >
                                {action.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

function DeleteTaskDialog({ disabled, onClose, onConfirm, task }) {
    return (
        <Dialog open={Boolean(task)} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md" data-testid="project-task-delete-dialog">
                <DialogHeader>
                    <DialogTitle>Delete task?</DialogTitle>
                </DialogHeader>
                <p className="text-sm leading-6 text-stone-600">
                    {task ? `This will delete "${task.name}" from the project. This cannot be undone.` : ''}
                </p>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose} disabled={disabled}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="border-red-200 text-red-700 hover:border-red-200 hover:bg-red-50 hover:text-red-800"
                        onClick={onConfirm}
                        disabled={disabled}
                    >
                        Delete task
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DeleteTasksDialog({ disabled, onClose, onConfirm, tasks }) {
    const count = tasks.length;

    return (
        <Dialog open={count > 0} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md" data-testid="project-tasks-delete-dialog">
                <DialogHeader>
                    <DialogTitle>Delete selected tasks?</DialogTitle>
                </DialogHeader>
                <p className="text-sm leading-6 text-stone-600">
                    This will delete {count} selected {count === 1 ? 'task' : 'tasks'} from the project. This cannot be undone.
                </p>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose} disabled={disabled}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="border-red-200 text-red-700 hover:border-red-200 hover:bg-red-50 hover:text-red-800"
                        onClick={onConfirm}
                        disabled={disabled}
                    >
                        Delete tasks
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function defaultTaskForm(project) {
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

function assigneeInitial(name) {
    return (name?.trim()?.[0] ?? 'U').toUpperCase();
}

function projectTaskViewKey(projectId) {
    return `rechrono.projectTaskView.${projectId}`;
}

function savedProjectTaskView(projectId) {
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

function formatTaskDate(value) {
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

function formatTaskDateRange(startDate, endDate) {
    return `${formatTaskDate(startDate)} - ${formatTaskDate(endDate)}`;
}

function summarizeTaskGroups(taskGroups, fallbackSummary) {
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

function taskFilters(taskGroups, currentUserId) {
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

function filterTaskGroups(taskGroups, filter, currentUserId) {
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

function groupTasksByTimelineGroup(taskGroups, filter, currentUserId, parentTaskOptions = []) {
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

function projectTasks(taskGroups) {
    return taskGroups
        .flatMap((group) => group.tasks ?? [])
        .filter((task) => task.kind !== 'group');
}

function selectableTasks(taskGroups) {
    return projectTasks(taskGroups).filter((task) => task.update_url);
}

function tasksByIds(taskGroups, taskIds) {
    const taskIdSet = new Set(taskIds);

    return projectTasks(taskGroups).filter((task) => taskIdSet.has(task.id));
}

function taskActionsForTask(task, handlers) {
    return getTaskRowActions(task, handlers, {
        canAddChildren: true,
        canConvertToGroup: false,
    });
}

function selectedTaskSelectionActions(tasks, handlers) {
    const count = tasks.length;
    const hasIncompleteTasks = tasks.some((task) => task.update_url && !task.completed);
    const hasCompletedTasks = tasks.some((task) => task.update_url && task.completed);
    const deletableTasks = tasks.filter((task) => task.destroy_url);

    if (count === 0) {
        return [];
    }

    return [
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

function emptyProjectTaskMessage(taskGroups, filter, grouping) {
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

function updateTaskInGroups(taskGroups, taskId, updates) {
    return updateTasksInGroups(taskGroups, [taskId], updates);
}

function updateTasksInGroups(taskGroups, taskIds, updates) {
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
