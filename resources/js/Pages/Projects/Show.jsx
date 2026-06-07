import { Link, router, usePage } from "@inertiajs/react";
import { CalendarDays, ListTodo, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import AppBreadcrumb from "@/components/AppBreadcrumb";
import { RowContextMenu } from "@/components/RowContextMenu";
import { Button, buttonVariants } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AppPage from "@/Layouts/AppPage";
import { formatProjectDateRange } from "@/lib/formatters";
import { request } from "@/lib/request";
import { toAppPath } from "@/lib/url";
import { cn } from "@/lib/utils";
import { ProjectActionsDropdown } from "@/projects/ProjectActionsDropdown";
import { ProjectTaskViewMenu } from "@/projects/ProjectTaskViewMenu";
import { TaskDialog } from "@/tasks/TaskDialog";
import {
    AssigneeTaskGroup,
    DeleteTaskDialog,
    DeleteTasksDialog,
} from "./ProjectTaskList";
import {
    defaultTaskForm,
    emptyProjectTaskMessage,
    filterTaskGroups,
    formatTaskCompletionSummary,
    groupTasksByTimelineGroup,
    projectTaskViewKey,
    savedProjectTaskView,
    selectableTasks,
    selectedTaskSelectionActions,
    summarizeTaskGroups,
    taskActionsForTask,
    taskFilters,
    tasksByIds,
    updateTaskInGroups,
    updateTasksInGroups,
} from "./projectTaskView";
import { projectTimeBudget } from "./projectTimeBudget";

export default function ProjectsShow({ project }) {
    const { auth, routes } = usePage().props;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [taskFilter, setTaskFilter] = useState(
        () => savedProjectTaskView(project.id).filter,
    );
    const [taskGrouping, setTaskGrouping] = useState(
        () => savedProjectTaskView(project.id).grouping,
    );
    const [taskModalOpen, setTaskModalOpen] = useState(false);
    const [taskModalMode, setTaskModalMode] = useState("create");
    const [taskModalTask, setTaskModalTask] = useState(null);
    const [taskPendingDelete, setTaskPendingDelete] = useState(null);
    const [tasksPendingDelete, setTasksPendingDelete] = useState([]);
    const [taskForm, setTaskForm] = useState(() => defaultTaskForm(project));
    const [taskGroups, setTaskGroups] = useState(project.task_groups ?? []);
    const [selectedTaskIds, setSelectedTaskIds] = useState([]);
    const [taskContextMenu, setTaskContextMenu] = useState({
        anchor: null,
        open: false,
        taskId: null,
        mode: "row",
    });
    const taskSummary = summarizeTaskGroups(
        taskGroups,
        project.task_summary ?? {},
    );
    const currentUserId = auth?.user?.id ?? null;
    const personGroupCount = useMemo(
        () => filterTaskGroups(taskGroups, "all", null).length,
        [taskGroups],
    );
    const taskFilterOptions = useMemo(
        () => taskFilters(taskGroups, currentUserId),
        [taskGroups, currentUserId],
    );
    const visibleTaskGroups = useMemo(
        () =>
            taskGrouping === "group"
                ? groupTasksByTimelineGroup(
                      taskGroups,
                      taskFilter,
                      currentUserId,
                      project.parent_task_options ?? [],
                  )
                : filterTaskGroups(taskGroups, taskFilter, currentUserId),
        [
            project.parent_task_options,
            taskGroups,
            taskFilter,
            taskGrouping,
            currentUserId,
        ],
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
        () =>
            selectedTaskIds.filter((taskId) =>
                visibleSelectableTaskIdSet.has(taskId),
            ),
        [selectedTaskIds, visibleSelectableTaskIdSet],
    );
    const completionPercent =
        taskSummary.total > 0
            ? Math.round(
                  ((taskSummary.completed ?? 0) / taskSummary.total) * 100,
              )
            : 0;
    const timeBudget = projectTimeBudget(project);
    const context = (
        <AppBreadcrumb
            items={[
                {
                    label: "All projects",
                    href: toAppPath(routes?.projects?.index ?? "/projects"),
                },
                { label: project.name },
            ]}
        />
    );

    useEffect(() => {
        setTaskGroups(project.task_groups ?? []);
    }, [project.task_groups]);

    useEffect(() => {
        setSelectedTaskIds((current) =>
            current.filter((taskId) => visibleSelectableTaskIdSet.has(taskId)),
        );
    }, [visibleSelectableTaskIdSet]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        window.localStorage.setItem(
            projectTaskViewKey(project.id),
            JSON.stringify({
                filter: taskFilter,
                grouping: taskGrouping,
            }),
        );
    }, [project.id, taskFilter, taskGrouping]);

    async function handleProjectAction(action) {
        if (isSubmitting) {
            return;
        }

        setIsSubmitting(true);

        try {
            if (action === "archive" || action === "unarchive") {
                await request(toAppPath(project.bulk_action_url), {
                    method: "POST",
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
                "save-as-template": project.template_url,
            };
            const url = actionUrls[action];

            if (!url) {
                return;
            }

            await request(toAppPath(url), {
                method: action === "delete" ? "DELETE" : "POST",
            });

            if (action === "delete") {
                router.visit(toAppPath(routes?.projects?.index ?? "/projects"));

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
        setTaskGroups((current) =>
            updateTaskInGroups(current, task.id, {
                completed,
                progress: completed ? 100 : Math.min(task.progress ?? 0, 99),
            }),
        );

        try {
            await request(toAppPath(task.update_url), {
                method: "PATCH",
                body: JSON.stringify({ completed }),
            });
        } catch (error) {
            setTaskGroups((current) =>
                updateTaskInGroups(current, task.id, {
                    completed: task.completed,
                    progress: task.progress,
                }),
            );
        }
    }

    async function handleSelectedTasksCompletion(completed = true) {
        const selectedTasks = tasksByIds(taskGroups, selectedTaskIds).filter(
            (task) =>
                task.update_url &&
                task.kind !== "group" &&
                task.completed !== completed,
        );

        if (selectedTasks.length === 0 || isSubmitting) {
            return;
        }

        setIsSubmitting(true);
        setTaskGroups((current) =>
            updateTasksInGroups(
                current,
                selectedTasks.map((task) => task.id),
                {
                    completed,
                    progress: completed ? 100 : 99,
                },
            ),
        );

        try {
            for (const task of selectedTasks) {
                await request(toAppPath(task.update_url), {
                    method: "PATCH",
                    body: JSON.stringify({ completed }),
                });
            }

            setSelectedTaskIds([]);
            router.reload({ preserveScroll: true });
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleSelectedTasksAssignment(assigneeUserId) {
        const taskIds = selectedTaskRecords()
            .filter((task) => task.update_url)
            .map((task) => task.id);

        if (taskIds.length === 0 || isSubmitting) {
            return;
        }

        setIsSubmitting(true);

        try {
            await request(toAppPath(project.bulk_assign_tasks_url), {
                method: "POST",
                body: JSON.stringify({
                    task_ids: taskIds,
                    assignee_user_id: assigneeUserId,
                }),
            });

            setSelectedTaskIds([]);
            router.reload({ preserveScroll: true });
        } finally {
            setIsSubmitting(false);
        }
    }

    function selectedTaskRecords() {
        return tasksByIds(taskGroups, selectedTaskIds).filter(
            (task) => task.kind !== "group",
        );
    }

    function selectedDeletableTasks() {
        return selectedTaskRecords().filter((task) => task.destroy_url);
    }

    function selectedTasksMatchingCompletion(completed) {
        return selectedTaskRecords().filter(
            (task) => task.update_url && task.completed === completed,
        );
    }

    function toggleTaskSelection(taskId, checked) {
        setSelectedTaskIds((current) =>
            checked
                ? Array.from(new Set([...current, taskId]))
                : current.filter((id) => id !== taskId),
        );
    }

    function toggleTaskGroupSelection(taskIds, checked) {
        const taskIdSet = new Set(taskIds);

        setSelectedTaskIds((current) =>
            checked
                ? Array.from(new Set([...current, ...taskIds]))
                : current.filter((taskId) => !taskIdSet.has(taskId)),
        );
    }

    function closeTaskContextMenu() {
        setTaskContextMenu({
            anchor: null,
            open: false,
            taskId: null,
            mode: "row",
        });
    }

    function openTaskContextMenu(task, anchor) {
        setTaskContextMenu({
            anchor,
            mode:
                selectedVisibleTaskIds.length > 1 &&
                selectedVisibleTaskIds.includes(task.id)
                    ? "selection"
                    : "row",
            open: true,
            taskId: task.id,
        });
    }

    function openCreateTaskModal(defaults = {}) {
        setTaskModalMode("create");
        setTaskModalTask(null);
        setTaskForm({
            ...defaultTaskForm(project),
            ...defaults,
        });
        setTaskModalOpen(true);
    }

    function openEditTaskModal(task) {
        setTaskModalMode("edit");
        setTaskModalTask(task);
        setTaskForm({
            name: task.name ?? "",
            description: task.description ?? "",
            parent_id: task.parent_id ?? "",
            assignee_user_id: task.assignee_user_id ?? "",
            start_date: task.start_date ?? "",
            end_date: task.end_date ?? "",
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
                assignee_user_id: taskForm.assignee_user_id
                    ? Number(taskForm.assignee_user_id)
                    : null,
                start_date: taskForm.start_date,
                end_date: taskForm.end_date,
                completed: taskForm.completed,
            };

            await request(
                toAppPath(
                    taskModalMode === "edit"
                        ? taskModalTask.update_url
                        : project.create_task_url,
                ),
                {
                    method: taskModalMode === "edit" ? "PATCH" : "POST",
                    body: JSON.stringify(payload),
                },
            );

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
            await request(toAppPath(task.duplicate_url), { method: "POST" });
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
            await request(toAppPath(task.destroy_url), { method: "DELETE" });
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
                await request(toAppPath(task.destroy_url), {
                    method: "DELETE",
                });
            }

            setTasksPendingDelete([]);
            setSelectedTaskIds((current) =>
                current.filter(
                    (taskId) =>
                        !deletableTasks.some((task) => task.id === taskId),
                ),
            );
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
                        <h1
                            id="project-detail-title"
                            className="projects-detail-title"
                        >
                            {project.name}
                        </h1>
                        {!project.is_active ? (
                            <span className="projects-detail-status">
                                Archived
                            </span>
                        ) : null}
                    </div>
                    <div
                        className="projects-detail-actions"
                        data-testid="project-detail-actions"
                    >
                        <Link
                            href={toAppPath(project.edit_url)}
                            className={cn(
                                buttonVariants({
                                    variant: "ghost",
                                    size: "sm",
                                }),
                                "px-2 text-stone-600",
                            )}
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

                <section
                    className="projects-detail-hero"
                    aria-labelledby="project-detail-title"
                >
                    <div className="projects-detail-hero__content">
                        {project.description?.trim() ? (
                            <p className="projects-detail-description">
                                {project.description}
                            </p>
                        ) : null}
                        <ProjectHeroFacts project={project} />
                    </div>

                    <div
                        className="projects-detail-hero__panel"
                        aria-label="Project summary"
                    >
                        <section
                            className="projects-detail-stat-section"
                            aria-labelledby="project-task-progress-title"
                        >
                            <div className="projects-detail-stat-section__header">
                                <div>
                                    <h2 id="project-task-progress-title">
                                        Task progress
                                    </h2>
                                    <p>Completion across project tasks</p>
                                </div>
                                <span className="projects-detail-progress__value">
                                    {completionPercent}%
                                </span>
                            </div>
                            <div
                                className="projects-detail-progress__track"
                                aria-hidden="true"
                            >
                                <span
                                    style={{ width: `${completionPercent}%` }}
                                />
                            </div>
                            <dl className="projects-detail-summary-grid">
                                <SummaryMetric
                                    icon={ListTodo}
                                    label="Tasks completed"
                                    value={formatTaskCompletionSummary(
                                        taskSummary,
                                    )}
                                />
                                <SummaryMetric
                                    icon={UsersRound}
                                    label="People"
                                    value={personGroupCount}
                                />
                            </dl>
                        </section>
                        {timeBudget ? (
                            <TimeBudgetMeter timeBudget={timeBudget} />
                        ) : null}
                    </div>
                </section>

                <section
                    className="projects-detail-section projects-detail-tasks"
                    aria-labelledby="project-tasks-title"
                >
                    <div className="projects-detail-section__header">
                        <div>
                            <h2
                                id="project-tasks-title"
                                className="projects-detail-section__heading"
                            >
                                {taskGrouping === "group"
                                    ? "Tasks by group"
                                    : "Tasks by person"}
                            </h2>
                            <p className="projects-detail-section__copy">
                                Work connected to this project, organized by{" "}
                                {taskGrouping === "group"
                                    ? "timeline group"
                                    : "assignee"}
                                .
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
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={isSubmitting}
                                            >
                                                {selectedVisibleTaskIds.length}{" "}
                                                selected
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger>
                                                    Assign selected
                                                </DropdownMenuSubTrigger>
                                                <DropdownMenuSubContent>
                                                    {(project.assignee_options ?? []).map(
                                                        (option) => (
                                                            <DropdownMenuItem
                                                                key={
                                                                    option.value ??
                                                                    "unassigned"
                                                                }
                                                                onSelect={() =>
                                                                    handleSelectedTasksAssignment(
                                                                        option.value,
                                                                    )
                                                                }
                                                            >
                                                                {option.label}
                                                            </DropdownMenuItem>
                                                        ),
                                                    )}
                                                </DropdownMenuSubContent>
                                            </DropdownMenuSub>
                                            {selectedTasksMatchingCompletion(
                                                false,
                                            ).length > 0 ? (
                                                <DropdownMenuItem
                                                    onSelect={() =>
                                                        handleSelectedTasksCompletion(
                                                            true,
                                                        )
                                                    }
                                                >
                                                    Mark selected complete
                                                </DropdownMenuItem>
                                            ) : null}
                                            {selectedTasksMatchingCompletion(
                                                true,
                                            ).length > 0 ? (
                                                <DropdownMenuItem
                                                    onSelect={() =>
                                                        handleSelectedTasksCompletion(
                                                            false,
                                                        )
                                                    }
                                                >
                                                    Mark selected incomplete
                                                </DropdownMenuItem>
                                            ) : null}
                                            <DropdownMenuItem
                                                className="text-red-700 focus:bg-red-50 focus:text-red-700"
                                                onSelect={() =>
                                                    setTasksPendingDelete(
                                                        selectedDeletableTasks(),
                                                    )
                                                }
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
                                    key={group.assignee_id ?? "unassigned"}
                                    group={group}
                                    disabled={isSubmitting}
                                    onCreateTask={(defaults) =>
                                        openCreateTaskModal(defaults)
                                    }
                                    onDeleteTask={setTaskPendingDelete}
                                    onDuplicateTask={duplicateTask}
                                    onEditTask={openEditTaskModal}
                                    onAddChildTask={(task) =>
                                        openCreateTaskModal({
                                            parent_id: task.id,
                                        })
                                    }
                                    onGroupSelectionChange={
                                        toggleTaskGroupSelection
                                    }
                                    onSelectionChange={toggleTaskSelection}
                                    onTaskContextMenu={openTaskContextMenu}
                                    onTaskCompletionChange={
                                        handleTaskCompletionChange
                                    }
                                    selectedTaskIds={selectedTaskIds}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="projects-detail-empty">
                            {emptyProjectTaskMessage(
                                taskGroups,
                                taskFilter,
                                taskGrouping,
                            )}
                        </div>
                    )}
                </section>
            </div>

            <TaskDialog
                assigneeOptions={project.assignee_options ?? []}
                disabled={isSubmitting}
                mode={taskModalMode}
                onClose={closeTaskModal}
                onFieldChange={(field, value) =>
                    setTaskForm((current) => ({ ...current, [field]: value }))
                }
                onSubmit={submitTaskModal}
                open={taskModalOpen}
                parentTaskOptions={(project.parent_task_options ?? []).filter(
                    (task) => task.id !== taskModalTask?.id,
                )}
                showCompletion={taskModalMode === "edit"}
                submitLabel={
                    taskModalMode === "create" ? "Create task" : "Save task"
                }
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
                actions={
                    taskContextMenu.mode === "selection"
                        ? selectedTaskSelectionActions(selectedTaskRecords(), {
                              onDelete: (tasks) =>
                                  setTasksPendingDelete(
                                      tasks.filter((task) => task.destroy_url),
                                  ),
                              onAssign: handleSelectedTasksAssignment,
                              onMarkComplete: () =>
                                  handleSelectedTasksCompletion(true),
                              onMarkIncomplete: () =>
                                  handleSelectedTasksCompletion(false),
                          }, project.assignee_options ?? [])
                        : taskActionsForTask(
                              tasksByIds(taskGroups, [
                                  taskContextMenu.taskId,
                              ])[0],
                              {
                                  onAddChild: (task) =>
                                      openCreateTaskModal({
                                          parent_id: task.id,
                                      }),
                                  onDelete: setTaskPendingDelete,
                                  onDuplicate: duplicateTask,
                                  onEdit: openEditTaskModal,
                                  onToggleCompletion:
                                      handleTaskCompletionChange,
                              },
                          )
                }
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

function TimeBudgetMeter({ timeBudget }) {
    return (
        <section
            className="projects-detail-stat-section projects-detail-time-budget"
            aria-labelledby="project-time-budget-title"
        >
            <div className="projects-detail-stat-section__header">
                <div>
                    <h2 id="project-time-budget-title">Time budget</h2>
                    <p>Hours consumed from budget</p>
                </div>
                <span className="projects-detail-time-budget__percent">
                    {timeBudget.percentLabel}
                </span>
            </div>
            <div className="projects-detail-time-budget__values">
                <span>{timeBudget.actualLabel}</span>
                <span>{timeBudget.budgetLabel}</span>
            </div>
            <div
                className="projects-detail-time-budget__track"
                aria-label={`${timeBudget.actualLabel} of ${timeBudget.budgetLabel} used, ${timeBudget.percentLabel}`}
                role="meter"
                aria-valuemin={0}
                aria-valuemax={Math.max(100, timeBudget.percent)}
                aria-valuenow={timeBudget.percent}
            >
                <span style={{ width: `${timeBudget.percent}%` }} />
            </div>
        </section>
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
    const schedule = formatProjectDateRange(
        project.start_date,
        project.end_date,
    );
    const parent = project.parent;

    if (!parent?.name && !project.client?.name && !schedule) {
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
            {project.client?.name ? (
                <Link
                    href={toAppPath(project.client.show_url)}
                    className="font-medium text-stone-600 transition-colors hover:text-stone-900"
                >
                    {project.client.name}
                </Link>
            ) : (
                <span>Internal</span>
            )}
            {(parent?.name || project.client?.name) && schedule ? (
                <span
                    className="hidden text-stone-300 sm:inline"
                    aria-hidden="true"
                >
                    ·
                </span>
            ) : null}
            {schedule ? (
                <span className="inline-flex items-center gap-1.5">
                    <CalendarDays
                        className="size-4 shrink-0 text-stone-400"
                        aria-hidden="true"
                    />
                    <time dateTime={projectScheduleDateTime(project)}>
                        {schedule}
                    </time>
                </span>
            ) : null}
        </div>
    );
}

function projectScheduleDateTime(project) {
    const start = project.start_date
        ? String(project.start_date).slice(0, 10)
        : "";
    const end = project.end_date ? String(project.end_date).slice(0, 10) : "";

    if (start && end) {
        return start === end ? start : `${start}/${end}`;
    }

    return start || end || undefined;
}
