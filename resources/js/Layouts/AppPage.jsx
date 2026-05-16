import { usePage } from '@inertiajs/react';

import { getAppChrome } from '@/apps';
import AppContextBar from '@/Layouts/AppContextBar';
import AppShell from '@/Layouts/AppShell';

export default function AppPage({
    title,
    activeApp,
    contextBar = null,
    context = null,
    actions = null,
    container = null,
    secondarySidebar = null,
    children,
}) {
    const { props } = usePage();
    const sharedRoutes = props.routes ?? {};
    const appChrome = getAppChrome(sharedRoutes, props.auth?.user, activeApp);

    return (
        <AppShell
            title={title}
            activeApp={activeApp}
            activePrimaryApp={appChrome.activePrimaryApp}
            activePrimaryLabel={appChrome.activePrimaryLabel}
            groups={appChrome.groups}
            localNavigation={appChrome.localNavigation}
            contextBar={contextBar ?? <AppContextBar title={title} context={context} actions={actions} container={container} />}
            secondarySidebar={secondarySidebar}
        >
            {children}
        </AppShell>
    );
}
