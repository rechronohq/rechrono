export function formatDay(value) {
    return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    }).format(new Date(`${value}T00:00:00`));
}

export function formatFullDay(value) {
    return new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    }).format(new Date(`${value}T00:00:00`));
}

export function formatNavigatorDate(value) {
    return new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        month: 'short',
        day: '2-digit',
    }).format(new Date(`${value}T00:00:00`));
}

export function formatShortDate(value) {
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
    }).format(new Date(`${value}T00:00:00`));
}

export function formatDateRange(weekStart) {
    const start = new Date(`${weekStart}T00:00:00`);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return `${formatShortDate(weekStart)} - ${formatShortDate(`${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`)}`;
}

export function formatNavigatorMonth(value) {
    return new Intl.DateTimeFormat(undefined, {
        month: 'long',
        year: 'numeric',
    }).format(value);
}

export function formatWeekHours(value) {
    const number = Number(value ?? 0);

    if (number === 0) {
        return '0';
    }

    return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

export function formatDuration(seconds) {
    const totalSeconds = Math.max(0, Number(seconds ?? 0));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}`;
    }

    return `${minutes}m`;
}

export function elapsedSeconds(entry) {
    if (!entry?.is_running) {
        return entry?.duration_seconds ?? 0;
    }

    const startedAt = Date.parse(entry.started_at);

    if (Number.isNaN(startedAt)) {
        return entry.duration_seconds ?? 0;
    }

    return Math.max(entry.duration_seconds ?? 0, Math.floor((Date.now() - startedAt) / 1000));
}

export function updateUrl(template, entryId) {
    return template.replace('__ENTRY__', entryId);
}

export function dayUrl(template, day) {
    return template.replace('__DATE__', day);
}

export function weekUrlForDate(template, day) {
    const date = new Date(`${day}T00:00:00`);
    const mondayOffset = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - mondayOffset);

    const weekStart = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    return template.replace(/week=[^&]*/, `week=${weekStart}`);
}

function formatTimeInput(date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function defaultDraft(timesheet, now = new Date()) {
    const startTime = formatTimeInput(now);

    return {
        id: null,
        task_id: timesheet.default_task_id ?? timesheet.task_options?.[0]?.id ?? '',
        date: timesheet.selected_date,
        start_time: startTime,
        end_time: '',
    };
}

function minutesForTime(value) {
    const [hours, minutes] = value.split(':').map((part) => Number.parseInt(part, 10));

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return null;
    }

    return hours * 60 + minutes;
}

export function validateDraft(draft) {
    if (!draft?.task_id || !draft.start_time) {
        return { isValid: false, error: null };
    }

    if (!draft.end_time) {
        return draft.id
            ? { isValid: false, error: 'End is required.' }
            : { isValid: true, error: null };
    }

    const startMinutes = minutesForTime(draft.start_time);
    const endMinutes = minutesForTime(draft.end_time);

    if (startMinutes === null || endMinutes === null) {
        return { isValid: false, error: null };
    }

    if (endMinutes <= startMinutes) {
        return { isValid: false, error: 'End must be after start.' };
    }

    return { isValid: true, error: null };
}

export function isDraftActionDisabled(draft, isSubmitting = false) {
    return isSubmitting || !validateDraft(draft).isValid;
}
