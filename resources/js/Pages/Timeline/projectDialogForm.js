export function defaultProjectForm() {
    return {
        name: '',
        description: '',
        budget_hours: '',
        client_id: '',
        parent_id: '',
        template_project_id: '',
        start_date: new Date().toISOString().slice(0, 10),
    };
}

export function canSubmitProjectForm(projectForm) {
    return projectForm.name.trim() !== '';
}

export function projectCreationRequest({ form, routes, timelineState }) {
    const usesTemplate = Boolean(form.template_project_id);
    const budgetHours = form.budget_hours === undefined || form.budget_hours === ''
        ? null
        : Number(form.budget_hours);

    return {
        url: usesTemplate ? routes.projectsFromTemplate : routes.projectsStore,
        body: {
            name: form.name.trim(),
            description: usesTemplate ? null : form.description.trim() || null,
            budget_hours: usesTemplate ? null : budgetHours,
            client_id: form.parent_id ? null : (form.client_id || null),
            template_project_id: usesTemplate ? form.template_project_id : null,
            start_date: usesTemplate ? form.start_date : null,
            parent_id: form.parent_id || null,
            selected_project_ids: timelineState.selected_project_ids,
            selected_assignee_filters: timelineState.selected_assignee_filters ?? [],
            show_weekends: timelineState.show_weekends ?? false,
            collapsed_project_ids: timelineState.collapsed_project_ids ?? [],
        },
    };
}
