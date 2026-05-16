import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export default function AppBreadcrumb({ items = [] }) {
    if (items.length === 0) {
        return null;
    }

    return (
        <div className="flex min-w-0 items-center gap-3" data-testid="app-context-breadcrumb">
            <span aria-hidden="true" className="h-4 w-px bg-stone-200" />
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-[13px] text-stone-500">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;

                    return (
                        <div key={`${item.label}-${item.href ?? 'current'}`} className="flex min-w-0 items-center gap-1">
                            {index > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-stone-300" />}
                            {item.href && !isLast ? (
                                <Link
                                    href={item.href}
                                    className={cn(
                                        'max-w-[220px] truncate rounded-md px-1.5 py-0.5 transition hover:bg-stone-100 hover:text-stone-900',
                                    )}
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <span className="max-w-[220px] truncate rounded-md px-1.5 py-0.5 font-medium text-stone-900">
                                    {item.label}
                                </span>
                            )}
                        </div>
                    );
                })}
            </nav>
        </div>
    );
}
