import { usePage } from '@inertiajs/react';
import { useState } from 'react';

import { ProjectsFormPage } from '@/projects/ProjectsFormPage';
import { ProjectsForm } from '@/projects/ProjectsForm';
import { request } from '@/lib/request';
import { toAppPath } from '@/lib/url';

export default function ProjectsEdit({ project, projects, clientOptions = [] }) {
    const { props } = usePage();
    const routes = props.routes ?? {};
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState({
        name: project.name ?? '',
        parent_id: project.parent_id ?? '',
        description: project.description ?? '',
        budget_hours: project.budget_hours ?? '',
        client_id: project.client_id ?? '',
    });

    function handleFieldChange(field, value) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    }

    async function handleSubmit() {
        if (!form.name.trim() || isSaving) {
            return;
        }

        setIsSaving(true);

        try {
            const payload = await request(toAppPath(routes.projectsUpdate).replace('__PROJECT__', project.id), {
                method: 'PATCH',
                body: JSON.stringify({
                    name: form.name.trim(),
                    description: form.description.trim() || null,
                    budget_hours: form.budget_hours === '' ? null : Number(form.budget_hours),
                    client_id: form.parent_id ? null : (form.client_id || null),
                    parent_id: form.parent_id || null,
                }),
            });

            window.location.assign(toAppPath(payload.project.show_url));
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <ProjectsFormPage title={`Edit ${project.name}`}>
            <ProjectsForm
                value={form}
                projects={projects ?? []}
                clientOptions={clientOptions}
                excludeProjectId={project.id}
                isSaving={isSaving}
                onFieldChange={handleFieldChange}
                onSubmit={handleSubmit}
                title="Edit project"
                submitLabel="Save project"
                onCancel={() => window.location.assign(toAppPath(project.show_url))}
            />
        </ProjectsFormPage>
    );
}
