export function formatCurrency(value, currency = 'CAD') {
    if (value == null || value === '') {
        return '—';
    }

    const amount = typeof value === 'number' ? value : Number(value);

    if (Number.isNaN(amount)) {
        return '—';
    }

    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

function parseDisplayDate(value) {
    if (!value) {
        return null;
    }

    const normalized = String(value).match(/^\d{4}-\d{2}-\d{2}$/)
        ? `${value}T00:00:00`
        : value;
    const date = new Date(normalized);

    return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateDisplay(value, locale = 'en-CA') {
    const date = parseDisplayDate(value);

    if (!date) {
        return '—';
    }

    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: 'short',
        timeZone: 'America/Toronto',
        year: 'numeric',
    }).format(date);
}

export function formatDateCompact(value, locale = 'en-CA') {
    const date = parseDisplayDate(value);

    if (!date) {
        return null;
    }

    return new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        timeZone: 'America/Toronto',
    }).format(date);
}

export function formatProjectDateRange(startDate, endDate, locale = 'en-CA') {
    const start = formatDateCompact(startDate, locale);
    const end = formatDateCompact(endDate, locale);

    if (!start && !end) {
        return null;
    }

    if (start && end) {
        if (String(startDate) === String(endDate)) {
            return start;
        }

        const startParsed = parseDisplayDate(startDate);
        const endParsed = parseDisplayDate(endDate);

        if (
            startParsed
            && endParsed
            && startParsed.getMonth() === endParsed.getMonth()
            && startParsed.getFullYear() === endParsed.getFullYear()
        ) {
            const endDay = new Intl.DateTimeFormat(locale, {
                day: 'numeric',
                timeZone: 'America/Toronto',
            }).format(endParsed);

            return `${start} – ${endDay}`;
        }

        return `${start} – ${end}`;
    }

    return start ?? end;
}

export function formatDecimal(value, { minimumFractionDigits = 0, maximumFractionDigits = 4 } = {}) {
    if (value == null || value === '') {
        return '—';
    }

    const amount = typeof value === 'number' ? value : Number(value);

    if (Number.isNaN(amount)) {
        return '—';
    }

    return new Intl.NumberFormat('en-CA', {
        minimumFractionDigits,
        maximumFractionDigits,
    }).format(amount);
}

export function formatMinutes(minutes = 0) {
    const normalized = Number(minutes) || 0;
    const hours = Math.floor(normalized / 60);
    const remainder = normalized % 60;

    if (hours === 0) {
        return `${remainder}m`;
    }

    return `${hours}:${String(remainder).padStart(2, '0')}`;
}

export function formatSeconds(seconds = 0) {
    const normalized = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(normalized / 3600);
    const minutes = Math.floor((normalized % 3600) / 60);
    const remainder = normalized % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
    }

    return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function formatTime24(value) {
    if (!value) {
        return '—';
    }

    const timeMatch = String(value).match(/[T\s](\d{2}):(\d{2})/);

    if (timeMatch) {
        return `${timeMatch[1]}:${timeMatch[2]}`;
    }

    return new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        hour12: false,
        minute: '2-digit',
    }).format(new Date(value));
}

export function formatQuantity(value) {
    return formatDecimal(value, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
    });
}

export function formatRate(value) {
    return formatDecimal(value, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
    });
}
