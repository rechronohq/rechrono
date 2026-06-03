import { useId } from 'react';
import { Pencil, Play, Plus, Square, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { TaskPicker } from './TaskPicker';
import { elapsedSeconds, formatDuration, isDraftActionDisabled, validateDraft } from './time';

export function DayView({
    draft,
    entries,
    runningSeconds,
    timesheet,
    dayTotalSeconds,
    onAddEntry,
    onCancelDraft,
    onDeleteEntry,
    onEditEntry,
    isSavingDraft,
    isStoppingTimer,
    deletingEntryIds,
    startingTaskIds,
    onSaveDraft,
    onStartTimer,
    onStopTimer,
    onUpdateDraft,
}) {
    const draftValidation = validateDraft(draft);
    const startInputId = useId();
    const endInputId = useId();
    const endErrorId = useId();

    return (
        <div className="min-h-0 flex-1">
            <div className="overflow-hidden border-t border-stone-200">
                {entries.length > 0 ? entries.map((entry) => {
                    const durationSeconds = entry.is_running ? (runningSeconds[entry.id] ?? elapsedSeconds(entry)) : entry.duration_seconds;

                    return (
                        <div
                            key={entry.id}
                            className={cn(
                                'grid gap-4 border-b border-stone-200 px-4 py-4 lg:grid-cols-[110px_minmax(260px,1fr)_90px_auto] lg:items-center',
                                entry.is_running && 'bg-orange-50',
                            )}
                        >
                            <div className="text-lg tabular-nums text-stone-950">
                                <p className="font-semibold leading-6">{entry.started_time}</p>
                                <p className="leading-6">{entry.is_running ? 'Running' : entry.ended_time}</p>
                            </div>
                            <div className="min-w-0">
                                <p className="text-base font-semibold text-stone-950">{entry.task_name}</p>
                                <p className="mt-0.5 text-base text-stone-700">
                                    {timesheet.can_view_team ? `${entry.user_name} · ` : ''}{entry.project_name}
                                </p>
                            </div>
                            <div className="text-right text-xl font-semibold tabular-nums text-stone-950">
                                {formatDuration(durationSeconds)}
                            </div>
                            <div className="flex justify-end gap-2">
                                {entry.is_running ? (
                                    <Button
                                        type="button"
                                        size="icon"
                                        aria-label={`Stop timer for ${entry.task_name}`}
                                        title="Stop timer"
                                        disabled={isStoppingTimer}
                                        onClick={onStopTimer}
                                    >
                                        <Square className="h-4 w-4 fill-current" />
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        aria-label={`Start timer for ${entry.task_name}`}
                                        title="Start timer"
                                        disabled={startingTaskIds.has(entry.task_id)}
                                        onClick={() => onStartTimer(entry)}
                                    >
                                        <Play className="h-4 w-4" />
                                    </Button>
                                )}
                                {entry.can_edit && !entry.is_running ? (
                                    <>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            aria-label={`Edit time entry for ${entry.task_name}`}
                                            disabled={deletingEntryIds.has(entry.id)}
                                            onClick={() => onEditEntry(entry)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            aria-label={`Delete time entry for ${entry.task_name}`}
                                            disabled={deletingEntryIds.has(entry.id)}
                                            onClick={() => onDeleteEntry(entry)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    );
                }) : !draft ? (
                    <div className="px-6 py-12 text-center text-sm font-medium text-stone-500">No time entries for this day.</div>
                ) : null}

                {draft ? (
                    <div
                        role="form"
                        aria-label={draft.id ? 'Edit time entry' : 'Add time entry'}
                        className="grid gap-3 border-b border-stone-200 bg-stone-50 px-4 py-3 lg:grid-cols-[minmax(280px,1fr)_120px_120px_auto] lg:items-end"
                    >
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase text-stone-500">Task</label>
                            <TaskPicker
                                tasks={timesheet.task_options}
                                value={draft.task_id}
                                onChange={(taskId) => onUpdateDraft('task_id', taskId)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor={startInputId} className="text-xs font-medium uppercase text-stone-500">Start</label>
                            <Input
                                id={startInputId}
                                type="time"
                                value={draft.start_time}
                                onChange={(event) => onUpdateDraft('start_time', event.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor={endInputId} className="text-xs font-medium uppercase text-stone-500">End</label>
                            <Input
                                id={endInputId}
                                type="time"
                                value={draft.end_time}
                                aria-invalid={draftValidation.error ? 'true' : undefined}
                                aria-describedby={draftValidation.error ? endErrorId : undefined}
                                onChange={(event) => onUpdateDraft('end_time', event.target.value)}
                            />
                            {draftValidation.error ? (
                                <p id={endErrorId} className="text-xs font-medium text-red-600">{draftValidation.error}</p>
                            ) : null}
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" disabled={isDraftActionDisabled(draft, isSavingDraft)} onClick={onSaveDraft}>
                                {isSavingDraft ? 'Saving' : (draft.id || draft.end_time ? 'Save' : 'Start')}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={draft.id ? 'Cancel editing time entry' : 'Cancel adding time entry'}
                                disabled={isSavingDraft}
                                onClick={onCancelDraft}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ) : null}
            </div>
            <div className="flex items-end justify-between gap-4 px-4 py-4">
                {draft ? (
                    <span />
                ) : (
                    <Button type="button" variant="outline" size="sm" disabled={!timesheet.task_options?.length} onClick={onAddEntry}>
                        <Plus className="mr-1 h-4 w-4" />
                        Add entry
                    </Button>
                )}
                <div className="text-right">
                    <p className="text-xs font-medium uppercase text-stone-400">Day total</p>
                    <p className="text-2xl font-semibold text-stone-950">{formatDuration(dayTotalSeconds)}</p>
                </div>
            </div>
        </div>
    );
}
