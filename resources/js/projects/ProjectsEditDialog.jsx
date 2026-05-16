import React from 'react';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ProjectsForm } from '@/projects/ProjectsForm';

export function ProjectsEditDialog({
    isSaving,
    onClose,
    onFieldChange,
    onSubmit,
    open,
    projectId,
    projects,
    value,
}) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl" data-testid="projects-edit-dialog">
                <ProjectsForm
                    value={value}
                    projects={projects}
                    excludeProjectId={projectId}
                    isSaving={isSaving}
                    onFieldChange={onFieldChange}
                    onSubmit={onSubmit}
                    onCancel={() => onClose(false)}
                    title="Edit project"
                    submitLabel="Save project"
                />
            </DialogContent>
        </Dialog>
    );
}
