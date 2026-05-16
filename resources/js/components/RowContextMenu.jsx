import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

export function RowContextMenu({ anchor, actions, open, onOpenChange }) {
    const menuActions = useMemo(() => actions.filter((action) => action?.label), [actions]);

    useEffect(() => {
        if (!open) {
            return;
        }

        function onKeyDown(event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                onOpenChange(false);
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [open, onOpenChange]);

    if (!open || !anchor || !menuActions.length || typeof document === 'undefined') {
        return null;
    }

    const estimatedWidth = 232;
    const estimatedHeight = menuActions.length * 36 + 8;
    const left = Math.max(8, Math.min(anchor.x, window.innerWidth - estimatedWidth - 8));
    const top = Math.max(8, Math.min(anchor.y, window.innerHeight - estimatedHeight - 8));

    return createPortal(
        <div className="fixed inset-0 z-[260]">
            <button
                type="button"
                aria-label="Close row actions"
                className="absolute inset-0 cursor-default bg-transparent"
                onMouseDown={() => onOpenChange(false)}
                onContextMenu={(event) => {
                    event.preventDefault();
                    onOpenChange(false);
                }}
            />

            <div
                role="menu"
                aria-label="Row actions"
                className="fixed min-w-[14rem] rounded-[6px] border border-stone-200 bg-white p-1.5 shadow-xl shadow-stone-200/70"
                style={{ left: `${left}px`, top: `${top}px` }}
                onMouseDown={(event) => event.stopPropagation()}
                onContextMenu={(event) => event.preventDefault()}
            >
                {menuActions.map((action) => (
                    <button
                        key={action.id}
                        type="button"
                        role="menuitem"
                        className={cn(
                            'flex w-full items-center rounded-[4px] px-3 py-2 text-left text-sm outline-none transition',
                            action.tone === 'destructive'
                                ? 'text-red-700 hover:bg-red-50 focus:bg-red-50'
                                : 'text-stone-700 hover:bg-stone-100 focus:bg-stone-100',
                        )}
                        onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                        }}
                        onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                        }}
                        onClick={async (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            await action.onSelect?.();
                            onOpenChange(false);
                        }}
                    >
                        <span className="min-w-0 truncate">{action.label}</span>
                    </button>
                ))}
            </div>
        </div>,
        document.body,
    );
}
