import { describe, expect, test } from 'vitest';

import {
    filterTaskGroups,
    formatTaskCompletionSummary,
    groupTasksByTimelineGroup,
    selectedTaskSelectionActions,
    summarizeTaskGroups,
    updateTaskInGroups,
} from './projectTaskView';

const taskGroups = [
    {
        assignee_id: 1,
        assignee_name: 'Ada',
        tasks: [
            { id: 'group-1', kind: 'group', name: 'Planning' },
            { id: 'task-1', kind: 'task', name: 'Open mine', parent_id: 'group-1', completed: false, assignee_user_id: 1, update_url: '/tasks/1' },
            { id: 'task-2', kind: 'task', name: 'Done', parent_id: 'group-1', completed: true, assignee_user_id: 2, update_url: '/tasks/2', destroy_url: '/tasks/2' },
        ],
    },
];

describe('project task view helpers', () => {
    test('summarizes non-group project tasks', () => {
        expect(summarizeTaskGroups(taskGroups, { groups: 1 })).toEqual({
            total: 2,
            completed: 1,
            open: 1,
            groups: 1,
        });
    });

    test('formats task completion as completed over total', () => {
        expect(formatTaskCompletionSummary({ completed: 5, total: 7 })).toBe('5/7');
        expect(formatTaskCompletionSummary({ completed: null, total: undefined })).toBe('0/0');
    });

    test('keeps timeline group sections visible when filtering person groups', () => {
        const groups = filterTaskGroups(taskGroups, 'all', 1);

        expect(groups).toHaveLength(1);
        expect(groups[0].has_timeline_groups).toBe(true);
        expect(groups[0].tasks.map((task) => task.id)).toEqual(['task-1', 'task-2']);
    });

    test('groups tasks under timeline groups', () => {
        const groups = groupTasksByTimelineGroup(taskGroups, 'mine', 1, [{ id: 'group-1', kind: 'group', name: 'Planning' }]);

        expect(groups).toHaveLength(1);
        expect(groups[0].assignee_name).toBe('Planning');
        expect(groups[0].tasks.map((task) => task.id)).toEqual(['task-1']);
    });

    test('updates task records and completed counts together', () => {
        const groups = updateTaskInGroups(taskGroups, 'task-1', { completed: true });

        expect(groups[0].completed_count).toBe(2);
        expect(groups[0].tasks.find((task) => task.id === 'task-1').completed).toBe(true);
    });

    test('builds selected task actions from task capabilities', () => {
        const actions = selectedTaskSelectionActions(taskGroups[0].tasks.filter((task) => task.kind !== 'group'), {
            onAssign: () => {},
            onDelete: () => {},
            onMarkComplete: () => {},
            onMarkIncomplete: () => {},
        }, [
            { value: null, label: 'Unassigned' },
            { value: 1, label: 'Ada' },
        ]);

        expect(actions.map((action) => action.id)).toEqual([
            'assign-selected',
            'mark-selected-complete',
            'mark-selected-incomplete',
            'delete-selected',
        ]);
        expect(actions[0].children.map((action) => action.label)).toEqual(['Unassigned', 'Ada']);
    });
});
