import { Link } from '@inertiajs/react';
import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { useMemo, useRef, useState } from 'react';

import TableEmptyStateRow from '@/components/data-table/TableEmptyStateRow';
import SortableHeader from '@/components/data-table/SortableHeader';
import { SelectionCheckbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatDateDisplay } from '@/lib/formatters';
import { toAppPath } from '@/lib/url';
import { cn } from '@/lib/utils';
import { ProjectActionsDropdown } from '@/projects/ProjectActionsDropdown';
import { useProjectsMarquee } from '@/projects/useProjectsMarquee';

export function ProjectsTable({ isSubmitting = false, rows, selectedIds, onProjectAction, onProjectContextMenu, onSelectionChange }) {
    const [sorting, setSorting] = useState([]);
    const tableRef = useRef(null);

    function toggleRow(projectId, checked) {
        onSelectionChange((current) => checked
            ? Array.from(new Set([...current, projectId]))
            : current.filter((value) => value !== projectId));
    }

    function toggleAll(checked) {
        onSelectionChange(checked ? rows.map((row) => row.id) : []);
    }

    function applyMarqueeSelection(hitIds, modifiers) {
        const idByKey = new Map(rows.map((row) => [String(row.id), row.id]));
        const resolvedHitIds = hitIds
            .map((id) => idByKey.get(String(id)) ?? null)
            .filter((id) => id !== null);

        onSelectionChange((current) => {
            if (modifiers.metaKey || modifiers.ctrlKey) {
                let nextSelectedIds = [...current];

                for (const projectId of resolvedHitIds) {
                    nextSelectedIds = nextSelectedIds.includes(projectId)
                        ? nextSelectedIds.filter((selectedId) => selectedId !== projectId)
                        : [...nextSelectedIds, projectId];
                }

                return nextSelectedIds;
            }

            if (modifiers.shiftKey) {
                return Array.from(new Set([...current, ...resolvedHitIds]));
            }

            return resolvedHitIds;
        });
    }

    const { handlePointerDownCapture, marqueeRect } = useProjectsMarquee({
        containerRef: tableRef,
        onSelect: applyMarqueeSelection,
    });

    const allRowsSelected = rows.length > 0 && selectedIds.length === rows.length;
    const someRowsSelected = selectedIds.length > 0 && !allRowsSelected;
    const showTimeColumns = rows.some((row) => row.actual_hours !== undefined && row.actual_hours !== null);

    const columns = useMemo(() => [
        {
            id: 'select',
            header: () => (
                <SelectionCheckbox
                    checked={someRowsSelected ? 'indeterminate' : allRowsSelected}
                    onCheckedChange={(checked) => toggleAll(Boolean(checked))}
                    aria-label="Select all projects"
                />
            ),
            cell: ({ row }) => (
                <SelectionCheckbox
                    checked={selectedIds.includes(row.original.id)}
                    className="projects-table-row__select-checkbox"
                    data-marquee-ignore
                    onCheckedChange={(checked) => toggleRow(row.original.id, Boolean(checked))}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Select ${row.original.name}`}
                />
            ),
            enableSorting: false,
        },
        {
            accessorKey: 'name',
            header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
            cell: ({ row }) => (
                <div
                    className={cn(
                        'flex items-center gap-2',
                        row.original.depth === 1 && 'pl-6',
                    )}
                >
                    {row.original.depth === 1 ? <span className="h-px w-3 bg-stone-300" aria-hidden="true" /> : null}
                    <Link
                        href={toAppPath(row.original.show_url)}
                        className={cn(
                            'text-sm text-stone-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300',
                            row.original.depth === 0 && 'font-medium',
                        )}
                    >
                        {row.original.name}
                    </Link>
                    {row.original.is_template ? (
                        <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                            Template
                        </span>
                    ) : null}
                </div>
            ),
            sortingFn: (leftRow, rightRow) => {
                const depthDiff = leftRow.original.depth - rightRow.original.depth;

                if (depthDiff !== 0) {
                    return depthDiff;
                }

                return leftRow.original.name.localeCompare(rightRow.original.name);
            },
        },
        {
            accessorKey: 'start_date',
            header: ({ column }) => <SortableHeader column={column}>Start</SortableHeader>,
            cell: ({ row }) => formatDateDisplay(row.original.start_date),
            sortUndefined: 'last',
        },
        {
            accessorKey: 'end_date',
            header: ({ column }) => <SortableHeader column={column}>End</SortableHeader>,
            cell: ({ row }) => formatDateDisplay(row.original.end_date),
            sortUndefined: 'last',
        },
        ...(showTimeColumns ? [
            {
                accessorKey: 'budget_hours',
                header: ({ column }) => <SortableHeader column={column}>Budget</SortableHeader>,
                cell: ({ row }) => row.original.budget_hours === null || row.original.budget_hours === undefined
                    ? '—'
                    : `${Number(row.original.budget_hours).toFixed(2)}h`,
                sortUndefined: 'last',
            },
            {
                accessorKey: 'actual_hours',
                header: ({ column }) => <SortableHeader column={column}>Actual</SortableHeader>,
                cell: ({ row }) => `${Number(row.original.actual_hours ?? 0).toFixed(2)}h`,
                sortUndefined: 'last',
            },
        ] : []),
        {
            id: 'actions',
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => {
                return (
                    <div className="flex justify-end" data-marquee-ignore>
                        <ProjectActionsDropdown
                            className="projects-table-row__actions-button"
                            disabled={isSubmitting}
                            onAction={onProjectAction}
                            project={row.original}
                        />
                    </div>
                );
            },
            enableSorting: false,
        },
    ], [allRowsSelected, isSubmitting, rows, selectedIds, showTimeColumns, someRowsSelected, onProjectAction]);

    const table = useReactTable({
        data: rows,
        columns,
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div
            ref={tableRef}
            data-testid="projects-table"
            className="projects-table-shell"
            onPointerDownCapture={handlePointerDownCapture}
        >
            <Table className="projects-table">
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id} className="hover:bg-transparent">
                            {headerGroup.headers.map((header) => (
                                <TableHead key={header.id}>
                                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows.length === 0 ? (
                        <TableEmptyStateRow columnCount={columns.length} message="No projects yet." />
                    ) : table.getRowModel().rows.map((row) => (
                        <TableRow
                            key={row.id}
                            aria-selected={selectedIds.includes(row.original.id)}
                            className={cn(
                                'projects-table-row',
                                row.original.depth === 1 && 'projects-table-row-subproject',
                                !row.original.is_active && 'opacity-70',
                            )}
                            data-project-id={row.original.id}
                            data-state={selectedIds.includes(row.original.id) ? 'selected' : undefined}
                            onContextMenu={(event) => {
                                event.preventDefault();
                                onProjectContextMenu?.(row.original, {
                                    x: event.clientX,
                                    y: event.clientY,
                                });
                            }}
                        >
                            {row.getVisibleCells().map((cell) => (
                                <TableCell
                                    key={cell.id}
                                    className={cn(
                                        cell.column.id === 'name' && 'projects-table-cell-name',
                                    )}
                                >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {marqueeRect ? (
                <div
                    aria-hidden
                    className="projects-table-marquee-rect"
                    style={{
                        height: marqueeRect.bottom - marqueeRect.top,
                        left: marqueeRect.left,
                        top: marqueeRect.top,
                        width: marqueeRect.right - marqueeRect.left,
                    }}
                />
            ) : null}
        </div>
    );
}
