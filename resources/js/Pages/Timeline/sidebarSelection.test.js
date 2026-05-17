import { describe, expect, it } from 'vitest';

import {
    applyMarqueeSelection,
    coerceSidebarHitIds,
    rectsIntersect,
    sidebarIdsInClientRect,
} from './sidebarSelection';

const orderedIds = ['a', 'b', 'c', 'd'];
const items = [
    { id: 'a', parent_id: null, kind: 'task' },
    { id: 'b', parent_id: 'a', kind: 'task' },
    { id: 'c', parent_id: null, kind: 'group' },
    { id: 'd', parent_id: 'c', kind: 'task' },
];

describe('rectsIntersect', () => {
    it('detects overlapping rectangles', () => {
        expect(rectsIntersect(
            { left: 0, top: 0, right: 10, bottom: 10 },
            { left: 5, top: 5, right: 15, bottom: 15 },
        )).toBe(true);
    });

    it('rejects non-overlapping rectangles', () => {
        expect(rectsIntersect(
            { left: 0, top: 0, right: 10, bottom: 10 },
            { left: 20, top: 20, right: 30, bottom: 30 },
        )).toBe(false);
    });
});

describe('sidebarIdsInClientRect', () => {
    it('returns ids for rows intersecting the selection rect', () => {
        const hitIds = sidebarIdsInClientRect(
            { left: 0, top: 0, right: 100, bottom: 100 },
            [
                { id: 'a', rect: { left: 0, top: 0, right: 50, bottom: 50 } },
                { id: 'b', rect: { left: 200, top: 200, right: 250, bottom: 250 } },
            ],
        );

        expect(hitIds).toEqual(['a']);
    });
});

describe('coerceSidebarHitIds', () => {
    it('maps string dom ids back to ordered numeric ids', () => {
        expect(coerceSidebarHitIds(['2', '99'], [1, 2, 3])).toEqual([2]);
    });
});

describe('applyMarqueeSelection', () => {
    it('replaces the selection when no modifiers are held', () => {
        expect(applyMarqueeSelection(['a'], ['b', 'c'], orderedIds, items, {
            shiftKey: false,
            metaKey: false,
            ctrlKey: false,
        })).toEqual(['b', 'c']);
    });

    it('adds intersected rows when shift is held', () => {
        expect(applyMarqueeSelection(['a'], ['c'], orderedIds, items, {
            shiftKey: true,
            metaKey: false,
            ctrlKey: false,
        })).toEqual(['a', 'c']);
    });

    it('toggles intersected rows when meta is held', () => {
        expect(applyMarqueeSelection(['a', 'b'], ['b', 'c'], orderedIds, items, {
            shiftKey: false,
            metaKey: true,
            ctrlKey: false,
        })).toEqual(['a', 'c']);
    });
});
