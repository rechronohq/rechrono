import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import React from 'react';

import { cn } from '../../lib/utils';

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuContent = React.forwardRef(({ className, sideOffset = 8, align = 'end', ...props }, ref) => (
    <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
            ref={ref}
            sideOffset={sideOffset}
            align={align}
            className={cn(
                'relative z-[220] min-w-[12rem] rounded-[6px] border border-stone-200 bg-white p-1.5 shadow-xl shadow-stone-200/70',
                className,
            )}
            {...props}
        />
    </DropdownMenuPrimitive.Portal>
));

const DropdownMenuItem = React.forwardRef(({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.Item
        ref={ref}
        className={cn(
            'relative flex cursor-default select-none items-center rounded-[4px] px-3 py-2 text-sm text-stone-700 outline-none transition focus:bg-stone-100 focus:text-stone-950 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
            className,
        )}
        {...props}
    />
));

const DropdownMenuSubTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
    <DropdownMenuPrimitive.SubTrigger
        ref={ref}
        className={cn(
            'relative flex cursor-default select-none items-center rounded-[4px] px-3 py-2 text-sm text-stone-700 outline-none transition focus:bg-stone-100 focus:text-stone-950 data-[state=open]:bg-stone-100',
            className,
        )}
        {...props}
    >
        <span className="min-w-0 flex-1 truncate">{children}</span>
        <span aria-hidden="true" className="ml-3 text-stone-400">›</span>
    </DropdownMenuPrimitive.SubTrigger>
));

const DropdownMenuSubContent = React.forwardRef(({ className, sideOffset = 0, ...props }, ref) => (
    <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.SubContent
            ref={ref}
            sideOffset={sideOffset}
            className={cn(
                'relative z-[230] min-w-[12rem] rounded-[6px] border border-stone-200 bg-white p-1.5 shadow-xl shadow-stone-200/70',
                className,
            )}
            {...props}
        />
    </DropdownMenuPrimitive.Portal>
));

DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
};
