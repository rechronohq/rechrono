import { getTaskRowActions } from '@/tasks/taskRowActions';

export function getSidebarRowActions(row, handlers, options = {}) {
    if (row.kind === 'project') {
        return [
            {
                id: 'open',
                label: 'Open',
                placement: 'menu',
                onSelect: () => handlers.onSelectProject(row.project.id),
            },
            {
                id: 'new-group',
                label: 'New group',
                placement: 'menu',
                onSelect: () => handlers.onCreateGroup(row.project),
            },
            {
                id: 'duplicate',
                label: 'Duplicate',
                placement: 'menu',
                onSelect: () => handlers.onDuplicateProject(row.project),
            },
            {
                id: 'save-as-template',
                label: 'Save as template',
                placement: 'menu',
                onSelect: () => handlers.onSaveProjectAsTemplate(row.project),
            },
            {
                id: 'delete',
                label: 'Delete',
                placement: 'menu',
                tone: 'destructive',
                onSelect: () => handlers.onDeleteProject(row.project),
            },
        ];
    }

    if (row.kind === 'group') {
        return [
            {
                id: 'duplicate',
                label: 'Duplicate',
                placement: 'menu',
                onSelect: () => handlers.onDuplicateTask(row.item),
            },
            {
                id: 'delete',
                label: 'Delete',
                placement: 'menu',
                tone: 'destructive',
                onSelect: () => handlers.onDeleteTask(row.item),
            },
        ];
    }

    if (row.kind === 'task') {
        return getTaskRowActions(row.item, {
            onAddChild: (task) => handlers.onToggleComposer(task.id),
            onConvertToGroup: handlers.onConvertTaskToGroup,
            onDelete: handlers.onDeleteTask,
            onDuplicate: handlers.onDuplicateTask,
            onToggleCompletion: handlers.onToggleTaskCompletion,
        }, {
            canAddChildren: options.canAddChildren,
            canConvertToGroup: true,
        });
    }

    return [];
}

export function getSidebarSelectionActions(selectionCount, handlers) {
    if (!selectionCount) {
        return [];
    }

    return [
        {
            id: 'mark-complete',
            label: selectionCount > 1 ? `Mark ${selectionCount} complete` : 'Mark complete',
            placement: 'menu',
            onSelect: () => handlers.onMarkSelectionComplete(),
        },
        {
            id: 'mark-incomplete',
            label: selectionCount > 1 ? `Mark ${selectionCount} incomplete` : 'Mark incomplete',
            placement: 'menu',
            onSelect: () => handlers.onMarkSelectionIncomplete(),
        },
        {
            id: 'clear-selection',
            label: 'Clear selection',
            placement: 'menu',
            onSelect: () => handlers.onClearSelection(),
        },
    ];
}

export function splitSidebarRowActions(actions) {
    return {
        inlineAction: null,
        menuActions: actions.filter((action) => action.placement !== 'inline'),
    };
}
