export const TIMELINE_DENSITIES = {
    comfortable: {
        key: 'comfortable',
        label: 'Comfortable',
        rowHeight: 38,
        barHeight: 24,
        columnWidth: 38,
        headerHeight: 58,
        monthHeight: 26,
        dayHeight: 32,
        assigneeBadgeSize: 24,
        unassignedBadgeSize: 14,
    },
    compact: {
        key: 'compact',
        label: 'Compact',
        rowHeight: 30,
        barHeight: 18,
        columnWidth: 28,
        headerHeight: 46,
        monthHeight: 20,
        dayHeight: 26,
        assigneeBadgeSize: 20,
        unassignedBadgeSize: 10,
    },
};

export const DEFAULT_TIMELINE_DENSITY = 'comfortable';

export function timelineDensityFor(value) {
    return TIMELINE_DENSITIES[value] ?? TIMELINE_DENSITIES[DEFAULT_TIMELINE_DENSITY];
}

export const ROW_HEIGHT = TIMELINE_DENSITIES.comfortable.rowHeight;
export const BAR_HEIGHT = TIMELINE_DENSITIES.comfortable.barHeight;
export const COLUMN_WIDTH = TIMELINE_DENSITIES.comfortable.columnWidth;
