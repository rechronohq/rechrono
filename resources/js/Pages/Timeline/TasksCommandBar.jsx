import React, { useState } from 'react';
import { ChevronRight, Download, FileImage, FileText, Loader2, Settings2 } from 'lucide-react';

import { Button, buttonVariants } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import AppContextBar from '../../Layouts/AppContextBar';
import { cn } from '../../lib/utils';

export function TasksCommandBar({
    assigneeOptions = [],
    breadcrumbs,
    filtersOpen,
    exportError = '',
    isExporting = false,
    onOpenProjectForm,
    onExport,
    onSelectAllAssignees,
    onSelectAllProjects,
    onSelectProject,
    onSaveView,
    onToggleWeekends,
    onViewDensityChange,
    onToggleFilters,
    onToggleAssigneeSelection,
    onToggleProjectSelection,
    projects,
    selectedAssigneeFilters = [],
    selectedProjectIds = [],
    showWeekends = false,
    viewDensity = 'comfortable',
}) {
    const [saveViewOpen, setSaveViewOpen] = useState(false);
    const [viewName, setViewName] = useState('');

    async function submitSavedView(event) {
        event.preventDefault();

        if (!viewName.trim()) {
            return;
        }

        await onSaveView(viewName);
        setViewName('');
        setSaveViewOpen(false);
    }

    const context = breadcrumbs.length > 1 ? (
        <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="h-4 w-px bg-stone-200" />
            <nav className="flex min-w-0 items-center gap-1 text-[13px] text-stone-500">
                {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={`${crumb.label}-${crumb.projectId ?? 'root'}`}>
                        {index > 0 && <ChevronRight className="h-3 w-3 text-stone-300" />}
                        <button
                            type="button"
                            className={cn(
                                'max-w-[220px] truncate rounded-md px-1.5 py-0.5 transition',
                                index === breadcrumbs.length - 1 ? 'font-medium text-stone-900' : 'hover:bg-stone-100 hover:text-stone-900',
                            )}
                            onClick={() => (crumb.projectId ? onSelectProject(crumb.projectId) : onSelectAllProjects())}
                        >
                            {crumb.label}
                        </button>
                    </React.Fragment>
                ))}
            </nav>
        </div>
    ) : null;

    const actions = (
        <div className="flex flex-none items-center justify-end gap-2.5">
            <div className="flex flex-col items-end gap-1">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            data-testid="timeline-export-trigger"
                            disabled={isExporting}
                            className={cn(
                                buttonVariants({ variant: 'outline', size: 'sm' }),
                                'shrink-0 gap-2 px-3',
                            )}
                        >
                            {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-500" /> : <Download className="h-3.5 w-3.5 text-stone-500" />}
                            {isExporting ? 'Exporting…' : 'Export'}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[260] min-w-[190px]">
                        <DropdownMenuItem className="gap-2" onSelect={() => onExport('png')}>
                            <FileImage className="h-4 w-4 text-stone-500" />
                            Download PNG
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2" onSelect={() => onExport('pdf')}>
                            <FileText className="h-4 w-4 text-stone-500" />
                            Download PDF
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                {exportError ? <p role="alert" className="max-w-72 text-right text-[11px] leading-tight text-rose-600">{exportError}</p> : null}
            </div>

            <Popover open={filtersOpen} onOpenChange={onToggleFilters}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        data-testid="timeline-settings-trigger"
                        className={cn(
                            buttonVariants({ variant: 'outline', size: 'sm' }),
                            'shrink-0 gap-2 px-3',
                        )}
                    >
                        <Settings2 className="h-3.5 w-3.5 text-stone-500" />
                        Settings
                    </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="z-[260] w-80">
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Projects</span>
                                <button type="button" className="text-xs font-medium text-stone-500 hover:text-stone-900" onClick={onSelectAllProjects}>
                                    All
                                </button>
                            </div>

                            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                                {projects.map((project) => (
                                    <label key={project.id} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-50">
                                        <Checkbox
                                            checked={selectedProjectIds.includes(project.id)}
                                            onCheckedChange={() => onToggleProjectSelection(project.id)}
                                        />
                                        <span className="truncate" style={{ paddingLeft: `${(project.depth ?? 0) * 16}px` }}>
                                            {project.name}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-stone-200/80 pt-4">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">People</span>
                                <button type="button" className="text-xs font-medium text-stone-500 hover:text-stone-900" onClick={onSelectAllAssignees}>
                                    All
                                </button>
                            </div>

                            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                                {assigneeOptions.map((option) => (
                                    <label key={option.filter_value ?? option.label} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-50">
                                        <Checkbox
                                            checked={selectedAssigneeFilters.includes(option.filter_value)}
                                            onCheckedChange={() => onToggleAssigneeSelection(option.filter_value)}
                                        />
                                        <span className="truncate">{option.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-stone-200/80 pt-4">
                            <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Preferences</div>
                            <label className="mt-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-50">
                                <Checkbox
                                    data-testid="timeline-density-compact"
                                    checked={viewDensity === 'compact'}
                                    onCheckedChange={(checked) => onViewDensityChange(checked ? 'compact' : 'comfortable')}
                                />
                                <span className="truncate">Compact mode</span>
                            </label>
                            <label className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-50">
                                <Checkbox
                                    checked={showWeekends}
                                    onCheckedChange={(checked) => onToggleWeekends(Boolean(checked))}
                                />
                                <span className="truncate">Show weekends</span>
                            </label>
                        </div>

                        <div className="border-t border-stone-200/80 pt-4">
                            <button
                                type="button"
                                className="flex w-full items-center justify-center rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-50 hover:text-stone-950"
                                onClick={() => {
                                    onToggleFilters(false);
                                    setSaveViewOpen(true);
                                }}
                            >
                                Save view
                            </button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            <Button type="button" size="sm" className="shrink-0" onClick={onOpenProjectForm}>
                New Project
            </Button>
        </div>
    );

    return (
        <>
            <div data-testid="tasks-command-bar" className="tasks-command-bar">
                <AppContextBar title="Tasks" context={context} actions={actions} />
            </div>

            <Dialog open={saveViewOpen} onOpenChange={setSaveViewOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Save timeline view</DialogTitle>
                    </DialogHeader>

                    <form className="mt-4 space-y-5" onSubmit={submitSavedView}>
                        <div className="space-y-2">
                            <Label htmlFor="timeline-view-name">View name</Label>
                            <Input
                                id="timeline-view-name"
                                autoFocus
                                value={viewName}
                                onChange={(event) => setViewName(event.target.value)}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={!viewName.trim()}>
                                Save timeline view
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
