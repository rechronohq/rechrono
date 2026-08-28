import { describe, expect, test } from 'vitest';

import {
    timelineExportDimensions,
    timelineExportFilename,
    timelineExportPixelRatio,
    timelinePdfDimensions,
} from './exportTimeline';

describe('timeline export helpers', () => {
    test('builds a safe dated filename from the active view', () => {
        expect(timelineExportFilename({
            activeViewName: 'Équipe / October Plan',
            selectedProjectName: 'Ignored project',
            date: new Date(2026, 9, 4),
        })).toBe('equipe-october-plan-2026-10-04');
    });

    test('falls back from project name to the generic timeline name', () => {
        expect(timelineExportFilename({ selectedProjectName: 'Fenplast', date: new Date(2026, 7, 28) })).toBe('fenplast-2026-08-28');
        expect(timelineExportFilename({ date: new Date(2026, 7, 28) })).toBe('timeline-2026-08-28');
    });

    test('includes the fixed sidebar and every visible timeline row', () => {
        expect(timelineExportDimensions({ headerHeight: 58, rowCount: 12, rowHeight: 38, timelineWidth: 1900 })).toEqual({
            width: 2268,
            height: 514,
        });
    });

    test('uses two-times rendering for normal exports and scales large exports down', () => {
        expect(timelineExportPixelRatio(2000, 1000)).toBe(2);
        expect(timelineExportPixelRatio(20_000, 1000)).toBeLessThan(1);
    });

    test('keeps PDF proportions while respecting the maximum page edge', () => {
        expect(timelinePdfDimensions(2000, 1000)).toEqual({ width: 2000, height: 1000 });
        expect(timelinePdfDimensions(28_800, 14_400)).toEqual({ width: 14_400, height: 7200 });
    });
});
