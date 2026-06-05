import { Head } from '@inertiajs/react';

import { AppSidebar } from '@/Layouts/AppSidebar';

export default function AppShell({
    title,
    activeApp,
    activePrimaryApp,
    activePrimaryLabel,
    groups = [],
    utilityApps = [],
    localNavigation = [],
    contextBar = null,
    appToolbar = null,
    secondarySidebar = null,
    children,
}) {
    const resolvedContextBar = contextBar ?? appToolbar;

    return (
        <>
            <Head title={title} />
            <div data-testid="app-shell" className="app-shell">
                <div className="app-shell-frame" data-testid="app-shell-frame">
                    <AppSidebar
                        activeApp={activeApp}
                        activePrimaryApp={activePrimaryApp}
                        activePrimaryLabel={activePrimaryLabel}
                        groups={groups}
                        utilityApps={utilityApps}
                        localNavigation={localNavigation}
                    />

                    <main className="app-shell-main" data-testid="app-shell-main">
                        <div className="app-shell-content" data-testid="app-shell-content">
                            {resolvedContextBar ? <div className="app-shell-command-row">{resolvedContextBar}</div> : null}
                            <div className="app-shell-body" data-testid="app-shell-body">
                                {secondarySidebar ? (
                                    <div className="app-shell-secondary-sidebar" data-testid="app-shell-secondary-sidebar">
                                        {secondarySidebar}
                                    </div>
                                ) : null}
                                <div className="app-shell-page">{children}</div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
}
