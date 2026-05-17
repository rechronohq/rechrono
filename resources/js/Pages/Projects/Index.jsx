import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import AppPage from '@/Layouts/AppPage';
import { HiveImportDialog } from '@/Pages/Timeline/HiveImportDialog';
import { buildFileUploadFormData, requestErrorMessages, requestFieldErrors } from '@/Pages/Timeline/utils';
import { request } from '@/lib/request';
import { toAppPath } from '@/lib/url';
import { ProjectsTable } from '@/projects/ProjectsTable';

export default function ProjectsIndex({ projects }) {
    const { props } = usePage();
    const rows = projects.rows ?? [];
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedParentId, setSelectedParentId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hiveImportOpen, setHiveImportOpen] = useState(false);
    const [hiveImportState, setHiveImportState] = useState(defaultHiveImportState);

    useEffect(() => {
        const rowIds = new Set(rows.map((row) => row.id));

        setSelectedIds((current) => current.filter((id) => rowIds.has(id)));
    }, [rows]);

    const bulkParentOptions = (projects.parent_options ?? []).filter((project) => !selectedIds.includes(project.id));

    async function handleBulkAction(action, projectIds, extraPayload = {}) {
        if (projectIds.length === 0 || isSubmitting) {
            return;
        }

        setIsSubmitting(true);

        try {
            await request(toAppPath(projects.bulk_action_url), {
                method: 'POST',
                body: JSON.stringify({
                    action,
                    project_ids: projectIds,
                    ...extraPayload,
                }),
            });

            setSelectedIds((current) => current.filter((id) => !projectIds.includes(id)));
            setSelectedParentId('');
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

    async function handleMoveSelected() {
        await handleBulkAction('change-parent', selectedIds, {
            parent_id: selectedParentId || null,
        });
    }

    async function handleProjectAction(action, project) {
        if (isSubmitting) {
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

    function handleStatusFilterChange(status) {
        router.get(toAppPath(props.routes?.projects?.index ?? '/projects'), status === 'active' ? {} : { status }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }

    function openHiveImportDialog() {
        setHiveImportState(defaultHiveImportState());
        setHiveImportOpen(true);
    }

    function closeHiveImportDialog(open) {
        if (open === false) {
            setHiveImportState(defaultHiveImportState());
        }

        setHiveImportOpen(Boolean(open));
    }

    function setHiveImportFile(file) {
        setHiveImportState((current) => ({
            ...current,
            file: file ?? null,
            result: null,
            resultNotice: '',
            errors: [],
            fieldErrors: {},
        }));
    }

    function applyHiveImportError(error) {
        const nextFieldErrors = requestFieldErrors(error);
        const nextErrors = requestErrorMessages(error).filter(
            (message) => !(nextFieldErrors.file ?? []).includes(message),
        );

        setHiveImportState((current) => ({
            ...current,
            errors: nextErrors,
            fieldErrors: nextFieldErrors,
        }));
    }

    async function submitHiveImportFromDialog() {
        if (!hiveImportState.file) {
            setHiveImportState((current) => ({
                ...current,
                errors: [],
                fieldErrors: {
                    ...current.fieldErrors,
                    file: ['Choose a Hive CSV file to import.'],
                },
            }));

            return;
        }

        setHiveImportState((current) => ({
            ...current,
            result: null,
            resultNotice: '',
            errors: [],
            fieldErrors: {},
            isSubmitting: true,
        }));

        try {
            const result = await request(props.routes?.importsHiveStore ?? toAppPath('/imports/hive'), {
                method: 'POST',
                body: buildFileUploadFormData(hiveImportState.file),
            });

            setHiveImportState((current) => ({
                ...current,
                file: null,
                result,
                resultNotice: 'Projects refreshed with imported Hive data.',
                errors: [],
                fieldErrors: {},
            }));

            router.reload({
                preserveScroll: true,
                preserveState: true,
            });
        } catch (error) {
            applyHiveImportError(error);
        } finally {
            setHiveImportState((current) => ({
                ...current,
                isSubmitting: false,
            }));
        }
    }

    return (
        <AppPage
            title="Projects"
            activeApp="projects"
            container="wide"
            actions={(
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={openHiveImportDialog}>
                        Import
                    </Button>
                    <Button type="button" asChild>
                        <Link href={toAppPath(props.routes?.projects?.create ?? '/projects/new')}>
                        New Project
                        </Link>
                    </Button>
                </div>
            )}
        >
            <div className="projects-app-page">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <Select value={projects.status_filter ?? 'active'} onChange={(event) => handleStatusFilterChange(event.target.value)}>
                            {(projects.status_options ?? []).map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </Select>
                        {selectedIds.length > 0 ? (
                            <div className="text-sm text-stone-500">
                                {selectedIds.length} selected
                            </div>
                        ) : null}
                    </div>

                    {selectedIds.length > 0 ? (
                        <div className="flex flex-wrap items-end gap-2">
                            <div className="min-w-56">
                                <Label htmlFor="projects-bulk-parent" className="sr-only">Parent for selected projects</Label>
                                <Select
                                    id="projects-bulk-parent"
                                    value={selectedParentId}
                                    onChange={(event) => setSelectedParentId(event.target.value)}
                                    aria-label="Parent for selected projects"
                                    disabled={isSubmitting}
                                >
                                    <option value="">No parent</option>
                                    {bulkParentOptions.map((project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button type="button" variant="outline" disabled={isSubmitting}>
                                        Bulk actions
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={handleMoveSelected}>
                                        Move selected
                                    </DropdownMenuItem>
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
                        </div>
                    ) : null}
                </div>
                <ProjectsTable
                    isSubmitting={isSubmitting}
                    rows={rows}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    onProjectAction={handleProjectAction}
                />
                <HiveImportDialog
                    onClose={closeHiveImportDialog}
                    onFileChange={setHiveImportFile}
                    onSubmit={submitHiveImportFromDialog}
                    open={hiveImportOpen}
                    state={hiveImportState}
                />
            </div>
        </AppPage>
    );
}

function defaultHiveImportState() {
    return {
        file: null,
        result: null,
        resultNotice: '',
        errors: [],
        fieldErrors: {},
        isSubmitting: false,
    };
}
