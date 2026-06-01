import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';

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

function updateUrl(template, entryId) {
    return template.replace('__ENTRY__', entryId);
}

function createDraftRow(days, taskId) {
    return {
        id: crypto.randomUUID(),
        task_id: taskId,
        hours_by_day: Object.fromEntries(days.map((day) => [day, ''])),
    };
}

export default function TimesheetIndex({ timesheet }) {
    const [drafts, setDrafts] = useState({});
    const firstTaskId = timesheet.task_options?.[0]?.id ?? '';
    const rows = timesheet.rows ?? [];
    const days = timesheet.days ?? [];
    const [newRows, setNewRows] = useState([]);

    function cellDraft(row, day) {
        const cell = row.entries[day] ?? { hours: 0, notes: '', entry_id: null };
        const key = `${row.key}:${day}`;

        return drafts[key] ?? {
            task_id: row.task_id,
            date: day,
            hours: cell.hours || '',
            notes: cell.notes ?? '',
            entry_id: cell.entry_id,
        };
    }

    function setCellDraft(row, day, field, value) {
        const key = `${row.key}:${day}`;
        setDrafts((previous) => ({
            ...previous,
            [key]: {
                ...cellDraft(row, day),
                [field]: value,
            },
        }));
    }

    async function saveCell(row, day) {
        const draft = cellDraft(row, day);
        const cell = row.entries[day] ?? { hours: 0, notes: '', entry_id: null };
        const originalHours = cell.hours || '';
        const hours = draft.hours === '' ? '' : Number(draft.hours);

        if (draft.entry_id && (draft.hours === '' || hours === 0)) {
            await deleteCell(row, day);

            return;
        }

        if (String(draft.hours) === String(originalHours) && (draft.notes ?? '') === (cell.notes ?? '')) {
            return;
        }

        if (draft.hours === '' || Number.isNaN(hours)) {
            return;
        }

        const payload = {
            task_id: draft.task_id,
            date: draft.date,
            hours: draft.hours,
            notes: draft.notes,
        };

        if (draft.entry_id) {
            await request(toAppPath(updateUrl(timesheet.routes.update, draft.entry_id)), {
                method: 'PATCH',
                body: JSON.stringify(payload),
            });
            router.reload({ preserveScroll: true });

            return;
        }

        await request(toAppPath(timesheet.routes.store), {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        router.reload({ preserveScroll: true });
    }

    async function deleteCell(row, day) {
        const draft = cellDraft(row, day);

        if (!draft.entry_id) {
            return;
        }

        await request(toAppPath(updateUrl(timesheet.routes.destroy, draft.entry_id)), {
            method: 'DELETE',
        });
        router.reload({ preserveScroll: true });
    }

    function addDraftRow() {
        if (!firstTaskId) {
            return;
        }

        setNewRows((previous) => [...previous, createDraftRow(days, firstTaskId)]);
    }

    function removeDraftRow(rowId) {
        setNewRows((previous) => previous.filter((row) => row.id !== rowId));
    }

    function setDraftRowTask(rowId, taskId) {
        setNewRows((previous) => previous.map((row) => (
            row.id === rowId ? { ...row, task_id: taskId } : row
        )));
    }

    function setDraftRowHours(rowId, day, value) {
        setNewRows((previous) => previous.map((row) => (
            row.id === rowId
                ? {
                    ...row,
                    hours_by_day: {
                        ...row.hours_by_day,
                        [day]: value,
                    },
                }
                : row
        )));
    }

    async function saveDraftRow(row) {
        const entries = days
            .map((day) => ({
                day,
                hours: row.hours_by_day[day] ?? '',
            }))
            .filter((entry) => entry.hours !== '' && !Number.isNaN(Number(entry.hours)) && Number(entry.hours) > 0);

        if (!row.task_id || entries.length === 0) {
            return;
        }

        for (const entry of entries) {
            await request(toAppPath(timesheet.routes.store), {
                method: 'POST',
                body: JSON.stringify({
                    task_id: row.task_id,
                    date: entry.day,
                    hours: entry.hours,
                    notes: '',
                }),
            });
        }

        removeDraftRow(row.id);
        router.reload({ preserveScroll: true });
    }

    function draftRowTotal(row) {
        return days.reduce((total, day) => {
            const hours = Number(row.hours_by_day[day] ?? 0);

            return total + (Number.isNaN(hours) ? 0 : hours);
        }, 0);
    }

    function handleHoursKeyDown(event, callback) {
        if (event.key !== 'Enter') {
            return;
        }

        event.preventDefault();
        callback();
    }

    return (
        <AppPage
            title="Timesheet"
            activeApp="timesheet"
            actions={(
                <div className="flex items-center gap-2">
                    <Button as="a" variant="outline" size="sm" onClick={() => router.visit(timesheet.previous_week_url)}>
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Previous
                    </Button>
                    <Button as="a" variant="outline" size="sm" onClick={() => router.visit(timesheet.next_week_url)}>
                        Next
                        <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                </div>
            )}
        >
            <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-white">
                <div className="border-b border-stone-200 px-6 py-4">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <h1 className="text-xl font-semibold tracking-[-0.02em] text-stone-950">Week of {timesheet.week_start}</h1>
                            <p className="mt-1 text-sm text-stone-500">
                                {timesheet.can_view_team ? 'Team entries and project totals.' : 'Your tracked task time.'}
                            </p>
                        </div>
                        <div className="flex items-end gap-4">
                            <Button type="button" variant="outline" size="sm" disabled={!firstTaskId} onClick={addDraftRow}>
                                <Plus className="mr-1 h-4 w-4" />
                                Add row
                            </Button>
                            <div className="text-right">
                                <p className="text-xs font-medium uppercase text-stone-400">Total</p>
                                <p className="text-2xl font-semibold text-stone-950">{timesheet.totals.total_hours.toFixed(2)}h</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-auto">
                    <table className="min-w-[980px] w-full border-separate border-spacing-0 text-sm">
                        <thead>
                            <tr className="bg-stone-50 text-left text-xs font-semibold uppercase text-stone-500">
                                <th className="sticky left-0 z-10 w-72 border-b border-stone-200 bg-stone-50 px-4 py-3">Task</th>
                                {days.map((day) => (
                                    <th key={day} className="w-32 border-b border-stone-200 px-3 py-3">{formatDay(day)}</th>
                                ))}
                                <th className="w-44 border-b border-stone-200 px-3 py-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.key} className="border-b border-stone-100">
                                    <td className="sticky left-0 z-10 border-b border-stone-100 bg-white px-4 py-3 align-top">
                                        <p className="font-medium text-stone-900">{row.task_name}</p>
                                        <p className="mt-0.5 text-xs text-stone-500">
                                            {timesheet.can_view_team ? `${row.user_name} · ` : ''}{row.project_name}
                                        </p>
                                    </td>
                                    {days.map((day) => {
                                        const draft = cellDraft(row, day);
                                        const hasEntry = Boolean(draft.entry_id);

                                        return (
                                            <td key={day} className="border-b border-stone-100 px-2 py-2 align-top">
                                                <Input
                                                    aria-label={`${row.task_name} ${day} hours`}
                                                    type="number"
                                                    min="0"
                                                    max="24"
                                                    step="0.25"
                                                    value={draft.hours}
                                                    onChange={(event) => setCellDraft(row, day, 'hours', event.target.value)}
                                                    onBlur={() => saveCell(row, day)}
                                                    onKeyDown={(event) => handleHoursKeyDown(event, () => saveCell(row, day))}
                                                    className={cn('h-9 px-2 text-right', hasEntry && 'border-blue-200 bg-blue-50/50')}
                                                />
                                            </td>
                                        );
                                    })}
                                    <td className="border-b border-stone-100 px-3 py-3 text-right font-medium text-stone-900">
                                        {row.total_hours.toFixed(2)}h
                                    </td>
                                </tr>
                            ))}
                            {newRows.map((row) => {
                                const total = draftRowTotal(row);

                                return (
                                    <tr key={row.id}>
                                        <td className="sticky left-0 z-10 bg-stone-50 px-4 py-3">
                                            <Select
                                                value={row.task_id}
                                                onChange={(event) => setDraftRowTask(row.id, event.target.value)}
                                            >
                                                {timesheet.task_options.map((task) => (
                                                    <option key={task.id} value={task.id}>{task.project_name} · {task.name}</option>
                                                ))}
                                            </Select>
                                        </td>
                                        {days.map((day) => (
                                            <td key={day} className="bg-stone-50 px-2 py-3">
                                                <Input
                                                    aria-label={`Add ${day} hours`}
                                                    type="number"
                                                    min="0"
                                                    max="24"
                                                    step="0.25"
                                                    placeholder="0.00"
                                                    value={row.hours_by_day[day] ?? ''}
                                                    onChange={(event) => setDraftRowHours(row.id, day, event.target.value)}
                                                    onKeyDown={(event) => handleHoursKeyDown(event, () => saveDraftRow(row))}
                                                    className="h-9 px-2 text-right"
                                                    disabled={!row.task_id}
                                                />
                                            </td>
                                        ))}
                                        <td className="bg-stone-50 px-3 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className="min-w-12 text-right font-medium text-stone-900">
                                                    {total.toFixed(2)}h
                                                </span>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    disabled={!row.task_id || total <= 0}
                                                    onClick={() => saveDraftRow(row)}
                                                >
                                                    Save
                                                </Button>
                                                <button
                                                    type="button"
                                                    aria-label="Remove draft row"
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-stone-400 hover:bg-rose-50 hover:text-rose-700"
                                                    onClick={() => removeDraftRow(row.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-stone-50 font-medium text-stone-900">
                                <td className="sticky left-0 bg-stone-50 px-4 py-3">Daily total</td>
                                {days.map((day) => (
                                    <td key={day} className="px-3 py-3 text-right">{timesheet.totals.days[day].toFixed(2)}h</td>
                                ))}
                                <td className="px-3 py-3 text-right">{timesheet.totals.total_hours.toFixed(2)}h</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </AppPage>
    );
}
