import { router } from '@inertiajs/react';

import { dayUrl, formatDay, formatWeekHours } from './time';

export function WeekView({ days, rows, timesheet }) {
    return (
        <div className="min-h-0 flex-1 overflow-auto border-t border-stone-200">
            <table className="min-w-[980px] w-full border-separate border-spacing-0 text-sm">
                <caption className="sr-only">Weekly timesheet totals by task and day</caption>
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
                                        aria-label={`View ${formatDay(day)} entries for ${row.task_name}: ${formatWeekHours(row.entries[day]?.hours ?? 0)} hours`}
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
