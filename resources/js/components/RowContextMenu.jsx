import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

export function RowContextMenu({ anchor, actions, open, onOpenChange }) {
    const menuActions = useMemo(() => actions.filter((action) => action?.label), [actions]);
    const [expandedActionId, setExpandedActionId] = useState(null);

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

    useEffect(() => {
        if (!open) {
            setExpandedActionId(null);
        }
    }, [open]);

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
                {menuActions.map((action) => {
                    const hasChildren = action.children?.length > 0;

                    return (
                        <div
                            className="relative"
                            key={action.id}
                            onMouseEnter={() => setExpandedActionId(hasChildren ? action.id : null)}
                        >
                            <button
                                type="button"
                                role="menuitem"
                                aria-haspopup={hasChildren ? "menu" : undefined}
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

                                    if (hasChildren) {
                                        setExpandedActionId(action.id);
                                        return;
                                    }

                                    await action.onSelect?.();
                                    onOpenChange(false);
                                }}
                            >
                                <span className="min-w-0 flex-1 truncate">{action.label}</span>
                                {hasChildren ? <span aria-hidden="true" className="ml-3 text-stone-400">›</span> : null}
                            </button>
                            {hasChildren && expandedActionId === action.id ? (
                                <div
                                    role="menu"
                                    aria-label={action.label}
                                    className="absolute left-full top-0 ml-1 min-w-[12rem] rounded-[6px] border border-stone-200 bg-white p-1.5 shadow-xl shadow-stone-200/70"
                                >
                                    {action.children.map((child) => (
                                        <button
                                            key={child.id}
                                            type="button"
                                            role="menuitem"
                                            className="flex w-full items-center rounded-[4px] px-3 py-2 text-left text-sm text-stone-700 outline-none transition hover:bg-stone-100 focus:bg-stone-100"
                                            onClick={async (event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                await child.onSelect?.();
                                                onOpenChange(false);
                                            }}
                                        >
                                            {child.label}
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>,
        document.body,
    );
}
