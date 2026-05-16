import React from 'react';

import { Button } from '../../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { cn } from '../../lib/utils';

export function ProjectDialog({
    isSaving,
    onClose,
    onProjectFormChange,
    onSubmit,
    open,
    projectForm,
    projects,
    templateProjects,
}) {
    const parentOptions = projects.filter((project) => project.parent_id === null);
    const canSubmit = projectForm.name.trim() !== '' && (
        projectForm.mode === 'blank' || projectForm.template_project_id !== ''
    );

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>New project</DialogTitle>
                </DialogHeader>

                <div className="space-y-5">
                    <div className="inline-flex rounded-md border border-stone-200 bg-stone-50 p-1">
                        {[
                            ['blank', 'Blank'],
                            ['template', 'Use template'],
                        ].map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                className={cn(
                                    'rounded-md px-3 py-1.5 text-sm font-medium transition',
                                    projectForm.mode === value ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900',
                                )}
                                onClick={() => onProjectFormChange('mode', value)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="project-name">Name</Label>
                        <Input
                            id="project-name"
                            value={projectForm.name}
                            onChange={(event) => onProjectFormChange('name', event.target.value)}
                            placeholder={projectForm.mode === 'template' ? 'Campaign launch' : 'Website relaunch'}
                        />
                    </div>

                    {projectForm.mode === 'template' && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="project-template">Template</Label>
                                <select
                                    id="project-template"
                                    value={projectForm.template_project_id}
                                    onChange={(event) => onProjectFormChange('template_project_id', event.target.value)}
                                    className="flex h-10 w-full rounded-[6px] border border-stone-200 bg-white px-3 text-sm text-stone-900 shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-stone-300/80"
                                >
                                    <option value="">Select template</option>
                                    {templateProjects.map((project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="project-start-date">Start date</Label>
                                <Input
                                    id="project-start-date"
                                    type="date"
                                    value={projectForm.start_date}
                                    onChange={(event) => onProjectFormChange('start_date', event.target.value)}
                                />
                            </div>
                        </>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="project-parent">Parent project</Label>
                        <select
                            id="project-parent"
                            value={projectForm.parent_id}
                            onChange={(event) => onProjectFormChange('parent_id', event.target.value)}
                            className="flex h-10 w-full rounded-[6px] border border-stone-200 bg-white px-3 text-sm text-stone-900 shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-stone-300/80"
                        >
                            <option value="">No parent</option>
                            {parentOptions.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <DialogFooter className="mt-6">
                    <Button type="button" variant="ghost" onClick={() => onClose(false)}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={onSubmit} disabled={isSaving || !canSubmit}>
                        {projectForm.mode === 'template' ? 'Create from template' : 'Create project'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
