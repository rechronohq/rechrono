import React from 'react';

import { Button } from '../../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';

export function GroupDialog({
    isSaving,
    onClose,
    onDelete,
    onDuplicate,
    onFieldChange,
    onSubmit,
    open,
    projectOptions,
    value,
    mode = 'edit',
}) {
    const isCreate = mode === 'create';

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl" data-testid="group-dialog">
                <DialogHeader>
                    <DialogTitle>{isCreate ? 'New group' : 'Edit group'}</DialogTitle>
                </DialogHeader>

                <form
                    className="space-y-7"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit();
                    }}
                >
                    <div className="space-y-2">
                        <Label>Group name</Label>
                        <Input
                            autoFocus
                            value={value.name}
                            onChange={(event) => onFieldChange('name', event.target.value)}
                            placeholder="Group name"
                            disabled={isSaving}
                            data-testid="group-dialog-name"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Project</Label>
                        <Select
                            value={value.project_id}
                            onChange={(event) => onFieldChange('project_id', event.target.value)}
                            disabled={isSaving}
                        >
                            {projectOptions.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.depth ? `${'— '.repeat(project.depth)}${project.name}` : project.name}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <DialogFooter className="justify-between">
                        <div className="flex items-center gap-2">
                            {!isCreate && (
                                <>
                                    <Button type="button" variant="ghost" onClick={onDelete} disabled={isSaving} data-testid="group-dialog-delete">
                                        Delete group
                                    </Button>
                                    <Button type="button" variant="ghost" onClick={onDuplicate} disabled={isSaving}>
                                        Duplicate group
                                    </Button>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" onClick={() => onClose(false)} disabled={isSaving}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSaving || value.name.trim() === ''} data-testid="group-dialog-save">
                                Save
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
