import React from 'react';

import { TaskDialog as SharedTaskDialog } from '@/tasks/TaskDialog';

export function TaskDialog({ isSaving, ...props }) {
    return (
        <SharedTaskDialog
            {...props}
            assigneeValueField="assignee_value"
            disabled={isSaving}
            showProject
        />
    );
}
