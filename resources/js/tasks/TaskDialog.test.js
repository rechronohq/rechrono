import { describe, expect, it } from 'vitest';

import { taskDatesAreChildDriven } from './TaskDialog';

describe('TaskDialog date behavior', () => {
    it('treats edited parent task dates as child-driven', () => {
        expect(taskDatesAreChildDriven({ mode: 'edit', value: { has_children: true } })).toBe(true);
    });

    it('keeps new and leaf task dates directly editable', () => {
        expect(taskDatesAreChildDriven({ mode: 'create', value: { has_children: true } })).toBe(false);
        expect(taskDatesAreChildDriven({ mode: 'edit', value: { has_children: false } })).toBe(false);
    });
});
