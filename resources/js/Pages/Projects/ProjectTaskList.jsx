import { MoreHorizontal, Plus } from 'lucide-react';

import { RowContextMenu } from '@/components/RowContextMenu';
import { Button } from '@/components/ui/button';
import { Checkbox, SelectionCheckbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { assigneeInitial, formatTaskDateRange, taskActionsForTask } from './projectTaskView';

export function AssigneeTaskGroup({ group, onAddChildTask, onCreateTask, onDeleteTask, onDuplicateTask, onEditTask, onGroupSelectionChange, onSelectionChange, onTaskContextMenu, onTaskCompletionChange, selectedTaskIds }) {
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

export function DeleteTaskDialog({ disabled, onClose, onConfirm, task }) {
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

export function DeleteTasksDialog({ disabled, onClose, onConfirm, tasks }) {
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
