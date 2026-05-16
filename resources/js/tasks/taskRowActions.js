export function getTaskRowActions(task, handlers, options = {}) {
    if (!task) {
        return [];
    }

    const actions = [];

    if (handlers.onToggleCompletion && task.kind !== 'group') {
        actions.push({
            id: 'toggle-completion',
            label: task.completed ? 'Mark incomplete' : 'Mark complete',
            placement: 'menu',
            onSelect: () => handlers.onToggleCompletion(task, !task.completed),
        });
    }

    if (options.canAddChildren !== false && handlers.onAddChild) {
        actions.push({
            id: 'add-child',
            label: 'Add child',
            placement: 'menu',
            onSelect: () => handlers.onAddChild(task),
        });
    }

    if (options.canConvertToGroup && handlers.onConvertToGroup) {
        actions.push({
            id: 'convert-to-group',
            label: 'Convert to group',
            placement: 'menu',
            onSelect: () => handlers.onConvertToGroup(task),
        });
    }

    if (handlers.onEdit) {
        actions.push({
            id: 'edit',
            label: 'Edit',
            placement: 'menu',
            onSelect: () => handlers.onEdit(task),
        });
    }

    if (handlers.onDuplicate) {
        actions.push({
            id: 'duplicate',
            label: 'Duplicate',
            placement: 'menu',
            onSelect: () => handlers.onDuplicate(task),
        });
    }

    if (handlers.onDelete) {
        actions.push({
            id: 'delete',
            label: 'Delete',
            placement: 'menu',
            tone: 'destructive',
            onSelect: () => handlers.onDelete(task),
        });
    }

    return actions;
}
