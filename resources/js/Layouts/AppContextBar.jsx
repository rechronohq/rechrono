import React from 'react';

import { cn } from '@/lib/utils';

export default function AppContextBar({ title, context = null, actions = null, container = null }) {
    if (title == null) {
        throw new Error('AppContextBar requires a title.');
    }

    return (
        <div data-testid="app-context-bar" className="app-context-bar">
            <div className={cn('app-context-bar__inner', container && `app-context-bar__inner--${container}`)}>
                <div data-testid="app-context-bar-heading" className="app-context-bar__heading">
                    <h1 data-testid="app-context-bar-title" className="app-context-bar__title">
                        {title}
                    </h1>

                    {context ? (
                        <div data-testid="app-context-bar-context" className="app-context-bar__context">
                            {context}
                        </div>
                    ) : null}
                </div>

                {actions ? (
                    <div data-testid="app-context-bar-actions" className="app-context-bar__actions">
                        {actions}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
