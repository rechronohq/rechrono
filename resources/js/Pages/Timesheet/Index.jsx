import React, { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Pencil, Play, Plus, Square, Trash2, X } from 'lucide-react';

import AppPage from '@/Layouts/AppPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { request } from '@/lib/request';
import { toAppPath } from '@/lib/url';
import { cn } from '@/lib/utils';

function formatDay(value) {
    return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    }).format(new Date(`${value}T00:00:00`));
}

function formatFullDay(value) {
    return new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    }).format(new Date(`${value}T00:00:00`));
}

function formatHours(value) {
    return `${Number(value ?? 0).toFixed(2)}h`;
}

function formatWeekHours(value) {
    const number = Number(value ?? 0);

    if (number === 0) {
        return '0';
    }

    return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function formatDuration(seconds) {
    const totalSeconds = Math.max(0, Number(seconds ?? 0));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}`;
    }

    return `${minutes}m`;
}

function elapsedSeconds(entry) {
    if (!entry?.is_running) {
        return entry?.duration_seconds ?? 0;
    }

    const startedAt = Date.parse(entry.started_at);

    if (Number.isNaN(startedAt)) {
        return entry.duration_seconds ?? 0;
    }

    return Math.max(entry.duration_seconds ?? 0, Math.floor((Date.now() - startedAt) / 1000));
}

function updateUrl(template, entryId) {
    return template.replace('__ENTRY__', entryId);
}

function dayUrl(template, day) {
    return template.replace('__DATE__', day);
}

function defaultDraft(timesheet) {
    return {
        id: null,
        task_id: timesheet.task_options?.[0]?.id ?? '',
        date: timesheet.selected_date,
        start_time: '09:00',
        end_time: '10:00',
    };
}

export default function TimesheetIndex({ timesheet }) {
    const { props } = usePage();
    const appRoutes = props.routes ?? {};
    const rows = timesheet.rows ?? [];
    const days = timesheet.days ?? [];
    const entries = timesheet.day_entries ?? [];
    const isWeekView = timesheet.view === 'week';
    const [draft, setDraft] = useState(null);
    const [runningSeconds, setRunningSeconds] = useState({});

    const dayTotalSeconds = useMemo(() => entries.reduce((total, entry) => total + elapsedSeconds(entry), 0), [entries, runningSeconds]);

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

    function openNewEntry() {
        setDraft(defaultDraft(timesheet));
    }

    function openEditEntry(entry) {
        setDraft({
            id: entry.id,
            task_id: entry.task_id,
            date: entry.date ?? timesheet.selected_date,
            start_time: entry.started_time ?? '09:00',
            end_time: entry.ended_time ?? '10:00',
        });
    }

    function updateDraft(field, value) {
        setDraft((current) => ({ ...current, [field]: value }));
    }

    async function saveDraft() {
        if (!draft?.task_id || !draft.start_time || !draft.end_time) {
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
    }

    async function deleteEntry(entry) {
        if (!entry.can_edit || !window.confirm('Delete this time entry?')) {
            return;
        }

        await request(toAppPath(updateUrl(timesheet.routes.destroy, entry.id)), {
            method: 'DELETE',
        });
        router.reload({ preserveScroll: true });
    }

    async function startTimer(entry) {
        if (!appRoutes.time?.startTimer) {
            return;
        }

        const payload = await request(appRoutes.time.startTimer.replace('__TASK__', entry.task_id), {
            method: 'POST',
        });
        window.dispatchEvent(new CustomEvent('rechrono:timer-change', { detail: { entry: payload.entry ?? null } }));
        router.reload({ preserveScroll: true });
    }

    async function stopTimer() {
        if (!appRoutes.time?.stopTimer) {
            return;
        }

        const payload = await request(appRoutes.time.stopTimer, {
            method: 'POST',
        });
        const entry = payload.entry?.is_running ? payload.entry : null;
        window.dispatchEvent(new CustomEvent('rechrono:timer-change', { detail: { entry } }));
        router.reload({ preserveScroll: true });
    }

    return (
        <AppPage title="Timesheet" activeApp="timesheet" contextBar={false}>
            <div className="flex min-h-0 w-full flex-1 overflow-auto bg-white">
                <div className="flex min-h-full w-full flex-col">
                    <div className="w-full border-b border-stone-200 px-6 py-5">
                        <h1 className="text-xl font-semibold text-stone-950">Timesheet</h1>
                    </div>

                    <div className="mx-auto flex min-h-0 w-full max-w-[1180px] flex-1 flex-col px-6">
                        <div className="flex flex-wrap items-center justify-between gap-4 py-6">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="inline-flex overflow-hidden rounded-[6px] border border-stone-200 bg-white shadow-sm">
                                    <button
                                        type="button"
                                        aria-label={isWeekView ? 'Previous week' : 'Previous day'}
                                        className="flex h-10 w-10 items-center justify-center text-stone-600 transition hover:bg-stone-50 hover:text-stone-950"
                                        onClick={() => router.visit(isWeekView ? timesheet.previous_week_url : timesheet.previous_day_url)}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={isWeekView ? 'Next week' : 'Next day'}
                                        className="flex h-10 w-10 items-center justify-center border-l border-stone-200 text-stone-600 transition hover:bg-stone-50 hover:text-stone-950"
                                        onClick={() => router.visit(isWeekView ? timesheet.next_week_url : timesheet.next_day_url)}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                                <h2 className="text-3xl font-semibold tracking-[-0.04em] text-stone-950">
                                    {isWeekView ? `Week of ${timesheet.week_start}` : formatFullDay(timesheet.selected_date)}
                                </h2>
                            </div>
                            <div className="inline-flex overflow-hidden rounded-[6px] border border-stone-200 bg-white shadow-sm">
                                <button
                                    type="button"
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
                        <div className="mt-4 grid grid-cols-7 border-t border-stone-100 pt-3">
                            {days.map((day) => {
                                const isSelected = day === timesheet.selected_date;

                                return (
                                    <button
                                        key={day}
                                        type="button"
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

function DayView({
    draft,
    entries,
    runningSeconds,
    timesheet,
    dayTotalSeconds,
    onAddEntry,
    onCancelDraft,
    onDeleteEntry,
    onEditEntry,
    onSaveDraft,
    onStartTimer,
    onStopTimer,
    onUpdateDraft,
}) {
    return (
        <div className="min-h-0 flex-1">
            <div className="overflow-hidden border-t border-stone-200">
                {draft ? (
                    <div className="grid gap-3 border-b border-stone-200 bg-stone-50 px-4 py-3 lg:grid-cols-[minmax(280px,1fr)_120px_120px_auto] lg:items-end">
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase text-stone-500">Task</label>
                            <Select value={draft.task_id} onChange={(event) => onUpdateDraft('task_id', event.target.value)}>
                                {timesheet.task_options.map((task) => (
                                    <option key={task.id} value={task.id}>{task.project_name} · {task.name}</option>
                                ))}
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase text-stone-500">Start</label>
                            <Input type="time" value={draft.start_time} onChange={(event) => onUpdateDraft('start_time', event.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase text-stone-500">End</label>
                            <Input type="time" value={draft.end_time} onChange={(event) => onUpdateDraft('end_time', event.target.value)} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" onClick={onSaveDraft}>Save</Button>
                            <Button type="button" variant="outline" size="icon" aria-label="Cancel entry" onClick={onCancelDraft}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ) : null}

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
                                        aria-label="Stop timer"
                                        title="Stop timer"
                                        onClick={onStopTimer}
                                    >
                                        <Square className="h-4 w-4 fill-current" />
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        aria-label="Start timer"
                                        title="Start timer"
                                        onClick={() => onStartTimer(entry)}
                                    >
                                        <Play className="h-4 w-4" />
                                    </Button>
                                )}
                                {entry.can_edit && !entry.is_running ? (
                                    <>
                                        <Button type="button" variant="outline" size="icon" aria-label="Edit entry" onClick={() => onEditEntry(entry)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button type="button" variant="outline" size="icon" aria-label="Delete entry" onClick={() => onDeleteEntry(entry)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    );
                }) : (
                    <div className="px-6 py-12 text-center text-sm font-medium text-stone-500">No time entries for this day.</div>
                )}
            </div>
            <div className="flex items-end justify-between gap-4 px-4 py-4">
                <Button type="button" variant="outline" size="sm" disabled={!timesheet.task_options?.length} onClick={onAddEntry}>
                    <Plus className="mr-1 h-4 w-4" />
                    Add entry
                </Button>
                <div className="text-right">
                    <p className="text-xs font-medium uppercase text-stone-400">Day total</p>
                    <p className="text-2xl font-semibold text-stone-950">{formatDuration(dayTotalSeconds)}</p>
                </div>
            </div>
        </div>
    );
}

function WeekView({ days, rows, timesheet }) {
    return (
        <div className="min-h-0 flex-1 overflow-auto border-t border-stone-200">
            <table className="min-w-[980px] w-full border-separate border-spacing-0 text-sm">
                <thead>
                    <tr className="bg-white text-left text-xs font-semibold uppercase text-stone-500">
                        <th className="sticky left-0 z-10 w-[420px] border-b border-stone-200 bg-white px-4 py-4">Task</th>
                        {days.map((day) => (
                            <th key={day} className="w-28 border-b border-stone-200 px-2 py-4 text-right">{formatDay(day)}</th>
                        ))}
                        <th className="w-24 border-b border-stone-200 px-3 py-4 text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length > 0 ? rows.map((row) => (
                        <tr key={row.key}>
                            <td className="sticky left-0 z-10 border-b border-stone-200 bg-white px-4 py-4 align-middle">
                                <p className="text-base font-semibold text-stone-950">{row.task_name}</p>
                                <p className="mt-0.5 text-sm text-stone-700">
                                    {timesheet.can_view_team ? `${row.user_name} · ` : ''}{row.project_name}
                                </p>
                            </td>
                            {days.map((day) => (
                                <td key={day} className="border-b border-stone-200 px-2 py-4 text-right align-middle">
                                    <button
                                        type="button"
                                        className="h-9 w-full rounded-[6px] border border-stone-200 bg-white px-2 text-right tabular-nums text-stone-700 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                        onClick={() => router.visit(dayUrl(timesheet.day_url, day))}
                                    >
                                        {formatWeekHours(row.entries[day]?.hours ?? 0)}
                                    </button>
                                </td>
                            ))}
                            <td className="border-b border-stone-200 px-3 py-4 text-right text-base font-semibold text-stone-950">
                                {formatWeekHours(row.total_hours)}
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={days.length + 2} className="px-6 py-12 text-center text-sm text-stone-500">
                                No time entries for this week.
                            </td>
                        </tr>
                    )}
                </tbody>
                <tfoot>
                    <tr className="bg-white font-semibold text-stone-950">
                        <td className="sticky left-0 bg-white px-4 py-4">Daily total</td>
                        {days.map((day) => (
                            <td key={day} className="px-3 py-4 text-right">{formatWeekHours(timesheet.totals.days[day])}</td>
                        ))}
                        <td className="px-3 py-4 text-right">{formatWeekHours(timesheet.totals.total_hours)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
