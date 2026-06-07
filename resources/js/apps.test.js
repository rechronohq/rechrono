import { describe, expect, test } from 'vitest';

import { getAppChrome, resolveActivePrimaryApp } from './apps';

const routes = {
    apps: {
        planner: '/planner',
        projects: '/projects',
        clients: '/clients',
        timesheet: '/timesheet',
    },
    teamSettingsEdit: '/settings',
};

describe('app chrome', () => {
    test('places timeline projects and timesheet in one unlabeled primary group', () => {
        const chrome = getAppChrome(routes, { is_admin: false }, 'planner');

        expect(chrome.groups).toHaveLength(1);
        expect(chrome.groups[0].label).toBeNull();
        expect(chrome.groups[0].items.map((item) => item.key)).toEqual(['planner', 'projects', 'clients', 'timesheet']);
    });

    test('resolves settings as its own primary app', () => {
        expect(resolveActivePrimaryApp('settings')).toBe('settings');

        const chrome = getAppChrome(routes, { is_admin: false }, 'settings');

        expect(chrome.activePrimaryApp).toBe('settings');
        expect(chrome.activePrimaryLabel).toBe('Settings');
        expect(chrome.groups.flatMap((group) => group.items.map((item) => item.key))).not.toContain('settings');
        expect(chrome.utilityApps.map((item) => item.key)).toContain('settings');
    });
});
