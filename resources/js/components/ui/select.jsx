import * as React from 'react';

import { cn } from '@/lib/utils';

const Select = React.forwardRef(({ className, ...props }, ref) => (
    <select
        ref={ref}
        className={cn(
            'flex h-10 w-full rounded-[6px] border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-stone-300/80 disabled:cursor-not-allowed disabled:opacity-50',
            className,
        )}
        {...props}
    />
));

Select.displayName = 'Select';

export { Select };
