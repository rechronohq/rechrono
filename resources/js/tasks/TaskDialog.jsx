import React from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export function TaskDialog({
    assigneeOptions = [],
    assigneeValueField = 'assignee_user_id',
    disabled = false,
    mode = 'edit',
    onClose,
    onDelete,
    onDuplicate,
    onFieldChange,
    onSubmit,
    open,
    parentTaskOptions = [],
    projectOptions = [],
    showCompletion = mode === 'edit',
    showProject = projectOptions.length > 0,
    submitLabel,
    testId = 'task-dialog',
    title,
    value,
}) {
    const isCreate = mode === 'create';
    const fieldIdPrefix = showProject ? 'timeline-task' : 'project-task';

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl overflow-hidden p-0" data-testid={testId}>
                <DialogHeader className="border-b border-stone-200 px-6 py-5">
                    <DialogTitle>{title ?? (isCreate ? 'New task' : 'Edit task')}</DialogTitle>
                </DialogHeader>

                <form
                    className="flex flex-col"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit();
                    }}
                >
                    <div className="max-h-[72vh] space-y-6 overflow-y-auto px-6 py-5">
                        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                            <div className="space-y-1.5">
                                <Label htmlFor={`${fieldIdPrefix}-name`}>Task name</Label>
                                <Input
                                    id={`${fieldIdPrefix}-name`}
                                    className="h-12 text-base font-medium"
                                    autoFocus
                                    value={value.name}
                                    onChange={(event) => onFieldChange('name', event.target.value)}
                                    placeholder="Task name"
                                    disabled={disabled}
                                    data-testid="task-dialog-name"
                                />
                            </div>

                            {showCompletion ? (
                                <label className="flex h-12 items-center gap-3 rounded-[6px] border border-stone-200 bg-stone-50 px-3 text-sm font-medium text-stone-700">
                                    <Checkbox
                                        checked={Boolean(value.completed)}
                                        onCheckedChange={(checked) => onFieldChange('completed', checked)}
                                        disabled={disabled}
                                    />
                                    Complete
                                </label>
                            ) : null}
                        </div>

                        <div className="border-t border-stone-200 pt-5">
                            <div className="grid gap-4 sm:grid-cols-2">
                                {showProject ? (
                                    <div className="space-y-1.5">
                                        <Label htmlFor={`${fieldIdPrefix}-project`}>Project</Label>
                                        <Select
                                            id={`${fieldIdPrefix}-project`}
                                            value={value.project_id ?? ''}
                                            onChange={(event) => onFieldChange('project_id', event.target.value)}
                                            disabled={disabled}
                                        >
                                            {projectOptions.map((project) => (
                                                <option key={project.id} value={project.id}>
                                                    {project.depth ? `${'— '.repeat(project.depth)}${project.name}` : project.name}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                ) : null}

                                <div className="space-y-1.5">
                                    <Label htmlFor={`${fieldIdPrefix}-parent`}>Parent task or group</Label>
                                    <Select
                                        id={`${fieldIdPrefix}-parent`}
                                        value={value.parent_id ?? ''}
                                        onChange={(event) => onFieldChange('parent_id', event.target.value || null)}
                                        disabled={disabled}
                                    >
                                        <option value="">No parent</option>
                                        {parentTaskOptions.map((task) => (
                                            <option key={task.id} value={task.id}>
                                                {parentOptionLabel(task)}
                                            </option>
                                        ))}
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor={`${fieldIdPrefix}-assignee`}>Assigned to</Label>
                                    <Select
                                        id={`${fieldIdPrefix}-assignee`}
                                        value={value[assigneeValueField] ?? ''}
                                        onChange={(event) => onFieldChange(assigneeValueField, event.target.value)}
                                        disabled={disabled}
                                    >
                                        {assigneeOptions.map((option) => (
                                            <option key={assigneeOptionValue(option) || 'unassigned'} value={assigneeOptionValue(option)}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-stone-200 pt-5">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor={`${fieldIdPrefix}-start`}>Start date</Label>
                                    <Input
                                        id={`${fieldIdPrefix}-start`}
                                        type="date"
                                        value={value.start_date}
                                        onChange={(event) => onFieldChange('start_date', event.target.value)}
                                        disabled={disabled}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor={`${fieldIdPrefix}-end`}>End date</Label>
                                    <Input
                                        id={`${fieldIdPrefix}-end`}
                                        type="date"
                                        value={value.end_date}
                                        onChange={(event) => onFieldChange('end_date', event.target.value)}
                                        disabled={disabled}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5 border-t border-stone-200 pt-5">
                            <Label htmlFor={`${fieldIdPrefix}-description`}>Notes</Label>
                            <Textarea
                                id={`${fieldIdPrefix}-description`}
                                className="min-h-24 resize-y"
                                value={value.description ?? ''}
                                onChange={(event) => onFieldChange('description', event.target.value)}
                                placeholder="Add context, links, or handoff notes."
                                disabled={disabled}
                            />
                        </div>
                    </div>

                    <DialogFooter className="justify-between border-t border-stone-200 bg-stone-50 px-6 py-4">
                        <div className="flex items-center gap-2">
                            {onDelete ? (
                                <Button type="button" variant="ghost" onClick={onDelete} disabled={disabled} data-testid="task-dialog-delete">
                                    Delete task
                                </Button>
                            ) : null}
                            {onDuplicate ? (
                                <Button type="button" variant="ghost" onClick={onDuplicate} disabled={disabled}>
                                    Duplicate task
                                </Button>
                            ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" onClick={() => onClose(false)} disabled={disabled} data-testid="task-dialog-cancel">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={disabled || !value.name.trim() || !value.start_date || !value.end_date} data-testid="task-dialog-save">
                                {submitLabel ?? (isCreate ? 'Create task' : 'Save task')}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function assigneeOptionValue(option) {
    if (option.user_id !== undefined && option.user_id !== null) {
        return String(option.user_id);
    }

    if (option.value !== undefined && option.value !== null) {
        return String(option.value);
    }

    return '';
}

function parentOptionLabel(task) {
    const prefix = task.depth !== undefined ? '— '.repeat(task.depth + 1) : '';
    const label = task.kind === 'group' ? `Group: ${task.name}` : task.name;

    return `${prefix}${label}`;
}
