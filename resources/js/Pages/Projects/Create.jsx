import { usePage } from '@inertiajs/react';
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
        mode: 'blank',
        name: '',
        parent_id: '',
        description: '',
        template_project_id: '',
        start_date: new Date().toISOString().slice(0, 10),
    });

    function handleFieldChange(field, value) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    }

    function handleModeChange(mode) {
        setForm((current) => ({
            ...current,
            mode,
        }));
    }

    async function handleSubmit() {
        if (!form.name.trim() || isSaving) {
            return;
        }

        if (form.mode === 'template' && (!form.template_project_id || !form.start_date)) {
            return;
        }

        setIsSaving(true);

        try {
            const payload = await request(toAppPath(form.mode === 'template' ? routes.projectsFromTemplate : routes.projectsStore), {
                method: 'POST',
                body: JSON.stringify({
                    name: form.name.trim(),
                    description: form.mode === 'template' ? null : form.description.trim() || null,
                    parent_id: form.parent_id || null,
                    start_date: form.mode === 'template' ? form.start_date : null,
                    template_project_id: form.mode === 'template' ? form.template_project_id : null,
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
                onModeChange={handleModeChange}
                onSubmit={handleSubmit}
                title="New project"
                submitLabel={form.mode === 'template' ? 'Create from template' : 'Create project'}
                onCancel={() => window.history.back()}
            />
        </ProjectsFormPage>
    );
}
