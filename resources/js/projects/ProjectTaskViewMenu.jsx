import { ChevronDown } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function ProjectTaskViewMenu({
    filterOptions,
    grouping,
    onFilterChange,
    onGroupingChange,
    taskFilter,
}) {
    const activeFilter = filterOptions.find((option) => option.value === taskFilter) ?? filterOptions[0];
    const groupingLabel = grouping === 'group' ? 'Group' : 'Person';
    const triggerLabel = `${groupingLabel} · ${activeFilter?.label ?? 'All'} (${activeFilter?.count ?? 0})`;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    data-testid="project-task-view-menu-trigger"
                    className={cn(
                        buttonVariants({ variant: 'outline', size: 'sm' }),
                        'h-10 shrink-0 gap-2 px-3 font-medium text-stone-700',
                    )}
                >
                    <span className="truncate">{triggerLabel}</span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden="true" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="z-[220] w-72 p-0"
                data-testid="project-task-view-menu"
            >
                <div className="p-3">
                    <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                        Group by
                    </div>
                    <div
                        className="projects-detail-task-toggle mt-2 w-full"
                        role="group"
                        aria-label="Group tasks by"
                    >
                        <button
                            type="button"
                            aria-pressed={grouping === 'person'}
                            onClick={() => onGroupingChange('person')}
                        >
                            Person
                        </button>
                        <button
                            type="button"
                            aria-pressed={grouping === 'group'}
                            onClick={() => onGroupingChange('group')}
                        >
                            Group
                        </button>
                    </div>
                </div>

                <div className="border-t border-stone-200/80 p-3">
                    <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                        Filter
                    </div>
                    <div className="mt-2 space-y-1" role="menu" aria-label="Task filter">
                        {filterOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                role="menuitemradio"
                                aria-checked={taskFilter === option.value}
                                className={cn(
                                    'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition',
                                    taskFilter === option.value
                                        ? 'bg-blue-50 font-medium text-blue-700'
                                        : 'text-stone-700 hover:bg-stone-50 hover:text-stone-950',
                                )}
                                onClick={() => onFilterChange(option.value)}
                            >
                                <span>{option.label}</span>
                                <span className={taskFilter === option.value ? 'text-blue-600' : 'text-stone-400'}>
                                    {option.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
