import { describe, expect, it } from 'vitest';

import {
    canSubmitProjectForm,
    defaultProjectForm,
    projectCreationRequest,
} from './projectDialogForm';

describe('project dialog form', () => {
    it('defaults to a blank project without a mode switch value', () => {
        expect(defaultProjectForm()).toEqual({
            name: '',
            description: '',
            budget_hours: '',
            client_id: '',
            parent_id: '',
            template_project_id: '',
            start_date: expect.any(String),
        });
    });

    it('allows blank project creation when the name is present', () => {
        expect(canSubmitProjectForm({ name: 'Website relaunch', template_project_id: '' })).toBe(true);
    });

    it('chooses the blank project endpoint when no template is selected', () => {
        const request = projectCreationRequest({
            form: {
                name: 'Website relaunch',
                description: 'Internal launch notes',
                budget_hours: '12.5',
                parent_id: 'parent-1',
                template_project_id: '',
                start_date: '2026-05-28',
            },
            routes: {
                projectsStore: '/projects',
                projectsFromTemplate: '/projects/from-template',
            },
            timelineState: {
                selected_project_ids: ['project-1'],
                selected_assignee_filters: ['user-1'],
                show_weekends: true,
                collapsed_project_ids: ['collapsed-1'],
            },
        });

        expect(request).toEqual({
            url: '/projects',
            body: {
                name: 'Website relaunch',
                description: 'Internal launch notes',
                budget_hours: 12.5,
                client_id: null,
                template_project_id: null,
                start_date: null,
                parent_id: 'parent-1',
                selected_project_ids: ['project-1'],
                selected_assignee_filters: ['user-1'],
                show_weekends: true,
                collapsed_project_ids: ['collapsed-1'],
            },
        });
    });

    it('chooses the template endpoint when a template is selected', () => {
        const request = projectCreationRequest({
            form: {
                name: 'Campaign launch',
                description: 'Ignored for template projects',
                budget_hours: '99',
                parent_id: '',
                template_project_id: 'template-1',
                start_date: '2026-05-28',
            },
            routes: {
                projectsStore: '/projects',
                projectsFromTemplate: '/projects/from-template',
            },
            timelineState: {},
        });

        expect(request).toEqual({
            url: '/projects/from-template',
            body: {
                name: 'Campaign launch',
                description: null,
                budget_hours: null,
                client_id: null,
                template_project_id: 'template-1',
                start_date: '2026-05-28',
                parent_id: null,
                selected_project_ids: undefined,
                selected_assignee_filters: [],
                show_weekends: false,
                collapsed_project_ids: [],
            },
        });
    });
});
