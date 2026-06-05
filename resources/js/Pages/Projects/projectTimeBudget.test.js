import { describe, expect, test } from 'vitest';

import { projectTimeBudget } from './projectTimeBudget';

describe('project time budget helper', () => {
    test('returns null when no budget is available', () => {
        expect(projectTimeBudget({ actual_hours: 4, budget_hours: null })).toBeNull();
        expect(projectTimeBudget({ actual_hours: 4, budget_hours: 0 })).toBeNull();
    });

    test('formats consumed time against the project budget', () => {
        expect(projectTimeBudget({ actual_hours: 12.5, budget_hours: 40 })).toEqual({
            actualLabel: '12.5h',
            budgetLabel: '40h',
            percent: 31,
            percentLabel: '31%',
        });
    });

    test('does not cap over-budget consumption percentages', () => {
        expect(projectTimeBudget({ actual_hours: 48, budget_hours: 40 })).toMatchObject({
            actualLabel: '48h',
            budgetLabel: '40h',
            percent: 120,
            percentLabel: '120%',
        });
    });
});
