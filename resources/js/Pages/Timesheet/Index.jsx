import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';

import AppPage from '@/Layouts/AppPage';
import { request } from '@/lib/request';
import { startTaskTimer, stopCurrentTimer } from '@/lib/timeTimer';
import { toAppPath } from '@/lib/url';
import { cn } from '@/lib/utils';
import { DateNavigator } from './DateNavigator';
import { DayView } from './DayView';
import { WeekView } from './WeekView';
import {
    dayUrl,
    defaultDraft,
    elapsedSeconds,
    formatDay,
    formatWeekHours,
    isDraftActionDisabled,
    updateUrl,
} from './time';

export default function TimesheetIndex({ timesheet }) {
    const { props } = usePage();
    const appRoutes = props.routes ?? {};
    const rows = timesheet.rows ?? [];
    const days = timesheet.days ?? [];
    const entries = timesheet.day_entries ?? [];
    const isWeekView = timesheet.view === 'week';
    const [draft, setDraft] = useState(null);
    const [runningSeconds, setRunningSeconds] = useState({});
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isStoppingTimer, setIsStoppingTimer] = useState(false);
    const [deletingEntryIds, setDeletingEntryIds] = useState(() => new Set());
    const [startingTaskIds, setStartingTaskIds] = useState(() => new Set());

    const dayTotalSeconds = useMemo(
        () => entries.reduce((total, entry) => total + elapsedSeconds(entry), 0),
        [entries, runningSeconds],
    );

    useEffect(() => {
        const runningEntries = entries.filter((entry) => entry.is_running);

        if (runningEntries.length === 0) {
            setRunningSeconds({});

            return undefined;
        }

        const tick = () => {
            setRunningSeconds(Object.fromEntries(runningEntries.map((entry) => [entry.id, elapsedSeconds(entry)])));
        };

        tick();
        const intervalId = window.setInterval(tick, 1000);

        return () => window.clearInterval(intervalId);
    }, [entries]);

    useEffect(() => {
        const refreshTimesheet = () => {
            router.reload({
                only: ['timesheet'],
                preserveScroll: true,
            });
        };

        window.addEventListener('rechrono:timer-change', refreshTimesheet);

        return () => window.removeEventListener('rechrono:timer-change', refreshTimesheet);
    }, []);

    function openNewEntry() {
        if (isSavingDraft) {
            return;
        }

        setDraft(defaultDraft(timesheet));
    }

    function openEditEntry(entry) {
        if (isSavingDraft || deletingEntryIds.has(entry.id)) {
            return;
        }

        setDraft({
            id: entry.id,
            task_id: entry.task_id,
            date: entry.date ?? timesheet.selected_date,
            start_time: entry.started_time ?? '09:00',
            end_time: entry.ended_time ?? '10:00',
        });
    }

    function updateDraft(field, value) {
        if (isSavingDraft) {
            return;
        }

        setDraft((current) => ({ ...current, [field]: value }));
    }

    async function saveDraft() {
        if (isDraftActionDisabled(draft, isSavingDraft)) {
            return;
        }

        setIsSavingDraft(true);

        try {
            if (!draft.id && !draft.end_time) {
                await startTaskTimer(appRoutes, draft.task_id);
                setDraft(null);

                return;
            }

            const payload = {
                task_id: draft.task_id,
                date: draft.date,
                start_time: draft.start_time,
                end_time: draft.end_time,
            };

            if (draft.id) {
                await request(toAppPath(updateUrl(timesheet.routes.update, draft.id)), {
                    method: 'PATCH',
                    body: JSON.stringify(payload),
                });
            } else {
                await request(toAppPath(timesheet.routes.store), {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
            }

            setDraft(null);
            router.reload({ preserveScroll: true });
        } finally {
            setIsSavingDraft(false);
        }
    }

    function addPendingEntryId(entryId) {
        setDeletingEntryIds((current) => new Set(current).add(entryId));
    }

    function removePendingEntryId(entryId) {
        setDeletingEntryIds((current) => {
            const next = new Set(current);
            next.delete(entryId);

            return next;
        });
    }

    function addPendingTaskId(taskId) {
        setStartingTaskIds((current) => new Set(current).add(taskId));
    }

    function removePendingTaskId(taskId) {
        setStartingTaskIds((current) => {
            const next = new Set(current);
            next.delete(taskId);

            return next;
        });
    }

    async function deleteEntry(entry) {
        if (!entry.can_edit || deletingEntryIds.has(entry.id) || !window.confirm('Delete this time entry?')) {
            return;
        }

        addPendingEntryId(entry.id);

        try {
            await request(toAppPath(updateUrl(timesheet.routes.destroy, entry.id)), {
                method: 'DELETE',
            });
            router.reload({ preserveScroll: true });
        } finally {
            removePendingEntryId(entry.id);
        }
    }

    async function startTimer(entry) {
        if (!appRoutes.time?.startTimer || startingTaskIds.has(entry.task_id)) {
            return;
        }

        addPendingTaskId(entry.task_id);

        try {
            await startTaskTimer(appRoutes, entry.task_id);
        } finally {
            removePendingTaskId(entry.task_id);
        }
    }

    async function stopTimer() {
        if (!appRoutes.time?.stopTimer || isStoppingTimer) {
            return;
        }

        setIsStoppingTimer(true);

        try {
            await stopCurrentTimer(appRoutes);
        } finally {
            setIsStoppingTimer(false);
        }
    }

    return (
        <AppPage title="Timesheet" activeApp="timesheet">
            <div className="flex min-h-0 w-full flex-1 bg-white">
                <div className="flex min-h-full w-full flex-col">
                    <div className="mx-auto flex min-h-0 w-full max-w-[1180px] flex-1 flex-col px-6">
                        <div className="flex flex-wrap items-center justify-between gap-4 py-6">
                            <DateNavigator isWeekView={isWeekView} timesheet={timesheet} />
                            <div role="group" aria-label="Timesheet view" className="inline-flex overflow-hidden rounded-[6px] border border-stone-200 bg-white shadow-sm">
                                <button
                                    type="button"
                                    aria-pressed={!isWeekView}
                                    className={cn(
                                        'h-9 px-4 text-sm font-medium transition',
                                        !isWeekView ? 'bg-blue-600 text-white' : 'text-stone-700 hover:bg-stone-50',
                                    )}
                                    onClick={() => router.visit(dayUrl(timesheet.day_url, timesheet.selected_date))}
                                >
                                    Day
                                </button>
                                <button
                                    type="button"
                                    aria-pressed={isWeekView}
                                    className={cn(
                                        'h-9 border-l border-stone-200 px-4 text-sm font-medium transition',
                                        isWeekView ? 'bg-blue-600 text-white' : 'text-stone-700 hover:bg-stone-50',
                                    )}
                                    onClick={() => router.visit(timesheet.week_url)}
                                >
                                    Week
                                </button>
                            </div>
                        </div>

                        {!isWeekView ? (
                            <div role="group" aria-label="Week days" className="mt-4 grid grid-cols-7 border-t border-stone-100 pt-3">
                                {days.map((day) => {
                                    const isSelected = day === timesheet.selected_date;

                                    return (
                                        <button
                                            key={day}
                                            type="button"
                                            aria-current={isSelected ? 'date' : undefined}
                                            className={cn(
                                                'border-b px-2 pb-2 text-left text-sm transition hover:border-blue-300 hover:text-blue-700',
                                                isSelected ? 'border-blue-500 font-medium text-stone-950' : 'border-transparent text-stone-500',
                                            )}
                                            onClick={() => router.visit(dayUrl(timesheet.day_url, day))}
                                        >
                                            <span className="block">{formatDay(day)}</span>
                                            <span className="mt-0.5 block text-xs">{formatWeekHours(timesheet.totals.days[day])}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : null}

                        {isWeekView ? (
                            <WeekView days={days} rows={rows} timesheet={timesheet} />
                        ) : (
                            <DayView
                                draft={draft}
                                entries={entries}
                                runningSeconds={runningSeconds}
                                timesheet={timesheet}
                                dayTotalSeconds={dayTotalSeconds}
                                onAddEntry={openNewEntry}
                                onCancelDraft={() => setDraft(null)}
                                onDeleteEntry={deleteEntry}
                                onEditEntry={openEditEntry}
                                isSavingDraft={isSavingDraft}
                                isStoppingTimer={isStoppingTimer}
                                deletingEntryIds={deletingEntryIds}
                                startingTaskIds={startingTaskIds}
                                onSaveDraft={saveDraft}
                                onStartTimer={startTimer}
                                onStopTimer={stopTimer}
                                onUpdateDraft={updateDraft}
                            />
                        )}
                    </div>
                </div>
            </div>
        </AppPage>
    );
}
