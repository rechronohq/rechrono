import { useEffect, useRef, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { ChevronDown, LogOut, MoreHorizontal, Settings, UserCircle2 } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { request } from '@/lib/request';
import { cn } from '@/lib/utils';

export function AppSidebar({ groups, localNavigation, activeApp, activePrimaryApp, activePrimaryLabel }) {
    const { props } = usePage();
    const { auth, routes } = props;
    const timelineViews = props.timelineViews ?? [];
    const activeTimelineViewId = props.activeTimelineViewId ?? null;
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    async function renameTimelineView(view) {
        const nextName = window.prompt('Rename saved view', view.name)?.trim();

        if (!nextName || nextName === view.name) {
            return;
        }

        await request(view.update_url, {
            method: 'PATCH',
            body: JSON.stringify({ name: nextName }),
        });

        router.reload({
            preserveScroll: true,
        });
    }

    async function deleteTimelineView(view) {
        await request(view.delete_url, {
            method: 'DELETE',
        });

        if (activeTimelineViewId === view.id) {
            router.visit(routes?.apps?.planner ?? routes?.planner ?? routes.tasks);

            return;
        }

        router.reload({
            preserveScroll: true,
        });
    }

    useEffect(() => {
        const close = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };

        window.addEventListener('pointerdown', close);

        return () => window.removeEventListener('pointerdown', close);
    }, []);

    const timelineViewsSection = timelineViews.length > 0 ? (
        <div className="mt-4 border-t border-stone-200 pt-4">
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400">
                Views
            </div>
            <div className="space-y-1">
                {timelineViews.map((view) => {
                    const isActive = activeTimelineViewId === view.id;

                    return (
                        <div
                            key={view.id}
                            className={cn(
                                'group flex items-center gap-1 rounded-md px-1.5 py-1',
                                isActive ? 'bg-stone-100' : 'hover:bg-stone-50',
                            )}
                        >
                            <Link
                                href={view.url}
                                aria-current={isActive ? 'page' : undefined}
                                className={cn(
                                    'min-w-0 flex-1 truncate rounded-[4px] px-1.5 py-1 text-sm',
                                    isActive ? 'font-medium text-stone-950' : 'text-stone-600 hover:text-stone-950',
                                )}
                            >
                                {view.name}
                            </Link>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        aria-label={`More actions for saved view ${view.name}`}
                                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] text-stone-400 opacity-0 transition hover:bg-stone-100 hover:text-stone-900 focus:opacity-100 group-hover:opacity-100"
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="z-[260]">
                                    <DropdownMenuItem onSelect={() => renameTimelineView(view)}>
                                        Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="text-red-600 focus:bg-red-50 focus:text-red-700"
                                        onSelect={() => deleteTimelineView(view)}
                                    >
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    );
                })}
            </div>
        </div>
    ) : null;

    return (
        <aside data-testid="app-shell-sidebar" className="app-shell-sidebar">
            <div data-testid="app-shell-sidebar-top" className="app-shell-sidebar-top">
                <Link href={routes?.apps?.planner ?? routes?.planner ?? routes.tasks} className="inline-flex text-[18px] font-semibold tracking-[-0.04em] text-stone-950">
                    Rechrono
                </Link>
            </div>

            <nav data-testid="app-shell-sidebar-middle" aria-label="Sidebar" className="app-shell-sidebar-middle">
                <div className="space-y-4">
                    {groups.map((group) => (
                        <div key={group.key}>
                            <div>
                                <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400">
                                    {group.label}
                                </div>
                                <div className="space-y-1">
                                    {group.items.map((app) => {
                                        const isActive = app.key === activePrimaryApp;

                                        return (
                                            <Link
                                                key={app.key}
                                                href={app.href}
                                                aria-current={isActive ? 'page' : undefined}
                                                className={cn(
                                                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition',
                                                    isActive
                                                        ? 'bg-stone-100 font-medium text-stone-950'
                                                        : 'text-stone-600 hover:bg-stone-50 hover:text-stone-950',
                                                )}
                                            >
                                                <app.icon className="h-4 w-4" />
                                                <span>{app.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>

                            {group.key === 'apps' ? timelineViewsSection : null}
                        </div>
                    ))}
                </div>

                {localNavigation.length > 0 ? (
                    <div className="mt-4 border-t border-stone-200 pt-4">
                        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400">
                            {activePrimaryLabel}
                        </div>
                        <div className="space-y-1">
                            {localNavigation.map((app) => {
                                const isActive = app.key === activeApp;

                                return (
                                    <Link
                                        key={app.key}
                                        href={app.href}
                                        aria-current={isActive ? 'page' : undefined}
                                        className={cn(
                                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition',
                                            isActive
                                                ? 'bg-stone-100 font-medium text-stone-950'
                                                : 'text-stone-600 hover:bg-stone-50 hover:text-stone-950',
                                        )}
                                    >
                                        <app.icon className="h-4 w-4" />
                                        <span>{app.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ) : null}
            </nav>

            <div data-testid="app-shell-sidebar-bottom" className="app-shell-sidebar-bottom">
                <div data-testid="app-shell-account" ref={menuRef} className="relative">
                    <button
                        type="button"
                        data-testid="app-shell-account-trigger"
                        className={cn(
                            buttonVariants({ variant: 'outline' }),
                            'w-full justify-between gap-2 px-3',
                            menuOpen && 'border-stone-300',
                        )}
                        onClick={() => setMenuOpen((value) => !value)}
                    >
                        <span className="flex min-w-0 items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[11px] font-semibold text-stone-500">
                                {(auth.user?.name ?? 'U').slice(0, 1).toUpperCase()}
                            </span>
                            <span className="min-w-0 truncate">{auth.user?.name}</span>
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-stone-400" />
                    </button>

                    {menuOpen ? (
                        <div
                            data-testid="app-shell-account-menu"
                            className="absolute bottom-[calc(100%+0.5rem)] left-[-0.75rem] right-[-0.75rem] z-[220] rounded-[6px] border border-stone-200 bg-white p-1.5 shadow-xl shadow-stone-200/70"
                        >
                            <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-50 hover:text-stone-950"
                                onClick={() => router.visit(routes.profileEdit)}
                            >
                                <UserCircle2 className="h-4 w-4" />
                                Profile
                            </button>
                            <button
                                type="button"
                                data-testid="app-shell-team-settings"
                                className="flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-50 hover:text-stone-950"
                                onClick={() => router.visit(routes.teamSettingsEdit)}
                            >
                                <Settings className="h-4 w-4" />
                                Team settings
                            </button>
                            <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-50 hover:text-stone-950"
                                onClick={() => router.post(routes.logout)}
                            >
                                <LogOut className="h-4 w-4" />
                                Log out
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </aside>
    );
}
