import * as React from 'react';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center whitespace-nowrap rounded-[6px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300/80 disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                default: 'bg-blue-600 text-white shadow-sm hover:bg-blue-500 focus-visible:ring-blue-200',
                outline: 'border border-stone-200 bg-white text-stone-700 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700',
                ghost: 'text-stone-600 hover:bg-stone-100 hover:text-stone-950',
                subtle: 'bg-stone-100 text-stone-700 hover:bg-stone-200',
            },
            size: {
                default: 'h-10 px-4 py-2',
                sm: 'h-9 px-3 text-sm',
                icon: 'h-9 w-9 rounded-[6px]',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => (
    <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
    />
));

Button.displayName = 'Button';

export { Button, buttonVariants };
