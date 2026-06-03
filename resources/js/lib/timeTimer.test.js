import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { dispatchTimerChange, fetchCurrentTimer, startTaskTimer, stopCurrentTimer } from './timeTimer';

vi.mock('@/lib/request', () => ({
    request: vi.fn(),
}));

const { request } = await import('@/lib/request');

beforeEach(() => {
    vi.stubGlobal('window', new EventTarget());
    vi.stubGlobal('CustomEvent', class CustomEvent extends Event {
        constructor(type, options = {}) {
            super(type, options);
            this.detail = options.detail;
        }
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
});

describe('time timer helpers', () => {
    test('starts a task timer and dispatches the running entry', async () => {
        const entry = { id: 'entry-1', is_running: true };
        const listener = vi.fn();

        request.mockResolvedValueOnce({ entry });
        window.addEventListener('rechrono:timer-change', listener);

        await expect(startTaskTimer({ time: { startTimer: '/tasks/__TASK__/timer' } }, 'task-1')).resolves.toEqual(entry);

        expect(request).toHaveBeenCalledWith('/tasks/task-1/timer', { method: 'POST' });
        expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: { entry } }));

        window.removeEventListener('rechrono:timer-change', listener);
    });

    test('stops the current timer and dispatches a null running entry', async () => {
        const listener = vi.fn();

        request.mockResolvedValueOnce({ entry: { id: 'entry-1', is_running: false } });
        window.addEventListener('rechrono:timer-change', listener);

        await expect(stopCurrentTimer({ time: { stopTimer: '/timer/stop' } })).resolves.toBeNull();

        expect(request).toHaveBeenCalledWith('/timer/stop', { method: 'POST' });
        expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: { entry: null } }));

        window.removeEventListener('rechrono:timer-change', listener);
    });

    test('fetches only running timers', async () => {
        request.mockResolvedValueOnce({ entry: { id: 'entry-1', is_running: false } });

        await expect(fetchCurrentTimer({ time: { current: '/timer/current' } })).resolves.toBeNull();

        expect(request).toHaveBeenCalledWith('/timer/current');
    });

    test('normalizes dispatched stopped entries', () => {
        const listener = vi.fn();

        window.addEventListener('rechrono:timer-change', listener);
        dispatchTimerChange({ id: 'entry-1', is_running: false });

        expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: { entry: null } }));

        window.removeEventListener('rechrono:timer-change', listener);
    });
});
