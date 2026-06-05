import { describe, expect, test } from 'vitest';

import { defaultDraft, formatDateRange, isDraftActionDisabled, validateDraft, weekUrlForDate } from './time';

describe('timesheet default draft', () => {
    test('starts new entries as a running timer for the recent task', () => {
        const draft = defaultDraft({
            default_task_id: 'recent-task-id',
            selected_date: '2026-06-03',
            task_options: [{ id: 'fallback-task-id' }],
        }, new Date(2026, 5, 3, 14, 37));

        expect(draft).toEqual({
            id: null,
            task_id: 'recent-task-id',
            date: '2026-06-03',
            start_time: '14:37',
            end_time: '',
        });
    });

    test('allows blank end times for new running timers', () => {
        expect(validateDraft({
            id: null,
            task_id: 'task-id',
            start_time: '14:37',
            end_time: '',
        })).toEqual({ isValid: true, error: null });
    });

    test('rejects end times that are not after start times', () => {
        expect(validateDraft({
            id: null,
            task_id: 'task-id',
            start_time: '14:37',
            end_time: '14:37',
        })).toEqual({ isValid: false, error: 'End must be after start.' });

        expect(validateDraft({
            id: null,
            task_id: 'task-id',
            start_time: '14:37',
            end_time: '13:00',
        })).toEqual({ isValid: false, error: 'End must be after start.' });
    });

    test('disables draft action while submitting', () => {
        const validDraft = {
            id: null,
            task_id: 'task-id',
            start_time: '14:37',
            end_time: '',
        };

        expect(isDraftActionDisabled(validDraft, false)).toBe(false);
        expect(isDraftActionDisabled(validDraft, true)).toBe(true);
    });

    test('builds week URLs from any selected date', () => {
        expect(weekUrlForDate('/teams/acme/timesheet?view=week&week=__WEEK__', '2026-06-04')).toBe('/teams/acme/timesheet?view=week&week=2026-06-01');
        expect(weekUrlForDate('/teams/acme/timesheet?view=week&week=2026-06-01', '2026-06-07')).toBe('/teams/acme/timesheet?view=week&week=2026-06-01');
        expect(weekUrlForDate('/teams/acme/timesheet?view=week&week=2026-06-01', '2026-06-08')).toBe('/teams/acme/timesheet?view=week&week=2026-06-08');
    });

    test('formats week date ranges compactly', () => {
        expect(formatDateRange('2026-06-01')).toBe('Jun 1 - Jun 7');
    });
});
