import { router } from '@inertiajs/react';
import { Archive, Copy, ExternalLink, Layers, Trash2 } from 'lucide-react';
import React from 'react';

import { Button } from '../../components/ui/button';
import {
    Dialog,
    DialogDescription,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { toAppPath } from '../../lib/url';

export function ProjectEditorDialog({
    isSaving,
    onClose,
    onArchive,
    onDelete,
    onDuplicate,
    onSaveAsTemplate,
    onFieldChange,
    onSubmit,
    open,
    project,
    projects,
    value,
}) {
    const [confirmation, setConfirmation] = React.useState(null);

    if (!project) {
        return null;
    }

    const parentOptions = projects.filter((candidate) => candidate.parent_id === null && candidate.id !== project.id);
    const parentDisabled = projects.some((candidate) => candidate.parent_id === project.id);
    const projectUrl = project.show_url ?? `/projects/${project.id}`;
    const archiveLabel = project.is_active === false ? 'Unarchive' : 'Archive';

    function requestArchiveConfirmation() {
        setConfirmation({
            action: 'archive',
            body: project.is_active === false
                ? 'This project will return to the active timeline.'
                : 'This project will be hidden from the active timeline. You can restore it from Projects.',
            confirmLabel: project.is_active === false ? 'Unarchive project' : 'Archive project',
            destructive: false,
            title: project.is_active === false ? 'Unarchive project?' : 'Archive project?',
        });
    }

    function requestDeleteConfirmation() {
        setConfirmation({
            action: 'delete',
            body: 'This will delete the project and its related tasks. This cannot be undone.',
            confirmLabel: 'Delete project',
            destructive: true,
            title: 'Delete project?',
        });
    }

    function confirmProjectAction() {
        const action = confirmation?.action;

        setConfirmation(null);

        if (action === 'archive') {
            onArchive();
            return;
        }

        if (action === 'delete') {
            onDelete();
        }
    }

    return (
        <>
            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                        setConfirmation(null);
                    }

                    onClose(nextOpen);
                }}
            >
                <DialogContent className="max-w-4xl" data-testid="project-dialog">
                    <DialogHeader className="border-b border-stone-100 pb-5">
                        <DialogTitle>Edit project</DialogTitle>
                        <p className="text-sm text-stone-500">Update project details or jump to the full project view.</p>
                    </DialogHeader>

                    <form
                        className="space-y-6"
                        onSubmit={(event) => {
                            event.preventDefault();
                            onSubmit();
                        }}
                    >
                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
                            <div className="grid gap-5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="project-editor-name">Project name</Label>
                                    <Input
                                        id="project-editor-name"
                                        autoFocus
                                        value={value.name}
                                        onChange={(event) => onFieldChange('name', event.target.value)}
                                        placeholder="Project name"
                                        disabled={isSaving}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="project-editor-parent">Parent project</Label>
                                    <Select
                                        id="project-editor-parent"
                                        value={value.parent_id}
                                        onChange={(event) => onFieldChange('parent_id', event.target.value)}
                                        disabled={isSaving || parentDisabled}
                                    >
                                        <option value="">No parent</option>
                                        {parentOptions.map((candidate) => (
                                            <option key={candidate.id} value={candidate.id}>
                                                {candidate.name}
                                            </option>
                                        ))}
                                    </Select>
                                    {parentDisabled && (
                                        <p className="pt-0.5 text-xs text-stone-500">Projects with subprojects stay at the top level.</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="project-editor-notes">Notes</Label>
                                    <Textarea
                                        id="project-editor-notes"
                                        value={value.description ?? ''}
                                        onChange={(event) => onFieldChange('description', event.target.value)}
                                        placeholder="Add context, links, or handoff notes."
                                        disabled={isSaving}
                                        className="min-h-20"
                                    />
                                </div>
                            </div>

                            <aside className="border-t border-stone-100 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                                <div className="grid gap-3">
                                    <ProjectToolButton
                                        icon={ExternalLink}
                                        label="View project"
                                        onClick={() => router.visit(toAppPath(projectUrl))}
                                        disabled={isSaving}
                                    />
                                    <ProjectToolButton
                                        icon={Copy}
                                        label="Duplicate"
                                        onClick={onDuplicate}
                                        disabled={isSaving}
                                    />
                                    {!project.is_template && (
                                        <ProjectToolButton
                                            icon={Archive}
                                            label={archiveLabel}
                                            onClick={requestArchiveConfirmation}
                                            disabled={isSaving}
                                        />
                                    )}
                                    {!project.is_template && (
                                        <ProjectToolButton
                                            icon={Layers}
                                            label="Save as template"
                                            onClick={onSaveAsTemplate}
                                            disabled={isSaving}
                                        />
                                    )}
                                    <ProjectToolButton
                                        destructive
                                        icon={Trash2}
                                        label="Delete"
                                        onClick={requestDeleteConfirmation}
                                        disabled={isSaving}
                                    />
                                </div>
                            </aside>
                        </div>

                        <DialogFooter className="border-t border-stone-100 pt-5">
                            <div className="flex items-center gap-2">
                                <Button type="button" variant="outline" onClick={() => onClose(false)} disabled={isSaving}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSaving || value.name.trim() === ''}>
                                    Save
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={confirmation !== null}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                        setConfirmation(null);
                    }
                }}
            >
                <DialogContent className="max-w-md" data-testid="project-action-confirmation">
                    <DialogHeader>
                        <DialogTitle>{confirmation?.title}</DialogTitle>
                        <DialogDescription>{confirmation?.body}</DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => setConfirmation(null)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={confirmProjectAction}
                            disabled={isSaving}
                            className={confirmation?.destructive ? 'bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-200' : undefined}
                        >
                            {confirmation?.confirmLabel}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function ProjectToolButton({ destructive = false, disabled, icon: Icon, label, onClick }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={[
                'flex w-full items-center gap-3 rounded-[6px] border bg-white px-3 py-2.5 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
                destructive
                    ? 'border-transparent text-red-700 hover:border-red-100 hover:bg-red-50 focus-visible:ring-red-200'
                    : 'border-transparent text-stone-700 hover:border-stone-200 hover:bg-stone-50 hover:text-stone-950 focus-visible:ring-stone-300',
            ].join(' ')}
        >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{label}</span>
        </button>
    );
}
