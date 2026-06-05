import { Clock, FolderKanban, LayoutDashboard, Settings } from 'lucide-react';

export const primaryAppDefinitions = [
    {
        key: 'planner',
        label: 'Timeline',
        icon: LayoutDashboard,
        group: 'apps',
        href: (routes) => routes?.apps?.planner ?? routes?.planner ?? routes?.tasks,
    },
    {
        key: 'projects',
        label: 'Projects',
        icon: FolderKanban,
        group: 'management',
        href: (routes) => routes?.apps?.projects ?? routes?.projects?.index ?? routes?.projectsApp,
    },
    {
        key: 'timesheet',
        label: 'Timesheet',
        icon: Clock,
        group: 'management',
        href: (routes) => routes?.apps?.timesheet,
    },
    {
        key: 'settings',
        label: 'Settings',
        icon: Settings,
        group: 'utility',
        href: (routes) => routes?.teamSettingsEdit,
    },
];

export const primaryGroupDefinitions = [
    { key: 'apps', label: 'Apps' },
    { key: 'management', label: 'Management' },
];

export const localNavigationDefinitions = [];

export function resolveActivePrimaryApp(activeApp) {
    return localNavigationDefinitions.find((definition) => definition.key === activeApp)?.parentKey
        ?? primaryAppDefinitions.find((definition) => definition.key === activeApp)?.key
        ?? 'planner';
}

export function getAppChrome(routes, user, activeApp) {
    const isAdmin = Boolean(user?.is_admin);
    const activePrimaryApp = resolveActivePrimaryApp(activeApp);
    const availablePrimaryApps = primaryAppDefinitions
        .filter((definition) => !definition.adminOnly || isAdmin)
        .map((definition) => ({
            ...definition,
            href: definition.href(routes),
        }))
        .filter((definition) => Boolean(definition.href));
    const groups = primaryGroupDefinitions
        .map((group) => ({
            ...group,
            items: availablePrimaryApps.filter((definition) => definition.group === group.key),
        }))
        .filter((group) => group.items.length > 0);
    const utilityApps = availablePrimaryApps.filter((definition) => definition.group === 'utility');
    const localNavigation = localNavigationDefinitions
        .filter((definition) => definition.parentKey === activePrimaryApp)
        .filter((definition) => !definition.adminOnly || isAdmin)
        .map((definition) => ({
            ...definition,
            href: definition.href(routes),
        }));
    const activePrimaryLabel = availablePrimaryApps.find((definition) => definition.key === activePrimaryApp)?.label ?? activePrimaryApp;

    return {
        activePrimaryApp,
        activePrimaryLabel,
        groups,
        utilityApps,
        localNavigation,
    };
}
