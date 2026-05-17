import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

import { ProjectsFormPage } from '@/projects/ProjectsFormPage';
import { ProjectsForm } from '@/projects/ProjectsForm';
import { request } from '@/lib/request';
import { toAppPath } from '@/lib/url';

export default function ProjectsCreate({ projects, templateProjects = [] }) {
    const { props } = usePage();
    const routes = props.routes ?? {};
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState({
        name: '',
        parent_id: '',
        description: '',
        template_project_id: '',
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
            const usesTemplate = Boolean(form.template_project_id);
            const payload = await request(toAppPath(usesTemplate ? routes.projectsFromTemplate : routes.projectsStore), {
                method: 'POST',
                body: JSON.stringify({
                    name: form.name.trim(),
                    description: usesTemplate ? null : form.description.trim() || null,
                    parent_id: form.parent_id || null,
                    template_project_id: usesTemplate ? form.template_project_id : null,
                }),
            });

            window.location.assign(toAppPath(payload.project.show_url));
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <ProjectsFormPage title="New Project">
            <ProjectsForm
                value={form}
                projects={projects ?? []}
                templateProjects={templateProjects}
                isSaving={isSaving}
                onFieldChange={handleFieldChange}
                onSubmit={handleSubmit}
                title="New project"
                submitLabel="Create project"
                secondaryAction={(
                    <Link className="projects-form__subtle-link" href={toAppPath(routes.imports?.index ?? '/imports')}>
                        Import
                    </Link>
                )}
            />
        </ProjectsFormPage>
    );
}
