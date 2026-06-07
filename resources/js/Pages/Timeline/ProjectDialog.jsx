import React from 'react';
import { Link, usePage } from '@inertiajs/react';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import { toAppPath } from '../../lib/url';
import { ProjectsForm } from '../../projects/ProjectsForm';

export function ProjectDialog({
    isSaving,
    onClose,
    onProjectFormChange,
    onSubmit,
    open,
    projectForm,
    projects,
    clientOptions = [],
    templateProjects,
}) {
    const { props } = usePage();
    const routes = props.routes ?? {};

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl overflow-hidden p-0">
                <DialogHeader className="sr-only">
                    <DialogTitle>New project</DialogTitle>
                </DialogHeader>

                <ProjectsForm
                    value={projectForm}
                    projects={projects}
                    clientOptions={clientOptions}
                    templateProjects={templateProjects}
                    isSaving={isSaving}
                    onFieldChange={onProjectFormChange}
                    onSubmit={onSubmit}
                    onCancel={() => onClose(false)}
                    title="New project"
                    submitLabel="Create project"
                    className="projects-form--in-dialog"
                    secondaryAction={(
                        <Link className="projects-form__subtle-link" href={toAppPath(routes.imports?.index ?? '/imports')}>
                            Import
                        </Link>
                    )}
                />
            </DialogContent>
        </Dialog>
    );
}
