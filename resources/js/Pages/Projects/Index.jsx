import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RowContextMenu } from '@/components/RowContextMenu';
import { Select } from '@/components/ui/select';
import AppPage from '@/Layouts/AppPage';
import { request } from '@/lib/request';
import { toAppPath } from '@/lib/url';
import { ProjectsTable } from '@/projects/ProjectsTable';

export default function ProjectsIndex({ projects }) {
    const { props } = usePage();
    const rows = projects.rows ?? [];
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [projectContextMenu, setProjectContextMenu] = useState({ anchor: null, mode: 'row', open: false, projectId: null });

    useEffect(() => {
        const rowIds = new Set(rows.map((row) => row.id));

        setSelectedIds((current) => current.filter((id) => rowIds.has(id)));
    }, [rows]);

    async function handleBulkAction(action, projectIds) {
        if (projectIds.length === 0 || isSubmitting) {
            return;
        }

        if (action === 'delete' && !window.confirm(`Delete ${projectIds.length} selected ${projectIds.length === 1 ? 'project' : 'projects'}? This cannot be undone.`)) {
            return;
        }

        setIsSubmitting(true);

        try {
            await request(toAppPath(projects.bulk_action_url), {
                method: 'POST',
                body: JSON.stringify({
                    action,
                    project_ids: projectIds,
                }),
            });

            setSelectedIds((current) => current.filter((id) => !projectIds.includes(id)));
            router.reload({
                preserveScroll: true,
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleRowAction(action, projectId) {
        await handleBulkAction(action, [projectId]);
    }

    async function handleProjectAction(action, project) {
        if (isSubmitting) {
            return;
        }

        if (action === 'delete' && !window.confirm(`Delete "${project.name}"? This will also delete its tasks. This cannot be undone.`)) {
            return;
        }

        if (action === 'archive' || action === 'unarchive') {
            await handleRowAction(action, project.id);

            return;
        }

        const actionUrls = {
            delete: project.destroy_url,
            duplicate: project.duplicate_url,
            'save-as-template': project.template_url,
        };
        const url = actionUrls[action];

        if (!url) {
            return;
        }

        setIsSubmitting(true);

        try {
            await request(toAppPath(url), {
                method: action === 'delete' ? 'DELETE' : 'POST',
            });

            setSelectedIds((current) => current.filter((id) => id !== project.id));
            router.reload({
                preserveScroll: true,
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    function closeProjectContextMenu() {
        setProjectContextMenu({ anchor: null, mode: 'row', open: false, projectId: null });
    }

    function openProjectContextMenu(project, anchor) {
        setProjectContextMenu({
            anchor,
            mode: selectedIds.length > 1 && selectedIds.includes(project.id) ? 'selection' : 'row',
            open: true,
            projectId: project.id,
        });
    }

    function visitProjectUrl(url) {
        router.visit(toAppPath(url));
    }

    function projectForContextMenu() {
        return rows.find((project) => project.id === projectContextMenu.projectId) ?? null;
    }

    function selectedProjectsForContextMenu() {
        const selectedIdSet = new Set(selectedIds);

        return rows.filter((project) => selectedIdSet.has(project.id));
    }

    function projectRowContextActions(project) {
        if (!project) {
            return [];
        }

        const statusAction = project.is_active ? 'archive' : 'unarchive';
        const isTemplate = Boolean(project.is_template);

        return [
            !isTemplate ? {
                id: 'open-timeline',
                label: 'Open timeline',
                onSelect: () => visitProjectUrl(project.timeline_url),
            } : null,
            {
                id: 'edit',
                label: isTemplate ? 'Edit template' : 'Edit project',
                onSelect: () => visitProjectUrl(project.edit_url),
            },
            {
                id: 'duplicate',
                label: 'Duplicate',
                onSelect: () => handleProjectAction('duplicate', project),
            },
            !isTemplate ? {
                id: 'save-as-template',
                label: 'Save as template',
                onSelect: () => handleProjectAction('save-as-template', project),
            } : null,
            !isTemplate ? {
                id: statusAction,
                label: project.is_active ? 'Archive' : 'Unarchive',
                onSelect: () => handleProjectAction(statusAction, project),
            } : null,
            {
                id: 'delete',
                label: 'Delete',
                tone: 'destructive',
                onSelect: () => handleProjectAction('delete', project),
            },
        ].filter(Boolean);
    }

    function projectSelectionContextActions(selectedProjects) {
        if (selectedProjects.length === 0) {
            return [];
        }

        const activeProjects = selectedProjects.filter((project) => project.is_active);
        const inactiveProjects = selectedProjects.filter((project) => !project.is_active);

        return [
            activeProjects.length > 0 ? {
                id: 'archive-selected',
                label: `Archive ${activeProjects.length}`,
                onSelect: () => handleBulkAction('archive', activeProjects.map((project) => project.id)),
            } : null,
            inactiveProjects.length > 0 ? {
                id: 'unarchive-selected',
                label: `Unarchive ${inactiveProjects.length}`,
                onSelect: () => handleBulkAction('unarchive', inactiveProjects.map((project) => project.id)),
            } : null,
            {
                id: 'delete-selected',
                label: `Delete ${selectedProjects.length}`,
                tone: 'destructive',
                onSelect: () => handleBulkAction('delete', selectedProjects.map((project) => project.id)),
            },
        ].filter(Boolean);
    }

    function handleStatusFilterChange(status) {
        router.get(toAppPath(props.routes?.projects?.index ?? '/projects'), status === 'active' ? {} : { status }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }

    return (
        <AppPage
            title="Projects"
            activeApp="projects"
            container="wide"
        >
            <div className="projects-app-page">
                <div className="projects-index-toolbar">
                    <div className="projects-index-toolbar__primary">
                        <Select
                            className="projects-index-status-filter"
                            value={projects.status_filter ?? 'active'}
                            onChange={(event) => handleStatusFilterChange(event.target.value)}
                        >
                            {(projects.status_options ?? []).map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </Select>
                        {selectedIds.length > 0 ? (
                            <>
                                <div className="projects-index-toolbar__selected-count">
                                    {selectedIds.length} selected
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button type="button" variant="outline" disabled={isSubmitting}>
                                            Bulk actions
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={() => handleBulkAction('archive', selectedIds)}>
                                            Archive selected
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleBulkAction('unarchive', selectedIds)}>
                                            Unarchive selected
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="text-red-700 focus:bg-red-50 focus:text-red-700"
                                            onSelect={() => handleBulkAction('delete', selectedIds)}
                                        >
                                            Delete selected
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        ) : null}
                    </div>
                    <div className="projects-index-actions" data-testid="projects-index-actions">
                        <Button type="button" size="sm" asChild>
                            <Link href={toAppPath(props.routes?.projects?.create ?? '/projects/new')}>
                                New Project
                            </Link>
                        </Button>
                    </div>
                </div>
                <ProjectsTable
                    isSubmitting={isSubmitting}
                    rows={rows}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    onProjectAction={handleProjectAction}
                    onProjectContextMenu={openProjectContextMenu}
                />
                <RowContextMenu
                    anchor={projectContextMenu.anchor}
                    actions={projectContextMenu.mode === 'selection'
                        ? projectSelectionContextActions(selectedProjectsForContextMenu())
                        : projectRowContextActions(projectForContextMenu())}
                    open={projectContextMenu.open}
                    onOpenChange={(open) => {
                        if (!open) {
                            closeProjectContextMenu();
                        }
                    }}
                />
            </div>
        </AppPage>
    );
}
