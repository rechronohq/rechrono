import { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { dayUrl, formatDateRange, formatNavigatorDate, formatNavigatorMonth, weekUrlForDate } from './time';

function initialMonthDate(timesheet, isWeekView) {
    return new Date(`${isWeekView ? timesheet.week_start : timesheet.selected_date}T00:00:00`);
}

function addMonths(date, amount) {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function addDays(date, amount) {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);

    return next;
}

function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function weekStartForDate(date) {
    const day = date.getDay();
    const mondayOffset = (day + 6) % 7;

    return addDays(date, -mondayOffset);
}

function calendarDays(monthDate) {
    const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const start = addDays(firstOfMonth, -firstOfMonth.getDay());

    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function sameWeek(date, weekStart) {
    const start = new Date(`${weekStart}T00:00:00`);
    const end = addDays(start, 6);

    return date >= start && date <= end;
}

export function DateNavigator({ isWeekView, timesheet }) {
    const [open, setOpen] = useState(false);
    const [monthDate, setMonthDate] = useState(() => initialMonthDate(timesheet, isWeekView));
    const monthDays = useMemo(() => calendarDays(monthDate), [monthDate]);
    const currentWeekStart = dateKey(weekStartForDate(new Date(`${timesheet.current_date}T00:00:00`)));
    const selectedLabel = isWeekView
        ? `${timesheet.week_start === currentWeekStart ? 'This week ' : ''}${formatDateRange(timesheet.week_start)}`
        : `${timesheet.selected_date === timesheet.current_date ? 'Today ' : ''}${formatNavigatorDate(timesheet.selected_date)}`;
    const returnUrl = isWeekView ? timesheet.this_week_url : timesheet.today_url;
    const shouldShowReturnLink = isWeekView
        ? timesheet.week_start !== currentWeekStart
        : timesheet.selected_date !== timesheet.current_date;

    useEffect(() => {
        setMonthDate(initialMonthDate(timesheet, isWeekView));
    }, [isWeekView, timesheet.selected_date, timesheet.week_start]);

    function visitDate(date) {
        const key = dateKey(date);
        const url = isWeekView ? weekUrlForDate(timesheet.week_url, key) : dayUrl(timesheet.day_url, key);

        setOpen(false);
        router.visit(url);
    }

    return (
        <div className="flex flex-wrap items-center gap-3">
            <div role="group" aria-label={isWeekView ? 'Week navigation' : 'Day navigation'} className="inline-flex overflow-hidden rounded-[7px] border border-stone-300 bg-white shadow-sm">
                <button
                    type="button"
                    aria-label={isWeekView ? 'Previous week' : 'Previous day'}
                    className="flex h-10 w-10 items-center justify-center text-stone-600 transition hover:bg-stone-50 hover:text-stone-950"
                    onClick={() => router.visit(isWeekView ? timesheet.previous_week_url : timesheet.previous_day_url)}
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            className="flex h-10 min-w-[230px] items-center justify-center gap-2 border-x border-stone-300 px-4 text-base font-medium text-stone-900 transition hover:bg-stone-50"
                        >
                            <CalendarDays className="h-4 w-4 text-stone-600" />
                            <span>{selectedLabel}</span>
                        </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="z-[260] w-[min(360px,calc(100vw-2rem))] p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <button
                                type="button"
                                aria-label="Previous month"
                                className="flex h-8 w-8 items-center justify-center rounded-md text-stone-700 hover:bg-stone-100"
                                onClick={() => setMonthDate((current) => addMonths(current, -1))}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <div className="text-base font-semibold text-stone-950">{formatNavigatorMonth(monthDate)}</div>
                            <button
                                type="button"
                                aria-label="Next month"
                                className="flex h-8 w-8 items-center justify-center rounded-md text-stone-700 hover:bg-stone-100"
                                onClick={() => setMonthDate((current) => addMonths(current, 1))}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="grid grid-cols-7 border-b border-stone-200 pb-2 text-center text-xs font-semibold text-stone-900">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                                <div key={day}>{day}</div>
                            ))}
                        </div>
                        <div className="mt-2 grid grid-cols-7 gap-1">
                            {monthDays.map((date) => {
                                const key = dateKey(date);
                                const isCurrentMonth = date.getMonth() === monthDate.getMonth();
                                const isToday = key === timesheet.current_date;
                                const isSelected = isWeekView ? sameWeek(date, timesheet.week_start) : key === timesheet.selected_date;

                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        aria-current={isToday ? 'date' : undefined}
                                        aria-label={formatNavigatorDate(key)}
                                        className={cn(
                                            'flex h-8 items-center justify-center rounded-[6px] text-sm font-medium tabular-nums transition hover:bg-stone-100',
                                            isCurrentMonth ? 'text-stone-950' : 'text-stone-400',
                                            isSelected && 'bg-orange-50 text-stone-950 ring-1 ring-stone-900 hover:bg-orange-50',
                                            isToday && !isSelected && 'font-semibold text-blue-700',
                                        )}
                                        onClick={() => visitDate(date)}
                                    >
                                        {date.getDate()}
                                    </button>
                                );
                            })}
                        </div>
                    </PopoverContent>
                </Popover>
                <button
                    type="button"
                    aria-label={isWeekView ? 'Next week' : 'Next day'}
                    className="flex h-10 w-10 items-center justify-center text-stone-600 transition hover:bg-stone-50 hover:text-stone-950"
                    onClick={() => router.visit(isWeekView ? timesheet.next_week_url : timesheet.next_day_url)}
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
            {shouldShowReturnLink ? (
                <button
                    type="button"
                    className="text-sm font-medium text-blue-700 underline underline-offset-2 hover:text-blue-800"
                    onClick={() => router.visit(returnUrl)}
                >
                    {isWeekView ? 'Return to this week' : 'Return to today'}
                </button>
            ) : null}
        </div>
    );
}
