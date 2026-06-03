import { request } from '@/lib/request';

function runningEntry(entry) {
    return entry?.is_running ? entry : null;
}

export function dispatchTimerChange(entry) {
    window.dispatchEvent(new CustomEvent('rechrono:timer-change', { detail: { entry: runningEntry(entry) } }));
}

export async function fetchCurrentTimer(routes) {
    if (!routes?.time?.current) {
        return null;
    }

    const payload = await request(routes.time.current);

    return runningEntry(payload.entry);
}

export async function startTaskTimer(routes, taskId) {
    if (!routes?.time?.startTimer || !taskId) {
        return null;
    }

    const payload = await request(routes.time.startTimer.replace('__TASK__', taskId), {
        method: 'POST',
    });
    const entry = runningEntry(payload.entry);

    dispatchTimerChange(entry);

    return entry;
}

export async function stopCurrentTimer(routes) {
    if (!routes?.time?.stopTimer) {
        return null;
    }

    const payload = await request(routes.time.stopTimer, {
        method: 'POST',
    });
    const entry = runningEntry(payload.entry);

    dispatchTimerChange(entry);

    return entry;
}
