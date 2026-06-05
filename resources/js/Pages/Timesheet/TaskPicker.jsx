import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function TaskPicker({ tasks, value, onChange }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const selectedTask = tasks.find((task) => task.id === value);
    const selectedLabel = selectedTask ? `${selectedTask.project_name ?? 'No project'} · ${selectedTask.name}` : 'Select a task';
    const groupedTasks = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        const filteredTasks = normalizedQuery
            ? tasks.filter((task) => `${task.project_name} ${task.name}`.toLowerCase().includes(normalizedQuery))
            : tasks;

        return filteredTasks.reduce((groups, task) => {
            const projectName = task.project_name ?? 'No project';
            const group = groups.find((item) => item.projectName === projectName);

            if (group) {
                group.tasks.push(task);
            } else {
                groups.push({ projectName, tasks: [task] });
            }

            return groups;
        }, []);
    }, [query, tasks]);

    function chooseTask(taskId) {
        onChange(taskId);
        setOpen(false);
        setQuery('');
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label={`Task: ${selectedLabel}`}
                    aria-expanded={open}
                    className="flex h-10 w-full items-center justify-between gap-3 rounded-md border border-stone-200 bg-white px-3 text-left text-sm shadow-sm transition hover:border-stone-300"
                >
                    <span className="flex min-w-0 items-center gap-2">
                        {selectedTask?.project_name ? (
                            <span className="max-w-[65%] shrink-0 truncate rounded-[4px] bg-stone-100 px-1.5 py-0.5 text-xs font-medium text-stone-500">
                                {selectedTask.project_name}
                            </span>
                        ) : null}
                        <span className="truncate font-medium text-stone-950">
                            {selectedTask?.name ?? 'Select a task'}
                        </span>
                    </span>
                    <ChevronRight className={cn('h-4 w-4 shrink-0 text-stone-400 transition', open && 'rotate-90')} />
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="z-[260] w-[min(520px,calc(100vw-2rem))] p-2">
                <Input
                    autoFocus
                    aria-label="Search tasks"
                    value={query}
                    placeholder="Search tasks"
                    onChange={(event) => setQuery(event.target.value)}
                />
                <div className="mt-2 max-h-72 overflow-auto">
                    {groupedTasks.length > 0 ? groupedTasks.map((group) => (
                        <div key={group.projectName} className="py-1">
                            <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400">
                                {group.projectName}
                            </div>
                            <div className="space-y-1">
                                {group.tasks.map((task) => (
                                    <button
                                        key={task.id}
                                        type="button"
                                        className={cn(
                                            'flex w-full items-center justify-between gap-3 rounded-[4px] px-2 py-2 text-left text-sm transition hover:bg-stone-50',
                                            task.id === value && 'bg-blue-50 text-blue-700 hover:bg-blue-50',
                                        )}
                                        onClick={() => chooseTask(task.id)}
                                    >
                                        <span className="truncate font-medium">{task.name}</span>
                                        {task.last_tracked_at ? (
                                            <span className="shrink-0 text-xs text-stone-400">Recent</span>
                                        ) : null}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )) : (
                        <div className="px-3 py-6 text-center text-sm text-stone-500">No matching tasks.</div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
