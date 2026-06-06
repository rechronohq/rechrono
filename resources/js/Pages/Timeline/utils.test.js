import { describe, expect, it } from 'vitest';

import { buildBars, buildDays, buildRows } from './utils';

const dimensions = {
    barHeight: 18,
    columnWidth: 10,
    rowHeight: 30,
};

describe('timeline bar building', () => {
    it('marks nested task parents as summary bars', () => {
        const layout = buildDays('2026-06-01', '2026-06-12', true, dimensions);
        const rows = buildRows(
            [{ id: 'project-1', name: 'Project', depth: 0 }],
            ['project-1'],
            [
                {
                    id: 'parent',
                    project_id: 'project-1',
                    parent_id: null,
                    kind: 'task',
                    name: 'Parent',
                    start: '2026-06-02',
                    end: '2026-06-10',
                    has_children: true,
                    sort_order: 1,
                },
                {
                    id: 'child-a',
                    project_id: 'project-1',
                    parent_id: 'parent',
                    kind: 'task',
                    name: 'First child',
                    start: '2026-06-03',
                    end: '2026-06-04',
                    has_children: false,
                    sort_order: 1,
                },
            ],
            null,
        );

        const parentBar = buildBars(rows, layout.days, true, dimensions).find((bar) => bar.id === 'parent');

        expect(parentBar).toMatchObject({
            id: 'parent',
            is_summary: true,
        });
    });
});
