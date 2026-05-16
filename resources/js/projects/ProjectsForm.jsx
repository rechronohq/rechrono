import React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export function ProjectsForm({
    excludeProjectId = null,
    isSaving,
    onFieldChange,
    onModeChange = null,
    onSubmit,
    onCancel = null,
    projects,
    templateProjects = [],
    title = null,
    submitLabel = 'Create project',
    value,
}) {
    const parentOptions = projects.filter((project) => project.parent_id === null && project.id !== excludeProjectId);
    const canUseTemplates = templateProjects.length > 0 && value.mode !== undefined;
    const mode = value.mode ?? 'blank';

    return (
        <form
            className="projects-form"
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
            }}
        >
            {title ? (
                <div className="projects-form__header">
                    <h2 className="projects-form__title">{title}</h2>
                </div>
            ) : null}

            {canUseTemplates ? (
                <div className="inline-flex w-fit rounded-md border border-stone-200 bg-stone-50 p-1">
                    {[
                        ['blank', 'Blank project'],
                        ['template', 'Use template'],
                    ].map(([nextMode, label]) => (
                        <button
                            key={nextMode}
                            type="button"
                            className={cn(
                                'rounded-md px-3 py-1.5 text-sm font-medium transition',
                                mode === nextMode ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900',
                            )}
                            onClick={() => onModeChange?.(nextMode)}
                            disabled={isSaving}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            ) : null}

            <div className="projects-form__grid">
                <div className="space-y-2">
                    <Label htmlFor="projects-form-name">Name</Label>
                    <Input
                        id="projects-form-name"
                        autoFocus
                        value={value.name}
                        onChange={(event) => onFieldChange('name', event.target.value)}
                        placeholder="Website relaunch"
                        disabled={isSaving}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="projects-form-parent">Parent project</Label>
                    <Select
                        id="projects-form-parent"
                        value={value.parent_id}
                        onChange={(event) => onFieldChange('parent_id', event.target.value)}
                        disabled={isSaving}
                    >
                        <option value="">No parent</option>
                        {parentOptions.map((project) => (
                            <option key={project.id} value={project.id}>
                                {project.name}
                            </option>
                        ))}
                    </Select>
                </div>

                {mode === 'template' ? (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="projects-form-template">Template</Label>
                            <Select
                                id="projects-form-template"
                                value={value.template_project_id ?? ''}
                                onChange={(event) => onFieldChange('template_project_id', event.target.value)}
                                disabled={isSaving}
                            >
                                <option value="">Select template</option>
                                {templateProjects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="projects-form-start-date">Start date</Label>
                            <Input
                                id="projects-form-start-date"
                                type="date"
                                value={value.start_date ?? ''}
                                onChange={(event) => onFieldChange('start_date', event.target.value)}
                                disabled={isSaving}
                            />
                        </div>
                    </>
                ) : null}
            </div>

            {mode === 'blank' ? (
                <div className="space-y-2">
                    <Label htmlFor="projects-form-description">Description</Label>
                    <Textarea
                        id="projects-form-description"
                        value={value.description}
                        onChange={(event) => onFieldChange('description', event.target.value)}
                        placeholder="Add project context or scope."
                        disabled={isSaving}
                    />
                </div>
            ) : null}

            <div className="projects-form__footer">
                {onCancel ? (
                    <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving}>
                        Cancel
                    </Button>
                ) : <span />}
                <Button
                    type="submit"
                    disabled={
                        isSaving
                        || value.name.trim() === ''
                        || (mode === 'template' && (!(value.template_project_id ?? '') || !(value.start_date ?? '')))
                    }
                >
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
