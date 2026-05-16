import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

function Dialog(props) {
    return <DialogPrimitive.Root {...props} />;
}

function DialogTrigger(props) {
    return <DialogPrimitive.Trigger {...props} />;
}

function DialogPortal(props) {
    return <DialogPrimitive.Portal {...props} />;
}

function DialogClose(props) {
    return <DialogPrimitive.Close {...props} />;
}

function DialogOverlay({ className, ...props }) {
    return (
        <DialogPrimitive.Overlay
            className={cn('fixed inset-0 z-[280] bg-stone-950/20 backdrop-blur-[1px]', className)}
            {...props}
        />
    );
}

function DialogContent({ className, children, hideClose = false, ...props }) {
    return (
        <DialogPortal>
            <DialogOverlay />
            <DialogPrimitive.Content
                className={cn(
                    'fixed left-1/2 top-1/2 z-[290] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[8px] border border-stone-200 bg-white p-6 shadow-2xl',
                    className,
                )}
                {...props}
            >
                {children}
                {!hideClose ? (
                    <DialogPrimitive.Close className="absolute right-4 top-4 rounded-[4px] p-1 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>
                ) : null}
            </DialogPrimitive.Content>
        </DialogPortal>
    );
}

function DialogHeader({ className, ...props }) {
    return <div className={cn('flex flex-col space-y-2 text-left', className)} {...props} />;
}

function DialogTitle({ className, ...props }) {
    return <DialogPrimitive.Title className={cn('text-xl font-semibold tracking-[-0.03em] text-stone-950', className)} {...props} />;
}

function DialogDescription({ className, ...props }) {
    return <DialogPrimitive.Description className={cn('text-sm text-stone-500', className)} {...props} />;
}

function DialogFooter({ className, ...props }) {
    return <div className={cn('flex items-center justify-end gap-2', className)} {...props} />;
}

export {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
};
