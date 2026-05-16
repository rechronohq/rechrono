import { ChevronDown, ChevronUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function SortableHeader({ column, children, align = 'left' }) {
    const direction = column.getIsSorted();

    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
                '-ml-3 h-8 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-stone-500 hover:bg-stone-100 hover:text-stone-900',
                align === 'right' && 'ml-auto',
            )}
            onClick={() => column.toggleSorting(direction === 'asc')}
        >
            <span>{children}</span>
            {direction === 'asc' ? <ChevronUp className="ml-1 h-3.5 w-3.5" /> : null}
            {direction === 'desc' ? <ChevronDown className="ml-1 h-3.5 w-3.5" /> : null}
        </Button>
    );
}
