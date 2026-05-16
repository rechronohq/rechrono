import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = React.forwardRef(({ className, type = 'text', ...props }, ref) => (
    <input
        type={type}
        className={cn(
            'flex h-10 w-full rounded-[6px] border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus-visible:ring-2 focus-visible:ring-stone-300/80 disabled:cursor-not-allowed disabled:opacity-50',
            className,
        )}
        ref={ref}
        {...props}
    />
));

Input.displayName = 'Input';

export { Input };
