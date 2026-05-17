import React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export function ProjectsForm({
    excludeProjectId = null,
    isSaving,
    onFieldChange,
    onSubmit,
    onCancel = null,
    projects,
    secondaryAction = null,
    templateProjects = [],
    title = null,
    submitLabel = 'Create project',
    value,
}) {
    const parentOptions = projects.filter((project) => project.parent_id === null && project.id !== excludeProjectId);
    const canSelectTemplate = value.template_project_id !== undefined;

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
                    <div>
                        <h2 className="projects-form__title">{title}</h2>
                        <p className="projects-form__description">
                            Start with a blank project or choose a saved template.
                        </p>
                    </div>
                </div>
            ) : null}

            <div className="projects-form__body">
                <div className="projects-form__grid">
                    <div className="projects-form__column">
                        <div className="projects-form__field">
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

                        <div className="projects-form__field">
                            <Label htmlFor="projects-form-description">Description</Label>
                            <Textarea
                                id="projects-form-description"
                                className="projects-form__description-input"
                                value={value.description}
                                onChange={(event) => onFieldChange('description', event.target.value)}
                                placeholder="Add project context or scope."
                                disabled={isSaving}
                            />
                        </div>
                    </div>

                    <div className="projects-form__column">
                        <div className="projects-form__field">
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

                        {canSelectTemplate ? (
                            <div className="projects-form__field">
                                <Label htmlFor="projects-form-template">Template</Label>
                                <Select
                                    id="projects-form-template"
                                    value={value.template_project_id ?? ''}
                                    onChange={(event) => onFieldChange('template_project_id', event.target.value)}
                                    disabled={isSaving}
                                >
                                    <option value="">No template</option>
                                    {templateProjects.map((project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </Select>
                                {templateProjects.length === 0 ? (
                                    <p className="projects-form__field-note">
                                        No templates yet. Save a project as a template to use it here.
                                    </p>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="projects-form__footer">
                {secondaryAction ?? (onCancel ? (
                    <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving}>
                        Cancel
                    </Button>
                ) : <span />)}
                <Button
                    type="submit"
                    disabled={
                        isSaving
                        || value.name.trim() === ''
                    }
                >
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
