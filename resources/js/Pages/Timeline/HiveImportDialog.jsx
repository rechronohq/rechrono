import React, { useEffect, useRef } from 'react';

import { Button } from '../../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';

function countLabel(value, singular, plural = `${singular}s`) {
    return `${value} ${value === 1 ? singular : plural}`;
}

function SummaryCard({ label, value }) {
    return (
        <div className="rounded-[8px] border border-stone-200 bg-stone-50 px-3 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">{label}</div>
            <div className="mt-1 text-sm font-semibold text-stone-900">{value}</div>
        </div>
    );
}

function SummaryList({ title, emptyLabel, items }) {
    return (
        <section className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">{title}</div>
            {items.length > 0 ? (
                <div className="rounded-[8px] border border-stone-200 bg-white">
                    <ul className="divide-y divide-stone-100">
                        {items.map((item) => (
                            <li key={item} className="px-3 py-2 text-sm text-stone-700">
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <div className="rounded-[8px] border border-dashed border-stone-200 px-3 py-3 text-sm text-stone-500">
                    {emptyLabel}
                </div>
            )}
        </section>
    );
}

function SummarySection({ heading, note = null, summary, tone = 'default' }) {
    if (!summary) {
        return null;
    }

    const rootProjectNames = (summary.root_projects ?? []).map((project) => project.name).filter(Boolean);
    const subprojectNames = (summary.subprojects ?? []).map((project) => project.name).filter(Boolean);
    const matchedAssigneeNames = (summary.matched_assignees ?? []).map((assignee) => assignee.name).filter(Boolean);
    const warnings = (summary.warnings ?? []).filter(Boolean);
    const unmatchedAssigneeNames = (summary.unmatched_assignee_names ?? []).filter(Boolean);
    const skippedRowCount = summary.skipped_row_count ?? 0;

    return (
        <section
            className={[
                'space-y-4 rounded-[8px] border p-4',
                tone === 'success' ? 'border-emerald-200 bg-emerald-50/70' : 'border-stone-200 bg-stone-50/80',
            ].join(' ')}
        >
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold text-stone-950">{heading}</h3>
                    <p className="mt-1 text-sm text-stone-500">
                        {skippedRowCount > 0
                            ? `${countLabel(skippedRowCount, 'row')} skipped during processing.`
                            : 'No rows were skipped.'}
                    </p>
                    {note ? (
                        <p className="mt-1 text-sm text-stone-600">{note}</p>
                    ) : null}
                </div>
                {tone === 'success' ? (
                    <div className="rounded-full border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                        Import complete
                    </div>
                ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Projects" value={countLabel(summary.root_project_count ?? 0, 'root project')} />
                <SummaryCard label="Subprojects" value={countLabel(summary.subproject_count ?? 0, 'subproject')} />
                <SummaryCard label="Tasks" value={countLabel(summary.task_count ?? 0, 'task')} />
                <SummaryCard label="Matched" value={countLabel(summary.matched_assignee_count ?? 0, 'matched assignee')} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <SummaryList title="Root Projects" items={rootProjectNames} emptyLabel="No root projects in this response." />
                <SummaryList title="Subprojects" items={subprojectNames} emptyLabel="No subprojects in this response." />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <SummaryList title="Matched Assignees" items={matchedAssigneeNames} emptyLabel="No assignees matched existing users." />
                <SummaryList title="Unmatched Assignees" items={unmatchedAssigneeNames} emptyLabel="No unmatched assignee names." />
            </div>

            <SummaryList title="Warnings" items={warnings} emptyLabel="No warnings." />
        </section>
    );
}

export function HiveImportDialog({ onClose, onFileChange, onSubmit, open, state }) {
    const fileInputRef = useRef(null);
    const fileErrors = state.fieldErrors.file ?? [];
    const canSubmit = Boolean(state.file) && !state.isSubmitting;
    const preventDismiss = (event) => {
        if (state.isSubmitting) {
            event.preventDefault();
        }
    };

    useEffect(() => {
        if (!state.file && fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [state.file]);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent
                className="max-w-4xl"
                hideClose={state.isSubmitting}
                onEscapeKeyDown={preventDismiss}
                onInteractOutside={preventDismiss}
            >
                <DialogHeader>
                    <DialogTitle>Import Hive CSV</DialogTitle>
                </DialogHeader>

                <div className="space-y-5">
                    <section className="rounded-[8px] border border-stone-200 bg-stone-50/70 p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div className="flex-1 space-y-2">
                                <label htmlFor="hive-import-file" className="text-sm font-medium text-stone-700">
                                    CSV file
                                </label>
                                <Input
                                    ref={fileInputRef}
                                    id="hive-import-file"
                                    type="file"
                                    accept=".csv,text/csv"
                                    onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
                                    disabled={state.isSubmitting}
                                />
                                <p className="text-xs text-stone-500">
                                    Use the original Hive CSV export. Import creates top-level projects only.
                                </p>
                            </div>

                            <div className="rounded-[8px] border border-dashed border-stone-200 bg-white px-3 py-3 text-sm text-stone-600 lg:w-[240px]">
                                {state.file ? state.file.name : 'No file selected'}
                            </div>
                        </div>

                        {fileErrors.length > 0 ? (
                            <div className="mt-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
                                {fileErrors.join(' ')}
                            </div>
                        ) : null}

                        {state.errors.length > 0 ? (
                            <div className="mt-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-3">
                                <ul className="space-y-1 text-sm text-rose-700">
                                    {state.errors.map((message) => (
                                        <li key={message}>{message}</li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                    </section>

                    <SummarySection heading="Import complete" note={state.resultNotice} summary={state.result} tone="success" />
                </div>

                <DialogFooter className="mt-6 justify-between">
                    <Button type="button" variant="ghost" onClick={() => onClose(false)} disabled={state.isSubmitting}>
                        {state.result ? 'Close' : 'Cancel'}
                    </Button>
                    <Button type="button" onClick={onSubmit} disabled={!canSubmit}>
                        Import
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
