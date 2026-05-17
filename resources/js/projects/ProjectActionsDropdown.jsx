import { router } from '@inertiajs/react';
import { MoreHorizontal } from 'lucide-react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toAppPath } from '@/lib/url';
import { cn } from '@/lib/utils';

export function ProjectActionsDropdown({ align = 'end', className, disabled = false, onAction, project }) {
    const statusAction = project.is_active ? 'archive' : 'unarchive';
    const isTemplate = Boolean(project.is_template);

    function visit(url) {
        router.visit(toAppPath(url));
    }

    function selectAction(action) {
        if (disabled) {
            return;
        }

        onAction?.(action, project);
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label={`More actions for ${project.name}`}
                    title="More actions"
                    disabled={disabled}
                    className={cn(
                        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent text-stone-500 transition hover:bg-stone-100 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 disabled:pointer-events-none disabled:opacity-50',
                        className,
                    )}
                    onClick={(event) => event.stopPropagation()}
                >
                    <MoreHorizontal className="h-4 w-4" strokeWidth={2.4} />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} className="z-[260]" onClick={(event) => event.stopPropagation()}>
                {!isTemplate ? (
                    <DropdownMenuItem onSelect={() => visit(project.timeline_url)}>
                        Open timeline
                    </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onSelect={() => visit(project.edit_url)}>
                    {isTemplate ? 'Edit template' : 'Edit project'}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => selectAction('duplicate')}>
                    Duplicate
                </DropdownMenuItem>
                {!isTemplate ? (
                    <DropdownMenuItem onSelect={() => selectAction('save-as-template')}>
                        Save as template
                    </DropdownMenuItem>
                ) : null}
                {!isTemplate ? (
                    <DropdownMenuItem onSelect={() => selectAction(statusAction)}>
                        {project.is_active ? 'Archive' : 'Unarchive'}
                    </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                    className="text-red-700 focus:bg-red-50 focus:text-red-700"
                    onSelect={() => selectAction('delete')}
                >
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
