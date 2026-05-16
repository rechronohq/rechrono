import React from 'react';

import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { ProjectsForm } from '@/projects/ProjectsForm';

export function ProjectsCreateDialog({
    isSaving,
    onClose,
    onFieldChange,
    onSubmit,
    open,
    projects,
    value,
}) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl" data-testid="projects-create-dialog">
                <ProjectsForm
                    value={value}
                    projects={projects}
                    isSaving={isSaving}
                    onFieldChange={onFieldChange}
                    onSubmit={onSubmit}
                    onCancel={() => onClose(false)}
                    title="New project"
                    submitLabel="Create project"
                />
            </DialogContent>
        </Dialog>
    );
}
