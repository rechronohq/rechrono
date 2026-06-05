import { describe, expect, test } from 'vitest';

import { getAppChrome, resolveActivePrimaryApp } from './apps';

const routes = {
    apps: {
        planner: '/planner',
        projects: '/projects',
        timesheet: '/timesheet',
    },
    teamSettingsEdit: '/settings',
};

describe('app chrome', () => {
    test('resolves settings as its own primary app', () => {
        expect(resolveActivePrimaryApp('settings')).toBe('settings');

        const chrome = getAppChrome(routes, { is_admin: false }, 'settings');

        expect(chrome.activePrimaryApp).toBe('settings');
        expect(chrome.activePrimaryLabel).toBe('Settings');
        expect(chrome.groups.flatMap((group) => group.items.map((item) => item.key))).not.toContain('settings');
        expect(chrome.utilityApps.map((item) => item.key)).toContain('settings');
    });
});
