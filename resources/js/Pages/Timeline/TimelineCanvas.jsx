import React, { useState } from 'react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { cn } from '../../lib/utils';
import { formatDate, resolveTodayLineLeft } from './utils';

const USER_ASSIGNEE_COLORS = [
    { backgroundColor: '#dbeafe', borderColor: '#bfdbfe', color: '#1d4ed8' },
    { backgroundColor: '#dcfce7', borderColor: '#bbf7d0', color: '#15803d' },
    { backgroundColor: '#fae8ff', borderColor: '#f5d0fe', color: '#a21caf' },
    { backgroundColor: '#fef3c7', borderColor: '#fde68a', color: '#b45309' },
    { backgroundColor: '#fee2e2', borderColor: '#fecaca', color: '#b91c1c' },
    { backgroundColor: '#e0f2fe', borderColor: '#bae6fd', color: '#0369a1' },
];

const LABEL_CHAR_WIDTH = 7.2;
const LABEL_INSIDE_PADDING = 18;

export function TimelineCanvas({
    assigneeOptions,
    bars,
    compressedBreaks,
    days,
    dependencyDragState,
    dimensions,
    hoveredTaskId,
    months,
    onTaskAssigneeChange,
    onHoverTaskChange,
    onOpenProjectModal,
    onStartDrag,
    onTaskClick,
    rows,
    timelineWidth,
}) {
    const { barHeight, columnWidth, rowHeight } = dimensions;
    const hoveredBar = bars.find((bar) => bar.item.id === hoveredTaskId) ?? null;
    const weekendBands = buildWeekendBands(days, columnWidth);
    const todayDate = formatDate(new Date());
    const todayLineLeft = resolveTodayLineLeft(todayDate, days, compressedBreaks, columnWidth);
    const [scrollLeft, setScrollLeft] = useState(0);

    return (
        <div className="timeline-canvas-frame min-h-full min-w-0 flex-1 px-0 py-0">
            <div className="timeline-header">
                <div
                    className="timeline-header-track"
                    style={{ width: `${timelineWidth}px`, transform: `translateX(-${scrollLeft}px)` }}
                >
                    <div className="timeline-months">
                        {months.map((month) => (
                            <div key={month.key} className="timeline-month" style={{ left: `${month.left}px`, width: `${month.width}px` }}>
                                <div className="timeline-month-label">
                                    {month.label}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="timeline-days">
                        {hoveredBar && (
                            <div
                                className="timeline-hover-day-range"
                                style={{ left: `${hoveredBar.left}px`, width: `${hoveredBar.width}px` }}
                            />
                        )}
                        {compressedBreaks.map((breakpoint) => (
                            <div
                                key={`${breakpoint.after}-${breakpoint.before}-header-break`}
                                className="timeline-compressed-break"
                                style={{ left: `${breakpoint.left}px`, height: '100%' }}
                            />
                        ))}
                        {days.map((day) => (
                            <div
                                key={day.date}
                                className={cn('timeline-day', day.date === todayDate && 'timeline-day-today')}
                                data-today={day.date === todayDate ? 'true' : undefined}
                                style={{ left: `${day.left}px`, width: `${columnWidth}px` }}
                            >
                                {day.label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div
                className="timeline-horizontal-scroll min-w-0 flex-1 overflow-x-auto overflow-y-visible"
                onScroll={(event) => setScrollLeft(event.currentTarget.scrollLeft)}
            >
                <div className="timeline-canvas w-max min-w-full">
                <div className="timeline-body" style={{ height: `${rows.length * rowHeight}px`, width: `${timelineWidth}px` }}>
                    {hoveredBar && (
                        <div
                            className="timeline-hover-row-range"
                            style={{ top: `${hoveredBar.rowIndex * rowHeight}px`, height: `${rowHeight}px`, width: `${timelineWidth}px` }}
                        />
                    )}
                    <div className="timeline-grid">
                        {todayLineLeft !== null && (
                            <div
                                aria-label={`Today: ${todayDate}`}
                                className="timeline-today-line"
                                style={{ left: `${todayLineLeft}px`, height: `${rows.length * rowHeight}px` }}
                            ></div>
                        )}
                        {weekendBands.map((band) => (
                            <div
                                key={`${band.start}-weekend-band`}
                                className="timeline-weekend-band"
                                style={{ left: `${band.left}px`, width: `${band.width}px`, height: `${rows.length * rowHeight}px` }}
                            />
                        ))}
                        {compressedBreaks.map((breakpoint) => (
                            <div
                                key={`${breakpoint.after}-${breakpoint.before}-grid-break`}
                                className="timeline-compressed-break timeline-compressed-break-grid"
                                style={{ left: `${breakpoint.left}px`, height: `${rows.length * rowHeight}px` }}
                            />
                        ))}
                        {days.map((day) => (
                            <div
                                key={`${day.date}-grid`}
                                className="timeline-grid-col"
                                style={{ left: `${day.left}px`, width: `${columnWidth}px`, height: `${rows.length * rowHeight}px` }}
                            />
                        ))}
                        {rows.map((row, index) => (
                            <div
                                key={`${row.key}-line-${index}`}
                                className={cn(
                                    'timeline-grid-row',
                                    row.kind === 'project' && 'timeline-grid-row-project',
                                    row.kind === 'group' && 'timeline-grid-row-group',
                                )}
                                style={{ top: `${index * rowHeight}px`, height: `${rowHeight}px`, width: `${timelineWidth}px` }}
                            />
                        ))}
                    </div>

                    <div className="timeline-bars">
                        {bars.map((bar) => (
                            (() => {
                                const item = bar.item;
                                const labelOutside = bar.width < (bar.name.length * LABEL_CHAR_WIDTH) + LABEL_INSIDE_PADDING;
                                const isGroup = bar.kind === 'group';

                                return (
                                    <React.Fragment key={bar.id}>
                                        {!isGroup && (
                                            <TaskAssigneeMenu
                                                assigneeOptions={assigneeOptions}
                                                bar={bar}
                                                dimensions={dimensions}
                                                onChange={onTaskAssigneeChange}
                                            />
                                        )}
                                        <div
                                            className={cn(
                                                'timeline-bar',
                                                hoveredBar?.id === bar.id && 'timeline-bar-hovered',
                                                !isGroup && bar.completed && 'timeline-bar-complete',
                                                bar.has_children ? 'timeline-bar-parent' : 'timeline-bar-leaf',
                                                isGroup && 'timeline-bar-group',
                                            )}
                                            data-task-bar-id={isGroup ? undefined : bar.id}
                                            style={{ left: `${bar.left}px`, top: `${bar.top}px`, width: `${bar.width}px`, height: `${barHeight}px` }}
                                            onPointerEnter={() => onHoverTaskChange(item.id)}
                                            onPointerLeave={() => onHoverTaskChange(null)}
                                            onPointerDown={(event) => {
                                                onStartDrag(event, item, 'move');
                                            }}
                                            onClick={() => onTaskClick(item)}
                                        >
                                            {!isGroup && (
                                                <button type="button" className="timeline-bar-handle timeline-bar-handle-left" onPointerDown={(event) => { event.stopPropagation(); onStartDrag(event, item, 'resize_left'); }} />
                                            )}
                                            <div className={cn('timeline-bar-label', isGroup && 'timeline-group-bar-label', labelOutside && 'timeline-bar-label-outside')}>
                                                {bar.name}
                                            </div>
                                            {!isGroup && (
                                                <button type="button" className="timeline-bar-handle timeline-bar-handle-right" onPointerDown={(event) => { event.stopPropagation(); onStartDrag(event, item, 'resize_right'); }} />
                                            )}
                                        </div>
                                    </React.Fragment>
                                );
                            })()
                        ))}
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
}

function buildWeekendBands(days, columnWidth) {
    const bands = [];
    let current = null;

    for (const day of days) {
        if (!day.isWeekend) {
            current = null;
            continue;
        }

        if (!current || current.left + current.width !== day.left) {
            current = {
                start: day.date,
                left: day.left,
                width: columnWidth,
            };
            bands.push(current);
            continue;
        }

        current.width += columnWidth;
    }

    return bands;
}

function assigneeOptionForTask(task, assigneeOptions) {
    const normalizedAssigneeUserId = task.assignee_user_id === null || task.assignee_user_id === undefined
        ? null
        : String(task.assignee_user_id);

    return (
        assigneeOptions.find((option) => {
            if (task.assignee_user_id !== null && task.assignee_user_id !== undefined) {
                return (
                    option.type === 'user'
                    && option.user_id !== null
                    && option.user_id !== undefined
                    && String(option.user_id) === normalizedAssigneeUserId
                );
            }

            return option.type === null;
        }) ?? assigneeOptions[0]
    );
}

function assigneeBadgeStyle(option) {
    if (!option || option.type === null) {
        return {
            backgroundColor: '#ffffff',
            borderColor: '#d6d3d1',
            color: 'transparent',
        };
    }

    const index = Number(option.user_id ?? 0) % USER_ASSIGNEE_COLORS.length;

    return USER_ASSIGNEE_COLORS[index];
}

function assigneeInitial(option) {
    if (!option || option.type === null) {
        return '';
    }

    return (option.label ?? '?').trim().slice(0, 1).toUpperCase();
}

function TaskAssigneeMenu({ assigneeOptions, bar, dimensions, onChange }) {
    const currentOption = assigneeOptionForTask(bar.item, assigneeOptions);
    const isAssigned = currentOption?.type !== null;
    const badgeSize = isAssigned ? dimensions.assigneeBadgeSize : dimensions.unassignedBadgeSize;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'absolute z-[15] inline-flex items-center justify-center rounded-full border shadow-sm outline-none transition hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-stone-300/80',
                        isAssigned ? 'text-[10px] font-semibold' : '',
                    )}
                    style={{
                        ...assigneeBadgeStyle(currentOption),
                        height: `${badgeSize}px`,
                        left: `${Math.max(bar.left - (isAssigned ? badgeSize + 8 : badgeSize + 6), 8)}px`,
                        top: `${bar.top + (dimensions.barHeight - badgeSize) / 2}px`,
                        width: `${badgeSize}px`,
                    }}
                    data-task-bar-id={bar.id}
                    title={currentOption?.label ?? 'Unassigned'}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                >
                    {assigneeInitial(currentOption)}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="z-[260] min-w-[180px]">
                {assigneeOptions.map((option) => (
                    <DropdownMenuItem
                        key={`${option.type ?? 'none'}-${option.user_id ?? 'none'}`}
                        className="gap-2"
                            onSelect={() => onChange(bar.item, option.user_id ?? '')}
                        >
                        <span
                            className={cn(
                                'inline-flex shrink-0 items-center justify-center rounded-full border font-semibold',
                                option.type === null ? 'h-4 w-4 text-[0]' : 'h-6 w-6 text-[10px]',
                            )}
                            style={assigneeBadgeStyle(option)}
                        >
                            {assigneeInitial(option)}
                        </span>
                        <span className="truncate">{option.label}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
